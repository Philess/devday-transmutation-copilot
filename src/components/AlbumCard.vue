<script setup lang="ts">
import type { Album } from '../types/album'

defineProps<{ album: Album }>()
defineEmits<{ add: [album: Album] }>()

const handleImageError = (event: Event): void => {
  const target = event.target
  const fallback = `${import.meta.env.BASE_URL}album-cover.svg`
  if (target instanceof HTMLImageElement && target.getAttribute('src') !== fallback) {
    target.src = fallback
  }
}
</script>

<template>
  <article class="album-card">
    <div class="album-art">
      <img :src="album.image_url" :alt="`Cover of ${album.title}`" @error="handleImageError" loading="lazy">
      <span class="album-stamp">Archive · {{ String(album.id).padStart(2, '0') }}</span>
    </div>
    <div class="album-copy">
      <p class="album-category">Album collection</p>
      <h3>{{ album.title }}</h3>
      <p class="album-artist">{{ album.artist }}</p>
      <div class="album-footer">
        <p class="price">${{ album.price.toFixed(2) }}</p>
        <button type="button" class="add-button" :aria-label="`Add ${album.title} to cart`" @click="$emit('add', album)">Add to cart</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.album-card { display: flex; flex-direction: column; min-width: 0; overflow: hidden; border: 1px solid #c8c0b1; background: #f5f0e5; box-shadow: 0 8px 18px #09111c55; }
.album-art { position: relative; display: grid; place-items: center; min-height: 225px; padding: 1rem; background: linear-gradient(135deg, transparent 48%, #b8873c22 49%, #b8873c22 50%, transparent 51%), #111c2a; }
.album-art img { width: min(100%, 190px); aspect-ratio: 1; object-fit: cover; box-shadow: 0 8px 20px #0007; }
.album-stamp { position: absolute; top: 0.75rem; right: 0.75rem; padding: 0.3rem 0.5rem; border: 1px solid #c49a52; background: #172433; color: #f1d49a; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; }
.album-copy { display: flex; flex: 1; flex-direction: column; padding: 1.15rem; }
.album-category { margin: 0 0 0.45rem; color: #7e2931; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
h3 { margin: 0; color: #182332; font-family: Georgia, 'Times New Roman', serif; font-size: 1.25rem; line-height: 1.25; overflow-wrap: anywhere; }
.album-artist { margin: 0.55rem 0 1.1rem; color: #48505a; font-size: 0.9rem; }
.album-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-top: auto; padding-top: 0.8rem; border-top: 1px solid #d5ccbd; }
.price { margin: 0; color: #172638; font-size: 1.15rem; font-weight: 800; white-space: nowrap; }
.add-button { min-height: 44px; padding: 0.65rem 0.85rem; border: 1px solid #7e2931; background: #7e2931; color: #fffaf0; font: inherit; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
.add-button:hover { background: #612029; }
@media (max-width: 440px) { .album-footer { align-items: stretch; flex-direction: column; } .add-button { width: 100%; } }
</style>
