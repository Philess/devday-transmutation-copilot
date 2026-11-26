import type { SalesData } from '../types/sales'
import type { SalesDashboardErrorCode, SalesDashboardFilters, SalesDashboardResult } from '../types/salesDashboard'
import { orderTotalCents } from './money'

export class SalesDashboardError extends Error {
  readonly code: SalesDashboardErrorCode

  constructor(code: SalesDashboardErrorCode, message: string) {
    super(message)
    this.name = 'SalesDashboardError'
    this.code = code
  }
}

// Fonction pure : ne modifie jamais `data`. Lève SalesDashboardError en cas d’erreur.
export const computeSalesDashboard = (
  data: SalesData,
  filters: SalesDashboardFilters = {}
): SalesDashboardResult => {
  const invalidFilter = (message: string): never => {
    throw new SalesDashboardError('INVALID_FILTER', message)
  }
  const invalidData = (message: string): never => {
    throw new SalesDashboardError('INVALID_DATA', message)
  }
  const addCents = (left: number, right: number): number => {
    const total = left + right
    if (!Number.isSafeInteger(total)) {
      throw new SalesDashboardError('UNREPRESENTABLE_AMOUNT', 'Le total dépasse la précision exacte des centimes.')
    }
    return total
  }
  const isValidDate = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }

  if (filters === null || typeof filters !== 'object') invalidFilter('Les filtres sont invalides.')
  const { startDate, endDate, channel, locationId } = filters
  if (startDate !== undefined && !isValidDate(startDate)) invalidFilter('La date de début est invalide.')
  if (endDate !== undefined && !isValidDate(endDate)) invalidFilter('La date de fin est invalide.')
  if (startDate !== undefined && endDate !== undefined && startDate > endDate) {
    invalidFilter('La date de début doit précéder ou correspondre à la date de fin.')
  }
  if (channel !== undefined && channel !== 'online' && channel !== 'store') {
    invalidFilter('Le canal sélectionné est invalide.')
  }
  if (locationId !== undefined && (typeof locationId !== 'string' || locationId.length === 0)) {
    invalidFilter('Le point de vente sélectionné est invalide.')
  }

  if (data === null || typeof data !== 'object'
    || !Array.isArray(data.products) || !Array.isArray(data.locations)
    || !Array.isArray(data.customers) || !Array.isArray(data.orders)) {
    invalidData('Le jeu de données de ventes est invalide.')
  }

  const productIds = new Set<number>()
  for (const product of data.products) {
    if (!product || !Number.isSafeInteger(product.id) || product.id <= 0
      || typeof product.name !== 'string' || product.name.length === 0
      || typeof product.category !== 'string' || product.category.length === 0
      || !Number.isSafeInteger(product.priceCents) || product.priceCents < 0
      || productIds.has(product.id)) {
      invalidData('Le catalogue contient un produit invalide.')
    }
    productIds.add(product.id)
  }

  const locations = new Map<string, { name: string; channel: 'online' | 'store' }>()
  for (const location of data.locations) {
    if (!location || typeof location.id !== 'string' || location.id.length === 0
      || typeof location.name !== 'string' || location.name.length === 0
      || (location.channel !== 'online' && location.channel !== 'store')
      || locations.has(location.id)) {
      invalidData('Le jeu de données contient un point de vente invalide.')
    }
    locations.set(location.id, { name: location.name, channel: location.channel })
  }
  if (locationId !== undefined && !locations.has(locationId)) {
    invalidFilter('Le point de vente sélectionné est inconnu.')
  }

  const customerIds = new Set<string>()
  for (const customer of data.customers) {
    if (!customer || typeof customer.id !== 'string' || customer.id.length === 0 || customerIds.has(customer.id)) {
      invalidData('Le jeu de données contient un client invalide.')
    }
    customerIds.add(customer.id)
  }

  const orderIds = new Set<string>()
  const validatedOrders: Array<{
    id: string
    date: string
    locationId: string
    channel: 'online' | 'store'
    lines: Array<{ productId: number; productName: string; category: string; quantity: number; totalCents: number }>
    totalCents: number
  }> = []
  for (const order of data.orders) {
    if (!order || typeof order.id !== 'string' || order.id.length === 0 || orderIds.has(order.id)
      || !isValidDate(order.date) || !customerIds.has(order.customerId)
      || !locations.has(order.locationId) || !Array.isArray(order.lines) || order.lines.length === 0) {
      invalidData('Le jeu de données contient une commande invalide ou une référence inconnue.')
    }
    orderIds.add(order.id)
    const lines: Array<{ productId: number; productName: string; category: string; quantity: number; totalCents: number }> = []
    for (const line of order.lines) {
      if (!line || !line.product || !productIds.has(line.product.id)
        || typeof line.product.name !== 'string' || line.product.name.length === 0
        || typeof line.product.category !== 'string' || line.product.category.length === 0
        || !Number.isSafeInteger(line.quantity) || line.quantity <= 0
        || !Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents < 0
        || !Number.isSafeInteger(line.listUnitPriceCents) || line.listUnitPriceCents < 0
        || (line.promotionCode !== null && typeof line.promotionCode !== 'string')) {
        invalidData('Le jeu de données contient une ligne invalide ou une référence produit inconnue.')
      }
      lines.push({
        productId: line.product.id,
        productName: line.product.name,
        category: line.product.category,
        quantity: line.quantity,
        totalCents: line.quantity * line.unitPriceCents
      })
    }

    let totalCents: number
    try {
      totalCents = orderTotalCents(order.lines)
    } catch (error) {
      if (error instanceof RangeError) {
        throw new SalesDashboardError('UNREPRESENTABLE_AMOUNT', error.message)
      }
      throw error
    }
    const location = locations.get(order.locationId)!
    validatedOrders.push({
      id: order.id,
      date: order.date,
      locationId: order.locationId,
      channel: location.channel,
      lines,
      totalCents
    })
  }

  const selectedOrders = validatedOrders.filter(order =>
    (startDate === undefined || order.date >= startDate)
    && (endDate === undefined || order.date <= endDate)
    && (channel === undefined || order.channel === channel)
    && (locationId === undefined || order.locationId === locationId)
  )

  const locationTotals = new Map<string, { orderCount: number; totalCents: number }>()
  const channelTotals = new Map<'online' | 'store', { orderCount: number; totalCents: number }>()
  const productTotals = new Map<number, {
    productName: string; category: string; quantity: number; totalCents: number
  }>()
  const monthlyTotals = new Map<string, { orderCount: number; totalCents: number }>()
  let totalCents = 0
  for (const order of selectedOrders) {
    totalCents = addCents(totalCents, order.totalCents)

    const location = locationTotals.get(order.locationId) ?? { orderCount: 0, totalCents: 0 }
    location.orderCount += 1
    location.totalCents = addCents(location.totalCents, order.totalCents)
    locationTotals.set(order.locationId, location)

    const channelTotal = channelTotals.get(order.channel) ?? { orderCount: 0, totalCents: 0 }
    channelTotal.orderCount += 1
    channelTotal.totalCents = addCents(channelTotal.totalCents, order.totalCents)
    channelTotals.set(order.channel, channelTotal)

    const monthKey = order.date.slice(0, 7)
    const month = monthlyTotals.get(monthKey) ?? { orderCount: 0, totalCents: 0 }
    month.orderCount += 1
    month.totalCents = addCents(month.totalCents, order.totalCents)
    monthlyTotals.set(monthKey, month)

    for (const line of order.lines) {
      const product = productTotals.get(line.productId) ?? {
        productName: line.productName,
        category: line.category,
        quantity: 0,
        totalCents: 0
      }
      const quantity = product.quantity + line.quantity
      if (!Number.isSafeInteger(quantity)) {
        throw new SalesDashboardError('UNREPRESENTABLE_AMOUNT', 'La quantité totale dépasse la précision exacte.')
      }
      product.quantity = quantity
      product.totalCents = addCents(product.totalCents, line.totalCents)
      productTotals.set(line.productId, product)
    }
  }

  const orderCount = selectedOrders.length
  const averageOrderCents = orderCount === 0
    ? null
    : Number((2n * BigInt(totalCents) + BigInt(orderCount)) / (2n * BigInt(orderCount)))

  return {
    kpis: { orderCount, totalCents, averageOrderCents },
    byLocation: [...locationTotals].map(([id, totals]) => ({
      locationId: id,
      locationName: locations.get(id)!.name,
      channel: locations.get(id)!.channel,
      ...totals
    })).sort((left, right) => left.locationId.localeCompare(right.locationId)),
    byChannel: [...channelTotals].map(([key, totals]) => ({ channel: key, ...totals }))
      .sort((left, right) => left.channel.localeCompare(right.channel)),
    topProducts: [...productTotals].map(([productId, totals]) => ({ productId, ...totals }))
      .sort((left, right) => right.totalCents - left.totalCents
        || right.quantity - left.quantity
        || left.productId - right.productId)
      .slice(0, 10),
    monthly: [...monthlyTotals].map(([month, totals]) => ({ month, ...totals }))
      .sort((left, right) => left.month.localeCompare(right.month))
  }
}
