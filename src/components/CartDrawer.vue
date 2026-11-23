<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { formatCents, type CartLine } from '../services/albumCatalog'
import { MAX_QUANTITY } from '../services/albumCartStorage'
import CoverArt from './CoverArt.vue'

const props = defineProps<{
  open: boolean
  lines: CartLine[]
  missing: number[]
  totalCents: number
  receipt: { count: number, totalCents: number } | null
}>()

const emit = defineEmits<{
  close: []
  setQuantity: [albumId: number, quantity: number]
  remove: [albumId: number]
  removeMissing: []
  placeOrder: []
  dismissReceipt: []
}>()

const panel = ref<HTMLElement | null>(null)
const itemCount = computed(() => props.lines.reduce((sum, line) => sum + line.quantity, 0))
let returnFocus: HTMLElement | null = null

const focusable = (): HTMLElement[] =>
  Array.from(panel.value?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])') ?? [])

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
    <aside
      ref="panel"
      class="drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-title"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <header class="head">
        <div>
          <p class="eyebrow">Sample cart</p>
          <h2 id="cart-title">Your cart</h2>
        </div>
        <button type="button" class="close" aria-label="Close cart" @click="emit('close')">
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
        <h3>Sample order recorded</h3>
        <p>
          {{ receipt.count }} {{ receipt.count === 1 ? 'item' : 'items' }} · {{ formatCents(receipt.totalCents) }}.
          <strong>This was a sample order.</strong> Nothing was charged, shipped, or sent anywhere, and no sales data was changed.
        </p>
        <button type="button" class="primary" @click="emit('dismissReceipt')">Back to the shelf</button>
      </div>

      <template v-else>
        <div v-if="missing.length > 0" class="warning" role="alert">
          <p>{{ missing.length === 1 ? 'One saved cart item is' : `${missing.length} saved cart items are` }} no longer in the album list. They are kept until you remove them.</p>
          <button type="button" class="ghost" @click="emit('removeMissing')">Remove unavailable items</button>
        </div>

        <div v-if="lines.length === 0 && missing.length === 0" class="empty">
          <svg viewBox="0 0 160 160" width="132" height="132" aria-hidden="true">
            <circle cx="80" cy="80" r="70" fill="none" stroke="var(--steel-3)" stroke-width="4" />
            <circle cx="80" cy="80" r="56" fill="none" stroke="var(--steel-3)" stroke-width="2" stroke-dasharray="4 7" />
            <path d="M80 26L127 107L33 107Z" fill="none" stroke="var(--gold)" stroke-width="4" stroke-linejoin="round" />
            <circle cx="80" cy="82" r="10" fill="none" stroke="var(--gold)" stroke-width="4" />
          </svg>
          <h3>Nothing on the circle yet</h3>
          <p>Add an album from the shelf and it will appear here.</p>
          <button type="button" class="primary" @click="emit('close')">Browse albums</button>
        </div>

        <ul v-else-if="lines.length > 0" class="lines">
          <li v-for="line in lines" :key="line.album.id" class="line">
            <div class="thumb"><CoverArt :id="line.album.id" :title="line.album.title" :artist="line.album.artist" /></div>
            <div class="meta">
              <h3>{{ line.album.title }}</h3>
              <p>{{ line.album.artist }}</p>
              <div class="stepper" role="group" :aria-label="`Quantity for ${line.album.title}`">
                <button type="button" :aria-label="`Decrease quantity of ${line.album.title}`" :disabled="line.quantity <= 1" @click="emit('setQuantity', line.album.id, line.quantity - 1)">−</button>
                <output :aria-label="`Quantity ${line.quantity}`">{{ line.quantity }}</output>
                <button type="button" :aria-label="`Increase quantity of ${line.album.title}`" :disabled="line.quantity >= MAX_QUANTITY" @click="emit('setQuantity', line.album.id, line.quantity + 1)">+</button>
              </div>
            </div>
            <div class="side">
              <strong>{{ formatCents(line.lineCents) }}</strong>
              <button type="button" class="remove" :aria-label="`Remove ${line.album.title} from cart`" @click="emit('remove', line.album.id)">Remove</button>
            </div>
          </li>
        </ul>

        <footer v-if="lines.length > 0" class="foot">
          <p class="total"><span>Total · {{ itemCount }} {{ itemCount === 1 ? 'item' : 'items' }}</span><strong>{{ formatCents(totalCents) }}</strong></p>
          <button type="button" class="primary" @click="emit('placeOrder')">Place sample order</button>
          <p class="fine">Demo only: placing a sample order empties this cart. No payment, no shipping, no real order.</p>
        </footer>
      </template>
    </aside>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 50; display: flex; justify-content: flex-end; background: rgba(5, 9, 16, .72); }
.drawer {
  position: relative; display: flex; flex-direction: column; gap: 16px; width: min(460px, 100%); height: 100%; overflow-y: auto; padding: 22px;
  color: var(--text); background: linear-gradient(180deg, var(--steel), var(--night)); border-left: 4px solid var(--gold);
  box-shadow: -18px 0 40px rgba(0, 0, 0, .5); animation: slide 260ms cubic-bezier(.2, .8, .2, 1) both;
}
.drawer:focus { outline: none; }
@keyframes slide { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
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
.empty p, .receipt p { margin: 0 0 8px; max-width: 34ch; color: var(--muted); }
.receipt p strong { color: var(--gold); }
.seal { width: 120px; height: 120px; }
.lines { display: flex; flex-direction: column; gap: 14px; margin: 0; padding: 0; list-style: none; }
.line { display: grid; grid-template-columns: 76px 1fr auto; gap: 14px; padding: 12px; background: var(--steel-2); border: 2px solid var(--steel-3); border-radius: 4px; }
.thumb { align-self: start; border: 2px solid var(--ink); line-height: 0; overflow: hidden; background: var(--ink); }
.meta h3 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 1.2rem; line-height: 1.15; letter-spacing: .03em; text-transform: uppercase; }
.meta p { margin: 2px 0 10px; color: var(--muted); font-size: .95rem; }
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
.total { display: flex; justify-content: space-between; align-items: baseline; margin: 0; font-weight: 600; }
.total strong { font-family: var(--font-display); font-weight: 400; font-size: 2rem; letter-spacing: .04em; color: var(--gold); }
.fine { margin: 0; font-size: .9rem; color: var(--muted); }
.primary {
  min-height: 52px; padding: 10px 20px; font-weight: 800; font-size: 1rem; letter-spacing: .08em; text-transform: uppercase; color: #fff;
  background: var(--crimson-deep); border: 3px solid var(--ink); border-radius: 4px; box-shadow: 0 4px 0 var(--ink), 0 0 0 2px var(--gold-deep);
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}
.primary:hover { background: var(--crimson); }
.primary:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink), 0 0 0 2px var(--gold-deep); }
.warning :focus-visible { outline-color: var(--crimson-deep); }
</style>
