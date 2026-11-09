// Cliente HTTP mínimo con JWT. Los errores del backend llegan como ApiError con mensaje legible.
const BASE: string = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

interface Opciones {
  method?: string
  body?: unknown
  query?: Record<string, unknown>
}

function url(path: string, query?: Record<string, unknown>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  const s = qs.toString()
  return `${BASE}${path}${s ? `?${s}` : ''}`
}

async function pedir(path: string, o: Opciones = {}): Promise<Response> {
  const token = localStorage.getItem('token')
  const esForm = o.body instanceof FormData
  const res = await fetch(url(path, o.query), {
    method: o.method ?? (o.body ? 'POST' : 'GET'),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(o.body && !esForm ? { 'Content-Type': 'application/json' } : {}),
    },
    body: o.body === undefined ? undefined : esForm ? (o.body as FormData) : JSON.stringify(o.body),
  })
  if (res.ok) return res
  if (res.status === 401 && token) window.dispatchEvent(new Event('auth:expirada'))
  let mensaje = `Error ${res.status}`
  try {
    const j = await res.json()
    mensaje = Array.isArray(j.message) ? j.message.join('. ') : (j.message ?? mensaje)
    if (res.status === 403 && j.codigo === 'CAMBIO_PASSWORD_REQUERIDO') window.dispatchEvent(new Event('auth:cambio-password'))
  } catch {
    /* sin cuerpo JSON */
  }
  throw new ApiError(res.status, mensaje)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(path: string, o?: Opciones): Promise<T> {
  const res = await pedir(path, o)
  const texto = await res.text()
  return (texto ? JSON.parse(texto) : null) as T
}

export async function apiBlob(path: string): Promise<Blob> {
  return (await pedir(path)).blob()
}

/** Abre un PDF/imagen protegido por JWT en una pestaña nueva (para imprimir o reimprimir). */
export async function abrirEnPestana(path: string): Promise<void> {
  const ventana = window.open('', '_blank') // se abre antes del await para evitar el bloqueo de popups
  try {
    const blob = await apiBlob(path)
    const u = URL.createObjectURL(blob)
    if (ventana) ventana.location.href = u
    else window.open(u, '_blank')
  } catch (e) {
    ventana?.close()
    throw e
  }
}
