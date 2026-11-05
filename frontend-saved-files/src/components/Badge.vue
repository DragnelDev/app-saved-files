<script setup lang="ts">
import { computed } from 'vue'
import { COLOR_ESTADO, etiqueta } from '@/lib/format'

const props = defineProps<{ valor?: string | null }>()
const clases: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  sky: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
}
const cls = computed(() => clases[COLOR_ESTADO[props.valor ?? ''] ?? 'slate'])
</script>

<template>
  <span class="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium" :class="cls">{{ etiqueta(valor) }}</span>
</template>
