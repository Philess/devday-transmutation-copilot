<script setup lang="ts">
import { computed } from 'vue'
import type { SalesDataset } from '../types/sales'
import { useSalesDashboard } from './salesDashboardState'

const props = defineProps<{ dataset: SalesDataset }>()

const { startDate, endDate, channel, locationId, calculation } = useSalesDashboard(() => props.dataset)
const summary = computed(() => calculation.value.summary)
const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
})
const formatCents = (cents: number): string => {
  const amount = BigInt(cents)
  const dollars = amount / 100n
  const remainder = (amount % 100n).toString().padStart(2, '0')
  return `${currency.format(dollars)}.${remainder}`
}
const channelLabel = (channel: 'store' | 'online'): string =>
  channel === 'online' ? 'Portail en ligne' : 'Magasins'
const monthLabel = (month: string): string => {
  const date = new Date(`${month}-01T00:00:00Z`)
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}
const productScale = computed(() => Math.max(0, ...(summary.value?.topProducts.map(product => product.totalCents) ?? [])))
const locationScale = computed(() => Math.max(0, ...(summary.value?.byLocation.map(location => location.totalCents) ?? [])))
const monthScale = computed(() => Math.max(0, ...(summary.value?.byMonth.map(month => month.totalCents) ?? [])))
const monthPoints = computed(() => {
  const months = summary.value?.byMonth ?? []
  if (months.length === 0 || monthScale.value === 0) return ''
  return months.map((month, index) => {
    const x = months.length === 1 ? 50 : index * 100 / (months.length - 1)
    const y = 42 - month.totalCents / monthScale.value * 36
    return `${x},${y}`
  }).join(' ')
})
</script>

<template>
  <section class="sales-view" aria-labelledby="sales-heading">
    <header class="sales-heading">
      <div>
        <p class="eyebrow">Archives · synthèse en lecture seule</p>
        <h2 id="sales-heading">Ventes en bref</h2>
        <p class="sales-lede">Les commandes d’essai sont incluses dès leur enregistrement dans ce navigateur.</p>
      </div>
      <p class="fiction-note"><strong>Données fictives.</strong> Ces commandes ne représentent ni paiements ni encaissements réels.</p>
    </header>

    <section class="sales-filters" aria-labelledby="filters-heading">
      <div class="filters-heading">
        <p class="panel-index">Affiner la période et le périmètre</p>
        <h3 id="filters-heading">Filtres</h3>
      </div>
      <div class="filter-controls">
        <label>
          <span>Date de début (incluse)</span>
          <input v-model="startDate" type="date" aria-label="Date de début incluse">
        </label>
        <label>
          <span>Date de fin (incluse)</span>
          <input v-model="endDate" type="date" aria-label="Date de fin incluse">
        </label>
        <label>
          <span>Canal</span>
          <select v-model="channel" aria-label="Filtrer par canal">
            <option value="">Tous les canaux</option>
            <option value="store">Magasins</option>
            <option value="online">Portail en ligne</option>
          </select>
        </label>
        <label>
          <span>Point de vente</span>
          <select v-model="locationId" aria-label="Filtrer par point de vente">
            <option value="">Tous les points de vente</option>
            <option v-for="location in dataset.locations" :key="location.id" :value="location.id">
              {{ location.name }} — {{ channelLabel(location.channel) }}
            </option>
          </select>
        </label>
      </div>
    </section>

    <div v-if="calculation.error" class="sales-error" role="alert">
      <h3>La synthèse des ventes ne peut pas être calculée</h3>
      <p>Les données enregistrées n’ont pas été modifiées. Détail : {{ calculation.error }}</p>
    </div>

    <template v-else-if="summary">
      <p v-if="summary.orderCount === 0" class="empty-note" role="status">
        Aucune commande pour le moment. Les ventes et le nombre de commandes sont à zéro ; aucun panier moyen n’est calculé.
      </p>

      <section class="metrics" aria-label="Indicateurs des commandes">
        <article class="metric metric-primary">
          <p>Ventes totales</p>
          <strong>{{ formatCents(summary.totalCents) }}</strong>
          <span>Commandes fictives · USD</span>
        </article>
        <article class="metric">
          <p>Commandes</p>
          <strong>{{ summary.orderCount.toLocaleString('fr-FR') }}</strong>
          <span>{{ summary.orderCount === 1 ? 'commande' : 'commandes' }}</span>
        </article>
        <article class="metric">
          <p>Panier moyen</p>
          <strong>{{ summary.averageOrderCents === null ? 'Non calculé' : formatCents(summary.averageOrderCents) }}</strong>
          <span>Ventes ÷ commandes</span>
        </article>
      </section>

      <div class="sales-grid">
        <section class="sales-panel channels-panel" aria-labelledby="channels-heading">
          <div class="panel-heading">
            <p class="panel-index">01 / Répartition</p>
            <h3 id="channels-heading">Magasins &amp; portail</h3>
          </div>
          <p v-if="summary.byChannel.length === 0" class="panel-empty">Aucune vente par point de vente.</p>
          <div v-for="channel in summary.byChannel" :key="channel.channel" class="channel-block">
            <div class="channel-total">
              <h4>{{ channelLabel(channel.channel) }}</h4>
              <strong>{{ formatCents(channel.totalCents) }}</strong>
              <span>{{ channel.orderCount }} {{ channel.orderCount === 1 ? 'commande' : 'commandes' }}</span>
            </div>
            <ul class="location-list">
              <li v-for="item in summary.byLocation.filter(entry => entry.location.channel === channel.channel)" :key="item.location.id">
                <div class="location-copy">
                  <span>{{ item.location.name }}</span>
                  <small>{{ item.orderCount }} {{ item.orderCount === 1 ? 'commande' : 'commandes' }}</small>
                </div>
                <div class="bar-track" aria-hidden="true">
                  <span class="bar-fill" :style="{ width: `${locationScale ? item.totalCents / locationScale * 100 : 0}%` }" />
                </div>
                <strong>{{ formatCents(item.totalCents) }}</strong>
              </li>
            </ul>
          </div>
        </section>

        <section class="sales-panel products-panel" aria-labelledby="products-heading">
          <div class="panel-heading">
            <p class="panel-index">02 / Classement · chiffre d’affaires</p>
            <h3 id="products-heading">Top 10 produits</h3>
          </div>
          <p v-if="summary.topProducts.length === 0" class="panel-empty">Aucun produit vendu.</p>
          <ol v-else class="product-list">
            <li v-for="(product, index) in summary.topProducts" :key="product.productId">
              <span class="rank">{{ String(index + 1).padStart(2, '0') }}</span>
              <div class="product-copy">
                <span>{{ product.name }}</span>
                <div class="bar-track" aria-hidden="true">
                  <span class="bar-fill" :style="{ width: `${productScale ? product.totalCents / productScale * 100 : 0}%` }" />
                </div>
              </div>
              <strong>{{ formatCents(product.totalCents) }}</strong>
            </li>
          </ol>
        </section>

        <section class="sales-panel months-panel" aria-labelledby="months-heading">
          <div class="panel-heading">
            <p class="panel-index">03 / Rythme des commandes</p>
            <h3 id="months-heading">Évolution mensuelle</h3>
          </div>
          <p v-if="summary.byMonth.length === 0" class="panel-empty">Aucune période à représenter.</p>
          <template v-else>
            <svg class="month-chart" viewBox="0 0 100 50" role="img" aria-labelledby="chart-title chart-description">
              <title id="chart-title">Ventes par mois</title>
              <desc id="chart-description">Montants mensuels des commandes fictives, en dollars américains.</desc>
              <line x1="0" y1="43" x2="100" y2="43" class="chart-axis" />
              <polyline :points="monthPoints" class="chart-line" />
              <circle
                v-for="(month, index) in summary.byMonth"
                :key="month.month"
                :cx="summary.byMonth.length === 1 ? 50 : index * 100 / (summary.byMonth.length - 1)"
                :cy="42 - month.totalCents / monthScale * 36"
                r="1.7"
                class="chart-point"
              />
            </svg>
            <ol class="month-list">
              <li v-for="month in summary.byMonth" :key="month.month">
                <span>{{ monthLabel(month.month) }}</span>
                <small>{{ month.orderCount }} {{ month.orderCount === 1 ? 'commande' : 'commandes' }}</small>
                <strong>{{ formatCents(month.totalCents) }}</strong>
              </li>
            </ol>
          </template>
        </section>
      </div>
    </template>
  </section>
</template>

<style scoped>
.sales-view { max-width: 1480px; margin: 0 auto; padding: 1.2rem clamp(1rem, 4vw, 2rem) 3rem; }
.sales-heading { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; margin: 0 0 1.3rem; }
.eyebrow, .panel-index { margin: 0; color: var(--spark); font-size: .78rem; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
.sales-heading h2 { margin: .25rem 0 0; font-family: var(--font-display); font-size: clamp(2.2rem, 5vw, 3.8rem); font-weight: 400; line-height: .98; letter-spacing: .025em; text-transform: uppercase; }
.sales-lede { margin: .6rem 0 0; color: var(--muted); }
.fiction-note { flex: 0 1 24rem; margin: 0; padding: .8rem 1rem; color: var(--ink); background: var(--gold); border: 2px solid var(--ink); box-shadow: 4px 4px 0 var(--gold-deep); line-height: 1.4; }
.sales-error { padding: 1.2rem 1.4rem; color: var(--ink); background: #ffe4e7; border: 3px solid var(--crimson-deep); box-shadow: 0 0 0 2px var(--crimson); }
.sales-error h3 { margin: 0 0 .3rem; font-family: var(--font-display); font-size: 1.6rem; font-weight: 400; text-transform: uppercase; }
.sales-error p { margin: 0; overflow-wrap: anywhere; }
.empty-note { margin: 0 0 1rem; padding: .8rem 1rem; color: var(--ink); background: var(--parchment); border-left: 5px solid var(--gold-deep); font-weight: 700; }
.sales-filters { margin: 0 0 1rem; padding: 1rem 1.2rem; color: var(--ink); background: var(--parchment); border: 2px solid var(--ink); box-shadow: 3px 3px 0 var(--gold-deep); }
.filters-heading { margin-bottom: .8rem; }
.filters-heading h3 { margin: .15rem 0 0; font-family: var(--font-display); font-size: 1.35rem; font-weight: 400; letter-spacing: .035em; text-transform: uppercase; }
.filter-controls { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; }
.filter-controls label { display: grid; align-content: start; gap: .35rem; font-size: .84rem; font-weight: 800; }
.filter-controls input, .filter-controls select { box-sizing: border-box; width: 100%; min-width: 0; min-height: 44px; padding: .55rem .65rem; color: var(--ink); background: #fffaf0; border: 2px solid var(--ink); border-radius: 3px; font: inherit; }
.metrics { display: grid; grid-template-columns: 1.25fr 1fr 1fr; gap: 1rem; }
.metric { display: flex; flex-direction: column; justify-content: center; min-height: 138px; padding: 1rem 1.2rem; color: var(--text); background: var(--steel); border: 2px solid var(--steel-3); box-shadow: 0 5px 0 rgba(0, 0, 0, .28); }
.metric-primary { color: var(--ink); background: var(--gold); border-color: var(--ink); box-shadow: 4px 5px 0 var(--gold-deep); }
.metric p { margin: 0; font-size: .8rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.metric strong { margin: .15rem 0; font-family: var(--font-display); font-size: clamp(1.8rem, 3vw, 2.8rem); font-weight: 400; line-height: 1.1; letter-spacing: .025em; overflow-wrap: anywhere; }
.metric span { font-size: .88rem; opacity: .8; }
.sales-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-top: 1rem; align-items: stretch; }
.sales-panel { min-width: 0; padding: clamp(1rem, 2vw, 1.5rem); color: var(--ink); background: linear-gradient(155deg, var(--parchment), var(--parchment-2)); border: 3px solid var(--ink); box-shadow: 0 0 0 2px var(--gold-deep), 0 10px 24px rgba(0, 0, 0, .28); }
.panel-heading { margin-bottom: 1rem; padding-bottom: .75rem; border-bottom: 2px solid rgba(13, 17, 23, .22); }
.panel-index { color: var(--crimson-deep); font-size: .7rem; }
.panel-heading h3 { margin: .15rem 0 0; font-family: var(--font-display); font-size: 1.65rem; font-weight: 400; line-height: 1; letter-spacing: .035em; text-transform: uppercase; }
.panel-empty { margin: 1rem 0 0; color: #555044; font-weight: 600; }
.channel-block + .channel-block { margin-top: 1.2rem; padding-top: 1rem; border-top: 1px dashed rgba(13, 17, 23, .35); }
.channel-total { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 0 .6rem; }
.channel-total h4 { margin: 0; font-family: var(--font-display); font-size: 1.2rem; font-weight: 400; letter-spacing: .03em; text-transform: uppercase; }
.channel-total strong { font-family: var(--font-display); font-size: 1.4rem; font-weight: 400; }
.channel-total > span { grid-column: 1 / -1; color: #555044; font-size: .85rem; }
.location-list, .product-list, .month-list { margin: .5rem 0 0; padding: 0; list-style: none; }
.location-list li { display: grid; grid-template-columns: minmax(0, 1fr) minmax(5rem, .8fr) auto; align-items: center; gap: .75rem; padding: .55rem 0; border-top: 1px solid rgba(13, 17, 23, .12); }
.location-copy, .product-copy { display: grid; min-width: 0; gap: .15rem; }
.location-copy > span, .product-copy > span { overflow-wrap: anywhere; font-weight: 700; }
.location-copy small, .month-list small { color: #625d50; font-size: .76rem; }
.location-list li > strong, .product-list li > strong, .month-list strong { white-space: nowrap; font-size: .9rem; }
.bar-track { height: 7px; overflow: hidden; background: rgba(13, 17, 23, .13); border-radius: 999px; }
.bar-fill { display: block; height: 100%; background: var(--crimson-deep); border-radius: inherit; }
.product-list li { display: grid; grid-template-columns: 2rem minmax(0, 1fr) auto; align-items: center; gap: .65rem; padding: .5rem 0; border-bottom: 1px solid rgba(13, 17, 23, .12); }
.rank { color: var(--crimson-deep); font-family: var(--font-display); font-size: 1.1rem; }
.month-chart { display: block; width: 100%; height: auto; margin: .3rem 0 .7rem; overflow: visible; }
.chart-axis { stroke: rgba(13, 17, 23, .3); stroke-width: .8; }
.chart-line { fill: none; stroke: var(--crimson-deep); stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.chart-point { fill: var(--gold); stroke: var(--ink); stroke-width: .8; vector-effect: non-scaling-stroke; }
.month-list li { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: baseline; gap: .7rem; padding: .55rem 0; border-top: 1px solid rgba(13, 17, 23, .14); }
.month-list li > span { font-weight: 700; text-transform: capitalize; }
.month-list small { white-space: nowrap; }
.sales-view :focus-visible { outline-color: var(--crimson-deep); }
@media (max-width: 760px) {
  .sales-heading { align-items: start; flex-direction: column; }
  .fiction-note { flex-basis: auto; }
  .filter-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sales-grid { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .filter-controls { grid-template-columns: 1fr; }
  .metrics { grid-template-columns: 1fr; gap: .6rem; }
  .metric { min-height: 104px; }
  .location-list li { grid-template-columns: minmax(0, 1fr) auto; }
  .location-list .bar-track { grid-column: 1 / -1; grid-row: 2; }
  .month-list li { grid-template-columns: minmax(0, 1fr) auto; }
  .month-list small { grid-column: 1; }
  .month-list strong { grid-column: 2; grid-row: 1 / span 2; }
}
</style>
