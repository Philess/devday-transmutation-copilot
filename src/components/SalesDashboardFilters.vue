<script setup lang="ts">
import type { SalesChannel, SalesLocation } from '../types/sales'
import type { SalesDashboardFilters } from '../types/salesDashboard'

const props = defineProps<{
  modelValue: SalesDashboardFilters
  locations: readonly SalesLocation[]
}>()
const emit = defineEmits<{ 'update:modelValue': [filters: SalesDashboardFilters] }>()

function withoutFilter<Key extends keyof SalesDashboardFilters>(key: Key): SalesDashboardFilters {
  const filters = { ...props.modelValue }
  delete filters[key]
  return filters
}

function updateStartDate(value: string) {
  const filters = withoutFilter('startDate')
  emit('update:modelValue', value === '' ? filters : { ...filters, startDate: value })
}

function updateEndDate(value: string) {
  const filters = withoutFilter('endDate')
  emit('update:modelValue', value === '' ? filters : { ...filters, endDate: value })
}

function updateChannel(value: string) {
  const filters = withoutFilter('channel')
  const channel: SalesChannel | undefined = value === 'online' || value === 'store' ? value : undefined
  emit('update:modelValue', channel === undefined ? filters : { ...filters, channel })
}

function updateLocation(value: string) {
  const filters = withoutFilter('locationId')
  emit('update:modelValue', value === '' ? filters : { ...filters, locationId: value })
}
</script>

<template>
  <div class="sales-dashboard-filters">
    <label>
      Date de début (incluse)
      <input
        type="text"
        inputmode="numeric"
        placeholder="AAAA-MM-JJ"
        aria-label="Date de début (incluse)"
        :value="modelValue.startDate ?? ''"
        @input="updateStartDate(($event.target as HTMLInputElement).value)"
      >
    </label>

    <label>
      Date de fin (incluse)
      <input
        type="text"
        inputmode="numeric"
        placeholder="AAAA-MM-JJ"
        aria-label="Date de fin (incluse)"
        :value="modelValue.endDate ?? ''"
        @input="updateEndDate(($event.target as HTMLInputElement).value)"
      >
    </label>

    <label>
      Canal
      <select
        aria-label="Canal"
        :value="modelValue.channel ?? ''"
        @change="updateChannel(($event.target as HTMLSelectElement).value)"
      >
        <option value="">Tous les canaux</option>
        <option value="online">Portail en ligne</option>
        <option value="store">Magasins</option>
      </select>
    </label>

    <label>
      Point de vente
      <select
        aria-label="Point de vente"
        :value="modelValue.locationId ?? ''"
        @change="updateLocation(($event.target as HTMLSelectElement).value)"
      >
        <option value="">Tous les points de vente</option>
        <option v-for="location in locations" :key="location.id" :value="location.id">
          {{ location.name }}
        </option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.sales-dashboard-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1rem;
}

label {
  display: grid;
  gap: 0.35rem;
}

input,
select {
  min-width: 0;
  padding: 0.5rem;
  font: inherit;
}
</style>
