// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalesDataset } from '../types/sales'
import type { SalesDashboardResult } from '../types/salesDashboard'
import SalesDashboard from './SalesDashboard.vue'

const salesMocks = vi.hoisted(() => ({ compute: vi.fn() }))

vi.mock('../services/salesDashboard', () => {
  class SalesDashboardError extends Error {
    readonly code: 'INVALID_FILTER' | 'INVALID_DATA' | 'UNREPRESENTABLE_AMOUNT'
    constructor(code: 'INVALID_FILTER' | 'INVALID_DATA' | 'UNREPRESENTABLE_AMOUNT', message: string) {
      super(message)
      this.code = code
    }
  }
  return {
    SalesDashboardError,
    computeSalesDashboard: salesMocks.compute
  }
})

const dataset = {
  metadata: {
    startDate: '2025-03-01',
    endDate: '2025-03-31',
    currency: 'USD',
    timezone: 'UTC'
  },
  locations: [
    { id: 'online', name: 'Portail', channel: 'online', region: 'Web', openedOn: '2025-01-01' },
    { id: 'store-01', name: 'Magasin Central', channel: 'store', region: 'Est', openedOn: '2025-01-01' }
  ],
  products: [],
  customers: [],
  events: [],
  orders: []
} as unknown as SalesDataset

const manualResult: SalesDashboardResult = {
  kpis: { orderCount: 3, totalCents: 12345, averageOrderCents: 4115 },
  byLocation: [
    { locationId: 'store-01', locationName: 'Magasin Central', channel: 'store', orderCount: 2, totalCents: 10000 },
    { locationId: 'online', locationName: 'Portail', channel: 'online', orderCount: 1, totalCents: 2345 }
  ],
  byChannel: [
    { channel: 'store', orderCount: 2, totalCents: 10000 },
    { channel: 'online', orderCount: 1, totalCents: 2345 }
  ],
  topProducts: [
    { productId: 2, productName: 'Cristal bleu', category: 'Cristaux', quantity: 4, totalCents: 8000 },
    { productId: 1, productName: 'Poudre ancienne', category: 'Poudres', quantity: 2, totalCents: 4345 }
  ],
  monthly: [
    { month: '2025-02', orderCount: 1, totalCents: 2345 },
    { month: '2025-03', orderCount: 2, totalCents: 10000 }
  ]
}

describe('SalesDashboard', () => {
  beforeEach(() => {
    salesMocks.compute.mockReset()
  })

  it('affiche les KPI et tous les widgets avec un résultat construit à la main', () => {
    salesMocks.compute.mockReturnValue(manualResult)
    const wrapper = mount(SalesDashboard, { props: { dataset } })
    expect(wrapper.text()).toContain('Commandes fictives')
    expect(wrapper.text()).toContain('$123.45')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('$41.15')
    expect(wrapper.text()).toContain('Magasin Central')
    expect(wrapper.text()).toContain('Portail en ligne')
    expect(wrapper.text()).toContain('Cristal bleu')
    expect(wrapper.text()).toContain('2025-02')
  })

  it('affiche une période vide sans panier moyen calculé', () => {
    salesMocks.compute.mockReturnValue({
      kpis: { orderCount: 0, totalCents: 0, averageOrderCents: null },
      byLocation: [],
      byChannel: [],
      topProducts: [],
      monthly: []
    })
    const wrapper = mount(SalesDashboard, { props: { dataset } })
    expect(wrapper.text()).toContain('Aucune commande dans cette sélection')
    expect(wrapper.text()).toContain('Panier moyen')
    expect(wrapper.text()).toContain('Non calculé')
  })

  it('affiche une erreur visible sans chiffres de résultat', () => {
    salesMocks.compute.mockImplementation(() => {
      throw new Error('Données de vente invalides')
    })
    const wrapper = mount(SalesDashboard, { props: { dataset } })
    expect(wrapper.get('[role="alert"]').text()).toContain('Les ventes ne peuvent pas être calculées')
    expect(wrapper.text()).toContain('Données de vente invalides')
    expect(wrapper.find('.kpi-grid').exists()).toBe(false)
  })

  it('recalcule lorsque le jeu de données change', async () => {
    salesMocks.compute
      .mockReturnValueOnce(manualResult)
      .mockReturnValueOnce({
        ...manualResult,
        kpis: { orderCount: 4, totalCents: 20000, averageOrderCents: 5000 }
      })
    const wrapper = mount(SalesDashboard, { props: { dataset } })
    expect(wrapper.text()).toContain('$123.45')
    await wrapper.setProps({ dataset: { ...dataset, orders: [] } })
    expect(wrapper.text()).toContain('$200.00')
  })
})
