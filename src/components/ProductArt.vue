<script setup lang="ts">
import { computed } from 'vue'
import CircleGlyph from './CircleGlyph.vue'
import { rays, ring, sparkle } from './alchemy'

const props = defineProps<{ id: number, illustration: string, alt: string }>()

const uid = `art-${props.id}`

const INK = '#0d1117'
const GOLD = '#f0b429'
const RED = '#d7263d'
const RED_DEEP = '#a51a2d'
const PARCH = '#f4ead2'
const STEEL = '#9db2c8'
const STEEL_DARK = '#55718f'
const NAVY = '#15243a'

// Each reference gets its own background, circle diagram and accent, so repeated scenes never look duplicated.
const palettes = [
  { bg: GOLD, dots: INK, circle: INK, accent: RED },
  { bg: '#10203a', dots: '#7fe7ff', circle: GOLD, accent: '#7fe7ff' },
  { bg: RED, dots: INK, circle: GOLD, accent: GOLD },
  { bg: PARCH, dots: INK, circle: RED_DEEP, accent: RED },
  { bg: '#1f3450', dots: '#7fe7ff', circle: GOLD, accent: GOLD },
  { bg: '#7fe7ff', dots: INK, circle: INK, accent: RED }
]
const diagrams: [number, number][] = [[6, 2], [5, 2], [8, 3], [7, 3], [6, 2], [5, 2]]

const palette = computed(() => palettes[props.id % palettes.length] ?? palettes[0]!)
const diagram = computed(() => diagrams[(props.id * 5) % diagrams.length] ?? [6, 2])
const rotation = computed(() => -Math.PI / 2 + ((props.id * 17) % 60) * (Math.PI / 180))
const scene = computed(() => props.illustration.replace(/^illustrations\//, '').replace(/\.svg$/, ''))

const gear = (cx: number, cy: number, teeth: number, ro: number, ri: number): string => {
  const step = (Math.PI * 2) / teeth
  const at = (r: number, a: number): string => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`
  const parts: string[] = []
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    parts.push(at(ri, a - step * 0.36), at(ro, a - step * 0.2), at(ro, a + step * 0.2), at(ri, a + step * 0.36))
  }
  return `M${parts.join('L')}Z`
}
const bigGear = gear(270, 205, 12, 150, 124)
const smallGear = gear(450, 308, 9, 74, 58)
const burst = rays(300, 200, 18, 120, 340, 0.045)
const hex = (cx: number, cy: number, r: number): string =>
  `M${Array.from({ length: 6 }, (_, i) => `${(cx + r * Math.cos(Math.PI / 3 * i)).toFixed(1)} ${(cy + r * Math.sin(Math.PI / 3 * i)).toFixed(1)}`).join('L')}Z`
</script>

<template>
  <svg class="art" viewBox="0 0 600 420" role="img" :aria-label="alt" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern :id="`${uid}-dots`" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="7" cy="7" r="3.2" :fill="palette.dots" /></pattern>
      <linearGradient :id="`${uid}-fade`" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" /><stop offset=".65" stop-color="#fff" stop-opacity="0" /></linearGradient>
      <linearGradient :id="`${uid}-fade-b`" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" /><stop offset=".5" stop-color="#fff" stop-opacity="0" /></linearGradient>
      <mask :id="`${uid}-m1`"><rect width="600" height="420" :fill="`url(#${uid}-fade)`" /></mask>
      <mask :id="`${uid}-m2`"><rect width="600" height="420" :fill="`url(#${uid}-fade-b)`" /></mask>
      <clipPath :id="`${uid}-flask`"><path d="M255 100H345V178L428 332Q438 352 416 352H184Q162 352 172 332L255 178Z" /></clipPath>
    </defs>

    <rect width="600" height="420" :fill="palette.bg" />
    <rect width="600" height="420" :fill="`url(#${uid}-dots)`" :mask="`url(#${uid}-m1)`" opacity=".45" />
    <rect width="600" height="420" :fill="`url(#${uid}-dots)`" :mask="`url(#${uid}-m2)`" opacity=".3" />
    <svg viewBox="0 0 600 420" x="0" y="0" width="600" height="420" aria-hidden="true">
      <CircleGlyph :cx="300" :cy="210" :r="196" :n="diagram[0]" :k="diagram[1]" :rotation="rotation" :color="palette.circle" :width="3.5" :opacity="0.55" />
    </svg>

    <g :stroke="INK" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
      <!-- books -->
      <g v-if="scene === 'books'">
        <rect x="104" y="316" width="392" height="48" :fill="RED_DEEP" />
        <rect x="116" y="326" width="368" height="22" :fill="PARCH" stroke-width="4" />
        <path d="M126 337H474" stroke-width="3" opacity=".4" />
        <rect x="186" y="78" width="228" height="238" rx="6" :fill="NAVY" />
        <rect x="186" y="78" width="34" height="238" :fill="RED" />
        <path d="M203 98V298" :stroke="GOLD" stroke-width="3" stroke-dasharray="3 9" />
        <rect x="244" y="104" width="136" height="12" :fill="GOLD" stroke-width="3" />
        <rect x="262" y="124" width="100" height="8" :fill="GOLD" stroke-width="3" />
        <CircleGlyph :cx="312" :cy="215" :r="58" :n="6" :k="2" :color="GOLD" :width="3.4" />
        <path d="M376 316V380L388 366L400 380V316Z" :fill="palette.accent" />
        <path :d="sparkle(452, 120, 20)" fill="#fff" stroke-width="3" />
      </g>

      <!-- components -->
      <g v-else-if="scene === 'components'">
        <g v-for="(plate, i) in [{ x: 0, y: 0 }, { x: 14, y: -52 }]" :key="i" :transform="`translate(${plate.x} ${plate.y})`">
          <path d="M150 316H420V352H150Z" :fill="STEEL_DARK" />
          <path d="M150 316H420L462 284H192Z" :fill="STEEL" />
          <path d="M420 316L462 284V320L420 352Z" :fill="NAVY" />
          <ellipse cx="306" cy="300" rx="62" ry="11" fill="none" :stroke="GOLD" stroke-width="3.5" />
        </g>
        <g v-for="(chalk, i) in [{ x: 90, r: -20 }, { x: 122, r: -4 }, { x: 150, r: 12 }]" :key="`c${i}`" :transform="`rotate(${chalk.r} ${chalk.x} 300)`">
          <rect :x="chalk.x - 11" y="196" width="22" height="116" rx="4" :fill="PARCH" />
          <path :d="`M${chalk.x - 11} 224H${chalk.x + 11}`" stroke-width="3" opacity=".5" />
        </g>
        <path d="M472 340L488 236L510 340Z" :fill="palette.accent" />
        <path d="M504 340L534 262L556 340Z" :fill="RED_DEEP" />
        <path d="M488 236L491 340M534 262L530 340" stroke-width="3" opacity=".5" />
        <path :d="sparkle(300, 96, 24)" fill="#fff" stroke-width="3" />
        <path :d="sparkle(520, 190, 14)" :fill="GOLD" stroke-width="3" />
      </g>

      <!-- lab -->
      <g v-else-if="scene === 'lab'">
        <path d="M255 100H345V178L428 332Q438 352 416 352H184Q162 352 172 332L255 178Z" fill="#eaf7fb" />
        <g :clip-path="`url(#${uid}-flask)`">
          <path d="M150 256Q200 240 250 256T350 256T450 256V360H150Z" :fill="palette.accent" stroke-width="5" />
          <circle cx="260" cy="304" r="12" fill="#fff" stroke-width="4" /><circle cx="318" cy="322" r="9" fill="#fff" stroke-width="4" />
          <circle cx="352" cy="288" r="7" fill="#fff" stroke-width="3" />
        </g>
        <path d="M255 100H345V178L428 332Q438 352 416 352H184Q162 352 172 332L255 178Z" fill="none" />
        <rect x="243" y="86" width="114" height="24" rx="8" :fill="STEEL" />
        <path d="M262 150H290M262 176H282M262 202H290" stroke-width="4" />
        <rect x="462" y="246" width="80" height="106" rx="8" fill="#eaf7fb" />
        <path d="M466 296H538V344Q538 350 532 350H468Q466 350 466 344Z" :fill="GOLD" stroke-width="4" />
        <path :d="sparkle(120, 140, 26)" fill="#fff" stroke-width="3" />
        <path :d="sparkle(500, 150, 16)" :fill="GOLD" stroke-width="3" />
        <path d="M300 60V30M276 66L262 42M324 66L338 42" stroke-width="5" />
      </g>

      <!-- field -->
      <g v-else-if="scene === 'field'">
        <path d="M110 138L240 104L360 144L490 112V334L360 366L240 326L110 358Z" :fill="PARCH" />
        <path d="M240 104V326M360 144V366" stroke-width="3" opacity=".45" />
        <path d="M110 188L490 162M110 248L490 224M110 308L490 288" stroke-width="2" opacity=".18" />
        <path d="M150 316C226 232 296 316 356 232S440 182 456 168" fill="none" :stroke="palette.accent" stroke-width="7" stroke-dasharray="2 15" />
        <path d="M440 152L474 186M474 152L440 186" :stroke="RED_DEEP" stroke-width="9" />
        <CircleGlyph :cx="176" :cy="196" :r="34" :n="4" :k="1" :color="INK" :width="3" />
        <path d="M112 142V44" stroke-width="7" />
        <path d="M115 48L204 70L115 102Z" :fill="RED" />
        <circle cx="112" cy="40" r="9" :fill="GOLD" />
        <path :d="sparkle(520, 70, 22)" fill="#fff" stroke-width="3" />
      </g>

      <!-- mechanics -->
      <g v-else-if="scene === 'mechanics'">
        <path :d="bigGear" :fill="STEEL" />
        <circle cx="270" cy="205" r="92" :fill="STEEL_DARK" />
        <CircleGlyph :cx="270" :cy="205" :r="82" :n="6" :k="2" :color="GOLD" :width="3.4" />
        <circle cx="270" cy="205" r="24" :fill="GOLD" />
        <circle cx="270" cy="205" r="9" :fill="INK" />
        <path :d="smallGear" :fill="GOLD" />
        <circle cx="450" cy="308" r="26" :fill="palette.accent" />
        <circle cx="450" cy="308" r="8" :fill="INK" />
        <path :d="hex(104, 322, 30)" :fill="STEEL" /><circle cx="104" cy="322" r="12" :fill="INK" />
        <path :d="hex(166, 372, 22)" :fill="STEEL" /><circle cx="166" cy="372" r="8" :fill="INK" />
        <path :d="sparkle(500, 98, 24)" fill="#fff" stroke-width="3" />
      </g>

      <!-- artifacts and fallback -->
      <g v-else>
        <path :d="burst" :fill="PARCH" stroke="none" opacity=".3" />
        <path d="M300 62L402 124V250L300 322L198 250V124Z" :fill="RED" />
        <path d="M300 62L402 124L300 188L198 124Z" fill="#ff7388" stroke-width="4" />
        <path d="M300 188L402 124V250L300 322Z" :fill="RED_DEEP" stroke-width="4" />
        <path d="M232 112L262 98" stroke="#fff" stroke-width="7" />
        <rect x="200" y="330" width="200" height="30" rx="4" :fill="GOLD" />
        <path d="M222 345H378" stroke-width="3" opacity=".4" />
        <circle cx="486" cy="306" r="42" :fill="GOLD" />
        <CircleGlyph :cx="486" :cy="306" :r="30" :n="3" :k="1" :color="INK" :width="3.2" />
        <path :d="ring(486, 306, 42)" fill="none" stroke-width="2" opacity="0" />
        <path :d="sparkle(120, 110, 26)" fill="#fff" stroke-width="3" />
        <path :d="sparkle(500, 120, 16)" :fill="GOLD" stroke-width="3" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.art { display: block; width: 100%; height: auto; }
</style>
