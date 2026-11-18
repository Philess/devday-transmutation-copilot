import type { Product } from './product'

export type SalesChannel = 'online' | 'store'

export interface SalesLocation {
  id: string
  name: string
  channel: SalesChannel
}

export interface Customer {
  id: string
  region: string
  homeStoreId: string
  joinedOn: string
  preferredCategory: string
  preferredChannel: SalesChannel
}

export interface OrderLine {
  product: Pick<Product, 'id' | 'name' | 'category'>
  quantity: number
  listUnitPriceCents: number
  unitPriceCents: number
  promotionCode: string | null
}

export interface SalesOrder {
  id: string
  date: string
  customerId: string
  locationId: string
  lines: OrderLine[]
}

export interface SalesData {
  products: Product[]
  locations: SalesLocation[]
  customers: Customer[]
  orders: SalesOrder[]
}

export interface SalesDataset extends SalesData {
  metadata: {
    schemaVersion: number
    fictional: boolean
    seed: number
    startDate: string
    endDate: string
    currency: string
    timezone: string
    description: string
    limitations: string
  }
  products: Product[]
  locations: (SalesLocation & { region: string; openedOn: string })[]
  customers: Customer[]
  events: {
    id: string
    name: string
    startDate: string
    endDate: string
    theme: string
    demandMultiplier: number
  }[]
  orders: (SalesOrder & { eventIds: string[] })[]
}
