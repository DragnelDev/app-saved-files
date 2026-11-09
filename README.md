# Sistema de Gestión de Archivo Municipal (GAM — Bolivia)

Control, catalogación, foliación, transferencia y préstamo de expedientes del Archivo Central e Histórico,
con trazabilidad de la ubicación física y digital (Ley 2341, Ley 1178 SAFCO, lineamientos del ABNB).

| Carpeta                | Tecnología                                              |
| ---------------------- | ------------------------------------------------------- |
| `backend-saved-files`  | NestJS 11+ · TypeORM · PostgreSQL · JWT                 |
| `frontend-saved-files` | Vue 3 (Composition API) · Vite · Tailwind CSS 4 · Pinia |

## Instalación en una PC de oficina (un solo programa)

El backend sirve también el frontend: basta con **un programa en un puerto** (3000). Requisitos (Windows 10 u 11): Node.js 22 LTS
y PostgreSQL 16 (instaladores oficiales; anota la contraseña del usuario `postgres`). Funciona en Windows y en Linux.

1. Crea la base de datos `archivo_municipal` (pgAdmin o `createdb archivo_municipal`).
2. Copia la carpeta del proyecto a la PC (p. ej. `C:\ArchivoMunicipal`).
3. En `backend-saved-files`, copia `.env.example` como `.env` y edítalo: `DB_PASSWORD`, un `JWT_SECRET` largo y aleatorio,
   `ADMIN_USERNAME` / `ADMIN_PASSWORD` (entre comillas si lleva `#` o `$`), `STORAGE_DIR` (carpeta de los PDF, mejor en un
   disco con espacio) y `RESPALDO_DIR` (idealmente un disco externo).
4. Doble clic en **`instalar.bat`** (instala dependencias y compila; solo la primera vez y tras cada actualización).
5. Doble clic en **`iniciar.bat`**. La primera vez crea las tablas (migraciones) y el administrador. Abre <http://localhost:3000>.
   Ingresa con el usuario y la contraseña del `.env`: el sistema te obligará a cambiar esa contraseña en el primer ingreso.
6. Para que otras PC de la red entren, ejecuta **una vez** `abrir-firewall.bat` como administrador (clic derecho → _Ejecutar como administrador_;
   abre el puerto 3000 solo para redes privadas o de dominio). Luego abren `http://IP-DE-ESA-PC:3000` (la IP se ve con `ipconfig`).
   En una red local el tráfico va por HTTP sin cifrar; si se abre a Internet hay que poner HTTPS delante.

En Linux/macOS: `npm install && npm run build` en ambas carpetas y luego `node dist/main.js` dentro de `backend-saved-files`.

### Respaldos (importante)

- **`respaldo.bat`** (o `npm run respaldo`) guarda en `RESPALDO_DIR/AAAA-MM-DD-HH-MM/` la base de datos (`pg_dump`) y todos los PDF,
  y conserva los últimos `RESPALDO_CONSERVAR` respaldos. Prográmalo a diario: _Programador de tareas de Windows → Crear tarea básica →
  Diaria → Iniciar un programa → `respaldo.bat` con el argumento `silencioso`_.
- Copia esa carpeta a un disco externo u otra PC: un respaldo en el mismo disco no protege contra una falla del disco.
- **Restaurar:** detén el sistema y ejecuta `npm run restaurar -- respaldos/2026-11-06-09-30 --confirmar` dentro de `backend-saved-files`
  (sin `--confirmar` solo muestra qué haría). Sobrescribe los datos actuales. `pg_dump` y `pg_restore` se buscan solos
  (PATH y `C:\Program Files\PostgreSQL\<versión>\bin`); si tu instalación está en otro lugar, indícalo con `PG_DUMP` / `PG_RESTORE` en el `.env`.
- Se verificó restaurar en una base nueva: mismos registros, PDF idénticos byte a byte y bitácora inmutable intacta.

### Arranque automático y dimensionamiento

- **Arranque automático:** _Programador de tareas → Crear tarea básica → Al iniciar sesión → Iniciar un programa → `iniciar.bat`_. Si la PC se apaga o
  reinicia, el sistema vuelve a quedar disponible al iniciar sesión (PostgreSQL se inicia solo como servicio de Windows).
- **Rendimiento medido** con 10.000 expedientes y 500 cajas cargados: listados paginados, búsquedas por texto, fechas extremas o caja, panel del archivista
  y vencimientos responden en 15 a 70 ms; el listado completo de cajas, en 23 ms. Para 1.000 a 10.000 expedientes la base de datos no es el límite.
- **Disco (estimación, no medida):** lo que ocupa es el escaneo. Como orientación, un PDF en blanco y negro a 150 ppp pesa entre 50 y 150 KB por página,
  es decir 2 a 15 MB por expediente de 40 hojas: **10.000 expedientes ≈ 20 a 150 GB**. Conviene un disco de al menos 500 GB para los PDF y un
  respaldo externo de igual capacidad. La base de datos sin PDF ocupó 14 MB con los 10.000 expedientes de prueba (medido); como la bitácora registra cada acción real,
  conviene calcular unos cientos de MB al año de uso intenso (estimación).

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

- **Cuentas:** las contraseñas que asigna el administrador (alta o restablecimiento) son temporales: hasta cambiarla, el usuario solo puede entrar a "Mi cuenta". Política: 8 a 128 caracteres, con al menos una letra y un número. Cada usuario cambia la suya en "Mi cuenta" (pide la actual). Tras 5 intentos fallidos de ingreso desde una misma IP y usuario, se bloquea 15 minutos (el contador está en memoria y se reinicia al reiniciar el sistema).

- **Foliación:** `CHECK (foja_fin >= foja_inicio)` en BD y validación en el servicio (sin solapes ni vacíos; numeración continua desde la foja 1). Un expediente foliado no admite documentos hasta que el archivista reabre la foliación.
- **Integridad:** al cargar cada PDF se calcula su SHA-256; el visor lo recalcula y avisa si el archivo fue alterado.
- **Transferencias:** `BORRADOR → ENVIADO → EN_REVISION → APROBADO_Y_RECIBIDO` (u `OBSERVADO`, que se corrige y reenvía). Para aprobar: recepción física confirmada, caja asignada con capacidad y foliación definitiva.
- **Préstamos:** un acta puede incluir varios expedientes. `SOLICITADO → PRESTADO → DEVUELTO`; pasa a `EN_MORA` automáticamente al vencer. La devolución puede ser parcial (por expediente): el acta se cierra al devolver el último. Un expediente no puede estar en dos préstamos abiertos. Una solicitud rechazada se da de baja (soft delete) con su motivo.
- **Disposición final:** al cumplirse el plazo de la TRD (años en gestión + años en central, contados desde el año de la fecha extrema final), el expediente aparece como vencido. El archivista arma una **propuesta** por tipo de disposición: `BORRADOR → EN_COMISION → APROBADA | RECHAZADA → EJECUTADA`. Aprobar exige el número y la fecha del acta de la Comisión de Valoración. Al ejecutar, la eliminación deja el expediente en `ELIMINADO` (se libera su caja) y la conservación permanente lo pasa a `HISTORICO`; en selección / muestreo se decide expediente por expediente. Los archivos PDF digitales **no se borran automáticamente**.
- **Auditoría:** todas las tablas llevan `creado_por`, `fecha_creacion`, `actualizado_por`, `fecha_actualizacion`, `activo`. Además, `bitacora_auditoria` guarda cada alta y cambio (con valores anteriores y nuevos) y un trigger de PostgreSQL impide modificarla o borrarla. Las contraseñas nunca se registran.
- **Códigos:** expediente = `código de serie / gestión / correlativo` (p. ej. `1.1.1/2026/0001`); cajas `CAJ-000001`; transferencias `TR-2026-0001`; préstamos `PR-2026-0001`.
- **Reportes PDF:** carátula de expediente, etiquetas de caja y de carpeta (con QR y código de barras Code 128), etiquetas de todas las carpetas de una caja, acta de préstamo, inventario de transferencia y acta de disposición final. El formato es el adoptado como definitivo para este GAM; si el ABNB o el GAM exigen otro, se modifica en `backend-saved-files/src/reportes/reportes.service.ts`.

## Pruebas

```bash
cd backend-saved-files
npm test                                   # unitarias (roles, foliación, estados)
npm run build && npm run start:prod &      # servidor con BD vacía
ADMIN_PASS='...' STORAGE_DIR=./storage node scripts/smoke.mjs   # flujo completo de punta a punta
```

Frontend (renderiza cada pantalla por rol contra el backend real, con los datos que deja la prueba de humo, y falla ante
cualquier advertencia de Vue):

```bash
cd frontend-saved-files
VITE_API_URL=http://localhost:3000/api npm run test:vistas   # sin VITE_API_URL las pruebas se omiten
```

`scripts/smoke.mjs` recorre unas 80 verificaciones: RBAC, clasificación, foliación, hash, transferencia,
préstamo múltiple y mora, disposición final, PDFs y bitácora inmutable. Está pensado para una BD nueva y de pruebas
(usa `psql` como usuario `postgres` para simular fechas y estados; al terminar, las cuentas de prueba quedan con la contraseña `Cambiada#2026`).

> Aún no hay migraciones: con `DB_SYNC=true` TypeORM ajusta el esquema, pero si ya tenías una BD con datos de una
> versión anterior (el modelo de préstamos cambió a acta + detalle), recréala o escribe la migración correspondiente.
