export const UNREPRESENTABLE_AMOUNT_MESSAGE = 'La quantité ou le montant dépasse la précision exacte des centimes.'

interface PricedQuantity {
  quantity: number
  unitPriceCents: number
}

// Number arithmetic is exact only while every operand and result stays a safe integer.
export const lineTotalCents = ({ quantity, unitPriceCents }: PricedQuantity): number => {
  const total = quantity * unitPriceCents
  if (!Number.isSafeInteger(quantity) || !Number.isSafeInteger(unitPriceCents) || !Number.isSafeInteger(total)) {
    throw new RangeError(UNREPRESENTABLE_AMOUNT_MESSAGE)
  }
  return total
}

export const orderTotalCents = (lines: PricedQuantity[]): number => lines.reduce((sum, line) => {
  const total = sum + lineTotalCents(line)
  if (!Number.isSafeInteger(total)) throw new RangeError(UNREPRESENTABLE_AMOUNT_MESSAGE)
  return total
}, 0)

export const isRepresentableOrder = (lines: PricedQuantity[]): boolean => {
  try {
    orderTotalCents(lines)
    return true
  } catch {
    return false
  }
}
