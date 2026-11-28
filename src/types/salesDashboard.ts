import type { SalesChannel } from './sales'

export interface SalesDashboardFilters {
  startDate?: string // YYYY-MM-DD UTC, inclus
  endDate?: string // YYYY-MM-DD UTC, inclus
  channel?: SalesChannel
  locationId?: string
}

export interface SalesTotals {
  orderCount: number
  totalCents: number
}

export interface SalesKpis extends SalesTotals {
  // null sans commande ; arrondi au cent le plus proche, demi-cent vers le haut.
  averageOrderCents: number | null
}

export interface LocationSales extends SalesTotals {
  locationId: string
  locationName: string
  channel: SalesChannel
}

export interface ChannelSales extends SalesTotals {
  channel: SalesChannel
}

export interface ProductSales {
  productId: number
  productName: string
  category: string
  quantity: number
  totalCents: number
}

export interface MonthlySales extends SalesTotals {
  month: string // YYYY-MM UTC
}

export interface SalesDashboardResult {
  kpis: SalesKpis
  byLocation: LocationSales[]
  byChannel: ChannelSales[]
  topProducts: ProductSales[] // au plus 10 ; chiffre d'affaires décroissant, puis quantité décroissante, puis productId croissant
  monthly: MonthlySales[] // ordre chronologique croissant
}

export type SalesDashboardErrorCode =
  | 'INVALID_FILTER'
  | 'INVALID_DATA'
  | 'UNREPRESENTABLE_AMOUNT'
