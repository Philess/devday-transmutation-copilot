import type { SalesChannel } from './sales'

// Filtres combinés par intersection ; un champ absent n’applique aucune restriction.
export interface SalesDashboardFilters {
  startDate?: string // 'YYYY-MM-DD', date UTC incluse
  endDate?: string // 'YYYY-MM-DD', date UTC incluse
  channel?: SalesChannel
  locationId?: string
}

export interface SalesTotals {
  orderCount: number
  totalCents: number
}

export interface SalesKpis extends SalesTotals {
  // null si orderCount === 0 ; sinon totalCents / orderCount arrondi au cent le plus proche,
  // demi-cent vers le haut (calcul en entiers, décision 2).
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
  month: string // 'YYYY-MM', UTC
}

export interface SalesDashboardResult {
  kpis: SalesKpis
  byLocation: LocationSales[]
  byChannel: ChannelSales[]
  // 10 au plus : totalCents décroissant, puis quantity décroissante, puis productId croissant (décision 1).
  topProducts: ProductSales[]
  monthly: MonthlySales[] // ordre chronologique croissant
}

export type SalesDashboardErrorCode = 'INVALID_FILTER' | 'INVALID_DATA' | 'UNREPRESENTABLE_AMOUNT'
