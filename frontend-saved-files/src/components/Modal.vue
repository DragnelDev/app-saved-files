<script setup lang="ts">
defineProps<{ abierto: boolean; titulo: string; ancho?: string }>()
defineEmits<{ cerrar: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="abierto" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4" @mousedown.self="$emit('cerrar')">
      <div class="my-8 w-full rounded-xl bg-white p-5 shadow-xl dark:bg-slate-800" :class="ancho ?? 'max-w-lg'" role="dialog" aria-modal="true">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ titulo }}</h3>
          <button class="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100" aria-label="Cerrar" @click="$emit('cerrar')">✕</button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
