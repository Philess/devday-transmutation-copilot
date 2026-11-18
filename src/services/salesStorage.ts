import { createDemoSales } from '../data/sales'
import type { SalesDataset } from '../types/sales'

export const SALES_STORAGE_KEY = 'central-alchemy-supply.sales.v1'

type SalesStorage = Pick<Storage, 'getItem' | 'setItem'>

const isDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

const isSalesDataset = (value: unknown): value is SalesDataset => {
  if (typeof value !== 'object' || value === null) return false
  if (!('metadata' in value) || typeof value.metadata !== 'object' || value.metadata === null
    || !('schemaVersion' in value.metadata) || value.metadata.schemaVersion !== 1
    || !('fictional' in value.metadata) || value.metadata.fictional !== true
    || !('currency' in value.metadata) || value.metadata.currency !== 'USD'
    || !('startDate' in value.metadata) || !isDate(value.metadata.startDate)
    || !('endDate' in value.metadata) || !isDate(value.metadata.endDate)
    || value.metadata.startDate > value.metadata.endDate) return false
  if (!('products' in value) || !Array.isArray(value.products)
    || !('locations' in value) || !Array.isArray(value.locations)
    || !('customers' in value) || !Array.isArray(value.customers)
    || !('events' in value) || !Array.isArray(value.events)
    || !('orders' in value) || !Array.isArray(value.orders)) return false

  const products = new Map<number, { name: string; category: string }>()
  for (const product of value.products) {
    if (typeof product !== 'object' || product === null || !('id' in product) || !Number.isSafeInteger(product.id)
      || !('name' in product) || typeof product.name !== 'string' || !product.name.trim()
      || !('category' in product) || typeof product.category !== 'string' || !product.category.trim()
      || !('priceCents' in product) || !Number.isSafeInteger(product.priceCents) || product.priceCents <= 0
      || products.has(product.id)) return false
    products.set(product.id, { name: product.name, category: product.category })
  }

  const locations = new Map<string, { channel: string; region: string }>()
  for (const location of value.locations) {
    if (typeof location !== 'object' || location === null || !('id' in location) || typeof location.id !== 'string'
      || !location.id || !('name' in location) || typeof location.name !== 'string' || !location.name.trim()
      || !('channel' in location) || !['online', 'store'].includes(String(location.channel))
      || !('region' in location) || typeof location.region !== 'string'
      || !('openedOn' in location) || !isDate(location.openedOn)
      || locations.has(location.id)) return false
    locations.set(location.id, { channel: location.channel, region: location.region })
  }

  const customers = new Map<string, { homeStoreId: string; joinedOn: string }>()
  for (const customer of value.customers) {
    if (typeof customer !== 'object' || customer === null || !('id' in customer) || typeof customer.id !== 'string'
      || !customer.id || !('homeStoreId' in customer) || typeof customer.homeStoreId !== 'string'
      || !('joinedOn' in customer) || !isDate(customer.joinedOn)
      || !('region' in customer) || typeof customer.region !== 'string'
      || !('preferredChannel' in customer) || !['online', 'store'].includes(String(customer.preferredChannel))
      || !locations.has(customer.homeStoreId) || locations.get(customer.homeStoreId)?.channel !== 'store'
      || customers.has(customer.id)) return false
    customers.set(customer.id, { homeStoreId: customer.homeStoreId, joinedOn: customer.joinedOn })
  }

  const events = new Map<string, { startDate: string; endDate: string }>()
  for (const event of value.events) {
    if (typeof event !== 'object' || event === null || !('id' in event) || typeof event.id !== 'string'
      || !event.id || !('startDate' in event) || !isDate(event.startDate)
      || !('endDate' in event) || !isDate(event.endDate) || event.startDate > event.endDate
      || events.has(event.id)) return false
    events.set(event.id, { startDate: event.startDate, endDate: event.endDate })
  }

  const orderIds = new Set<string>()
  for (const order of value.orders) {
    if (typeof order !== 'object' || order === null || !('id' in order) || typeof order.id !== 'string'
      || !order.id || orderIds.has(order.id) || !('date' in order) || !isDate(order.date)
      || order.date < value.metadata.startDate || order.date > value.metadata.endDate
      || !('customerId' in order) || typeof order.customerId !== 'string' || !customers.has(order.customerId)
      || customers.get(order.customerId)!.joinedOn > order.date
      || !('locationId' in order) || typeof order.locationId !== 'string' || !locations.has(order.locationId)
      || locations.get(order.locationId)!.openedOn > order.date
      || !('eventIds' in order) || !Array.isArray(order.eventIds)
      || order.eventIds.some(eventId => typeof eventId !== 'string' || !events.has(eventId)
        || events.get(eventId)!.startDate > order.date || events.get(eventId)!.endDate < order.date)
      || !('lines' in order) || !Array.isArray(order.lines) || order.lines.length === 0) return false
    orderIds.add(order.id)

    const lineProductIds = new Set<number>()
    for (const line of order.lines) {
      if (typeof line !== 'object' || line === null || !('product' in line) || typeof line.product !== 'object'
        || line.product === null || !('id' in line.product) || !Number.isSafeInteger(line.product.id)
        || !products.has(line.product.id) || lineProductIds.has(line.product.id)
        || !('name' in line.product) || products.get(line.product.id)!.name !== line.product.name
        || !('category' in line.product) || products.get(line.product.id)!.category !== line.product.category
        || !('quantity' in line) || !Number.isSafeInteger(line.quantity) || line.quantity <= 0
        || !('listUnitPriceCents' in line) || !Number.isSafeInteger(line.listUnitPriceCents) || line.listUnitPriceCents <= 0
        || !('unitPriceCents' in line) || !Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents <= 0
        || line.unitPriceCents > line.listUnitPriceCents
        || !('promotionCode' in line) || !(line.promotionCode === null || typeof line.promotionCode === 'string')) return false
      lineProductIds.add(line.product.id)
    }
  }

  return true
}

export const saveSalesDataset = (dataset: SalesDataset, storage: SalesStorage = window.localStorage): void => {
  if (!isSalesDataset(dataset)) throw new Error('Invalid sales dataset')
  storage.setItem(SALES_STORAGE_KEY, JSON.stringify({ version: 1, dataset }))
}

export const resetSalesDataset = (storage: SalesStorage = window.localStorage): SalesDataset => {
  const dataset = createDemoSales()
  saveSalesDataset(dataset, storage)
  return dataset
}

export const loadSalesDataset = (storage: SalesStorage = window.localStorage): SalesDataset => {
  const saved = storage.getItem(SALES_STORAGE_KEY)
  if (saved === null) return resetSalesDataset(storage)

  let data: unknown
  try {
    data = JSON.parse(saved)
  } catch {
    throw new Error('Saved sales data is not valid JSON')
  }

  if (typeof data !== 'object' || data === null || !('version' in data) || data.version !== 1
    || !('dataset' in data) || !isSalesDataset(data.dataset)) {
    throw new Error('Saved sales data has an unsupported or invalid format')
  }

  return data.dataset
}
