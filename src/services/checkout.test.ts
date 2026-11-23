import { describe, expect, it } from 'vitest'
import { createDemoProducts } from '../data/products'
import { createDemoSales } from '../data/sales'
import { SALES_STORAGE_KEY, loadSalesDataset, saveSalesDataset } from './salesStorage'
import { buildSampleOrder, cartTotal, resolveCart, sortProducts } from './checkout'

const products = createDemoProducts()
const sales = createDemoSales()

describe('catalogue helpers', () => {
  it('sorts by price and French name without mutating the catalogue order', () => {
    const original = products.map(product => product.id)
    const cheapest = sortProducts(products, 'price-asc')[0]!
    const priciest = sortProducts(products, 'price-desc')[0]!
    expect(cheapest.priceCents).toBe(Math.min(...products.map(product => product.priceCents)))
    expect(priciest.priceCents).toBe(Math.max(...products.map(product => product.priceCents)))
    expect(sortProducts(products, 'name')[0]!.name.localeCompare(sortProducts(products, 'name')[1]!.name, 'fr')).toBeLessThanOrEqual(0)
    expect(sortProducts(products, 'featured').map(product => product.id)).toEqual(original)
    expect(products.map(product => product.id)).toEqual(original)
  })

  it('keeps cart lines for unknown products out of the entries and reports them', () => {
    const resolved = resolveCart([{ productId: 1, quantity: 2 }, { productId: 99999, quantity: 1 }], products)
    expect(resolved.entries).toHaveLength(1)
    expect(resolved.missing).toEqual([99999])
    expect(cartTotal(resolved.entries)).toBe(products.find(product => product.id === 1)!.priceCents * 2)
  })
})

describe('sample order', () => {
  const entries = resolveCart([{ productId: 1, quantity: 2 }, { productId: 5, quantity: 1 }], products).entries

  it('adds one exact-cent order and a pseudonymous customer without touching the input', () => {
    const before = JSON.stringify(sales)
    const { dataset, orderId, locationName } = buildSampleOrder(sales, entries, 'online', '2026-03-04')
    expect(JSON.stringify(sales)).toBe(before)
    expect(dataset.orders).toHaveLength(sales.orders.length + 1)
    const order = dataset.orders[dataset.orders.length - 1]!
    expect(order.id).toBe(orderId)
    expect(order.locationId).toBe('online')
    expect(locationName).toBe('Online Requisition Portal')
    expect(order.lines.map(line => [line.product.id, line.quantity, line.unitPriceCents, line.promotionCode])).toEqual([
      [1, 2, products.find(product => product.id === 1)!.priceCents, null],
      [5, 1, products.find(product => product.id === 5)!.priceCents, null]
    ])
    expect(dataset.customers[dataset.customers.length - 1]!.id).toMatch(/^Requisition-\d{4}$/)
    expect(dataset.metadata.endDate).toBe('2026-03-04')
  })

  it('produces a dataset the sales storage accepts and reloads', () => {
    const storage = new Map<string, string>()
    const adapter = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value) } }
    const { dataset } = buildSampleOrder(sales, entries, 'store-02', '2026-03-04')
    saveSalesDataset(dataset, adapter)
    expect(storage.has(SALES_STORAGE_KEY)).toBe(true)
    expect((o => o[o.length - 1]!)(loadSalesDataset(adapter).orders).locationId).toBe('store-02')
  })

  it('refuses an empty cart and an unknown location', () => {
    expect(() => buildSampleOrder(sales, [], 'online', '2026-03-04')).toThrow()
    expect(() => buildSampleOrder(sales, entries, 'nowhere', '2026-03-04')).toThrow()
  })
})
