<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SalesDashboardFilters, SalesDashboardResult } from '../types/salesDashboard'
import type { SalesDataset } from '../types/sales'
import { computeSalesDashboard, SalesDashboardError } from '../services/salesDashboard'
import { formatUSD } from '../services/checkout'
import SalesDashboardFiltersView from './SalesDashboardFilters.vue'

const props = defineProps<{ dataset: SalesDataset }>()
const filters = ref<SalesDashboardFilters>({})

const state = computed<{ result: SalesDashboardResult | null; error: string | null }>(() => {
  try {
    return { result: computeSalesDashboard(props.dataset, filters.value), error: null }
  } catch (reason) {
    const detail = reason instanceof SalesDashboardError
      ? `${reason.code} — ${reason.message}`
      : reason instanceof Error
        ? reason.message
        : String(reason)
    return { result: null, error: detail }
  }
})

const isEmpty = computed(() =>
  state.value.result !== null && state.value.result.kpis.orderCount === 0
)
</script>

<template>
  <main class="sales-dashboard">
    <header class="dashboard-heading">
      <p class="eyebrow">Commandes fictives · USD</p>
      <h1>Tableau de bord des ventes</h1>
      <p>Analyse locale des commandes fictives enregistrées. Ces chiffres ne sont ni des paiements ni des encaissements réels.</p>
    </header>

    <SalesDashboardFiltersView v-model="filters" :locations="dataset.locations" />

    <section v-if="state.error" class="dashboard-error" role="alert" aria-label="Erreur du tableau de bord">
      <h2>Les ventes ne peuvent pas être calculées</h2>
      <p>{{ state.error }}</p>
    </section>

    <section v-else-if="isEmpty" class="dashboard-empty" role="status">
      <h2>Aucune commande dans cette sélection</h2>
      <dl class="empty-kpis">
        <div><dt>Commandes</dt><dd>0</dd></div>
        <div><dt>Ventes</dt><dd>{{ formatUSD(0) }}</dd></div>
        <div><dt>Panier moyen</dt><dd>Non calculé</dd></div>
      </dl>
    </section>

    <section v-else-if="state.result" class="dashboard-content" aria-label="Résultats des ventes">
      <div class="kpi-grid" aria-label="Indicateurs principaux">
        <article class="kpi">
          <p>Ventes totales</p>
          <strong>{{ formatUSD(state.result.kpis.totalCents) }}</strong>
        </article>
        <article class="kpi">
          <p>Commandes</p>
          <strong>{{ state.result.kpis.orderCount }}</strong>
        </article>
        <article class="kpi">
          <p>Panier moyen</p>
          <strong>{{ state.result.kpis.averageOrderCents === null ? 'Non calculé' : formatUSD(state.result.kpis.averageOrderCents) }}</strong>
        </article>
      </div>

      <div class="widget-grid">
        <article class="widget">
          <h2>Ventes par point de vente</h2>
          <ul class="sales-list">
            <li v-for="location in state.result.byLocation" :key="location.locationId">
              <span>
                <strong>{{ location.locationName }}</strong>
                <small>{{ location.channel === 'online' ? 'Portail en ligne' : 'Magasin' }}</small>
              </span>
              <b>{{ formatUSD(location.totalCents) }}</b>
              <small>{{ location.orderCount }} {{ location.orderCount === 1 ? 'commande' : 'commandes' }}</small>
            </li>
          </ul>
        </article>

        <article class="widget">
          <h2>Ventes par canal</h2>
          <ul class="channel-list">
            <li v-for="channel in state.result.byChannel" :key="channel.channel">
              <span>{{ channel.channel === 'online' ? 'Portail en ligne' : 'Magasins' }}</span>
              <strong>{{ formatUSD(channel.totalCents) }}</strong>
              <small>{{ channel.orderCount }} {{ channel.orderCount === 1 ? 'commande' : 'commandes' }}</small>
            </li>
          </ul>
        </article>

        <article class="widget top-products">
          <h2>Top 10 des produits</h2>
          <ol>
            <li v-for="product in state.result.topProducts" :key="product.productId">
              <span><strong>{{ product.productName }}</strong><small>{{ product.category }}</small></span>
              <b>{{ formatUSD(product.totalCents) }}</b>
              <small>{{ product.quantity }} unités</small>
            </li>
          </ol>
        </article>

        <article class="widget">
          <h2>Évolution mensuelle</h2>
          <table>
            <thead><tr><th>Mois</th><th>Ventes</th><th>Commandes</th></tr></thead>
            <tbody>
              <tr v-for="month in state.result.monthly" :key="month.month">
                <th scope="row">{{ month.month }}</th>
                <td>{{ formatUSD(month.totalCents) }}</td>
                <td>{{ month.orderCount }}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.sales-dashboard { min-height: 70vh; max-width: 1480px; margin: 0 auto; padding: 1rem clamp(1rem, 4vw, 2rem) 3rem; color: var(--text); }
.dashboard-heading { max-width: 850px; margin: 1rem 0 1.6rem; }
.eyebrow { margin: 0; color: var(--spark); font-size: 0.85rem; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; }
h1 { margin: .35rem 0; font-family: var(--font-display); font-weight: 400; font-size: clamp(2.4rem, 5vw, 4rem); line-height: .95; letter-spacing: .02em; text-transform: uppercase; }
.dashboard-heading p:last-child { max-width: 65ch; color: var(--muted); line-height: 1.6; }
.dashboard-error, .dashboard-empty { margin-top: 1rem; padding: 1.25rem; border: 3px solid var(--ink); border-radius: 6px; background: var(--parchment); color: var(--ink); }
.dashboard-error { border-color: var(--crimson-deep); }
.dashboard-error h2, .dashboard-empty h2 { margin-top: 0; }
.empty-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; }
.empty-kpis div { padding: 1rem; border: 2px solid var(--ink); background: #fffaf0; }
.empty-kpis dt { font-weight: 700; }
.empty-kpis dd { margin: .35rem 0 0; font-size: 1.25rem; font-weight: 900; }
.kpi-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin: 1rem 0; }
.kpi { min-height: 8rem; padding: 1.25rem; border: 3px solid var(--ink); border-radius: 6px; background: linear-gradient(145deg, var(--parchment), var(--parchment-2)); color: var(--ink); box-shadow: 0 7px 18px rgba(0,0,0,.25); }
.kpi p { margin: 0 0 .8rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.kpi strong { font-family: var(--font-display); font-size: clamp(1.8rem, 4vw, 3rem); }
.widget-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.widget { min-width: 0; padding: 1.25rem; border: 3px solid var(--ink); border-radius: 6px; background: linear-gradient(160deg, var(--parchment), var(--parchment-2)); color: var(--ink); }
.widget h2 { margin: 0 0 1rem; font-size: 1.15rem; text-transform: uppercase; letter-spacing: .04em; }
.sales-list, .channel-list, .top-products ol { list-style: none; margin: 0; padding: 0; }
.sales-list li, .channel-list li, .top-products li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .25rem .8rem; align-items: center; padding: .75rem 0; border-bottom: 1px solid rgba(20,28,39,.25); }
.sales-list li:last-child, .channel-list li:last-child, .top-products li:last-child { border-bottom: 0; }
.sales-list span, .top-products span { display: flex; flex-direction: column; }
.sales-list b, .channel-list strong, .top-products b { grid-column: 2; grid-row: 1; }
.sales-list li > small, .channel-list li > small, .top-products li > small { grid-column: 1 / 3; grid-row: 2; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: .7rem .5rem; border-bottom: 1px solid rgba(20,28,39,.25); text-align: right; }
th:first-child { text-align: left; }
@media (max-width: 760px) {
  .kpi-grid, .widget-grid, .empty-kpis { grid-template-columns: 1fr; }
}
</style>
