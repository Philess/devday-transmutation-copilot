<script setup lang="ts">
import CircleGlyph from './CircleGlyph.vue'
import { rays } from './alchemy'

const INK = '#0d1117'
const burst = rays(260, 340, 36, 200, 800, 0.04)
const grooves = [226, 208, 190, 172, 154]
const speakerRings = [56, 40, 22]
</script>

<template>
  <svg class="hero-art" viewBox="0 0 520 660" role="img" aria-label="Illustration of Zap, the Transmute Records mascot: a singing character in a red coat and headphones standing in front of a glowing transmutation circle shaped like a vinyl record" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="hero-panel"><path d="M10 6H514L504 650L6 640Z" /></clipPath>
      <clipPath id="hero-mouth"><path d="M214 392Q260 480 306 392Q260 372 214 392Z" /></clipPath>
      <pattern id="hero-dots" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="6.5" cy="6.5" r="3" fill="#7fe7ff" /></pattern>
      <pattern id="hero-dots-ink" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="6.5" cy="6.5" r="3" :fill="INK" /></pattern>
      <linearGradient id="hero-fade" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" /><stop offset=".6" stop-color="#fff" stop-opacity="0" /></linearGradient>
      <linearGradient id="hero-fade-b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" /><stop offset=".5" stop-color="#fff" stop-opacity="0" /></linearGradient>
      <mask id="hero-corner"><rect width="520" height="660" fill="url(#hero-fade)" /></mask>
      <mask id="hero-bottom"><rect width="520" height="660" fill="url(#hero-fade-b)" /></mask>
      <radialGradient id="hero-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#7fe7ff" stop-opacity=".5" /><stop offset="1" stop-color="#7fe7ff" stop-opacity="0" /></radialGradient>
    </defs>

    <g clip-path="url(#hero-panel)">
      <rect width="520" height="660" fill="#0f1b2b" />
      <path :d="burst" fill="#1a2d44" />
      <rect width="520" height="660" fill="url(#hero-dots)" mask="url(#hero-corner)" opacity=".55" />
      <rect width="520" height="660" fill="url(#hero-dots-ink)" mask="url(#hero-bottom)" opacity=".7" />

      <!-- record-shaped transmutation circle -->
      <circle cx="260" cy="340" r="250" fill="url(#hero-glow)" />
      <circle cx="260" cy="340" r="236" fill="#12233a" stroke="#f0b429" stroke-width="5" />
      <g fill="none" stroke="#2b4666" stroke-width="3"><circle v-for="r in grooves" :key="r" cx="260" cy="340" :r="r" /></g>
      <CircleGlyph :cx="260" :cy="340" :r="236" :n="6" :k="2" color="#f0b429" :width="4" />

      <!-- transmutation lightning -->
      <g fill="none" stroke-linejoin="round" stroke-linecap="round">
        <path d="M26 96L92 152L70 164L140 236" stroke="#7fe7ff" stroke-width="9" /><path d="M26 96L92 152L70 164L140 236" stroke="#fff" stroke-width="3" />
        <path d="M498 560L430 508L452 498L384 430" stroke="#7fe7ff" stroke-width="9" /><path d="M498 560L430 508L452 498L384 430" stroke="#fff" stroke-width="3" />
        <path d="M500 150L440 190L462 200L410 250" stroke="#7fe7ff" stroke-width="7" /><path d="M500 150L440 190L462 200L410 250" stroke="#fff" stroke-width="2.5" />
      </g>

      <!-- sound arcs -->
      <g fill="none" stroke="#f0b429" stroke-width="7" stroke-linecap="round">
        <path v-for="r in [60, 100]" :key="`l${r}`" :d="`M${96 - r * 0.5} ${340 - r * 0.87} A${r} ${r} 0 0 0 ${96 - r * 0.5} ${340 + r * 0.87}`" />
        <path v-for="r in [60, 100]" :key="`r${r}`" :d="`M${424 + r * 0.5} ${340 - r * 0.87} A${r} ${r} 0 0 1 ${424 + r * 0.5} ${340 + r * 0.87}`" />
      </g>

      <!-- coat -->
      <path d="M96 660C96 550 160 505 260 500C360 505 424 550 424 660Z" fill="#d7263d" :stroke="INK" stroke-width="7" stroke-linejoin="round" />
      <path d="M260 536V660" :stroke="INK" stroke-width="5" />
      <path d="M118 640C124 580 160 546 214 530M402 640C396 580 360 546 306 530" fill="none" stroke="#f0b429" stroke-width="5" stroke-linecap="round" />
      <path d="M226 482L260 560L294 482Z" fill="#f4ead2" :stroke="INK" stroke-width="6" stroke-linejoin="round" />
      <path d="M172 478L228 492L262 566L168 536Z" fill="#b81d31" :stroke="INK" stroke-width="6" stroke-linejoin="round" />
      <path d="M348 478L292 492L258 566L352 536Z" fill="#b81d31" :stroke="INK" stroke-width="6" stroke-linejoin="round" />
      <g fill="#f0b429" :stroke="INK" stroke-width="4"><circle cx="272" cy="596" r="9" /><circle cx="272" cy="634" r="9" /><circle cx="248" cy="596" r="9" /><circle cx="248" cy="634" r="9" /></g>
      <path d="M232 462V496L260 530L288 496V462Z" fill="#ffd9c2" :stroke="INK" stroke-width="6" stroke-linejoin="round" />

      <!-- head -->
      <ellipse cx="260" cy="350" rx="132" ry="146" fill="#ffd9c2" :stroke="INK" stroke-width="7" />
      <g>
        <ellipse cx="190" cy="392" rx="30" ry="17" fill="#ff8aa0" opacity=".9" />
        <ellipse cx="330" cy="392" rx="30" ry="17" fill="#ff8aa0" opacity=".9" />
        <path d="M172 388L186 400M184 382L198 396M196 380L210 392M310 392L324 380M322 396L336 384M334 400L348 388" :stroke="INK" stroke-width="3" stroke-linecap="round" opacity=".6" />
      </g>
      <g fill="none" :stroke="INK" stroke-width="10" stroke-linecap="round">
        <path d="M186 350Q214 308 242 350" /><path d="M278 350Q306 308 334 350" />
        <path d="M184 290L240 300" stroke-width="9" /><path d="M280 300L336 290" stroke-width="9" />
      </g>
      <path d="M214 392Q260 480 306 392Q260 372 214 392Z" :fill="INK" :stroke="INK" stroke-width="6" stroke-linejoin="round" />
      <g clip-path="url(#hero-mouth)"><ellipse cx="260" cy="452" rx="42" ry="26" fill="#ff5a6e" /></g>
      <path d="M232 396H288" stroke="#fff" stroke-width="12" stroke-linecap="round" />

      <!-- hair -->
      <path d="M124 350C100 200 168 108 260 104C352 108 420 200 396 350L388 276L358 316L338 236L302 292L268 214L236 292L204 236L184 316L160 278Z" :fill="INK" />
      <path d="M170 150L138 62L228 118ZM262 112L284 30L322 120ZM338 128L412 70L388 170Z" :fill="INK" :stroke="INK" stroke-width="4" stroke-linejoin="round" />
      <g fill="none" stroke="#7fe7ff" stroke-width="9" stroke-linecap="round">
        <path d="M190 190C200 160 226 140 252 134" /><path d="M300 138C328 142 350 160 362 188" />
        <path d="M214 232L222 252" /><path d="M300 240L308 224" />
      </g>

      <!-- headphones -->
      <path d="M116 340C96 110 424 110 404 340" fill="none" :stroke="INK" stroke-width="38" stroke-linecap="round" />
      <path d="M116 340C96 110 424 110 404 340" fill="none" stroke="#f0b429" stroke-width="24" stroke-linecap="round" />
      <g :stroke="INK" stroke-width="7" stroke-linejoin="round">
        <rect x="76" y="290" width="62" height="116" rx="26" fill="#d7263d" />
        <rect x="382" y="290" width="62" height="116" rx="26" fill="#d7263d" />
      </g>
      <CircleGlyph :cx="107" :cy="348" :r="22" :n="6" :k="2" color="#f0b429" :width="2.4" />
      <CircleGlyph :cx="413" :cy="348" :r="22" :n="6" :k="2" color="#f0b429" :width="2.4" />
    </g>
    <path d="M10 6H514L504 650L6 640Z" fill="none" :stroke="INK" stroke-width="8" />

    <!-- inset panel: speaker -->
    <g>
      <path d="M26 440L186 424L196 560L30 584Z" fill="#2b3f55" :stroke="INK" stroke-width="7" />
      <g transform="translate(110 504) rotate(-5)">
        <path d="M-70 -64H70V64H-70Z" fill="#f4ead2" :stroke="INK" stroke-width="5" transform="rotate(-1)" />
        <circle v-for="(r, i) in speakerRings" :key="r" :r="r" :fill="i === 0 ? '#0d1117' : i === 1 ? '#d7263d' : '#f0b429'" :stroke="INK" stroke-width="4" />
        <circle r="7" :fill="INK" />
      </g>
    </g>

    <!-- sfx -->
    <g class="sfx">
      <text x="338" y="130" class="sfx-text" font-size="88" fill="#0d1117" stroke="#0d1117" stroke-width="16" stroke-linejoin="round">ZAAP!</text>
      <text x="332" y="124" class="sfx-text" font-size="88" fill="#f0b429" stroke="#fff" stroke-width="7" stroke-linejoin="round" paint-order="stroke fill">ZAAP!</text>
    </g>
  </svg>
</template>

<style scoped>
.hero-art { display: block; width: 100%; height: auto; overflow: visible; }
.sfx-text { font-family: var(--font-sfx); letter-spacing: 2px; }
.sfx { transform-box: fill-box; transform-origin: center; transform: rotate(-9deg); animation: pop 520ms cubic-bezier(.2, 1.6, .4, 1) 200ms both; }
@keyframes pop { from { transform: rotate(-9deg) scale(.2); opacity: 0; } to { transform: rotate(-9deg) scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .sfx { animation: none; } }
</style>
