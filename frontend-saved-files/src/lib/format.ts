export const fecha = (v?: string | null) => (v ? String(v).slice(0, 10) : '—')
export const fechaHora = (v?: string | null) => (v ? new Date(v).toLocaleString('es-BO') : '—')

export const ROLES: Record<string, string> = {
  ROLE_ADMIN: 'Administrador',
  ROLE_ARCHIVISTA: 'Archivista',
  ROLE_RESPONSABLE_UNIDAD: 'Responsable de unidad',
  ROLE_CONSULTOR: 'Consultor / Auditoría',
}

export const etiqueta = (v?: string | null) => (v ? v.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : '—')

export const COLOR_ESTADO: Record<string, string> = {
  BORRADOR: 'slate', ENVIADO: 'sky', EN_REVISION: 'amber', APROBADO_Y_RECIBIDO: 'emerald', OBSERVADO: 'rose',
  SOLICITADO: 'sky', PRESTADO: 'amber', DEVUELTO: 'emerald', EN_MORA: 'rose',
  EN_GESTION: 'slate', EN_TRANSFERENCIA: 'sky', EN_ARCHIVO_CENTRAL: 'emerald',
  SIN_FOLIAR: 'slate', EN_PROCESO: 'amber', FOLIADO: 'emerald',
  ELIMINADO: 'rose', HISTORICO: 'sky', EN_COMISION: 'amber', APROBADA: 'emerald', RECHAZADA: 'rose', EJECUTADA: 'sky',
  PUBLICO: 'emerald', RESERVADO: 'rose',
}
