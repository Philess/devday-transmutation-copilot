export interface AlbumCartItem {
  albumId: number
  quantity: number
}

export const ALBUM_CART_STORAGE_KEY = 'transmute-albums.cart.v1'
export const MAX_QUANTITY = 20

type CartStorage = Pick<Storage, 'getItem' | 'setItem'>

const isCart = (value: unknown): value is AlbumCartItem[] =>
  Array.isArray(value) && value.every(item =>
    typeof item === 'object' && item !== null
    && 'albumId' in item && typeof item.albumId === 'number' && Number.isSafeInteger(item.albumId) && item.albumId > 0
    && 'quantity' in item && typeof item.quantity === 'number' && Number.isSafeInteger(item.quantity)
    && item.quantity > 0 && item.quantity <= MAX_QUANTITY
  ) && new Set(value.map(item => item.albumId)).size === value.length

export const saveAlbumCart = (items: AlbumCartItem[], storage: CartStorage = window.localStorage): void => {
  if (!isCart(items)) throw new Error('Invalid cart')
  storage.setItem(ALBUM_CART_STORAGE_KEY, JSON.stringify({ version: 1, items }))
}

export const loadAlbumCart = (storage: CartStorage = window.localStorage): AlbumCartItem[] => {
  const saved = storage.getItem(ALBUM_CART_STORAGE_KEY)
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
