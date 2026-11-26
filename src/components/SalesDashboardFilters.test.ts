// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SalesDashboardFilters from './SalesDashboardFilters.vue'
import type { SalesLocation } from '../types/sales'
import type { SalesDashboardFilters as FilterValues } from '../types/salesDashboard'

const locations: readonly SalesLocation[] = [
  { id: 'online', name: 'Portail', channel: 'online' },
  { id: 'store-1', name: 'Magasin central', channel: 'store' },
  { id: 'store-2', name: 'Magasin nord', channel: 'store' },
]

describe('SalesDashboardFilters', () => {
  it('renders inclusive date fields, channel choices, and locations supplied by props', () => {
    const wrapper = mount(SalesDashboardFilters, {
      props: { modelValue: {}, locations },
    })

    expect(wrapper.get('[aria-label="Date de début (incluse)"]').attributes('placeholder')).toBe('AAAA-MM-JJ')
    expect(wrapper.get('[aria-label="Date de fin (incluse)"]').attributes('placeholder')).toBe('AAAA-MM-JJ')
    expect(wrapper.get('[aria-label="Canal"]').findAll('option').map(option => option.text())).toEqual([
      'Tous les canaux',
      'Portail en ligne',
      'Magasins',
    ])
    expect(wrapper.get('[aria-label="Point de vente"]').findAll('option').map(option => option.text())).toEqual([
      'Tous les points de vente',
      'Portail',
      'Magasin central',
      'Magasin nord',
    ])
  })

  it('emits a new object for each filter without mutating the prop and preserves other values', async () => {
    const modelValue: FilterValues = {
      startDate: '2025-03-01',
      endDate: '2025-03-31',
      channel: 'store',
      locationId: 'store-1',
    }
    const wrapper = mount(SalesDashboardFilters, { props: { modelValue, locations } })

    await wrapper.get('[aria-label="Date de début (incluse)"]').setValue('2025-03-05')
    await wrapper.get('[aria-label="Date de fin (incluse)"]').setValue('2025-03-25')
    await wrapper.get('[aria-label="Canal"]').setValue('online')
    await wrapper.get('[aria-label="Point de vente"]').setValue('store-2')

    expect(wrapper.emitted('update:modelValue')).toEqual([
      [{ ...modelValue, startDate: '2025-03-05' }],
      [{ ...modelValue, endDate: '2025-03-25' }],
      [{ ...modelValue, channel: 'online' }],
      [{ ...modelValue, locationId: 'store-2' }],
    ])
    expect(wrapper.emitted('update:modelValue')?.every(([filters]) => filters !== modelValue)).toBe(true)
    expect(modelValue).toEqual({
      startDate: '2025-03-01',
      endDate: '2025-03-31',
      channel: 'store',
      locationId: 'store-1',
    })
  })

  it('omits cleared filters and passes invalid or inverted dates through unchanged', async () => {
    const wrapper = mount(SalesDashboardFilters, {
      props: {
        modelValue: {
          startDate: '2025-03-01',
          endDate: '2025-03-31',
          channel: 'online',
          locationId: 'online',
        },
        locations,
      },
    })

    await wrapper.get('[aria-label="Date de début (incluse)"]').setValue('2025-04-10')
    await wrapper.get('[aria-label="Date de début (incluse)"]').setValue('not-a-date')
    await wrapper.get('[aria-label="Date de fin (incluse)"]').setValue('')
    await wrapper.get('[aria-label="Canal"]').setValue('')
    await wrapper.get('[aria-label="Point de vente"]').setValue('')

    expect(wrapper.emitted('update:modelValue')).toEqual([
      [{ startDate: '2025-04-10', endDate: '2025-03-31', channel: 'online', locationId: 'online' }],
      [{ startDate: 'not-a-date', endDate: '2025-03-31', channel: 'online', locationId: 'online' }],
      [{ startDate: '2025-03-01', channel: 'online', locationId: 'online' }],
      [{ startDate: '2025-03-01', endDate: '2025-03-31', locationId: 'online' }],
      [{ startDate: '2025-03-01', endDate: '2025-03-31', channel: 'online' }],
    ])
  })
})
