import { createDemoProducts } from '../data/products'
import type { Product } from '../types/product'

export const PRODUCT_STORAGE_KEY = 'central-alchemy-supply.products.v1'

type ProductStorage = Pick<Storage, 'getItem' | 'setItem'>

const isProduct = (value: unknown): value is Product => {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value && typeof value.id === 'number' && Number.isSafeInteger(value.id) && value.id > 0
    && 'name' in value && typeof value.name === 'string' && value.name.trim().length > 0
    && 'category' in value && typeof value.category === 'string' && value.category.trim().length > 0
    && 'description' in value && typeof value.description === 'string' && value.description.trim().length > 0
    && 'priceCents' in value && typeof value.priceCents === 'number' && Number.isSafeInteger(value.priceCents) && value.priceCents > 0
    && 'supplier' in value && typeof value.supplier === 'string' && value.supplier.trim().length > 0
    && 'origin' in value && typeof value.origin === 'string' && value.origin.trim().length > 0
    && 'status' in value && typeof value.status === 'string' && value.status.trim().length > 0
    && 'illustration' in value && typeof value.illustration === 'string' && value.illustration.startsWith('illustrations/')
    && 'imageAlt' in value && typeof value.imageAlt === 'string' && value.imageAlt.trim().length > 0
    && 'saleStartDate' in value && typeof value.saleStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.saleStartDate)
    && 'themes' in value && Array.isArray(value.themes) && value.themes.every(theme => typeof theme === 'string')
}

const isProductCollection = (value: unknown): value is Product[] =>
  Array.isArray(value) && value.every(isProduct) && new Set(value.map(product => product.id)).size === value.length

export const saveProducts = (products: Product[], storage: ProductStorage = window.localStorage): void => {
  if (!isProductCollection(products)) throw new Error('Invalid product collection')
  storage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify({ version: 1, products }))
}

export const resetProducts = (storage: ProductStorage = window.localStorage): Product[] => {
  const products = createDemoProducts()
  saveProducts(products, storage)
  return products
}

export const loadProducts = (storage: ProductStorage = window.localStorage): Product[] => {
  const saved = storage.getItem(PRODUCT_STORAGE_KEY)
  if (saved === null) return resetProducts(storage)

  let data: unknown
  try {
    data = JSON.parse(saved)
  } catch {
    throw new Error('Saved product data is not valid JSON')
  }

  if (typeof data !== 'object' || data === null || !('version' in data) || data.version !== 1
    || !('products' in data) || !isProductCollection(data.products)) {
    throw new Error('Saved product data has an unsupported format')
  }

  return data.products
}
