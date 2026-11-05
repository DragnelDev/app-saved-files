<script setup lang="ts">
import { ref } from 'vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Nodo = Record<string, any>
const props = defineProps<{ nodo: Nodo; seleccionado?: string | null; nivel?: number }>()
const emit = defineEmits<{ seleccionar: [nodo: Nodo] }>()
const abierto = ref((props.nivel ?? 0) < 1)
const tipo = () => String(props.nodo.nivel ?? props.nodo.tipo ?? '')
</script>

<template>
  <div>
    <div
      class="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
      :class="seleccionado === nodo.id ? 'bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : ''"
      :style="{ paddingLeft: `${(nivel ?? 0) * 16 + 8}px` }"
      @click="emit('seleccionar', nodo)"
    >
      <button v-if="nodo.hijos?.length" class="w-4 text-xs text-slate-400" :aria-label="abierto ? 'Contraer' : 'Expandir'" @click.stop="abierto = !abierto">{{ abierto ? '▾' : '▸' }}</button>
      <span v-else class="w-4" />
      <span class="rounded bg-slate-200 px-1 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-600 dark:text-slate-200">{{ tipo().slice(0, 4) }}</span>
      <span class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ nodo.codigo }}</span>
      <span class="truncate">{{ nodo.nombre }}</span>
      <span v-if="nodo.trd" class="ml-auto text-[10px] text-emerald-600 dark:text-emerald-300">TRD</span>
      <span v-else-if="nodo.cajas !== undefined && tipo() === 'BALDA'" class="ml-auto text-[10px] text-slate-400">{{ nodo.cajas }}/{{ nodo.capacidadCajas }} cajas</span>
    </div>
    <div v-if="abierto">
      <TreeNode v-for="h in nodo.hijos" :key="h.id" :nodo="h" :seleccionado="seleccionado" :nivel="(nivel ?? 0) + 1" @seleccionar="emit('seleccionar', $event)" />
    </div>
  </div>
</template>
