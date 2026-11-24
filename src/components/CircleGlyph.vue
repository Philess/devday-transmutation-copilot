<script setup lang="ts">
import { computed } from 'vue'
import { transmutationCircle } from './alchemy'

const props = withDefaults(defineProps<{
  cx: number, cy: number, r: number, n?: number, k?: number, rotation?: number
  color?: string, width?: number, opacity?: number
}>(), { n: 6, k: 2, rotation: -Math.PI / 2, color: '#f0b429', width: 3, opacity: 1 })

const spec = computed(() => transmutationCircle(props.cx, props.cy, props.r, props.n, props.k, props.rotation))
</script>

<template>
  <g fill="none" :stroke="color" :stroke-width="width" stroke-linejoin="round" stroke-linecap="round" :opacity="opacity" aria-hidden="true">
    <path :d="spec.rings" />
    <path :d="spec.ticks" :stroke-width="width * 0.8" />
    <path :d="spec.star" />
    <path :d="spec.nodes" :stroke-width="width * 0.9" />
  </g>
</template>
