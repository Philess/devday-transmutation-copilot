// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createDemoSales } from '../data/sales'
import { buildSampleOrder } from '../services/checkout'
import { computeSalesDashboard } from '../services/salesDashboard'
import type { SalesData } from '../types/sales'
import SalesDashboard from './SalesDashboard.vue'

describe('SalesDashboard with real sales calculations', () => {
  it('renders the reconciled March 2025 figures from the initial fixture', () => {
    const dataset = createDemoSales()
    const marchData: SalesData = {
      products: dataset.products,
      locations: dataset.locations,
      customers: dataset.customers,
      orders: dataset.orders.filter(order => order.date >= '2025-03-01' && order.date <= '2025-03-31')
    }

    const wrapper = mount(SalesDashboard, { props: { data: marchData } })

    expect(wrapper.get('.kpi-total strong').text()).toBe('$6,460.92')
    expect(wrapper.findAll('.kpi strong').map(value => value.text())).toEqual(['$6,460.92', '55', '$117.47'])
    expect(wrapper.text()).toContain('Portail en ligne')
    expect(wrapper.text()).toContain('Évolution mensuelle')
  })

  it('includes a simulated local order after the dataset changes without mutating its source', async () => {
    const dataset = createDemoSales()
    const original = JSON.stringify(dataset)
    const initial = computeSalesDashboard(dataset).kpis
    const product = dataset.products[0]!
    const online = dataset.locations.find(location => location.channel === 'online')!
    const simulated = buildSampleOrder(dataset, [{ productId: product.id, quantity: 2, product }], online.id, dataset.metadata.endDate)
    const wrapper = mount(SalesDashboard, { props: { data: dataset } })

    await wrapper.setProps({ data: simulated.dataset })

    const updated = computeSalesDashboard(simulated.dataset).kpis
    expect(simulated.dataset.orders[simulated.dataset.orders.length - 1]?.id).toBe(simulated.orderId)
    expect(updated.orderCount).toBe(initial.orderCount + 1)
    expect(updated.totalCents).toBe(initial.totalCents + product.priceCents * 2)
    expect(wrapper.findAll('.kpi strong').map(value => value.text())).toEqual([
      `$${(updated.totalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      String(updated.orderCount),
      `$${(updated.averageOrderCents! / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    ])
    expect(JSON.stringify(dataset)).toBe(original)
  })
})
