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
onMounted(() => window.addEventListener('auth:expirada', expirada))
onBeforeUnmount(() => window.removeEventListener('auth:expirada', expirada))
</script>

<template>
  <ToastHost />
  <RouterView v-if="route.meta.publica" />
  <MainLayout v-else />
</template>
