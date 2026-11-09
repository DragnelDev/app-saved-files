<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AskModal from '@/components/AskModal.vue'
import Badge from '@/components/Badge.vue'
import Modal from '@/components/Modal.vue'
import { abrirEnPestana, api } from '@/lib/api'
import { fecha } from '@/lib/format'
import { error, ok } from '@/lib/toast'
import { useAuth } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
const auth = useAuth()
const esArchivista = auth.tieneRol('ROLE_ARCHIVISTA')
const puedeSolicitar = auth.tieneRol('ROLE_ARCHIVISTA', 'ROLE_RESPONSABLE_UNIDAD')
const esResp = auth.rol === 'ROLE_RESPONSABLE_UNIDAD'

const lista = ref<R[]>([])
const filtro = ref('')
const det = ref<R | null>(null)
const aDevolver = ref<string[]>([])
const modal = ref(false)
const disponibles = ref<R[]>([])
const busqueda = ref('')
const totalDisponibles = ref(0)
let temporizador: ReturnType<typeof setTimeout> | undefined
async function cargarDisponibles() {
  const r = await api('/expedientes', { query: { estado: 'EN_ARCHIVO_CENTRAL', limit: 100, q: busqueda.value || undefined } })
  disponibles.value = r.items
  totalDisponibles.value = r.total
}
function buscarDisponibles() { clearTimeout(temporizador); temporizador = setTimeout(() => cargarDisponibles().catch(error), 300) }
const unidades = ref<R[]>([])
const elegidos = ref<string[]>([])
const f = reactive({ tipoSolicitante: 'UNIDAD', solicitanteNombre: '', unidadSolicitanteId: '', motivo: '' })
const accion = ref<'entregar' | 'rechazar' | 'devolver' | null>(null)

const hoy = new Date().toISOString().slice(0, 10)
const pendientes = computed(() => (det.value?.detalles ?? []).filter((d: R) => !d.fechaDevolucionReal))
const codigos = (p: R) => (p.detalles ?? []).map((d: R) => d.expediente?.codigo).join(', ')

async function cargar() { try { lista.value = await api('/prestamos', { query: { estado: filtro.value } }) } catch (e) { error(e) } }
async function abrir(p: R) { det.value = await api(`/prestamos/${p.id}`); aDevolver.value = [] }
async function refrescar() { await cargar(); if (det.value) { try { await abrir(det.value) } catch { det.value = null } } }
async function nuevo() {
  Object.assign(f, { tipoSolicitante: 'UNIDAD', solicitanteNombre: '', unidadSolicitanteId: '', motivo: '' }); elegidos.value = []
  try {
    busqueda.value = ''
    await cargarDisponibles()
    if (!esResp) unidades.value = await api('/unidades')
    modal.value = true
  } catch (e) { error(e) }
}
async function solicitar() {
  try {
    const p = await api('/prestamos', { body: { expedienteIds: elegidos.value, tipoSolicitante: f.tipoSolicitante, motivo: f.motivo, solicitanteNombre: f.solicitanteNombre || undefined, unidadSolicitanteId: f.tipoSolicitante === 'UNIDAD' && !esResp ? f.unidadSolicitanteId : undefined } })
    ok(`Solicitud ${p.codigo} registrada (${p.detalles.length} expediente/s)`); modal.value = false; await cargar()
  } catch (e) { error(e) }
}
async function ejecutar(valor: string) {
  const a = accion.value; accion.value = null
  const id = det.value!.id
  try {
    if (a === 'entregar') await api(`/prestamos/${id}/entregar`, { body: { diasPrestamo: Number(valor) || 15 } })
    if (a === 'rechazar') { await api(`/prestamos/${id}/rechazar`, { body: { motivo: valor } }); det.value = null }
    if (a === 'devolver') await api(`/prestamos/${id}/devolver`, { body: { observaciones: valor || undefined, detalleIds: aDevolver.value.length ? aDevolver.value : undefined } })
    ok('Operación realizada'); await refrescar()
  } catch (e) { error(e) }
}
const acta = (p: R) => abrirEnPestana(`/reportes/prestamos/${p.id}/acta`).catch(error)
onMounted(cargar)
</script>

<template>
  <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div><label class="label">Estado</label><select v-model="filtro" class="input w-48" @change="cargar"><option value="">Todos</option><option v-for="x in ['SOLICITADO','PRESTADO','DEVUELTO','EN_MORA']" :key="x" :value="x">{{ x.replace('_', ' ') }}</option></select></div>
    <button v-if="puedeSolicitar" class="btn-primary" @click="nuevo">+ Solicitar préstamo</button>
  </div>

  <div class="table-wrap">
    <table class="w-full">
      <thead><tr><th class="th">Acta</th><th class="th">Expedientes</th><th class="th">Solicitante</th><th class="th">Devolución prevista</th><th class="th">Estado</th><th class="th" /></tr></thead>
      <tbody>
        <tr v-if="!lista.length"><td colspan="6" class="td text-slate-500">No hay préstamos.</td></tr>
        <tr v-for="p in lista" :key="p.id" :class="p.estado === 'EN_MORA' ? 'bg-rose-50/60 dark:bg-rose-950/30' : ''">
          <td class="td font-medium">{{ p.codigo }}</td>
          <td class="td max-w-xs"><span class="font-medium">{{ p.detalles?.length }} exp.</span> <span class="block truncate font-mono text-xs text-slate-500" :title="codigos(p)">{{ codigos(p) }}</span></td>
          <td class="td">{{ p.solicitanteNombre }} <span class="text-xs text-slate-500">({{ p.tipoSolicitante.toLowerCase() }})</span></td>
          <td class="td" :class="p.estado === 'EN_MORA' ? 'font-semibold text-rose-600' : ''">{{ fecha(p.fechaDevolucionPrevista) }}<span v-if="p.estado === 'PRESTADO' && p.fechaDevolucionPrevista === hoy" class="ml-1 text-xs text-amber-600">(vence hoy)</span></td>
          <td class="td"><Badge :valor="p.estado" /></td>
          <td class="td text-right"><button class="btn-ghost" @click="abrir(p)">Abrir</button></td>
        </tr>
      </tbody>
    </table>
  </div>

  <Modal :abierto="!!det" :titulo="`Acta de préstamo ${det?.codigo}`" ancho="max-w-3xl" @cerrar="det = null">
    <div v-if="det" class="space-y-4">
      <div class="flex flex-wrap items-center gap-3 text-sm"><Badge :valor="det.estado" /><span>{{ det.solicitanteNombre }}<span v-if="det.unidadSolicitante"> — {{ det.unidadSolicitante.nombre }}</span></span></div>
      <p class="text-sm"><strong>Motivo:</strong> {{ det.motivo }}</p>
      <p class="text-xs text-slate-500">Solicitud {{ fecha(det.fechaSolicitud) }} · Préstamo {{ fecha(det.fechaPrestamo) }} · Devolución prevista {{ fecha(det.fechaDevolucionPrevista) }}</p>
      <div class="table-wrap">
        <table class="w-full">
          <thead><tr><th v-if="esArchivista && ['PRESTADO','EN_MORA'].includes(det.estado)" class="th" /><th class="th">Expediente</th><th class="th">Fojas</th><th class="th">Devolución</th></tr></thead>
          <tbody>
            <tr v-for="d in det.detalles" :key="d.id">
              <td v-if="esArchivista && ['PRESTADO','EN_MORA'].includes(det.estado)" class="td"><input v-if="!d.fechaDevolucionReal" v-model="aDevolver" type="checkbox" :value="d.id" :aria-label="`Devolver ${d.expediente.codigo}`" /></td>
              <td class="td"><RouterLink :to="`/expedientes/${d.expedienteId}`" class="font-mono text-xs text-emerald-700 hover:underline dark:text-emerald-300">{{ d.expediente.codigo }}</RouterLink><div class="text-xs text-slate-500">{{ d.expediente.asunto }}</div></td>
              <td class="td">{{ d.fojasEntregadas ?? d.expediente.fojaFin ?? '—' }}</td>
              <td class="td text-xs">{{ d.fechaDevolucionReal ? `Devuelto ${fecha(d.fechaDevolucionReal)}` : det.estado === 'SOLICITADO' ? '—' : 'Pendiente' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap justify-between gap-2">
        <button v-if="det.estado !== 'SOLICITADO'" class="btn-ghost" @click="acta(det)">🖨 Acta de préstamo (PDF)</button><span v-else />
        <div v-if="esArchivista" class="flex flex-wrap gap-2">
          <template v-if="det.estado === 'SOLICITADO'"><button class="btn-ghost text-rose-600" @click="accion = 'rechazar'">Rechazar</button><button class="btn-primary" @click="accion = 'entregar'">Autorizar y entregar</button></template>
          <button v-if="['PRESTADO','EN_MORA'].includes(det.estado)" class="btn-primary" @click="accion = 'devolver'">{{ aDevolver.length ? `Devolver ${aDevolver.length} seleccionado(s)` : `Devolver todo (${pendientes.length})` }}</button>
        </div>
      </div>
    </div>
  </Modal>

  <Modal :abierto="modal" titulo="Solicitar préstamo de expedientes" ancho="max-w-2xl" @cerrar="modal = false">
    <form class="space-y-3" @submit.prevent="solicitar">
      <div>
        <label class="label">Expedientes en el Archivo Central ({{ elegidos.length }} seleccionados)</label>
        <input v-model="busqueda" class="input mb-1" placeholder="Buscar por código, asunto o palabra clave…" aria-label="Buscar expedientes" @input="buscarDisponibles" />
        <p class="mb-1 text-xs text-slate-500">Mostrando {{ disponibles.length }} de {{ totalDisponibles }}<span v-if="totalDisponibles > disponibles.length"> — usa la búsqueda para encontrar los demás</span></p>
        <div class="max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <p v-if="!disponibles.length" class="p-3 text-sm text-slate-500">No hay expedientes disponibles en el Archivo Central.</p>
          <label v-for="e in disponibles" :key="e.id" class="flex cursor-pointer items-start gap-2 border-b border-slate-100 p-2 text-sm last:border-0 dark:border-slate-700"><input v-model="elegidos" type="checkbox" :value="e.id" class="mt-1" /><span><strong class="font-mono text-xs">{{ e.codigo }}</strong> — {{ e.asunto }}</span></label>
        </div>
      </div>
      <div v-if="!esResp"><label class="label">Solicitante</label><select v-model="f.tipoSolicitante" class="input"><option value="UNIDAD">Unidad interna</option><option value="AUDITOR">Auditor</option></select></div>
      <div v-if="!esResp && f.tipoSolicitante === 'UNIDAD'"><label class="label">Unidad</label><select v-model="f.unidadSolicitanteId" class="input" required><option value="" disabled>Selecciona…</option><option v-for="u in unidades" :key="u.id" :value="u.id">{{ u.nombre }}</option></select></div>
      <div v-if="f.tipoSolicitante === 'AUDITOR' || !esResp"><label class="label">{{ f.tipoSolicitante === 'AUDITOR' ? 'Nombre del auditor' : 'Persona que recibe (opcional)' }}</label><input v-model="f.solicitanteNombre" class="input" :required="f.tipoSolicitante === 'AUDITOR'" /></div>
      <div><label class="label">Motivo</label><textarea v-model="f.motivo" class="input" rows="2" required /></div>
      <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="modal = false">Cancelar</button><button class="btn-primary" :disabled="!elegidos.length">Solicitar ({{ elegidos.length }})</button></div>
    </form>
  </Modal>

  <AskModal
    :abierto="!!accion"
    :titulo="accion === 'entregar' ? 'Autorizar y entregar' : accion === 'rechazar' ? 'Rechazar solicitud' : 'Registrar devolución'"
    :etiqueta="accion === 'entregar' ? 'Días de préstamo (máx. 90)' : accion === 'rechazar' ? 'Motivo del rechazo' : 'Observaciones (estado en que se devuelve)'"
    :tipo="accion === 'entregar' ? 'number' : 'text'" :inicial="accion === 'entregar' ? '15' : ''" :requerido="accion === 'rechazar'"
    @cerrar="accion = null" @aceptar="ejecutar"
  />
</template>
