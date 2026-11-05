<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import TreeNode from '@/components/TreeNode.vue'
import Modal from '@/components/Modal.vue'
import { api } from '@/lib/api'
import { etiqueta, fecha } from '@/lib/format'
import { error, ok } from '@/lib/toast'
import { useAuth } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
const NIVELES = ['FONDO', 'SUBFONDO', 'SECCION', 'SUBSECCION', 'SERIE', 'SUBSERIE']
const DISPOSICIONES = ['CONSERVACION_PERMANENTE', 'SELECCION_MUESTREO', 'ELIMINACION']

const auth = useAuth()
const esAdmin = auth.tieneRol()
const puedeActas = auth.tieneRol('ROLE_ARCHIVISTA')
const verActas = auth.tieneRol('ROLE_ARCHIVISTA', 'ROLE_CONSULTOR')
const tab = ref<'cuadro' | 'actas'>('cuadro')
const arbol = ref<R[]>([])
const sel = ref<R | null>(null)
const actas = ref<R[]>([])
const series = ref<R[]>([])

const modalNodo = ref(false)
const modoHijo = ref(false)
const nodo = reactive({ codigo: '', nombre: '', nivel: 'FONDO', descripcion: '' })
const trd = reactive({ anosArchivoGestion: 0, anosArchivoCentral: 0, disposicionFinal: 'CONSERVACION_PERMANENTE', observaciones: '' })
const modalActa = ref(false)
const acta = reactive({ numero: '', fecha: new Date().toISOString().slice(0, 10), nodoId: '', disposicion: 'CONSERVACION_PERMANENTE', descripcion: '' })

const esSerie = computed(() => sel.value && ['SERIE', 'SUBSERIE'].includes(sel.value.nivel))
const nivelesHijo = computed(() => {
  if (!sel.value) return ['FONDO']
  const i = NIVELES.indexOf(sel.value.nivel)
  return NIVELES.filter((n, idx) => idx > i && (n !== 'SUBSERIE' || sel.value!.nivel === 'SERIE'))
})

function buscar(nodos: R[], id: string): R | null {
  for (const n of nodos) { if (n.id === id) return n; const h = buscar(n.hijos, id); if (h) return h }
  return null
}
async function cargar() {
  try {
    arbol.value = await api('/clasificacion/arbol')
    if (sel.value) seleccionar(buscar(arbol.value, sel.value.id))
    if (verActas) { actas.value = await api('/clasificacion/actas-valoracion'); series.value = await api('/clasificacion/series') }
  } catch (e) { error(e) }
}
function seleccionar(n: R | null) {
  sel.value = n
  if (n?.trd) Object.assign(trd, { anosArchivoGestion: n.trd.anosArchivoGestion, anosArchivoCentral: n.trd.anosArchivoCentral, disposicionFinal: n.trd.disposicionFinal, observaciones: n.trd.observaciones ?? '' })
  else Object.assign(trd, { anosArchivoGestion: 0, anosArchivoCentral: 0, disposicionFinal: 'CONSERVACION_PERMANENTE', observaciones: '' })
}
function nuevo(hijo: boolean) {
  Object.assign(nodo, { codigo: '', nombre: '', descripcion: '', nivel: hijo ? (nivelesHijo.value[0] ?? 'FONDO') : 'FONDO' })
  modoHijo.value = hijo
  modalNodo.value = true
}
async function guardarNodo() {
  try {
    await api('/clasificacion', { body: { ...nodo, descripcion: nodo.descripcion || undefined, padreId: modoHijo.value ? sel.value?.id : undefined } })
    ok('Nodo creado'); modalNodo.value = false; await cargar()
  } catch (e) { error(e) }
}
async function guardarTrd() {
  try {
    await api(`/clasificacion/${sel.value!.id}/trd`, { method: 'PUT', body: { ...trd, anosArchivoGestion: Number(trd.anosArchivoGestion), anosArchivoCentral: Number(trd.anosArchivoCentral), observaciones: trd.observaciones || undefined } })
    ok('Tabla de retención guardada'); await cargar()
  } catch (e) { error(e) }
}
async function eliminar() {
  if (!sel.value || !confirm(`¿Dar de baja "${sel.value.nombre}"?`)) return
  try { await api(`/clasificacion/${sel.value.id}`, { method: 'DELETE' }); sel.value = null; ok('Nodo dado de baja'); await cargar() } catch (e) { error(e) }
}
async function guardarActa() {
  try { await api('/clasificacion/actas-valoracion', { body: { ...acta } }); ok('Acta registrada'); modalActa.value = false; await cargar() } catch (e) { error(e) }
}
onMounted(cargar)
</script>

<template>
  <div class="mb-4 flex gap-2" v-if="verActas">
    <button :class="tab === 'cuadro' ? 'btn-primary' : 'btn-ghost'" @click="tab = 'cuadro'">Cuadro de clasificación</button>
    <button :class="tab === 'actas' ? 'btn-primary' : 'btn-ghost'" @click="tab = 'actas'">Comisión de Valoración (actas)</button>
  </div>

  <div v-if="tab === 'cuadro'" class="grid gap-4 lg:grid-cols-5">
    <section class="card lg:col-span-3">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="font-semibold">Fondo › Subfondo › Sección › Subsección › Serie › Subserie</h2>
        <button v-if="esAdmin" class="btn-primary" @click="nuevo(false)">+ Fondo</button>
      </div>
      <p v-if="!arbol.length" class="text-sm text-slate-500">El cuadro de clasificación aún no tiene elementos.</p>
      <TreeNode v-for="n in arbol" :key="n.id" :nodo="n" :seleccionado="sel?.id" @seleccionar="seleccionar" />
    </section>

    <section class="card lg:col-span-2">
      <p v-if="!sel" class="text-sm text-slate-500">Selecciona un elemento del árbol.</p>
      <div v-else class="space-y-3">
        <div>
          <div class="text-xs uppercase text-slate-500">{{ etiqueta(sel.nivel) }}</div>
          <h3 class="text-lg font-semibold">{{ sel.codigo }} — {{ sel.nombre }}</h3>
          <p v-if="sel.descripcion" class="text-sm text-slate-500">{{ sel.descripcion }}</p>
        </div>
        <div v-if="esAdmin" class="flex gap-2">
          <button v-if="nivelesHijo.length" class="btn-ghost" @click="nuevo(true)">+ Agregar hijo</button>
          <button class="btn-ghost text-rose-600" @click="eliminar">Dar de baja</button>
        </div>

        <div v-if="esSerie" class="border-t border-slate-200 pt-3 dark:border-slate-700">
          <h4 class="mb-2 font-semibold">Tabla de Retención Documental (TRD)</h4>
          <fieldset :disabled="!esAdmin" class="grid grid-cols-2 gap-3">
            <div><label class="label">Años en archivo de gestión</label><input v-model="trd.anosArchivoGestion" type="number" min="0" class="input" /></div>
            <div><label class="label">Años en archivo central</label><input v-model="trd.anosArchivoCentral" type="number" min="0" class="input" /></div>
            <div class="col-span-2"><label class="label">Disposición final</label>
              <select v-model="trd.disposicionFinal" class="input"><option v-for="x in DISPOSICIONES" :key="x" :value="x">{{ etiqueta(x) }}</option></select></div>
            <div class="col-span-2"><label class="label">Observaciones</label><textarea v-model="trd.observaciones" class="input" rows="2" /></div>
          </fieldset>
          <button v-if="esAdmin" class="btn-primary mt-3" @click="guardarTrd">Guardar TRD</button>
        </div>
      </div>
    </section>
  </div>

  <section v-else class="space-y-3">
    <div v-if="puedeActas" class="flex justify-end"><button class="btn-primary" @click="modalActa = true">+ Registrar acta</button></div>
    <div class="table-wrap">
      <table class="w-full">
        <thead><tr><th class="th">N° acta</th><th class="th">Fecha</th><th class="th">Serie</th><th class="th">Disposición</th><th class="th">Descripción</th></tr></thead>
        <tbody>
          <tr v-if="!actas.length"><td colspan="5" class="td text-slate-500">Sin actas registradas.</td></tr>
          <tr v-for="a in actas" :key="a.id"><td class="td font-medium">{{ a.numero }}</td><td class="td">{{ fecha(a.fecha) }}</td><td class="td">{{ a.nodo?.codigo }} {{ a.nodo?.nombre }}</td><td class="td">{{ etiqueta(a.disposicion) }}</td><td class="td">{{ a.descripcion }}</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <Modal :abierto="modalNodo" :titulo="modoHijo ? `Nuevo elemento bajo ${sel?.codigo}` : 'Nuevo fondo'" @cerrar="modalNodo = false">
    <form class="space-y-3" @submit.prevent="guardarNodo">
      <div v-if="modoHijo"><label class="label">Nivel</label>
        <select v-model="nodo.nivel" class="input"><option v-for="n in nivelesHijo" :key="n" :value="n">{{ etiqueta(n) }}</option></select></div>
      <div><label class="label">Código</label><input v-model="nodo.codigo" class="input" required maxlength="40" /></div>
      <div><label class="label">Nombre</label><input v-model="nodo.nombre" class="input" required maxlength="200" /></div>
      <div><label class="label">Descripción</label><textarea v-model="nodo.descripcion" class="input" rows="2" /></div>
      <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="modalNodo = false">Cancelar</button><button class="btn-primary">Crear</button></div>
    </form>
  </Modal>

  <Modal :abierto="modalActa" titulo="Acta de la Comisión de Valoración" @cerrar="modalActa = false">
    <form class="space-y-3" @submit.prevent="guardarActa">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">N° de acta</label><input v-model="acta.numero" class="input" required /></div>
        <div><label class="label">Fecha</label><input v-model="acta.fecha" type="date" class="input" required /></div>
      </div>
      <div><label class="label">Serie / subserie</label><select v-model="acta.nodoId" class="input" required><option value="" disabled>Selecciona…</option><option v-for="s in series" :key="s.id" :value="s.id">{{ s.codigo }} — {{ s.nombre }}</option></select></div>
      <div><label class="label">Disposición</label><select v-model="acta.disposicion" class="input"><option v-for="x in DISPOSICIONES" :key="x" :value="x">{{ etiqueta(x) }}</option></select></div>
      <div><label class="label">Descripción</label><textarea v-model="acta.descripcion" class="input" rows="3" required /></div>
      <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="modalActa = false">Cancelar</button><button class="btn-primary">Registrar</button></div>
    </form>
  </Modal>
</template>
