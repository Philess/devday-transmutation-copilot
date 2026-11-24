// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { SalesDataset } from '../types/sales'
import WorkshopDataView from './WorkshopDataView.vue'

vi.mock('./SalesDashboard.vue', () => ({
  default: {
    props: ['data'],
    template: '<section data-test="sales-dashboard">Synthèse fictive</section>'
  }
}))

const dataset: SalesDataset = {
  metadata: {
    schemaVersion: 1,
    fictional: true,
    seed: 1,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    currency: 'USD',
    timezone: 'UTC',
    description: 'Jeu de démonstration',
    limitations: 'Fictif'
  },
  products: [],
  locations: [{ id: 'online', name: 'Portail', channel: 'online', region: 'En ligne', openedOn: '2020-01-01' }],
  customers: [],
  events: [],
  orders: []
}

describe('WorkshopDataView', () => {
  it('opens the dashboard while keeping the raw read-only register available', async () => {
    const wrapper = mount(WorkshopDataView, { props: { dataset } })

    expect(wrapper.find('[data-test="sales-dashboard"]').exists()).toBe(true)
    expect(wrapper.find('pre').exists()).toBe(false)

    await wrapper.get('button[aria-pressed="false"]').trigger('click')

    expect(wrapper.find('[data-test="sales-dashboard"]').exists()).toBe(false)
    expect(wrapper.find('pre').exists()).toBe(true)
    expect(wrapper.text()).toContain('Démonstration locale.')
    expect(wrapper.find('button[aria-pressed="true"]').text()).toBe('Données brutes')
  })
})
