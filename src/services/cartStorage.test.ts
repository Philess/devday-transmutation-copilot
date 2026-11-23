import { beforeEach, describe, expect, it } from 'vitest'
import { CART_STORAGE_KEY, loadCart, saveCart } from './cartStorage'
import { createDemoAlbums } from '../data/albums'

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
    saveCart(cart, createDemoAlbums(), storage)
    expect(loadCart(createDemoAlbums(), storage)).toEqual(cart)
    expect(values.get('unrelated')).toBe('keep')
    expect(JSON.parse(values.get(CART_STORAGE_KEY)!)).toEqual({ version: 1, items: cart })
  })

  it('reports invalid saved cart data instead of silently clearing it', () => {
    values.set(CART_STORAGE_KEY, '{bad')
    expect(() => loadCart(createDemoAlbums(), storage)).toThrow('Saved cart data is not valid JSON')
    expect(values.get(CART_STORAGE_KEY)).toBe('{bad')
  })

  it('rejects line and cumulative cent overflow on load and save without overwriting data', () => {
    const albums = createDemoAlbums()
    const price = Math.round(albums[0]!.price * 100)
    const cart = [{ productId: albums[0]!.id, quantity: Math.floor(Number.MAX_SAFE_INTEGER / price) + 1 }]
    values.set(CART_STORAGE_KEY, JSON.stringify({ version: 1, items: cart }))
    const saved = values.get(CART_STORAGE_KEY)
    expect(() => loadCart(albums, storage)).toThrow()
    expect(() => saveCart(cart, albums, storage)).toThrow()
    expect(values.get(CART_STORAGE_KEY)).toBe(saved)
    const totalOverflow = albums.slice(0, 2).map(album => ({
      productId: album.id, quantity: Math.floor(Number.MAX_SAFE_INTEGER / 2 / Math.round(album.price * 100)) + 1
    }))
    expect(() => saveCart(totalOverflow, albums, storage)).toThrow()
    values.set(CART_STORAGE_KEY, JSON.stringify({ version: 1, items: totalOverflow }))
    expect(() => loadCart(albums, storage)).toThrow()
  })
})
