import { describe, expect, it } from 'vitest'
import { createDemoSales } from '../data/sales'
import { buildSampleOrder } from '../services/checkout'
import type { SalesDataset, SalesOrder } from '../types/sales'
import { useSalesDashboard } from './salesDashboardState'

const fixture = (): SalesDataset => {
  const dataset = createDemoSales()
  const store = dataset.locations.find(location => location.channel === 'store')!
  const portal = dataset.locations.find(location => location.channel === 'online')!
  const [first, second] = dataset.products
  const order = (id: string, date: string, locationId: string, product: NonNullable<typeof first>, unitPriceCents: number): SalesOrder & { eventIds: string[] } => ({
    id,
    date,
    customerId: dataset.customers[0]!.id,
    locationId,
    eventIds: [],
    lines: [{
      product: { id: product.id, name: product.name, category: product.category },
      quantity: 1,
      listUnitPriceCents: unitPriceCents * 2,
      unitPriceCents,
      promotionCode: 'TEST'
    }]
  })
  dataset.orders = [
    order('store-first', '2025-03-01', store.id, first!, 1000),
    order('portal-last', '2025-03-31', portal.id, first!, 750),
    order('store-next', '2025-04-01', store.id, second!, 2000)
  ]
  return dataset
}

describe('sales dashboard filters', () => {
  it('updates all summary groups together for inclusive dates, channel and point of sale', () => {
    const dataset = fixture()
    const dashboard = useSalesDashboard(() => dataset)

    expect(dashboard.calculation.value.summary?.totalCents).toBe(3750)
    dashboard.startDate.value = '2025-03-01'
    dashboard.endDate.value = '2025-03-31'
    expect(dashboard.calculation.value.summary).toMatchObject({
      totalCents: 1750,
      orderCount: 2,
      byLocation: [
        { location: { channel: 'online' }, totalCents: 750, orderCount: 1 },
        { location: { channel: 'store' }, totalCents: 1000, orderCount: 1 }
      ],
      byChannel: [
        { channel: 'online', totalCents: 750, orderCount: 1 },
        { channel: 'store', totalCents: 1000, orderCount: 1 }
      ],
      topProducts: [{ totalCents: 1750 }],
      byMonth: [{ month: '2025-03', totalCents: 1750, orderCount: 2 }]
    })

    dashboard.channel.value = 'online'
    dashboard.locationId.value = dataset.locations.find(location => location.channel === 'online')!.id
    dashboard.startDate.value = '2025-03-31'
    dashboard.endDate.value = '2025-03-31'
    expect(dashboard.calculation.value.summary).toMatchObject({
      totalCents: 750,
      orderCount: 1,
      byLocation: [{ location: { channel: 'online' }, totalCents: 750 }],
      byChannel: [{ channel: 'online', totalCents: 750 }],
      byMonth: [{ month: '2025-03', totalCents: 750 }]
    })
  })

  it('shows no average for an empty selection and reports invalid or reversed dates', () => {
    const dataset = fixture()
    const dashboard = useSalesDashboard(() => dataset)
    const store = dataset.locations.find(location => location.channel === 'store')!
    dashboard.channel.value = 'online'
    dashboard.locationId.value = store.id
    expect(dashboard.calculation.value.summary).toMatchObject({
      totalCents: 0, orderCount: 0, averageOrderCents: null, byLocation: [], byChannel: [], topProducts: [], byMonth: []
    })

    dashboard.startDate.value = '2025-02-30'
    expect(dashboard.calculation.value.error).toContain('date de début')
    dashboard.startDate.value = '2025-04-02'
    dashboard.endDate.value = '2025-04-01'
    expect(dashboard.calculation.value.error).toContain('antérieure ou égale')
    expect(dashboard.calculation.value.summary).toBeNull()
  })

  it('includes or excludes a locally simulated order without changing its source dataset', () => {
    const initial = createDemoSales()
    const original = JSON.stringify(initial)
    const product = initial.products[0]!
    const store = initial.locations.find(location => location.channel === 'store')!
    const simulated = buildSampleOrder(
      initial,
      [{ productId: product.id, quantity: 1, product }],
      store.id,
      initial.metadata.endDate
    )
    const dashboard = useSalesDashboard(() => simulated.dataset)
    const orderDate = simulated.dataset.orders[simulated.dataset.orders.length - 1]!.date

    expect(dashboard.calculation.value.summary?.orderCount).toBe(initial.orders.length + 1)
    dashboard.startDate.value = orderDate
    dashboard.endDate.value = orderDate
    dashboard.locationId.value = store.id
    expect(dashboard.calculation.value.summary?.orderCount).toBeGreaterThan(0)
    expect(dashboard.calculation.value.summary?.totalCents).toBe(
      simulated.dataset.orders
        .filter(order => order.date === orderDate && order.locationId === store.id)
        .reduce((sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + line.quantity * line.unitPriceCents, 0), 0)
    )

    dashboard.startDate.value = '9999-12-31'
    dashboard.endDate.value = '9999-12-31'
    expect(dashboard.calculation.value.summary?.orderCount).toBe(0)
    expect(JSON.stringify(initial)).toBe(original)
  })
})
