# Sistema de Gestión de Archivo Municipal (GAM — Bolivia)

Control, catalogación, foliación, transferencia y préstamo de expedientes del Archivo Central e Histórico,
con trazabilidad de la ubicación física y digital (Ley 2341, Ley 1178 SAFCO, lineamientos del ABNB).

| Carpeta                | Tecnología                                              |
| ---------------------- | ------------------------------------------------------- |
| `backend-saved-files`  | NestJS 11+ · TypeORM · PostgreSQL · JWT                 |
| `frontend-saved-files` | Vue 3 (Composition API) · Vite · Tailwind CSS 4 · Pinia |

## Puesta en marcha

Requisitos: Node 22+, PostgreSQL 14+.

```bash
# 1. Base de datos
createdb archivo_municipal

# 2. Backend
cd backend-saved-files
cp .env.example .env        # editar credenciales, JWT_SECRET y ADMIN_PASSWORD
npm install
npm run start:dev           # http://localhost:3000/api

# 3. Frontend
cd ../frontend-saved-files
npm install
npm run dev                 # http://localhost:5173  (reenvía /api al backend)
```

Con `DB_SYNC=true` (solo desarrollo) las tablas se crean solas. El primer arranque crea el usuario
administrador de `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

> En el `.env`, los valores con `#` o `$` deben ir entre comillas (`ADMIN_PASSWORD="Clave#2026"`),
> porque un `#` sin comillas se interpreta como comentario.

**Producción:** poner `DB_SYNC=false`, generar y versionar migraciones de TypeORM, definir un `JWT_SECRET`
largo y aleatorio, y servir `frontend-saved-files/dist` (`npm run build`) detrás de HTTPS.

## Roles

| Rol                       | Puede                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ROLE_ADMIN`              | Todo: usuarios, unidades, cuadro de clasificación y TRD, bitácora                                                   |
| `ROLE_ARCHIVISTA`         | Aprobar transferencias, ubicar cajas, autorizar préstamos, foliación definitiva y re-foliación, actas de valoración |
| `ROLE_RESPONSABLE_UNIDAD` | Crear expedientes de su unidad, cargar PDF, armar y enviar transferencias, solicitar préstamos                      |
| `ROLE_CONSULTOR`          | Solo lectura de expedientes públicos, ubicaciones, actas y bitácora                                                 |

## Reglas implementadas

- **Foliación:** `CHECK (foja_fin >= foja_inicio)` en BD y validación en el servicio (sin solapes ni vacíos; numeración continua desde la foja 1). Un expediente foliado no admite documentos hasta que el archivista reabre la foliación.
- **Integridad:** al cargar cada PDF se calcula su SHA-256; el visor lo recalcula y avisa si el archivo fue alterado.
- **Transferencias:** `BORRADOR → ENVIADO → EN_REVISION → APROBADO_Y_RECIBIDO` (u `OBSERVADO`, que se corrige y reenvía). Para aprobar: recepción física confirmada, caja asignada con capacidad y foliación definitiva.
- **Préstamos:** un acta puede incluir varios expedientes. `SOLICITADO → PRESTADO → DEVUELTO`; pasa a `EN_MORA` automáticamente al vencer. La devolución puede ser parcial (por expediente): el acta se cierra al devolver el último. Un expediente no puede estar en dos préstamos abiertos. Una solicitud rechazada se da de baja (soft delete) con su motivo.
- **Disposición final:** al cumplirse el plazo de la TRD (años en gestión + años en central, contados desde el año de la fecha extrema final), el expediente aparece como vencido. El archivista arma una **propuesta** por tipo de disposición: `BORRADOR → EN_COMISION → APROBADA | RECHAZADA → EJECUTADA`. Aprobar exige el número y la fecha del acta de la Comisión de Valoración. Al ejecutar, la eliminación deja el expediente en `ELIMINADO` (se libera su caja) y la conservación permanente lo pasa a `HISTORICO`; en selección / muestreo se decide expediente por expediente. Los archivos PDF digitales **no se borran automáticamente**.
- **Auditoría:** todas las tablas llevan `creado_por`, `fecha_creacion`, `actualizado_por`, `fecha_actualizacion`, `activo`. Además, `bitacora_auditoria` guarda cada alta y cambio (con valores anteriores y nuevos) y un trigger de PostgreSQL impide modificarla o borrarla. Las contraseñas nunca se registran.
- **Códigos:** expediente = `código de serie / gestión / correlativo` (p. ej. `1.1.1/2026/0001`); cajas `CAJ-000001`; transferencias `TR-2026-0001`; préstamos `PR-2026-0001`.
- **Reportes PDF:** carátula de expediente, etiqueta de caja con QR, acta de préstamo, inventario de transferencia y acta de disposición final. Son un formato referencial: ajústalos al formulario oficial vigente del ABNB en `backend-saved-files/src/reportes/reportes.service.ts`.

## Pruebas

```bash
cd backend-saved-files
npm test                                   # unitarias (roles, foliación, estados)
npm run build && npm run start:prod &      # servidor con BD vacía
ADMIN_PASS='...' STORAGE_DIR=./storage node scripts/smoke.mjs   # flujo completo de punta a punta
```

`scripts/smoke.mjs` recorre unas 80 verificaciones: RBAC, clasificación, foliación, hash, transferencia,
préstamo múltiple y mora, disposición final, PDFs y bitácora inmutable. Está pensado para una BD nueva y de pruebas
(usa `psql` como usuario `postgres` para simular fechas y estados).

> Aún no hay migraciones: con `DB_SYNC=true` TypeORM ajusta el esquema, pero si ya tenías una BD con datos de una
> versión anterior (el modelo de préstamos cambió a acta + detalle), recréala o escribe la migración correspondiente.
