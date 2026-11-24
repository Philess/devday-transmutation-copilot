// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalesData } from '../types/sales'
import type { SalesDashboardResult } from '../types/salesDashboard'
import { computeSalesDashboard } from '../services/salesDashboard'
import SalesDashboard from './SalesDashboard.vue'

vi.mock('../services/salesDashboard', () => ({
  computeSalesDashboard: vi.fn()
}))

const data: SalesData = {
  products: [],
  locations: [
    { id: 'online', name: 'Portail', channel: 'online' },
    { id: 'store-01', name: 'Magasin Central', channel: 'store' }
  ],
  customers: [],
  orders: []
}

const result: SalesDashboardResult = {
  kpis: { orderCount: 3, totalCents: 123456, averageOrderCents: 41152 },
  byLocation: [
    { locationId: 'store-01', locationName: 'Magasin Central', channel: 'store', orderCount: 2, totalCents: 90000 },
    { locationId: 'online', locationName: 'Portail', channel: 'online', orderCount: 1, totalCents: 33456 }
  ],
  byChannel: [
    { channel: 'store', orderCount: 2, totalCents: 90000 },
    { channel: 'online', orderCount: 1, totalCents: 33456 }
  ],
  topProducts: [
    { productId: 7, productName: 'Alambic de cuivre', category: 'Instruments', quantity: 4, totalCents: 80000 }
  ],
  monthly: [
    { month: '2025-02', orderCount: 1, totalCents: 33456 },
    { month: '2025-03', orderCount: 2, totalCents: 90000 }
  ]
}

beforeEach(() => {
  vi.mocked(computeSalesDashboard).mockReset()
  vi.mocked(computeSalesDashboard).mockReturnValue(result)
})

describe('SalesDashboard', () => {
  it('renders KPIs and each sales widget from the shared service result', () => {
    const wrapper = mount(SalesDashboard, { props: { data } })

    expect(computeSalesDashboard).toHaveBeenCalledWith(data, {})
    expect(wrapper.get('.kpi-total strong').text()).toBe('$1,234.56')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('$411.52')
    expect(wrapper.text()).toContain('Magasin Central')
    expect(wrapper.text()).toContain('Portail en ligne')
    expect(wrapper.text()).toContain('Alambic de cuivre')
    expect(wrapper.text()).toContain('février 2025')
    expect(wrapper.text()).toContain('mars 2025')
    expect(wrapper.text()).toContain('pas des paiements ou encaissements réels')
  })

  it('shows zero sales and no average for an empty selection', () => {
    vi.mocked(computeSalesDashboard).mockReturnValue({
      ...result,
      kpis: { orderCount: 0, totalCents: 0, averageOrderCents: null },
      byLocation: [],
      byChannel: [],
      topProducts: [],
      monthly: []
    })
    const wrapper = mount(SalesDashboard, { props: { data } })

    expect(wrapper.get('.kpi-total strong').text()).toBe('$0.00')
    expect(wrapper.text()).toContain('Aucune commande ne correspond à la sélection')
    expect(wrapper.text()).toContain('Non calculé')
    expect(wrapper.text()).toContain('Aucun produit vendu')
  })

  it('shows service errors without displaying any figures', () => {
    vi.mocked(computeSalesDashboard).mockImplementation(() => {
      throw new Error('Données de ventes invalides.')
    })
    const wrapper = mount(SalesDashboard, { props: { data } })

    expect(wrapper.get('[role="alert"]').text()).toContain('Données de ventes invalides.')
    expect(wrapper.find('.kpis').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('$')
  })

  it('formats the largest safe cent amount exactly across every widget', () => {
    const cents = Number.MAX_SAFE_INTEGER
    vi.mocked(computeSalesDashboard).mockReturnValue({
      kpis: { orderCount: 1, totalCents: cents, averageOrderCents: cents },
      byLocation: [{ locationId: 'store-01', locationName: 'Magasin Central', channel: 'store', orderCount: 1, totalCents: cents }],
      byChannel: [{ channel: 'store', orderCount: 1, totalCents: cents }],
      topProducts: [{ productId: 7, productName: 'Alambic de cuivre', category: 'Instruments', quantity: 1, totalCents: cents }],
      monthly: [{ month: '2025-03', orderCount: 1, totalCents: cents }]
    })
    const wrapper = mount(SalesDashboard, { props: { data } })

    expect(wrapper.text().match(/\$90,071,992,547,409\.91/g)).toHaveLength(6)
  })

  it('recomputes when the source dataset changes', async () => {
    const updated: SalesData = { ...data, orders: [{ id: 'new-order', date: '2025-03-15', customerId: 'c1', locationId: 'store-01', lines: [] }] }
    const wrapper = mount(SalesDashboard, { props: { data } })

    await wrapper.setProps({ data: updated })

    expect(computeSalesDashboard).toHaveBeenLastCalledWith(updated, {})
  })

  it('recomputes the result when filters change', async () => {
    const wrapper = mount(SalesDashboard, {
      props: { data },
      global: {
        stubs: {
          SalesDashboardFilters: {
            template: '<button @click="$emit(\'update:modelValue\', { channel: \'store\' })">Magasins uniquement</button>'
          }
        }
      }
    })

    await wrapper.get('button').trigger('click')

    expect(computeSalesDashboard).toHaveBeenLastCalledWith(data, { channel: 'store' })
  })
})
