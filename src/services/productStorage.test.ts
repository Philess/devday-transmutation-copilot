import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoProducts } from '../data/products'
import { PRODUCT_STORAGE_KEY, loadProducts, resetProducts, saveProducts } from './productStorage'

describe('product storage', () => {
  let values: Map<string, string>
  let storage: Pick<Storage, 'getItem' | 'setItem'>

  beforeEach(() => {
    values = new Map()
    storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value) }
    }
  })

  it('seeds and persists the complete catalog on first use', () => {
    expect(loadProducts(storage)).toEqual(createDemoProducts())
    expect(JSON.parse(values.get(PRODUCT_STORAGE_KEY)!)).toEqual({ version: 1, products: createDemoProducts() })
    expect(createDemoProducts().length).toBeGreaterThanOrEqual(24)
  })

  it('preserves saved edits on subsequent loads', () => {
    const products = createDemoProducts().slice(0, 1)
    products[0]!.name = 'Workshop edit'
    saveProducts(products, storage)
    expect(loadProducts(storage)).toEqual(products)
    expect(loadProducts(storage)).toEqual(products)
  })

  it('leaves other existing browser data untouched', () => {
    values.set('legacy.collection.v1', 'keep')
    resetProducts(storage)
    expect(values.get('legacy.collection.v1')).toBe('keep')
  })

  it.each([
    '',
    '{invalid',
    'null',
    '[]',
    '{"version":2,"products":[]}',
    '{"version":1,"products":[{"id":1}]}',
    JSON.stringify({ version: 1, products: [{ ...createDemoProducts()[0], priceCents: 1.5 }] }),
    JSON.stringify({ version: 1, products: [{ ...createDemoProducts()[0], status: '' }] }),
    JSON.stringify({ version: 1, products: [createDemoProducts()[0], createDemoProducts()[0]] })
  ])('rejects invalid stored data without overwriting it: %s', saved => {
    values.set(PRODUCT_STORAGE_KEY, saved)
    expect(() => loadProducts(storage)).toThrow()
    expect(values.get(PRODUCT_STORAGE_KEY)).toBe(saved)
  })

  it('rejects invalid writes without replacing saved data', () => {
    const products = loadProducts(storage)
    const saved = values.get(PRODUCT_STORAGE_KEY)
    products[0]!.priceCents = 1.2
    expect(() => saveProducts(products, storage)).toThrow('Invalid product collection')
    expect(values.get(PRODUCT_STORAGE_KEY)).toBe(saved)
  })

  it('propagates browser storage read and write failures', () => {
    const unavailable = {
      getItem: (): never => { throw new Error('Storage blocked') },
      setItem: (): never => { throw new Error('Storage full') }
    }
    expect(() => loadProducts(unavailable)).toThrow('Storage blocked')
    expect(() => saveProducts([], unavailable)).toThrow('Storage full')
    expect(() => resetProducts(unavailable)).toThrow('Storage full')
  })
})
