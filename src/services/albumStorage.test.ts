import { describe, expect, it } from 'vitest'
import { ALBUM_STORAGE_KEY, loadAlbums, resetAlbums, saveAlbums } from './albumStorage'
import { createDemoAlbums } from '../data/albums'

const memory = (initial?: string) => {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(ALBUM_STORAGE_KEY, initial)
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
    data
  }
}

describe('albumStorage', () => {
  it('seeds the demo albums on first load', () => {
    const storage = memory()
    expect(loadAlbums(storage)).toEqual(createDemoAlbums())
    expect(storage.data.has(ALBUM_STORAGE_KEY)).toBe(true)
  })

  it('keeps saved edits instead of reseeding', () => {
    const storage = memory()
    const edited = createDemoAlbums().slice(0, 2).map(album => ({ ...album, price: 1.5 }))
    saveAlbums(edited, storage)
    expect(loadAlbums(storage)).toEqual(edited)
  })

  it('does not reseed an intentionally empty collection', () => {
    const storage = memory()
    saveAlbums([], storage)
    expect(loadAlbums(storage)).toEqual([])
  })

  it('rejects invalid saved data without overwriting it', () => {
    for (const raw of ['not json', '{"version":2,"albums":[]}', '{"version":1,"albums":[{"id":1}]}']) {
      const storage = memory(raw)
      expect(() => loadAlbums(storage)).toThrow()
      expect(storage.data.get(ALBUM_STORAGE_KEY)).toBe(raw)
    }
  })

  it('lets write failures propagate', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota') } }
    expect(() => resetAlbums(storage)).toThrow('quota')
  })
})
