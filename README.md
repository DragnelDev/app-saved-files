# Sistema de Gestión de Archivo Municipal (GAM — Bolivia)

Control, catalogación, foliación, transferencia y préstamo de expedientes del Archivo Central e Histórico,
con trazabilidad de la ubicación física y digital (Ley 2341, Ley 1178 SAFCO, lineamientos del ABNB).

| Carpeta                | Tecnología                                              |
| ---------------------- | ------------------------------------------------------- |
| `backend-saved-files`  | NestJS 11+ · TypeORM · PostgreSQL · JWT                 |
| `frontend-saved-files` | Vue 3 (Composition API) · Vite · Tailwind CSS 4 · Pinia |

## Instalación en una PC de oficina (un solo programa)

El backend sirve también el frontend: basta con **un programa en un puerto** (3000). Requisitos: Node.js 22 LTS
y PostgreSQL 16 (instaladores oficiales; anota la contraseña del usuario `postgres`). Funciona en Windows y en Linux.

1. Crea la base de datos `archivo_municipal` (pgAdmin o `createdb archivo_municipal`).
2. Copia la carpeta del proyecto a la PC (p. ej. `C:\ArchivoMunicipal`).
3. En `backend-saved-files`, copia `.env.example` como `.env` y edítalo: `DB_PASSWORD`, un `JWT_SECRET` largo y aleatorio,
   `ADMIN_USERNAME` / `ADMIN_PASSWORD` (entre comillas si lleva `#` o `$`), `STORAGE_DIR` (carpeta de los PDF, mejor en un
   disco con espacio) y `RESPALDO_DIR` (idealmente un disco externo).
4. Doble clic en **`instalar.bat`** (instala dependencias y compila; solo la primera vez y tras cada actualización).
5. Doble clic en **`iniciar.bat`**. La primera vez crea las tablas (migraciones) y el administrador. Abre <http://localhost:3000>.
6. Las otras PC de la red abren `http://IP-DE-ESA-PC:3000` (permite el puerto 3000 en el Firewall de Windows).
   En una red local el tráfico va por HTTP sin cifrar; si se abre a Internet hay que poner HTTPS delante.

En Linux/macOS: `npm install && npm run build` en ambas carpetas y luego `node dist/main.js` dentro de `backend-saved-files`.

### Respaldos (importante)

- **`respaldo.bat`** (o `npm run respaldo`) guarda en `RESPALDO_DIR/AAAA-MM-DD-HH-MM/` la base de datos (`pg_dump`) y todos los PDF,
  y conserva los últimos `RESPALDO_CONSERVAR` respaldos. Prográmalo a diario: _Programador de tareas de Windows → Crear tarea básica →
  Diaria → Iniciar un programa → `respaldo.bat` con el argumento `silencioso`_.
- Copia esa carpeta a un disco externo u otra PC: un respaldo en el mismo disco no protege contra una falla del disco.
- **Restaurar:** detén el sistema y ejecuta `npm run restaurar -- respaldos/2026-11-06-09-30 --confirmar` dentro de `backend-saved-files`
  (sin `--confirmar` solo muestra qué haría). Sobrescribe los datos actuales. `pg_dump` y `pg_restore` deben estar en el PATH
  (carpeta `bin` de PostgreSQL) o indicarse con `PG_DUMP` / `PG_RESTORE` en el `.env`.
- Se verificó restaurar en una base nueva: mismos registros, PDF idénticos byte a byte y bitácora inmutable intacta.

### Actualizar a una versión nueva

Haz un respaldo, reemplaza el código **sin tocar** `.env` ni la carpeta de PDF, ejecuta `instalar.bat` e `iniciar.bat`:
las migraciones nuevas se aplican solas al arrancar.

## Desarrollo

```bash
createdb archivo_municipal
cd backend-saved-files && cp .env.example .env && npm install && npm run start:dev   # http://localhost:3000/api
cd ../frontend-saved-files && npm install && npm run dev                              # http://localhost:5173 (proxy /api)
```

**Esquema de la base de datos:** se gestiona con migraciones de TypeORM (`src/migrations`), que se aplican al arrancar con
`DB_SYNC=false` (valor por defecto). `DB_SYNC=true` hace que TypeORM ajuste las tablas solo y puede borrar columnas con datos:
úsalo únicamente con datos descartables. Al cambiar una entidad: `npm run migracion:generar -- NombreDelCambio` (con la BD en el
estado de la última migración) crea el archivo de migración con la diferencia; revísalo, compílalo y reinicia.

## Roles

| Rol                       | Puede                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ROLE_ADMIN`              | Todo: usuarios, unidades, cuadro de clasificación y TRD, bitácora                                                                                                            |
| `ROLE_ARCHIVISTA`         | Aprobar transferencias (y crearlas a nombre de una unidad), ubicar cajas, autorizar préstamos, foliación definitiva y re-foliación, disposición final y actas de la Comisión |
| `ROLE_RESPONSABLE_UNIDAD` | Crear expedientes de su unidad, cargar PDF, armar y enviar transferencias, solicitar préstamos                                                                               |
| `ROLE_CONSULTOR`          | Solo lectura de expedientes públicos, ubicaciones, actas y bitácora                                                                                                          |

## Reglas implementadas

- **Foliación:** `CHECK (foja_fin >= foja_inicio)` en BD y validación en el servicio (sin solapes ni vacíos; numeración continua desde la foja 1). Un expediente foliado no admite documentos hasta que el archivista reabre la foliación.
- **Integridad:** al cargar cada PDF se calcula su SHA-256; el visor lo recalcula y avisa si el archivo fue alterado.
- **Transferencias:** `BORRADOR → ENVIADO → EN_REVISION → APROBADO_Y_RECIBIDO` (u `OBSERVADO`, que se corrige y reenvía). Para aprobar: recepción física confirmada, caja asignada con capacidad y foliación definitiva.
- **Préstamos:** un acta puede incluir varios expedientes. `SOLICITADO → PRESTADO → DEVUELTO`; pasa a `EN_MORA` automáticamente al vencer. La devolución puede ser parcial (por expediente): el acta se cierra al devolver el último. Un expediente no puede estar en dos préstamos abiertos. Una solicitud rechazada se da de baja (soft delete) con su motivo.
- **Disposición final:** al cumplirse el plazo de la TRD (años en gestión + años en central, contados desde el año de la fecha extrema final), el expediente aparece como vencido. El archivista arma una **propuesta** por tipo de disposición: `BORRADOR → EN_COMISION → APROBADA | RECHAZADA → EJECUTADA`. Aprobar exige el número y la fecha del acta de la Comisión de Valoración. Al ejecutar, la eliminación deja el expediente en `ELIMINADO` (se libera su caja) y la conservación permanente lo pasa a `HISTORICO`; en selección / muestreo se decide expediente por expediente. Los archivos PDF digitales **no se borran automáticamente**.
- **Auditoría:** todas las tablas llevan `creado_por`, `fecha_creacion`, `actualizado_por`, `fecha_actualizacion`, `activo`. Además, `bitacora_auditoria` guarda cada alta y cambio (con valores anteriores y nuevos) y un trigger de PostgreSQL impide modificarla o borrarla. Las contraseñas nunca se registran.
- **Códigos:** expediente = `código de serie / gestión / correlativo` (p. ej. `1.1.1/2026/0001`); cajas `CAJ-000001`; transferencias `TR-2026-0001`; préstamos `PR-2026-0001`.
- **Reportes PDF:** carátula de expediente, etiquetas de caja y de carpeta (con QR y código de barras Code 128), etiquetas de todas las carpetas de una caja, acta de préstamo, inventario de transferencia y acta de disposición final. Son un formato referencial: ajústalos al formulario oficial vigente del ABNB en `backend-saved-files/src/reportes/reportes.service.ts`.

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
