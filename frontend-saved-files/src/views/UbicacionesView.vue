<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Modal from '@/components/Modal.vue'
import TreeNode from '@/components/TreeNode.vue'
import { abrirEnPestana, api } from '@/lib/api'
import { etiqueta } from '@/lib/format'
import { error, ok } from '@/lib/toast'
import { useAuth } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
const HIJO: Record<string, string | null> = { '': 'DEPOSITO', DEPOSITO: 'ESTANTE', ESTANTE: 'CUERPO', CUERPO: 'BALDA', BALDA: null }
const auth = useAuth()
const puedeEscribir = auth.tieneRol('ROLE_ARCHIVISTA')

const arbol = ref<R[]>([])
const cajas = ref<R[]>([])
const sel = ref<R | null>(null)
const detalleCaja = ref<R | null>(null)
const modalUbic = ref(false)
const modalCaja = ref(false)
const form = reactive({ tipo: 'DEPOSITO', codigo: '', nombre: '', capacidadCajas: 10 })
const cajaForm = reactive({ descripcion: '', capacidadCarpetas: 20 })
const tipoHijo = computed(() => HIJO[sel.value?.tipo ?? ''])
const cajasDeSel = computed(() => (sel.value?.tipo === 'BALDA' ? cajas.value.filter((c) => c.baldaId === sel.value!.id) : []))

function buscar(nodos: R[], id: string): R | null {
  for (const n of nodos) { if (n.id === id) return n; const h = buscar(n.hijos, id); if (h) return h }
  return null
}
async function cargar() {
  try {
    ;[arbol.value, cajas.value] = await Promise.all([api('/ubicaciones/arbol'), api('/cajas')])
    if (sel.value) sel.value = buscar(arbol.value, sel.value.id)
  } catch (e) { error(e) }
}
function nueva(raiz: boolean) {
  Object.assign(form, { tipo: raiz ? 'DEPOSITO' : (tipoHijo.value ?? 'DEPOSITO'), codigo: '', nombre: '', capacidadCajas: 10 })
  modalUbic.value = true
}
async function guardar() {
  try {
    const raiz = form.tipo === 'DEPOSITO'
    await api('/ubicaciones', { body: { tipo: form.tipo, codigo: form.codigo, nombre: form.nombre, padreId: raiz ? undefined : sel.value?.id, capacidadCajas: form.tipo === 'BALDA' ? Number(form.capacidadCajas) : undefined } })
    ok('Ubicación creada'); modalUbic.value = false; await cargar()
  } catch (e) { error(e) }
}
async function eliminar() {
  if (!sel.value || !confirm(`¿Dar de baja ${sel.value.codigo}?`)) return
  try { await api(`/ubicaciones/${sel.value.id}`, { method: 'DELETE' }); sel.value = null; ok('Ubicación dada de baja'); await cargar() } catch (e) { error(e) }
}
async function crearCaja() {
  try { await api('/cajas', { body: { baldaId: sel.value!.id, descripcion: cajaForm.descripcion || undefined, capacidadCarpetas: Number(cajaForm.capacidadCarpetas) } }); ok('Caja creada'); modalCaja.value = false; cajaForm.descripcion = ''; await cargar() } catch (e) { error(e) }
}
async function verCaja(c: R) { try { detalleCaja.value = await api(`/cajas/${c.id}`) } catch (e) { error(e) } }
const imprimir = (ruta: string) => abrirEnPestana(ruta).catch(error)
onMounted(cargar)
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-5">
    <section class="card lg:col-span-2">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="font-semibold">Depósito › Estante › Cuerpo › Balda</h2>
        <button v-if="puedeEscribir" class="btn-primary" @click="nueva(true)">+ Depósito</button>
      </div>
      <p v-if="!arbol.length" class="text-sm text-slate-500">Aún no hay depósitos registrados.</p>
      <TreeNode v-for="n in arbol" :key="n.id" :nodo="n" :seleccionado="sel?.id" @seleccionar="sel = $event" />
    </section>

    <section class="space-y-4 lg:col-span-3">
      <div class="card">
        <p v-if="!sel" class="text-sm text-slate-500">Selecciona una ubicación.</p>
        <div v-else class="space-y-3">
          <div><div class="text-xs uppercase text-slate-500">{{ etiqueta(sel.tipo) }}</div><h3 class="text-lg font-semibold">{{ sel.codigo }} — {{ sel.nombre }}</h3>
            <p v-if="sel.tipo === 'BALDA'" class="text-sm text-slate-500">{{ sel.cajas }} de {{ sel.capacidadCajas }} cajas ocupadas</p></div>
          <div v-if="puedeEscribir" class="flex flex-wrap gap-2">
            <button v-if="tipoHijo" class="btn-ghost" @click="nueva(false)">+ {{ etiqueta(tipoHijo) }}</button>
            <button v-if="sel.tipo === 'BALDA'" class="btn-primary" @click="modalCaja = true">+ Caja archivadora</button>
            <button class="btn-ghost text-rose-600" @click="eliminar">Dar de baja</button>
          </div>
          <div v-if="cajasDeSel.length"><h4 class="mb-1 text-sm font-semibold">Cajas en esta balda</h4>
            <button v-for="c in cajasDeSel" :key="c.id" class="mr-2 rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700" @click="verCaja(c)">{{ c.codigo }} ({{ c.carpetas }})</button></div>
        </div>
      </div>

      <div class="table-wrap">
        <table class="w-full">
          <thead><tr><th class="th">Caja</th><th class="th">Ubicación</th><th class="th">Carpetas</th><th class="th">Descripción</th><th class="th" /></tr></thead>
          <tbody>
            <tr v-if="!cajas.length"><td colspan="5" class="td text-slate-500">Sin cajas registradas.</td></tr>
            <tr v-for="c in cajas" :key="c.id">
              <td class="td font-mono font-medium">{{ c.codigo }}</td><td class="td">{{ c.ruta }}</td><td class="td">{{ c.carpetas }}/{{ c.capacidadCarpetas }}</td><td class="td">{{ c.descripcion ?? '—' }}</td>
              <td class="td whitespace-nowrap text-right">
                <button class="btn-ghost" @click="verCaja(c)">Ver</button>
                <button v-if="puedeEscribir" class="btn-ghost ml-1" @click="imprimir(`/reportes/cajas/${c.id}/etiqueta`)">Etiqueta</button>
                <button class="btn-ghost ml-1" @click="imprimir(`/cajas/${c.id}/qr`)">QR</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <Modal :abierto="modalUbic" :titulo="`Nuevo ${etiqueta(form.tipo).toLowerCase()}`" @cerrar="modalUbic = false">
    <form class="space-y-3" @submit.prevent="guardar">
      <div><label class="label">Código</label><input v-model="form.codigo" class="input" required maxlength="20" /></div>
      <div><label class="label">Nombre</label><input v-model="form.nombre" class="input" required maxlength="120" /></div>
      <div v-if="form.tipo === 'BALDA'"><label class="label">Capacidad (cajas)</label><input v-model="form.capacidadCajas" type="number" min="1" class="input" required /></div>
      <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="modalUbic = false">Cancelar</button><button class="btn-primary">Crear</button></div>
    </form>
  </Modal>

  <Modal :abierto="modalCaja" titulo="Nueva caja archivadora" @cerrar="modalCaja = false">
    <form class="space-y-3" @submit.prevent="crearCaja">
      <p class="text-sm text-slate-500">El código se genera automáticamente.</p>
      <div><label class="label">Descripción</label><input v-model="cajaForm.descripcion" class="input" maxlength="200" /></div>
      <div><label class="label">Capacidad (carpetas)</label><input v-model="cajaForm.capacidadCarpetas" type="number" min="1" class="input" /></div>
      <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="modalCaja = false">Cancelar</button><button class="btn-primary">Crear</button></div>
    </form>
  </Modal>

  <Modal :abierto="!!detalleCaja" :titulo="`Caja ${detalleCaja?.codigo}`" ancho="max-w-2xl" @cerrar="detalleCaja = null">
    <div v-if="detalleCaja" class="space-y-2 text-sm">
      <p><strong>Ubicación:</strong> {{ detalleCaja.ruta }}</p>
      <div v-if="puedeEscribir" class="flex flex-wrap gap-2">
        <button class="btn-ghost" @click="imprimir(`/reportes/cajas/${detalleCaja.id}/etiqueta`)">🏷 Etiqueta de la caja</button>
        <button class="btn-ghost" :disabled="!detalleCaja.expedientes.length" @click="imprimir(`/reportes/cajas/${detalleCaja.id}/etiquetas-carpetas`)">🏷 Etiquetas de las {{ detalleCaja.expedientes.length }} carpetas</button>
      </div>
      <p v-if="!detalleCaja.expedientes.length" class="text-slate-500">La caja está vacía.</p>
      <div v-for="e in detalleCaja.expedientes" :key="e.id" class="border-t border-slate-100 py-1.5 dark:border-slate-700">
        <RouterLink :to="`/expedientes/${e.id}`" class="font-medium text-emerald-700 hover:underline dark:text-emerald-300">Carpeta {{ e.carpeta ?? '—' }} · {{ e.codigo }}</RouterLink> — {{ e.asunto }}
      </div>
    </div>
  </Modal>
</template>
