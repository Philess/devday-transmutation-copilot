import type { SalesData } from '../types/sales'
import type { SalesDashboardErrorCode, SalesDashboardFilters, SalesDashboardResult } from '../types/salesDashboard'
import type { SalesChannel, SalesLocation } from '../types/sales'
import { lineTotalCents, orderTotalCents, UNREPRESENTABLE_AMOUNT_MESSAGE } from './money'

export class SalesDashboardError extends Error {
  readonly code: SalesDashboardErrorCode

  constructor(code: SalesDashboardErrorCode, message: string) {
    super(message)
    this.name = 'SalesDashboardError'
    this.code = code
  }
}

const invalidData = (): never => {
  throw new SalesDashboardError('INVALID_DATA', 'Les données de ventes sont invalides.')
}

const invalidFilter = (): never => {
  throw new SalesDashboardError('INVALID_FILTER', 'Les filtres du dashboard sont invalides.')
}

const unrepresentableAmount = (): never => {
  throw new SalesDashboardError('UNREPRESENTABLE_AMOUNT', UNREPRESENTABLE_AMOUNT_MESSAGE)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isValidDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (month! < 1 || month! > 12) return false
  const leapYear = year! % 4 === 0 && (year! % 100 !== 0 || year! % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day! >= 1 && day! <= daysInMonth[month! - 1]!
}

const isSafeNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const isSafePositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

const addExact = (left: number, right: number): number => {
  const result = left + right
  if (!Number.isSafeInteger(result)) unrepresentableAmount()
  return result
}

const validFilters = (filters: SalesDashboardFilters): void => {
  if (!isRecord(filters)) invalidFilter()
  if (filters.startDate !== undefined && !isValidDate(filters.startDate)) invalidFilter()
  if (filters.endDate !== undefined && !isValidDate(filters.endDate)) invalidFilter()
  if (filters.startDate !== undefined && filters.endDate !== undefined && filters.startDate > filters.endDate) invalidFilter()
  if (filters.channel !== undefined && filters.channel !== 'online' && filters.channel !== 'store') invalidFilter()
  if (filters.locationId !== undefined && (typeof filters.locationId !== 'string' || filters.locationId.length === 0)) invalidFilter()
}

const validateData = (data: SalesData) => {
  if (!isRecord(data) || !Array.isArray(data.products) || !Array.isArray(data.locations)
    || !Array.isArray(data.customers) || !Array.isArray(data.orders)) invalidData()

  const products = new Set<number>()
  for (const product of data.products) {
    if (!isRecord(product) || !isSafePositiveInteger(product.id)
      || typeof product.name !== 'string' || typeof product.category !== 'string'
      || products.has(product.id)) invalidData()
    products.add(product.id)
  }

  const locations = new Map<string, SalesLocation>()
  for (const location of data.locations) {
    if (!isRecord(location) || typeof location.id !== 'string' || location.id.length === 0
      || typeof location.name !== 'string' || (location.channel !== 'online' && location.channel !== 'store')
      || locations.has(location.id)) invalidData()
    locations.set(location.id, { id: location.id, name: location.name, channel: location.channel })
  }

  const customers = new Set<string>()
  for (const customer of data.customers) {
    if (!isRecord(customer) || typeof customer.id !== 'string' || customer.id.length === 0
      || typeof customer.homeStoreId !== 'string' || !locations.has(customer.homeStoreId)
      || customers.has(customer.id)) invalidData()
    customers.add(customer.id)
  }

  const orderIds = new Set<string>()
  for (const order of data.orders) {
    if (!isRecord(order) || typeof order.id !== 'string' || order.id.length === 0
      || orderIds.has(order.id)
      || !isValidDate(order.date) || typeof order.customerId !== 'string' || !customers.has(order.customerId)
      || typeof order.locationId !== 'string' || !locations.has(order.locationId)
      || !Array.isArray(order.lines) || order.lines.length === 0) invalidData()
    orderIds.add(order.id)
    for (const line of order.lines) {
      if (!isRecord(line) || !isRecord(line.product) || !isSafePositiveInteger(line.product.id)
        || !products.has(line.product.id) || typeof line.product.name !== 'string'
        || typeof line.product.category !== 'string' || !isSafePositiveInteger(line.quantity)
        || !isSafeNonNegativeInteger(line.unitPriceCents)) invalidData()
    }
    try {
      orderTotalCents(order.lines.map(line => ({ quantity: line.quantity, unitPriceCents: line.unitPriceCents })))
    } catch (error) {
      if (error instanceof RangeError) unrepresentableAmount()
      throw error
    }
  }
  return { locations }
}

// Fonction pure : ne modifie jamais `data`. Lève SalesDashboardError en cas d’erreur.
export const computeSalesDashboard = (
  data: SalesData,
  filters: SalesDashboardFilters = {}
): SalesDashboardResult => {
  validFilters(filters)
  const { locations } = validateData(data)
  if (filters.locationId !== undefined && !locations.has(filters.locationId)) invalidFilter()

  const byLocation = new Map<string, { orderCount: number; totalCents: number; channel: SalesChannel }>()
  const byChannel = new Map<SalesChannel, { orderCount: number; totalCents: number }>()
  const byProduct = new Map<number, { quantity: number; totalCents: number; productName: string; category: string }>()
  const monthly = new Map<string, { orderCount: number; totalCents: number }>()
  let orderCount = 0
  let totalCents = 0

  const selectedOrders = data.orders.filter(order => {
    if (filters.startDate !== undefined && order.date < filters.startDate) return false
    if (filters.endDate !== undefined && order.date > filters.endDate) return false
    const location = locations.get(order.locationId)!
    if (filters.channel !== undefined && location.channel !== filters.channel) return false
    return filters.locationId === undefined || order.locationId === filters.locationId
  })

  for (const order of selectedOrders) {
    let orderTotal = 0
    for (const line of order.lines) {
      const lineTotal = lineTotalCents({ quantity: line.quantity, unitPriceCents: line.unitPriceCents })
      orderTotal = addExact(orderTotal, lineTotal)
      const product = byProduct.get(line.product.id) ?? {
        quantity: 0,
        totalCents: 0,
        productName: line.product.name,
        category: line.product.category
      }
      product.quantity = addExact(product.quantity, line.quantity)
      product.totalCents = addExact(product.totalCents, lineTotal)
      byProduct.set(line.product.id, product)
    }

    const location = locations.get(order.locationId)!
    const locationSales = byLocation.get(location.id) ?? { orderCount: 0, totalCents: 0, channel: location.channel }
    locationSales.orderCount = addExact(locationSales.orderCount, 1)
    locationSales.totalCents = addExact(locationSales.totalCents, orderTotal)
    byLocation.set(location.id, locationSales)

    const channelSales = byChannel.get(location.channel) ?? { orderCount: 0, totalCents: 0 }
    channelSales.orderCount = addExact(channelSales.orderCount, 1)
    channelSales.totalCents = addExact(channelSales.totalCents, orderTotal)
    byChannel.set(location.channel, channelSales)

    const month = order.date.slice(0, 7)
    const monthSales = monthly.get(month) ?? { orderCount: 0, totalCents: 0 }
    monthSales.orderCount = addExact(monthSales.orderCount, 1)
    monthSales.totalCents = addExact(monthSales.totalCents, orderTotal)
    monthly.set(month, monthSales)

    orderCount = addExact(orderCount, 1)
    totalCents = addExact(totalCents, orderTotal)
  }

  const averageOrderCents = orderCount === 0
    ? null
    : Number((2n * BigInt(totalCents) + BigInt(orderCount)) / (2n * BigInt(orderCount)))

  return {
    kpis: { orderCount, totalCents, averageOrderCents },
    byLocation: [...byLocation].map(([locationId, sales]) => ({
      locationId,
      locationName: locations.get(locationId)!.name,
      channel: sales.channel,
      orderCount: sales.orderCount,
      totalCents: sales.totalCents
    })).sort((left, right) => left.locationId.localeCompare(right.locationId)),
    byChannel: [...byChannel].map(([channel, sales]) => ({ channel, ...sales }))
      .sort((left, right) => left.channel.localeCompare(right.channel)),
    topProducts: [...byProduct].map(([productId, sales]) => ({
      productId,
      productName: sales.productName,
      category: sales.category,
      quantity: sales.quantity,
      totalCents: sales.totalCents
    })).sort((left, right) => right.totalCents - left.totalCents
      || right.quantity - left.quantity
      || left.productId - right.productId).slice(0, 10),
    monthly: [...monthly].map(([month, sales]) => ({ month, ...sales }))
      .sort((left, right) => left.month.localeCompare(right.month))
  }
}
