<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SalesDataset } from '../types/sales'

const props = defineProps<{ dataset: SalesDataset }>()
const collections: { key: keyof SalesDataset; label: string }[] = [
  { key: 'metadata', label: 'Métadonnées' },
  { key: 'products', label: 'Catalogue' },
  { key: 'locations', label: 'Points de vente' },
  { key: 'customers', label: 'Clients pseudonymisés' },
  { key: 'events', label: 'Périodes de démonstration' },
  { key: 'orders', label: 'Commandes' }
]
const selected = ref<keyof SalesDataset>('orders')
const page = ref(1)
const pageSize = 25
const collection = computed<unknown>(() => props.dataset[selected.value])
const entries = computed(() => Array.isArray(collection.value) ? collection.value : [collection.value])
const entryCount = computed(() => entries.value.length)
const pageCount = computed(() => Math.max(1, Math.ceil(entryCount.value / pageSize)))
const firstEntry = computed(() => entryCount.value === 0 ? 0 : (page.value - 1) * pageSize + 1)
const lastEntry = computed(() => Math.min(page.value * pageSize, entryCount.value))
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
  <main class="data-view">
    <header class="view-heading">
      <p class="eyebrow">Archives · accès lecture seule</p>
      <h1>Registre d’approvisionnement</h1>
      <p>Consultez les données fictives brutes du projet. Les commandes historiques sont conservées dans ce navigateur.</p>
    </header>

    <section class="data-panel" aria-label="Collections de données brutes">
      <p class="data-note"><strong>Démonstration locale.</strong> Aucun paiement ni service distant n’est connecté. Les montants des lignes sont en cents USD.</p>
      <p class="date-range">Période des données : {{ dataset.metadata.startDate }} – {{ dataset.metadata.endDate }} · {{ dataset.metadata.currency }} · UTC</p>

      <label for="data-collection">Collection</label>
      <select id="data-collection" v-model="selected">
        <option v-for="item in collections" :key="item.key" :value="item.key">{{ item.label }}</option>
      </select>

      <div class="pagination">
        <p role="status">{{ entryCount }} entrées · affichage {{ firstEntry }}–{{ lastEntry }} · page {{ page }} sur {{ pageCount }}</p>
        <button type="button" :disabled="page === 1" @click="page--">Précédent</button>
        <button type="button" :disabled="page === pageCount" @click="page++">Suivant</button>
      </div>
      <pre tabindex="0" role="region" :aria-label="`Données brutes : ${selected}`"><code>{{ rawJson }}</code></pre>
    </section>
  </main>
</template>

<style scoped>
.data-view { min-height: 70vh; padding: 2rem clamp(1rem, 4vw, 3rem) 4rem; }
.view-heading { max-width: 850px; margin: 1rem auto 2rem; color: #f4eedf; }
.eyebrow { color: #dfbd79; font-size: 0.74rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
h1 { margin: 0.35rem 0; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(2rem, 5vw, 3.2rem); }
.view-heading p:last-child { max-width: 60ch; color: #d3d7dc; line-height: 1.6; }
.data-panel { max-width: 1200px; box-sizing: border-box; margin: 0 auto; padding: clamp(1rem, 3vw, 1.75rem); border: 1px solid #c8c0b1; background: #f5f0e5; color: #172332; }
.data-note { margin-top: 0; padding: 0.8rem 1rem; border: 1px solid #c9a95e; background: #e8dfd1; line-height: 1.5; }
.date-range { color: #49515b; }
label { display: block; margin: 1.3rem 0 0.4rem; font-weight: 800; }
select, button { min-height: 44px; padding: 0.6rem 0.8rem; border-radius: 0; font: inherit; }
select { max-width: 100%; border: 1px solid #69717a; background: #fffdf8; color: #182332; }
button { border: 1px solid #173047; background: #173047; color: white; font-weight: 700; cursor: pointer; }
button:hover:not(:disabled) { background: #304a60; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.pagination { display: flex; align-items: center; flex-wrap: wrap; gap: 0.7rem; margin: 1rem 0; }
.pagination p { flex: 1 1 18rem; margin: 0; }
pre { max-height: 65vh; overflow: auto; margin: 0; border: 1px solid #c7c0b5; padding: 1rem; background: #fffdf8; font-size: 0.82rem; tab-size: 2; }
code { font-family: Consolas, 'Courier New', monospace; overflow-wrap: anywhere; }
@media (max-width: 600px) { .pagination button { flex: 1; } }
</style>
