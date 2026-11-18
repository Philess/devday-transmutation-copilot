import { describe, expect, it } from 'vitest'
import { createDemoProducts } from './products'
import { createDemoSales } from './sales'

const data = createDemoSales()
const days = (start: string, end: string) => (Date.parse(end) - Date.parse(start)) / 86400000 + 1

describe('fictional two-year sales fixture', () => {
  it('provides a complete local catalog with stable, usable product records', () => {
    expect(data.products.length).toBeGreaterThanOrEqual(24)
    expect(data.products).toEqual(createDemoProducts())
    expect(new Set(data.products.map(product => product.id)).size).toBe(data.products.length)
    expect(new Set(data.products.map(product => product.category).filter(Boolean)).size).toBeGreaterThanOrEqual(6)
    for (const product of data.products) {
      expect(product.id).toBeGreaterThan(0)
      expect(product.name.trim()).not.toBe('')
      expect(product.category.trim()).not.toBe('')
      expect(Number.isSafeInteger(product.priceCents)).toBe(true)
      expect(product.priceCents).toBeGreaterThan(0)
      expect(product.illustration).toMatch(/^illustrations\/.+\.svg$/)
      expect(product.imageAlt.trim()).not.toBe('')
    }
  })

  it('covers every month in 2024 and 2025 with distinct physical and online locations', () => {
    expect(data.metadata).toMatchObject({
      schemaVersion: 1, fictional: true, currency: 'USD', timezone: 'UTC',
      startDate: '2024-01-01', endDate: '2025-12-31'
    })
    expect(data.locations.filter(location => location.channel === 'store')).toHaveLength(10)
    expect(data.locations.filter(location => location.channel === 'online')).toMatchObject([
      { id: 'online', name: 'Online Requisition Portal' }
    ])
    expect(data.customers).toHaveLength(600)
    expect(data.events).toHaveLength(10)
    for (const entities of [data.customers, data.locations, data.products, data.orders, data.events]) {
      expect(new Set(entities.map(entity => entity.id)).size).toBe(entities.length)
    }
    for (const year of ['2024', '2025']) {
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`
        expect(data.orders.filter(order => order.date.startsWith(monthKey)).length, monthKey).toBeGreaterThan(10)
      }
    }
    expect(data.orders[0]?.date).toBe('2024-01-01')
    expect(data.orders[data.orders.length - 1]?.date).toBe('2025-12-31')
  })

  it('maintains valid customer, location, product and event references with historical cent prices', () => {
    const customers = new Map(data.customers.map(customer => [customer.id, customer]))
    const locations = new Map(data.locations.map(location => [location.id, location]))
    const products = new Map(data.products.map(product => [product.id, product]))
    const soldProducts = new Set<number>()
    const orderIds = new Set<string>()
    const lineIds = new Set<string>()

    for (const customer of data.customers) {
      const home = locations.get(customer.homeStoreId)
      expect(home).toMatchObject({ channel: 'store', region: customer.region })
      expect(customer.joinedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    for (const order of data.orders) {
      expect(orderIds.has(order.id)).toBe(false)
      orderIds.add(order.id)
      expect(new Date(`${order.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(order.date)
      const customer = customers.get(order.customerId)
      const location = locations.get(order.locationId)
      expect(customer).toBeDefined()
      expect(location).toBeDefined()
      expect(customer!.joinedOn <= order.date).toBe(true)
      expect(location!.openedOn <= order.date).toBe(true)
      expect(order.lines.length).toBeGreaterThan(0)
      expect(new Set(order.lines.map(line => line.product.id)).size).toBe(order.lines.length)
      expect(order.eventIds).toEqual(data.events
        .filter(event => event.startDate <= order.date && event.endDate >= order.date)
        .map(event => event.id))

      for (const line of order.lines) {
        const product = products.get(line.product.id)
        expect(product).toMatchObject({ name: line.product.name, category: line.product.category })
        expect(order.date >= product!.saleStartDate).toBe(true)
        expect(Number.isSafeInteger(line.quantity)).toBe(true)
        expect(line.quantity).toBeGreaterThan(0)
        expect(Number.isSafeInteger(line.listUnitPriceCents)).toBe(true)
        expect(Number.isSafeInteger(line.unitPriceCents)).toBe(true)
        expect(line.unitPriceCents).toBeGreaterThan(0)
        expect(line.unitPriceCents).toBeLessThanOrEqual(line.listUnitPriceCents)
        if (line.promotionCode) expect(line.unitPriceCents).toBeLessThan(line.listUnitPriceCents)
        lineIds.add(`${order.id}:${line.product.id}`)
        soldProducts.add(line.product.id)
      }
    }

    expect(soldProducts.size).toBe(data.products.length)
    expect(data.orders.some(order => order.lines.length > 1)).toBe(true)
    expect(data.orders.some(order => order.locationId === 'online')).toBe(true)
    expect(data.orders.some(order => order.locationId !== 'online')).toBe(true)
    expect(lineIds.size).toBeGreaterThan(data.orders.length)
  })

  it('includes promotions, price changes and observable workshop scenarios', () => {
    const products = new Map(data.products.map(product => [product.id, product]))
    const lines = data.orders.flatMap(order => order.lines.map(line => ({ order, line, product: products.get(line.product.id)! })))
    expect(lines.some(({ line }) => line.promotionCode !== null)).toBe(true)
    expect(lines.some(({ line, product }) => line.unitPriceCents !== product.priceCents)).toBe(true)

    const onlineRate = (year: string): number => {
      const orders = data.orders.filter(order => order.date.startsWith(year))
      return orders.filter(order => order.locationId === 'online').length / orders.length
    }
    expect(onlineRate('2025')).toBeGreaterThan(onlineRate('2024'))

    const automailLines = lines.filter(({ product }) => product.category === 'Automails et pièces mécaniques')
    expect(automailLines.filter(({ order }) => order.locationId === 'store-04').length)
      .toBeGreaterThan(automailLines.filter(({ order }) => order.locationId === 'store-06').length)

    const rareBriggsOrders = data.orders.filter(order => order.locationId === 'store-05'
      && order.lines.some(line => products.get(line.product.id)!.themes.includes('rare')))
    expect(rareBriggsOrders.length).toBeGreaterThan(10)
    expect(rareBriggsOrders.some(order => order.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPriceCents,
      0
    ) >= 50000)).toBe(true)

    for (const year of ['2024', '2025']) {
      const start = `${year}-08-15`
      const end = `${year}-09-30`
      const seasonalUnits = lines.filter(({ order, product }) =>
        order.date >= start && order.date <= end && product.themes.includes('school')
      ).reduce((sum, { line }) => sum + line.quantity, 0)
      const seasonalDays = days(start, end)
      const otherDays = days(`${year}-01-01`, `${year}-12-31`) - seasonalDays
      const otherUnits = lines.filter(({ order, product }) =>
        order.date.startsWith(year) && (order.date < start || order.date > end) && product.themes.includes('school')
      ).reduce((sum, { line }) => sum + line.quantity, 0)
      expect((seasonalUnits / seasonalDays) / (otherUnits / otherDays), `${year} school demand`).toBeGreaterThan(2)
    }

    const physicalStores = new Set(data.locations.filter(location => location.channel === 'store').map(location => location.id))
    for (const order of data.orders.filter(order => order.lines.some(line => products.get(line.product.id)!.themes.includes('rare')))) {
      if (order.locationId === 'online') continue
      expect(physicalStores.has(order.locationId)).toBe(true)
    }
  })

  it('stays small enough to seed browser localStorage and contains no cost or margin fields', () => {
    const storedCharacters = JSON.stringify({ version: 1, dataset: data }).length
    expect(storedCharacters * 2).toBeLessThan(4.5 * 1024 * 1024)
    expect(data.products.every(product => !('costCents' in product) && !('marginCents' in product))).toBe(true)
    expect(data.orders.every(order => order.lines.every(line => !('costCents' in line) && !('marginCents' in line)))).toBe(true)
  })

  it('returns independent deep copies of the bundled fixture', () => {
    const copy = createDemoSales()
    copy.products[0]!.name = 'Modified'
    copy.products[0]!.themes.push('modified')
    copy.orders[0]!.lines[0]!.quantity = 999
    copy.orders[0]!.eventIds.push('modified')
    copy.customers[0]!.region = 'Modified'
    copy.locations[0]!.name = 'Modified'
    expect(createDemoSales()).toEqual(data)
  })
})
