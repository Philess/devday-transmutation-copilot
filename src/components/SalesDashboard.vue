<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatUSD } from '../services/checkout'
import { computeSalesDashboard } from '../services/salesDashboard'
import type { SalesData, SalesLocation } from '../types/sales'
import type { SalesDashboardFilters, SalesDashboardResult } from '../types/salesDashboard'
import SalesDashboardFiltersView from './SalesDashboardFilters.vue'

const props = defineProps<{ dataset: SalesData & { locations: SalesLocation[] } }>()

const filters = ref<SalesDashboardFilters>({})
const numberFormat = new Intl.NumberFormat('fr-FR')

const dashboard = computed<{ result: SalesDashboardResult | null; error: string | null }>(() => {
  try {
    return { result: computeSalesDashboard(props.dataset, filters.value), error: null }
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : String(error)
    }
  }
})

const locations = computed(() => props.dataset.locations)
const result = computed(() => dashboard.value.result)
const error = computed(() => dashboard.value.error)
const maxLocationSales = computed(() =>
  Math.max(0, ...(result.value?.byLocation.map(location => location.totalCents) ?? []))
)
const maxChannelSales = computed(() =>
  Math.max(0, ...(result.value?.byChannel.map(channel => channel.totalCents) ?? []))
)
const maxProductSales = computed(() =>
  Math.max(0, ...(result.value?.topProducts.map(product => product.totalCents) ?? []))
)
const maxMonthlySales = computed(() =>
  Math.max(0, ...(result.value?.monthly.map(month => month.totalCents) ?? []))
)

const barWidth = (amount: number, maximum: number): string =>
  `${maximum > 0 ? Math.min(100, amount / maximum * 100) : 0}%`

const channelName = (channel: SalesLocation['channel']): string =>
  channel === 'online' ? 'Boutique en ligne' : 'Magasin'

const monthName = (month: string): string =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
</script>

<template>
  <section class="sales-dashboard" aria-labelledby="sales-dashboard-title">
    <header class="dashboard-heading">
      <p class="dashboard-eyebrow">Vue de synthèse · ventes locales</p>
      <h2 id="sales-dashboard-title">Tableau de bord des ventes</h2>
      <p class="fictional-note">
        Les commandes affichées sont fictives, y compris les commandes d’essai enregistrées localement.
        Elles ne représentent ni paiements ni encaissements réels.
      </p>
    </header>

    <SalesDashboardFiltersView v-model="filters" :locations="locations" />

    <p v-if="error" class="dashboard-error" role="alert">
      Le tableau de bord n’a pas pu être calculé. Aucun chiffre n’est affiché. Détail : {{ error }}
    </p>

    <template v-else-if="result">
      <div class="kpis" aria-label="Indicateurs clés">
        <article class="kpi">
          <h3>Chiffre d’affaires</h3>
          <p>{{ formatUSD(result.kpis.totalCents) }}</p>
        </article>
        <article class="kpi">
          <h3>Commandes</h3>
          <p>{{ numberFormat.format(result.kpis.orderCount) }}</p>
        </article>
        <article class="kpi">
          <h3>Panier moyen</h3>
          <p>{{ result.kpis.averageOrderCents === null ? '—' : formatUSD(result.kpis.averageOrderCents) }}</p>
        </article>
      </div>

      <p v-if="result.kpis.orderCount === 0" class="empty-state" role="status">
        Aucune commande ne correspond aux filtres. Le panier moyen n’est pas calculé.
      </p>

      <div class="visualizations">
        <section class="widget" aria-labelledby="sales-locations-title">
          <h3 id="sales-locations-title">Ventes par point de vente</h3>
          <p v-if="result.byLocation.length === 0" class="widget-empty">Aucune vente à afficher.</p>
          <ul v-else class="bar-list">
            <li v-for="location in result.byLocation" :key="location.locationId">
              <div class="bar-label">
                <span>{{ location.locationName }} <small>· {{ channelName(location.channel) }}</small></span>
                <strong>{{ formatUSD(location.totalCents) }}</strong>
              </div>
              <div class="bar-track" aria-hidden="true">
                <span class="bar-fill" :style="{ width: barWidth(location.totalCents, maxLocationSales) }" />
              </div>
              <small>{{ numberFormat.format(location.orderCount) }} commandes</small>
            </li>
          </ul>
        </section>

        <section class="widget" aria-labelledby="sales-channels-title">
          <h3 id="sales-channels-title">Ventes par canal</h3>
          <p v-if="result.byChannel.length === 0" class="widget-empty">Aucune vente à afficher.</p>
          <ul v-else class="bar-list">
            <li v-for="channel in result.byChannel" :key="channel.channel">
              <div class="bar-label">
                <span>{{ channelName(channel.channel) }}</span>
                <strong>{{ formatUSD(channel.totalCents) }}</strong>
              </div>
              <div class="bar-track" aria-hidden="true">
                <span class="bar-fill" :style="{ width: barWidth(channel.totalCents, maxChannelSales) }" />
              </div>
              <small>{{ numberFormat.format(channel.orderCount) }} commandes</small>
            </li>
          </ul>
        </section>

        <section class="widget" aria-labelledby="sales-products-title">
          <h3 id="sales-products-title">10 produits principaux</h3>
          <p v-if="result.topProducts.length === 0" class="widget-empty">Aucun produit à afficher.</p>
          <ol v-else class="bar-list product-list">
            <li v-for="(product, index) in result.topProducts" :key="product.productId">
              <div class="bar-label">
                <span>{{ index + 1 }}. {{ product.productName }} <small>· {{ product.category }}</small></span>
                <strong>{{ formatUSD(product.totalCents) }}</strong>
              </div>
              <div class="bar-track" aria-hidden="true">
                <span class="bar-fill" :style="{ width: barWidth(product.totalCents, maxProductSales) }" />
              </div>
              <small>{{ numberFormat.format(product.quantity) }} articles vendus</small>
            </li>
          </ol>
        </section>

        <section class="widget" aria-labelledby="sales-monthly-title">
          <h3 id="sales-monthly-title">Évolution mensuelle</h3>
          <p v-if="result.monthly.length === 0" class="widget-empty">Aucune vente à afficher.</p>
          <ul v-else class="bar-list">
            <li v-for="month in result.monthly" :key="month.month">
              <div class="bar-label">
                <span>{{ monthName(month.month) }}</span>
                <strong>{{ formatUSD(month.totalCents) }}</strong>
              </div>
              <div class="bar-track" aria-hidden="true">
                <span class="bar-fill" :style="{ width: barWidth(month.totalCents, maxMonthlySales) }" />
              </div>
              <small>{{ numberFormat.format(month.orderCount) }} commandes</small>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </section>
</template>

<style scoped>
.sales-dashboard { margin: 2rem 0; padding: clamp(1rem, 3vw, 1.5rem); color: var(--ink); background: #fffaf0; border: 2px solid var(--ink); border-radius: 4px; }
.dashboard-heading { max-width: 850px; }
.dashboard-eyebrow { margin: 0; color: var(--crimson-deep); font-size: .78rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
h2 { margin: .25rem 0 .75rem; font-family: var(--font-display); font-size: clamp(1.7rem, 4vw, 2.5rem); font-weight: 400; line-height: 1.05; text-transform: uppercase; }
.fictional-note { margin: 0 0 1.25rem; line-height: 1.5; }
.kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; margin: 1.25rem 0; }
.kpi { padding: .8rem 1rem; border: 1px solid #82795f; background: #efe2c0; }
.kpi h3 { margin: 0; font-size: .85rem; }
.kpi p { margin: .35rem 0 0; font-size: clamp(1.2rem, 2.5vw, 1.7rem); font-weight: 800; font-variant-numeric: tabular-nums; }
.empty-state, .dashboard-error { padding: .8rem 1rem; font-weight: 700; line-height: 1.5; }
.empty-state { border: 1px dashed #82795f; }
.dashboard-error { border: 2px solid #8e241d; color: #741b16; background: #fff0ed; }
.visualizations { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.widget { min-width: 0; padding: 1rem; border: 1px solid #82795f; background: #fffdf7; }
.widget h3 { margin: 0 0 .9rem; font-size: 1rem; }
.widget-empty { margin: 0; color: #4a463b; }
.bar-list { display: grid; gap: .85rem; margin: 0; padding: 0; list-style: none; }
.product-list { list-style: none; }
.bar-list li { min-width: 0; }
.bar-label { display: flex; justify-content: space-between; gap: .75rem; align-items: baseline; }
.bar-label span { min-width: 0; overflow-wrap: anywhere; }
.bar-label strong { flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.bar-label small, .bar-list li > small { color: #4a463b; }
.bar-track { height: .55rem; margin: .3rem 0 .2rem; overflow: hidden; background: #e5dcc8; border-radius: 99px; }
.bar-fill { display: block; height: 100%; background: var(--crimson-deep); border-radius: inherit; }
@media (max-width: 760px) { .visualizations { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .kpis { grid-template-columns: 1fr; } }
</style>
