<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { api, apiBlob } from '@/lib/api'
import { error } from '@/lib/toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>
const props = defineProps<{ documento: Doc | null }>()
const emit = defineEmits<{ cerrar: [] }>()

const src = ref<string | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const integridad = ref<Record<string, any> | null>(null)
const cargando = ref(false)

function liberar() { if (src.value) URL.revokeObjectURL(src.value); src.value = null }

watch(() => props.documento, async (d) => {
  liberar(); integridad.value = null
  if (!d) return
  cargando.value = true
  try {
    const [blob, ver] = await Promise.all([apiBlob(`/documentos/${d.id}/archivo`), api(`/documentos/${d.id}/verificar`)])
    src.value = URL.createObjectURL(blob)
    integridad.value = ver
  } catch (e) { error(e) } finally { cargando.value = false }
})
onBeforeUnmount(liberar)
</script>

<template>
  <Teleport to="body">
    <div v-if="documento" class="fixed inset-0 z-40 bg-slate-900/40" @mousedown.self="emit('cerrar')">
      <aside class="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl dark:bg-slate-800">
        <header class="flex items-start justify-between border-b border-slate-200 p-4 dark:border-slate-700">
          <div>
            <h3 class="font-semibold">{{ documento.titulo }}</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">fojas {{ documento.fojaInicio }}–{{ documento.fojaFin }} · {{ documento.nombreOriginal }}</p>
          </div>
          <button class="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100" aria-label="Cerrar visor" @click="emit('cerrar')">✕</button>
        </header>
        <div class="border-b border-slate-200 p-3 text-xs dark:border-slate-700">
          <div v-if="cargando" class="text-slate-500">Verificando integridad…</div>
          <div v-else-if="integridad" class="rounded-lg p-2" :class="integridad.integro ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100' : 'bg-rose-50 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100'">
            <strong>{{ integridad.integro ? '✔ Documento íntegro: el hash coincide con el registrado al cargarlo' : '✖ ALERTA: el documento fue alterado o no se encuentra' }}</strong>
            <div class="mt-1 break-all font-mono">SHA-256 registrado: {{ integridad.hashRegistrado }}</div>
            <div class="break-all font-mono">SHA-256 actual: {{ integridad.hashActual ?? 'archivo no disponible' }}</div>
          </div>
        </div>
        <iframe v-if="src" :src="src" title="Visor de PDF" class="min-h-0 flex-1 border-0" />
      </aside>
    </div>
  </Teleport>
</template>
