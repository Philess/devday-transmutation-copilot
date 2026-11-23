import { describe, expect, it } from 'vitest'
import { ALBUM_CART_STORAGE_KEY, MAX_QUANTITY, loadAlbumCart, saveAlbumCart } from './albumCartStorage'
import { cartTotalCents, formatCents, resolveCart, searchAlbums, sortAlbums } from './albumCatalog'
import { createDemoAlbums } from '../data/albums'

const memory = (initial?: string) => {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(ALBUM_CART_STORAGE_KEY, initial)
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) }, data }
}

describe('albumCartStorage', () => {
  it('round-trips a valid cart and starts empty', () => {
    const storage = memory()
    expect(loadAlbumCart(storage)).toEqual([])
    saveAlbumCart([{ albumId: 2, quantity: 3 }], storage)
    expect(loadAlbumCart(storage)).toEqual([{ albumId: 2, quantity: 3 }])
  })

  it('rejects invalid quantities and duplicates when saving', () => {
    const storage = memory()
    expect(() => saveAlbumCart([{ albumId: 1, quantity: MAX_QUANTITY + 1 }], storage)).toThrow()
    expect(() => saveAlbumCart([{ albumId: 1, quantity: 1 }, { albumId: 1, quantity: 2 }], storage)).toThrow()
    expect(storage.data.size).toBe(0)
  })

  it('rejects unreadable saved data and leaves it in place', () => {
    for (const raw of ['{broken', '{"version":9,"items":[]}', '{"version":1,"items":[{"albumId":1,"quantity":0}]}']) {
      const storage = memory(raw)
      expect(() => loadAlbumCart(storage)).toThrow()
      expect(storage.data.get(ALBUM_CART_STORAGE_KEY)).toBe(raw)
    }
  })
})

describe('albumCatalog', () => {
  const albums = createDemoAlbums()

  it('searches title, artist and price, ignoring case, accents and &', () => {
    expect(searchAlbums(albums, 'midnight').map(a => a.id)).toEqual([1])
    expect(searchAlbums(albums, 'MIRA and echoes').map(a => a.id)).toEqual([3])
    expect(searchAlbums(albums, '$9.99').map(a => a.id)).toEqual([5])
    expect(searchAlbums(albums, 'zzz')).toEqual([])
    expect(searchAlbums(albums, '  ')).toEqual(albums)
  })

  it('sorts without mutating the source', () => {
    const copy = [...albums]
    expect(sortAlbums(albums, 'price-asc')[0]?.id).toBe(5)
    expect(sortAlbums(albums, 'price-desc')[0]?.id).toBe(3)
    expect(sortAlbums(albums, 'title')[0]?.title).toBe('City in Motion')
    expect(albums).toEqual(copy)
  })

  it('totals in cents and reports albums that no longer exist', () => {
    const { lines, missing } = resolveCart([{ albumId: 1, quantity: 2 }, { albumId: 99, quantity: 1 }], albums)
    expect(missing).toEqual([99])
    expect(cartTotalCents(lines)).toBe(2598)
    expect(formatCents(2598)).toBe('$25.98')
  })
})
