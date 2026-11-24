// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SalesDashboard from './SalesDashboard.vue'
import SalesDashboardFilters from './SalesDashboardFilters.vue'
import type { SalesData, SalesLocation } from '../types/sales'
import type { SalesDashboardFilters as FilterValues } from '../types/salesDashboard'

const locations: readonly SalesLocation[] = [
  { id: 'store-1', name: 'Atelier Nord', channel: 'store' },
  { id: 'online', name: 'Portail en ligne', channel: 'online' }
]

const createSalesData = (): SalesData => {
  const products = [
    { id: 1, name: 'Ampoule d’essai', category: 'Laboratoire', priceCents: 3000 },
    { id: 2, name: 'Manuel solaire', category: 'Ouvrages', priceCents: 4000 }
  ].map(product => ({
    ...product,
    description: 'Produit fictif de test.',
    supplier: 'Atelier de test',
    origin: 'Central',
    status: 'Courant',
    illustration: 'illustrations/test.svg',
    imageAlt: product.name,
    saleStartDate: '2024-01-01',
    themes: []
  }))
  const line = (productId: number, quantity: number, listUnitPriceCents: number, unitPriceCents: number) => {
    const product = products.find(item => item.id === productId)!
    return {
      product: { id: product.id, name: product.name, category: product.category },
      quantity,
      listUnitPriceCents,
      unitPriceCents,
      promotionCode: unitPriceCents < listUnitPriceCents ? 'DEMO' : null
    }
  }

  return {
    products,
    locations: [
      { id: 'store-north', name: 'Atelier Nord', channel: 'store' },
      { id: 'store-south', name: 'Atelier Sud', channel: 'store' },
      { id: 'online', name: 'Portail en ligne', channel: 'online' }
    ],
    customers: [{
      id: 'customer-1',
      region: 'Central',
      homeStoreId: 'store-north',
      joinedOn: '2024-01-01',
      preferredCategory: 'Ouvrages',
      preferredChannel: 'store'
    }],
    orders: [
      { id: 'before-period', date: '2025-02-28', customerId: 'customer-1', locationId: 'store-north', lines: [line(1, 1, 1200, 800)] },
      { id: 'start-boundary', date: '2025-03-01', customerId: 'customer-1', locationId: 'store-north', lines: [line(1, 2, 1000, 450)] },
      { id: 'end-boundary', date: '2025-03-31', customerId: 'customer-1', locationId: 'online', lines: [line(2, 1, 2500, 2000)] },
      { id: 'local-demo-order', date: '2025-03-31', customerId: 'customer-1', locationId: 'store-south', lines: [line(1, 1, 1000, 500)] },
      { id: 'after-period', date: '2025-04-01', customerId: 'customer-1', locationId: 'store-south', lines: [line(1, 1, 1000, 700)] }
    ]
  }
}

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

  it('updates all dashboard widgets for inclusive dates, combined filters, and a local demo order', async () => {
    const wrapper = mount(SalesDashboard, { props: { data: createSalesData() } })
    const kpis = () => wrapper.findAll('.kpi strong').map(value => value.text())

    expect(kpis()).toEqual(['$49.00', '5', '$9.80'])

    await wrapper.find('#sales-start-date').setValue('2025-03-01')
    await wrapper.find('#sales-end-date').setValue('2025-03-31')
    expect(kpis()).toEqual(['$34.00', '3', '$11.33'])
    expect(wrapper.findAll('.channel-name').map(value => value.text())).toEqual(['Portail en ligne', 'Magasin'])
    const southRow = wrapper.findAll('.locations-widget tbody tr').find(row => row.find('th').text() === 'Atelier Sud')
    expect(southRow?.findAll('td').map(cell => cell.text())).toEqual(['Magasin', '1', '$5.00'])
    expect(wrapper.text()).toContain('Ampoule d’essai')
    expect(wrapper.text()).toContain('$34.00')

    await wrapper.find('#sales-end-date').setValue('2025-03-30')
    expect(kpis()).toEqual(['$9.00', '1', '$9.00'])
    await wrapper.find('#sales-end-date').setValue('2025-03-31')
    expect(kpis()).toEqual(['$34.00', '3', '$11.33'])

    await wrapper.find('#sales-channel').setValue('store')
    await wrapper.find('#sales-location').setValue('store-south')
    expect(kpis()).toEqual(['$5.00', '1', '$5.00'])
    expect(wrapper.findAll('.channel-name').map(value => value.text())).toEqual(['Magasin'])
    const filteredSouthRow = wrapper.find('.locations-widget tbody tr')
    expect(filteredSouthRow.find('th').text()).toBe('Atelier Sud')
    expect(filteredSouthRow.findAll('td').map(cell => cell.text())).toEqual(['Magasin', '1', '$5.00'])
    expect(wrapper.find('.monthly-list').text()).toContain('$5.00')

    await wrapper.find('#sales-channel').setValue('online')
    expect(kpis()).toEqual(['$0.00', '0', 'Non calculé'])
    expect(wrapper.find('[role="status"]').text()).toContain('Aucune commande ne correspond')
    expect(wrapper.find('.channel-list').exists()).toBe(false)
  })

  it('shows a visible error and no dashboard figures for an inverted date range', async () => {
    const wrapper = mount(SalesDashboard, { props: { data: createSalesData() } })

    await wrapper.find('#sales-start-date').setValue('2025-03-31')
    await wrapper.find('#sales-end-date').setValue('2025-03-01')

    expect(wrapper.find('[role="alert"]').text()).toContain('Les filtres du dashboard sont invalides.')
    expect(wrapper.find('.kpis').exists()).toBe(false)
    expect(wrapper.find('.widget-grid').exists()).toBe(false)
  })
})
