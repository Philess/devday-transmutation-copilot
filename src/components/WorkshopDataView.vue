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
.data-view { min-height: 70vh; max-width: 1480px; margin: 0 auto; padding: 1rem clamp(1rem, 4vw, 2rem) 3rem; }
.view-heading { max-width: 850px; margin: 1rem 0 1.6rem; color: var(--text); }
.eyebrow { margin: 0; color: var(--spark); font-size: 0.85rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; }
h1 { margin: 0.35rem 0; font-family: var(--font-display); font-weight: 400; font-size: clamp(2.4rem, 5vw, 4rem); line-height: .95; letter-spacing: .02em; text-transform: uppercase; }
.view-heading p:last-child { max-width: 60ch; color: var(--muted); line-height: 1.6; }
.data-panel { position: relative; box-sizing: border-box; padding: clamp(1rem, 3vw, 1.75rem); color: var(--ink); background: linear-gradient(160deg, var(--parchment), var(--parchment-2)); border: 3px solid var(--ink); border-radius: 6px; box-shadow: 0 0 0 2px var(--gold-deep), 0 14px 28px rgba(0, 0, 0, .45); }
.data-note { margin-top: 0; padding: 0.8rem 1rem; border: 2px dashed var(--gold-deep); background: #efe2c0; line-height: 1.5; }
.date-range { color: #3b3a35; font-weight: 600; }
label { display: block; margin: 1.3rem 0 0.4rem; font-weight: 800; letter-spacing: .04em; }
select, button { min-height: 44px; padding: 0.6rem 0.9rem; border-radius: 4px; font: inherit; }
select { max-width: 100%; border: 3px solid var(--ink); background: #fffaf0; color: var(--ink); }
button { border: 3px solid var(--ink); background: var(--crimson-deep); color: #fff; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; cursor: pointer; box-shadow: 0 3px 0 var(--ink); }
button:hover:not(:disabled) { background: var(--crimson); }
button:disabled { color: #45505e; background: #c9bd9f; box-shadow: none; cursor: not-allowed; }
.pagination { display: flex; align-items: center; flex-wrap: wrap; gap: 0.7rem; margin: 1rem 0; }
.pagination p { flex: 1 1 18rem; margin: 0; font-weight: 600; }
pre { max-height: 65vh; overflow: auto; margin: 0; border: 3px solid var(--ink); border-radius: 3px; padding: 1rem; color: #e7eef8; background: var(--ink); font-size: 0.85rem; tab-size: 2; }
.data-panel :focus-visible { outline-color: var(--crimson-deep); }
pre:focus-visible { outline-color: var(--gold); }
code { font-family: Consolas, 'Courier New', monospace; overflow-wrap: anywhere; }
@media (max-width: 600px) { .pagination button { flex: 1; } }
</style>
