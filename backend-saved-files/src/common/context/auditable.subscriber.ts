import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { AuditableEntity } from '../entities/auditable.entity.js';
import { requestContext } from './request-context.js';

/** Rellena creado_por / actualizado_por con el usuario autenticado de la petición. */
@EventSubscriber()
export class AuditableSubscriber
  implements EntitySubscriberInterface<AuditableEntity>
{
  beforeInsert(event: InsertEvent<AuditableEntity>): void {
    const userId = requestContext.getStore()?.userId;
    if (event.entity instanceof AuditableEntity && userId) {
      event.entity.creadoPor ??= userId;
      event.entity.actualizadoPor = userId;
    }
  }

  beforeUpdate(event: UpdateEvent<AuditableEntity>): void {
    const userId = requestContext.getStore()?.userId;
    if (event.entity instanceof AuditableEntity && userId) {
      event.entity.actualizadoPor = userId;
    }
  }
}
