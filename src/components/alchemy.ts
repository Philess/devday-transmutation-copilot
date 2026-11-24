const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

const pt = (cx: number, cy: number, r: number, angle: number): [number, number] => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
const fmt = ([x, y]: [number, number]): string => `${x.toFixed(1)} ${y.toFixed(1)}`

export const ring = (cx: number, cy: number, r: number): string =>
  `M${(cx - r).toFixed(1)} ${cy.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`

// {n/k} star polygon, drawn as gcd(n,k) closed loops (a hexagram is two triangles).
export const star = (cx: number, cy: number, r: number, n: number, k: number, rotation = -Math.PI / 2): string => {
  const loops = gcd(n, k)
  const steps = n / loops
  const parts: string[] = []
  for (let l = 0; l < loops; l++) {
    const points = Array.from({ length: steps }, (_, i) => pt(cx, cy, r, rotation + (((l + i * k) % n) / n) * Math.PI * 2))
    parts.push(`M${points.map(fmt).join('L')}Z`)
  }
  return parts.join('')
}

export const ticks = (cx: number, cy: number, r0: number, r1: number, count: number, rotation = 0): string =>
  Array.from({ length: count }, (_, i) => {
    const a = rotation + (i / count) * Math.PI * 2
    return `M${fmt(pt(cx, cy, r0, a))}L${fmt(pt(cx, cy, r1, a))}`
  }).join('')

export const nodes = (cx: number, cy: number, r: number, n: number, nodeRadius: number, rotation = -Math.PI / 2): string =>
  Array.from({ length: n }, (_, i) => ring(...pt(cx, cy, r, rotation + (i / n) * Math.PI * 2), nodeRadius)).join('')

export interface CircleSpec { rings: string, star: string, ticks: string, nodes: string }

// One original transmutation-style diagram: banded outer ring, runic tick marks, star polygon, vertex nodes.
export const transmutationCircle = (cx: number, cy: number, r: number, n: number, k: number, rotation = -Math.PI / 2): CircleSpec => ({
  rings: ring(cx, cy, r) + ring(cx, cy, r * 0.9) + ring(cx, cy, r * 0.56),
  star: star(cx, cy, r * 0.9, n, k, rotation),
  ticks: ticks(cx, cy, r * 0.9, r, n * 6, rotation),
  nodes: nodes(cx, cy, r * 0.9, n, r * 0.055, rotation)
})

export const rays = (cx: number, cy: number, n: number, r0: number, r1: number, half: number): string =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return `M${fmt(pt(cx, cy, r0, a))}L${fmt(pt(cx, cy, r1, a - half))}L${fmt(pt(cx, cy, r1, a + half))}Z`
  }).join('')

export const sparkle = (x: number, y: number, s: number): string =>
  `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`
