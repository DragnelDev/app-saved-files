import { reactive } from 'vue'

export interface Aviso { id: number; tipo: 'ok' | 'error'; texto: string }
export const avisos = reactive<Aviso[]>([])
let n = 0

function mostrar(tipo: Aviso['tipo'], texto: string) {
  const id = ++n
  avisos.push({ id, tipo, texto })
  setTimeout(() => { const i = avisos.findIndex((a) => a.id === id); if (i >= 0) avisos.splice(i, 1) }, 5000)
}
export const ok = (t: string) => mostrar('ok', t)
export const error = (e: unknown) => mostrar('error', e instanceof Error ? e.message : String(e))
