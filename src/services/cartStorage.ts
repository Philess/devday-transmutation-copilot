export interface CartItem {
  productId: number
  quantity: number
}

export const CART_STORAGE_KEY = 'central-alchemy-supply.cart.v1'

type CartStorage = Pick<Storage, 'getItem' | 'setItem'>

const isCart = (value: unknown): value is CartItem[] =>
  Array.isArray(value) && value.every(item =>
    typeof item === 'object' && item !== null
    && 'productId' in item && Number.isSafeInteger(item.productId) && item.productId > 0
    && 'quantity' in item && Number.isSafeInteger(item.quantity) && item.quantity > 0
  ) && new Set(value.map(item => item.productId)).size === value.length

export const saveCart = (cart: CartItem[], storage: CartStorage = window.localStorage): void => {
  if (!isCart(cart)) throw new Error('Invalid cart')
  storage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items: cart }))
}

export const loadCart = (storage: CartStorage = window.localStorage): CartItem[] => {
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
  return data.items
}
