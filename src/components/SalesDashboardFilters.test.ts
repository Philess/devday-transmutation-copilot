// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SalesDashboardFilters from './SalesDashboardFilters.vue'
import type { SalesLocation } from '../types/sales'
import type { SalesDashboardFilters as FilterValues } from '../types/salesDashboard'

const locations: readonly SalesLocation[] = [
  { id: 'store-1', name: 'Atelier Nord', channel: 'store' },
  { id: 'online', name: 'Portail en ligne', channel: 'online' }
]

describe('SalesDashboardFilters', () => {
  it('renders the date, channel, and provided location controls', () => {
    const wrapper = mount(SalesDashboardFilters, {
      props: { modelValue: {}, locations }
    })

    expect(wrapper.find('label[for="sales-start-date"]').text()).toBe('Date de début')
    expect(wrapper.find('label[for="sales-end-date"]').text()).toBe('Date de fin')
    expect(wrapper.find('#sales-channel').findAll('option').map(option => option.text())).toEqual([
      'Tous les canaux',
      'Portail en ligne',
      'Magasins'
    ])
    expect(wrapper.find('#sales-location').findAll('option').map(option => option.text())).toEqual([
      'Tous les points de vente',
      'Atelier Nord — Magasin',
      'Portail en ligne — Portail en ligne'
    ])
  })

  it.each([
    ['start date', '#sales-start-date', '2025-03-01', 'startDate'],
    ['end date', '#sales-end-date', '2025-03-31', 'endDate'],
    ['channel', '#sales-channel', 'online', 'channel'],
    ['location', '#sales-location', 'store-1', 'locationId']
  ] as const)('emits an updated copy when the %s changes', async (_name, selector, value, key) => {
    const original: FilterValues = Object.freeze({ endDate: '2025-03-31' })
    const wrapper = mount(SalesDashboardFilters, {
      props: { modelValue: original, locations }
    })

    await wrapper.find(selector).setValue(value)

    const emitted = wrapper.emitted('update:modelValue')?.[0]?.[0]
    expect(emitted).toEqual({ ...original, [key]: value })
    expect(emitted).not.toBe(original)
    expect(original).toEqual({ endDate: '2025-03-31' })
  })

  it('omits a filter when its control is cleared', async () => {
    const wrapper = mount(SalesDashboardFilters, {
      props: {
        modelValue: {
          startDate: '2025-03-01',
          channel: 'store',
          locationId: 'store-1'
        },
        locations
      }
    })

    await wrapper.find('#sales-start-date').setValue('')
    await wrapper.find('#sales-channel').setValue('')
    await wrapper.find('#sales-location').setValue('')

    expect(wrapper.emitted('update:modelValue')?.map(([filters]) => filters)).toEqual([
      { channel: 'store', locationId: 'store-1' },
      { startDate: '2025-03-01', locationId: 'store-1' },
      { startDate: '2025-03-01', channel: 'store' }
    ])
  })
})
