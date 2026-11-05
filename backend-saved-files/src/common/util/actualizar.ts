import { EntityManager, EntityTarget, FindOptionsWhere, ObjectLiteral } from 'typeorm';

/**
 * UPDATE auditado: carga las filas y las guarda con `save`, de modo que los suscriptores
 * rellenan `actualizado_por` y registran el cambio en la bitácora (un `update()` directo
 * de TypeORM no dispara esos eventos). Devuelve la cantidad de filas actualizadas.
 */
export async function actualizar<T extends ObjectLiteral>(
  m: EntityManager,
  entidad: EntityTarget<T>,
  criterio: string | FindOptionsWhere<T>,
  cambios: Record<string, unknown>,
): Promise<number> {
  const where = (typeof criterio === 'string' ? { id: criterio } : criterio) as FindOptionsWhere<T>;
  const filas = await m.find(entidad, { where });
  for (const fila of filas) await m.save(entidad, Object.assign(fila, cambios) as never);
  return filas.length;
}
