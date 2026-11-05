/** Niveles del Cuadro de Clasificación Documental (ABNB), de mayor a menor. */
export enum NivelClasificacion {
  FONDO = 'FONDO',
  SUBFONDO = 'SUBFONDO',
  SECCION = 'SECCION',
  SUBSECCION = 'SUBSECCION',
  SERIE = 'SERIE',
  SUBSERIE = 'SUBSERIE',
}
export const ORDEN_NIVELES = Object.values(NivelClasificacion);

export enum DisposicionFinal {
  CONSERVACION_PERMANENTE = 'CONSERVACION_PERMANENTE',
  SELECCION_MUESTREO = 'SELECCION_MUESTREO',
  ELIMINACION = 'ELIMINACION',
}

export enum TipoUbicacion {
  DEPOSITO = 'DEPOSITO',
  ESTANTE = 'ESTANTE',
  CUERPO = 'CUERPO',
  BALDA = 'BALDA',
}

export enum EstadoExpediente {
  EN_GESTION = 'EN_GESTION',
  EN_TRANSFERENCIA = 'EN_TRANSFERENCIA',
  EN_ARCHIVO_CENTRAL = 'EN_ARCHIVO_CENTRAL',
  PRESTADO = 'PRESTADO',
  /** Baja definitiva autorizada por la Comisión de Valoración. */
  ELIMINADO = 'ELIMINADO',
  /** Conservación permanente: pasa al Archivo Histórico. */
  HISTORICO = 'HISTORICO',
}

export enum EstadoFoliacion {
  SIN_FOLIAR = 'SIN_FOLIAR',
  EN_PROCESO = 'EN_PROCESO',
  FOLIADO = 'FOLIADO',
}

export enum Sensibilidad {
  PUBLICO = 'PUBLICO',
  RESERVADO = 'RESERVADO',
}

export enum EstadoTransferencia {
  BORRADOR = 'BORRADOR',
  ENVIADO = 'ENVIADO',
  EN_REVISION = 'EN_REVISION',
  APROBADO_Y_RECIBIDO = 'APROBADO_Y_RECIBIDO',
  OBSERVADO = 'OBSERVADO',
}

export enum EstadoPrestamo {
  SOLICITADO = 'SOLICITADO',
  PRESTADO = 'PRESTADO',
  DEVUELTO = 'DEVUELTO',
  EN_MORA = 'EN_MORA',
}

export enum TipoSolicitante {
  UNIDAD = 'UNIDAD',
  AUDITOR = 'AUDITOR',
}

export enum EstadoPropuesta {
  BORRADOR = 'BORRADOR',
  EN_COMISION = 'EN_COMISION',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  EJECUTADA = 'EJECUTADA',
}

/** Decisión por expediente cuando la disposición es selección / muestreo. */
export enum ResolucionItem {
  CONSERVAR = 'CONSERVAR',
  ELIMINAR = 'ELIMINAR',
}
