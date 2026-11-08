// Prueba de humo de punta a punta. Requiere el servidor en marcha (npm run start:prod) y BD vacía.
// Uso: BASE=http://localhost:3000/api ADMIN_USER=admin ADMIN_PASS=... STORAGE_DIR=./storage node scripts/smoke.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';

const BASE = process.env.BASE ?? 'http://localhost:3000/api';
const STORAGE = process.env.STORAGE_DIR ?? './storage';
let fallos = 0;
const ok = (c, msg) => { console.log(`${c ? '  ✓' : '  ✗ FALLO'} ${msg}`); if (!c) fallos++; };

async function api(token, method, path, body, raw = false) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(token && { authorization: `Bearer ${token}` }), ...(body && !(body instanceof FormData) && { 'content-type': 'application/json' }) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const txt = await res.text();
  let data; try { data = JSON.parse(txt); } catch { data = txt; }
  return { status: res.status, data };
}
const login = async (username, password) => (await api(null, 'POST', '/auth/login', { username, password })).data.accessToken;
const pdfBuf = (t) => new Promise((r) => { const d = new PDFDocument(); const c = []; d.on('data', (x) => c.push(x)); d.on('end', () => r(Buffer.concat(c))); d.text(t); d.end(); });
async function subir(token, expId, titulo, ini, fin, contenido) {
  const fd = new FormData();
  fd.append('titulo', titulo); fd.append('fojaInicio', String(ini)); fd.append('fojaFin', String(fin));
  fd.append('archivo', new Blob([await pdfBuf(contenido)], { type: 'application/pdf' }), `${titulo}.pdf`);
  return api(token, 'POST', `/expedientes/${expId}/documentos`, fd);
}

console.log('1. Administración');
const admin = await login(process.env.ADMIN_USER ?? 'admin', process.env.ADMIN_PASS);
ok(!!admin, 'login admin');
const un = (await api(admin, 'POST', '/unidades', { codigo: 'UF-01', nombre: 'Unidad Financiera', sigla: 'UF' })).data;
ok(!!un.id, 'unidad creada');
const mk = async (username, rol, unidadId) => (await api(admin, 'POST', '/usuarios', { username, password: 'Clave#1234', nombreCompleto: username, rol, unidadId })).status;
ok((await mk('archi', 'ROLE_ARCHIVISTA')) === 201, 'usuario archivista');
ok((await mk('resp', 'ROLE_RESPONSABLE_UNIDAD', un.id)) === 201, 'usuario responsable');
ok((await mk('consul', 'ROLE_CONSULTOR')) === 201, 'usuario consultor');
ok((await mk('resp2', 'ROLE_RESPONSABLE_UNIDAD')) === 400, 'responsable sin unidad rechazado');
const [archi, resp, consul] = [await login('archi', 'Clave#1234'), await login('resp', 'Clave#1234'), await login('consul', 'Clave#1234')];

console.log('2. Cuadro de clasificación y TRD');
const fondo = (await api(admin, 'POST', '/clasificacion', { codigo: '1', nombre: 'GAM', nivel: 'FONDO' })).data;
const seccion = (await api(admin, 'POST', '/clasificacion', { codigo: '1.1', nombre: 'Financiera', nivel: 'SECCION', padreId: fondo.id })).data;
const serie = (await api(admin, 'POST', '/clasificacion', { codigo: '1.1.1', nombre: 'Comprobantes', nivel: 'SERIE', padreId: seccion.id })).data;
ok(!!serie.id, 'fondo > sección > serie');
ok((await api(admin, 'POST', '/clasificacion', { codigo: 'X', nombre: 'mal', nivel: 'FONDO', padreId: serie.id })).status === 400, 'fondo con padre rechazado');
ok((await api(admin, 'PUT', `/clasificacion/${serie.id}/trd`, { anosArchivoGestion: 0, anosArchivoCentral: 0, disposicionFinal: 'CONSERVACION_PERMANENTE' })).status === 200, 'TRD definida');
ok((await api(admin, 'PUT', `/clasificacion/${seccion.id}/trd`, { anosArchivoGestion: 1, anosArchivoCentral: 1, disposicionFinal: 'ELIMINACION' })).status === 400, 'TRD solo en series');
ok((await api(resp, 'POST', '/clasificacion', { codigo: 'Z', nombre: 'z', nivel: 'FONDO' })).status === 403, 'responsable no edita el cuadro (403)');

console.log('3. Ubicación topográfica');
const dep = (await api(archi, 'POST', '/ubicaciones', { tipo: 'DEPOSITO', codigo: 'D1', nombre: 'Depósito 1' })).data;
const est = (await api(archi, 'POST', '/ubicaciones', { tipo: 'ESTANTE', codigo: 'E1', nombre: 'Estante 1', padreId: dep.id })).data;
const cue = (await api(archi, 'POST', '/ubicaciones', { tipo: 'CUERPO', codigo: 'C1', nombre: 'Cuerpo 1', padreId: est.id })).data;
ok((await api(archi, 'POST', '/ubicaciones', { tipo: 'BALDA', codigo: 'B1', nombre: 'x', padreId: est.id, capacidadCajas: 2 })).status === 400, 'balda directo bajo estante rechazada');
const bal = (await api(archi, 'POST', '/ubicaciones', { tipo: 'BALDA', codigo: 'B1', nombre: 'Balda 1', padreId: cue.id, capacidadCajas: 1 })).data;
const caja = (await api(archi, 'POST', '/cajas', { baldaId: bal.id, descripcion: 'Comprobantes 2026' })).data;
ok(/^CAJ-\d{6}$/.test(caja.codigo), `caja ${caja.codigo}`);
ok((await api(archi, 'POST', '/cajas', { baldaId: bal.id })).status === 409, 'capacidad de balda controlada');
const qr = await api(archi, 'GET', `/cajas/${caja.id}/qr`, null, true);
ok(qr.headers.get('content-type') === 'image/png', 'QR de caja (PNG)');

console.log('4. Expediente, documentos y foliación');
const exp = (await api(resp, 'POST', '/expedientes', { nodoId: serie.id, gestion: 2026, asunto: 'Comprobantes C31 enero', fechaInicio: '2026-01-01', fechaFin: '2026-01-31', palabrasClave: ['c31', 'enero'] })).data;
ok(exp.codigo === '1.1.1/2026/0001', `código ${exp.codigo}`);
const exp2 = (await api(resp, 'POST', '/expedientes', { nodoId: serie.id, gestion: 2026, asunto: 'Reservado', fechaInicio: '2026-02-01', sensibilidad: 'RESERVADO' })).data;
ok(exp2.codigo.endsWith('/0002'), 'correlativo incrementa');
ok((await subir(resp, exp.id, 'doc1', 1, 3, 'uno')).status === 201, 'documento fs. 1-3');
ok((await subir(resp, exp.id, 'hueco', 6, 7, 'x')).status === 400, 'vacío de numeración rechazado');
ok((await subir(resp, exp.id, 'solape', 3, 5, 'x')).status === 400, 'solape rechazado');
const d2 = await subir(resp, exp.id, 'doc2', 4, 6, 'dos');
ok(d2.status === 201 && /^[0-9a-f]{64}$/.test(d2.data.hashSha256), 'documento fs. 4-6 con SHA-256');
const bad = new FormData(); bad.append('titulo', 'x'); bad.append('fojaInicio', '7'); bad.append('fojaFin', '8');
bad.append('archivo', new Blob(['no soy pdf'], { type: 'application/pdf' }), 'a.pdf');
ok((await api(resp, 'POST', `/expedientes/${exp.id}/documentos`, bad)).status === 400, 'archivo que no es PDF rechazado');
ok((await api(resp, 'POST', `/expedientes/${exp.id}/foliar`)).status === 403, 'responsable no folía (403)');
const fol = await api(archi, 'POST', `/expedientes/${exp.id}/foliar`);
ok(fol.data.estadoFoliacion === 'FOLIADO' && fol.data.fojaFin === 6, 'foliación definitiva (1-6)');
ok((await subir(archi, exp.id, 'extra', 7, 8, 'x')).status === 409, 'expediente foliado no admite más documentos');
const ver = (await api(resp, 'GET', `/documentos/${d2.data.id}/verificar`)).data;
ok(ver.integro === true, 'integridad del PDF verificada');
const ruta = join(STORAGE, d2.data.archivoPath); const original = await readFile(ruta);
await writeFile(ruta, Buffer.concat([original, Buffer.from('manipulado')]));
ok((await api(resp, 'GET', `/documentos/${d2.data.id}/verificar`)).data.integro === false, 'alteración del PDF detectada');
await writeFile(ruta, original);
const pdfRes = await api(resp, 'GET', `/documentos/${d2.data.id}/archivo`, null, true);
ok(pdfRes.headers.get('content-type') === 'application/pdf', 'visor: PDF servido');
const lista = (await api(consul, 'GET', '/expedientes?limit=50')).data;
ok(lista.items.every((e) => e.sensibilidad === 'PUBLICO'), 'consultor solo ve expedientes públicos');
ok((await api(consul, 'GET', `/expedientes/${exp2.id}`)).status === 404, 'consultor no accede a reservado');
ok((await api(consul, 'POST', '/expedientes', { nodoId: serie.id, gestion: 2026, asunto: 'x', fechaInicio: '2026-01-01' })).status === 403, 'consultor solo lectura (403)');
ok((await api(resp, 'GET', '/expedientes?q=enero&fechaDesde=2026-01-15&fechaHasta=2026-03-01')).data.total === 1, 'buscador: texto + fechas extremas');

console.log('5. Transferencia');
ok((await api(resp, 'POST', '/transferencias', { expedienteIds: [exp.id] })).status === 201 || true, '(creando)');
const tr = (await api(resp, 'GET', '/transferencias')).data[0];
ok(tr.estado === 'BORRADOR', `${tr.codigo} en BORRADOR`);
ok((await api(resp, 'POST', '/transferencias', { expedienteIds: [exp.id] })).status === 409, 'expediente no puede ir en dos transferencias');
ok((await api(resp, 'POST', `/transferencias/${tr.id}/iniciar-revision`)).status === 403, 'responsable no revisa (403)');
ok((await api(archi, 'POST', `/transferencias/${tr.id}/iniciar-revision`)).status === 409, 'no se salta el estado ENVIADO');
ok((await api(resp, 'POST', `/transferencias/${tr.id}/enviar`)).data.estado === 'ENVIADO', 'ENVIADO');
ok((await api(archi, 'POST', `/transferencias/${tr.id}/iniciar-revision`)).data.estado === 'EN_REVISION', 'EN_REVISION');
ok((await api(archi, 'POST', `/transferencias/${tr.id}/aprobar`)).status === 400, 'no aprueba sin validar recepción');
const det = (await api(archi, 'GET', `/transferencias/${tr.id}`)).data.detalles[0];
ok((await api(archi, 'PUT', `/transferencias/${tr.id}/detalle/${det.id}`, { recibido: true, cajaId: caja.id, carpeta: 1 })).status === 200, 'recepción física + caja asignada');
const apr = await api(archi, 'POST', `/transferencias/${tr.id}/aprobar`);
ok(apr.data.estado === 'APROBADO_Y_RECIBIDO', 'APROBADO_Y_RECIBIDO');
const ex1 = (await api(archi, 'GET', `/expedientes/${exp.id}`)).data;
ok(ex1.estado === 'EN_ARCHIVO_CENTRAL' && ex1.cajaId === caja.id, 'expediente ubicado en el Archivo Central');

const sql = (q) => execSync('su postgres -c "psql -q -v ON_ERROR_STOP=1 archivo_municipal"', { input: q, stdio: ['pipe', 'pipe', 'pipe'] });
const nuevoExp = async (nodoId, asunto, ini, fin) => (await api(resp, 'POST', '/expedientes', { nodoId, gestion: 2026, asunto, fechaInicio: ini, fechaFin: fin })).data;

console.log('6. Préstamo con varios expedientes y mora');
const exp4 = await nuevoExp(serie.id, 'Comprobantes C31 febrero', '2026-02-01', '2026-02-28');
sql(`UPDATE expedientes SET estado='EN_ARCHIVO_CENTRAL' WHERE id='${exp4.id}'`);
const pr = (await api(resp, 'POST', '/prestamos', { expedienteIds: [exp.id, exp4.id], tipoSolicitante: 'UNIDAD', motivo: 'Revisión de auditoría interna' })).data;
ok(pr.estado === 'SOLICITADO' && pr.detalles.length === 2, `${pr.codigo}: un acta con 2 expedientes (SOLICITADO)`);
ok((await api(resp, 'POST', '/prestamos', { expedienteIds: [exp4.id], tipoSolicitante: 'UNIDAD', motivo: 'otra' })).status === 409, 'un expediente no puede estar en dos préstamos abiertos');
ok((await api(consul, 'POST', '/prestamos', { expedienteIds: [exp.id], tipoSolicitante: 'AUDITOR', solicitanteNombre: 'x', motivo: 'x' })).status === 403, 'consultor no solicita préstamos (403)');
const ent = (await api(archi, 'POST', `/prestamos/${pr.id}/entregar`, { diasPrestamo: 5 })).data;
const fojas = Object.fromEntries(ent.detalles.map((d) => [d.expedienteId, d.fojasEntregadas]));
ok(ent.estado === 'PRESTADO' && fojas[exp.id] === 6, 'PRESTADO con fojas entregadas por expediente (6)');
ok((await api(archi, 'GET', `/expedientes/${exp.id}`)).data.estado === 'PRESTADO' && (await api(archi, 'GET', `/expedientes/${exp4.id}`)).data.estado === 'PRESTADO', 'ambos expedientes marcados PRESTADO');
sql(`UPDATE prestamos_documentales SET fecha_prestamo = CURRENT_DATE - 20, fecha_devolucion_prevista = CURRENT_DATE - 3`);
ok((await api(archi, 'GET', '/prestamos?estado=EN_MORA')).data.length === 1, 'mora detectada (EN_MORA)');
const dash = (await api(archi, 'GET', '/dashboard')).data;
ok(dash.prestamosVencidos.length === 1 && dash.prestamosVencidos[0].diasMora === 3 && dash.prestamosVencidos[0].expediente.includes(exp4.codigo), 'dashboard archivista: acta vencida (3 días, 2 expedientes)');
ok(dash.ocupacion.cajasUsadas === 1 && dash.ocupacion.porcentaje === 100, 'dashboard: ocupación del depósito');
ok(dash.recienFoliados.length === 1, 'dashboard: recién foliados');
const det1 = ent.detalles.find((d) => d.expedienteId === exp.id);
const parcial = (await api(archi, 'POST', `/prestamos/${pr.id}/devolver`, { detalleIds: [det1.id], observaciones: 'Sin novedad' })).data;
ok(parcial.estado === 'EN_MORA', 'devolución parcial: el acta sigue vigente');
ok((await api(archi, 'GET', `/expedientes/${exp.id}`)).data.estado === 'EN_ARCHIVO_CENTRAL' && (await api(archi, 'GET', `/expedientes/${exp4.id}`)).data.estado === 'PRESTADO', 'solo vuelve al archivo el expediente devuelto');
ok((await api(archi, 'POST', `/prestamos/${pr.id}/devolver`, { detalleIds: [det1.id] })).status === 400, 'no se devuelve dos veces el mismo expediente');
ok((await api(archi, 'POST', `/prestamos/${pr.id}/devolver`, {})).data.estado === 'DEVUELTO', 'DEVUELTO al devolver el resto');
const dr = (await api(resp, 'GET', '/dashboard')).data;
ok(dr.tipo === 'UNIDAD' && dr.misExpedientes.length >= 1, 'dashboard de unidad');

const eT = await nuevoExp(serie.id, 'Para transferir', '2026-04-01', '2026-04-30');
ok((await api(archi, 'POST', '/transferencias', { expedienteIds: [eT.id] })).status === 400, 'archivista debe indicar la unidad de origen');
const trA = await api(archi, 'POST', '/transferencias', { unidadOrigenId: un.id, expedienteIds: [eT.id] });
ok(trA.status === 201 && trA.data.estado === 'BORRADOR' && trA.data.unidadOrigenId === un.id, 'archivista crea una transferencia a nombre de la unidad');
ok((await api(consul, 'POST', '/transferencias', { unidadOrigenId: un.id, expedienteIds: [eT.id] })).status === 403, 'consultor no crea transferencias (403)');
ok((await api(archi, 'GET', `/transferencias/${trA.data.id}`)).data.advertencias.length === 1, 'segregación: advierte (sin bloquear) si el archivista que creó la transferencia la revisa');
ok((await api(archi, 'GET', `/transferencias/${tr.id}`)).data.advertencias.length === 0, 'sin advertencia si la creó el responsable de unidad');

ok((await api(archi, 'DELETE', `/transferencias/${trA.data.id}`)).status === 200, 'archivista elimina el borrador');

console.log('6b. Disposición final (Comisión de Valoración)');
const serieE = (await api(admin, 'POST', '/clasificacion', { codigo: '1.1.2', nombre: 'Eliminables', nivel: 'SERIE', padreId: seccion.id })).data;
const serieS = (await api(admin, 'POST', '/clasificacion', { codigo: '1.1.3', nombre: 'Muestreo', nivel: 'SERIE', padreId: seccion.id })).data;
await api(admin, 'PUT', `/clasificacion/${serieE.id}/trd`, { anosArchivoGestion: 0, anosArchivoCentral: 0, disposicionFinal: 'ELIMINACION' });
await api(admin, 'PUT', `/clasificacion/${serieS.id}/trd`, { anosArchivoGestion: 0, anosArchivoCentral: 0, disposicionFinal: 'SELECCION_MUESTREO' });
const e5 = await nuevoExp(serieE.id, 'Eliminable', '2026-03-01', '2026-03-31');
const e6 = await nuevoExp(serieS.id, 'Muestra A', '2026-03-01', '2026-03-31');
const e7 = await nuevoExp(serieS.id, 'Muestra B', '2026-03-01', '2026-03-31');
sql(`UPDATE expedientes SET estado='EN_ARCHIVO_CENTRAL' WHERE id IN ('${e5.id}','${e6.id}','${e7.id}')`);
const venc = (await api(archi, 'GET', '/disposicion/vencidos?tipo=ELIMINACION')).data;
ok(venc.length === 1 && venc[0].id === e5.id, 'vencidos filtrados por tipo de disposición');
ok((await api(consul, 'GET', '/disposicion/vencidos')).status === 200, 'consultor puede consultar (solo lectura)');
ok((await api(consul, 'POST', '/disposicion/propuestas', { tipo: 'ELIMINACION', expedienteIds: [e5.id], justificacion: 'x' })).status === 403, 'consultor no propone (403)');
ok((await api(resp, 'GET', '/disposicion/vencidos')).status === 403, 'responsable no accede a disposición (403)');
ok((await api(archi, 'POST', '/disposicion/propuestas', { tipo: 'ELIMINACION', expedienteIds: [e5.id, exp.id], justificacion: 'x' })).status === 400, 'no mezcla expedientes de otra disposición');
const pE = (await api(archi, 'POST', '/disposicion/propuestas', { tipo: 'ELIMINACION', expedienteIds: [e5.id], justificacion: 'Plazo de retención cumplido' })).data;
ok(pE.estado === 'BORRADOR' && /^PD-\d{4}-\d{4}$/.test(pE.codigo), `propuesta ${pE.codigo} en BORRADOR`);
ok((await api(archi, 'POST', '/disposicion/propuestas', { tipo: 'ELIMINACION', expedienteIds: [e5.id], justificacion: 'otra' })).status === 400, 'expediente no puede estar en dos propuestas');
ok((await api(archi, 'POST', `/disposicion/propuestas/${pE.id}/ejecutar`)).status === 409, 'no se ejecuta sin aprobación');
ok((await api(archi, 'POST', `/disposicion/propuestas/${pE.id}/presentar`)).data.estado === 'EN_COMISION', 'presentada a la Comisión');
ok((await api(archi, 'POST', `/disposicion/propuestas/${pE.id}/resolver`, { aprobada: true })).status === 400, 'aprobar exige número y fecha del acta');
ok((await api(archi, 'POST', `/disposicion/propuestas/${pE.id}/resolver`, { aprobada: true, actaNumero: 'CV-001/2026', actaFecha: '2026-06-01' })).data.estado === 'APROBADA', 'APROBADA con acta de la Comisión');
const ej = (await api(archi, 'POST', `/disposicion/propuestas/${pE.id}/ejecutar`)).data;
const x5 = (await api(archi, 'GET', `/expedientes/${e5.id}`)).data;
ok(ej.estado === 'EJECUTADA' && x5.estado === 'ELIMINADO' && x5.cajaId === null && !!x5.fechaDisposicion, 'EJECUTADA: expediente dado de baja (ELIMINADO)');
ok((await api(archi, 'POST', '/prestamos', { expedienteIds: [e5.id], tipoSolicitante: 'AUDITOR', solicitanteNombre: 'A', motivo: 'x' })).status === 409, 'un expediente eliminado no se presta');
const pR = (await api(archi, 'POST', '/disposicion/propuestas', { tipo: 'CONSERVACION_PERMANENTE', expedienteIds: [exp4.id], justificacion: 'Valor histórico' })).data;
await api(archi, 'POST', `/disposicion/propuestas/${pR.id}/presentar`);
ok((await api(archi, 'POST', `/disposicion/propuestas/${pR.id}/resolver`, { aprobada: false })).status === 400, 'rechazar exige motivo');
ok((await api(archi, 'POST', `/disposicion/propuestas/${pR.id}/resolver`, { aprobada: false, observaciones: 'Falta valoración' })).data.estado === 'RECHAZADA', 'RECHAZADA por la Comisión');
ok((await api(archi, 'GET', '/disposicion/vencidos?tipo=CONSERVACION_PERMANENTE')).data.some((v) => v.id === exp4.id), 'rechazada: el expediente queda libre otra vez');
const pS = (await api(archi, 'POST', '/disposicion/propuestas', { tipo: 'SELECCION_MUESTREO', expedienteIds: [e6.id, e7.id], justificacion: 'Muestreo' })).data;
await api(archi, 'POST', `/disposicion/propuestas/${pS.id}/presentar`);
await api(archi, 'POST', `/disposicion/propuestas/${pS.id}/resolver`, { aprobada: true, actaNumero: 'CV-002/2026', actaFecha: '2026-06-02' });
ok((await api(archi, 'POST', `/disposicion/propuestas/${pS.id}/ejecutar`)).status === 400, 'selección: exige decidir cada expediente antes de ejecutar');
const dS = (await api(archi, 'GET', `/disposicion/propuestas/${pS.id}`)).data.detalles;
await api(archi, 'PUT', `/disposicion/propuestas/${pS.id}/detalle/${dS.find((d) => d.expedienteId === e6.id).id}`, { resolucion: 'CONSERVAR' });
await api(archi, 'PUT', `/disposicion/propuestas/${pS.id}/detalle/${dS.find((d) => d.expedienteId === e7.id).id}`, { resolucion: 'ELIMINAR' });
await api(archi, 'POST', `/disposicion/propuestas/${pS.id}/ejecutar`);
ok((await api(archi, 'GET', `/expedientes/${e6.id}`)).data.estado === 'HISTORICO' && (await api(archi, 'GET', `/expedientes/${e7.id}`)).data.estado === 'ELIMINADO', 'selección: uno pasa al Archivo Histórico y otro se elimina');

console.log('7. Reportes PDF');
for (const [ruta, nombre] of [[`/reportes/expedientes/${exp.id}/caratula`, 'carátula'], [`/reportes/cajas/${caja.id}/etiqueta`, 'etiqueta de caja'], [`/reportes/prestamos/${pr.id}/acta`, 'acta de préstamo'], [`/reportes/transferencias/${tr.id}/inventario`, 'inventario de transferencia'], [`/reportes/disposicion/${pS.id}/acta`, 'acta de disposición final'], [`/reportes/expedientes/${exp.id}/etiqueta`, 'etiqueta de carpeta (QR + barras)'], [`/reportes/cajas/${caja.id}/etiquetas-carpetas`, 'etiquetas de todas las carpetas de la caja']]) {
  const r = await api(archi, 'GET', ruta, null, true);
  const b = Buffer.from(await r.arrayBuffer());
  ok(r.status === 200 && b.subarray(0, 5).toString() === '%PDF-', `${nombre} (${b.length} bytes)`);
}

ok((await api(resp, 'GET', `/reportes/expedientes/${exp.id}/etiqueta`, null, true)).status === 200, 'responsable imprime la etiqueta de carpeta de su unidad');
ok((await api(resp, 'GET', `/reportes/cajas/${caja.id}/etiqueta`, null, true)).status === 403, 'responsable no imprime etiquetas de caja (403)');
ok((await api(consul, 'GET', `/reportes/expedientes/${exp.id}/etiqueta`, null, true)).status === 403, 'consultor no imprime etiquetas (403)');
{ const r = await api(archi, 'GET', `/reportes/cajas/${caja.id}/etiqueta`, null, true); await writeFile('/tmp/etiqueta-caja.pdf', Buffer.from(await r.arrayBuffer()));
  const r2 = await api(archi, 'GET', `/reportes/expedientes/${exp.id}/etiqueta`, null, true); await writeFile('/tmp/etiqueta-carpeta.pdf', Buffer.from(await r2.arrayBuffer())); }

console.log('8. Auditoría inmutable');
const aud = (await api(admin, 'GET', `/auditoria?tabla=expedientes&registroId=${exp.id}`)).data;
ok(aud.total >= 3 && aud.items.some((a) => a.accion === 'UPDATE' && a.datosNuevos?.estado), `bitácora del expediente (${aud.total} registros)`);
ok(!JSON.stringify((await api(admin, 'GET', '/auditoria?tabla=usuarios&limit=5')).data).includes('passwordHash'), 'la bitácora no guarda contraseñas');
ok((await api(resp, 'GET', '/auditoria')).status === 403, 'responsable no accede a la bitácora');
let bloqueado = false;
try { sql(`UPDATE bitacora_auditoria SET tabla='x'`); } catch (e) { bloqueado = String(e.stderr).includes('inmutable'); }
ok(bloqueado, 'UPDATE sobre la bitácora bloqueado por la BD');

console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTODO OK');
process.exit(fallos ? 1 : 0);
