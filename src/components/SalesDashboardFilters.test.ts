// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createDemoSales } from '../data/sales'
import { buildSampleOrder } from '../services/checkout'
import type { SalesLocation } from '../types/sales'
import type { SalesDashboardFilters } from '../types/salesDashboard'
import SalesDashboard from './SalesDashboard.vue'
import SalesDashboardFiltersView from './SalesDashboardFilters.vue'

const locations: SalesLocation[] = [
  { id: 'online', name: 'Boutique en ligne', channel: 'online' },
  { id: 'store-1', name: 'Magasin central', channel: 'store' }
]

describe('SalesDashboardFilters', () => {
  it('renders labeled date, channel, and location controls', () => {
    const wrapper = mount(SalesDashboardFiltersView, {
      props: { modelValue: {}, locations }
    })

    expect(wrapper.get('label[for="sales-start-date"]').text()).toContain('Date de début')
    expect(wrapper.get('label[for="sales-end-date"]').text()).toContain('Date de fin')
    expect(wrapper.get('label[for="sales-channel"]').text()).toBe('Canal')
    expect(wrapper.get('label[for="sales-location"]').text()).toBe('Point de vente')
    expect(wrapper.findAll('#sales-channel option').map(option => option.text())).toEqual([
      'Tous les canaux',
      'Boutique en ligne',
      'Magasin'
    ])
    expect(wrapper.findAll('#sales-location option').map(option => option.text())).toEqual([
      'Tous les points de vente',
      'Boutique en ligne (Boutique en ligne)',
      'Magasin central (Magasin)'
    ])
  })

  it('emits a fresh value for each control change without mutating modelValue', async () => {
    const modelValue: SalesDashboardFilters = {
      startDate: '2025-03-01',
      endDate: '2025-03-31',
      channel: 'online',
      locationId: 'online'
    }
    const original = structuredClone(modelValue)
    const wrapper = mount(SalesDashboardFiltersView, {
      props: { modelValue, locations }
    })

    await wrapper.get('#sales-start-date').setValue('2025-03-02')
    await wrapper.get('#sales-channel').setValue('store')
    await wrapper.get('#sales-location').setValue('store-1')
    await wrapper.get('#sales-end-date').setValue('2025-04-01')

    const updates = wrapper.emitted('update:modelValue')!
    expect(updates).toEqual([
      [{ ...modelValue, startDate: '2025-03-02' }],
      [{ ...modelValue, channel: 'store' }],
      [{ ...modelValue, locationId: 'store-1' }],
      [{ ...modelValue, endDate: '2025-04-01' }]
    ])
    expect(new Set(updates.map(([value]) => value)).size).toBe(4)
    expect(modelValue).toEqual(original)
  })

  it('omits cleared filters and passes inverted dates through unchanged', async () => {
    const wrapper = mount(SalesDashboardFiltersView, {
      props: {
        modelValue: {
          startDate: '2025-04-01',
          endDate: '2025-03-31',
          channel: 'online',
          locationId: 'online'
        },
        locations
      }
    })

    await wrapper.get('#sales-start-date').setValue('')
    await wrapper.setProps({
      modelValue: wrapper.emitted('update:modelValue')!.slice(-1)[0]![0] as SalesDashboardFilters
    })
    await wrapper.get('#sales-channel').setValue('')
    await wrapper.setProps({
      modelValue: wrapper.emitted('update:modelValue')!.slice(-1)[0]![0] as SalesDashboardFilters
    })
    await wrapper.get('#sales-location').setValue('')

    expect(wrapper.emitted('update:modelValue')).toEqual([
      [{ endDate: '2025-03-31', channel: 'online', locationId: 'online' }],
      [{ endDate: '2025-03-31', locationId: 'online' }],
      [{ endDate: '2025-03-31' }]
    ])
    expect(wrapper.get('#sales-end-date').element).toHaveProperty('value', '2025-03-31')
  })

  it('updates all dashboard widgets for combined filters and simulated local orders', async () => {
    const sales = createDemoSales()
    sales.orders = []
    sales.customers = []
    const location = sales.locations.find(item => item.channel === 'online')!
    const product = sales.products[0]!
    const simulated = buildSampleOrder(sales, [{
      productId: product.id,
      quantity: 1,
      product
    }], location.id, '2099-01-02')
    const wrapper = mount(SalesDashboard, { props: { dataset: simulated.dataset } })
    const filters = wrapper.findComponent(SalesDashboardFiltersView)

    const expectOneOrderInEveryWidget = (): void => {
      expect(wrapper.findAll('.kpi p').map(item => item.text())[1]).toBe('1')
      expect(wrapper.findAll('.widget')).toHaveLength(4)
      expect(wrapper.findAll('.widget .bar-list li')).toHaveLength(4)
      expect(wrapper.text()).toContain(location.name)
      expect(wrapper.text()).toContain('Boutique en ligne')
      expect(wrapper.text()).toContain(product.name)
    }
    const expectEmptyInEveryWidget = (): void => {
      expect(wrapper.get('.empty-state').text()).toContain('Aucune commande')
      expect(wrapper.findAll('.widget .widget-empty')).toHaveLength(4)
    }

    expectOneOrderInEveryWidget()

    await filters.get('#sales-start-date').setValue('2099-01-02')
    await filters.get('#sales-end-date').setValue('2099-01-02')
    expectOneOrderInEveryWidget()

    await filters.get('#sales-channel').setValue('store')
    expectEmptyInEveryWidget()
    await filters.get('#sales-channel').setValue('online')
    expectOneOrderInEveryWidget()

    await filters.get('#sales-location').setValue(location.id)
    expectOneOrderInEveryWidget()

    await filters.get('#sales-start-date').setValue('2099-01-03')
    expect(wrapper.get('[role="alert"]').text()).toContain('date de début')
    expect(wrapper.find('.kpis').exists()).toBe(false)

    await filters.get('#sales-start-date').setValue('2099-01-02')
    expectOneOrderInEveryWidget()

    await filters.get('#sales-start-date').setValue('')
    await filters.get('#sales-end-date').setValue('2099-01-01')
    expectEmptyInEveryWidget()
  })
})
