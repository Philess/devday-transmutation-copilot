import type { SalesChannel, SalesData, SalesLocation } from '../types/sales'
import { lineTotalCents, orderTotalCents, UNREPRESENTABLE_AMOUNT_MESSAGE } from './money'

export interface SalesFilters {
  startDate?: string
  endDate?: string
  channel?: SalesChannel
  locationId?: string
}

export interface SalesSummary {
  totalCents: number
  orderCount: number
  averageOrderCents: number | null
  byLocation: { location: SalesLocation; totalCents: number; orderCount: number }[]
  byChannel: { channel: SalesChannel; totalCents: number; orderCount: number }[]
  topProducts: { productId: number; name: string; totalCents: number }[]
  byMonth: { month: string; totalCents: number; orderCount: number }[]
}

const invalidData = (): never => { throw new Error('Données de ventes ou filtres invalides.') }

const isDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

const addCents = (a: number, b: number): number => {
  const sum = a + b
  if (!Number.isSafeInteger(sum)) throw new RangeError(UNREPRESENTABLE_AMOUNT_MESSAGE)
  return sum
}

export const calculateSales = (
  data: Pick<SalesData, 'locations' | 'orders'>,
  filters: SalesFilters = {}
): SalesSummary => {
  if (!data || !Array.isArray(data.locations) || !Array.isArray(data.orders) || !filters
    || (filters.startDate !== undefined && !isDate(filters.startDate))
    || (filters.endDate !== undefined && !isDate(filters.endDate))
    || (filters.startDate && filters.endDate && filters.startDate > filters.endDate)
    || (filters.channel !== undefined && filters.channel !== 'store' && filters.channel !== 'online')
    || (filters.locationId !== undefined && (typeof filters.locationId !== 'string' || !filters.locationId))) invalidData()

  const locations = new Map<string, SalesLocation>()
  for (const location of data.locations) {
    if (!location || typeof location.id !== 'string' || !location.id
      || typeof location.name !== 'string' || !location.name.trim()
      || (location.channel !== 'store' && location.channel !== 'online')
      || locations.has(location.id)) invalidData()
    locations.set(location.id, location)
  }

  const byLocation = new Map<string, SalesSummary['byLocation'][number]>()
  const byChannel = new Map<SalesChannel, SalesSummary['byChannel'][number]>()
  const products = new Map<number, SalesSummary['topProducts'][number]>()
  const months = new Map<string, SalesSummary['byMonth'][number]>()
  const orderIds = new Set<string>()
  let totalCents = 0
  let orderCount = 0

  for (const order of data.orders) {
    if (!order || typeof order.id !== 'string' || !order.id || orderIds.has(order.id)
      || !isDate(order.date) || !Array.isArray(order.lines) || order.lines.length === 0) invalidData()
    orderIds.add(order.id)
    const location = locations.get(order.locationId)
    if (!location) return invalidData()
    const lineIds = new Set<number>()
    for (const line of order.lines) {
      if (!line || !line.product || !Number.isSafeInteger(line.product.id) || line.product.id <= 0
        || typeof line.product.name !== 'string' || !line.product.name.trim()
        || lineIds.has(line.product.id) || !Number.isSafeInteger(line.quantity) || line.quantity <= 0
        || !Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents <= 0
        || !Number.isSafeInteger(line.listUnitPriceCents) || line.listUnitPriceCents <= 0
        || line.unitPriceCents > line.listUnitPriceCents) invalidData()
      lineIds.add(line.product.id)
    }
    const orderTotal = orderTotalCents(order.lines)
    if ((filters.startDate && order.date < filters.startDate)
      || (filters.endDate && order.date > filters.endDate)
      || (filters.channel && location.channel !== filters.channel)
      || (filters.locationId && location.id !== filters.locationId)) continue

    totalCents = addCents(totalCents, orderTotal)
    orderCount++
    const locationTotal = byLocation.get(location.id) ?? { location: { ...location }, totalCents: 0, orderCount: 0 }
    locationTotal.totalCents = addCents(locationTotal.totalCents, orderTotal)
    locationTotal.orderCount++
    byLocation.set(location.id, locationTotal)
    const channelTotal = byChannel.get(location.channel) ?? { channel: location.channel, totalCents: 0, orderCount: 0 }
    channelTotal.totalCents = addCents(channelTotal.totalCents, orderTotal)
    channelTotal.orderCount++
    byChannel.set(location.channel, channelTotal)
    const month = order.date.slice(0, 7)
    const monthTotal = months.get(month) ?? { month, totalCents: 0, orderCount: 0 }
    monthTotal.totalCents = addCents(monthTotal.totalCents, orderTotal)
    monthTotal.orderCount++
    months.set(month, monthTotal)
    for (const line of order.lines) {
      const product = products.get(line.product.id) ?? { productId: line.product.id, name: line.product.name, totalCents: 0 }
      product.totalCents = addCents(product.totalCents, lineTotalCents(line))
      products.set(product.productId, product)
    }
  }

  const averageOrderCents = orderCount === 0 ? null
    : Math.floor(totalCents / orderCount) + (totalCents % orderCount >= Math.ceil(orderCount / 2) ? 1 : 0)
  return {
    totalCents,
    orderCount,
    averageOrderCents,
    byLocation: [...byLocation.values()].sort((a, b) => a.location.id < b.location.id ? -1 : a.location.id > b.location.id ? 1 : 0),
    byChannel: [...byChannel.values()].sort((a, b) => a.channel < b.channel ? -1 : a.channel > b.channel ? 1 : 0),
    topProducts: [...products.values()].sort((a, b) => b.totalCents - a.totalCents || a.productId - b.productId).slice(0, 10),
    byMonth: [...months.values()].sort((a, b) => a.month < b.month ? -1 : a.month > b.month ? 1 : 0)
  }
}
