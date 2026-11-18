import dataset from './sales.json'
import type { Product } from '../types/product'

export const createDemoProducts = (): Product[] => structuredClone(dataset.products)
