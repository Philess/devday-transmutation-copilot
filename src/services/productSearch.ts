import type { Product } from '../types/product'
// this is test 2
export const filterProducts = (products: Product[], search: string, category: string): Product[] => {
  const query = search.trim().toLocaleLowerCase('fr')
  return products.filter(product => {
    const categoryMatches = category === 'all' || product.category === category
    const searchMatches = !query || [
      product.name, product.category, product.supplier, product.origin, product.description
    ].some(value => value.toLocaleLowerCase('fr').includes(query))
    return categoryMatches && searchMatches
  })
}
