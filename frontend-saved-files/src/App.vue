<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import ToastHost from '@/components/ToastHost.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useAuth } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

// Sesión vencida (401 del backend): volver al login.
const expirada = () => { auth.logout(); router.push('/login') }
// El administrador restableció la contraseña con la sesión abierta.
const cambioRequerido = () => { auth.marcarPasswordPendiente(); router.push('/mi-cuenta') }
onMounted(() => { window.addEventListener('auth:expirada', expirada); window.addEventListener('auth:cambio-password', cambioRequerido) })
onBeforeUnmount(() => { window.removeEventListener('auth:expirada', expirada); window.removeEventListener('auth:cambio-password', cambioRequerido) })
</script>

<template>
  <ToastHost />
  <RouterView v-if="route.meta.publica" />
  <MainLayout v-else />
</template>
