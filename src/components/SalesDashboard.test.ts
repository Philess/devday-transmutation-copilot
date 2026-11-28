// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createDemoSales } from '../data/sales'
import { buildSampleOrder, formatUSD } from '../services/checkout'
import { computeSalesDashboard } from '../services/salesDashboard'
import SalesDashboard from './SalesDashboard.vue'
import SalesDashboardFiltersView from './SalesDashboardFilters.vue'

describe('SalesDashboard', () => {
  it('renders consistent KPI and visualization values from the calculation service', () => {
    const dataset = createDemoSales()
    dataset.orders = dataset.orders.filter(order => order.date >= '2025-03-01' && order.date <= '2025-03-31')
    const wrapper = mount(SalesDashboard, { props: { dataset } })

    expect(wrapper.findAll('.kpi p').map(kpi => kpi.text())).toEqual([
      '$6,460.92',
      '55',
      '$117.47'
    ])
    expect(wrapper.text()).toContain('Ventes par point de vente')
    expect(wrapper.text()).toContain('Ventes par canal')
    expect(wrapper.text()).toContain('10 produits principaux')
    expect(wrapper.text()).toContain('Évolution mensuelle')
    expect(wrapper.text()).toContain('Boutique en ligne')
    expect(wrapper.text()).toContain('Magasin')

    const filters = wrapper.findComponent(SalesDashboardFiltersView)
    expect(filters.props('modelValue')).toEqual({})
    expect(filters.props('locations')).toEqual(dataset.locations)
  })

  it('includes a locally simulated order from the updated dataset', async () => {
    const original = createDemoSales()
    const product = original.products[0]!
    const order = buildSampleOrder(original, [{
      productId: product.id,
      quantity: 1,
      product
    }], 'online', '2025-03-31')
    const wrapper = mount(SalesDashboard, { props: { dataset: original } })

    await wrapper.setProps({ dataset: order.dataset })

    const updatedKpis = computeSalesDashboard(order.dataset).kpis
    const displayedKpis = wrapper.findAll('.kpi p').map(kpi => kpi.text())
    expect(displayedKpis).toEqual([
      formatUSD(updatedKpis.totalCents),
      new Intl.NumberFormat('fr-FR').format(updatedKpis.orderCount),
      updatedKpis.averageOrderCents === null ? '—' : formatUSD(updatedKpis.averageOrderCents)
    ])
    expect(updatedKpis.orderCount).toBe(original.orders.length + 1)
  })

  it('shows an explicit empty state without dividing by zero', () => {
    const dataset = createDemoSales()
    dataset.orders = []
    const wrapper = mount(SalesDashboard, { props: { dataset } })

    expect(wrapper.text()).toContain('Aucune commande ne correspond aux filtres.')
    expect(wrapper.text()).toContain('Panier moyen')
    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).not.toContain('NaN')
  })

  it('shows calculation errors without displaying partial figures', () => {
    const dataset = createDemoSales()
    dataset.orders[0]!.lines[0]!.quantity = 0
    const wrapper = mount(SalesDashboard, { props: { dataset } })

    expect(wrapper.get('[role="alert"]').text()).toContain('Aucun chiffre n’est affiché')
    expect(wrapper.text()).not.toContain('$6,460.92')
    expect(wrapper.find('.kpis').exists()).toBe(false)
  })
})
