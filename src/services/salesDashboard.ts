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

const invalidData = (message: string): never => {
  throw new SalesDashboardError('INVALID_DATA', message)
}

const unrepresentableAmount = (): never => {
  throw new SalesDashboardError('UNREPRESENTABLE_AMOUNT', UNREPRESENTABLE_AMOUNT_MESSAGE)
}

const invalidFilter = (message: string): never => {
  throw new SalesDashboardError('INVALID_FILTER', message)
}

const isDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

const isChannel = (value: unknown): value is SalesChannel => value === 'online' || value === 'store'

const addSafe = (left: number, right: number): number => {
  const total = left + right
  if (!Number.isSafeInteger(total)) unrepresentableAmount()
  return total
}

const compareText = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0

interface ValidatedData {
  locations: Map<string, SalesLocation>
  products: Map<number, { name: string; category: string }>
}

const validateData = (data: SalesData): ValidatedData => {
  if (typeof data !== 'object' || data === null
    || !Array.isArray(data.products) || !Array.isArray(data.locations)
    || !Array.isArray(data.customers) || !Array.isArray(data.orders)) {
    invalidData('Les données de ventes sont invalides.')
  }

  const products = new Map<number, { name: string; category: string }>()
  for (const product of data.products) {
    if (typeof product !== 'object' || product === null
      || !Number.isSafeInteger(product.id) || product.id <= 0
      || typeof product.name !== 'string' || !product.name.trim()
      || typeof product.category !== 'string' || !product.category.trim()
      || !Number.isSafeInteger(product.priceCents) || product.priceCents <= 0
      || products.has(product.id)) {
      invalidData('Le catalogue contient un produit invalide.')
    }
    products.set(product.id, { name: product.name, category: product.category })
  }

  const locations = new Map<string, SalesLocation>()
  for (const location of data.locations) {
    if (typeof location !== 'object' || location === null
      || typeof location.id !== 'string' || !location.id.trim()
      || typeof location.name !== 'string' || !location.name.trim()
      || !isChannel(location.channel)
      || locations.has(location.id)) {
      invalidData('Les points de vente contiennent une référence invalide.')
    }
    locations.set(location.id, location)
  }

  const customers = new Set<string>()
  for (const customer of data.customers) {
    if (typeof customer !== 'object' || customer === null
      || typeof customer.id !== 'string' || !customer.id.trim()
      || customers.has(customer.id)) {
      invalidData('Les clients contiennent une référence invalide.')
    }
    customers.add(customer.id)
  }

  const orderIds = new Set<string>()
  for (const order of data.orders) {
    if (typeof order !== 'object' || order === null
      || typeof order.id !== 'string' || !order.id.trim() || orderIds.has(order.id)
      || !isDate(order.date)
      || typeof order.customerId !== 'string' || !customers.has(order.customerId)
      || typeof order.locationId !== 'string' || !locations.has(order.locationId)
      || !Array.isArray(order.lines) || order.lines.length === 0) {
      invalidData('Une commande ou sa référence est invalide.')
    }
    orderIds.add(order.id)

    const lineProductIds = new Set<number>()
    for (const line of order.lines) {
      if (typeof line !== 'object' || line === null
        || typeof line.product !== 'object' || line.product === null
        || !Number.isSafeInteger(line.product.id)
        || !Number.isSafeInteger(line.quantity) || line.quantity <= 0
        || !Number.isSafeInteger(line.listUnitPriceCents) || line.listUnitPriceCents <= 0
        || !Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents <= 0
        || line.unitPriceCents > line.listUnitPriceCents
        || !(line.promotionCode === null || typeof line.promotionCode === 'string')
        || lineProductIds.has(line.product.id)) {
        invalidData('Une ligne de commande est invalide.')
      }

      const product = products.get(line.product.id)
      if (!product || line.product.name !== product.name || line.product.category !== product.category) {
        invalidData('Une ligne de commande référence un produit inconnu ou incohérent.')
      }
      lineProductIds.add(line.product.id)
    }

    try {
      orderTotalCents(order.lines)
      orderTotalCents(order.lines.map(line => ({
        quantity: line.quantity,
        unitPriceCents: line.listUnitPriceCents
      })))
    } catch (error) {
      if (error instanceof RangeError) unrepresentableAmount()
      throw error
    }
  }

  return { locations, products }
}

const validateFilters = (
  filters: SalesDashboardFilters,
  locations: Map<string, SalesLocation>
): void => {
  if (typeof filters !== 'object' || filters === null || Array.isArray(filters)) {
    invalidFilter('Les filtres sont invalides.')
  }
  if (filters.startDate !== undefined && !isDate(filters.startDate)) {
    invalidFilter('La date de début doit être une date UTC valide au format YYYY-MM-DD.')
  }
  if (filters.endDate !== undefined && !isDate(filters.endDate)) {
    invalidFilter('La date de fin doit être une date UTC valide au format YYYY-MM-DD.')
  }
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    invalidFilter('La date de début doit précéder ou égaler la date de fin.')
  }
  if (filters.channel !== undefined && !isChannel(filters.channel)) {
    invalidFilter('Le canal sélectionné est invalide.')
  }
  if (filters.locationId !== undefined
    && (typeof filters.locationId !== 'string' || !locations.has(filters.locationId))) {
    invalidFilter('Le point de vente sélectionné est inconnu.')
  }
}

interface MutableTotals {
  orderCount: number
  totalCents: number
}

interface MutableProductSales {
  productId: number
  productName: string
  category: string
  quantity: number
  totalCents: number
}

const addOrder = (totals: MutableTotals, orderTotal: number): void => {
  totals.orderCount = addSafe(totals.orderCount, 1)
  totals.totalCents = addSafe(totals.totalCents, orderTotal)
}

const emptyTotals = (): MutableTotals => ({ orderCount: 0, totalCents: 0 })

const averageOrderCents = (totalCents: number, orderCount: number): number | null => {
  if (orderCount === 0) return null
  const total = BigInt(totalCents)
  const count = BigInt(orderCount)
  return Number((2n * total + count) / (2n * count))
}

// Fonction pure : ne modifie jamais `data`. Lève SalesDashboardError en cas d’erreur.
export const computeSalesDashboard = (
  data: SalesData,
  filters: SalesDashboardFilters = {}
): SalesDashboardResult => {
  const { locations, products } = validateData(data)
  validateFilters(filters, locations)

  if (filters.channel && filters.locationId
    && locations.get(filters.locationId)?.channel !== filters.channel) {
    return {
      kpis: { orderCount: 0, totalCents: 0, averageOrderCents: null },
      byLocation: [],
      byChannel: [],
      topProducts: [],
      monthly: []
    }
  }

  const selectedOrders = data.orders.filter(order => {
    const channel = locations.get(order.locationId)!.channel
    return (!filters.startDate || order.date >= filters.startDate)
      && (!filters.endDate || order.date <= filters.endDate)
      && (!filters.channel || channel === filters.channel)
      && (!filters.locationId || order.locationId === filters.locationId)
  })

  const kpis = emptyTotals()
  const locationTotals = new Map<string, MutableTotals>()
  const channelTotals = new Map<SalesChannel, MutableTotals>()
  const productTotals = new Map<number, MutableProductSales>()
  const monthlyTotals = new Map<string, MutableTotals>()

  for (const order of selectedOrders) {
    let orderTotal = 0
    for (const line of order.lines) {
      orderTotal = addSafe(orderTotal, lineTotalCents(line))
    }
    addOrder(kpis, orderTotal)

    const location = locations.get(order.locationId)!
    const locationTotal = locationTotals.get(location.id) ?? emptyTotals()
    addOrder(locationTotal, orderTotal)
    locationTotals.set(location.id, locationTotal)

    const channelTotal = channelTotals.get(location.channel) ?? emptyTotals()
    addOrder(channelTotal, orderTotal)
    channelTotals.set(location.channel, channelTotal)

    const month = order.date.slice(0, 7)
    const monthlyTotal = monthlyTotals.get(month) ?? emptyTotals()
    addOrder(monthlyTotal, orderTotal)
    monthlyTotals.set(month, monthlyTotal)

    for (const line of order.lines) {
      const product = products.get(line.product.id)!
      const productTotal = productTotals.get(line.product.id) ?? {
        productId: line.product.id,
        productName: product.name,
        category: product.category,
        quantity: 0,
        totalCents: 0
      }
      productTotal.quantity = addSafe(productTotal.quantity, line.quantity)
      productTotal.totalCents = addSafe(productTotal.totalCents, lineTotalCents(line))
      productTotals.set(line.product.id, productTotal)
    }
  }

  const totalCents = kpis.totalCents
  return {
    kpis: {
      ...kpis,
      averageOrderCents: averageOrderCents(totalCents, kpis.orderCount)
    },
    byLocation: [...locationTotals.entries()]
      .map(([locationId, totals]) => ({
        ...totals,
        locationId,
        locationName: locations.get(locationId)!.name,
        channel: locations.get(locationId)!.channel
      }))
      .sort((left, right) => compareText(left.locationId, right.locationId)),
    byChannel: [...channelTotals.entries()]
      .map(([channel, totals]) => ({ ...totals, channel }))
      .sort((left, right) => compareText(left.channel, right.channel)),
    topProducts: [...productTotals.values()]
      .sort((left, right) => right.totalCents - left.totalCents
        || right.quantity - left.quantity
        || left.productId - right.productId)
      .slice(0, 10),
    monthly: [...monthlyTotals.entries()]
      .map(([month, totals]) => ({ ...totals, month }))
      .sort((left, right) => compareText(left.month, right.month))
  }
}
