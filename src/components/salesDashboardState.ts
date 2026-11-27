import { computed, ref } from 'vue'
import type { SalesChannel, SalesDataset } from '../types/sales'
import { calculateSales, type SalesSummary } from '../services/salesCalculations'

const isDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

export const useSalesDashboard = (getDataset: () => SalesDataset) => {
  const startDate = ref('')
  const endDate = ref('')
  const channel = ref<SalesChannel | ''>('')
  const locationId = ref('')

  const calculation = computed<{ summary: SalesSummary | null; error: string | null }>(() => {
    if (startDate.value && !isDate(startDate.value)) {
      return { summary: null, error: 'La date de début doit être une date UTC valide.' }
    }
    if (endDate.value && !isDate(endDate.value)) {
      return { summary: null, error: 'La date de fin doit être une date UTC valide.' }
    }
    if (startDate.value && endDate.value && startDate.value > endDate.value) {
      return { summary: null, error: 'La date de début doit être antérieure ou égale à la date de fin.' }
    }

    try {
      return {
        summary: calculateSales(getDataset(), {
          ...(startDate.value ? { startDate: startDate.value } : {}),
          ...(endDate.value ? { endDate: endDate.value } : {}),
          ...(channel.value ? { channel: channel.value } : {}),
          ...(locationId.value ? { locationId: locationId.value } : {})
        }),
        error: null
      }
    } catch (reason) {
      return {
        summary: null,
        error: reason instanceof Error ? reason.message : String(reason)
      }
    }
  })

  return { startDate, endDate, channel, locationId, calculation }
}
