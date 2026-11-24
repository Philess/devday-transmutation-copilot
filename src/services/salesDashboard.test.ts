import { describe, expect, it } from 'vitest'
import { createDemoSales } from '../data/sales'
import type { Product } from '../types/product'
import type { Customer, SalesData, SalesLocation, SalesOrder } from '../types/sales'
import { computeSalesDashboard, SalesDashboardError } from './salesDashboard'

const makeProduct = (id: number, priceCents = 100): Product => ({
  id,
  name: `Produit ${id}`,
  category: 'Catégorie',
  description: 'Produit fictif de test',
  priceCents,
  supplier: 'Atelier',
  origin: 'Local',
  status: 'active',
  illustration: '',
  imageAlt: '',
  saleStartDate: '2024-01-01',
  themes: []
})

const locations: SalesLocation[] = [
  { id: 'store-1', name: 'Magasin', channel: 'store' },
  { id: 'online', name: 'Portail', channel: 'online' }
]

const customers: Customer[] = ['c1', 'c2', 'c3'].map(id => ({
  id,
  region: 'Nord',
  homeStoreId: 'store-1',
  joinedOn: '2024-01-01',
  preferredCategory: 'Catégorie',
  preferredChannel: 'store'
}))

const makeOrder = (
  id: string,
  date: string,
  locationId: string,
  lines: Array<{ productId: number; quantity: number; unitPriceCents: number }>,
  customerId = 'c1'
): SalesOrder => ({
  id,
  date,
  customerId,
  locationId,
  lines: lines.map(({ productId, quantity, unitPriceCents }) => {
    const product = makeProduct(productId)
    return {
      product: { id: product.id, name: product.name, category: product.category },
      quantity,
      listUnitPriceCents: product.priceCents,
      unitPriceCents,
      promotionCode: unitPriceCents === product.priceCents ? null : 'TEST'
    }
  })
})

const makeData = (orders: SalesOrder[], products = [makeProduct(1)]): SalesData => ({
  products,
  locations,
  customers,
  orders
})

const expectErrorCode = (callback: () => unknown, code: SalesDashboardError['code']): void => {
  try {
    callback()
    throw new Error(`Expected ${code}`)
  } catch (error) {
    expect(error).toBeInstanceOf(SalesDashboardError)
    expect((error as SalesDashboardError).code).toBe(code)
  }
}

describe('computeSalesDashboard', () => {
  it('reconciles the initial March 2025 dataset', () => {
    const result = computeSalesDashboard(createDemoSales(), { startDate: '2025-03-01', endDate: '2025-03-31' })

    expect(result.kpis).toEqual({ orderCount: 55, totalCents: 646092, averageOrderCents: 11747 })
  })

  it('uses historical discounted line prices and intersects inclusive date, channel, and location filters', () => {
    const data = makeData([
      makeOrder('start', '2025-03-01', 'store-1', [{ productId: 1, quantity: 2, unitPriceCents: 49 }]),
      makeOrder('online', '2025-03-31', 'online', [{ productId: 1, quantity: 1, unitPriceCents: 200 }], 'c2'),
      makeOrder('after', '2025-04-01', 'store-1', [{ productId: 1, quantity: 1, unitPriceCents: 300 }], 'c3')
    ], [makeProduct(1, 9999)])
    const before = JSON.stringify(data)

    const allSales = computeSalesDashboard(data)
    expect(allSales.kpis).toEqual({ orderCount: 3, totalCents: 598, averageOrderCents: 199 })
    expect(allSales.byChannel).toEqual([
      { channel: 'online', orderCount: 1, totalCents: 200 },
      { channel: 'store', orderCount: 2, totalCents: 398 }
    ])
    expect(allSales.monthly).toEqual([
      { month: '2025-03', orderCount: 2, totalCents: 298 },
      { month: '2025-04', orderCount: 1, totalCents: 300 }
    ])

    const result = computeSalesDashboard(data, {
      startDate: '2025-03-01',
      endDate: '2025-03-31',
      channel: 'store',
      locationId: 'store-1'
    })

    expect(result.kpis).toEqual({ orderCount: 1, totalCents: 98, averageOrderCents: 98 })
    expect(result.byLocation).toEqual([{ locationId: 'store-1', locationName: 'Magasin', channel: 'store', orderCount: 1, totalCents: 98 }])
    expect(result.byChannel).toEqual([{ channel: 'store', orderCount: 1, totalCents: 98 }])
    expect(result.topProducts[0]).toMatchObject({ productId: 1, quantity: 2, totalCents: 98 })
    expect(result.monthly).toEqual([{ month: '2025-03', orderCount: 1, totalCents: 98 }])
    expect(JSON.stringify(data)).toBe(before)
  })

  it('returns an explicit empty result when the selected location conflicts with the channel', () => {
    const result = computeSalesDashboard(
      makeData([makeOrder('one', '2025-03-01', 'store-1', [{ productId: 1, quantity: 1, unitPriceCents: 20 }])]),
      { channel: 'online', locationId: 'store-1' }
    )

    expect(result.kpis).toEqual({ orderCount: 0, totalCents: 0, averageOrderCents: null })
    expect(result.byLocation).toEqual([])
    expect(result.byChannel).toEqual([])
    expect(result.topProducts).toEqual([])
    expect(result.monthly).toEqual([])
  })

  it('rounds half cents up using exact integer arithmetic', () => {
    const data = makeData([
      makeOrder('one', '2025-03-01', 'store-1', [{ productId: 1, quantity: 1, unitPriceCents: 2 }]),
      makeOrder('two', '2025-03-02', 'store-1', [{ productId: 1, quantity: 1, unitPriceCents: 3 }], 'c2')
    ])

    expect(computeSalesDashboard(data).kpis.averageOrderCents).toBe(3)
  })

  it('ranks at most ten products by sales, quantity, then product id', () => {
    const products = Array.from({ length: 11 }, (_, index) => makeProduct(index + 1))
    const orders = products.map(product => {
      const rankedLines = product.id === 1
        ? [{ productId: 1, quantity: 1, unitPriceCents: 100 }]
        : product.id === 2 || product.id === 3
          ? [{ productId: product.id, quantity: 2, unitPriceCents: 50 }]
          : [{ productId: product.id, quantity: 1, unitPriceCents: 200 - (product.id - 4) * 10 }]
      return makeOrder(`order-${product.id}`, '2025-03-01', 'store-1', rankedLines)
    })

    const result = computeSalesDashboard(makeData(orders, products))

    expect(result.topProducts).toHaveLength(10)
    expect(result.topProducts.map(product => product.productId)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 2, 3])
  })

  it('rejects invalid filters, data references, and unrepresentable amounts with contract error codes', () => {
    const validData = makeData([makeOrder('one', '2025-03-01', 'store-1', [{ productId: 1, quantity: 1, unitPriceCents: 20 }])])

    expectErrorCode(() => computeSalesDashboard(validData, { startDate: '2025-02-30' }), 'INVALID_FILTER')
    expectErrorCode(() => computeSalesDashboard(validData, { startDate: '2025-04-01', endDate: '2025-03-01' }), 'INVALID_FILTER')
    expectErrorCode(() => computeSalesDashboard(validData, { locationId: 'unknown' }), 'INVALID_FILTER')
    expectErrorCode(() => computeSalesDashboard(makeData([
      makeOrder('bad-ref', '2025-03-01', 'missing', [{ productId: 1, quantity: 1, unitPriceCents: 20 }])
    ])), 'INVALID_DATA')
    expectErrorCode(() => computeSalesDashboard(makeData([
      makeOrder('bad-product', '2025-03-01', 'store-1', [{ productId: 999, quantity: 1, unitPriceCents: 20 }])
    ])), 'INVALID_DATA')
    expectErrorCode(() => computeSalesDashboard(makeData([
      makeOrder('bad-customer', '2025-03-01', 'store-1', [{ productId: 1, quantity: 1, unitPriceCents: 20 }], 'missing')
    ])), 'INVALID_DATA')
    expectErrorCode(() => computeSalesDashboard(makeData([
      makeOrder('bad-line', '2025-03-01', 'store-1', [{ productId: 1, quantity: 0, unitPriceCents: 20 }])
    ])), 'INVALID_DATA')
    expectErrorCode(() => computeSalesDashboard(makeData([
      makeOrder('overflow', '2025-03-01', 'store-1', [{ productId: 1, quantity: 2, unitPriceCents: Number.MAX_SAFE_INTEGER }])
    ])), 'UNREPRESENTABLE_AMOUNT')
  })
})
