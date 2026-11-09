<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ROLES } from '@/lib/format'
import { error, ok } from '@/lib/toast'
import { useAuth } from '@/stores/auth'

const auth = useAuth()
const router = useRouter()
const forzado = computed(() => !!auth.usuario?.debeCambiarPassword)
const f = reactive({ actual: '', nueva: '', repetir: '' })
const guardando = ref(false)

const POLITICA = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/
const problema = computed(() => {
  if (!f.nueva) return ''
  if (!POLITICA.test(f.nueva)) return 'Debe tener al menos 8 caracteres, con una letra y un número.'
  if (f.repetir && f.repetir !== f.nueva) return 'Las contraseñas no coinciden.'
  if (f.nueva === f.actual) return 'La nueva contraseña debe ser distinta de la actual.'
  return ''
})

async function guardar() {
  if (problema.value || f.repetir !== f.nueva) return
  guardando.value = true
  try {
    await auth.cambiarPassword(f.actual, f.nueva)
    ok('Contraseña actualizada')
    Object.assign(f, { actual: '', nueva: '', repetir: '' })
    if (!forzado.value) router.push('/')
  } catch (e) { error(e) } finally { guardando.value = false }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-4">
    <p v-if="forzado" class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100" role="alert">
      <strong>Debes cambiar tu contraseña para continuar.</strong> La actual es temporal (asignada por el administrador).
    </p>

    <section class="card">
      <h2 class="mb-2 font-semibold">Mis datos</h2>
      <dl class="grid grid-cols-2 gap-3 text-sm">
        <div><dt class="label">Usuario</dt><dd>{{ auth.usuario?.username }}</dd></div>
        <div><dt class="label">Nombre</dt><dd>{{ auth.usuario?.nombreCompleto ?? '—' }}</dd></div>
        <div class="col-span-2"><dt class="label">Rol</dt><dd>{{ ROLES[auth.rol ?? ''] }}</dd></div>
      </dl>
    </section>

    <form class="card space-y-3" @submit.prevent="guardar">
      <h2 class="font-semibold">Cambiar contraseña</h2>
      <div><label class="label" for="actual">Contraseña actual</label><input id="actual" v-model="f.actual" type="password" class="input" autocomplete="current-password" required /></div>
      <div><label class="label" for="nueva">Nueva contraseña</label><input id="nueva" v-model="f.nueva" type="password" class="input" autocomplete="new-password" required /></div>
      <div><label class="label" for="repetir">Repite la nueva contraseña</label><input id="repetir" v-model="f.repetir" type="password" class="input" autocomplete="new-password" required /></div>
      <p v-if="problema" class="text-sm text-rose-600" role="alert">{{ problema }}</p>
      <p v-else class="text-xs text-slate-500">Mínimo 8 caracteres, con al menos una letra y un número.</p>
      <button class="btn-primary" :disabled="guardando || !!problema || !f.repetir">{{ guardando ? 'Guardando…' : 'Cambiar contraseña' }}</button>
    </form>
  </div>
</template>
