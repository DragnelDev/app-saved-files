import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/lib/api'

export type Rol = 'ROLE_ADMIN' | 'ROLE_ARCHIVISTA' | 'ROLE_RESPONSABLE_UNIDAD' | 'ROLE_CONSULTOR'
export interface Usuario { id: string; username: string; nombreCompleto?: string; rol: Rol; unidadId: string | null; debeCambiarPassword?: boolean }

export const useAuth = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const usuario = ref<Usuario | null>(JSON.parse(localStorage.getItem('usuario') ?? 'null'))
  const rol = computed(() => usuario.value?.rol)

  async function login(username: string, password: string) {
    const r = await api<{ accessToken: string; usuario: Usuario }>('/auth/login', { method: 'POST', body: { username, password } })
    token.value = r.accessToken
    usuario.value = r.usuario
    localStorage.setItem('token', r.accessToken)
    localStorage.setItem('usuario', JSON.stringify(r.usuario))
  }

  function guardarUsuario() { localStorage.setItem('usuario', JSON.stringify(usuario.value)) }

  /** Cambio de contraseña propio. Al hacerlo se quita la marca de contraseña temporal. */
  async function cambiarPassword(actual: string, nueva: string) {
    await api('/auth/cambiar-password', { method: 'POST', body: { actual, nueva } })
    if (usuario.value) { usuario.value.debeCambiarPassword = false; guardarUsuario() }
  }

  /** El administrador restableció la contraseña con la sesión abierta: obliga a cambiarla. */
  function marcarPasswordPendiente() {
    if (usuario.value) { usuario.value.debeCambiarPassword = true; guardarUsuario() }
  }

  function logout() {
    token.value = null
    usuario.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
  }

  /** El administrador tiene control total, igual que en el backend. */
  const tieneRol = (...roles: Rol[]) => !!usuario.value && (usuario.value.rol === 'ROLE_ADMIN' || roles.includes(usuario.value.rol))

  return { token, usuario, rol, login, logout, tieneRol, cambiarPassword, marcarPasswordPendiente }
})
