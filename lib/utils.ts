import { FoodItem } from './types'

export function parseItems(items: FoodItem[] | string | undefined): FoodItem[] {
  if (!items) return []
  if (typeof items === 'string') {
    try { return JSON.parse(items) } catch { return [] }
  }
  return items
}
