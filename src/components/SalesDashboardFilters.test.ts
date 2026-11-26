// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { createDemoSales } from '../data/sales'
import { SALES_STORAGE_KEY } from '../services/salesStorage'
import { formatUSD } from '../services/checkout'
import SalesDashboard from './SalesDashboard.vue'
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

  describe('Dashboard filters with real calculations', () => {
    const makeDataset = () => {
      const dataset = createDemoSales()
      const online = dataset.locations.find(location => location.channel === 'online')!
      const store = dataset.locations.find(location => location.channel === 'store')!
      const [first, second] = dataset.products
      const customer = dataset.customers[0]!
      const order = (id: string, date: string, locationId: string, product: typeof first, unitPriceCents: number) => ({
        id,
        date,
        locationId,
        customerId: customer.id,
        eventIds: [],
        lines: [{
          product: { id: product!.id, name: product!.name, category: product!.category },
          quantity: 1,
          listUnitPriceCents: 5000,
          unitPriceCents,
          promotionCode: 'TEST',
        }],
      })
      dataset.orders = [
        order('one', '2025-03-01', online.id, first, 100),
        order('two', '2025-03-31', store.id, second, 200),
        order('three', '2025-04-01', store.id, second, 400),
      ]
      return { dataset, online, store, first: first!, second: second! }
    }

    it('updates KPIs and all views together across inclusive dates, channels and locations', async () => {
      const { dataset, online, store, first, second } = makeDataset()
      const before = JSON.stringify(dataset)
      const wrapper = mount(SalesDashboard, { props: { dataset } })
      const kpis = () => wrapper.findAll('.kpi strong').map(value => value.text())
      const locationRows = () => wrapper.findAll('.sales-list li').map(row => row.text())
      const channelRows = () => wrapper.findAll('.channel-list li').map(row => row.text())
      const productRows = () => wrapper.findAll('.top-products li').map(row => row.text())
      const months = () => wrapper.findAll('tbody tr').map(row => row.text())

      expect(kpis()).toEqual(['$7.00', '3', '$2.33'])
      expect(locationRows()).toHaveLength(2)
      expect(channelRows()).toHaveLength(2)
      expect(productRows()).toHaveLength(2)
      expect(months().map(row => row.slice(0, 7))).toEqual(['2025-03', '2025-04'])

      await wrapper.get('[aria-label="Date de début (incluse)"]').setValue('2025-03-01')
      await wrapper.get('[aria-label="Date de fin (incluse)"]').setValue('2025-03-31')
      expect(kpis()).toEqual(['$3.00', '2', '$1.50'])
      expect(locationRows()).toEqual(expect.arrayContaining([
        expect.stringContaining(`${online.name}Portail en ligne$1.00`),
        expect.stringContaining(`${store.name}Magasin$2.00`),
      ]))
      expect(channelRows()).toEqual(expect.arrayContaining([
        expect.stringContaining('Portail en ligne$1.00'),
        expect.stringContaining('Magasins$2.00'),
      ]))
      expect(productRows().join(' ')).toContain(first.name)
      expect(productRows().join(' ')).toContain(second.name)
      expect(months()).toHaveLength(1)
      expect(months()[0]).toBe('2025-03$3.002')

      await wrapper.get('[aria-label="Canal"]').setValue('store')
      expect(kpis()).toEqual(['$2.00', '1', '$2.00'])
      expect(locationRows()).toHaveLength(1)
      expect(locationRows()[0]).toContain(store.name)
      expect(channelRows()).toHaveLength(1)
      expect(channelRows()[0]).toContain('Magasins$2.00')
      expect(productRows()).toHaveLength(1)
      expect(productRows()[0]).toContain(second.name)
      expect(months()[0]).toBe('2025-03$2.001')

      await wrapper.get('[aria-label="Canal"]').setValue('')
      await wrapper.get('[aria-label="Point de vente"]').setValue(online.id)
      expect(kpis()).toEqual(['$1.00', '1', '$1.00'])
      expect(locationRows()).toHaveLength(1)
      expect(locationRows()[0]).toContain('Portail en ligne')
      expect(channelRows()[0]).toContain('Portail en ligne$1.00')
      expect(productRows()[0]).toContain(first.name)
      expect(months()[0]).toBe('2025-03$1.001')

      await wrapper.get('[aria-label="Canal"]').setValue('store')
      expect(wrapper.get('.dashboard-empty').text()).toContain('Aucune commande')
      expect(wrapper.findAll('.empty-kpis dd').map(value => value.text())).toEqual(['0', '$0.00', 'Non calculé'])
      expect(wrapper.find('.widget-grid').exists()).toBe(false)

      await wrapper.get('[aria-label="Canal"]').setValue('online')
      expect(kpis()).toEqual(['$1.00', '1', '$1.00'])
      expect(JSON.stringify(dataset)).toBe(before)
    })

    it('shows errors without stale results for malformed and inverted dates, and recovers when cleared', async () => {
      const { dataset } = makeDataset()
      const wrapper = mount(SalesDashboard, { props: { dataset } })
      const start = wrapper.get('[aria-label="Date de début (incluse)"]')
      const end = wrapper.get('[aria-label="Date de fin (incluse)"]')

      await start.setValue('2025-02-30')
      expect(wrapper.get('[role="alert"]').text()).toContain('INVALID_FILTER')
      expect(wrapper.find('.dashboard-content').exists()).toBe(false)
      await start.setValue('2025-04-01')
      await end.setValue('2025-03-31')
      expect(wrapper.get('[role="alert"]').text()).toContain('INVALID_FILTER')
      expect(wrapper.find('.dashboard-content').exists()).toBe(false)
      await start.setValue('')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.findAll('.kpi strong').map(value => value.text())).toEqual(['$3.00', '2', '$1.50'])
    })
  })

  describe('Local order and existing storefront paths', () => {
    afterEach(() => {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    })

    it('filters a locally persisted order and retains the shop, search, cart and raw register', async () => {
      const entries = new Map<string, string>()
      const storage: Storage = {
        get length() { return entries.size },
        clear: () => entries.clear(),
        getItem: key => entries.get(key) ?? null,
        key: index => [...entries.keys()][index] ?? null,
        removeItem: key => { entries.delete(key) },
        setItem: (key, value) => { entries.set(key, value) },
      }
      vi.stubGlobal('localStorage', storage)
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2030-01-15T12:00:00Z'))
      const wrapper = mount(App)
      try {
        const firstProduct = createDemoSales().products[0]!
        await wrapper.get('#search').setValue(firstProduct.name)
        expect(wrapper.findAll('.shelf .card')).toHaveLength(1)
        expect(wrapper.get('.shelf .card').text()).toContain(firstProduct.name)
        await wrapper.get('.shelf .add').trigger('click')
        await wrapper.get('[aria-controls="cart-panel"]').trigger('click')
        expect(wrapper.get('#cart-panel').text()).toContain(firstProduct.name)
        await wrapper.get('#cart-panel .primary').trigger('click')
        expect(wrapper.get('#cart-panel .receipt').text()).toContain('Commande locale enregistrée')
        const saved = window.localStorage.getItem(SALES_STORAGE_KEY)
        expect(saved).toContain('"date":"2030-01-15"')
        await wrapper.get('[aria-label="Fermer le panier"]').trigger('click')
        await wrapper.get('.nav-btn').trigger('click')

        const setDate = async (label: string, value: string) => {
          await wrapper.get(`[aria-label="${label}"]`).setValue(value)
        }
        await setDate('Date de début (incluse)', '2030-01-15')
        await setDate('Date de fin (incluse)', '2030-01-15')
        expect(wrapper.findAll('.kpi strong').map(value => value.text())).toEqual([
          formatUSD(firstProduct.priceCents), '1', formatUSD(firstProduct.priceCents),
        ])
        expect(wrapper.get('.top-products').text()).toContain(firstProduct.name)
        expect(wrapper.get('tbody').text()).toContain('2030-01')
        await wrapper.get('[aria-label="Canal"]').setValue('store')
        expect(wrapper.get('.dashboard-empty').text()).toContain('Aucune commande')
        await wrapper.get('[aria-label="Canal"]').setValue('online')
        expect(wrapper.findAll('.kpi strong')[1]!.text()).toBe('1')
        await setDate('Date de fin (incluse)', '')
        await setDate('Date de début (incluse)', '2030-01-16')
        expect(wrapper.get('.dashboard-empty').text()).toContain('Aucune commande')

        const rawButton = wrapper.findAll('.data-tabs button').find(button => button.text() === 'Registre brut')!
        await rawButton.trigger('click')
        expect(wrapper.get('[aria-label="Données brutes : orders"]').text()).toContain('"id"')
        expect(window.localStorage.getItem(SALES_STORAGE_KEY)).toBe(saved)
        await wrapper.get('.nav-btn').trigger('click')
        expect((wrapper.get('#search').element as HTMLInputElement).value).toBe(firstProduct.name)
        expect(wrapper.get('.shelf .card').text()).toContain(firstProduct.name)
      } finally {
        wrapper.unmount()
      }
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
