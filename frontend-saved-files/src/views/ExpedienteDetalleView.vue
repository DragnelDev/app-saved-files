<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import Badge from '@/components/Badge.vue'
import PdfDrawer from '@/components/PdfDrawer.vue'
import { abrirEnPestana, api } from '@/lib/api'
import { fecha } from '@/lib/format'
import { error, ok } from '@/lib/toast'
import { useAuth } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
const route = useRoute()
const auth = useAuth()
const id = route.params.id as string

const exp = ref<R | null>(null)
const docs = ref<R[]>([])
const validacion = ref<R | null>(null)
const visor = ref<R | null>(null)
const subiendo = ref(false)
const archivo = ref<File | null>(null)
const form = reactive({ titulo: '', tipoDocumento: '', fojaInicio: 1, fojaFin: 1 })

const esArchivista = auth.tieneRol('ROLE_ARCHIVISTA')
const puedeEscribir = computed(() => esArchivista || (auth.rol === 'ROLE_RESPONSABLE_UNIDAD' && exp.value?.estado === 'EN_GESTION' && exp.value?.unidadProductoraId === auth.usuario?.unidadId))
const foliado = computed(() => exp.value?.estadoFoliacion === 'FOLIADO')

async function cargar() {
  try {
    exp.value = await api(`/expedientes/${id}`)
    docs.value = await api(`/expedientes/${id}/documentos`)
    const sig = (docs.value.at(-1)?.fojaFin ?? 0) + 1
    form.fojaInicio = sig; form.fojaFin = sig
  } catch (e) { error(e) }
}
async function subir() {
  if (!archivo.value) return
  const fd = new FormData()
  fd.append('titulo', form.titulo); fd.append('fojaInicio', String(form.fojaInicio)); fd.append('fojaFin', String(form.fojaFin))
  if (form.tipoDocumento) fd.append('tipoDocumento', form.tipoDocumento)
  fd.append('archivo', archivo.value)
  subiendo.value = true
  try { const d = await api(`/expedientes/${id}/documentos`, { body: fd }); ok(`Documento cargado · SHA-256 ${d.hashSha256.slice(0, 12)}…`); form.titulo = ''; form.tipoDocumento = ''; archivo.value = null; validacion.value = null; await cargar() }
  catch (e) { error(e) } finally { subiendo.value = false }
}
async function accion(ruta: string, msg: string, metodo = 'POST') {
  try { await api(`/expedientes/${id}/${ruta}`, { method: metodo }); ok(msg); validacion.value = null; await cargar() } catch (e) { error(e) }
}
async function validar() { try { validacion.value = await api(`/expedientes/${id}/validar-foliacion`) } catch (e) { error(e) } }
async function quitarUltimo() { if (confirm('¿Retirar el último documento cargado?')) { try { await api(`/expedientes/${id}/documentos/ultimo`, { method: 'DELETE' }); ok('Documento retirado'); await cargar() } catch (e) { error(e) } } }
const imprimir = () => abrirEnPestana(`/reportes/expedientes/${id}/caratula`).catch(error)
onMounted(cargar)
</script>

<template>
  <div v-if="!exp" class="text-slate-500">Cargando…</div>
  <div v-else class="space-y-4">
    <div class="card">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <RouterLink to="/expedientes" class="text-xs text-slate-500 hover:underline">← Expedientes</RouterLink>
          <h2 class="font-mono text-xl font-bold">{{ exp.codigo }}</h2>
          <p class="mt-1 max-w-3xl">{{ exp.asunto }}</p>
        </div>
        <div class="flex flex-wrap gap-2"><Badge :valor="exp.estado" /><Badge :valor="exp.estadoFoliacion" /><Badge :valor="exp.sensibilidad" /></div>
      </div>
      <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt class="label">Serie</dt><dd>{{ exp.nodo?.codigo }} — {{ exp.nodo?.nombre }}</dd></div>
        <div><dt class="label">Unidad productora</dt><dd>{{ exp.unidadProductora?.nombre }}</dd></div>
        <div><dt class="label">Fechas extremas</dt><dd>{{ fecha(exp.fechaInicio) }} → {{ fecha(exp.fechaFin) }}</dd></div>
        <div><dt class="label">Fojas</dt><dd>{{ exp.fojaFin ? `${exp.fojaInicio} a ${exp.fojaFin}` : 'Sin foliar' }}</dd></div>
        <div><dt class="label">Ubicación topográfica</dt><dd class="font-mono">{{ exp.caja ? `${exp.caja.codigo}${exp.carpeta ? ' · carpeta ' + exp.carpeta : ''}` : 'Archivo de gestión' }}</dd></div>
        <div class="sm:col-span-3"><dt class="label">Palabras clave</dt><dd>{{ exp.palabrasClave?.join(', ') || '—' }}</dd></div>
      </dl>
      <div class="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
        <button class="btn-ghost" @click="imprimir">🖨 Imprimir carátula</button>
        <button class="btn-ghost" @click="validar">Validar foliación</button>
        <template v-if="esArchivista">
          <button v-if="!foliado" class="btn-primary" @click="accion('foliar', 'Foliación definitiva registrada')">Foliación definitiva</button>
          <button v-if="foliado" class="btn-ghost" @click="accion('reabrir-foliacion', 'Foliación reabierta')">Reabrir foliación</button>
          <button class="btn-ghost" @click="accion('refoliar', 'Expediente re-foliado')">Re-foliar</button>
        </template>
      </div>
      <div v-if="validacion" class="mt-3 rounded-lg p-3 text-sm" :class="validacion.ok ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100' : 'bg-rose-50 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100'">
        <strong>{{ validacion.ok ? `✔ Numeración continua (${validacion.documentos} documento(s))` : '✖ Inconsistencias en la foliación' }}</strong>
        <ul v-if="!validacion.ok" class="list-disc pl-5"><li v-for="x in validacion.errores" :key="x">{{ x }}</li></ul>
      </div>
    </div>

    <div class="table-wrap">
      <div class="flex items-center justify-between px-4 py-3"><h3 class="font-semibold">Documentos digitalizados</h3>
        <button v-if="puedeEscribir && !foliado && docs.length" class="btn-ghost text-rose-600" @click="quitarUltimo">Retirar último</button></div>
      <table class="w-full">
        <thead><tr><th class="th">#</th><th class="th">Título</th><th class="th">Tipo</th><th class="th">Fojas</th><th class="th">SHA-256</th><th class="th" /></tr></thead>
        <tbody>
          <tr v-if="!docs.length"><td colspan="6" class="td text-slate-500">Sin documentos cargados.</td></tr>
          <tr v-for="d in docs" :key="d.id">
            <td class="td">{{ d.orden }}</td><td class="td">{{ d.titulo }}</td><td class="td">{{ d.tipoDocumento ?? '—' }}</td>
            <td class="td whitespace-nowrap">{{ d.fojaInicio }}–{{ d.fojaFin }}</td>
            <td class="td font-mono text-xs" :title="d.hashSha256">{{ d.hashSha256.slice(0, 16) }}…</td>
            <td class="td text-right"><button class="btn-primary" @click="visor = d">Abrir visor</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <form v-if="puedeEscribir && !foliado" class="card grid gap-3 md:grid-cols-6" @submit.prevent="subir">
      <h3 class="font-semibold md:col-span-6">Agregar documento (PDF)</h3>
      <div class="md:col-span-3"><label class="label">Título</label><input v-model="form.titulo" class="input" required /></div>
      <div class="md:col-span-3"><label class="label">Tipo de documento</label><input v-model="form.tipoDocumento" class="input" placeholder="Opcional" /></div>
      <div><label class="label">Foja inicio</label><input v-model.number="form.fojaInicio" type="number" min="1" class="input" required /></div>
      <div><label class="label">Foja fin</label><input v-model.number="form.fojaFin" type="number" :min="form.fojaInicio" class="input" required /></div>
      <div class="md:col-span-3"><label class="label">Archivo PDF (máx. 50 MB)</label><input type="file" accept="application/pdf" class="input" required @change="archivo = ($event.target as HTMLInputElement).files?.[0] ?? null" /></div>
      <div class="flex items-end"><button class="btn-primary w-full" :disabled="subiendo">{{ subiendo ? 'Cargando…' : 'Cargar' }}</button></div>
      <p class="text-xs text-slate-500 md:col-span-6">La numeración debe continuar desde la última foja ({{ form.fojaInicio }}); no se permiten solapes ni vacíos. Al cargar se calcula el SHA-256 del PDF.</p>
    </form>
  </div>
  <PdfDrawer :documento="visor" @cerrar="visor = null" />
</template>
