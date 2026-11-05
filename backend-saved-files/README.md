# Backend — Archivo Municipal (NestJS)

Ver el [README principal](../README.md) para la puesta en marcha, roles y reglas de negocio.

Módulos (`src/`): `auth`, `usuarios`, `unidades`, `clasificacion` (cuadro + TRD + actas de valoración),
`ubicaciones` (depósito/estante/cuerpo/balda y cajas con QR), `expedientes` (documentos PDF, hash, foliación),
`transferencias`, `prestamos`, `reportes` (PDF), `dashboard`, `auditoria`.

Convención: los cambios de estado usan `actualizar()` (`common/util/actualizar.ts`) en lugar de `repo.update()`,
para que `actualizado_por` y la bitácora se registren siempre.
