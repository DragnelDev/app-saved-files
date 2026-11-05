<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Badge from '@/components/Badge.vue'
import Modal from '@/components/Modal.vue'
import Paginacion from '@/components/Paginacion.vue'
import { api } from '@/lib/api'
import { etiqueta, fecha } from '@/lib/format'
import { error, ok } from '@/lib/toast'
import { useAuth } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
const auth = useAuth()
const puedeCrear = auth.tieneRol('ROLE_ARCHIVISTA', 'ROLE_RESPONSABLE_UNIDAD')
const verUnidades = auth.rol !== 'ROLE_RESPONSABLE_UNIDAD'

const f = reactive({ q: '', unidadId: '', nodoId: '', estado: '', estadoFoliacion: '', fechaDesde: '', fechaHasta: '', codigoTopografico: '', page: 1, limit: 20 })
const res = ref<{ items: R[]; total: number }>({ items: [], total: 0 })
const series = ref<R[]>([])
const unidades = ref<R[]>([])
const cargando = ref(false)

const modal = ref(false)
const nuevo = reactive({ nodoId: '', gestion: new Date().getFullYear(), asunto: '', unidadProductoraId: '', fechaInicio: '', fechaFin: '', sensibilidad: 'PUBLICO', palabras: '' })

async function buscar(pagina = 1) {
  f.page = pagina; cargando.value = true
  try { res.value = await api('/expedientes', { query: { ...f } }) } catch (e) { error(e) } finally { cargando.value = false }
}
function limpiar() { Object.assign(f, { q: '', unidadId: '', nodoId: '', estado: '', estadoFoliacion: '', fechaDesde: '', fechaHasta: '', codigoTopografico: '' }); buscar() }
async function crear() {
  try {
    const e = await api('/expedientes', { body: {
      nodoId: nuevo.nodoId, gestion: Number(nuevo.gestion), asunto: nuevo.asunto, fechaInicio: nuevo.fechaInicio,
      fechaFin: nuevo.fechaFin || undefined, sensibilidad: nuevo.sensibilidad,
      unidadProductoraId: verUnidades ? nuevo.unidadProductoraId : undefined,
      palabrasClave: nuevo.palabras.split(',').map((p) => p.trim()).filter(Boolean),
    } })
    ok(`Expediente ${e.codigo} creado`); modal.value = false; Object.assign(nuevo, { asunto: '', fechaInicio: '', fechaFin: '', palabras: '' }); await buscar()
  } catch (e) { error(e) }
}
onMounted(async () => {
  buscar()
  try { series.value = await api('/clasificacion/series'); if (verUnidades) unidades.value = await api('/unidades') } catch (e) { error(e) }
})
</script>

<template>
  <form class="card mb-4 grid gap-3 md:grid-cols-4" @submit.prevent="buscar()">
    <div class="md:col-span-2"><label class="label">Buscar (código, asunto o palabras clave)</label><input v-model="f.q" class="input" placeholder="Ej. comprobantes enero" /></div>
    <div><label class="label">Serie</label><select v-model="f.nodoId" class="input"><option value="">Todas</option><option v-for="s in series" :key="s.id" :value="s.id">{{ s.codigo }} {{ s.nombre }}</option></select></div>
    <div v-if="verUnidades"><label class="label">Unidad de origen</label><select v-model="f.unidadId" class="input"><option value="">Todas</option><option v-for="u in unidades" :key="u.id" :value="u.id">{{ u.nombre }}</option></select></div>
    <div><label class="label">Fechas extremas: desde</label><input v-model="f.fechaDesde" type="date" class="input" /></div>
    <div><label class="label">Hasta</label><input v-model="f.fechaHasta" type="date" class="input" /></div>
    <div><label class="label">Código topográfico (caja)</label><input v-model="f.codigoTopografico" class="input" placeholder="CAJ-000001" /></div>
    <div><label class="label">Estado</label><select v-model="f.estado" class="input"><option value="">Todos</option><option v-for="x in ['EN_GESTION','EN_TRANSFERENCIA','EN_ARCHIVO_CENTRAL','PRESTADO','HISTORICO','ELIMINADO']" :key="x" :value="x">{{ etiqueta(x) }}</option></select></div>
    <div><label class="label">Foliación</label><select v-model="f.estadoFoliacion" class="input"><option value="">Todas</option><option v-for="x in ['SIN_FOLIAR','EN_PROCESO','FOLIADO']" :key="x" :value="x">{{ etiqueta(x) }}</option></select></div>
    <div class="flex items-end gap-2 md:col-span-3"><button class="btn-primary">Buscar</button><button type="button" class="btn-ghost" @click="limpiar">Limpiar</button></div>
    <div v-if="puedeCrear" class="flex items-end justify-end"><button type="button" class="btn-primary" @click="modal = true">+ Nuevo expediente</button></div>
  </form>

  <div class="table-wrap">
    <table class="w-full">
      <thead><tr><th class="th">Código</th><th class="th">Asunto</th><th class="th">Unidad</th><th class="th">Fechas extremas</th><th class="th">Fojas</th><th class="th">Estado</th><th class="th">Foliación</th><th class="th">Ubicación</th></tr></thead>
      <tbody :class="cargando ? 'opacity-50' : ''">
        <tr v-if="!res.items.length"><td colspan="8" class="td text-slate-500">No se encontraron expedientes.</td></tr>
        <tr v-for="e in res.items" :key="e.id">
          <td class="td whitespace-nowrap"><RouterLink :to="`/expedientes/${e.id}`" class="font-medium text-emerald-700 hover:underline dark:text-emerald-300">{{ e.codigo }}</RouterLink></td>
          <td class="td max-w-xs truncate" :title="e.asunto">{{ e.asunto }}</td>
          <td class="td">{{ e.unidadProductora?.sigla ?? e.unidadProductora?.nombre }}</td>
          <td class="td whitespace-nowrap">{{ fecha(e.fechaInicio) }} → {{ fecha(e.fechaFin) }}</td>
          <td class="td">{{ e.fojaFin ?? '—' }}</td>
          <td class="td"><Badge :valor="e.estado" /></td>
          <td class="td"><Badge :valor="e.estadoFoliacion" /></td>
          <td class="td font-mono text-xs">{{ e.caja ? `${e.caja.codigo}${e.carpeta ? ' · c' + e.carpeta : ''}` : '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <Paginacion :page="f.page" :limit="f.limit" :total="res.total" @cambiar="buscar" />

  <Modal :abierto="modal" titulo="Nuevo expediente" ancho="max-w-xl" @cerrar="modal = false">
    <form class="grid grid-cols-2 gap-3" @submit.prevent="crear">
      <div class="col-span-2"><label class="label">Serie / subserie documental</label>
        <select v-model="nuevo.nodoId" class="input" required><option value="" disabled>Selecciona…</option><option v-for="s in series" :key="s.id" :value="s.id">{{ s.codigo }} — {{ s.nombre }}</option></select></div>
      <div><label class="label">Gestión</label><input v-model="nuevo.gestion" type="number" min="1900" max="2200" class="input" required /></div>
      <div v-if="verUnidades"><label class="label">Unidad productora</label><select v-model="nuevo.unidadProductoraId" class="input" required><option value="" disabled>Selecciona…</option><option v-for="u in unidades" :key="u.id" :value="u.id">{{ u.nombre }}</option></select></div>
      <div v-else><label class="label">Nivel de acceso</label><select v-model="nuevo.sensibilidad" class="input"><option>PUBLICO</option><option>RESERVADO</option></select></div>
      <div class="col-span-2"><label class="label">Asunto / título</label><textarea v-model="nuevo.asunto" class="input" rows="2" required /></div>
      <div><label class="label">Fecha inicio</label><input v-model="nuevo.fechaInicio" type="date" class="input" required /></div>
      <div><label class="label">Fecha fin</label><input v-model="nuevo.fechaFin" type="date" class="input" :min="nuevo.fechaInicio" /></div>
      <div v-if="verUnidades"><label class="label">Nivel de acceso</label><select v-model="nuevo.sensibilidad" class="input"><option>PUBLICO</option><option>RESERVADO</option></select></div>
      <div :class="verUnidades ? '' : 'col-span-2'"><label class="label">Palabras clave (separadas por coma)</label><input v-model="nuevo.palabras" class="input" /></div>
      <p class="col-span-2 text-xs text-slate-500">El código se genera como Serie + Gestión + Correlativo.</p>
      <div class="col-span-2 flex justify-end gap-2"><button type="button" class="btn-ghost" @click="modal = false">Cancelar</button><button class="btn-primary">Crear expediente</button></div>
    </form>
  </Modal>
</template>
