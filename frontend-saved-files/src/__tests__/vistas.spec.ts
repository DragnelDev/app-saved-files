// Monta cada pantalla contra el backend REAL, con los datos que deja scripts/smoke.mjs, y comprueba que
// se renderiza con datos y sin advertencias de Vue. Se omite si no hay backend configurado.
//
//   1) backend en marcha con la BD de la prueba de humo (usuarios archi/resp/consul/admin, contraseña "Cambiada#2026")
//   2) VITE_API_URL=http://localhost:3000/api npm run test:vistas
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App.vue'
import { api } from '@/lib/api'
import router from '@/router'
import { useAuth } from '@/stores/auth'

const hayBackend = !!import.meta.env.VITE_API_URL
const PASS = 'Cambiada#2026'
let wrapper: VueWrapper | null = null
let avisos: string[] = []

async function entrar(usuario: string, pass = PASS) {
  await useAuth().login(usuario, pass)
}
async function ir(ruta: string) {
  await router.push(ruta)
  await flushPromises()
}
const esperar = (texto: string | RegExp) =>
  vi.waitFor(() => { const t = document.body.textContent ?? ''; expect(typeof texto === 'string' ? t.includes(texto) : texto.test(t), `no aparece "${texto}"`).toBe(true) }, { timeout: 8000, interval: 100 })

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  avisos = []
  vi.spyOn(console, 'warn').mockImplementation((...a) => { avisos.push(a.join(' ')) })
  vi.spyOn(console, 'error').mockImplementation((...a) => { avisos.push(a.join(' ')) })
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
  await router.replace('/login')
  await flushPromises()
})
afterEach(() => { wrapper?.unmount(); wrapper = null; document.body.innerHTML = ''; vi.restoreAllMocks() })

describe.skipIf(!hayBackend)('vistas contra el backend real', () => {
  it('login: credenciales inválidas muestran un mensaje y válidas entran al panel', async () => {
    await wrapper!.find('#u').setValue('archi')
    await wrapper!.find('#p').setValue('incorrecta')
    await wrapper!.find('form').trigger('submit')
    await esperar('Credenciales inválidas')
    await wrapper!.find('#p').setValue(PASS)
    await wrapper!.find('form').trigger('submit')
    await esperar('Capacidad ocupacional')
    expect(avisos.filter((a) => a.includes('[Vue warn]'))).toEqual([])
  })

  it('archivista: todas sus pantallas se renderizan con datos', async () => {
    await entrar('archi')
    const lista = await api('/expedientes', { query: { limit: 50 } })
    const exp = lista.items.find((e: { codigo: string }) => e.codigo === '1.1.1/2026/0001')
    const casos: [string, string | RegExp][] = [
      ['/', 'Capacidad ocupacional'],
      ['/expedientes', '1.1.1/2026/0001'],
      [`/expedientes/${exp.id}`, 'Documentos digitalizados'],
      ['/clasificacion', 'Comprobantes'],
      ['/ubicaciones', 'CAJ-000001'],
      ['/transferencias', /TR-\d{4}-\d{4}/],
      ['/prestamos', /PR-\d{4}-\d{4}/],
      ['/disposicion', 'Plazo de retención cumplido'],
      ['/mi-cuenta', 'Cambiar contraseña'],
    ]
    for (const [ruta, texto] of casos) {
      await ir(ruta)
      await esperar(texto)
    }
    expect(avisos.filter((a) => a.includes('[Vue warn]'))).toEqual([])
  })

  it('archivista: propuestas de disposición y acta de préstamo se abren con su detalle', async () => {
    await entrar('archi')
    await ir('/disposicion')
    const tabs = wrapper!.findAll('button').filter((b) => b.text().startsWith('Propuestas'))
    await tabs[0]!.trigger('click')
    await esperar(/PD-\d{4}-\d{4}/)
    await ir('/prestamos')
    await esperar(/PR-\d{4}-\d{4}/)
    await wrapper!.findAll('button').find((b) => b.text() === 'Abrir')!.trigger('click')
    await esperar('Acta de préstamo PR-')
    expect(avisos.filter((a) => a.includes('[Vue warn]'))).toEqual([])
  })

  it('responsable de unidad: panel propio, sin acceso a pantallas de archivo', async () => {
    await entrar('resp')
    await ir('/')
    await esperar('Mis expedientes en custodia')
    await ir('/expedientes')
    await esperar('1.1.1/2026/0001')
    await ir('/administracion')
    expect(router.currentRoute.value.path).toBe('/') // redirigido por el guard de roles
    await ir('/ubicaciones')
    expect(router.currentRoute.value.path).toBe('/')
    expect(avisos.filter((a) => a.includes('[Vue warn]'))).toEqual([])
  })

  it('selectores de expedientes (transferencia y préstamo): muestran el total y buscan en el servidor', async () => {
    await entrar('resp')
    await ir('/transferencias')
    await wrapper!.findAll('button').find((b) => b.text().includes('Nueva transferencia'))!.trigger('click')
    await esperar(/Mostrando \d+ de \d+/)
    const buscar = document.body.querySelector('input[aria-label="Buscar expedientes"]') as HTMLInputElement
    buscar.value = 'Reservado'
    buscar.dispatchEvent(new Event('input'))
    await esperar('Mostrando 1 de 1') // solo el expediente cuyo asunto contiene "Reservado"
    expect(document.body.textContent).not.toContain('Comprobantes C31 enero')

    await ir('/prestamos')
    await wrapper!.findAll('button').find((b) => b.text().includes('Solicitar préstamo'))!.trigger('click')
    await esperar(/Mostrando \d+ de \d+/)
    expect(avisos.filter((a) => a.includes('[Vue warn]'))).toEqual([])
  })

  it('consultor: lectura y bitácora', async () => {
    await entrar('consul')
    await ir('/auditoria')
    await esperar('Bitácora inmutable')
    await ir('/disposicion')
    await esperar('Plazo de retención cumplido')
    expect(wrapper!.text()).not.toContain('Crear propuesta')
    expect(avisos.filter((a) => a.includes('[Vue warn]'))).toEqual([])
  })

  it('administrador: usuarios y unidades', async () => {
    await entrar('admin')
    await ir('/administracion')
    await esperar('archi')
    await wrapper!.findAll('button').find((b) => b.text().startsWith('Unidades'))!.trigger('click')
    await esperar('Unidad Financiera')
    await ir('/auditoria')
    await esperar('Bitácora inmutable')
    expect(avisos.filter((a) => a.includes('[Vue warn]'))).toEqual([])
  })

  it('contraseña temporal: el guard obliga a ir a "Mi cuenta"', async () => {
    await entrar('cuenta1', 'Reinicio#789')
    expect(useAuth().usuario?.debeCambiarPassword).toBe(true)
    await ir('/expedientes')
    expect(router.currentRoute.value.name).toBe('cuenta')
    await esperar('Debes cambiar tu contraseña para continuar')
    expect(avisos.filter((a) => a.includes('[Vue warn]'))).toEqual([])
  })
})
