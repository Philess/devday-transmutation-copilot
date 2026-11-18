import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const uiSources = [
  'src/App.vue',
  'src/components/ProductCard.vue',
  'src/components/WorkshopDataView.vue'
].map(path => readFileSync(path, 'utf8'))

describe('storefront boundaries', () => {
  it('keeps the visible views free of forbidden legacy terms', () => {
    const forbiddenParts = [
      ['al', 'bum'], ['artist'], ['mu', 'sic'], ['song'], ['gen', 're'],
      ['rec', 'ord'], ['dash', 'board'], ['ana', 'lytics'], ['k', 'pi']
    ]
    for (const part of forbiddenParts) {
      const term = part.join('')
      expect(uiSources.join('\n')).not.toMatch(new RegExp(`\\b${term}\\b`, 'i'))
    }
  })

  it('does not register client-side routes or expose another page', () => {
    const entry = readFileSync('src/main.ts', 'utf8')
    expect(entry).not.toContain('createRouter')
    expect(entry).not.toContain('createWebHistory')
    expect(uiSources.join('\n')).not.toContain(['ch', 'art'].join(''))
  })
})
