<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import Paginacion from '@/components/Paginacion.vue'
import { api } from '@/lib/api'
import { fechaHora } from '@/lib/format'
import { error } from '@/lib/toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
const TABLAS = ['expedientes', 'documentos_expediente', 'transferencias', 'detalle_transferencia', 'prestamos_documentales', 'cajas_archivo', 'ubicacion_topografica', 'nodos_clasificacion', 'tabla_retencion', 'actas_valoracion', 'usuarios', 'unidades']
const f = reactive({ tabla: '', registroId: '', page: 1, limit: 25 })
const res = ref<{ items: R[]; total: number }>({ items: [], total: 0 })
const abierta = ref<string | null>(null)

async function buscar(p = 1) { f.page = p; try { res.value = await api('/auditoria', { query: { ...f } }) } catch (e) { error(e) } }
onMounted(() => buscar())
</script>

<template>
  <form class="card mb-4 flex flex-wrap items-end gap-3" @submit.prevent="buscar()">
    <div><label class="label">Tabla</label><select v-model="f.tabla" class="input w-56"><option value="">Todas</option><option v-for="t in TABLAS" :key="t" :value="t">{{ t }}</option></select></div>
    <div class="min-w-64 flex-1"><label class="label">ID del registro</label><input v-model="f.registroId" class="input" placeholder="UUID" /></div>
    <button class="btn-primary">Filtrar</button>
  </form>
  <p class="mb-2 text-xs text-slate-500">Bitácora inmutable: la base de datos impide modificar o borrar estos registros.</p>
  <div class="table-wrap">
    <table class="w-full">
      <thead><tr><th class="th">Fecha</th><th class="th">Tabla</th><th class="th">Acción</th><th class="th">Registro</th><th class="th">Usuario</th><th class="th" /></tr></thead>
      <tbody>
        <tr v-if="!res.items.length"><td colspan="6" class="td text-slate-500">Sin registros.</td></tr>
        <template v-for="a in res.items" :key="a.id">
          <tr>
            <td class="td whitespace-nowrap">{{ fechaHora(a.fecha) }}</td><td class="td">{{ a.tabla }}</td>
            <td class="td"><span class="rounded px-1.5 py-0.5 text-xs font-medium" :class="a.accion === 'INSERT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'">{{ a.accion }}</span></td>
            <td class="td font-mono text-xs">{{ a.registroId.slice(0, 8) }}…</td><td class="td font-mono text-xs">{{ a.usuarioId?.slice(0, 8) ?? 'sistema' }}</td>
            <td class="td text-right"><button class="btn-ghost" @click="abierta = abierta === a.id ? null : a.id">{{ abierta === a.id ? 'Ocultar' : 'Detalle' }}</button></td>
          </tr>
          <tr v-if="abierta === a.id"><td colspan="6" class="td">
            <div class="grid gap-3 md:grid-cols-2">
              <div v-if="a.datosAnteriores"><div class="label">Antes</div><pre class="overflow-x-auto rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-900">{{ JSON.stringify(a.datosAnteriores, null, 2) }}</pre></div>
              <div><div class="label">{{ a.accion === 'INSERT' ? 'Datos' : 'Después' }}</div><pre class="overflow-x-auto rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-900">{{ JSON.stringify(a.datosNuevos, null, 2) }}</pre></div>
            </div></td></tr>
        </template>
      </tbody>
    </table>
  </div>
  <Paginacion :page="f.page" :limit="f.limit" :total="res.total" @cambiar="buscar" />
</template>
