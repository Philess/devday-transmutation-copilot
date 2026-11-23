<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Album } from './types/album'
import { loadAlbums, resetAlbums } from './services/albumStorage'
import { loadAlbumCart, saveAlbumCart, MAX_QUANTITY, type AlbumCartItem } from './services/albumCartStorage'
import { cartTotalCents, resolveCart, searchAlbums, sortAlbums, type AlbumSort } from './services/albumCatalog'
import AlbumCard from './components/AlbumCard.vue'
import CartDrawer from './components/CartDrawer.vue'
import CircleGlyph from './components/CircleGlyph.vue'
import HeroArt from './components/HeroArt.vue'

const markUrl = `${import.meta.env.BASE_URL}transmute-mark.svg`
const message = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown error')

const albums = ref<Album[]>([])
const albumsError = ref<string | null>(null)
const cart = ref<AlbumCartItem[]>([])
const cartReadError = ref<string | null>(null)
const cartWriteError = ref<string | null>(null)
const search = ref('')
const sort = ref<AlbumSort>('featured')
const drawerOpen = ref(false)
const receipt = ref<{ count: number, totalCents: number } | null>(null)
const toast = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
let toastTimer: number | undefined

const loadCatalog = (): void => {
  try {
    albums.value = loadAlbums()
    albumsError.value = null
  } catch (error) {
    albums.value = []
    albumsError.value = message(error)
  }
}

const loadCart = (): void => {
  try {
    cart.value = loadAlbumCart()
    cartReadError.value = null
  } catch (error) {
    cart.value = []
    cartReadError.value = message(error)
  }
}

const visible = computed(() => sortAlbums(searchAlbums(albums.value, search.value), sort.value))
const resolved = computed(() => resolveCart(cart.value, albums.value))
const lines = computed(() => resolved.value.lines)
const totalCents = computed(() => cartTotalCents(lines.value))
const cartCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))
const quantityOf = (albumId: number): number => cart.value.find(item => item.albumId === albumId)?.quantity ?? 0

const announce = (text: string): void => {
  toast.value = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = '' }, 3200)
}

// The cart only changes in memory once the browser has accepted the write.
const commitCart = (next: AlbumCartItem[]): boolean => {
  try {
    saveAlbumCart(next)
    cart.value = next
    cartWriteError.value = null
    return true
  } catch (error) {
    cartWriteError.value = `The cart could not be saved, so nothing changed (${message(error)}).`
    return false
  }
}

const addToCart = (album: Album): void => {
  if (cartReadError.value) return
  const current = quantityOf(album.id)
  if (current >= MAX_QUANTITY) return
  const next = current === 0
    ? [...cart.value, { albumId: album.id, quantity: 1 }]
    : cart.value.map(item => (item.albumId === album.id ? { ...item, quantity: item.quantity + 1 } : item))
  if (commitCart(next)) announce(`${album.title} added to cart.`)
}

const setQuantity = (albumId: number, quantity: number): void => {
  if (quantity < 1 || quantity > MAX_QUANTITY) return
  commitCart(cart.value.map(item => (item.albumId === albumId ? { ...item, quantity } : item)))
}

const removeItem = (albumId: number): void => { commitCart(cart.value.filter(item => item.albumId !== albumId)) }

const removeMissing = (): void => {
  const gone = new Set(resolved.value.missing)
  commitCart(cart.value.filter(item => !gone.has(item.albumId)))
}

const placeSampleOrder = (): void => {
  const summary = { count: cartCount.value, totalCents: totalCents.value }
  if (resolved.value.missing.length > 0 || summary.count === 0) return
  if (commitCart([])) receipt.value = summary
}

const closeDrawer = (): void => { drawerOpen.value = false; receipt.value = null }

const discardSavedCart = (): void => {
  if (!window.confirm('Discard the saved cart data that could not be read? This cannot be undone.')) return
  try {
    saveAlbumCart([])
    cartReadError.value = null
    cart.value = []
  } catch (error) {
    cartWriteError.value = `The unreadable cart could not be cleared (${message(error)}).`
  }
}

const replaceAlbums = (): void => {
  if (!window.confirm('Replace the saved album list with the demo albums? The data that could not be read will be overwritten.')) return
  try {
    albums.value = resetAlbums()
    albumsError.value = null
  } catch (error) {
    albumsError.value = message(error)
  }
}

const resetDemo = (): void => {
  if (!window.confirm('Reset the saved album list to the six demo albums? Any edits stored in this browser will be overwritten.')) return
  try {
    albums.value = resetAlbums()
    albumsError.value = null
    announce('Demo albums restored.')
  } catch (error) {
    albumsError.value = message(error)
  }
}

const onShortcut = (event: KeyboardEvent): void => {
  const target = event.target as HTMLElement | null
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || drawerOpen.value) return
  if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable)) return
  event.preventDefault()
  searchInput.value?.focus()
}

onMounted(() => {
  loadCatalog()
  loadCart()
  window.addEventListener('keydown', onShortcut)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onShortcut)
  window.clearTimeout(toastTimer)
})
</script>

<template>
  <div class="page">
    <svg class="watermark" viewBox="0 0 1000 1000" aria-hidden="true">
      <CircleGlyph :cx="500" :cy="500" :r="470" :n="6" :k="2" color="#7fe7ff" :width="2" :opacity="0.22" />
    </svg>

    <a class="skip" href="#shelf">Skip to albums</a>

    <header class="top">
      <a class="brand" href="#top" aria-label="TRANSMUTE Records, home">
        <img :src="markUrl" alt="" width="46" height="46">
        <span class="wordmark">TRANSMUTE<small>Records</small></span>
      </a>

      <form class="search" role="search" @submit.prevent>
        <label for="search" class="visually-hidden">Search albums by title, artist or price</label>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4" /><path d="M15 15L21 21" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" /></svg>
        <input id="search" ref="searchInput" v-model="search" type="search" autocomplete="off" placeholder="Search title, artist or price" :disabled="albumsError !== null">
        <kbd aria-hidden="true">/</kbd>
      </form>

      <button type="button" class="cart-btn" :aria-label="`Open cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`" @click="drawerOpen = true">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M2.5 4H5L7.2 15H18.5L20.5 7H6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /><circle cx="9" cy="19.5" r="1.8" fill="currentColor" /><circle cx="17" cy="19.5" r="1.8" fill="currentColor" /></svg>
        <span class="cart-label">Cart</span>
        <span class="badge" aria-hidden="true">{{ cartCount }}</span>
      </button>
    </header>

    <div v-if="cartReadError" class="banner" role="alert">
      <p><strong>Saved cart could not be read.</strong> Adding albums is paused so the saved data is not overwritten. {{ cartReadError }}.</p>
      <button type="button" @click="loadCart">Try again</button>
      <button type="button" @click="discardSavedCart">Discard saved cart</button>
    </div>
    <div v-if="cartWriteError" class="banner" role="alert">
      <p>{{ cartWriteError }}</p>
      <button type="button" @click="cartWriteError = null">Dismiss</button>
    </div>

    <main id="top" class="layout">
      <aside class="art" aria-label="Store mascot">
        <HeroArt />
        <p class="caption">Original artwork. Not based on any existing character.</p>
      </aside>

      <section class="content">
        <p class="kicker">Fictional demo store · local only</p>
        <h1>Sound,<br><span>rearranged.</span></h1>
        <p class="lede">Six demo albums, each with its own transmutation circle. Pick one, add it to the cart and run a sample order. Nothing is sold or shipped.</p>

        <div class="toolbar">
          <h2 id="shelf" tabindex="-1">The shelf</h2>
          <p class="count" role="status">{{ albumsError ? '' : `${visible.length} of ${albums.length} ${albums.length === 1 ? 'album' : 'albums'}` }}</p>
          <div class="sort">
            <label for="sort">Sort by</label>
            <select id="sort" v-model="sort" :disabled="albumsError !== null">
              <option value="featured">Featured</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
              <option value="title">Title</option>
              <option value="artist">Artist</option>
            </select>
          </div>
        </div>

        <div v-if="albumsError" class="state" role="alert">
          <h3>The saved albums could not be read</h3>
          <p>{{ albumsError }}. Your saved data was left untouched.</p>
          <div class="actions">
            <button type="button" class="solid" @click="loadCatalog">Try again</button>
            <button type="button" class="outline" @click="replaceAlbums">Replace with demo albums</button>
          </div>
        </div>
        <div v-else-if="albums.length === 0" class="state">
          <h3>No albums yet</h3>
          <p>The saved album list is empty. It was not reset.</p>
          <div class="actions"><button type="button" class="outline" @click="resetDemo">Restore demo albums</button></div>
        </div>
        <div v-else-if="visible.length === 0" class="state" role="status">
          <h3>No album matches “{{ search }}”</h3>
          <p>Try a title, an artist, or a price such as 12.99.</p>
          <div class="actions"><button type="button" class="solid" @click="search = ''; searchInput?.focus()">Clear search</button></div>
        </div>
        <ul v-else class="shelf" aria-labelledby="shelf">
          <li v-for="album in visible" :key="album.id">
            <AlbumCard :album="album" :in-cart="quantityOf(album.id)" :cart-paused="cartReadError !== null" @add="addToCart" />
          </li>
        </ul>
      </section>
    </main>

    <section class="steps" aria-labelledby="steps-title">
      <h2 id="steps-title">How the demo works</h2>
      <ol>
        <li><span>1</span><div><h3>Choose</h3><p>Search by title, artist or price, then sort the shelf.</p></div></li>
        <li><span>2</span><div><h3>Collect</h3><p>Your cart is saved in this browser only.</p></div></li>
        <li><span>3</span><div><h3>Sample order</h3><p>Clearly labelled demo. No payment, no shipping.</p></div></li>
      </ol>
    </section>

    <footer class="foot">
      <p>TRANSMUTE Records is a fictional demo. Albums, artists and prices are made up. All artwork is original and drawn in code.</p>
      <button type="button" @click="resetDemo">Reset demo albums</button>
    </footer>

    <p class="toast" role="status" aria-live="polite">{{ toast }}</p>

    <CartDrawer
      :open="drawerOpen"
      :lines="lines"
      :missing="resolved.missing"
      :total-cents="totalCents"
      :receipt="receipt"
      @close="closeDrawer"
      @set-quantity="setQuantity"
      @remove="removeItem"
      @remove-missing="removeMissing"
      @place-order="placeSampleOrder"
      @dismiss-receipt="closeDrawer"
    />
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; overflow-x: clip; }
.watermark { position: fixed; top: 60px; right: -260px; width: 900px; height: 900px; pointer-events: none; z-index: 0; animation: spin 240s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.page > *:not(.watermark) { position: relative; z-index: 1; }
.skip { position: absolute; left: 12px; top: -60px; z-index: 100; padding: 10px 16px; font-weight: 800; color: var(--ink); background: var(--gold); border-radius: 4px; }
.skip:focus { top: 12px; }

.top {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 20px; max-width: 1480px; margin: 0 auto; padding: 14px 32px;
}
.brand { display: flex; align-items: center; gap: 12px; color: var(--text); text-decoration: none; }
.wordmark { display: flex; flex-direction: column; font-family: var(--font-display); font-size: 1.7rem; line-height: .95; letter-spacing: .06em; }
.wordmark small { margin-top: 3px; font-family: var(--font-body); font-size: .72rem; font-weight: 800; letter-spacing: .42em; text-transform: uppercase; color: var(--gold); }
.search { position: relative; display: flex; align-items: center; max-width: 560px; justify-self: center; width: 100%; color: var(--muted); }
.search svg { position: absolute; left: 14px; pointer-events: none; }
.search input {
  width: 100%; min-height: 50px; padding: 8px 46px 8px 46px; color: var(--text); background: var(--steel); border: 2px solid var(--steel-3); border-radius: 999px;
}
.search input::placeholder { color: var(--muted); }
.search input:hover:not(:disabled) { border-color: var(--gold-deep); }
.search input:disabled { opacity: .5; cursor: not-allowed; }
.search kbd { position: absolute; right: 14px; display: grid; place-items: center; width: 26px; height: 26px; font-size: .85rem; font-weight: 800; color: var(--gold); border: 1.5px solid var(--steel-3); border-radius: 5px; }
.cart-btn {
  position: relative; display: inline-flex; align-items: center; gap: 10px; min-height: 50px; padding: 6px 20px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
  color: var(--ink); background: var(--gold); border: 3px solid var(--ink); border-radius: 4px; box-shadow: 0 4px 0 var(--gold-deep), 0 0 0 2px var(--ink);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.cart-btn:hover { transform: translateY(-1px); }
.cart-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--gold-deep), 0 0 0 2px var(--ink); }
.badge { display: grid; place-items: center; min-width: 28px; height: 28px; padding: 0 7px; font-family: var(--font-display); font-size: 1rem; letter-spacing: .03em; color: #fff; background: var(--crimson-deep); border: 2px solid var(--ink); border-radius: 999px; }

.banner { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; max-width: 1416px; margin: 0 auto 12px; padding: 12px 18px; color: var(--ink); background: var(--parchment); border: 3px solid var(--crimson); border-radius: 4px; }
.banner p { flex: 1 1 320px; margin: 0; }
.banner button { min-height: 44px; padding: 6px 14px; font-weight: 800; color: var(--ink); background: transparent; border: 2px solid var(--ink); border-radius: 4px; }
.banner button:hover { background: var(--parchment-2); }
.banner :focus-visible { outline-color: var(--crimson-deep); }

.layout { display: grid; grid-template-columns: minmax(300px, 420px) minmax(0, 1fr); gap: 44px; max-width: 1480px; margin: 0 auto; padding: 14px 32px 48px; align-items: start; }
.art { position: sticky; top: 14px; }
.art :deep(.hero-art) { filter: drop-shadow(0 18px 30px rgba(0, 0, 0, .5)); }
.caption { margin: 10px 0 0; font-size: .85rem; color: var(--muted); }

.kicker { margin: 0 0 8px; font-size: .85rem; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; color: var(--spark); }
h1 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: clamp(3rem, 6vw, 5.2rem); line-height: .92; letter-spacing: .015em; text-transform: uppercase; }
h1 span { color: var(--gold); text-shadow: 4px 4px 0 var(--crimson-deep); }
.lede { max-width: 56ch; margin: 12px 0 16px; font-size: 1.1rem; color: var(--muted); }

.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; margin-bottom: 18px; padding: 10px 0; border-block: 2px solid var(--steel-3); }
.toolbar h2 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 1.9rem; letter-spacing: .05em; text-transform: uppercase; color: var(--gold); }
.toolbar h2:focus { outline: none; }
.count { margin: 0; flex: 1; color: var(--muted); font-weight: 600; }
.sort { display: flex; align-items: center; gap: 10px; font-weight: 600; }
.sort select { min-height: 46px; padding: 6px 12px; color: var(--text); background: var(--steel); border: 2px solid var(--steel-3); border-radius: 4px; }
.sort select:hover:not(:disabled) { border-color: var(--gold-deep); }

.shelf { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin: 0; padding: 0; list-style: none; }

.state { padding: 28px; color: var(--ink); background: var(--parchment); border: 3px solid var(--ink); border-radius: 6px; box-shadow: 0 0 0 2px var(--gold-deep); }
.state h3 { margin: 0 0 6px; font-family: var(--font-display); font-weight: 400; font-size: 1.8rem; letter-spacing: .03em; text-transform: uppercase; }
.state p { margin: 0 0 16px; font-weight: 600; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; }
.actions button { min-height: 48px; padding: 8px 18px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; border: 3px solid var(--ink); border-radius: 4px; }
.actions .solid { color: #fff; background: var(--crimson-deep); }
.actions .outline { color: var(--ink); background: transparent; }
.state :focus-visible { outline-color: var(--crimson-deep); }

.steps { max-width: 1416px; margin: 0 auto; padding: 28px 32px; border-top: 2px solid var(--steel-3); }
.steps h2 { margin: 0 0 16px; font-family: var(--font-display); font-weight: 400; font-size: 1.6rem; letter-spacing: .05em; text-transform: uppercase; color: var(--gold); }
.steps ol { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin: 0; padding: 0; list-style: none; }
.steps li { display: flex; gap: 14px; padding: 16px; background: var(--steel); border: 2px solid var(--steel-3); border-radius: 4px; }
.steps li > span { flex: none; display: grid; place-items: center; width: 44px; height: 44px; font-family: var(--font-display); font-size: 1.4rem; color: var(--gold); border: 2px solid var(--gold); border-radius: 50%; outline: 2px dashed var(--gold-deep); outline-offset: 3px; }
.steps h3 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 1.25rem; letter-spacing: .04em; text-transform: uppercase; }
.steps p { margin: 2px 0 0; color: var(--muted); }

.foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px 24px; max-width: 1416px; margin: 0 auto; padding: 20px 32px 40px; color: var(--muted); border-top: 2px solid var(--steel-3); }
.foot p { margin: 0; max-width: 70ch; font-size: .95rem; }
.foot button { min-height: 44px; padding: 6px 16px; font-weight: 800; color: var(--text); background: transparent; border: 2px solid var(--steel-3); border-radius: 4px; }
.foot button:hover { border-color: var(--gold); }

.toast { position: fixed; left: 50%; bottom: 24px; z-index: 40; margin: 0; padding: 10px 20px; font-weight: 800; color: var(--ink); background: var(--gold); border: 3px solid var(--ink); border-radius: 4px; transform: translateX(-50%); }
.toast:empty { display: none; }

@media (max-width: 1180px) {
  .layout { grid-template-columns: minmax(240px, 320px) minmax(0, 1fr); gap: 28px; }
  .shelf { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .top { grid-template-columns: 1fr auto; padding: 12px 18px; }
  .search { grid-column: 1 / -1; grid-row: 2; max-width: none; }
  .layout { grid-template-columns: 1fr; padding: 10px 18px 36px; }
  .art { position: static; max-width: 230px; margin: 0 auto; }
  .caption { text-align: center; }
  .steps, .foot { padding-inline: 18px; }
  .steps ol { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .shelf { grid-template-columns: 1fr; }
  .wordmark { font-size: 1.4rem; }
  .cart-label { display: none; }
  .cart-btn { padding-inline: 14px; }
  .sort { width: 100%; }
  .sort select { flex: 1; }
}
</style>
