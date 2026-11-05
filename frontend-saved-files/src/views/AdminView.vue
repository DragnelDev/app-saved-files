<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AskModal from '@/components/AskModal.vue'
import Modal from '@/components/Modal.vue'
import { api } from '@/lib/api'
import { ROLES } from '@/lib/format'
import { error, ok } from '@/lib/toast'
import { useAuth } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
const auth = useAuth()
const tab = ref<'usuarios' | 'unidades'>('usuarios')
const usuarios = ref<R[]>([])
const unidades = ref<R[]>([])

const mU = ref(false)
const u = reactive({ id: '', username: '', password: '', nombreCompleto: '', email: '', rol: 'ROLE_RESPONSABLE_UNIDAD', unidadId: '' })
const mN = ref(false)
const n = reactive({ id: '', codigo: '', nombre: '', sigla: '' })
const pass = ref<R | null>(null)

async function cargar() { try { ;[usuarios.value, unidades.value] = await Promise.all([api('/usuarios'), api('/unidades')]) } catch (e) { error(e) } }
function editarU(x?: R) {
  Object.assign(u, x ? { id: x.id, username: x.username, password: '', nombreCompleto: x.nombreCompleto, email: x.email ?? '', rol: x.rol, unidadId: x.unidadId ?? '' } : { id: '', username: '', password: '', nombreCompleto: '', email: '', rol: 'ROLE_RESPONSABLE_UNIDAD', unidadId: '' })
  mU.value = true
}
async function guardarU() {
  try {
    const comun = { nombreCompleto: u.nombreCompleto, email: u.email || undefined, rol: u.rol, unidadId: u.unidadId || undefined }
    if (u.id) await api(`/usuarios/${u.id}`, { method: 'PATCH', body: comun })
    else await api('/usuarios', { body: { ...comun, username: u.username, password: u.password } })
    ok('Usuario guardado'); mU.value = false; await cargar()
  } catch (e) { error(e) }
}
async function bajaU(x: R) { if (confirm(`¿Desactivar a ${x.username}?`)) { try { await api(`/usuarios/${x.id}`, { method: 'DELETE' }); ok('Usuario desactivado'); await cargar() } catch (e) { error(e) } } }
async function cambiarPass(v: string) { const x = pass.value!; pass.value = null; try { await api(`/usuarios/${x.id}/password`, { method: 'PATCH', body: { password: v } }); ok('Contraseña actualizada') } catch (e) { error(e) } }
function editarN(x?: R) { Object.assign(n, x ? { id: x.id, codigo: x.codigo, nombre: x.nombre, sigla: x.sigla ?? '' } : { id: '', codigo: '', nombre: '', sigla: '' }); mN.value = true }
async function guardarN() {
  try {
    const b = { codigo: n.codigo, nombre: n.nombre, sigla: n.sigla || undefined }
    if (n.id) await api(`/unidades/${n.id}`, { method: 'PATCH', body: b }); else await api('/unidades', { body: b })
    ok('Unidad guardada'); mN.value = false; await cargar()
  } catch (e) { error(e) }
}
async function bajaN(x: R) { if (confirm(`¿Dar de baja "${x.nombre}"?`)) { try { await api(`/unidades/${x.id}`, { method: 'DELETE' }); ok('Unidad dada de baja'); await cargar() } catch (e) { error(e) } } }
onMounted(cargar)
</script>

<template>
  <div class="mb-4 flex gap-2">
    <button :class="tab === 'usuarios' ? 'btn-primary' : 'btn-ghost'" @click="tab = 'usuarios'">Usuarios</button>
    <button :class="tab === 'unidades' ? 'btn-primary' : 'btn-ghost'" @click="tab = 'unidades'">Unidades organizacionales</button>
  </div>

  <section v-if="tab === 'usuarios'" class="space-y-3">
    <div class="flex justify-end"><button class="btn-primary" @click="editarU()">+ Nuevo usuario</button></div>
    <div class="table-wrap"><table class="w-full">
      <thead><tr><th class="th">Usuario</th><th class="th">Nombre</th><th class="th">Rol</th><th class="th">Unidad</th><th class="th" /></tr></thead>
      <tbody><tr v-for="x in usuarios" :key="x.id">
        <td class="td font-medium">{{ x.username }}</td><td class="td">{{ x.nombreCompleto }}</td><td class="td">{{ ROLES[x.rol] }}</td><td class="td">{{ x.unidad?.nombre ?? '—' }}</td>
        <td class="td whitespace-nowrap text-right"><button class="btn-ghost" @click="editarU(x)">Editar</button><button class="btn-ghost ml-1" @click="pass = x">Contraseña</button><button v-if="x.id !== auth.usuario?.id" class="btn-ghost ml-1 text-rose-600" @click="bajaU(x)">Desactivar</button></td>
      </tr></tbody></table></div>
  </section>

  <section v-else class="space-y-3">
    <div class="flex justify-end"><button class="btn-primary" @click="editarN()">+ Nueva unidad</button></div>
    <div class="table-wrap"><table class="w-full">
      <thead><tr><th class="th">Código</th><th class="th">Nombre</th><th class="th">Sigla</th><th class="th" /></tr></thead>
      <tbody><tr v-if="!unidades.length"><td colspan="4" class="td text-slate-500">Sin unidades registradas.</td></tr>
        <tr v-for="x in unidades" :key="x.id"><td class="td font-medium">{{ x.codigo }}</td><td class="td">{{ x.nombre }}</td><td class="td">{{ x.sigla ?? '—' }}</td>
        <td class="td whitespace-nowrap text-right"><button class="btn-ghost" @click="editarN(x)">Editar</button><button class="btn-ghost ml-1 text-rose-600" @click="bajaN(x)">Dar de baja</button></td></tr></tbody></table></div>
  </section>

  <Modal :abierto="mU" :titulo="u.id ? 'Editar usuario' : 'Nuevo usuario'" @cerrar="mU = false">
    <form class="space-y-3" @submit.prevent="guardarU">
      <div v-if="!u.id" class="grid grid-cols-2 gap-3">
        <div><label class="label">Usuario</label><input v-model="u.username" class="input" required pattern="[a-zA-Z0-9._-]{3,60}" /></div>
        <div><label class="label">Contraseña (mín. 8)</label><input v-model="u.password" type="password" class="input" required minlength="8" autocomplete="new-password" /></div>
      </div>
      <div><label class="label">Nombre completo</label><input v-model="u.nombreCompleto" class="input" required /></div>
      <div><label class="label">Correo</label><input v-model="u.email" type="email" class="input" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Rol</label><select v-model="u.rol" class="input"><option v-for="(t, k) in ROLES" :key="k" :value="k">{{ t }}</option></select></div>
        <div><label class="label">Unidad {{ u.rol === 'ROLE_RESPONSABLE_UNIDAD' ? '(obligatoria)' : '' }}</label><select v-model="u.unidadId" class="input" :required="u.rol === 'ROLE_RESPONSABLE_UNIDAD'"><option value="">—</option><option v-for="x in unidades" :key="x.id" :value="x.id">{{ x.nombre }}</option></select></div>
      </div>
      <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="mU = false">Cancelar</button><button class="btn-primary">Guardar</button></div>
    </form>
  </Modal>

  <Modal :abierto="mN" :titulo="n.id ? 'Editar unidad' : 'Nueva unidad'" @cerrar="mN = false">
    <form class="space-y-3" @submit.prevent="guardarN">
      <div class="grid grid-cols-2 gap-3"><div><label class="label">Código</label><input v-model="n.codigo" class="input" required maxlength="30" /></div><div><label class="label">Sigla</label><input v-model="n.sigla" class="input" maxlength="20" /></div></div>
      <div><label class="label">Nombre</label><input v-model="n.nombre" class="input" required /></div>
      <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="mN = false">Cancelar</button><button class="btn-primary">Guardar</button></div>
    </form>
  </Modal>

  <AskModal :abierto="!!pass" :titulo="`Nueva contraseña para ${pass?.username}`" etiqueta="Contraseña (mínimo 8 caracteres)" requerido boton="Cambiar" @cerrar="pass = null" @aceptar="cambiarPass" />
</template>
