// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Product } from '../types/product'
import type { SalesDataset } from '../types/sales'
import { buildSampleOrder } from '../services/checkout'
import SalesDashboard from './SalesDashboard.vue'

const product: Product = {
  id: 1,
  name: 'Cristal bleu',
  category: 'Cristaux',
  description: '',
  priceCents: 9999,
  supplier: 'Atelier fictif',
  origin: 'Bureau',
  status: 'active',
  illustration: '',
  imageAlt: 'Cristal bleu',
  saleStartDate: '2025-01-01',
  themes: []
}

const dataset: SalesDataset = {
  metadata: {
    schemaVersion: 1,
    fictional: true,
    seed: 1,
    startDate: '2025-03-01',
    endDate: '2025-03-31',
    currency: 'USD',
    timezone: 'UTC',
    description: 'Jeu fictif',
    limitations: 'Démonstration locale'
  },
  products: [product],
  locations: [
    { id: 'online', name: 'Portail', channel: 'online', region: 'Web', openedOn: '2025-01-01' },
    { id: 'store-1', name: 'Magasin Central', channel: 'store', region: 'Est', openedOn: '2025-01-01' }
  ],
  customers: [
    { id: 'customer-1', region: 'Est', homeStoreId: 'store-1', joinedOn: '2025-01-01', preferredCategory: 'Cristaux', preferredChannel: 'store' }
  ],
  events: [],
  orders: [
    {
      id: 'order-online',
      date: '2025-03-01',
      customerId: 'customer-1',
      locationId: 'online',
      eventIds: [],
      lines: [{
        product: { id: 1, name: 'Cristal bleu', category: 'Cristaux' },
        quantity: 2,
        listUnitPriceCents: 9999,
        unitPriceCents: 75,
        promotionCode: 'SALE'
      }]
    }
  ]
}

describe('SalesDashboard with real calculations', () => {
  it('uses historical prices and shows known KPI values', () => {
    const before = JSON.stringify(dataset)
    const wrapper = mount(SalesDashboard, { props: { dataset } })

    expect(wrapper.text()).toContain('$1.50')
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('$1.50')
    expect(wrapper.text()).toContain('Portail en ligne')
    expect(wrapper.text()).toContain('Cristal bleu')
    expect(JSON.stringify(dataset)).toBe(before)
  })

  it('includes a locally simulated order and preserves the original dataset', () => {
    const before = JSON.stringify(dataset)
    const { dataset: localDataset } = buildSampleOrder(
      dataset,
      [{ productId: product.id, quantity: 3, product }],
      'store-1',
      '2025-03-04'
    )

    expect(JSON.stringify(dataset)).toBe(before)
    expect(localDataset.orders).toHaveLength(dataset.orders.length + 1)

    const wrapper = mount(SalesDashboard, { props: { dataset: localDataset } })
    expect(wrapper.text()).toContain('$301.47')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('Magasin Central')
  })
})
