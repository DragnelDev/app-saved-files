import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { requestContext } from '../common/context/request-context.js';
import { AuditableEntity } from '../common/entities/auditable.entity.js';
import { Bitacora } from './bitacora.entity.js';

const SENSIBLES = /password|hash_pass/i;

function limpiar(obj: object | undefined | null): Record<string, unknown> | null {
  if (!obj) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSIBLES.test(k) || typeof v === 'function') continue;
    if (v !== null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) continue; // relaciones
    out[k] = v;
  }
  return out;
}

/** Registra cada INSERT/UPDATE de entidades auditables dentro de la misma transacción. */
@EventSubscriber()
export class BitacoraSubscriber implements EntitySubscriberInterface<AuditableEntity> {
  async afterInsert(event: InsertEvent<AuditableEntity>): Promise<void> {
    if (!(event.entity instanceof AuditableEntity)) return;
    await event.manager.insert(Bitacora, {
      tabla: event.metadata.tableName,
      registroId: event.entity.id,
      accion: 'INSERT',
      usuarioId: requestContext.getStore()?.userId ?? null,
      datosAnteriores: null,
      datosNuevos: limpiar(event.entity) as never,
    });
  }

  async afterUpdate(event: UpdateEvent<AuditableEntity>): Promise<void> {
    const ent = event.entity;
    if (!(ent instanceof AuditableEntity) || !event.databaseEntity) return;
    const antes: Record<string, unknown> = {};
    const despues: Record<string, unknown> = {};
    const prev = limpiar(event.databaseEntity) ?? {};
    for (const [k, v] of Object.entries(limpiar(ent) ?? {})) {
      if (k === 'fechaActualizacion' || k === 'actualizadoPor') continue;
      if (JSON.stringify(prev[k]) !== JSON.stringify(v) && k in prev) {
        antes[k] = prev[k];
        despues[k] = v;
      }
    }
    if (!Object.keys(despues).length) return;
    await event.manager.insert(Bitacora, {
      tabla: event.metadata.tableName,
      registroId: ent.id,
      accion: 'UPDATE',
      usuarioId: requestContext.getStore()?.userId ?? null,
      datosAnteriores: antes as never,
      datosNuevos: despues as never,
    });
  }
}
