import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import SalesDashboard from './SalesDashboard.vue'
import { createDemoSales } from '../data/sales'
import { buildSampleOrder } from '../services/checkout'
import type { SalesDataset } from '../types/sales'

const knownSales = (): SalesDataset => {
  const dataset = createDemoSales()
  const store = dataset.locations.find(location => location.channel === 'store')!
  const portal = dataset.locations.find(location => location.channel === 'online')!
  const first = dataset.products[0]!
  const second = dataset.products[1]!
  const order = (id: string, date: string, locationId: string, product: typeof first, quantity: number, unitPriceCents: number): SalesDataset['orders'][number] => ({
    id,
    date,
    customerId: 'fixture-customer',
    locationId,
    eventIds: [],
    lines: [{
      product: { id: product.id, name: product.name, category: product.category },
      quantity,
      listUnitPriceCents: unitPriceCents * 2,
      unitPriceCents,
      promotionCode: 'TEST'
    }]
  })
  dataset.orders = [
    order('store-order', '2025-03-01', store.id, first, 2, 1000),
    order('portal-order', '2025-03-31', portal.id, first, 1, 750),
    order('next-month-order', '2025-04-01', store.id, second, 1, 2000)
  ]
  return dataset
}

const renderDashboard = (dataset: SalesDataset): Promise<string> =>
  renderToString(createSSRApp(SalesDashboard, { dataset }))

describe('sales dashboard', () => {
  it('renders exact KPIs and all sales visuals from the shared calculation', async () => {
    const dataset = knownSales()
    const html = await renderDashboard(dataset)

    expect(html).toContain('$47.50')
    expect(html).toContain('3</strong>')
    expect(html).toContain('$15.83')
    expect(html).toContain('Magasins')
    expect(html).toContain('Portail en ligne')
    expect(html).toContain('$40.00')
    expect(html).toContain('$7.50')
    expect(html).toContain('$27.50')
    expect(html).toContain('$20.00')
    expect(html).toContain('Top 10 produits')
    expect(html).toContain('Évolution mensuelle')
    expect(html).toContain('mars 2025')
    expect(html).toContain('avril 2025')
    expect(html).toContain(dataset.products[0]!.name)
    expect(html).toContain('month-chart')
    expect(html).toContain('bar-fill')
    expect(html).toContain('Données fictives')
  })

  it('shows an explicit empty state and does not calculate an average without orders', async () => {
    const dataset = createDemoSales()
    dataset.orders = []
    const html = await renderDashboard(dataset)

    expect(html).toContain('Aucune commande pour le moment')
    expect(html).toContain('$0.00')
    expect(html).toContain('Non calculé')
    expect(html).toContain('Aucune vente par point de vente')
  })

  it('shows calculation errors instead of replacing invalid figures with zeroes', async () => {
    const dataset = knownSales()
    const line = dataset.orders[0]!.lines[0]!
    line.quantity = Number.MAX_SAFE_INTEGER
    const html = await renderDashboard(dataset)

    expect(html).toContain('role="alert"')
    expect(html).toContain('La quantité ou le montant dépasse la précision exacte des centimes.')
    expect(html).not.toContain('$0.00')
  })

  it('includes a locally simulated order on the next render without mutating its input', async () => {
    const initial = createDemoSales()
    const original = JSON.stringify(initial)
    const product = initial.products[0]!
    const store = initial.locations.find(location => location.channel === 'store')!
    const order = buildSampleOrder(
      initial,
      [{ productId: product.id, quantity: 1, product }],
      store.id,
      initial.metadata.endDate
    )
    const html = await renderDashboard(order.dataset)
    const expectedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
      .format(order.dataset.orders.reduce((sum, item) => sum + item.lines.reduce((orderSum, line) => orderSum + line.quantity * line.unitPriceCents, 0), 0) / 100)

    expect(html).toContain(expectedTotal)
    expect(JSON.stringify(initial)).toBe(original)
    expect(order.dataset.orders).toHaveLength(initial.orders.length + 1)
  })
})
