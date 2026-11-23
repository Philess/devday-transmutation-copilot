<script setup lang="ts">
import { computed } from 'vue'
import CircleGlyph from './CircleGlyph.vue'
import { rays, ring, sparkle } from './alchemy'

const props = defineProps<{ id: number, title: string, artist: string }>()

let counter = 0
const uid = `c${props.id}-${++counter}-${Math.random().toString(36).slice(2, 7)}`

const INK = '#0d1117'
const GOLD = '#f0b429'
const RED = '#d7263d'
const STEEL = '#2b3f55'
const SPARK = '#7fe7ff'
const PARCH = '#f4ead2'

const shadows: Record<number, string> = { 1: RED, 2: STEEL, 3: RED, 4: GOLD, 5: RED, 6: STEEL }
const shadow = computed(() => shadows[props.id] ?? RED)

const lines = computed(() => {
  const words = props.title.trim().split(/\s+/)
  if (words.length < 2) return [words[0] ?? '']
  let best = [words.join(' ')]
  let bestMax = (best[0] ?? '').length
  for (let i = 1; i < words.length; i++) {
    const pair = [words.slice(0, i).join(' '), words.slice(i).join(' ')]
    const max = Math.max((pair[0] ?? '').length, (pair[1] ?? '').length)
    if (max < bestMax) { best = pair; bestMax = max }
  }
  return best
})
const fontSize = computed(() => Math.max(40, Math.min(112, 460 / (Math.max(...lines.value.map(l => l.length)) * 0.5))))
const bannerWidth = computed(() => Math.min(520, 90 + props.artist.length * 15.5))

const skyline: [number, number, number][] = [[56, 70, 250], [120, 90, 330], [205, 60, 200], [260, 100, 400], [355, 70, 280], [420, 95, 350], [510, 110, 230]]
const dashes = Array.from({ length: 6 }, (_, i) => {
  const t0 = 0.03 + i * 0.18
  const t1 = t0 + 0.07 + i * 0.012
  const at = (t: number): [number, number] => [440 + 320 * t ** 1.5, 2 + 16 * t]
  const [y0, w0] = at(t0)
  const [y1, w1] = at(t1)
  return `M${330 - w0} ${y0}L${330 + w0} ${y0}L${330 + w1} ${y1}L${330 - w1} ${y1}Z`
})
const petals = [0, 60, 120, 180, 240, 300]
const flowers: [number, number][] = [[150, 520], [300, 420], [540, 480]]
const fallbackNote = computed(() => [GOLD, SPARK, RED][props.id % 3])
</script>

<template>
  <svg class="cover" viewBox="0 0 600 760" role="img" :aria-label="`${title} by ${artist}, album cover`" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath :id="`${uid}-art`"><rect x="56" y="0" width="544" height="760" /></clipPath>
      <pattern :id="`${uid}-dots`" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="7" cy="7" r="3.4" :fill="INK" /></pattern>
      <pattern :id="`${uid}-dots-w`" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="7" cy="7" r="3.2" fill="#ffffff" /></pattern>
      <pattern :id="`${uid}-hatch`" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 6H12" :stroke="INK" stroke-width="2.4" /></pattern>
      <pattern :id="`${uid}-win`" width="22" height="26" patternUnits="userSpaceOnUse"><rect x="5" y="6" width="9" height="12" :fill="PARCH" /></pattern>
      <linearGradient :id="`${uid}-fade`" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" /><stop offset="1" stop-color="#fff" stop-opacity="0" /></linearGradient>
      <linearGradient :id="`${uid}-fade-up`" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" /><stop offset="1" stop-color="#fff" stop-opacity="0" /></linearGradient>
      <mask :id="`${uid}-m-top`"><rect x="56" y="0" width="544" height="420" :fill="`url(#${uid}-fade)`" /></mask>
      <mask :id="`${uid}-m-bot`"><rect x="56" y="340" width="544" height="420" :fill="`url(#${uid}-fade-up)`" /></mask>
    </defs>

    <g :clip-path="`url(#${uid}-art)`">
      <!-- 1 · Midnight Signals -->
      <g v-if="id === 1">
        <rect x="56" width="544" height="760" fill="#0e1c33" />
        <path v-for="(s, i) in [[130,330,14],[250,300,9],[460,290,16],[560,350,8],[160,430,8],[340,260,10],[520,230,12],[100,250,9]]" :key="i" :d="sparkle(s[0] ?? 0, s[1] ?? 0, s[2] ?? 0)" fill="#fff" />
        <g :stroke="INK" stroke-width="5" stroke-linejoin="round">
          <path d="M56 410C150 320 250 480 350 380S520 310 600 360L600 470C520 420 430 510 340 450S150 500 56 460Z" :fill="SPARK" />
          <path d="M56 470C150 380 250 540 350 440S520 370 600 420L600 530C520 480 430 570 340 510S150 560 56 520Z" :fill="GOLD" />
          <path d="M56 530C150 440 250 600 350 500S520 430 600 480L600 590C520 540 430 630 340 570S150 620 56 580Z" :fill="RED" />
        </g>
        <rect x="56" y="300" width="544" height="360" :fill="`url(#${uid}-dots-w)`" :mask="`url(#${uid}-m-bot)`" opacity=".45" />
        <CircleGlyph :cx="330" :cy="520" :r="205" :n="6" :k="2" :color="PARCH" :width="3.5" />
        <path d="M56 760V650L150 570L225 630L300 585L370 655L450 600L520 655L600 625V760Z" fill="#070b14" :stroke="INK" stroke-width="5" />
        <path d="M300 745L330 520L360 745M312 690H348M318 640H342M306 718L354 660M354 718L306 660" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" />
        <circle cx="330" cy="512" r="12" :fill="GOLD" :stroke="INK" stroke-width="5" />
        <g fill="none" stroke-linecap="round">
          <path v-for="r in [44, 84, 124]" :key="`u${r}`" :d="`M${330 - r * 0.77} ${512 - r * 0.64} A${r} ${r} 0 0 1 ${330 + r * 0.77} ${512 - r * 0.64}`" :stroke="INK" stroke-width="16" />
          <path v-for="r in [44, 84, 124]" :key="r" :d="`M${330 - r * 0.77} ${512 - r * 0.64} A${r} ${r} 0 0 1 ${330 + r * 0.77} ${512 - r * 0.64}`" :stroke="GOLD" stroke-width="7" />
        </g>
      </g>

      <!-- 2 · City in Motion -->
      <g v-else-if="id === 2">
        <rect x="56" width="544" height="760" :fill="GOLD" />
        <rect x="56" y="0" width="544" height="420" :fill="`url(#${uid}-dots)`" :mask="`url(#${uid}-m-top)`" opacity=".28" />
        <circle cx="430" cy="330" r="150" :fill="STEEL" :stroke="INK" stroke-width="6" />
        <CircleGlyph :cx="430" :cy="330" :r="150" :n="8" :k="3" :color="GOLD" :width="3.5" />
        <circle cx="430" cy="330" r="22" :fill="RED" :stroke="INK" stroke-width="5" />
        <ellipse cx="350" cy="330" rx="260" ry="62" transform="rotate(-18 350 330)" fill="none" :stroke="INK" stroke-width="5" stroke-dasharray="1 13" stroke-linecap="round" />
        <g transform="translate(78 0) skewX(-6)">
          <g v-for="(b, i) in skyline" :key="i">
            <rect :x="b[0]" :y="740 - b[2]" :width="b[1]" :height="b[2] + 40" :fill="INK" />
            <rect :x="b[0]" :y="740 - b[2]" :width="b[1]" :height="b[2]" :fill="`url(#${uid}-win)`" opacity=".9" />
          </g>
        </g>
        <path d="M70 560H190M96 600H200M70 640H160M120 520H230" stroke="#fff" stroke-width="5" stroke-linecap="round" />
        <g :stroke="INK" stroke-width="4" stroke-linejoin="round">
          <g transform="translate(110 290) rotate(-12)"><path d="M0 0L130 -40L72 22Z" :fill="PARCH" /><path d="M72 22L130 -40L56 44Z" :fill="RED" /></g>
          <g transform="translate(400 150) rotate(10) scale(.62)"><path d="M0 0L130 -40L72 22Z" :fill="PARCH" /><path d="M72 22L130 -40L56 44Z" :fill="RED" /></g>
          <g transform="translate(236 140) rotate(-18)">
            <rect x="-9" y="-9" width="18" height="18" :fill="PARCH" />
            <rect x="-34" y="-6" width="20" height="12" :fill="SPARK" /><rect x="14" y="-6" width="20" height="12" :fill="SPARK" />
          </g>
        </g>
      </g>

      <!-- 3 · Quiet Horizons -->
      <g v-else-if="id === 3">
        <rect x="56" width="544" height="760" :fill="PARCH" />
        <rect x="56" y="0" width="544" height="470" :fill="`url(#${uid}-dots)`" :mask="`url(#${uid}-m-bot)`" opacity=".16" />
        <CircleGlyph :cx="330" :cy="470" :r="250" :n="5" :k="2" :color="INK" :width="2.6" />
        <g fill="none" :stroke="INK" stroke-width="3" stroke-linecap="round">
          <circle v-for="(r, i) in [300, 360, 430]" :key="r" cx="330" cy="470" :r="r" :stroke-dasharray="`${40 - i * 8} ${12 + i * 8}`" :opacity="0.85 - i * 0.15" />
        </g>
        <path d="M140 470A190 190 0 0 1 520 470Z" :fill="RED" :stroke="INK" stroke-width="6" stroke-linejoin="round" />
        <rect x="56" y="470" width="544" height="290" fill="#a9bdd1" />
        <g :stroke="INK" stroke-linecap="round">
          <path v-for="(y, i) in [488, 512, 542, 580, 626, 680, 740]" :key="y" :d="`M${70 + i * 9} ${y}H${590 - i * 14}`" :stroke-width="2 + i * 1.6" opacity=".9" />
        </g>
        <path d="M56 470H600" :stroke="INK" stroke-width="6" />
        <path d="M440 470Q470 432 520 470Z" :fill="INK" />
        <g :fill="INK"><circle cx="486" cy="436" r="8" /><path d="M486 444L476 470H496Z" /></g>
      </g>

      <!-- 4 · Electric Gardens -->
      <g v-else-if="id === 4">
        <rect x="56" width="544" height="760" fill="#0f2a33" />
        <CircleGlyph :cx="330" :cy="450" :r="240" :n="7" :k="3" :color="SPARK" :width="3" :opacity=".55" />
        <rect x="56" y="340" width="544" height="420" :fill="`url(#${uid}-dots)`" :mask="`url(#${uid}-m-bot)`" />
        <path d="M500 290L440 372H476L448 446L542 344H504L532 290Z" :fill="GOLD" :stroke="INK" stroke-width="5" stroke-linejoin="round" />
        <g fill="none" stroke-linejoin="round" stroke-linecap="round">
          <path d="M200 770V660H150V520M340 770V600H300V420M500 770V640H540V480" :stroke="INK" stroke-width="17" />
          <path d="M200 770V660H150V520M340 770V600H300V420M500 770V640H540V480" :stroke="SPARK" stroke-width="8" />
          <path d="M200 700H260V740M340 650H400V700" :stroke="SPARK" stroke-width="5" />
        </g>
        <g v-for="(f, i) in flowers" :key="i" :transform="`translate(${f[0]} ${f[1]}) scale(${i === 1 ? 1.15 : 1})`">
          <ellipse v-for="p in petals" :key="p" cx="0" cy="-42" rx="19" ry="38" :fill="i === 1 ? GOLD : RED" :stroke="INK" stroke-width="5" :transform="`rotate(${p + i * 14})`" />
          <circle r="20" :fill="PARCH" :stroke="INK" stroke-width="5" /><circle r="6" :fill="INK" />
        </g>
        <g fill="#0f2a33" :stroke="SPARK" stroke-width="5"><circle cx="260" cy="740" r="9" /><circle cx="400" cy="700" r="9" /></g>
      </g>

      <!-- 5 · Sunday Sketches -->
      <g v-else-if="id === 5">
        <rect x="56" width="544" height="760" :fill="PARCH" />
        <g stroke="#b9a981" stroke-width="2" opacity=".7">
          <path v-for="i in 20" :key="`h${i}`" :d="`M56 ${i * 38}H600`" />
          <path v-for="i in 15" :key="`v${i}`" :d="`M${56 + i * 38} 0V760`" />
        </g>
        <g :stroke="INK" stroke-width="5">
          <circle cx="250" cy="395" r="118" :fill="GOLD" />
          <circle cx="380" cy="395" r="118" fill="#e8742a" style="mix-blend-mode: multiply" />
          <circle cx="315" cy="505" r="118" fill="#f6cf62" style="mix-blend-mode: multiply" />
        </g>
        <circle cx="315" cy="505" r="118" :fill="`url(#${uid}-hatch)`" opacity=".45" />
        <path d="M250 395L380 395L315 505Z" fill="none" :stroke="INK" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round" />
        <CircleGlyph :cx="315" :cy="430" :r="215" :n="3" :k="1" :color="INK" :width="2.6" :opacity=".7" />
        <path d="M120 660C190 640 260 678 330 654S460 642 520 664" fill="none" :stroke="INK" stroke-width="6" stroke-linecap="round" />
        <g :fill="INK">
          <ellipse cx="170" cy="300" rx="14" ry="10" transform="rotate(-20 170 300)" /><path d="M181 296V240L206 250" fill="none" :stroke="INK" stroke-width="6" />
          <ellipse cx="470" cy="270" rx="14" ry="10" transform="rotate(-20 470 270)" /><path d="M481 266V215L506 225" fill="none" :stroke="INK" stroke-width="6" />
        </g>
        <g transform="translate(470 570) rotate(-35)" :stroke="INK" stroke-width="5" stroke-linejoin="round">
          <rect x="0" y="-14" width="150" height="28" :fill="GOLD" />
          <path d="M0 -14L-34 0L0 14Z" fill="#f1d6ac" /><path d="M-24 -5L-34 0L-24 5Z" :fill="INK" />
          <rect x="150" y="-14" width="26" height="28" :fill="RED" />
        </g>
      </g>

      <!-- 6 · Open Roads -->
      <g v-else-if="id === 6">
        <rect x="56" width="544" height="760" :fill="RED" />
        <path :d="rays(330, 440, 30, 20, 900, 0.045)" fill="#ea5a68" />
        <circle cx="330" cy="440" r="118" :fill="GOLD" :stroke="INK" stroke-width="6" />
        <CircleGlyph :cx="330" :cy="440" :r="190" :n="6" :k="2" :color="INK" :width="3" />
        <path d="M56 440L56 372H110L128 336H202L222 380H262L300 440Z" :fill="STEEL" :stroke="INK" stroke-width="5" stroke-linejoin="round" />
        <path d="M600 440V356H524L504 322H432L402 392H366L345 440Z" :fill="STEEL" :stroke="INK" stroke-width="5" stroke-linejoin="round" />
        <rect x="56" y="440" width="544" height="330" fill="#e0a526" :stroke="INK" stroke-width="5" />
        <rect x="56" y="440" width="544" height="330" :fill="`url(#${uid}-dots)`" :mask="`url(#${uid}-m-top)`" opacity=".22" />
        <path d="M300 440H360L720 780H-60Z" :fill="INK" />
        <path d="M300 440L-60 780M360 440L720 780" stroke="#fff" stroke-width="5" fill="none" />
        <path v-for="(d, i) in dashes" :key="i" :d="d" :fill="GOLD" />
      </g>

      <g v-else>
        <rect x="56" width="544" height="760" :fill="STEEL" />
        <path :d="rays(330, 400, 24, 30, 900, 0.06)" fill="#fff" opacity=".12" />
        <CircleGlyph :cx="330" :cy="400" :r="200" :n="6" :k="2" :color="fallbackNote" :width="4" />
        <path :d="ring(330, 400, 24)" :fill="fallbackNote" :stroke="INK" stroke-width="5" />
      </g>

      <!-- shared type layer -->
      <g class="cover-title" text-anchor="start">
        <text v-for="(line, i) in lines" :key="`s${i}`" x="90" :y="62 + fontSize * (0.9 + i * 0.92) + 6" :font-size="fontSize" :fill="shadow" :stroke="INK" stroke-width="10" stroke-linejoin="round" aria-hidden="true">{{ line.toUpperCase() }}</text>
        <text v-for="(line, i) in lines" :key="`t${i}`" x="84" :y="62 + fontSize * (0.9 + i * 0.92)" :font-size="fontSize" fill="#fff" :stroke="INK" stroke-width="10" stroke-linejoin="round" paint-order="stroke fill">{{ line.toUpperCase() }}</text>
      </g>
      <g aria-hidden="true">
        <circle cx="548" cy="52" r="34" :fill="GOLD" :stroke="INK" stroke-width="5" />
        <circle cx="548" cy="52" r="27" fill="none" :stroke="INK" stroke-width="2" stroke-dasharray="2 5" />
        <text x="548" y="63" text-anchor="middle" class="cover-no" font-size="32" :fill="INK">{{ String(id).padStart(2, '0') }}</text>
      </g>
      <g>
        <path :d="`M56 676H${56 + bannerWidth}L${40 + bannerWidth} 736H56Z`" :fill="INK" />
        <path :d="`M56 736H${40 + bannerWidth}`" :stroke="GOLD" stroke-width="5" />
        <text x="76" y="714" class="cover-artist" font-size="25" fill="#fff">{{ artist.toUpperCase() }}</text>
      </g>
    </g>

    <rect width="56" height="760" :fill="INK" />
    <path d="M56 0V760" :stroke="GOLD" stroke-width="3" />
    <g aria-hidden="true">
      <circle cx="28" cy="40" r="15" fill="none" :stroke="GOLD" stroke-width="3" />
      <path d="M28 27L39.3 46.5H16.7Z" fill="none" :stroke="GOLD" stroke-width="3" stroke-linejoin="round" />
      <text transform="translate(37 740) rotate(-90)" class="cover-spine" font-size="28" :fill="GOLD" letter-spacing="7">TRANSMUTE RECORDS</text>
    </g>
  </svg>
</template>

<style scoped>
.cover { display: block; width: 100%; height: auto; }
.cover-title text, .cover-spine { font-family: var(--font-display); }
.cover-no { font-family: var(--font-sfx); }
.cover-artist { font-family: var(--font-body); font-weight: 800; letter-spacing: 3px; }
</style>
