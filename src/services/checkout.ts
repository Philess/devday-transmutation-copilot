import type { Product } from '../types/product'
import type { SalesDataset } from '../types/sales'
import type { CartItem } from './cartStorage'
import { orderTotalCents } from './money'

export const MAX_QUANTITY = 99

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'name'

export interface CartEntry {
  productId: number
  quantity: number
  product: Product
}

export interface ResolvedCart {
  entries: CartEntry[]
  missing: number[]
}

export const formatUSD = (cents: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

export const sortProducts = (products: Product[], sort: ProductSort): Product[] => {
  if (sort === 'featured') return products
  const sorted = [...products]
  if (sort === 'price-asc') return sorted.sort((a, b) => a.priceCents - b.priceCents || a.id - b.id)
  if (sort === 'price-desc') return sorted.sort((a, b) => b.priceCents - a.priceCents || a.id - b.id)
  return sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr') || a.id - b.id)
}

export const resolveCart = (cart: CartItem[], products: Product[]): ResolvedCart => {
  const byId = new Map(products.map(product => [product.id, product]))
  const entries: CartEntry[] = []
  const missing: number[] = []
  for (const item of cart) {
    const product = byId.get(item.productId)
    if (product) entries.push({ ...item, product })
    else missing.push(item.productId)
  }
  return { entries, missing }
}

export const cartTotal = (entries: CartEntry[]): number =>
  orderTotalCents(entries.map(entry => ({ quantity: entry.quantity, unitPriceCents: entry.product.priceCents })))

export interface SampleOrder {
  dataset: SalesDataset
  orderId: string
  locationName: string
}

// Same shape as the demo orders already stored in the sales dataset; the input dataset is never mutated.
export const buildSampleOrder = (
  sales: SalesDataset,
  entries: CartEntry[],
  locationId: string,
  date: string
): SampleOrder => {
  if (entries.length === 0) throw new Error('Ajoutez au moins un article au panier avant de valider la commande.')
  const location = sales.locations.find(item => item.id === locationId)
  if (!location) throw new Error('Choisissez un point de vente disponible.')
  const homeStore = location.channel === 'store' ? location : sales.locations.find(item => item.channel === 'store')
  if (!homeStore) throw new Error('Aucun magasin physique ne permet de créer un client de démonstration.')
  cartTotal(entries)

  const orderId = `LOCAL-${String(sales.orders.length + 1).padStart(6, '0')}`
  const customerId = `Requisition-${String(sales.customers.length + 1).padStart(4, '0')}`
  const customer = {
    id: customerId,
    region: homeStore.region,
    homeStoreId: homeStore.id,
    joinedOn: date,
    preferredCategory: entries[0]?.product.category ?? '',
    preferredChannel: location.channel
  }
  const order = {
    id: orderId,
    date,
    customerId,
    locationId: location.id,
    eventIds: sales.events.filter(event => event.startDate <= date && event.endDate >= date).map(event => event.id),
    lines: entries.map(entry => ({
      product: { id: entry.product.id, name: entry.product.name, category: entry.product.category },
      quantity: entry.quantity,
      listUnitPriceCents: entry.product.priceCents,
      unitPriceCents: entry.product.priceCents,
      promotionCode: null
    }))
  }
  const dataset: SalesDataset = {
    ...sales,
    metadata: {
      ...sales.metadata,
      startDate: date < sales.metadata.startDate ? date : sales.metadata.startDate,
      endDate: date > sales.metadata.endDate ? date : sales.metadata.endDate
    },
    customers: [...sales.customers, customer],
    orders: [...sales.orders, order]
  }
  return { dataset, orderId, locationName: location.name }
}
