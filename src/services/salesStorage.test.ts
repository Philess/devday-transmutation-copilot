import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoSales } from '../data/sales'
import { SALES_STORAGE_KEY, loadSalesDataset, resetSalesDataset, saveSalesDataset } from './salesStorage'

describe('sales data storage', () => {
  let values: Map<string, string>
  let storage: Pick<Storage, 'getItem' | 'setItem'>

  beforeEach(() => {
    values = new Map()
    storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value) }
    }
  })

  it('writes and reads the initial local sales fixture', () => {
    const seeded = loadSalesDataset(storage)
    expect(seeded).toEqual(createDemoSales())
    expect(JSON.parse(values.get(SALES_STORAGE_KEY)!)).toEqual({ version: 1, dataset: createDemoSales() })
    expect(loadSalesDataset(storage)).toEqual(seeded)
  })

  it('preserves the sample data size below a conservative browser quota', () => {
    const seeded = loadSalesDataset(storage)
    expect(values.get(SALES_STORAGE_KEY)!.length * 2).toBeLessThan(4.5 * 1024 * 1024)
    expect(seeded.orders.length).toBeGreaterThan(1000)
  })

  it('rejects invalid local data without replacing it with a new seed', () => {
    const invalid = '{"version":1,"dataset":{"orders":[]}}'
    values.set(SALES_STORAGE_KEY, invalid)
    expect(() => loadSalesDataset(storage)).toThrow()
    expect(values.get(SALES_STORAGE_KEY)).toBe(invalid)
  })

  it('rejects invalid writes without replacing saved data', () => {
    const dataset = loadSalesDataset(storage)
    const saved = values.get(SALES_STORAGE_KEY)
    dataset.orders[0].lines[0].unitPriceCents = 0
    expect(() => saveSalesDataset(dataset, storage)).toThrow('Invalid sales dataset')
    expect(values.get(SALES_STORAGE_KEY)).toBe(saved)
  })

  it('propagates browser storage read and write failures', () => {
    const unavailable = {
      getItem: (): never => { throw new Error('Storage blocked') },
      setItem: (): never => { throw new Error('Storage full') }
    }
    expect(() => loadSalesDataset(unavailable)).toThrow('Storage blocked')
    expect(() => saveSalesDataset(createDemoSales(), unavailable)).toThrow('Storage full')
    expect(() => resetSalesDataset(unavailable)).toThrow('Storage full')
  })
})
