<script setup lang="ts">
import { computed } from 'vue'
import type { Album } from '../types/album'
import { formatCents, priceCents } from '../services/albumCatalog'
import { MAX_QUANTITY } from '../services/albumCartStorage'
import CoverArt from './CoverArt.vue'

const props = defineProps<{ album: Album, inCart: number, cartPaused: boolean }>()
const emit = defineEmits<{ add: [album: Album] }>()

const price = computed(() => formatCents(priceCents(props.album)))
const atLimit = computed(() => props.inCart >= MAX_QUANTITY)
</script>

<template>
  <article class="card" :aria-labelledby="`album-${album.id}-title`">
    <div class="cover">
      <CoverArt :id="album.id" :title="album.title" :artist="album.artist" />
    </div>
    <div class="info">
      <div class="text">
        <h3 :id="`album-${album.id}-title`">{{ album.title }}</h3>
        <p class="artist">{{ album.artist }}</p>
      </div>
      <p class="price"><span class="visually-hidden">Price </span>{{ price }}</p>
    </div>
    <button
      type="button"
      class="add"
      :disabled="cartPaused || atLimit"
      :aria-label="`Add ${album.title} by ${album.artist} to cart, ${price}`"
      @click="emit('add', album)"
    >
      <span aria-hidden="true">{{ atLimit ? `Limit of ${MAX_QUANTITY} reached` : cartPaused ? 'Cart paused' : inCart > 0 ? `Add another · ${inCart} in cart` : 'Add to cart' }}</span>
    </button>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 14px 16px;
  color: var(--ink);
  background: linear-gradient(160deg, var(--parchment), var(--parchment-2));
  border: 3px solid var(--ink);
  border-radius: 6px;
  box-shadow: 0 0 0 2px var(--gold-deep), 0 14px 28px rgba(0, 0, 0, .45);
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.card::before, .card::after {
  content: '';
  position: absolute; top: 6px; width: 8px; height: 8px; border-radius: 50%;
  background: var(--gold); border: 2px solid var(--ink); z-index: 2;
}
.card::before { left: 6px; }
.card::after { right: 6px; }
.card:hover, .card:focus-within { transform: translateY(-4px); box-shadow: 0 0 0 2px var(--gold), 0 20px 34px rgba(0, 0, 0, .5); }
.cover { border: 3px solid var(--ink); border-radius: 3px; overflow: hidden; background: var(--ink); line-height: 0; }
.info { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.text { min-width: 0; }
h3 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 1.5rem; line-height: 1.1; letter-spacing: .02em; text-transform: uppercase; }
.artist { margin: 4px 0 0; font-weight: 600; color: #3b3a35; }
.price {
  flex: none; margin: 0; padding: 4px 12px; font-family: var(--font-display); font-size: 1.35rem; letter-spacing: .04em;
  color: var(--gold); background: var(--ink); border: 2px solid var(--gold-deep); border-radius: 999px;
}
.add {
  min-height: 48px; padding: 8px 16px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; font-size: .95rem;
  color: #fff; background: var(--crimson-deep); border: 3px solid var(--ink); border-radius: 4px;
  box-shadow: 0 4px 0 var(--ink); transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}
.add:hover:not(:disabled) { background: var(--crimson); }
.add:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
.add:disabled { cursor: not-allowed; color: #45505e; background: #c9bd9f; box-shadow: none; }
.card :focus-visible { outline-color: var(--crimson-deep); }
</style>
