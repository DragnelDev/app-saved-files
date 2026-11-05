<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AskModal from '@/components/AskModal.vue'
import Badge from '@/components/Badge.vue'
import Modal from '@/components/Modal.vue'
import { abrirEnPestana, api } from '@/lib/api'
import { fecha, fechaHora } from '@/lib/format'
import { error, ok } from '@/lib/toast'
import { useAuth } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
const auth = useAuth()
const esResp = auth.rol === 'ROLE_RESPONSABLE_UNIDAD' || auth.rol === 'ROLE_ADMIN'
const esArchivista = auth.tieneRol('ROLE_ARCHIVISTA')

const lista = ref<R[]>([])
const filtro = ref('')
const det = ref<R | null>(null)
const cajas = ref<R[]>([])
const edits = reactive<Record<string, R>>({})

const picker = ref(false)
const candidatos = ref<R[]>([])
const elegidos = ref<string[]>([])
const obs = ref('')
const unidades = ref<R[]>([])
const unidadOrigen = ref('')
const modoEditar = ref(false)
const ask = ref(false)

const editable = computed(() => esResp && det.value && ['BORRADOR', 'OBSERVADO'].includes(det.value.estado))

async function cargar() {
  try { lista.value = await api('/transferencias', { query: { estado: filtro.value } }) } catch (e) { error(e) }
}
async function abrir(id: string) {
  try {
    det.value = await api(`/transferencias/${id}`)
    for (const d of det.value!.detalles) edits[d.id] = { recibido: d.recibido ?? false, cajaId: d.cajaId ?? '', carpeta: d.carpeta ?? '', observacion: d.observacion ?? '' }
    if (esArchivista && !cajas.value.length) cajas.value = await api('/cajas')
  } catch (e) { error(e) }
}
async function refrescar() { await cargar(); if (det.value) await abrir(det.value.id) }
async function accion(ruta: string, msg: string, body?: unknown) {
  try { await api(`/transferencias/${det.value!.id}/${ruta}`, { method: 'POST', body: body ?? {} }); ok(msg); await refrescar() } catch (e) { error(e) }
}
async function verificar(d: R) {
  const e = edits[d.id]!
  try {
    await api(`/transferencias/${det.value!.id}/detalle/${d.id}`, { method: 'PUT', body: { recibido: e.recibido, observacion: e.observacion || undefined, cajaId: e.recibido ? e.cajaId || undefined : undefined, carpeta: e.recibido && e.carpeta ? Number(e.carpeta) : undefined } })
    ok('Recepción registrada'); await abrir(det.value!.id)
  } catch (er) { error(er) }
}
async function nueva() {
  modoEditar.value = false; elegidos.value = []; obs.value = ''
  try { candidatos.value = (await api('/expedientes', { query: { estado: 'EN_GESTION', limit: 200 } })).items; if (!esResp || auth.rol === 'ROLE_ADMIN') unidades.value = await api('/unidades'); picker.value = true } catch (e) { error(e) }
}
async function editar() {
  modoEditar.value = true; elegidos.value = det.value!.detalles.map((d: R) => d.expedienteId)
  try { candidatos.value = (await api('/expedientes', { query: { estado: 'EN_GESTION', limit: 200, unidadId: det.value!.unidadOrigenId } })).items; picker.value = true } catch (e) { error(e) }
}
async function guardarSeleccion() {
  try {
    if (modoEditar.value) { await api(`/transferencias/${det.value!.id}/expedientes`, { method: 'PUT', body: { expedienteIds: elegidos.value } }); ok('Inventario actualizado'); picker.value = false; await refrescar() }
    else { const t = await api('/transferencias', { body: { expedienteIds: elegidos.value, observaciones: obs.value || undefined, unidadOrigenId: unidadOrigen.value || undefined } }); ok(`Transferencia ${t.codigo} creada`); picker.value = false; await cargar(); await abrir(t.id) }
  } catch (e) { error(e) }
}
async function eliminar() { if (confirm('¿Eliminar el borrador?')) { try { await api(`/transferencias/${det.value!.id}`, { method: 'DELETE' }); det.value = null; ok('Borrador eliminado'); await cargar() } catch (e) { error(e) } } }
async function observar(texto: string) { ask.value = false; await accion('observar', 'Transferencia observada', { observaciones: texto }) }
const imprimir = () => abrirEnPestana(`/reportes/transferencias/${det.value!.id}/inventario`).catch(error)
onMounted(cargar)
</script>

<template>
  <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div><label class="label">Estado</label><select v-model="filtro" class="input w-56" @change="cargar"><option value="">Todos</option><option v-for="x in ['BORRADOR','ENVIADO','EN_REVISION','APROBADO_Y_RECIBIDO','OBSERVADO']" :key="x" :value="x">{{ x.replaceAll('_', ' ') }}</option></select></div>
    <button v-if="auth.rol === 'ROLE_RESPONSABLE_UNIDAD'" class="btn-primary" @click="nueva">+ Nueva transferencia</button>
  </div>

  <div class="table-wrap">
    <table class="w-full">
      <thead><tr><th class="th">Código</th><th class="th">Unidad de origen</th><th class="th">Expedientes</th><th class="th">Estado</th><th class="th">Envío</th><th class="th" /></tr></thead>
      <tbody>
        <tr v-if="!lista.length"><td colspan="6" class="td text-slate-500">No hay transferencias.</td></tr>
        <tr v-for="t in lista" :key="t.id">
          <td class="td font-medium">{{ t.codigo }}</td><td class="td">{{ t.unidadOrigen?.nombre }}</td><td class="td">{{ t.totalExpedientes }}</td>
          <td class="td"><Badge :valor="t.estado" /></td><td class="td">{{ fecha(t.fechaEnvio) }}</td>
          <td class="td text-right"><button class="btn-ghost" @click="abrir(t.id)">Abrir</button></td>
        </tr>
      </tbody>
    </table>
  </div>

  <Modal :abierto="!!det" :titulo="`Transferencia ${det?.codigo}`" ancho="max-w-5xl" @cerrar="det = null">
    <div v-if="det" class="space-y-4">
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <Badge :valor="det.estado" /><span>{{ det.unidadOrigen?.nombre }}</span><span class="text-slate-500">Envío: {{ fechaHora(det.fechaEnvio) }} · Recepción: {{ fechaHora(det.fechaRecepcion) }}</span>
      </div>
      <p v-if="det.observaciones" class="rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"><strong>Observaciones:</strong> {{ det.observaciones }}</p>

      <div class="table-wrap">
        <table class="w-full">
          <thead><tr><th class="th">Expediente</th><th class="th">Asunto</th><th class="th">Fojas</th><th class="th">Foliación</th><th v-if="det.estado !== 'BORRADOR'" class="th">Recepción física</th></tr></thead>
          <tbody>
            <tr v-for="d in det.detalles" :key="d.id">
              <td class="td font-mono text-xs">{{ d.expediente.codigo }}</td><td class="td">{{ d.expediente.asunto }}</td><td class="td">{{ d.expediente.fojaFin ?? '—' }}</td><td class="td"><Badge :valor="d.expediente.estadoFoliacion" /></td>
              <td v-if="det.estado !== 'BORRADOR'" class="td">
                <div v-if="esArchivista && det.estado === 'EN_REVISION'" class="flex flex-wrap items-center gap-2">
                  <label class="flex items-center gap-1 text-xs"><input v-model="edits[d.id]!.recibido" type="checkbox" /> Recibido</label>
                  <select v-if="edits[d.id]!.recibido" v-model="edits[d.id]!.cajaId" class="input w-36"><option value="">Caja…</option><option v-for="c in cajas" :key="c.id" :value="c.id">{{ c.codigo }}</option></select>
                  <input v-if="edits[d.id]!.recibido" v-model="edits[d.id]!.carpeta" type="number" min="1" class="input w-20" placeholder="Carp." />
                  <button class="btn-ghost" @click="verificar(d)">Guardar</button>
                </div>
                <span v-else class="text-xs">{{ d.recibido === null ? 'Pendiente' : d.recibido ? '✔ Recibido' : '✖ No recibido' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap justify-between gap-2">
        <button class="btn-ghost" @click="imprimir">🖨 Acta e inventario (PDF)</button>
        <div class="flex flex-wrap gap-2">
          <template v-if="editable"><button class="btn-ghost" @click="editar">Editar expedientes</button><button v-if="det.estado === 'BORRADOR'" class="btn-ghost text-rose-600" @click="eliminar">Eliminar</button><button class="btn-primary" @click="accion('enviar', 'Transferencia enviada')">Enviar al Archivo Central</button></template>
          <template v-if="esArchivista">
            <button v-if="det.estado === 'ENVIADO'" class="btn-primary" @click="accion('iniciar-revision', 'Revisión iniciada')">Iniciar revisión</button>
            <template v-if="det.estado === 'EN_REVISION'"><button class="btn-ghost text-rose-600" @click="ask = true">Observar</button><button class="btn-primary" @click="accion('aprobar', 'Transferencia aprobada y recibida')">Aprobar y recibir</button></template>
          </template>
        </div>
      </div>
    </div>
  </Modal>

  <Modal :abierto="picker" :titulo="modoEditar ? 'Editar expedientes de la transferencia' : 'Nueva transferencia'" ancho="max-w-2xl" @cerrar="picker = false">
    <div class="space-y-3">
      <div v-if="!modoEditar && unidades.length"><label class="label">Unidad de origen</label><select v-model="unidadOrigen" class="input"><option value="">Selecciona…</option><option v-for="u in unidades" :key="u.id" :value="u.id">{{ u.nombre }}</option></select></div>
      <p class="text-sm text-slate-500">Expedientes de tu unidad en archivo de gestión:</p>
      <div class="max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <p v-if="!candidatos.length" class="p-3 text-sm text-slate-500">No hay expedientes disponibles para transferir.</p>
        <label v-for="c in candidatos" :key="c.id" class="flex cursor-pointer items-start gap-2 border-b border-slate-100 p-2 text-sm last:border-0 dark:border-slate-700">
          <input v-model="elegidos" type="checkbox" :value="c.id" class="mt-1" /><span><strong class="font-mono text-xs">{{ c.codigo }}</strong> — {{ c.asunto }}</span>
        </label>
      </div>
      <div v-if="!modoEditar"><label class="label">Observaciones</label><textarea v-model="obs" class="input" rows="2" /></div>
      <div class="flex justify-end gap-2"><button class="btn-ghost" @click="picker = false">Cancelar</button><button class="btn-primary" :disabled="!elegidos.length" @click="guardarSeleccion">{{ modoEditar ? 'Guardar' : `Crear borrador (${elegidos.length})` }}</button></div>
    </div>
  </Modal>

  <AskModal :abierto="ask" titulo="Observar transferencia" etiqueta="Motivo de la observación" requerido boton="Observar" @cerrar="ask = false" @aceptar="observar" />
</template>
