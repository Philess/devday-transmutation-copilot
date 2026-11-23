<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Product } from './types/product'
import type { SalesDataset } from './types/sales'
import { loadCart, saveCart, type CartItem } from './services/cartStorage'
import { loadProducts, resetProducts } from './services/productStorage'
import { loadSalesDataset, resetSalesDataset, saveSalesDataset } from './services/salesStorage'
import { filterProducts } from './services/productSearch'
import {
  buildSampleOrder, cartTotal, MAX_QUANTITY, resolveCart, sortProducts, type ProductSort
} from './services/checkout'
import ProductCard from './components/ProductCard.vue'
import CartDrawer, { type OrderReceipt } from './components/CartDrawer.vue'
import CircleGlyph from './components/CircleGlyph.vue'
import HeroArt from './components/HeroArt.vue'
import WorkshopDataView from './components/WorkshopDataView.vue'

const markUrl = `${import.meta.env.BASE_URL}transmute-mark.svg`
const message = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const products = ref<Product[]>([])
const sales = ref<SalesDataset | null>(null)
const cart = ref<CartItem[]>([])
const productsError = ref<string | null>(null)
const salesError = ref<string | null>(null)
const cartReadError = ref<string | null>(null)
const actionError = ref<string | null>(null)
const loading = ref(true)
const search = ref('')
const category = ref('all')
const sort = ref<ProductSort>('featured')
const activeView = ref<'shop' | 'data'>('shop')
const cartOpen = ref(false)
const locationId = ref('online')
const receipt = ref<OrderReceipt | null>(null)
const toast = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
let toastTimer: number | undefined

const loadProductData = (): void => {
  try {
    products.value = loadProducts()
    productsError.value = null
  } catch (reason) {
    products.value = []
    productsError.value = message(reason)
  }
}

const loadSalesData = (): void => {
  try {
    sales.value = loadSalesDataset()
    salesError.value = null
    if (!sales.value.locations.some(location => location.id === locationId.value)) {
      locationId.value = sales.value.locations[0]?.id ?? ''
    }
  } catch (reason) {
    sales.value = null
    salesError.value = message(reason)
  }
}

const loadCartData = (): void => {
  try {
    cart.value = loadCart()
    cartReadError.value = null
  } catch (reason) {
    cart.value = []
    cartReadError.value = message(reason)
  }
}

const loadShop = (): void => {
  loading.value = true
  actionError.value = null
  loadProductData()
  loadSalesData()
  loadCartData()
  loading.value = false
}

const categories = computed(() => [...new Set(products.value.map(product => product.category))])
const visible = computed(() => sortProducts(filterProducts(products.value, search.value, category.value), sort.value))
const resolved = computed(() => resolveCart(cart.value, products.value))
const totalCents = computed(() => {
  try { return cartTotal(resolved.value.entries) } catch { return 0 }
})
const cartCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))
const quantityOf = (productId: number): number => cart.value.find(item => item.productId === productId)?.quantity ?? 0
const locations = computed(() => sales.value?.locations ?? [])

const orderBlocked = computed(() => {
  if (salesError.value) return 'Les ventes locales sont illisibles : la commande d’essai est indisponible.'
  if (resolved.value.missing.length > 0) return 'Retirez d’abord les articles indisponibles pour valider la commande.'
  if (!locations.value.some(location => location.id === locationId.value)) return 'Choisissez un point de vente disponible.'
  return ''
})
const canOrder = computed(() => resolved.value.entries.length > 0 && orderBlocked.value === '')

const announce = (text: string): void => {
  toast.value = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = '' }, 3600)
}

// The in-memory cart only changes once the browser has accepted the write.
const persistCart = (next: CartItem[]): boolean => {
  try {
    cartTotal(resolveCart(next, products.value).entries)
    saveCart(next)
    cart.value = next
    actionError.value = null
    return true
  } catch (reason) {
    actionError.value = `Impossible d’enregistrer le panier dans ce navigateur : rien n’a changé. ${message(reason)}`
    return false
  }
}

const addToCart = (product: Product): void => {
  if (cartReadError.value) return
  const current = quantityOf(product.id)
  if (current >= MAX_QUANTITY) return
  const next = current === 0
    ? [...cart.value, { productId: product.id, quantity: 1 }]
    : cart.value.map(item => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item))
  if (persistCart(next)) announce(`${product.name} ajouté au panier.`)
}

const setQuantity = (productId: number, quantity: number): void => {
  if (quantity < 1 || quantity > MAX_QUANTITY) return
  persistCart(cart.value.map(item => (item.productId === productId ? { ...item, quantity } : item)))
}

const removeItem = (productId: number): void => { persistCart(cart.value.filter(item => item.productId !== productId)) }

const removeMissing = (): void => {
  const gone = new Set(resolved.value.missing)
  persistCart(cart.value.filter(item => !gone.has(item.productId)))
}

const placeOrder = (): void => {
  if (!sales.value || !canOrder.value) return
  const entries = resolved.value.entries
  let result
  try {
    result = buildSampleOrder(sales.value, entries, locationId.value, new Date().toISOString().slice(0, 10))
    saveSalesDataset(result.dataset)
  } catch (reason) {
    actionError.value = `Impossible d’enregistrer la commande d’essai : rien n’a été modifié. ${message(reason)}`
    return
  }
  sales.value = result.dataset
  receipt.value = {
    orderId: result.orderId,
    count: entries.reduce((sum, entry) => sum + entry.quantity, 0),
    totalCents: totalCents.value,
    locationName: result.locationName
  }
  try {
    saveCart([])
    cart.value = []
    actionError.value = null
  } catch (reason) {
    actionError.value = `La commande est enregistrée, mais le panier n’a pas pu être vidé du stockage local. ${message(reason)}`
  }
}

const closeCart = (): void => { cartOpen.value = false; receipt.value = null }

const discardSavedCart = (): void => {
  if (!window.confirm('Supprimer le panier enregistré qui ne peut pas être lu ? Cette action est définitive.')) return
  try {
    saveCart([])
    cart.value = []
    cartReadError.value = null
  } catch (reason) {
    actionError.value = `Le panier illisible n’a pas pu être supprimé. ${message(reason)}`
  }
}

const replaceProducts = (): void => {
  if (!window.confirm('Remplacer le catalogue enregistré par les produits de démonstration ? Les données illisibles seront écrasées.')) return
  try {
    products.value = resetProducts()
    productsError.value = null
  } catch (reason) {
    productsError.value = message(reason)
  }
}

const replaceSales = (): void => {
  if (!window.confirm('Remplacer les ventes enregistrées par les ventes de démonstration ? Les données illisibles seront écrasées.')) return
  try {
    sales.value = resetSalesDataset()
    salesError.value = null
  } catch (reason) {
    salesError.value = message(reason)
  }
}

const resetDemoData = (): void => {
  if (!window.confirm('Réinitialiser les produits et les ventes de démonstration enregistrés dans ce navigateur ? Les commandes locales et le panier seront supprimés.')) return
  try {
    products.value = resetProducts()
    sales.value = resetSalesDataset()
    saveCart([])
    cart.value = []
    productsError.value = null
    salesError.value = null
    cartReadError.value = null
    actionError.value = null
    category.value = 'all'
    search.value = ''
    announce('Données de démonstration réinitialisées.')
  } catch (reason) {
    actionError.value = `Impossible de réinitialiser les données locales. ${message(reason)}`
  }
}

const clearFilters = (): void => { search.value = ''; category.value = 'all'; searchInput.value?.focus() }

const onShortcut = (event: KeyboardEvent): void => {
  const target = event.target as HTMLElement | null
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || cartOpen.value || activeView.value !== 'shop') return
  if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable)) return
  event.preventDefault()
  searchInput.value?.focus()
}

onMounted(() => {
  loadShop()
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

    <a class="skip" href="#shelf">Aller aux produits</a>

    <header class="top">
      <a class="brand" href="#top" aria-label="Central Alchemy Supply, accueil" @click="activeView = 'shop'">
        <img :src="markUrl" alt="" width="46" height="46">
        <span class="wordmark">CENTRAL<small>Alchemy Supply</small></span>
      </a>

      <form v-if="activeView === 'shop'" class="search" role="search" @submit.prevent>
        <label for="search" class="visually-hidden">Rechercher un produit, un fournisseur ou une origine</label>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4" /><path d="M15 15L21 21" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" /></svg>
        <input id="search" ref="searchInput" v-model="search" type="search" autocomplete="off" placeholder="Produit, fournisseur ou origine" :disabled="productsError !== null">
        <kbd aria-hidden="true">/</kbd>
      </form>
      <span v-else class="search-spacer" aria-hidden="true" />

      <div class="actions-top">
        <button type="button" class="nav-btn" :aria-pressed="activeView === 'data'" @click="activeView = activeView === 'shop' ? 'data' : 'shop'">
          {{ activeView === 'shop' ? 'Registre de données' : 'Retour à la boutique' }}
        </button>
        <button type="button" class="cart-btn" aria-controls="cart-panel" :aria-expanded="cartOpen" :aria-label="`Ouvrir le panier, ${cartCount} ${cartCount === 1 ? 'article' : 'articles'}`" @click="cartOpen = true">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M2.5 4H5L7.2 15H18.5L20.5 7H6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /><circle cx="9" cy="19.5" r="1.8" fill="currentColor" /><circle cx="17" cy="19.5" r="1.8" fill="currentColor" /></svg>
          <span class="cart-label">Panier</span>
          <span class="badge" aria-hidden="true">{{ cartCount }}</span>
        </button>
      </div>
    </header>

    <div v-if="cartReadError" class="banner" role="alert">
      <p><strong>Le panier enregistré n’a pas pu être lu.</strong> L’ajout d’articles est suspendu pour ne pas écraser les données. Détail : {{ cartReadError }}.</p>
      <button type="button" @click="loadCartData">Réessayer la lecture</button>
      <button type="button" @click="discardSavedCart">Supprimer le panier enregistré</button>
    </div>
    <div v-if="actionError" class="banner" role="alert">
      <p>{{ actionError }}</p>
      <button type="button" @click="actionError = null">Fermer</button>
    </div>

    <p v-if="loading" class="loading" role="status">Ouverture des archives locales…</p>

    <WorkshopDataView v-else-if="activeView === 'data' && sales" :dataset="sales" />
    <main v-else-if="activeView === 'data'" class="layout single">
      <div class="state" role="alert">
        <h3>Les ventes enregistrées sont illisibles</h3>
        <p>{{ salesError }}. Vos données enregistrées n’ont pas été modifiées.</p>
        <div class="actions">
          <button type="button" class="solid" @click="loadSalesData">Réessayer la lecture</button>
          <button type="button" class="outline" @click="replaceSales">Remplacer par les ventes de démonstration</button>
        </div>
      </div>
    </main>

    <main v-else id="top" class="layout">
      <aside class="art" aria-label="Mascotte de la boutique">
        <HeroArt />
        <p class="caption">Illustration originale, inspirée d’aucun personnage existant.</p>
      </aside>

      <section class="content">
        <p class="kicker">Fournitures fictives · démonstration locale</p>
        <h1>Tout pour<br><span>transmuter.</span></h1>
        <p class="lede">Ouvrages, composants, instruments et matériel de terrain de Central. Choisissez, remplissez le panier et passez une commande d’essai. Rien n’est vendu ni expédié.</p>

        <div class="toolbar">
          <h2 id="shelf" tabindex="-1">Le comptoir</h2>
          <p class="count" role="status">{{ productsError ? '' : `${visible.length} sur ${products.length} ${products.length === 1 ? 'produit' : 'produits'}` }}</p>
          <div class="sort">
            <label for="sort">Trier par</label>
            <select id="sort" v-model="sort" :disabled="productsError !== null">
              <option value="featured">Ordre du catalogue</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="name">Nom</option>
            </select>
          </div>
        </div>

        <div v-if="!productsError && products.length > 0" class="cats" role="group" aria-label="Catégories">
          <button type="button" :aria-pressed="category === 'all'" @click="category = 'all'">Toutes</button>
          <button v-for="name in categories" :key="name" type="button" :aria-pressed="category === name" @click="category = name">{{ name }}</button>
        </div>

        <div v-if="productsError" class="state" role="alert">
          <h3>Le catalogue enregistré est illisible</h3>
          <p>{{ productsError }}. Vos données enregistrées n’ont pas été modifiées.</p>
          <div class="actions">
            <button type="button" class="solid" @click="loadProductData">Réessayer la lecture</button>
            <button type="button" class="outline" @click="replaceProducts">Remplacer par les produits de démonstration</button>
          </div>
        </div>
        <div v-else-if="products.length === 0" class="state">
          <h3>Aucun produit</h3>
          <p>Le catalogue enregistré est vide. Il n’a pas été réinitialisé.</p>
          <div class="actions"><button type="button" class="outline" @click="replaceProducts">Restaurer les produits de démonstration</button></div>
        </div>
        <div v-else-if="visible.length === 0" class="state" role="status">
          <h3>Aucun produit ne correspond</h3>
          <p>Essayez un autre mot (nom, fournisseur, origine) ou une autre catégorie.</p>
          <div class="actions"><button type="button" class="solid" @click="clearFilters">Effacer les filtres</button></div>
        </div>
        <ul v-else class="shelf" aria-labelledby="shelf">
          <li v-for="product in visible" :key="product.id">
            <ProductCard :product="product" :in-cart="quantityOf(product.id)" :cart-paused="cartReadError !== null" @add="addToCart" />
          </li>
        </ul>
      </section>
    </main>

    <section v-if="activeView === 'shop'" class="steps" aria-labelledby="steps-title">
      <h2 id="steps-title">Comment fonctionne la démonstration</h2>
      <ol>
        <li><span>1</span><div><h3>Choisir</h3><p>Filtrez par catégorie ou cherchez un produit, un fournisseur, une origine.</p></div></li>
        <li><span>2</span><div><h3>Rassembler</h3><p>Le panier est enregistré dans ce navigateur uniquement.</p></div></li>
        <li><span>3</span><div><h3>Commande d’essai</h3><p>Ajoutée aux ventes fictives locales. Aucun paiement, aucune expédition.</p></div></li>
      </ol>
    </section>

    <footer class="foot">
      <p>Central Alchemy Supply est une démonstration fictive : fournitures, fournisseurs et prix (USD) sont inventés, et toutes les illustrations sont originales, dessinées en code.</p>
      <button type="button" @click="resetDemoData">Réinitialiser les données de démonstration</button>
    </footer>

    <p class="toast" role="status" aria-live="polite">{{ toast }}</p>

    <CartDrawer
      v-model:location-id="locationId"
      :open="cartOpen"
      :entries="resolved.entries"
      :missing="resolved.missing"
      :total-cents="totalCents"
      :locations="locations"
      :can-order="canOrder"
      :order-blocked="orderBlocked"
      :receipt="receipt"
      @close="closeCart"
      @set-quantity="setQuantity"
      @remove="removeItem"
      @remove-missing="removeMissing"
      @place-order="placeOrder"
    />
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; overflow-x: clip; }
.watermark { position: fixed; top: 60px; right: -260px; width: 900px; height: 900px; pointer-events: none; z-index: 0; animation: spin 240s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .watermark { animation: none; } }
.page > *:not(.watermark) { position: relative; z-index: 1; }
.skip { position: absolute; left: 12px; top: -60px; z-index: 100; padding: 10px 16px; font-weight: 800; color: var(--ink); background: var(--gold); border-radius: 4px; }
.skip:focus { top: 12px; }

.top { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 20px; max-width: 1480px; margin: 0 auto; padding: 14px 32px; }
.brand { display: flex; align-items: center; gap: 12px; color: var(--text); text-decoration: none; }
.wordmark { display: flex; flex-direction: column; font-family: var(--font-display); font-size: 1.7rem; line-height: .95; letter-spacing: .06em; }
.wordmark small { margin-top: 3px; font-family: var(--font-body); font-size: .72rem; font-weight: 800; letter-spacing: .3em; text-transform: uppercase; color: var(--gold); }
.search { position: relative; display: flex; align-items: center; max-width: 560px; justify-self: center; width: 100%; color: var(--muted); }
.search svg { position: absolute; left: 14px; pointer-events: none; }
.search input { width: 100%; min-height: 50px; padding: 8px 46px; color: var(--text); background: var(--steel); border: 2px solid var(--steel-3); border-radius: 999px; }
.search input::placeholder { color: var(--muted); }
.search input:hover:not(:disabled) { border-color: var(--gold-deep); }
.search input:disabled { opacity: .5; cursor: not-allowed; }
.search kbd { position: absolute; right: 14px; display: grid; place-items: center; width: 26px; height: 26px; font-size: .85rem; font-weight: 800; color: var(--gold); border: 1.5px solid var(--steel-3); border-radius: 5px; }
.actions-top { display: flex; align-items: center; gap: 12px; }
.nav-btn { min-height: 50px; padding: 6px 16px; font-weight: 800; color: var(--text); background: transparent; border: 2px solid var(--steel-3); border-radius: 4px; }
.nav-btn:hover { border-color: var(--gold); }
.nav-btn[aria-pressed='true'] { color: var(--gold); border-color: var(--gold); }
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
.loading { max-width: 1416px; margin: 40px auto; padding: 0 32px; color: var(--muted); font-weight: 700; }

.layout { display: grid; grid-template-columns: minmax(300px, 420px) minmax(0, 1fr); gap: 44px; max-width: 1480px; margin: 0 auto; padding: 14px 32px 48px; align-items: start; }
.layout.single { grid-template-columns: minmax(0, 1fr); max-width: 900px; }
.art { position: sticky; top: 14px; }
.art :deep(.hero-art) { filter: drop-shadow(0 18px 30px rgba(0, 0, 0, .5)); }
.caption { margin: 10px 0 0; font-size: .85rem; color: var(--muted); }

.kicker { margin: 0 0 8px; font-size: .85rem; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; color: var(--spark); }
h1 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: clamp(3rem, 6vw, 5.2rem); line-height: .92; letter-spacing: .015em; text-transform: uppercase; }
h1 span { color: var(--gold); text-shadow: 4px 4px 0 var(--crimson-deep); }
.lede { max-width: 58ch; margin: 12px 0 16px; font-size: 1.1rem; color: var(--muted); }

.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; margin-bottom: 14px; padding: 10px 0; border-block: 2px solid var(--steel-3); }
.toolbar h2 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 1.9rem; letter-spacing: .05em; text-transform: uppercase; color: var(--gold); }
.toolbar h2:focus { outline: none; }
.count { margin: 0; flex: 1; color: var(--muted); font-weight: 600; }
.sort { display: flex; align-items: center; gap: 10px; font-weight: 600; }
.sort select { min-height: 46px; padding: 6px 12px; color: var(--text); background: var(--steel); border: 2px solid var(--steel-3); border-radius: 4px; }
.sort select:hover:not(:disabled) { border-color: var(--gold-deep); }

.cats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.cats button { min-height: 44px; padding: 6px 14px; font-weight: 700; color: var(--text); background: var(--steel); border: 2px solid var(--steel-3); border-radius: 999px; }
.cats button:hover { border-color: var(--gold-deep); }
.cats button[aria-pressed='true'] { color: var(--ink); background: var(--gold); border-color: var(--ink); box-shadow: 0 0 0 2px var(--gold-deep); }

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

.toast { position: fixed; left: 50%; bottom: 24px; z-index: 40; margin: 0; padding: 10px 20px; font-weight: 800; color: var(--ink); background: var(--gold); border: 3px solid var(--ink); border-radius: 4px; transform: translateX(-50%); max-width: calc(100vw - 32px); text-align: center; }
.toast:empty { display: none; }

@media (max-width: 1180px) {
  .layout { grid-template-columns: minmax(240px, 320px) minmax(0, 1fr); gap: 28px; }
  .shelf { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .top { grid-template-columns: 1fr auto; padding: 12px 18px; }
  .search { grid-column: 1 / -1; grid-row: 2; max-width: none; }
  .search-spacer { display: none; }
  .layout { grid-template-columns: 1fr; padding: 10px 18px 36px; }
  .art { position: static; max-width: 230px; margin: 0 auto; }
  .caption { text-align: center; }
  .steps, .foot { padding-inline: 18px; }
  .steps ol { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .shelf { grid-template-columns: 1fr; }
  .wordmark { font-size: 1.4rem; }
  .wordmark small { letter-spacing: .18em; }
  .cart-label { display: none; }
  .cart-btn { padding-inline: 14px; }
  .nav-btn { padding-inline: 10px; font-size: .9rem; }
  .actions-top { gap: 8px; }
  .sort { width: 100%; }
  .sort select { flex: 1; }
}
</style>
