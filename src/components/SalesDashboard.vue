<script setup lang="ts">
import { computed, ref } from 'vue'
import SalesDashboardFilters from './SalesDashboardFilters.vue'
import type { SalesData, SalesChannel } from '../types/sales'
import type { SalesDashboardFilters as DashboardFilters, SalesDashboardResult } from '../types/salesDashboard'
import { computeSalesDashboard } from '../services/salesDashboard'

const props = defineProps<{ data: SalesData }>()
const filters = ref<DashboardFilters>({})

const formatDashboardUSD = (cents: number): string => {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError('Le montant ne peut pas être affiché précisément.')
  }
  const exactCents = BigInt(cents)
  const dollars = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(exactCents / 100n)
  const remainder = String(exactCents % 100n).padStart(2, '0')
  return `$${dollars}.${remainder}`
}

const dashboard = computed((): { result: SalesDashboardResult | null; error: string | null } => {
  try {
    return { result: computeSalesDashboard(props.data, filters.value), error: null }
  } catch (reason) {
    return {
      result: null,
      error: reason instanceof Error ? reason.message : String(reason)
    }
  }
})

const monthlyBars = computed(() => {
  const months = dashboard.value.result?.monthly ?? []
  const largest = Math.max(0, ...months.map(month => month.totalCents))
  return months.map(month => ({
    ...month,
    width: largest === 0 ? 0 : (month.totalCents / largest) * 100,
    label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${month.month}-01T00:00:00Z`))
  }))
})

const channelLabel = (channel: SalesChannel): string =>
  channel === 'online' ? 'Portail en ligne' : 'Magasin'
</script>

<template>
  <main class="sales-dashboard" aria-labelledby="sales-dashboard-title">
    <header class="dashboard-heading">
      <p class="eyebrow">Registre · synthèse des ventes</p>
      <h2 id="sales-dashboard-title">Tableau de bord</h2>
      <p class="fiction-note"><strong>Données fictives.</strong> Ces commandes sont une démonstration locale, pas des paiements ou encaissements réels.</p>
    </header>

    <SalesDashboardFilters v-model="filters" :locations="data.locations" />

    <section v-if="dashboard.error" class="dashboard-error" role="alert" aria-live="assertive">
      <p class="eyebrow">Calcul indisponible</p>
      <h3>Les ventes ne peuvent pas être affichées</h3>
      <p>{{ dashboard.error }}</p>
    </section>

    <template v-else-if="dashboard.result">
      <section class="kpis" aria-label="Indicateurs des commandes sélectionnées">
        <article class="kpi kpi-total">
          <p>Ventes totales</p>
          <strong>{{ formatDashboardUSD(dashboard.result.kpis.totalCents) }}</strong>
        </article>
        <article class="kpi">
          <p>Commandes</p>
          <strong>{{ dashboard.result.kpis.orderCount }}</strong>
        </article>
        <article class="kpi">
          <p>Panier moyen</p>
          <strong>{{ dashboard.result.kpis.averageOrderCents === null ? 'Non calculé' : formatDashboardUSD(dashboard.result.kpis.averageOrderCents) }}</strong>
        </article>
      </section>

      <p v-if="dashboard.result.kpis.orderCount === 0" class="empty-state" role="status">
        Aucune commande ne correspond à la sélection. Les ventes sont à zéro et le panier moyen n’est pas calculé.
      </p>

      <div class="widget-grid">
        <section class="widget channel-widget" aria-labelledby="channel-title">
          <div class="widget-heading">
            <p class="eyebrow">Origine des ventes</p>
            <h3 id="channel-title">Canaux</h3>
          </div>
          <ul v-if="dashboard.result.byChannel.length" class="channel-list">
            <li v-for="channel in dashboard.result.byChannel" :key="channel.channel">
              <span class="channel-mark" :class="`channel-${channel.channel}`" aria-hidden="true"></span>
              <span class="channel-name">{{ channelLabel(channel.channel) }}</span>
              <span class="channel-orders">{{ channel.orderCount }} {{ channel.orderCount === 1 ? 'commande' : 'commandes' }}</span>
              <strong>{{ formatDashboardUSD(channel.totalCents) }}</strong>
            </li>
          </ul>
          <p v-else class="widget-empty">Aucune vente par canal pour cette sélection.</p>
        </section>

        <section class="widget locations-widget" aria-labelledby="locations-title">
          <div class="widget-heading">
            <p class="eyebrow">Réseau</p>
            <h3 id="locations-title">Points de vente</h3>
          </div>
          <div v-if="dashboard.result.byLocation.length" class="table-scroll">
            <table>
              <thead>
                <tr><th scope="col">Point de vente</th><th scope="col">Canal</th><th scope="col">Commandes</th><th scope="col">Ventes</th></tr>
              </thead>
              <tbody>
                <tr v-for="location in dashboard.result.byLocation" :key="location.locationId">
                  <th scope="row">{{ location.locationName }}</th>
                  <td>{{ channelLabel(location.channel) }}</td>
                  <td>{{ location.orderCount }}</td>
                  <td>{{ formatDashboardUSD(location.totalCents) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="widget-empty">Aucun point de vente avec des commandes dans cette sélection.</p>
        </section>

        <section class="widget products-widget" aria-labelledby="products-title">
          <div class="widget-heading">
            <p class="eyebrow">Classement · chiffre d’affaires</p>
            <h3 id="products-title">10 produits principaux</h3>
          </div>
          <div v-if="dashboard.result.topProducts.length" class="table-scroll">
            <table>
              <thead>
                <tr><th scope="col">#</th><th scope="col">Produit</th><th scope="col">Quantité</th><th scope="col">Ventes</th></tr>
              </thead>
              <tbody>
                <tr v-for="(product, index) in dashboard.result.topProducts" :key="product.productId">
                  <td class="rank">{{ String(index + 1).padStart(2, '0') }}</td>
                  <th scope="row">{{ product.productName }}<span class="product-category">{{ product.category }}</span></th>
                  <td>{{ product.quantity }}</td>
                  <td>{{ formatDashboardUSD(product.totalCents) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="widget-empty">Aucun produit vendu dans cette sélection.</p>
        </section>

        <section class="widget monthly-widget" aria-labelledby="monthly-title">
          <div class="widget-heading">
            <p class="eyebrow">Tendance · chronologie UTC</p>
            <h3 id="monthly-title">Évolution mensuelle</h3>
          </div>
          <ol v-if="monthlyBars.length" class="monthly-list">
            <li v-for="month in monthlyBars" :key="month.month">
              <span class="month-label">{{ month.label }}</span>
              <span class="bar-track" aria-hidden="true"><span class="bar-fill" :style="{ width: `${month.width}%` }"></span></span>
              <strong>{{ formatDashboardUSD(month.totalCents) }}</strong>
            </li>
          </ol>
          <p v-else class="widget-empty">Aucune vente mensuelle pour cette sélection.</p>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.sales-dashboard { display: grid; gap: 1.15rem; }
.dashboard-heading { display: grid; grid-template-columns: minmax(0, 1fr) minmax(15rem, 29rem); align-items: end; gap: .35rem 1.5rem; }
.eyebrow { margin: 0; color: var(--gold-deep); font-size: .73rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
.dashboard-heading .eyebrow, .dashboard-heading h2 { grid-column: 1; }
.dashboard-heading h2 { margin: 0; color: var(--ink); font-family: var(--font-display); font-size: clamp(2.2rem, 4vw, 3.5rem); font-weight: 400; line-height: .96; letter-spacing: .025em; text-transform: uppercase; }
.fiction-note { grid-column: 2; grid-row: 1 / span 2; margin: 0; padding: .8rem 1rem; color: var(--ink); background: #efe2c0; border-left: 4px solid var(--crimson); font-size: .94rem; line-height: 1.45; }
.kpis { display: grid; grid-template-columns: 1.35fr 1fr 1fr; gap: .8rem; }
.kpi { min-width: 0; padding: 1rem 1.2rem; color: var(--text); background: var(--steel); border: 2px solid var(--ink); box-shadow: 4px 4px 0 var(--gold-deep); }
.kpi p { margin: 0 0 .35rem; color: var(--muted); font-size: .78rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.kpi strong { display: block; overflow-wrap: anywhere; font-family: var(--font-display); font-size: clamp(1.7rem, 3.5vw, 2.7rem); font-weight: 400; line-height: 1.05; letter-spacing: .025em; }
.kpi-total { color: var(--ink); background: var(--gold); }
.kpi-total p { color: #44310a; }
.empty-state { margin: .2rem 0 0; padding: .85rem 1rem; color: var(--ink); background: #e7d9b6; border: 2px dashed var(--gold-deep); font-weight: 600; }
.widget-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .9rem; }
.widget { min-width: 0; padding: 1.1rem; color: var(--ink); background: linear-gradient(155deg, var(--parchment), var(--parchment-2)); border: 2px solid var(--ink); box-shadow: 0 0 0 1px var(--gold-deep), 5px 5px 0 rgba(13, 17, 23, .55); }
.widget-heading { margin-bottom: .8rem; }
.widget-heading h3 { margin: .15rem 0 0; font-family: var(--font-display); font-size: 1.55rem; font-weight: 400; line-height: 1; letter-spacing: .025em; text-transform: uppercase; }
.channel-list, .monthly-list { display: grid; gap: .45rem; margin: 0; padding: 0; list-style: none; }
.channel-list li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .35rem .65rem; padding: .55rem 0; border-bottom: 1px solid rgba(13, 17, 23, .2); }
.channel-mark { grid-row: span 2; width: .75rem; height: 2.3rem; background: var(--crimson); }
.channel-online { background: #126984; }
.channel-name { font-weight: 800; }
.channel-orders { color: #4a4b46; font-size: .84rem; }
.channel-list strong { grid-column: 3; grid-row: 1 / span 2; white-space: nowrap; font-family: var(--font-display); font-size: 1.2rem; font-weight: 400; }
.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: .91rem; }
th, td { padding: .55rem .45rem; border-bottom: 1px solid rgba(13, 17, 23, .18); }
thead th { color: #4c4a43; font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; }
tbody td:last-child, thead th:last-child { text-align: right; white-space: nowrap; }
.products-widget tbody td:nth-last-child(2) { text-align: center; }
.products-widget tbody th { min-width: 9rem; }
.rank { width: 2rem; color: var(--crimson-deep); font-family: var(--font-display); font-size: 1.15rem; }
.product-category { display: block; color: #57574f; font-size: .77rem; font-weight: 400; }
.monthly-list li { display: grid; grid-template-columns: minmax(6rem, .7fr) minmax(4rem, 1fr) auto; align-items: center; gap: .7rem; padding: .42rem 0; border-bottom: 1px solid rgba(13, 17, 23, .16); }
.month-label { text-transform: capitalize; }
.bar-track { height: .7rem; overflow: hidden; background: rgba(13, 17, 23, .12); }
.bar-fill { display: block; height: 100%; background: var(--crimson); border-right: 2px solid var(--ink); }
.monthly-list strong { font-family: var(--font-display); font-size: 1rem; font-weight: 400; white-space: nowrap; }
.widget-empty { margin: 0; color: #54534c; font-style: italic; }
.dashboard-error { padding: 1.2rem; color: #fff; background: var(--crimson-deep); border: 3px solid var(--ink); box-shadow: 5px 5px 0 var(--ink); }
.dashboard-error .eyebrow { color: #ffe2a3; }
.dashboard-error h3 { margin: .25rem 0; font-family: var(--font-display); font-size: 1.7rem; font-weight: 400; text-transform: uppercase; }
.dashboard-error p:last-child { margin-bottom: 0; }
.sales-dashboard :focus-visible { outline: 3px solid #126984; outline-offset: 3px; }
@media (max-width: 800px) {
  .dashboard-heading { grid-template-columns: 1fr; }
  .dashboard-heading .eyebrow, .dashboard-heading h2, .fiction-note { grid-column: 1; }
  .fiction-note { grid-row: auto; }
}
@media (max-width: 650px) {
  .kpis, .widget-grid { grid-template-columns: 1fr; }
  .kpi { padding: .8rem 1rem; }
  .monthly-list li { grid-template-columns: minmax(5rem, .7fr) minmax(2rem, 1fr) auto; gap: .45rem; font-size: .88rem; }
  .widget { padding: .85rem; }
}
</style>
