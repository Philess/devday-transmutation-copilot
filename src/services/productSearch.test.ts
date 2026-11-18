import { describe, expect, it } from 'vitest'
import { createDemoProducts } from '../data/products'
import { filterProducts } from './productSearch'

describe('product catalog search', () => {
  const products = createDemoProducts()

  it('searches product names, suppliers and origins without case sensitivity', () => {
    expect(filterProducts(products, 'MAINTENANCE', 'all').map(product => product.id)).toContain(22)
    expect(filterProducts(products, '', 'all').some(product => product.supplier === 'Resembool Mechanics Depot')).toBe(true)
    expect(filterProducts(products, 'resEmbOol', 'all').some(product => product.origin === 'Resembool')).toBe(true)
  })

  it('combines the category selection with the text search', () => {
    const matches = filterProducts(products, 'mécanique', 'Automails et pièces mécaniques')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.every(product => product.category === 'Automails et pièces mécaniques')).toBe(true)
    expect(filterProducts(products, 'absent', 'all')).toEqual([])
  })
})
