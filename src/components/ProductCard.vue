<script setup lang="ts">
import type { Product } from '../types/product'

const illustrationSrc = (path: string): string => `${import.meta.env.BASE_URL}${path}`

defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  add: [product: Product]
}>()
</script>

<template>
  <article class="product-card">
    <div class="product-art">
      <img
        :src="illustrationSrc(product.illustration)"
        :alt="product.imageAlt"
        loading="lazy"
      >
      <span class="status-stamp">{{ product.status }}</span>
    </div>
    <div class="product-copy">
      <p class="product-category">{{ product.category }}</p>
      <h3>{{ product.name }}</h3>
      <p class="product-supplier">{{ product.supplier }} · {{ product.origin }}</p>
      <p class="product-description">{{ product.description }}</p>
      <details>
        <summary>Fiche d’inventaire</summary>
        <dl>
          <div><dt>Origine</dt><dd>{{ product.origin }}</dd></div>
          <div><dt>Statut</dt><dd>{{ product.status }}</dd></div>
          <div><dt>Référencé depuis</dt><dd>{{ new Date(`${product.saleStartDate}T00:00:00Z`).toLocaleDateString('fr-FR') }}</dd></div>
        </dl>
      </details>
      <div class="product-footer">
        <p class="price">{{ (product.priceCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }}</p>
        <button
          type="button"
          class="add-button"
          :aria-label="`Ajouter ${product.name} au panier`"
          @click="emit('add', product)"
        >
          Ajouter au panier
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid #c8c0b1;
  background: #f5f0e5;
  box-shadow: 0 8px 18px #09111c55;
}

.product-art {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 205px;
  padding: 1rem;
  background:
    linear-gradient(135deg, transparent 48%, #b8873c22 49%, #b8873c22 50%, transparent 51%),
    #111c2a;
}

.product-art img {
  width: min(100%, 215px);
  height: 170px;
  object-fit: contain;
}

.status-stamp {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid #c49a52;
  background: #172433;
  color: #f1d49a;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.product-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 1.15rem;
}

.product-category {
  margin: 0 0 0.45rem;
  color: #7e2931;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h3 {
  margin: 0;
  color: #182332;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.25rem;
  line-height: 1.25;
}

.product-supplier {
  margin: 0.55rem 0;
  color: #48505a;
  font-size: 0.84rem;
}

.product-description {
  margin: 0 0 0.8rem;
  color: #303943;
  line-height: 1.5;
}

details {
  margin: 0 0 1rem;
  color: #333c47;
  font-size: 0.9rem;
}

summary {
  width: fit-content;
  cursor: pointer;
  color: #73323a;
  font-weight: 700;
}

dl {
  display: grid;
  gap: 0.3rem;
  margin: 0.6rem 0 0;
}

dl div {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
}

dt { font-weight: 700; }
dd { margin: 0; text-align: right; }

.product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 0.8rem;
  border-top: 1px solid #d5ccbd;
}

.price {
  margin: 0;
  color: #172638;
  font-size: 1.15rem;
  font-weight: 800;
  white-space: nowrap;
}

.add-button {
  min-height: 44px;
  padding: 0.65rem 0.85rem;
  border: 1px solid #7e2931;
  background: #7e2931;
  color: #fffaf0;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.add-button:hover:not(:disabled) { background: #612029; }
.add-button:disabled { border-color: #68717b; background: #68717b; cursor: not-allowed; }

@media (max-width: 440px) {
  .product-footer { align-items: stretch; flex-direction: column; }
  .add-button { width: 100%; }
}
</style>
