<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { formatUSD, MAX_QUANTITY, type CartEntry } from '../services/checkout'
import ProductArt from './ProductArt.vue'

export interface OrderReceipt { orderId: string, count: number, totalCents: number, locationName: string }

const props = defineProps<{
  open: boolean
  entries: CartEntry[]
  missing: number[]
  totalCents: number
  locations: { id: string, name: string, channel: string }[]
  locationId: string
  canOrder: boolean
  orderBlocked: string
  receipt: OrderReceipt | null
}>()

const emit = defineEmits<{
  close: []
  setQuantity: [productId: number, quantity: number]
  remove: [productId: number]
  removeMissing: []
  placeOrder: []
  'update:locationId': [id: string]
}>()

const panel = ref<HTMLElement | null>(null)
const itemCount = computed(() => props.entries.reduce((sum, entry) => sum + entry.quantity, 0))
let returnFocus: HTMLElement | null = null

const focusable = (): HTMLElement[] =>
  Array.from(panel.value?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, [tabindex]:not([tabindex="-1"])') ?? [])

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
    return
  }
  if (event.key !== 'Tab') return
  const items = focusable()
  if (items.length === 0) return
  const first = items[0]!
  const last = items[items.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}

watch(() => props.open, async open => {
  if (open) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    await nextTick()
    panel.value?.focus()
  } else {
    document.body.style.overflow = ''
    returnFocus?.focus()
    returnFocus = null
  }
})

onBeforeUnmount(() => { document.body.style.overflow = '' })
</script>

<template>
  <div v-if="open" class="overlay" @click.self="emit('close')">
    <aside ref="panel" id="cart-panel" class="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" tabindex="-1" @keydown="onKeydown">
      <header class="head">
        <div>
          <p class="eyebrow">Simulation locale uniquement</p>
          <h2 id="cart-title">Votre panier</h2>
        </div>
        <button type="button" class="close" aria-label="Fermer le panier" @click="emit('close')">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 5L19 19M19 5L5 19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
        </button>
      </header>

      <div v-if="receipt" class="receipt" role="status">
        <svg class="seal" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--gold)" stroke-width="4" />
          <circle cx="60" cy="60" r="44" fill="none" stroke="var(--gold)" stroke-width="2" stroke-dasharray="3 6" />
          <path d="M60 14L97 80L23 80Z M60 106L23 40L97 40Z" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linejoin="round" />
          <path d="M40 62L55 77L82 46" fill="none" stroke="var(--spark)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <h3>Commande locale enregistrée</h3>
        <p>
          <strong>{{ receipt.orderId }}</strong> · {{ receipt.count }} {{ receipt.count === 1 ? 'article' : 'articles' }} · {{ formatUSD(receipt.totalCents) }} · {{ receipt.locationName }}.
          Aucun paiement réel n’a été effectué et rien n’est expédié. La commande a été ajoutée aux données de vente fictives de ce navigateur, visibles dans le registre de données.
        </p>
        <button type="button" class="primary" @click="emit('close')">Retour au comptoir</button>
      </div>

      <template v-else>
        <div v-if="missing.length > 0" class="warning" role="alert">
          <p>{{ missing.length === 1 ? 'Un article du panier enregistré n’est' : `${missing.length} articles du panier enregistré ne sont` }} plus dans le catalogue. Ils sont conservés tant que vous ne les retirez pas, et la commande est bloquée.</p>
          <button type="button" class="ghost" @click="emit('removeMissing')">Retirer les articles indisponibles</button>
        </div>

        <div v-if="entries.length === 0 && missing.length === 0" class="empty">
          <svg viewBox="0 0 160 160" width="132" height="132" aria-hidden="true">
            <circle cx="80" cy="80" r="70" fill="none" stroke="var(--steel-3)" stroke-width="4" />
            <circle cx="80" cy="80" r="56" fill="none" stroke="var(--steel-3)" stroke-width="2" stroke-dasharray="4 7" />
            <path d="M80 26L127 107L33 107Z" fill="none" stroke="var(--gold)" stroke-width="4" stroke-linejoin="round" />
            <circle cx="80" cy="82" r="10" fill="none" stroke="var(--gold)" stroke-width="4" />
          </svg>
          <h3>Le cercle est vide</h3>
          <p>Ajoutez un produit depuis le comptoir et il apparaîtra ici.</p>
          <button type="button" class="primary" @click="emit('close')">Parcourir les produits</button>
        </div>

        <ul v-else-if="entries.length > 0" class="lines">
          <li v-for="entry in entries" :key="entry.productId" class="line">
            <div class="thumb"><ProductArt :id="entry.product.id" :illustration="entry.product.illustration" alt="" /></div>
            <div class="meta">
              <h3>{{ entry.product.name }}</h3>
              <p>{{ formatUSD(entry.product.priceCents) }} · {{ entry.product.supplier }}</p>
              <div class="stepper" role="group" :aria-label="`Quantité de ${entry.product.name}`">
                <button type="button" :aria-label="`Diminuer la quantité de ${entry.product.name}`" :disabled="entry.quantity <= 1" @click="emit('setQuantity', entry.productId, entry.quantity - 1)">−</button>
                <output :aria-label="`Quantité ${entry.quantity}`">{{ entry.quantity }}</output>
                <button type="button" :aria-label="`Augmenter la quantité de ${entry.product.name}`" :disabled="entry.quantity >= MAX_QUANTITY" @click="emit('setQuantity', entry.productId, entry.quantity + 1)">+</button>
              </div>
            </div>
            <div class="side">
              <strong>{{ formatUSD(entry.product.priceCents * entry.quantity) }}</strong>
              <button type="button" class="remove" :aria-label="`Retirer ${entry.product.name} du panier`" @click="emit('remove', entry.productId)">Retirer</button>
            </div>
          </li>
        </ul>

        <footer v-if="entries.length > 0" class="foot">
          <div class="where">
            <label for="order-location">Point de vente de la commande d’essai</label>
            <select id="order-location" :value="locationId" @change="emit('update:locationId', ($event.target as HTMLSelectElement).value)">
              <option v-for="location in locations" :key="location.id" :value="location.id">{{ location.name }}</option>
            </select>
          </div>
          <p class="total"><span>Total · {{ itemCount }} {{ itemCount === 1 ? 'article' : 'articles' }}</span><strong>{{ formatUSD(totalCents) }}</strong></p>
          <button type="button" class="primary" :disabled="!canOrder" @click="emit('placeOrder')">Valider la commande d’essai</button>
          <p v-if="orderBlocked" class="fine blocked" role="status">{{ orderBlocked }}</p>
          <p class="fine">Démonstration : aucun paiement, aucune expédition. La commande est enregistrée dans les ventes fictives de ce navigateur, puis le panier est vidé.</p>
        </footer>
      </template>
    </aside>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 50; display: flex; justify-content: flex-end; background: rgba(5, 9, 16, .72); }
.drawer {
  position: relative; display: flex; flex-direction: column; gap: 16px; width: min(480px, 100%); height: 100%; overflow-y: auto; padding: 22px;
  color: var(--text); background: linear-gradient(180deg, var(--steel), var(--night)); border-left: 4px solid var(--gold);
  box-shadow: -18px 0 40px rgba(0, 0, 0, .5); animation: slide 260ms cubic-bezier(.2, .8, .2, 1) both;
}
.drawer:focus { outline: none; }
@keyframes slide { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .drawer { animation: none; } }
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 2px dashed var(--steel-3); }
.eyebrow { margin: 0; font-size: .8rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: var(--gold); }
h2 { margin: 2px 0 0; font-family: var(--font-display); font-weight: 400; font-size: 2.4rem; line-height: 1; letter-spacing: .03em; text-transform: uppercase; }
.close { display: grid; place-items: center; width: 48px; height: 48px; color: var(--text); background: var(--steel-2); border: 2px solid var(--steel-3); border-radius: 4px; }
.close:hover { border-color: var(--gold); }
.warning { padding: 14px; color: var(--ink); background: var(--parchment); border: 3px solid var(--crimson); border-radius: 4px; }
.warning p { margin: 0 0 10px; font-weight: 600; }
.ghost { min-height: 44px; padding: 6px 14px; font-weight: 800; color: var(--ink); background: transparent; border: 2px solid var(--ink); border-radius: 4px; }
.ghost:hover { background: var(--parchment-2); }
.empty, .receipt { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px 10px; text-align: center; }
.empty h3, .receipt h3 { margin: 6px 0 0; font-family: var(--font-display); font-weight: 400; font-size: 1.9rem; letter-spacing: .03em; text-transform: uppercase; }
.empty p, .receipt p { margin: 0 0 8px; max-width: 38ch; color: var(--muted); }
.receipt p strong { color: var(--gold); }
.seal { width: 120px; height: 120px; }
.lines { display: flex; flex-direction: column; gap: 14px; margin: 0; padding: 0; list-style: none; }
.line { display: grid; grid-template-columns: 84px 1fr auto; gap: 14px; padding: 12px; background: var(--steel-2); border: 2px solid var(--steel-3); border-radius: 4px; }
.thumb { align-self: start; border: 2px solid var(--ink); line-height: 0; overflow: hidden; background: var(--ink); }
.meta { min-width: 0; }
.meta h3 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 1.2rem; line-height: 1.15; letter-spacing: .03em; text-transform: uppercase; overflow-wrap: anywhere; }
.meta p { margin: 2px 0 10px; color: var(--muted); font-size: .9rem; }
.stepper { display: inline-flex; align-items: center; border: 2px solid var(--steel-3); border-radius: 4px; background: var(--night); }
.stepper button { width: 44px; height: 44px; font-size: 1.4rem; font-weight: 800; color: var(--gold); background: transparent; border: 0; }
.stepper button:hover:not(:disabled) { background: var(--steel-3); }
.stepper button:disabled { color: #5b6b82; cursor: not-allowed; }
.stepper output { min-width: 36px; text-align: center; font-weight: 800; font-size: 1.1rem; }
.side { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; }
.side strong { font-family: var(--font-display); font-weight: 400; font-size: 1.3rem; letter-spacing: .04em; color: var(--gold); }
.remove { min-height: 44px; padding: 4px 6px; font-weight: 600; color: var(--muted); background: none; border: 0; text-decoration: underline; text-underline-offset: 3px; }
.remove:hover { color: var(--text); }
.foot { position: sticky; bottom: -22px; margin: auto -22px -22px; padding: 18px 22px 22px; display: flex; flex-direction: column; gap: 12px; background: var(--night); border-top: 3px solid var(--gold); }
.where label { display: block; margin-bottom: 6px; font-size: .85rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--gold); }
.where select { width: 100%; min-height: 46px; padding: 6px 12px; color: var(--text); background: var(--steel); border: 2px solid var(--steel-3); border-radius: 4px; }
.total { display: flex; justify-content: space-between; align-items: baseline; margin: 0; font-weight: 600; }
.total strong { font-family: var(--font-display); font-weight: 400; font-size: 2rem; letter-spacing: .04em; color: var(--gold); }
.fine { margin: 0; font-size: .9rem; color: var(--muted); }
.blocked { color: #ffb3bd; font-weight: 700; }
.primary {
  min-height: 52px; padding: 10px 20px; font-weight: 800; font-size: 1rem; letter-spacing: .08em; text-transform: uppercase; color: #fff;
  background: var(--crimson-deep); border: 3px solid var(--ink); border-radius: 4px; box-shadow: 0 4px 0 var(--ink), 0 0 0 2px var(--gold-deep);
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}
.primary:hover:not(:disabled) { background: var(--crimson); }
.primary:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink), 0 0 0 2px var(--gold-deep); }
.primary:disabled { cursor: not-allowed; color: #8d99aa; background: #2a3647; box-shadow: none; }
.warning :focus-visible { outline-color: var(--crimson-deep); }
</style>
