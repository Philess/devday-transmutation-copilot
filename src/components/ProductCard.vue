<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '../types/product'
import { formatUSD, MAX_QUANTITY } from '../services/checkout'
import ProductArt from './ProductArt.vue'

const props = defineProps<{ product: Product, inCart: number, cartPaused: boolean }>()
const emit = defineEmits<{ add: [product: Product] }>()

const price = computed(() => formatUSD(props.product.priceCents))
const atLimit = computed(() => props.inCart >= MAX_QUANTITY)
const since = computed(() => new Date(`${props.product.saleStartDate}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' }))
</script>

<template>
  <article class="card" :aria-labelledby="`product-${product.id}-name`">
    <div class="art">
      <ProductArt :id="product.id" :illustration="product.illustration" :alt="product.imageAlt" />
      <span class="stamp">{{ product.status }}</span>
    </div>
    <div class="info">
      <div class="text">
        <p class="category">{{ product.category }}</p>
        <h3 :id="`product-${product.id}-name`">{{ product.name }}</h3>
        <p class="supplier">{{ product.supplier }} · {{ product.origin }}</p>
      </div>
      <p class="price"><span class="visually-hidden">Prix </span>{{ price }}</p>
    </div>
    <details>
      <summary>Fiche d’inventaire</summary>
      <p class="description">{{ product.description }}</p>
      <dl>
        <div><dt>Origine</dt><dd>{{ product.origin }}</dd></div>
        <div><dt>Statut</dt><dd>{{ product.status }}</dd></div>
        <div><dt>Référencé depuis</dt><dd>{{ since }}</dd></div>
      </dl>
    </details>
    <button
      type="button"
      class="add"
      :disabled="cartPaused || atLimit"
      :aria-label="`Ajouter ${product.name} au panier, ${price}`"
      @click="emit('add', product)"
    >
      <span aria-hidden="true">{{ atLimit ? `Limite de ${MAX_QUANTITY} atteinte` : cartPaused ? 'Panier en pause' : inCart > 0 ? `Ajouter encore · ${inCart} au panier` : 'Ajouter au panier' }}</span>
    </button>
  </article>
</template>

<style scoped>
.card {
  position: relative; display: flex; flex-direction: column; gap: 12px; height: 100%; padding: 14px 14px 16px; color: var(--ink);
  background: linear-gradient(160deg, var(--parchment), var(--parchment-2)); border: 3px solid var(--ink); border-radius: 6px;
  box-shadow: 0 0 0 2px var(--gold-deep), 0 14px 28px rgba(0, 0, 0, .45); transition: transform 180ms ease, box-shadow 180ms ease;
}
.card::before, .card::after { content: ''; position: absolute; top: 6px; width: 8px; height: 8px; border-radius: 50%; background: var(--gold); border: 2px solid var(--ink); z-index: 2; }
.card::before { left: 6px; }
.card::after { right: 6px; }
.card:hover, .card:focus-within { transform: translateY(-4px); box-shadow: 0 0 0 2px var(--gold), 0 20px 34px rgba(0, 0, 0, .5); }
.art { position: relative; border: 3px solid var(--ink); border-radius: 3px; overflow: hidden; background: var(--ink); line-height: 0; }
.stamp {
  position: absolute; left: 8px; bottom: 8px; max-width: calc(100% - 16px); padding: 3px 9px; font-size: .75rem; font-weight: 800; line-height: 1.25; letter-spacing: .08em; text-transform: uppercase;
  color: var(--ink); background: var(--gold); border: 2px solid var(--ink); border-radius: 3px; transform: rotate(-2deg);
}
.info { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.text { min-width: 0; }
.category { margin: 0 0 4px; font-size: .78rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--crimson-deep); }
h3 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 1.45rem; line-height: 1.1; letter-spacing: .02em; text-transform: uppercase; overflow-wrap: anywhere; }
.supplier { margin: 6px 0 0; font-weight: 600; color: #3b3a35; }
.price {
  flex: none; margin: 0; padding: 4px 12px; font-family: var(--font-display); font-size: 1.35rem; letter-spacing: .04em;
  color: var(--gold); background: var(--ink); border: 2px solid var(--gold-deep); border-radius: 999px;
}
details { border-top: 2px dashed #b9a97f; padding-top: 8px; }
summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; font-weight: 800; letter-spacing: .04em; }
.description { margin: 4px 0 10px; line-height: 1.5; }
dl { display: grid; gap: 4px; margin: 0; }
dl div { display: flex; justify-content: space-between; gap: 12px; }
dt { font-weight: 800; }
dd { margin: 0; text-align: right; }
.add {
  margin-top: auto; min-height: 48px; padding: 8px 16px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; font-size: .95rem;
  color: #fff; background: var(--crimson-deep); border: 3px solid var(--ink); border-radius: 4px; box-shadow: 0 4px 0 var(--ink);
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}
.add:hover:not(:disabled) { background: var(--crimson); }
.add:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
.add:disabled { cursor: not-allowed; color: #45505e; background: #c9bd9f; box-shadow: none; }
.card :focus-visible { outline-color: var(--crimson-deep); }
</style>
