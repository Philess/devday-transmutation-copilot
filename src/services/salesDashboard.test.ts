import { describe, expect, it } from 'vitest'
import { createDemoSales } from '../data/sales'
import type { Product } from '../types/product'
import type { OrderLine, SalesData, SalesOrder } from '../types/sales'
import { SalesDashboardError, computeSalesDashboard } from './salesDashboard'

const makeProduct = (id: number, priceCents = 100): Product => ({
  id,
  name: `Product ${id}`,
  category: 'Tools',
  description: '',
  priceCents,
  supplier: '',
  origin: '',
  status: 'active',
  illustration: '',
  imageAlt: '',
  saleStartDate: '2025-01-01',
  themes: []
})

const makeLine = (
  product: Product,
  quantity = 1,
  unitPriceCents = product.priceCents,
  listUnitPriceCents = unitPriceCents
): OrderLine => ({
  product: { id: product.id, name: product.name, category: product.category },
  quantity,
  unitPriceCents,
  listUnitPriceCents,
  promotionCode: listUnitPriceCents === unitPriceCents ? null : 'SALE'
})

const makeOrder = (
  id: string,
  date: string,
  locationId: string,
  lines: OrderLine[],
  customerId = 'customer-1'
): SalesOrder => ({ id, date, locationId, lines, customerId })

const makeData = (
  orders: SalesOrder[],
  products = [makeProduct(1), makeProduct(2)]
): SalesData => ({
  products,
  locations: [
    { id: 'online', name: 'Online portal', channel: 'online' },
    { id: 'store-1', name: 'Store 1', channel: 'store' },
    { id: 'store-2', name: 'Store 2', channel: 'store' }
  ],
  customers: [{ id: 'customer-1', region: '', homeStoreId: 'store-1', joinedOn: '2025-01-01', preferredCategory: '', preferredChannel: 'store' }],
  orders
})

const expectErrorCode = (action: () => unknown, code: SalesDashboardError['code']): void => {
  try {
    action()
    throw new Error(`Expected ${code}`)
  } catch (error) {
    expect(error).toBeInstanceOf(SalesDashboardError)
    expect(error).toMatchObject({ code })
  }
}

describe('computeSalesDashboard', () => {
  it('reconciles the initial March 2025 dataset and leaves it unchanged', () => {
    const data = createDemoSales()
    const before = JSON.stringify(data)

    const result = computeSalesDashboard(data, { startDate: '2025-03-01', endDate: '2025-03-31' })

    expect(result.kpis).toEqual({ orderCount: 55, totalCents: 646092, averageOrderCents: 11747 })
    expect(result.byChannel.reduce((sum, channel) => sum + channel.totalCents, 0)).toBe(646092)
    expect(JSON.stringify(data)).toBe(before)
  })

  it('uses discounted historical line prices and keeps online separate from stores', () => {
    const catalogProduct = makeProduct(1, 9999)
    const online = makeOrder('online-sale', '2025-03-01', 'online', [
      makeLine(catalogProduct, 2, 75, 100)
    ])
    const store = makeOrder('store-sale', '2025-03-02', 'store-1', [
      makeLine(makeProduct(2, 200))
    ])

    const result = computeSalesDashboard(makeData([online, store], [catalogProduct, makeProduct(2, 200)]))

    expect(result.kpis).toMatchObject({ orderCount: 2, totalCents: 350 })
    expect(result.byChannel).toEqual([
      { channel: 'online', orderCount: 1, totalCents: 150 },
      { channel: 'store', orderCount: 1, totalCents: 200 }
    ])
    expect(result.byLocation.map(({ locationId, channel, totalCents }) => ({ locationId, channel, totalCents }))).toEqual([
      { locationId: 'online', channel: 'online', totalCents: 150 },
      { locationId: 'store-1', channel: 'store', totalCents: 200 }
    ])
    expect(result.topProducts.find(product => product.productId === 1)).toMatchObject({
      productId: 1,
      quantity: 2,
      totalCents: 150
    })
  })

  it('intersects inclusive dates, channel, and location filters', () => {
    const product = makeProduct(1, 100)
    const data = makeData([
      makeOrder('online-before', '2025-03-01', 'online', [makeLine(product)]),
      makeOrder('store-one', '2025-03-02', 'store-1', [makeLine(product)]),
      makeOrder('store-two', '2025-03-03', 'store-2', [makeLine(product)]),
      makeOrder('online-after', '2025-03-04', 'online', [makeLine(product)])
    ], [product])

    const result = computeSalesDashboard(data, {
      startDate: '2025-03-02',
      endDate: '2025-03-04',
      channel: 'store',
      locationId: 'store-2'
    })

    expect(result.kpis).toMatchObject({ orderCount: 1, totalCents: 100 })
    expect(result.byChannel).toEqual([{ channel: 'store', orderCount: 1, totalCents: 100 }])
    expect(result.byLocation.map(location => location.locationId)).toEqual(['store-2'])
    expect(result.monthly).toEqual([{ month: '2025-03', orderCount: 1, totalCents: 100 }])
    expect(computeSalesDashboard(data, {
      startDate: '2025-03-02',
      endDate: '2025-03-03'
    }).kpis).toMatchObject({ orderCount: 2, totalCents: 200 })
  })

  it('returns an explicit zero result when channel and location are incompatible', () => {
    const result = computeSalesDashboard(makeData([
      makeOrder('store-sale', '2025-03-01', 'store-1', [makeLine(makeProduct(1))])
    ]), { channel: 'online', locationId: 'store-1' })

    expect(result).toEqual({
      kpis: { orderCount: 0, totalCents: 0, averageOrderCents: null },
      byLocation: [],
      byChannel: [],
      topProducts: [],
      monthly: []
    })
  })

  it('rounds a half-cent average up using integer arithmetic', () => {
    const product = makeProduct(1)
    const result = computeSalesDashboard(makeData([
      makeOrder('two-cents', '2025-03-01', 'store-1', [makeLine(product, 1, 2)]),
      makeOrder('three-cents', '2025-03-02', 'online', [makeLine(product, 1, 3)])
    ], [product]))

    expect(result.kpis).toEqual({ orderCount: 2, totalCents: 5, averageOrderCents: 3 })
  })

  it('ranks at most ten products by revenue, quantity, then product id', () => {
    const products = Array.from({ length: 11 }, (_, index) => makeProduct(index + 1))
    const lines = products.map(product => makeLine(
      product,
      product.id === 2 || product.id === 3 ? 2 : 1,
      product.id === 1 ? 200 : 50
    ))
    const result = computeSalesDashboard(makeData([
      makeOrder('many-products', '2025-03-01', 'store-1', lines)
    ], products))

    expect(result.topProducts.map(product => product.productId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('uses quantity to break equal-revenue ties before product id', () => {
    const products = [makeProduct(1), makeProduct(2), makeProduct(3)]
    const result = computeSalesDashboard(makeData([
      makeOrder('ties', '2025-03-01', 'store-1', [
        makeLine(products[0]!, 1, 100),
        makeLine(products[1]!, 2, 50),
        makeLine(products[2]!, 2, 50)
      ])
    ], products))

    expect(result.topProducts.map(product => product.productId)).toEqual([2, 3, 1])
  })

  it('rejects invalid filters and unknown locations with INVALID_FILTER', () => {
    const data = makeData([])

    expectErrorCode(() => computeSalesDashboard(data, { startDate: '2025-02-30' }), 'INVALID_FILTER')
    expectErrorCode(() => computeSalesDashboard(data, { startDate: '2025-04-01', endDate: '2025-03-01' }), 'INVALID_FILTER')
    expectErrorCode(() => computeSalesDashboard(data, { locationId: 'unknown' }), 'INVALID_FILTER')
  })

  it('rejects malformed orders and unknown references with INVALID_DATA', () => {
    const product = makeProduct(1)

    expectErrorCode(() => computeSalesDashboard(makeData([
      makeOrder('bad-date', 'not-a-date', 'store-1', [makeLine(product)])
    ], [product])), 'INVALID_DATA')
    expectErrorCode(() => computeSalesDashboard(makeData([
      makeOrder('unknown-product', '2025-03-01', 'store-1', [makeLine(makeProduct(99))])
    ], [product])), 'INVALID_DATA')
    expectErrorCode(() => computeSalesDashboard({
      ...makeData([]),
      orders: [makeOrder('unknown-customer', '2025-03-01', 'store-1', [makeLine(product)], 'missing')]
    }), 'INVALID_DATA')
  })

  it('reports amounts beyond safe integer precision as UNREPRESENTABLE_AMOUNT', () => {
    const product = makeProduct(1, 2)
    const tooMany = Math.floor(Number.MAX_SAFE_INTEGER / 2) + 1

    expectErrorCode(() => computeSalesDashboard(makeData([
      makeOrder('overflow', '2025-03-01', 'store-1', [makeLine(product, tooMany, 2)])
    ], [product])), 'UNREPRESENTABLE_AMOUNT')
  })
})
