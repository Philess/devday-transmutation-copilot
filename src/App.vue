<template>
  <div class="site-shell">
    <nav class="topbar" aria-label="Main navigation">
      <a class="wordmark" href="#" @click.prevent="isAdmin = false">
        <span class="seal" aria-hidden="true">CA</span>
        <span><strong>Central Alchemy Records</strong><small>THE ART OF SOUND · AMESTRIS</small></span>
      </a>
      <div class="nav-actions">
        <button type="button" class="nav-link" @click="isAdmin = !isAdmin">{{ isAdmin ? 'Back to the shop' : 'Admin login' }}</button>
        <button type="button" class="cart-button" aria-controls="cart-panel" :aria-expanded="cartOpen" @click="cartOpen = !cartOpen">
          Cart <span>{{ cart.length }}</span>
        </button>
      </div>
    </nav>

    <div v-if="error && !cartOpen" class="alert" role="alert">
      <p>{{ error }}</p><button type="button" @click="fetchAlbums">Try again</button>
    </div>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <div v-if="loading" class="loading" role="status">Opening the local collection…</div>
    <AdminDataView v-else-if="isAdmin && sales" :data="sales" />
    <main v-else>
      <header class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Central music archives · A collection for curious minds</p>
          <h1>Discover the<br><span>alchemy of sound.</span></h1>
          <p class="hero-subtitle">A collection of fictional albums, made for the moments that transform the everyday.</p>
          <a class="hero-link" href="#catalogue">Explore the collection <span aria-hidden="true">↓</span></a>
        </div>
        <div class="transmutation-mark" aria-hidden="true">
          <svg viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="95" />
            <circle cx="120" cy="120" r="69" />
            <path d="M120 25v190M25 120h190M53 53l134 134M187 53 53 187M120 51l37 69-37 69-37-69z" />
            <circle cx="120" cy="120" r="11" />
          </svg>
          <span>Sound<br>transformed</span>
        </div>
        <div class="hero-index">CAR / 24—25 <i></i> LOCAL COLLECTION</div>
      </header>

      <section id="catalogue" class="catalogue" aria-labelledby="catalogue-title">
        <div class="catalogue-heading">
          <div><p class="eyebrow">The music archive</p><h2 id="catalogue-title">Albums in the collection</h2></div>
          <p class="catalogue-caption">Fictional releases · Prices in USD</p>
        </div>
        <div class="filters">
          <label class="search-field">
            <span>Search the collection</span>
            <input v-model="search" type="search" placeholder="Album title or artist" autocomplete="off">
          </label>
        </div>
        <p class="results-note" aria-live="polite">{{ filteredAlbums.length }} {{ filteredAlbums.length === 1 ? 'album' : 'albums' }} shown</p>
        <p v-if="!error && albums.length === 0" class="empty-state">Your album collection is empty. Reset the collection to restore the sample albums.</p>
        <p v-else-if="!error && filteredAlbums.length === 0" class="empty-state">No albums match this search.</p>
        <div v-else-if="!error" class="albums-grid">
          <AlbumCard v-for="album in filteredAlbums" :key="album.id" :album="album" @add="addToCart" />
        </div>
      </section>
    </main>

    <aside v-if="cartOpen" id="cart-panel" class="cart-panel" aria-labelledby="cart-title">
      <div class="cart-heading">
        <div><p class="eyebrow">Local selection</p><h2 id="cart-title">Your cart</h2></div>
        <button type="button" class="close-button" aria-label="Close cart" @click="cartOpen = false">×</button>
      </div>
      <p class="cart-disclaimer">A local demonstration only. No payment or address is required.</p>
      <div v-if="error" class="cart-error" role="alert">
        <p>{{ error }}</p><button type="button" @click="fetchAlbums">Try again</button>
      </div>
      <p v-if="!cart.length" class="cart-empty">Your cart is empty.</p>
      <ul v-else class="cart-list">
        <li v-for="item in cart" :key="item.productId">
          <div class="cart-product">
            <strong>{{ albums.find(album => album.id === item.productId)?.title }}</strong>
            <span>{{ albums.find(album => album.id === item.productId)?.artist }}</span>
          </div>
          <label class="quantity-field">
            <span>Quantity</span>
            <input type="number" min="1" :value="item.quantity" :aria-label="`Quantity for ${albums.find(album => album.id === item.productId)?.title}`" @change="changeQuantity(item.productId, $event)">
          </label>
          <button type="button" class="remove-button" :aria-label="`Remove ${albums.find(album => album.id === item.productId)?.title} from cart`" @click="updateCart(cart.filter(entry => entry.productId !== item.productId))">Remove</button>
        </li>
      </ul>
      <div class="checkout">
        <p class="order-total"><span>Order total</span><strong>${{ (cartTotal / 100).toFixed(2) }}</strong></p>
        <label for="location">Sales location</label>
        <select id="location" v-model="selectedLocation">
          <option v-for="location in sales?.locations" :key="location.id" :value="location.id">{{ location.name }}</option>
        </select>
        <button type="button" class="checkout-button" :disabled="!cart.length || !sales" @click="completeOrder">Place demonstration order</button>
        <small>The cart and order are saved only in this browser.</small>
      </div>
    </aside>

    <footer class="site-footer">
      <span>Central Alchemy Records</span>
      <span>Fictional albums · Local demonstration · Prices in USD</span>
      <button type="button" @click="resetDemoData">Reset album collection</button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import AlbumCard from './components/AlbumCard.vue'
import AdminDataView from './components/AdminDataView.vue'
import type { Album } from './types/album'
import { loadProducts, resetProducts } from './services/productStorage'
import { loadCart, saveCart, type CartItem } from './services/cartStorage'
import { loadSalesDataset, saveSalesDataset } from './services/salesStorage'
import { orderTotalCents } from './services/money'
import type { SalesDataset } from './types/sales'

const albums = ref<Album[]>([])
const isAdmin = ref(false)
const loading = ref<boolean>(true)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const sales = ref<SalesDataset | null>(null)
const cart = ref<CartItem[]>([])
const cartOpen = ref(false)
const selectedLocation = ref('online')
const search = ref('')
const filteredAlbums = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return albums.value.filter(album => `${album.title} ${album.artist}`.toLocaleLowerCase().includes(query))
})
const cartTotal = computed(() => orderTotalCents(cart.value.map(item => ({
  quantity: item.quantity,
  unitPriceCents: Math.round((albums.value.find(album => album.id === item.productId)?.price ?? 0) * 100)
}))))

const readCollection = (read: () => Album[]): void => {
  try {
    loading.value = true
    error.value = null
    albums.value = read()
  } catch (err) {
    error.value = `Unable to access the saved collection: ${err instanceof Error ? err.message : String(err)}. Allow local storage and try again, or reset demo data if the saved collection is invalid.`
    console.error('Error accessing album storage:', err)
  } finally {
    loading.value = false
  }
}

const fetchAlbums = (): void => readCollection(() => {
  const savedAlbums = loadProducts()
  const savedSales = loadSalesDataset()
  const savedCart = loadCart(savedAlbums)
  sales.value = savedSales
  cart.value = savedCart
  selectedLocation.value = savedSales.locations.find(location => location.channel === 'online')?.id ?? ''
  return savedAlbums
})

const resetDemoData = (): void => {
  if (window.confirm('Replace the saved album collection with the original demo data?')) {
    readCollection(() => {
      const restored = resetProducts()
      cart.value = loadCart(restored)
      return restored
    })
  }
}

const updateCart = (next: CartItem[]): void => {
  try {
    saveCart(next, albums.value)
    cart.value = next
    error.value = null
  } catch (reason) {
    error.value = `Unable to save the cart: ${reason instanceof Error ? reason.message : String(reason)}`
    console.error('Error saving cart:', reason)
  }
}

const addToCart = (album: Album): void => {
  const existing = cart.value.find(item => item.productId === album.id)
  updateCart(existing
    ? cart.value.map(item => item.productId === album.id ? { ...item, quantity: item.quantity + 1 } : item)
    : [...cart.value, { productId: album.id, quantity: 1 }])
}

const changeQuantity = (id: number, event: Event): void => {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  updateCart(cart.value.map(item => item.productId === id ? { ...item, quantity: Number(input.value) } : item))
}

const completeOrder = (): void => {
  if (!sales.value || cart.value.length === 0) return
  try {
    const data = sales.value
    const location = data.locations.find(item => item.id === selectedLocation.value)
    const home = location?.channel === 'store' ? location : data.locations.find(item => item.channel === 'store')
    if (!location || !home) throw new Error('A valid sales location is required')
    const date = new Date().toISOString().slice(0, 10)
    const id = `LOCAL-${crypto.randomUUID()}`
    const customerId = `LOCAL-${crypto.randomUUID()}`
    const lines = cart.value.map(item => {
      const album = albums.value.find(candidate => candidate.id === item.productId)
      if (!album) throw new Error('Cart contains an album missing from the catalog')
      return { product: { id: album.id, title: album.title, artist: album.artist }, quantity: item.quantity, unitPriceCents: Math.round(album.price * 100) }
    })
    orderTotalCents(lines)
    const next: SalesDataset = {
      ...data,
      metadata: { ...data.metadata, startDate: date < data.metadata.startDate ? date : data.metadata.startDate, endDate: date > data.metadata.endDate ? date : data.metadata.endDate },
      customers: [...data.customers, { id: customerId, region: home.region, homeStoreId: home.id, joinedOn: date, preferredGenre: '', preferredChannel: location.channel }],
      orders: [...data.orders, { id, date, customerId, locationId: location.id, eventIds: data.events.filter(event => event.startDate <= date && event.endDate >= date).map(event => event.id), lines }]
    }
    saveSalesDataset(next)
    sales.value = next
    try {
      saveCart([], albums.value)
      cart.value = []
      error.value = null
    } catch (reason) {
      error.value = `Order saved, but the cart could not be cleared: ${reason instanceof Error ? reason.message : String(reason)}`
      console.error('Error clearing cart:', reason)
    }
    notice.value = `Demonstration order ${id} saved. No payment was made.`
  } catch (reason) {
    error.value = `Unable to save the order: ${reason instanceof Error ? reason.message : String(reason)}`
    console.error('Error saving order:', reason)
  }
}

onMounted(() => {
  fetchAlbums()
})
</script>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(html) { scroll-behavior: smooth; }
:global(body) { margin: 0; min-width: 320px; background: #101923; font-family: 'Segoe UI', Arial, sans-serif; color: #e9e4d9; }
:global(button), :global(input), :global(select) { font: inherit; }
:global(:focus-visible) { outline: 3px solid #edc36e; outline-offset: 3px; }
.site-shell { min-height: 100vh; background: radial-gradient(ellipse at 50% 0, #26384b 0, #121c28 56rem, #101923 100%); }
.topbar { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; min-height: 82px; padding: 0.8rem clamp(1rem, 5vw, 4.5rem); border-bottom: 1px solid #d5b66e66; background: #101923e8; }
.wordmark { display: flex; align-items: center; gap: 0.8rem; color: #f2eadc; text-decoration: none; }
.wordmark strong { display: block; font-family: Georgia, 'Times New Roman', serif; font-size: 1.05rem; letter-spacing: 0.04em; }
.wordmark small { display: block; margin-top: 0.2rem; color: #c1a669; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.17em; }
.seal { display: grid; width: 42px; height: 42px; flex: 0 0 auto; place-items: center; border: 1px solid #c49a52; border-radius: 50%; color: #e6c77e; font-family: Georgia, serif; font-size: 0.85rem; }
.nav-actions { display: flex; align-items: center; gap: 0.7rem; }
.nav-link, .cart-button { min-height: 44px; padding: 0.6rem 0.9rem; border: 1px solid #9c8b67; background: transparent; color: #efe7d9; cursor: pointer; }
.nav-link:hover { background: #26384b; }
.cart-button { border-color: #9c3d43; background: #7e2931; font-weight: 700; }
.cart-button span { display: inline-grid; min-width: 1.45rem; height: 1.45rem; margin-left: 0.35rem; place-items: center; border-radius: 50%; background: #f3e7c9; color: #39232b; font-size: 0.8rem; }
.alert, .notice { margin: 0; padding: 0.8rem 1rem; text-align: center; line-height: 1.5; }
.alert, .cart-error { background: #7e2931; color: white; }
.alert p { display: inline; margin: 0 0.8rem 0 0; }
.alert button, .cart-error button { min-height: 40px; padding: 0.4rem 0.75rem; border: 1px solid white; background: transparent; color: white; cursor: pointer; }
.notice { background: #334c3c; color: #f3f1e7; }
.loading { padding: 5rem 1rem; text-align: center; }
.hero { position: relative; display: flex; align-items: center; justify-content: space-between; max-width: 1440px; min-height: 490px; margin: auto; padding: 4.5rem clamp(1.25rem, 9vw, 8rem) 5rem; overflow: hidden; border-bottom: 1px solid #c49a5266; background: linear-gradient(90deg, #121c28 0%, #121c28f2 42%, #121c28aa 100%); }
.hero::before, .hero::after { position: absolute; width: 26rem; height: 26rem; border: 1px solid #c49a5224; border-radius: 50%; content: ''; pointer-events: none; }
.hero::before { top: -19rem; left: 36%; }
.hero::after { right: -15rem; bottom: -19rem; }
.hero-copy { position: relative; z-index: 1; max-width: 650px; }
.eyebrow { margin: 0 0 1rem; color: #d3b36c; font-size: 0.74rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
h1, h2 { font-family: Georgia, 'Times New Roman', serif; }
.hero h1 { margin: 0; color: #f5efe4; font-size: clamp(2.8rem, 7vw, 5.6rem); font-weight: 500; line-height: 0.98; }
.hero h1 span { color: #d7b66f; }
.hero-subtitle { max-width: 560px; margin: 1.4rem 0 1.8rem; color: #d1d5d9; font-size: 1.1rem; line-height: 1.65; }
.hero-link { display: inline-flex; align-items: center; gap: 0.8rem; min-height: 46px; padding: 0.65rem 1rem; border: 1px solid #bd984f; color: #f2d896; font-weight: 700; text-decoration: none; }
.hero-link:hover { background: #bd984f22; }
.transmutation-mark { position: relative; display: grid; width: min(33vw, 300px); aspect-ratio: 1; flex: 0 0 auto; place-items: center; margin-left: 2rem; color: #d9b36b; }
.transmutation-mark svg { width: 100%; fill: none; stroke: #c49a5280; stroke-width: 1.4; }
.transmutation-mark span { position: absolute; color: #ead9ae; font-family: Georgia, serif; font-size: 1.1rem; line-height: 1.4; text-align: center; text-transform: uppercase; }
.hero-index { position: absolute; right: clamp(1rem, 5vw, 4rem); bottom: 1.3rem; display: flex; align-items: center; gap: 0.6rem; color: #9faab4; font-size: 0.66rem; letter-spacing: 0.14em; }
.hero-index i { width: 0.35rem; height: 0.35rem; border-radius: 50%; background: #9a3a40; }
.catalogue { max-width: 1440px; margin: auto; padding: 3.5rem clamp(1rem, 5vw, 4.5rem) 5rem; }
.catalogue-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
.catalogue-heading h2 { margin: 0; color: #f1e9db; font-size: clamp(2rem, 4vw, 3rem); font-weight: 500; }
.catalogue-caption { color: #b7c0c6; font-size: 0.85rem; }
.filters { margin: 2rem 0 1rem; padding: 1.2rem; border: 1px solid #c9a95e55; background: #182534; }
.search-field span, .quantity-field span { display: block; margin-bottom: 0.4rem; color: #e8dfcb; font-size: 0.83rem; font-weight: 700; }
.search-field input, .quantity-field input, .checkout select { width: 100%; min-height: 46px; padding: 0.65rem 0.8rem; border: 1px solid #9098a0; border-radius: 0; background: #f9f5eb; color: #162231; }
.results-note { color: #c0c7ca; font-size: 0.86rem; }
.albums-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 285px), 1fr)); gap: 1.1rem; margin-top: 1rem; }
.empty-state { padding: 1.5rem; border: 1px solid #6d7882; background: #1a2836; color: #e4dccf; }
.cart-panel { position: fixed; z-index: 5; top: 0; right: 0; display: flex; width: min(100%, 440px); height: 100vh; height: 100dvh; flex-direction: column; overflow-y: auto; padding: 1.2rem; border-left: 1px solid #c49a52; background: #f5f0e5; color: #172332; box-shadow: -15px 0 45px #0008; }
.cart-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.cart-heading .eyebrow { margin-bottom: 0.3rem; color: #7e2931; }
.cart-heading h2 { margin: 0; font-size: 2rem; }
.close-button { width: 44px; height: 44px; border: 1px solid #68717b; background: transparent; color: #172332; font-size: 1.6rem; cursor: pointer; }
.cart-disclaimer { padding: 0.75rem; background: #e8dfd1; font-size: 0.88rem; line-height: 1.45; }
.cart-error { padding: 0.75rem; line-height: 1.45; }
.cart-error p { margin-top: 0; }
.cart-list { display: grid; gap: 0.8rem; margin: 0; padding: 0; list-style: none; }
.cart-list li { display: grid; grid-template-columns: 1fr 90px auto; align-items: end; gap: 0.55rem; padding: 0.8rem 0; border-bottom: 1px solid #d2cabb; }
.cart-product strong, .cart-product span { display: block; overflow-wrap: anywhere; }
.cart-product strong { line-height: 1.35; }
.cart-product span { margin-top: 0.3rem; color: #515c66; font-size: 0.85rem; }
.quantity-field input { min-height: 40px; padding: 0.4rem; }
.quantity-field span { color: #384551; font-size: 0.72rem; }
.remove-button { min-height: 40px; padding: 0.4rem; border: 0; background: transparent; color: #762932; font-size: 0.8rem; text-decoration: underline; cursor: pointer; }
.checkout { display: grid; gap: 0.7rem; margin-top: auto; padding-top: 1.2rem; }
.order-total { display: flex; justify-content: space-between; gap: 1rem; margin: 0; padding: 0.9rem 0; border-top: 2px solid #293849; font-size: 1.05rem; }
.checkout label { font-weight: 700; }
.checkout-button { min-height: 48px; padding: 0.7rem; border: 1px solid #7e2931; background: #7e2931; color: white; font-weight: 800; cursor: pointer; }
.checkout-button:hover:not(:disabled) { background: #612029; }
.checkout-button:disabled { opacity: 0.55; cursor: not-allowed; }
.checkout small { color: #4a555f; line-height: 1.4; }
.site-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.4rem clamp(1rem, 5vw, 4.5rem); border-top: 1px solid #c49a5255; background: #0c141d; color: #bac0c4; font-size: 0.78rem; }
.site-footer span:first-child { color: #e2c47e; font-family: Georgia, serif; font-size: 0.98rem; }
.site-footer button { min-height: 40px; padding: 0.5rem 0.7rem; border: 1px solid #75808a; background: transparent; color: #d7dce0; cursor: pointer; }
.site-footer button:hover { background: #27394b; }
@media (max-width: 720px) {
  .topbar { align-items: flex-start; flex-direction: column; }
  .nav-actions { width: 100%; }
  .nav-link { flex: 1; }
  .hero { min-height: 440px; padding: 3rem 1.3rem 4rem; }
  .transmutation-mark { position: absolute; right: -4rem; bottom: 1rem; width: 230px; opacity: 0.38; }
  .hero-copy { max-width: 90%; }
  .hero-subtitle { font-size: 1rem; }
  .catalogue-heading { align-items: flex-start; flex-direction: column; }
  .catalogue-caption { margin: 0; }
  .site-footer { align-items: flex-start; flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) { :global(html) { scroll-behavior: auto; } }
</style>
