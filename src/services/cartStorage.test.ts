import { beforeEach, describe, expect, it } from 'vitest'
import { CART_STORAGE_KEY, loadCart, saveCart } from './cartStorage'

describe('cart storage', () => {
  let values: Map<string, string>
  let storage: Pick<Storage, 'getItem' | 'setItem'>

  beforeEach(() => {
    values = new Map()
    storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value) }
    }
  })

  it('restores a saved cart and leaves unrelated data untouched', () => {
    values.set('unrelated', 'keep')
    const cart = [{ productId: 3, quantity: 2 }]
    saveCart(cart, storage)
    expect(loadCart(storage)).toEqual(cart)
    expect(values.get('unrelated')).toBe('keep')
    expect(JSON.parse(values.get(CART_STORAGE_KEY)!)).toEqual({ version: 1, items: cart })
  })

  it('reports invalid saved cart data instead of silently clearing it', () => {
    values.set(CART_STORAGE_KEY, '{bad')
    expect(() => loadCart(storage)).toThrow('Saved cart data is not valid JSON')
    expect(values.get(CART_STORAGE_KEY)).toBe('{bad')
  })
})
