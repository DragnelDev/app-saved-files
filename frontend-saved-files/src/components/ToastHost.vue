<script setup lang="ts">
import { avisos } from '@/lib/toast'
</script>

<template>
  <div class="fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
    <div
      v-for="a in avisos" :key="a.id" role="status"
      class="rounded-lg border px-3 py-2 text-sm shadow-lg"
      :class="a.tipo === 'ok'
        ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
        : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100'"
    >{{ a.texto }}</div>
  </div>
</template>
