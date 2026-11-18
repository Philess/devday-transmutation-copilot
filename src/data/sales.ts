import dataset from './sales.json'
import type { SalesChannel, SalesDataset } from '../types/sales'

export const DEMO_START_DATE = dataset.metadata.startDate
export const DEMO_END_DATE = dataset.metadata.endDate

const salesChannel = (value: string): SalesChannel => {
  if (value === 'online' || value === 'store') return value
  throw new Error(`Invalid channel in bundled sales data: ${value}`)
}

export const createDemoSales = (): SalesDataset => {
  const copy = structuredClone(dataset)
  return {
    ...copy,
    locations: copy.locations.map(location => ({ ...location, channel: salesChannel(location.channel) })),
    customers: copy.customers.map(customer => ({ ...customer, preferredChannel: salesChannel(customer.preferredChannel) }))
  }
}
