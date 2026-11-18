<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ProductCard from './components/ProductCard.vue'
import WorkshopDataView from './components/WorkshopDataView.vue'
import type { CartItem } from './services/cartStorage'
import { loadCart, saveCart } from './services/cartStorage'
import { loadProducts, resetProducts } from './services/productStorage'
import { filterProducts } from './services/productSearch'
import { orderTotalCents } from './services/money'
import { loadSalesDataset, resetSalesDataset, saveSalesDataset } from './services/salesStorage'
import type { Product } from './types/product'
import type { SalesDataset, SalesOrder } from './types/sales'

const products = ref<Product[]>([])
const sales = ref<SalesDataset | null>(null)
const cart = ref<CartItem[]>([])
const selectedCategory = ref('all')
const search = ref('')
const activeView = ref<'shop' | 'data'>('shop')
const cartOpen = ref(false)
const selectedLocationId = ref('online')
const loading = ref(true)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const categories = computed(() => [...new Set(products.value.map(product => product.category))])
const filteredProducts = computed(() => filterProducts(products.value, search.value, selectedCategory.value))
const cartCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))
const cartEntries = computed(() => cart.value.map(item => ({
  ...item,
  product: products.value.find(product => product.id === item.productId)
})).filter(entry => entry.product))
const cartTotalCents = computed(() => orderTotalCents(cartEntries.value.map(entry => ({
  quantity: entry.quantity,
  unitPriceCents: entry.product!.priceCents
}))))
const physicalLocations = computed(() => sales.value?.locations.filter(location => location.channel === 'store') ?? [])
const formatUSD = (cents: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

const showError = (context: string, reason: unknown): void => {
  const detail = reason instanceof Error ? reason.message : String(reason)
  console.error(`${context}:`, reason)
  error.value = `${context} ${detail}`
}

const cartLines = (items: CartItem[], catalog: Product[]) => items.map(item => {
  const product = catalog.find(candidate => candidate.id === item.productId)
  if (!product) throw new Error('Le panier enregistré contient un produit absent du catalogue.')
  return { quantity: item.quantity, unitPriceCents: product.priceCents }
})

const loadShop = (): void => {
  loading.value = true
  error.value = null
  notice.value = null
  try {
    const savedProducts = loadProducts()
    const savedSales = loadSalesDataset()
    const savedCart = loadCart()
    orderTotalCents(cartLines(savedCart, savedProducts))
    products.value = savedProducts
    sales.value = savedSales
    cart.value = savedCart
    if (!savedSales.locations.some(location => location.id === selectedLocationId.value)) {
      selectedLocationId.value = savedSales.locations[0]?.id ?? ''
    }
  } catch (reason) {
    showError('Impossible de lire ou valider les données locales.', reason)
  } finally {
    loading.value = false
  }
}

const persistCart = (nextCart: CartItem[]): boolean => {
  try {
    orderTotalCents(cartLines(nextCart, products.value))
    saveCart(nextCart)
    cart.value = nextCart
    error.value = null
    return true
  } catch (reason) {
    showError('Impossible d’enregistrer le panier dans ce navigateur.', reason)
    return false
  }
}

const addToCart = (product: Product): void => {
  const existing = cart.value.find(item => item.productId === product.id)
  const next = existing
    ? cart.value.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item)
    : [...cart.value, { productId: product.id, quantity: 1 }]
  if (persistCart(next)) notice.value = `${product.name} ajouté au panier.`
}

const changeQuantity = (productId: number, event: Event): void => {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  const quantity = Number(input.value)
  const product = products.value.find(item => item.id === productId)
  if (!product || !Number.isSafeInteger(quantity) || quantity < 1) {
    error.value = 'La quantité doit être un nombre entier positif.'
    return
  }
  persistCart(cart.value.map(item => item.productId === productId ? { ...item, quantity } : item))
}

const removeFromCart = (productId: number): void => {
  persistCart(cart.value.filter(item => item.productId !== productId))
}

const resetDemoData = (): void => {
  if (!window.confirm('Réinitialiser les produits et les ventes de démonstration enregistrés dans ce navigateur ?')) return
  try {
    products.value = resetProducts()
    sales.value = resetSalesDataset()
    saveCart([])
    cart.value = []
    selectedCategory.value = 'all'
    search.value = ''
    notice.value = 'Les données locales de démonstration ont été réinitialisées.'
    error.value = null
  } catch (reason) {
    showError('Impossible de réinitialiser les données locales.', reason)
  }
}

const completeOrder = (): void => {
  if (!sales.value || cartEntries.value.length === 0) {
    error.value = 'Ajoutez au moins un article au panier avant de valider la commande.'
    return
  }
  const location = sales.value.locations.find(item => item.id === selectedLocationId.value)
  if (!location) {
    error.value = 'Choisissez un point de vente disponible.'
    return
  }
  try {
    orderTotalCents(cartLines(cart.value, products.value))
  } catch (reason) {
    showError('Impossible de valider le montant de la commande.', reason)
    return
  }

  const date = new Date().toISOString().slice(0, 10)
  const orderNumber = sales.value.orders.length + 1
  const customerNumber = sales.value.customers.length + 1
  const customerId = `Requisition-${String(customerNumber).padStart(4, '0')}`
  const customerLocation = location.channel === 'store' ? location : physicalLocations.value[0]
  if (!customerLocation) {
    error.value = 'Aucun magasin physique ne permet de créer un client de démonstration.'
    return
  }
  const customer = {
    id: customerId,
    region: customerLocation.region,
    homeStoreId: customerLocation.id,
    joinedOn: date,
    preferredCategory: cartEntries.value[0]?.product?.category ?? '',
    preferredChannel: location.channel
  }
  const order: SalesOrder & { eventIds: string[] } = {
    id: `LOCAL-${String(orderNumber).padStart(6, '0')}`,
    date,
    customerId,
    locationId: location.id,
    eventIds: sales.value.events.filter(event => event.startDate <= date && event.endDate >= date).map(event => event.id),
    lines: cartEntries.value.map(entry => ({
      product: { id: entry.product!.id, name: entry.product!.name, category: entry.product!.category },
      quantity: entry.quantity,
      listUnitPriceCents: entry.product!.priceCents,
      unitPriceCents: entry.product!.priceCents,
      promotionCode: null
    }))
  }
  const nextSales: SalesDataset = {
    ...sales.value,
    metadata: {
      ...sales.value.metadata,
      startDate: date < sales.value.metadata.startDate ? date : sales.value.metadata.startDate,
      endDate: date > sales.value.metadata.endDate ? date : sales.value.metadata.endDate
    },
    customers: [...sales.value.customers, customer],
    orders: [...sales.value.orders, order]
  }
  try {
    saveSalesDataset(nextSales)
    sales.value = nextSales
    cart.value = []
    try {
      saveCart([])
    } catch (reason) {
      showError('La commande est enregistrée, mais le panier n’a pas pu être effacé du stockage local.', reason)
    }
    notice.value = `Commande locale ${order.id} enregistrée. Aucun paiement réel n’a été effectué.`
    cartOpen.value = false
  } catch (reason) {
    showError('Impossible d’enregistrer la commande dans le stockage local.', reason)
  }
}

onMounted(loadShop)
</script>

<template>
  <div class="site-shell">
    <nav class="topbar" aria-label="Navigation principale">
      <a class="wordmark" href="#" @click.prevent="activeView = 'shop'">
        <span class="seal" aria-hidden="true">CA</span>
        <span><strong>Central Alchemy Supply</strong><small>APPROVISIONNEMENT · AMESTRIS</small></span>
      </a>
      <div class="nav-actions">
        <button type="button" class="nav-link" @click="activeView = activeView === 'shop' ? 'data' : 'shop'">
          {{ activeView === 'shop' ? 'Registre de données' : 'Retour à la boutique' }}
        </button>
        <button type="button" class="cart-button" aria-controls="cart-panel" :aria-expanded="cartOpen" @click="cartOpen = !cartOpen">
          Panier <span>{{ cartCount }}</span>
        </button>
      </div>
    </nav>

    <div v-if="error" class="alert" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="loadShop">Réessayer la lecture</button>
    </div>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <div v-if="loading" class="loading" role="status">Ouverture des archives locales…</div>
    <WorkshopDataView v-else-if="activeView === 'data' && sales" :dataset="sales" />
    <main v-else-if="sales" class="shop-view">
      <header class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Bureau central d’approvisionnement · Depuis 1914</p>
          <h1>Outils pour<br><span>l’art de transformer.</span></h1>
          <p class="hero-subtitle">Équipement, ouvrages et composants pour alchimistes d’État et praticiens indépendants.</p>
          <a class="hero-link" href="#catalogue">Parcourir l’inventaire <span aria-hidden="true">↓</span></a>
        </div>
        <div class="transmutation-mark" aria-hidden="true">
          <svg viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="95" />
            <circle cx="120" cy="120" r="69" />
            <path d="M120 25v190M25 120h190M53 53l134 134M187 53 53 187M120 51l37 69-37 69-37-69z" />
            <circle cx="120" cy="120" r="11" />
          </svg>
          <span>Édition<br>de terrain</span>
        </div>
        <div class="hero-index">CAS / 24—25 <i></i> INVENTAIRE LOCAL</div>
      </header>

      <section id="catalogue" class="catalogue" aria-labelledby="catalogue-title">
        <div class="catalogue-heading">
          <div>
            <p class="eyebrow">Catalogue de démonstration</p>
            <h2 id="catalogue-title">Matériel en réserve</h2>
          </div>
          <p class="catalogue-caption">Prix catalogue en USD · statuts de collection</p>
        </div>

        <div class="filters">
          <label class="search-field">
            <span>Recherche d’inventaire</span>
            <input v-model="search" type="search" placeholder="Nom, fournisseur ou origine" autocomplete="off">
          </label>
          <div class="category-filter" role="group" aria-label="Filtrer par catégorie">
            <button type="button" :aria-pressed="selectedCategory === 'all'" @click="selectedCategory = 'all'">Toutes les catégories</button>
            <button
              v-for="category in categories"
              :key="category"
              type="button"
              :aria-pressed="selectedCategory === category"
              @click="selectedCategory = category"
            >
              {{ category }}
            </button>
          </div>
        </div>

        <p class="results-note" aria-live="polite">{{ filteredProducts.length }} références affichées</p>
        <p v-if="filteredProducts.length === 0" class="empty-state">Aucun produit ne correspond à cette recherche. Modifiez le texte ou choisissez une autre catégorie.</p>
        <div v-else class="product-grid">
          <ProductCard
            v-for="product in filteredProducts"
            :key="product.id"
            :product="product"
            @add="addToCart"
          />
        </div>
      </section>
    </main>

    <aside v-if="cartOpen && sales" id="cart-panel" class="cart-panel" aria-labelledby="cart-title">
      <div class="cart-heading">
        <div><p class="eyebrow">Réquisition locale</p><h2 id="cart-title">Votre panier</h2></div>
        <button type="button" class="close-button" aria-label="Fermer le panier" @click="cartOpen = false">×</button>
      </div>
      <p class="cart-disclaimer">Simulation locale uniquement : aucune adresse ni donnée de paiement n’est demandée.</p>
      <p v-if="cartEntries.length === 0" class="empty-state">Votre panier est vide.</p>
      <ul v-else class="cart-list">
        <li v-for="entry in cartEntries" :key="entry.productId">
          <div class="cart-product">
            <strong>{{ entry.product!.name }}</strong>
            <span>{{ formatUSD(entry.product!.priceCents) }} l’unité</span>
          </div>
          <label class="quantity-field">
            <span>Quantité</span>
            <input
              type="number"
              min="1"
              :value="entry.quantity"
              :aria-label="`Quantité pour ${entry.product!.name}`"
              @change="changeQuantity(entry.productId, $event)"
            >
          </label>
          <button type="button" class="remove-button" :aria-label="`Retirer ${entry.product!.name} du panier`" @click="removeFromCart(entry.productId)">Retirer</button>
        </li>
      </ul>
      <div v-if="cartEntries.length > 0" class="checkout">
        <p class="order-total"><span>Total de la commande</span><strong>{{ formatUSD(cartTotalCents) }}</strong></p>
        <label for="location">Canal ou point de retrait</label>
        <select id="location" v-model="selectedLocationId">
          <option value="online">En ligne · Online Requisition Portal</option>
          <option v-for="location in physicalLocations" :key="location.id" :value="location.id">{{ location.name }}</option>
        </select>
        <button type="button" class="checkout-button" @click="completeOrder">Valider la commande de démonstration</button>
        <small>Le panier et la commande restent dans le stockage local de ce navigateur.</small>
      </div>
    </aside>

    <footer class="site-footer">
      <span>Central Alchemy Supply</span>
      <span>Fournitures fictives · Démonstration locale · Prix en USD</span>
      <button type="button" @click="resetDemoData">Réinitialiser les données de démonstration</button>
    </footer>
  </div>
</template>

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
.seal { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid #c49a52; border-radius: 50%; color: #e6c77e; font-family: Georgia, serif; font-size: 0.85rem; }
.nav-actions { display: flex; align-items: center; gap: 0.7rem; }
.nav-link, .cart-button { min-height: 44px; padding: 0.6rem 0.9rem; border: 1px solid #9c8b67; background: transparent; color: #efe7d9; cursor: pointer; }
.nav-link:hover { background: #26384b; }
.cart-button { border-color: #9c3d43; background: #7e2931; font-weight: 700; }
.cart-button span { display: inline-grid; min-width: 1.45rem; height: 1.45rem; margin-left: 0.35rem; place-items: center; border-radius: 50%; background: #f3e7c9; color: #39232b; font-size: 0.8rem; }
.alert, .notice { margin: 0; padding: 0.8rem 1rem; text-align: center; line-height: 1.5; }
.alert { background: #7e2931; color: white; }
.alert p { display: inline; margin: 0 0.8rem 0 0; }
.alert button { min-height: 40px; padding: 0.4rem 0.75rem; border: 1px solid white; background: transparent; color: white; cursor: pointer; }
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
.filters { display: grid; gap: 1rem; margin: 2rem 0 1rem; padding: 1.2rem; border: 1px solid #c9a95e55; background: #182534; }
.search-field span, .quantity-field span { display: block; margin-bottom: 0.4rem; color: #e8dfcb; font-size: 0.83rem; font-weight: 700; }
.search-field input, .quantity-field input, .checkout select { width: 100%; min-height: 46px; padding: 0.65rem 0.8rem; border: 1px solid #9098a0; border-radius: 0; background: #f9f5eb; color: #162231; }
.category-filter { display: flex; flex-wrap: wrap; gap: 0.55rem; }
.category-filter button { min-height: 42px; padding: 0.55rem 0.8rem; border: 1px solid #677381; background: transparent; color: #e7e1d6; font-size: 0.82rem; cursor: pointer; }
.category-filter button[aria-pressed="true"] { border-color: #d7b66f; background: #d7b66f; color: #172332; font-weight: 800; }
.results-note { color: #c0c7ca; font-size: 0.86rem; }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 285px), 1fr)); gap: 1.1rem; margin-top: 1rem; }
.empty-state { padding: 1.5rem; border: 1px solid #6d7882; background: #1a2836; color: #e4dccf; }
.cart-panel { position: fixed; z-index: 5; top: 0; right: 0; display: flex; width: min(100%, 440px); height: 100vh; flex-direction: column; overflow-y: auto; padding: 1.2rem; border-left: 1px solid #c49a52; background: #f5f0e5; color: #172332; box-shadow: -15px 0 45px #0008; }
.cart-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.cart-heading .eyebrow { margin-bottom: 0.3rem; color: #7e2931; }
.cart-heading h2 { margin: 0; font-size: 2rem; }
.close-button { width: 44px; height: 44px; border: 1px solid #68717b; background: transparent; color: #172332; font-size: 1.6rem; cursor: pointer; }
.cart-disclaimer { padding: 0.75rem; background: #e8dfd1; font-size: 0.88rem; line-height: 1.45; }
.cart-list { display: grid; gap: 0.8rem; margin: 0; padding: 0; list-style: none; }
.cart-list li { display: grid; grid-template-columns: 1fr 90px auto; align-items: end; gap: 0.55rem; padding: 0.8rem 0; border-bottom: 1px solid #d2cabb; }
.cart-product strong, .cart-product span { display: block; }
.cart-product strong { line-height: 1.35; }
.cart-product span { margin-top: 0.3rem; color: #515c66; font-size: 0.85rem; }
.quantity-field input { min-height: 40px; padding: 0.4rem; }
.quantity-field span { color: #384551; font-size: 0.72rem; }
.remove-button { min-height: 40px; padding: 0.4rem; border: 0; background: transparent; color: #762932; font-size: 0.8rem; text-decoration: underline; cursor: pointer; }
.checkout { display: grid; gap: 0.7rem; margin-top: auto; padding-top: 1.2rem; }
.order-total { display: flex; justify-content: space-between; gap: 1rem; margin: 0; padding: 0.9rem 0; border-top: 2px solid #293849; font-size: 1.05rem; }
.checkout label { font-weight: 700; }
.checkout-button { min-height: 48px; padding: 0.7rem; border: 1px solid #7e2931; background: #7e2931; color: white; font-weight: 800; cursor: pointer; }
.checkout-button:hover { background: #612029; }
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
  .transmutation-mark { position: absolute; right: -4rem; bottom: 1rem; width: 230px; opacity: 0.48; }
  .hero-copy { max-width: 90%; }
  .hero-subtitle { font-size: 1rem; }
  .catalogue-heading { align-items: flex-start; flex-direction: column; }
  .catalogue-caption { margin: 0; }
  .site-footer { align-items: flex-start; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  :global(html) { scroll-behavior: auto; }
}
</style>
