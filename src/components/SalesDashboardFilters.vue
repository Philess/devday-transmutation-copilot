<script setup lang="ts">
import type { SalesLocation } from '../types/sales'
import type { SalesDashboardFilters } from '../types/salesDashboard'

const props = defineProps<{
  modelValue: SalesDashboardFilters
  locations: readonly SalesLocation[]
}>()
const emit = defineEmits<{ 'update:modelValue': [filters: SalesDashboardFilters] }>()

const updateDate = (key: 'startDate' | 'endDate', event: Event): void => {
  const value = (event.currentTarget as HTMLInputElement).value
  const filters = { ...props.modelValue }
  if (value === '') delete filters[key]
  else filters[key] = value
  emit('update:modelValue', filters)
}

const updateChannel = (event: Event): void => {
  const value = (event.currentTarget as HTMLSelectElement).value
  const filters = { ...props.modelValue }
  if (value === '') delete filters.channel
  else if (value === 'online' || value === 'store') filters.channel = value
  else throw new Error(`Canal de filtre invalide : ${value}`)
  emit('update:modelValue', filters)
}

const updateLocation = (event: Event): void => {
  const value = (event.currentTarget as HTMLSelectElement).value
  const filters = { ...props.modelValue }
  if (value === '') delete filters.locationId
  else filters.locationId = value
  emit('update:modelValue', filters)
}
</script>

<template>
  <fieldset class="sales-dashboard-filters">
    <legend>Filtres des ventes</legend>
    <div class="filter-field">
      <label for="sales-start-date">Date de début (UTC, incluse)</label>
      <input
        id="sales-start-date"
        type="date"
        :value="modelValue.startDate ?? ''"
        @input="updateDate('startDate', $event)"
      >
    </div>

    <div class="filter-field">
      <label for="sales-end-date">Date de fin (UTC, incluse)</label>
      <input
        id="sales-end-date"
        type="date"
        :value="modelValue.endDate ?? ''"
        @input="updateDate('endDate', $event)"
      >
    </div>

    <div class="filter-field">
      <label for="sales-channel">Canal</label>
      <select id="sales-channel" :value="modelValue.channel ?? ''" @change="updateChannel">
        <option value="">Tous les canaux</option>
        <option value="online">Boutique en ligne</option>
        <option value="store">Magasin</option>
      </select>
    </div>

    <div class="filter-field">
      <label for="sales-location">Point de vente</label>
      <select id="sales-location" :value="modelValue.locationId ?? ''" @change="updateLocation">
        <option value="">Tous les points de vente</option>
        <option v-for="location in locations" :key="location.id" :value="location.id">
          {{ location.name }} ({{ location.channel === 'online' ? 'Boutique en ligne' : 'Magasin' }})
        </option>
      </select>
    </div>
  </fieldset>
</template>

<style scoped>
.sales-dashboard-filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: .5rem .75rem;
  align-items: center;
  margin: 1rem 0;
  padding: .75rem;
  border: 1px solid #82795f;
}

.filter-field {
  display: grid;
  gap: .3rem;
  min-width: 0;
}

.sales-dashboard-filters legend {
  padding: 0 .35rem;
  font-weight: 700;
}

.sales-dashboard-filters label {
  font-weight: 600;
}

.sales-dashboard-filters input,
.sales-dashboard-filters select {
  min-width: 0;
  padding: .4rem;
  font: inherit;
}

@media (max-width: 760px) {
  .sales-dashboard-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .sales-dashboard-filters {
    grid-template-columns: 1fr;
  }
}
</style>
