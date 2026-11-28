import { describe, expect, it } from 'vitest'
import { createDemoSales } from '../data/sales'
import type { OrderLine, SalesData, SalesLocation, SalesOrder } from '../types/sales'
import type { SalesDashboardFilters } from '../types/salesDashboard'
import { computeSalesDashboard, SalesDashboardError } from './salesDashboard'

const locations: SalesLocation[] = [
  { id: 'online', name: 'Online portal', channel: 'online' },
  { id: 'store-1', name: 'First store', channel: 'store' },
  { id: 'store-2', name: 'Second store', channel: 'store' }
]

const makeProduct = (id: number, priceCents = 9999) => ({
  id,
  name: `Product ${id}`,
  category: 'Tools',
  description: '',
  priceCents,
  supplier: '',
  origin: '',
  status: '',
  illustration: '',
  imageAlt: '',
  saleStartDate: '2020-01-01',
  themes: []
})

const makeLine = (
  product: ReturnType<typeof makeProduct>,
  quantity: number,
  unitPriceCents: number,
  listUnitPriceCents = Math.max(unitPriceCents, 1000)
): OrderLine => ({
  product: { id: product.id, name: product.name, category: product.category },
  quantity,
  listUnitPriceCents,
  unitPriceCents,
  promotionCode: unitPriceCents < listUnitPriceCents ? 'DEMO' : null
})

const makeOrder = (
  id: string,
  date: string,
  locationId: string,
  lines: OrderLine[]
): SalesOrder => ({ id, date, locationId, customerId: 'customer-1', lines })

const makeData = (orders: SalesOrder[], productList = [makeProduct(1)]): SalesData => ({
  products: productList,
  locations,
  customers: [{
    id: 'customer-1',
    region: 'Central',
    homeStoreId: 'store-1',
    joinedOn: '2020-01-01',
    preferredCategory: 'Tools',
    preferredChannel: 'store'
  }],
  orders
})

const expectDashboardError = (run: () => unknown, code: SalesDashboardError['code']): void => {
  try {
    run()
    throw new Error(`Expected ${code}`)
  } catch (error) {
    expect(error).toBeInstanceOf(SalesDashboardError)
    expect(error).toMatchObject({ code })
  }
}

describe('computeSalesDashboard', () => {
  it('reconciles the initial March 2025 fixture in exact cents', () => {
    const data = createDemoSales()
    const result = computeSalesDashboard(data, {
      startDate: '2025-03-01',
      endDate: '2025-03-31'
    })

    expect(result.kpis.orderCount).toBe(55)
    expect(result.kpis.totalCents).toBe(646_092)
    expect(result.kpis.averageOrderCents).toBe(11_747)
  })

  it('uses historical discounted prices and keeps the online channel separate from stores', () => {
    const product = makeProduct(1, 9999)
    const data = makeData([
      makeOrder('store-order', '2025-03-01', 'store-1', [makeLine(product, 2, 80, 100)]),
      makeOrder('online-order', '2025-03-02', 'online', [makeLine(product, 1, 200)])
    ], [product])
    const result = computeSalesDashboard(data)

    expect(result.kpis.totalCents).toBe(360)
    expect(result.byChannel).toEqual([
      { channel: 'online', orderCount: 1, totalCents: 200 },
      { channel: 'store', orderCount: 1, totalCents: 160 }
    ])
    expect(result.byLocation).toEqual([
      { locationId: 'online', locationName: 'Online portal', channel: 'online', orderCount: 1, totalCents: 200 },
      { locationId: 'store-1', locationName: 'First store', channel: 'store', orderCount: 1, totalCents: 160 }
    ])
    expect(result.topProducts[0]).toMatchObject({ productId: 1, totalCents: 360, quantity: 3 })
  })

  it('combines inclusive UTC date, channel, and location filters', () => {
    const product = makeProduct(1)
    const data = makeData([
      makeOrder('start', '2025-03-01', 'store-1', [makeLine(product, 1, 100)]),
      makeOrder('middle', '2025-03-02', 'online', [makeLine(product, 1, 200)]),
      makeOrder('end', '2025-03-03', 'store-2', [makeLine(product, 1, 300)])
    ], [product])

    expect(computeSalesDashboard(data, {
      startDate: '2025-03-01',
      endDate: '2025-03-03',
      channel: 'store',
      locationId: 'store-2'
    }).kpis).toEqual({ orderCount: 1, totalCents: 300, averageOrderCents: 300 })
    expect(computeSalesDashboard(data, {
      startDate: '2025-03-01',
      endDate: '2025-03-02',
      channel: 'online'
    }).kpis).toEqual({ orderCount: 1, totalCents: 200, averageOrderCents: 200 })
  })

  it('returns an empty result for a valid but incompatible channel and location', () => {
    const product = makeProduct(1)
    const result = computeSalesDashboard(
      makeData([makeOrder('order', '2025-03-01', 'online', [makeLine(product, 1, 100)])], [product]),
      { channel: 'store', locationId: 'online' }
    )

    expect(result).toEqual({
      kpis: { orderCount: 0, totalCents: 0, averageOrderCents: null },
      byLocation: [],
      byChannel: [],
      topProducts: [],
      monthly: []
    })
  })

  it('rounds average order cents to the nearest cent with half-cent ties upward', () => {
    const product = makeProduct(1)
    const data = makeData([
      makeOrder('two-cents', '2025-03-01', 'store-1', [makeLine(product, 1, 2)]),
      makeOrder('three-cents', '2025-03-02', 'store-1', [makeLine(product, 1, 3)])
    ], [product])

    expect(computeSalesDashboard(data).kpis.averageOrderCents).toBe(3)
  })

  it('ranks the top ten by revenue, quantity, then product id', () => {
    const productList = Array.from({ length: 11 }, (_, index) => makeProduct(index + 1))
    const lines = productList.map(product => {
      const quantity = product.id === 3 ? 2 : 1
      const unitPriceCents = product.id <= 4 ? (product.id === 3 ? 10 : 20) : 1
      return makeLine(product, quantity, unitPriceCents)
    })
    const result = computeSalesDashboard(
      makeData([makeOrder('ranked', '2025-03-01', 'store-1', lines)], productList)
    )

    expect(result.topProducts.map(product => product.productId)).toEqual([3, 1, 2, 4, 5, 6, 7, 8, 9, 10])
  })

  it('returns sorted monthly aggregates and a null average when no orders match', () => {
    const product = makeProduct(1)
    const data = makeData([
      makeOrder('march', '2025-03-15', 'store-1', [makeLine(product, 1, 30)]),
      makeOrder('january', '2025-01-15', 'store-1', [makeLine(product, 1, 10)])
    ], [product])
    const result = computeSalesDashboard(data, { startDate: '2025-04-01' })

    expect(result.kpis).toEqual({ orderCount: 0, totalCents: 0, averageOrderCents: null })
    expect(result.monthly).toEqual([])
    expect(computeSalesDashboard(data).monthly).toEqual([
      { month: '2025-01', orderCount: 1, totalCents: 10 },
      { month: '2025-03', orderCount: 1, totalCents: 30 }
    ])
  })

  const invalidFilters: SalesDashboardFilters[] = [
    { startDate: '2025-02-30' },
    { endDate: '03/31/2025' },
    { startDate: '2025-04-01', endDate: '2025-03-31' },
    { locationId: 'unknown' },
    { channel: 'marketplace' as SalesDashboardFilters['channel'] }
  ]

  it.each(invalidFilters)('rejects invalid filters %j', filters => {
    expectDashboardError(() => computeSalesDashboard(makeData([]), filters), 'INVALID_FILTER')
  })

  it.each([
    (data: SalesData) => { data.orders[1]!.customerId = 'missing-customer' },
    (data: SalesData) => { data.orders[1]!.locationId = 'missing-location' },
    (data: SalesData) => { data.orders[1]!.lines[0]!.product.id = 99 },
    (data: SalesData) => { data.orders[1]!.lines[0]!.quantity = 0 },
    (data: SalesData) => { data.orders[1]!.date = '2025-02-30' },
    (data: SalesData) => { data.orders[1]!.lines = [] }
  ])('rejects invalid orders, lines, and references without partial results', corrupt => {
    const product = makeProduct(1)
    const data = makeData([
      makeOrder('valid', '2025-03-01', 'store-1', [makeLine(product, 1, 100)]),
      makeOrder('corrupt', '2025-03-02', 'store-1', [makeLine(product, 1, 100)])
    ], [product])
    corrupt(data)

    expectDashboardError(
      () => computeSalesDashboard(data, { startDate: '2025-03-01', endDate: '2025-03-01' }),
      'INVALID_DATA'
    )
  })

  it('reports an error when exact line or grouped totals exceed safe integer precision', () => {
    const product = makeProduct(1, Number.MAX_SAFE_INTEGER)
    const data = makeData([
      makeOrder('first', '2025-03-01', 'store-1', [makeLine(product, 1, Number.MAX_SAFE_INTEGER)]),
      makeOrder('second', '2025-03-02', 'store-1', [makeLine(product, 1, Number.MAX_SAFE_INTEGER)])
    ], [product])

    expectDashboardError(() => computeSalesDashboard(data), 'UNREPRESENTABLE_AMOUNT')

    const overflowingLine = makeData([
      makeOrder('overflow', '2025-03-01', 'store-1', [makeLine(product, 2, Number.MAX_SAFE_INTEGER)])
    ], [product])
    expectDashboardError(() => computeSalesDashboard(overflowingLine), 'UNREPRESENTABLE_AMOUNT')
  })

  it('does not mutate sales data or use customer channel preferences', () => {
    const product = makeProduct(1)
    const data = makeData([
      makeOrder('online-order', '2025-03-01', 'online', [makeLine(product, 1, 100)])
    ], [product])
    const before = structuredClone(data)
    const result = computeSalesDashboard(data)

    expect(result.byChannel).toEqual([{ channel: 'online', orderCount: 1, totalCents: 100 }])
    expect(data).toEqual(before)
  })
})
