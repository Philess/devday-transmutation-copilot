import { describe, expect, it } from 'vitest'
import { createDemoSales } from '../data/sales'
import type { OrderLine, SalesData, SalesOrder } from '../types/sales'
import { UNREPRESENTABLE_AMOUNT_MESSAGE } from './money'
import { calculateSales } from './salesCalculations'

const line = (id: number, price: number, quantity = 1): OrderLine => ({
  product: { id, name: `Product ${id}`, category: 'Test' },
  quantity, listUnitPriceCents: price * 2, unitPriceCents: price, promotionCode: 'SALE'
})
const order = (id: string, date: string, locationId: string, lines: OrderLine[]): SalesOrder => ({
  id, date, locationId, customerId: 'customer', lines
})
const sample = (): Pick<SalesData, 'locations' | 'orders'> => ({
  locations: [
    { id: 'shop', name: 'Shop', channel: 'store' },
    { id: 'web', name: 'Web', channel: 'online' }
  ],
  orders: [
    order('a', '2025-03-01', 'shop', [line(1, 100, 2), line(2, 50)]),
    order('b', '2025-03-31', 'web', [line(1, 75)]),
    order('c', '2025-04-01', 'shop', [line(2, 200)])
  ]
})

describe('sales calculations', () => {
  it('counts the bundled March 2025 orders without modifying the fixture', () => {
    const data = createDemoSales()
    const before = JSON.stringify(data)
    const result = calculateSales(data, { startDate: '2025-03-01', endDate: '2025-03-31' })
    expect(result.orderCount).toBe(55)
    expect(result.totalCents).toBe(646092)
    expect(result.byLocation.reduce((sum, item) => sum + item.totalCents, 0)).toBe(result.totalCents)
    expect(result.byChannel.reduce((sum, item) => sum + item.totalCents, 0)).toBe(result.totalCents)
    expect(JSON.stringify(data)).toBe(before)
  })

  it('uses discounted historical prices and the location channel for every grouping', () => {
    const data = { ...sample(), products: [{ id: 1, priceCents: 99999 }] }
    const result = calculateSales(data, { startDate: '2025-03-01', endDate: '2025-03-31' })
    expect(result).toEqual({
      totalCents: 325, orderCount: 2, averageOrderCents: 163,
      byLocation: [
        { location: data.locations[0], totalCents: 250, orderCount: 1 },
        { location: data.locations[1], totalCents: 75, orderCount: 1 }
      ],
      byChannel: [
        { channel: 'online', totalCents: 75, orderCount: 1 },
        { channel: 'store', totalCents: 250, orderCount: 1 }
      ],
      topProducts: [
        { productId: 1, name: 'Product 1', totalCents: 275 },
        { productId: 2, name: 'Product 2', totalCents: 50 }
      ],
      byMonth: [{ month: '2025-03', totalCents: 325, orderCount: 2 }]
    })
    expect(calculateSales(data).byMonth).toEqual([
      { month: '2025-03', totalCents: 325, orderCount: 2 },
      { month: '2025-04', totalCents: 200, orderCount: 1 }
    ])
  })

  it('intersects inclusive dates, channel and location and returns an explicit empty result', () => {
    const data = sample()
    expect(calculateSales(data, { startDate: '2025-03-31', endDate: '2025-03-31', channel: 'online', locationId: 'web' }))
      .toMatchObject({ totalCents: 75, orderCount: 1, averageOrderCents: 75 })
    expect(calculateSales(data, { endDate: '2025-03-01', channel: 'store' }).totalCents).toBe(250)
    expect(calculateSales(data, { startDate: '2025-03-31', channel: 'store', locationId: 'web' })).toEqual({
      totalCents: 0, orderCount: 0, averageOrderCents: null,
      byLocation: [], byChannel: [], topProducts: [], byMonth: []
    })
  })

  it('limits the ranking to ten and breaks equal revenue ties by numeric product ID', () => {
    const data = sample()
    data.orders = [order('ranking', '2025-03-01', 'shop', [
      ...[11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(id => line(id, 100)),
      line(12, 101)
    ])]
    expect(calculateSales(data).topProducts.map(product => product.productId)).toEqual([12, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('rounds averages to nearest cent with half cents upward, including large exact totals', () => {
    const data = sample()
    data.orders = [order('a', '2025-03-01', 'shop', [line(1, 1)]), order('b', '2025-03-01', 'shop', [line(2, 2)])]
    expect(calculateSales(data).averageOrderCents).toBe(2)
    data.orders.push(order('c', '2025-03-01', 'shop', [line(3, 1)]))
    expect(calculateSales(data).averageOrderCents).toBe(1)
    data.orders = [order('a', '2025-03-01', 'shop', [{ ...line(1, 1), unitPriceCents: Number.MAX_SAFE_INTEGER - 1, listUnitPriceCents: Number.MAX_SAFE_INTEGER - 1 }]),
      order('b', '2025-03-01', 'shop', [line(2, 1)])]
    expect(calculateSales(data).averageOrderCents).toBe(4503599627370496)
  })

  it('rejects invalid dates, filters, references, duplicate orders and malformed lines', () => {
    for (const filters of [
      { startDate: '2025-02-29' }, { startDate: '2025-04-01', endDate: '2025-03-31' },
      { endDate: '' }, { channel: 'portal' as 'online' }
    ]) expect(() => calculateSales(sample(), filters)).toThrow()
    const data = sample()
    data.orders[0]!.locationId = 'missing'
    expect(() => calculateSales(data)).toThrow()
    data.orders[0]!.locationId = 'shop'
    data.orders[1]!.id = data.orders[0]!.id
    expect(() => calculateSales(data)).toThrow()
    data.orders[1]!.id = 'b'
    data.orders[0]!.lines[0]!.quantity = -1
    expect(() => calculateSales(data)).toThrow()
    data.orders[0]!.lines[0]!.quantity = 1.5
    expect(() => calculateSales(data)).toThrow()
    data.orders[0]!.lines[0]!.quantity = 1
    data.orders[0]!.date = '2025-02-30'
    expect(() => calculateSales(data)).toThrow()
  })

  it('rejects overflow in a line, an order and across orders', () => {
    const data = sample()
    const max = { ...line(1, 1), unitPriceCents: Number.MAX_SAFE_INTEGER, listUnitPriceCents: Number.MAX_SAFE_INTEGER }
    data.orders = [order('a', '2025-03-01', 'shop', [{ ...max, quantity: 2 }])]
    expect(() => calculateSales(data)).toThrow(UNREPRESENTABLE_AMOUNT_MESSAGE)
    data.orders = [order('a', '2025-03-01', 'shop', [max, line(2, 1)])]
    expect(() => calculateSales(data)).toThrow(UNREPRESENTABLE_AMOUNT_MESSAGE)
    data.orders = [order('a', '2025-03-01', 'shop', [max]), order('b', '2025-03-01', 'web', [line(2, 1)])]
    expect(() => calculateSales(data)).toThrow(UNREPRESENTABLE_AMOUNT_MESSAGE)
  })
})
