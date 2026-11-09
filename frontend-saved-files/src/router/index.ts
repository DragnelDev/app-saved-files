import { createRouter, createWebHistory } from 'vue-router'
import { useAuth, type Rol } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta { publica?: boolean; roles?: Rol[]; titulo?: string }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { publica: true } },
    { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { titulo: 'Panel' } },
    { path: '/clasificacion', name: 'clasificacion', component: () => import('@/views/ClasificacionView.vue'), meta: { titulo: 'Cuadro de clasificación' } },
    { path: '/expedientes', name: 'expedientes', component: () => import('@/views/ExpedientesView.vue'), meta: { titulo: 'Expedientes' } },
    { path: '/expedientes/:id', name: 'expediente', component: () => import('@/views/ExpedienteDetalleView.vue'), meta: { titulo: 'Expediente' } },
    { path: '/transferencias', name: 'transferencias', component: () => import('@/views/TransferenciasView.vue'), meta: { titulo: 'Transferencias' } },
    { path: '/prestamos', name: 'prestamos', component: () => import('@/views/PrestamosView.vue'), meta: { titulo: 'Préstamos' } },
    { path: '/disposicion', name: 'disposicion', component: () => import('@/views/DisposicionView.vue'), meta: { titulo: 'Disposición final', roles: ['ROLE_ARCHIVISTA', 'ROLE_CONSULTOR'] } },
    { path: '/ubicaciones', name: 'ubicaciones', component: () => import('@/views/UbicacionesView.vue'), meta: { titulo: 'Ubicación topográfica', roles: ['ROLE_ARCHIVISTA', 'ROLE_CONSULTOR'] } },
    { path: '/administracion', name: 'administracion', component: () => import('@/views/AdminView.vue'), meta: { titulo: 'Administración', roles: [] } },
    { path: '/auditoria', name: 'auditoria', component: () => import('@/views/AuditoriaView.vue'), meta: { titulo: 'Auditoría', roles: ['ROLE_CONSULTOR'] } },
    { path: '/mi-cuenta', name: 'cuenta', component: () => import('@/views/MiCuentaView.vue'), meta: { titulo: 'Mi cuenta' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuth()
  if (to.meta.publica) return auth.token ? { name: 'dashboard' } : true
  if (!auth.token) return { name: 'login' }
  // Contraseña temporal: hasta cambiarla solo se puede entrar a "Mi cuenta".
  if (auth.usuario?.debeCambiarPassword && to.name !== 'cuenta') return { name: 'cuenta' }
  if (to.meta.roles && !auth.tieneRol(...to.meta.roles)) return { name: 'dashboard' }
  return true
})

export default router
