import { createDemoSales } from '../data/sales'
import type { SalesDataset } from '../types/sales'
import { isRepresentableOrder } from './money'

export const SALES_STORAGE_KEY = 'exec-agenticdev-workshop.sales.v1'

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
  if (!('albums' in value) || !Array.isArray(value.albums)
    || !('locations' in value) || !Array.isArray(value.locations)
    || !('customers' in value) || !Array.isArray(value.customers)
    || !('events' in value) || !Array.isArray(value.events)
    || !('orders' in value) || !Array.isArray(value.orders)) return false

  const products = new Map<number, { title: string; artist: string }>()
  for (const product of value.albums) {
    if (typeof product !== 'object' || product === null || !('id' in product) || !Number.isSafeInteger(product.id)
      || !('title' in product) || typeof product.title !== 'string' || !product.title.trim()
      || !('artist' in product) || typeof product.artist !== 'string' || !product.artist.trim()
      || !('price' in product) || typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0
      || products.has(product.id)) return false
    products.set(product.id, { title: product.title, artist: product.artist })
  }

  const locations = new Map<string, { channel: string; region: string; openedOn: string }>()
  for (const location of value.locations) {
    if (typeof location !== 'object' || location === null || !('id' in location) || typeof location.id !== 'string'
      || !location.id || !('name' in location) || typeof location.name !== 'string' || !location.name.trim()
      || !('channel' in location) || !['online', 'store'].includes(String(location.channel))
      || !('region' in location) || typeof location.region !== 'string'
      || !('openedOn' in location) || !isDate(location.openedOn)
      || locations.has(location.id)) return false
    locations.set(location.id, { channel: location.channel, region: location.region, openedOn: location.openedOn })
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
      || order.eventIds.some((eventId: unknown) => typeof eventId !== 'string' || !events.has(eventId)
        || events.get(eventId)!.startDate > order.date || events.get(eventId)!.endDate < order.date)
      || !('lines' in order) || !Array.isArray(order.lines) || order.lines.length === 0) return false
    orderIds.add(order.id)

    const lineProductIds = new Set<number>()
    for (const line of order.lines) {
      if (typeof line !== 'object' || line === null || !('product' in line) || typeof line.product !== 'object'
        || line.product === null || !('id' in line.product) || !Number.isSafeInteger(line.product.id)
        || !products.has(line.product.id) || lineProductIds.has(line.product.id)
        || !('title' in line.product) || typeof line.product.title !== 'string' || !line.product.title.trim()
        || !('artist' in line.product) || typeof line.product.artist !== 'string' || !line.product.artist.trim()
        || !('quantity' in line) || !Number.isSafeInteger(line.quantity) || line.quantity <= 0
        || !('unitPriceCents' in line) || !Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents < 0) return false
      lineProductIds.add(line.product.id)
    }
    if (!isRepresentableOrder(order.lines)) return false
  }

  return true
}

export const saveSalesDataset = (dataset: SalesDataset, storage: SalesStorage = window.localStorage): void => {
  if (!isSalesDataset(dataset)) throw new Error('Invalid sales dataset')
  const orders = dataset.orders.map(order => [
    order.id, order.date, order.customerId, order.locationId, order.eventIds,
    order.lines.map(line => [line.product.id, line.product.title, line.product.artist, line.quantity, line.unitPriceCents])
  ])
  storage.setItem(SALES_STORAGE_KEY, JSON.stringify({ version: 2, dataset: { ...dataset, orders } }))
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

  if (typeof data !== 'object' || data === null || !('version' in data)
    || !('dataset' in data) || typeof data.dataset !== 'object' || data.dataset === null) {
    throw new Error('Saved sales data has an unsupported or invalid format')
  }
  let dataset: unknown = data.dataset
  if (data.version === 2) {
    if (!('orders' in data.dataset) || !Array.isArray(data.dataset.orders)) {
      throw new Error('Saved sales data has an unsupported or invalid format')
    }
    const orders = data.dataset.orders.map((order: unknown) => {
      if (!Array.isArray(order) || order.length !== 6 || !Array.isArray(order[5])) {
        throw new Error('Saved sales data has an unsupported or invalid format')
      }
      const lines = order[5].map((line: unknown) => {
        if (!Array.isArray(line) || line.length !== 5) throw new Error('Saved sales data has an unsupported or invalid format')
        return { product: { id: line[0], title: line[1], artist: line[2] }, quantity: line[3], unitPriceCents: line[4] }
      })
      return { id: order[0], date: order[1], customerId: order[2], locationId: order[3], eventIds: order[4], lines }
    })
    dataset = { ...data.dataset, orders }
  } else if (data.version !== 1) {
    throw new Error('Saved sales data has an unsupported or invalid format')
  }
  if (!isSalesDataset(dataset)) throw new Error('Saved sales data has an unsupported or invalid format')
  return dataset
}
