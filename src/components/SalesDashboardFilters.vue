<script setup lang="ts">
import type { SalesLocation } from '../types/sales'
import type { SalesDashboardFilters } from '../types/salesDashboard'

defineProps<{
  modelValue: SalesDashboardFilters
  locations: readonly SalesLocation[]
}>()
defineEmits<{
  'update:modelValue': [value: SalesDashboardFilters]
}>()
</script>

<template>
  <div />
</template>
