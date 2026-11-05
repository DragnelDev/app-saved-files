<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import Badge from '@/components/Badge.vue'
import Modal from '@/components/Modal.vue'
import { abrirEnPestana, api } from '@/lib/api'
import { etiqueta, fecha, fechaHora } from '@/lib/format'
import { error, ok } from '@/lib/toast'
import { useAuth } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
const TIPOS = ['CONSERVACION_PERMANENTE', 'SELECCION_MUESTREO', 'ELIMINACION']
const auth = useAuth()
const esArchivista = auth.tieneRol('ROLE_ARCHIVISTA')

const tab = ref<'vencidos' | 'propuestas'>('vencidos')
const tipo = ref('')
const vencidos = ref<R[]>([])
const elegidos = ref<string[]>([])
const propuestas = ref<R[]>([])
const det = ref<R | null>(null)

const modalNueva = ref(false)
const justificacion = ref('')
const modalResolver = ref(false)
const res = reactive({ aprobada: true, actaNumero: '', actaFecha: new Date().toISOString().slice(0, 10), observaciones: '' })

async function cargarVencidos() {
  elegidos.value = []
  try { vencidos.value = await api('/disposicion/vencidos', { query: { tipo: tipo.value } }) } catch (e) { error(e) }
}
async function cargarPropuestas() { try { propuestas.value = await api('/disposicion/propuestas') } catch (e) { error(e) } }
async function abrir(id: string) { try { det.value = await api(`/disposicion/propuestas/${id}`) } catch (e) { error(e) } }
async function refrescar() { await Promise.all([cargarPropuestas(), cargarVencidos()]); if (det.value) await abrir(det.value.id) }

async function crear() {
  try {
    const p = await api('/disposicion/propuestas', { body: { tipo: tipo.value, expedienteIds: elegidos.value, justificacion: justificacion.value } })
    ok(`Propuesta ${p.codigo} creada`); modalNueva.value = false; justificacion.value = ''; tab.value = 'propuestas'; await refrescar(); await abrir(p.id)
  } catch (e) { error(e) }
}
async function accion(ruta: string, msg: string, confirmar?: string, metodo = 'POST') {
  if (confirmar && !confirm(confirmar)) return
  try { await api(`/disposicion/propuestas/${det.value!.id}/${ruta}`, { method: metodo }); ok(msg); await refrescar() } catch (e) { error(e) }
}
async function eliminar() {
  if (!confirm('¿Eliminar el borrador?')) return
  try { await api(`/disposicion/propuestas/${det.value!.id}`, { method: 'DELETE' }); det.value = null; ok('Borrador eliminado'); await refrescar() } catch (e) { error(e) }
}
async function resolver() {
  try {
    await api(`/disposicion/propuestas/${det.value!.id}/resolver`, { body: { aprobada: res.aprobada, actaNumero: res.aprobada ? res.actaNumero : undefined, actaFecha: res.aprobada ? res.actaFecha : undefined, observaciones: res.observaciones || undefined } })
    ok(res.aprobada ? 'Propuesta aprobada' : 'Propuesta rechazada'); modalResolver.value = false; await refrescar()
  } catch (e) { error(e) }
}
async function decidir(d: R, resolucion: string) {
  try { det.value = await api(`/disposicion/propuestas/${det.value!.id}/detalle/${d.id}`, { method: 'PUT', body: { resolucion } }) } catch (e) { error(e) }
}
const imprimir = () => abrirEnPestana(`/reportes/disposicion/${det.value!.id}/acta`).catch(error)
onMounted(() => { cargarVencidos(); cargarPropuestas() })
</script>

<template>
  <div class="mb-4 flex gap-2">
    <button :class="tab === 'vencidos' ? 'btn-primary' : 'btn-ghost'" @click="tab = 'vencidos'">Plazo de retención cumplido ({{ vencidos.length }})</button>
    <button :class="tab === 'propuestas' ? 'btn-primary' : 'btn-ghost'" @click="tab = 'propuestas'">Propuestas y actas de la Comisión ({{ propuestas.length }})</button>
  </div>

  <section v-if="tab === 'vencidos'" class="space-y-3">
    <div class="card flex flex-wrap items-end justify-between gap-3">
      <div><label class="label">Disposición final según la TRD</label>
        <select v-model="tipo" class="input w-72" @change="cargarVencidos"><option value="">Todas</option><option v-for="t in TIPOS" :key="t" :value="t">{{ etiqueta(t) }}</option></select></div>
      <div v-if="esArchivista" class="text-right">
        <button class="btn-primary" :disabled="!tipo || !elegidos.length" @click="modalNueva = true">Crear propuesta ({{ elegidos.length }})</button>
        <p v-if="!tipo" class="mt-1 text-xs text-slate-500">Filtra por una disposición: cada propuesta agrupa un solo tipo.</p>
      </div>
    </div>
    <div class="table-wrap">
      <table class="w-full">
        <thead><tr><th v-if="esArchivista" class="th" /><th class="th">Expediente</th><th class="th">Asunto</th><th class="th">Fecha fin</th><th class="th">Plazo cumplido en</th><th class="th">Disposición</th></tr></thead>
        <tbody>
          <tr v-if="!vencidos.length"><td colspan="6" class="td text-slate-500">Ningún expediente cumplió su plazo de retención (o ya están en una propuesta).</td></tr>
          <tr v-for="v in vencidos" :key="v.id">
            <td v-if="esArchivista" class="td"><input v-model="elegidos" type="checkbox" :value="v.id" :disabled="!tipo" :aria-label="`Seleccionar ${v.codigo}`" /></td>
            <td class="td"><RouterLink :to="`/expedientes/${v.id}`" class="font-mono text-xs text-emerald-700 hover:underline dark:text-emerald-300">{{ v.codigo }}</RouterLink></td>
            <td class="td">{{ v.asunto }}</td><td class="td">{{ fecha(v.fechaFin) }}</td><td class="td">{{ v.anioCumplimiento }}</td><td class="td">{{ etiqueta(v.disposicionFinal) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section v-else class="table-wrap">
    <table class="w-full">
      <thead><tr><th class="th">Propuesta</th><th class="th">Disposición</th><th class="th">Expedientes</th><th class="th">Acta de la Comisión</th><th class="th">Estado</th><th class="th" /></tr></thead>
      <tbody>
        <tr v-if="!propuestas.length"><td colspan="6" class="td text-slate-500">Aún no hay propuestas.</td></tr>
        <tr v-for="p in propuestas" :key="p.id">
          <td class="td font-medium">{{ p.codigo }}</td><td class="td">{{ etiqueta(p.tipo) }}</td><td class="td">{{ p.totalExpedientes }}</td><td class="td">{{ p.actaNumero ?? '—' }}</td><td class="td"><Badge :valor="p.estado" /></td>
          <td class="td text-right"><button class="btn-ghost" @click="abrir(p.id)">Abrir</button></td>
        </tr>
      </tbody>
    </table>
  </section>

  <Modal :abierto="!!det" :titulo="`Propuesta ${det?.codigo}`" ancho="max-w-4xl" @cerrar="det = null">
    <div v-if="det" class="space-y-4">
      <div class="flex flex-wrap items-center gap-3 text-sm"><Badge :valor="det.estado" /><strong>{{ etiqueta(det.tipo) }}</strong>
        <span class="text-slate-500">Presentada: {{ fechaHora(det.fechaPresentacion) }} · Resuelta: {{ fechaHora(det.fechaResolucion) }} · Ejecutada: {{ fechaHora(det.fechaEjecucion) }}</span></div>
      <p class="text-sm"><strong>Justificación:</strong> {{ det.justificacion }}</p>
      <p v-if="det.actaNumero" class="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"><strong>Acta de la Comisión:</strong> {{ det.actaNumero }} del {{ fecha(det.actaFecha) }}<span v-if="det.observacionesComision"> — {{ det.observacionesComision }}</span></p>
      <p v-else-if="det.observacionesComision" class="rounded-lg bg-rose-50 p-2 text-sm text-rose-900 dark:bg-rose-900/30 dark:text-rose-100"><strong>Observaciones de la Comisión:</strong> {{ det.observacionesComision }}</p>

      <div class="table-wrap">
        <table class="w-full">
          <thead><tr><th class="th">Expediente</th><th class="th">Asunto</th><th class="th">Estado actual</th><th v-if="det.tipo === 'SELECCION_MUESTREO' && ['APROBADA','EJECUTADA'].includes(det.estado)" class="th">Decisión</th></tr></thead>
          <tbody>
            <tr v-for="d in det.detalles" :key="d.id">
              <td class="td font-mono text-xs">{{ d.expediente.codigo }}</td><td class="td">{{ d.expediente.asunto }}</td><td class="td"><Badge :valor="d.expediente.estado" /></td>
              <td v-if="det.tipo === 'SELECCION_MUESTREO' && ['APROBADA','EJECUTADA'].includes(det.estado)" class="td">
                <select v-if="det.estado === 'APROBADA' && esArchivista" class="input w-36" :value="d.resolucion ?? ''" @change="decidir(d, ($event.target as HTMLSelectElement).value)"><option value="" disabled>Decidir…</option><option value="CONSERVAR">Conservar</option><option value="ELIMINAR">Eliminar</option></select>
                <span v-else class="text-xs">{{ etiqueta(d.resolucion) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap justify-between gap-2">
        <button class="btn-ghost" @click="imprimir">🖨 Acta (PDF)</button>
        <div v-if="esArchivista" class="flex flex-wrap gap-2">
          <template v-if="det.estado === 'BORRADOR'"><button class="btn-ghost text-rose-600" @click="eliminar">Eliminar</button><button class="btn-primary" @click="accion('presentar', 'Presentada a la Comisión')">Presentar a la Comisión</button></template>
          <button v-if="det.estado === 'EN_COMISION'" class="btn-primary" @click="modalResolver = true">Registrar resolución de la Comisión</button>
          <button v-if="det.estado === 'APROBADA'" class="btn-danger" @click="accion('ejecutar', 'Disposición ejecutada', `Se ejecutará la disposición sobre ${det.detalles.length} expediente(s). Las bajas son definitivas. ¿Continuar?`)">Ejecutar disposición</button>
        </div>
      </div>
    </div>
  </Modal>

  <Modal :abierto="modalNueva" titulo="Nueva propuesta de disposición final" @cerrar="modalNueva = false">
    <form class="space-y-3" @submit.prevent="crear">
      <p class="text-sm">{{ elegidos.length }} expediente(s) · <strong>{{ etiqueta(tipo) }}</strong></p>
      <div><label class="label">Justificación</label><textarea v-model="justificacion" class="input" rows="3" required placeholder="Ej. Plazo de retención cumplido según la TRD vigente." /></div>
      <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="modalNueva = false">Cancelar</button><button class="btn-primary">Crear borrador</button></div>
    </form>
  </Modal>

  <Modal :abierto="modalResolver" titulo="Resolución de la Comisión de Valoración" @cerrar="modalResolver = false">
    <form class="space-y-3" @submit.prevent="resolver">
      <div class="flex gap-4 text-sm"><label class="flex items-center gap-1"><input v-model="res.aprobada" type="radio" :value="true" /> Aprobada</label><label class="flex items-center gap-1"><input v-model="res.aprobada" type="radio" :value="false" /> Rechazada</label></div>
      <div v-if="res.aprobada" class="grid grid-cols-2 gap-3">
        <div><label class="label">N° de acta</label><input v-model="res.actaNumero" class="input" required maxlength="40" /></div>
        <div><label class="label">Fecha del acta</label><input v-model="res.actaFecha" type="date" class="input" required /></div>
      </div>
      <div><label class="label">{{ res.aprobada ? 'Observaciones (opcional)' : 'Motivo del rechazo' }}</label><textarea v-model="res.observaciones" class="input" rows="2" :required="!res.aprobada" /></div>
      <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="modalResolver = false">Cancelar</button><button class="btn-primary">Registrar</button></div>
    </form>
  </Modal>
</template>
