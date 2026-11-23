<template>
  <nav class="app-navigation" aria-label="Main navigation">
    <span class="app-brand">ALBUM COLLECTION</span>
    <div>
      <button @click="cartOpen = !cartOpen">Cart ({{ cart.length }})</button>
      <button @click="isAdmin = !isAdmin">{{ isAdmin ? 'Logout' : 'Admin login' }}</button>
    </div>
  </nav>
  <div v-if="error" class="error" role="alert">{{ error }} <button @click="fetchAlbums">Try again</button></div>
  <p v-if="notice" class="notice" role="status">{{ notice }}</p>
  <section v-if="cartOpen" class="cart-panel">
    <h2>Cart</h2>
    <p v-if="!cart.length">Your cart is empty.</p>
    <div v-for="item in cart" :key="item.productId" class="cart-row">
      <span>{{ albums.find(album => album.id === item.productId)?.title }}</span>
      <label>Quantity <input type="number" min="1" :value="item.quantity" @change="changeQuantity(item.productId, $event)"></label>
      <button @click="updateCart(cart.filter(entry => entry.productId !== item.productId))">Remove</button>
    </div>
    <p>Total: ${{ (cartTotal / 100).toFixed(2) }}</p>
    <label>Sales location
      <select v-model="selectedLocation">
        <option v-for="location in sales?.locations" :key="location.id" :value="location.id">{{ location.name }}</option>
      </select>
    </label>
    <button :disabled="!cart.length || !sales" @click="completeOrder">Place demonstration order</button>
  </section>
  <AdminDataView v-if="isAdmin && sales" :data="sales" />
  <div v-else class="app">
    <header class="header">
      <h1>🎵 Album Collection</h1>
      <p>Discover amazing music albums</p>
      <p class="storage-note">Demo data is saved in this browser. No backend required.</p>
      <button @click="resetDemoData" class="retry-btn">Reset demo data</button>
    </header>

    <main class="main">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading albums...</p>
      </div>

      <p v-else-if="!error && albums.length === 0" class="empty">Your album collection is empty. Reset demo data to restore the sample albums.</p>

      <div v-else-if="!error" class="albums-grid">
        <AlbumCard
          v-for="album in albums"
          :key="album.id"
          :album="album"
          @add="addToCart"
        />
      </div>
    </main>
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
.cart-panel { background: white; margin: 1rem auto; padding: 1.5rem; border-radius: 15px; max-width: 1000px; }
.cart-row { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; margin: .5rem 0; }
.cart-row input { width: 7rem; }
.notice { color: white; text-align: center; }
.app-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 72px;
  box-sizing: border-box;
  padding: 14px 28px;
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.app-brand {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.app-navigation button {
  padding: 0.75rem 1.5rem;
  border: 2px solid white;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font: inherit;
  cursor: pointer;
}

.app-navigation button:hover { background: white; color: #764ba2; }
.app-navigation button:focus-visible { outline: 3px solid white; outline-offset: 3px; }

.app {
  min-height: 100vh;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
  color: white;
}

.header h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.header p {
  font-size: 1.2rem;
  opacity: 0.9;
}

.header .storage-note {
  font-size: 0.95rem;
}

.empty {
  color: white;
  text-align: center;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: white;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 4rem;
  color: white;
}

.error p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

.retry-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  padding: 0.75rem 2rem;
  border-radius: 25px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: white;
  color: #667eea;
}

.albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  padding: 1rem;
}

@media (max-width: 768px) {
  .app {
    padding: 1rem;
  }

  .header h1 {
    font-size: 2rem;
  }

  .albums-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>
