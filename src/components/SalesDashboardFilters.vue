<script setup lang="ts">
import type { SalesLocation } from '../types/sales'
import type { SalesDashboardFilters } from '../types/salesDashboard'

const props = defineProps<{
  modelValue: SalesDashboardFilters
  locations: readonly SalesLocation[]
}>()
const emit = defineEmits<{ 'update:modelValue': [filters: SalesDashboardFilters] }>()

function updateDate(key: 'startDate' | 'endDate', event: Event) {
  const value = (event.target as HTMLInputElement).value
  const filters = { ...props.modelValue }
  if (value) filters[key] = value
  else delete filters[key]
  emit('update:modelValue', filters)
}

function updateChannel(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const filters = { ...props.modelValue }
  if (value === 'online' || value === 'store') filters.channel = value
  else delete filters.channel
  emit('update:modelValue', filters)
}

function updateLocation(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const filters = { ...props.modelValue }
  if (value) filters.locationId = value
  else delete filters.locationId
  emit('update:modelValue', filters)
}
</script>

<template>
  <section class="dashboard-filters" aria-label="Filtres du tableau de bord">
    <div class="filter">
      <label for="sales-start-date">Date de début</label>
      <input
        id="sales-start-date"
        type="date"
        :value="modelValue.startDate ?? ''"
        @input="updateDate('startDate', $event)"
      >
    </div>

    <div class="filter">
      <label for="sales-end-date">Date de fin</label>
      <input
        id="sales-end-date"
        type="date"
        :value="modelValue.endDate ?? ''"
        @input="updateDate('endDate', $event)"
      >
    </div>

    <div class="filter">
      <label for="sales-channel">Canal</label>
      <select id="sales-channel" :value="modelValue.channel ?? ''" @change="updateChannel">
        <option value="">Tous les canaux</option>
        <option value="online">Portail en ligne</option>
        <option value="store">Magasins</option>
      </select>
    </div>

    <div class="filter">
      <label for="sales-location">Point de vente</label>
      <select id="sales-location" :value="modelValue.locationId ?? ''" @change="updateLocation">
        <option value="">Tous les points de vente</option>
        <option v-for="location in locations" :key="location.id" :value="location.id">
          {{ location.name }} — {{ location.channel === 'online' ? 'Portail en ligne' : 'Magasin' }}
        </option>
      </select>
    </div>
  </section>
</template>

<style scoped>
.dashboard-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1rem;
  color: var(--ink);
  background: var(--parchment);
  border: 2px solid var(--ink);
  border-radius: 4px;
}

.filter {
  display: grid;
  gap: 0.4rem;
}

label {
  font-weight: 800;
}

input,
select {
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  padding: 0.55rem 0.7rem;
  border: 2px solid var(--ink);
  border-radius: 4px;
  color: var(--ink);
  background: #fffaf0;
  font: inherit;
}

:focus-visible {
  outline: 3px solid var(--crimson-deep);
  outline-offset: 2px;
}
</style>
