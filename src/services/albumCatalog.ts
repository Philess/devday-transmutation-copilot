import type { Album } from '../types/album'
import type { AlbumCartItem } from './albumCartStorage'

export type AlbumSort = 'featured' | 'price-asc' | 'price-desc' | 'title' | 'artist'

export const priceCents = (album: Pick<Album, 'price'>): number => Math.round(album.price * 100)

export const formatCents = (cents: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').toLocaleLowerCase('en').trim()

// Every word typed must match the title, the artist or the price, in any order.
export const searchAlbums = (albums: Album[], search: string): Album[] => {
  const words = normalize(search).split(/\s+/).filter(Boolean)
  if (words.length === 0) return albums
  return albums.filter(album => {
    const haystack = normalize(`${album.title} ${album.artist} ${album.price.toFixed(2)}`)
    return words.every(word => haystack.includes(word.replace(/^\$/, '')))
  })
}

export const sortAlbums = (albums: Album[], sort: AlbumSort): Album[] => {
  const sorted = [...albums]
  const text = (a: string, b: string): number => a.localeCompare(b, 'en', { sensitivity: 'base' })
  if (sort === 'price-asc') sorted.sort((a, b) => priceCents(a) - priceCents(b) || a.id - b.id)
  if (sort === 'price-desc') sorted.sort((a, b) => priceCents(b) - priceCents(a) || a.id - b.id)
  if (sort === 'title') sorted.sort((a, b) => text(a.title, b.title))
  if (sort === 'artist') sorted.sort((a, b) => text(a.artist, b.artist))
  return sorted
}

export interface CartLine {
  album: Album
  quantity: number
  lineCents: number
}

// Cart entries whose album no longer exists are reported, never dropped silently.
export const resolveCart = (items: AlbumCartItem[], albums: Album[]): { lines: CartLine[], missing: number[] } => {
  const lines: CartLine[] = []
  const missing: number[] = []
  for (const item of items) {
    const album = albums.find(candidate => candidate.id === item.albumId)
    if (!album) missing.push(item.albumId)
    else lines.push({ album, quantity: item.quantity, lineCents: priceCents(album) * item.quantity })
  }
  return { lines, missing }
}

export const cartTotalCents = (lines: CartLine[]): number => lines.reduce((sum, line) => sum + line.lineCents, 0)
