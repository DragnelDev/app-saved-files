<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { useTema } from '@/stores/tema'

const auth = useAuth()
const tema = useTema()
const router = useRouter()
const username = ref('')
const password = ref('')
const mensaje = ref('')
const cargando = ref(false)

async function entrar() {
  mensaje.value = ''
  cargando.value = true
  try { await auth.login(username.value, password.value); router.push('/') }
  catch (e) { mensaje.value = e instanceof Error ? e.message : 'No se pudo iniciar sesión' }
  finally { cargando.value = false }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <button class="btn-ghost absolute right-4 top-4" @click="tema.alternar()">{{ tema.oscuro ? '☀ Claro' : '☾ Oscuro' }}</button>
    <form class="card w-full max-w-sm space-y-4" @submit.prevent="entrar">
      <div>
        <div class="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Archivo Central e Histórico</div>
        <h1 class="text-2xl font-bold">Iniciar sesión</h1>
      </div>
      <div><label class="label" for="u">Usuario</label><input id="u" v-model="username" class="input" autocomplete="username" required /></div>
      <div><label class="label" for="p">Contraseña</label><input id="p" v-model="password" type="password" class="input" autocomplete="current-password" required /></div>
      <p v-if="mensaje" class="rounded-lg bg-rose-50 p-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200" role="alert">{{ mensaje }}</p>
      <button class="btn-primary w-full" :disabled="cargando">{{ cargando ? 'Ingresando…' : 'Ingresar' }}</button>
    </form>
  </div>
</template>
