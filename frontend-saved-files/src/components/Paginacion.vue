<script setup lang="ts">
defineProps<{ page: number; limit: number; total: number }>()
defineEmits<{ cambiar: [page: number] }>()
</script>

<template>
  <div class="mt-3 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
    <span>{{ total }} resultado(s)</span>
    <div class="flex items-center gap-2">
      <button class="btn-ghost" :disabled="page <= 1" @click="$emit('cambiar', page - 1)">Anterior</button>
      <span>Página {{ page }} de {{ Math.max(1, Math.ceil(total / limit)) }}</span>
      <button class="btn-ghost" :disabled="page * limit >= total" @click="$emit('cambiar', page + 1)">Siguiente</button>
    </div>
  </div>
</template>
