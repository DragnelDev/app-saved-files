<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { ROLES } from '@/lib/format'
import { useAuth, type Rol } from '@/stores/auth'
import { useTema } from '@/stores/tema'

const auth = useAuth()
const tema = useTema()
const route = useRoute()
const router = useRouter()
const menuAbierto = ref(false)

const items: { to: string; texto: string; roles?: Rol[]; icono: string }[] = [
  { to: '/', texto: 'Panel', icono: '▦' },
  { to: '/expedientes', texto: 'Expedientes', icono: '🗂' },
  { to: '/transferencias', texto: 'Transferencias', icono: '⇄' },
  { to: '/prestamos', texto: 'Préstamos', icono: '↗' },
  { to: '/clasificacion', texto: 'Cuadro de clasificación', icono: '🌳' },
  { to: '/disposicion', texto: 'Disposición final', icono: '⚖', roles: ['ROLE_ARCHIVISTA', 'ROLE_CONSULTOR'] },
  { to: '/ubicaciones', texto: 'Ubicación topográfica', icono: '📍', roles: ['ROLE_ARCHIVISTA', 'ROLE_CONSULTOR'] },
  { to: '/auditoria', texto: 'Auditoría', icono: '🛡', roles: ['ROLE_CONSULTOR'] },
  { to: '/administracion', texto: 'Administración', icono: '⚙', roles: [] },
  { to: '/mi-cuenta', texto: 'Mi cuenta', icono: '👤' },
]
const visibles = computed(() =>
  auth.usuario?.debeCambiarPassword ? items.filter((i) => i.to === '/mi-cuenta') : items.filter((i) => !i.roles || auth.tieneRol(...i.roles)),
)

function salir() { auth.logout(); router.push('/login') }
</script>

<template>
  <div class="flex min-h-screen">
    <aside
      class="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-700 dark:bg-slate-800 lg:static lg:translate-x-0"
      :class="menuAbierto ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="border-b border-slate-200 p-4 dark:border-slate-700">
        <div class="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Archivo Central</div>
        <div class="text-lg font-bold">Gestión Documental</div>
      </div>
      <nav class="flex-1 space-y-1 overflow-y-auto p-3">
        <RouterLink
          v-for="i in visibles" :key="i.to" :to="i.to"
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
          :class="(i.to === '/' ? route.path === '/' : route.path.startsWith(i.to)) ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : ''"
          @click="menuAbierto = false"
        ><span class="w-5 text-center">{{ i.icono }}</span>{{ i.texto }}</RouterLink>
      </nav>
      <div class="border-t border-slate-200 p-3 text-sm dark:border-slate-700">
        <div class="truncate font-medium">{{ auth.usuario?.nombreCompleto ?? auth.usuario?.username }}</div>
        <div class="mb-2 text-xs text-slate-500 dark:text-slate-400">{{ ROLES[auth.rol ?? ''] }}</div>
        <div class="flex gap-2">
          <button class="btn-ghost flex-1" :aria-label="tema.oscuro ? 'Modo claro' : 'Modo oscuro'" @click="tema.alternar()">{{ tema.oscuro ? '☀ Claro' : '☾ Oscuro' }}</button>
          <button class="btn-ghost flex-1" @click="salir">Salir</button>
        </div>
      </div>
    </aside>
    <div v-if="menuAbierto" class="fixed inset-0 z-20 bg-slate-900/40 lg:hidden" @click="menuAbierto = false" />
    <div class="min-w-0 flex-1">
      <header class="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-800/90">
        <button class="btn-ghost lg:hidden" aria-label="Abrir menú" @click="menuAbierto = true">☰</button>
        <h1 class="text-lg font-semibold">{{ route.meta.titulo }}</h1>
      </header>
      <main class="p-4 lg:p-6"><RouterView /></main>
    </div>
  </div>
</template>
