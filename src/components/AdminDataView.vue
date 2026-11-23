<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import type { SalesDataset } from '../types/sales'

const props = defineProps<{ data: SalesDataset }>()
const data = toRef(props, 'data')
const collections: { key: keyof SalesDataset; label: string }[] = [
  { key: 'metadata', label: 'Metadata' },
  { key: 'albums', label: 'Albums' },
  { key: 'locations', label: 'Stores and online shop' },
  { key: 'customers', label: 'Customers' },
  { key: 'events', label: 'Seasonal events' },
  { key: 'orders', label: 'Orders' }
]
const selected = ref<keyof SalesDataset>('metadata')
const page = ref(1)
const pageSize = 25
const collection = computed(() => data.value[selected.value])
const recordCount = computed(() => Array.isArray(collection.value) ? collection.value.length : 1)
const pageCount = computed(() => Math.max(1, Math.ceil(recordCount.value / pageSize)))
const firstRecord = computed(() => recordCount.value === 0 ? 0 : (page.value - 1) * pageSize + 1)
const lastRecord = computed(() => Math.min(page.value * pageSize, recordCount.value))
const rawJson = computed(() => JSON.stringify(
  Array.isArray(collection.value)
    ? collection.value.slice((page.value - 1) * pageSize, page.value * pageSize)
    : collection.value,
  null,
  2
))
watch(selected, () => { page.value = 1 })
</script>

<template>
  <main class="admin-data">
    <header class="admin-header">
      <p class="eyebrow">Music archives · Read-only access</p>
      <h1>Workshop data register</h1>
      <p>Explore the fictional raw records behind the album collection. This register is the starting point for your workshop.</p>
    </header>

    <section class="data-panel" aria-label="Raw dataset">
      <p class="admin-notice"><strong>Simulated admin mode.</strong> No credentials or real authentication. Use Back to the shop to return; refreshing also closes admin mode.</p>
      <p>Source: <code>src/data/sales.json</code> &middot; {{ data.metadata.startDate }} to {{ data.metadata.endDate }} &middot; {{ data.metadata.currency }}.
        This read-only register includes local demonstration orders and is separate from the shop's saved albums.</p>

      <label for="data-collection">Data collection</label>
      <select id="data-collection" v-model="selected">
        <option v-for="item in collections" :key="item.key" :value="item.key">{{ item.label }}</option>
      </select>

      <div class="pagination">
        <p role="status">{{ selected }}: {{ recordCount }} records. Showing {{ firstRecord }}&ndash;{{ lastRecord }}. Page {{ page }} of {{ pageCount }}.</p>
        <button :disabled="page === 1" @click="page--">Previous</button>
        <button :disabled="page === pageCount" @click="page++">Next</button>
      </div>
      <pre tabindex="0" role="region" :aria-label="`Raw ${selected} JSON`"><code>{{ rawJson }}</code></pre>
    </section>
  </main>
</template>

<style scoped>
.admin-data { min-height: 70vh; padding: 2rem clamp(1rem, 4vw, 3rem) 4rem; line-height: 1.6; }
.admin-header { max-width: 1200px; margin: 1rem auto 2rem; color: #f4eedf; }
.eyebrow { color: #dfbd79; font-size: 0.74rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
.admin-header h1 { margin: 0.35rem 0; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(2rem, 5vw, 3.2rem); }
.admin-header p:last-child { max-width: 60ch; color: #d3d7dc; }
.data-panel { max-width: 1200px; margin: 0 auto; padding: clamp(1rem, 3vw, 1.75rem); border: 1px solid #c8c0b1; background: #f5f0e5; color: #172332; }
.admin-notice { margin-top: 0; padding: 0.8rem 1rem; border: 1px solid #c9a95e; background: #e8dfd1; }
label { display: block; margin: 1.3rem 0 0.4rem; font-weight: 800; }
select, button { min-height: 44px; padding: 0.6rem 0.8rem; border-radius: 0; font: inherit; }
select { max-width: 100%; border: 1px solid #69717a; background: #fffdf8; color: #182332; cursor: pointer; }
button { border: 1px solid #173047; background: #173047; color: white; font-weight: 700; cursor: pointer; }
button:hover:not(:disabled) { background: #304a60; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.pagination { display: flex; align-items: center; flex-wrap: wrap; gap: 0.7rem; margin: 1rem 0; }
.pagination p { flex: 1 1 18rem; margin: 0; }
pre { max-height: 65vh; overflow: auto; margin: 0; border: 1px solid #c7c0b5; padding: 1rem; background: #fffdf8; font-size: 0.82rem; tab-size: 2; }
code { font-family: Consolas, 'Courier New', monospace; overflow-wrap: anywhere; }
@media (max-width: 600px) { .pagination button { flex: 1; } }
</style>
