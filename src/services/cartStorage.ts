import type { Product } from '../types/product'
import { orderTotalCents } from './money'

export interface CartItem {
  productId: number
  quantity: number
}

export const CART_STORAGE_KEY = 'exec-agenticdev-workshop.cart.v1'

type CartStorage = Pick<Storage, 'getItem' | 'setItem'>

const isCart = (value: unknown): value is CartItem[] =>
  Array.isArray(value) && value.every(item =>
    typeof item === 'object' && item !== null
    && 'productId' in item && Number.isSafeInteger(item.productId) && item.productId > 0
    && 'quantity' in item && Number.isSafeInteger(item.quantity) && item.quantity > 0
  ) && new Set(value.map(item => item.productId)).size === value.length

const validateTotal = (cart: CartItem[], products: Product[]): void => {
  orderTotalCents(cart.map(item => {
    const product = products.find(candidate => candidate.id === item.productId)
    if (!product) throw new Error('Cart contains an album missing from the catalog')
    return { quantity: item.quantity, unitPriceCents: Math.round(product.price * 100) }
  }))
}

export const saveCart = (cart: CartItem[], products: Product[], storage: CartStorage = window.localStorage): void => {
  if (!isCart(cart)) throw new Error('Invalid cart')
  validateTotal(cart, products)
  storage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items: cart }))
}

export const loadCart = (products: Product[], storage: CartStorage = window.localStorage): CartItem[] => {
  const saved = storage.getItem(CART_STORAGE_KEY)
  if (saved === null) return []

  let data: unknown
  try {
    data = JSON.parse(saved)
  } catch {
    throw new Error('Saved cart data is not valid JSON')
  }

  if (typeof data !== 'object' || data === null || !('version' in data) || data.version !== 1
    || !('items' in data) || !isCart(data.items)) {
    throw new Error('Saved cart data has an unsupported or invalid format')
  }
  validateTotal(data.items, products)
  return data.items
}
