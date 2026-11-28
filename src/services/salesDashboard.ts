import type { SalesData } from '../types/sales'
import type {
  SalesDashboardErrorCode,
  SalesDashboardFilters,
  SalesDashboardResult
} from '../types/salesDashboard'

export class SalesDashboardError extends Error {
  readonly code: SalesDashboardErrorCode

  constructor(code: SalesDashboardErrorCode, message: string) {
    super(message)
    this.name = 'SalesDashboardError'
    this.code = code
  }
}

export function computeSalesDashboard(
  _data: SalesData,
  _filters: SalesDashboardFilters = {}
): SalesDashboardResult {
  throw new Error('Calcul du dashboard non implémenté')
}
