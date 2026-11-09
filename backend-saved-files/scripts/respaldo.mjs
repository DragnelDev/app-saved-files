// Respaldo completo: base de datos (pg_dump) + carpeta de PDF. Multiplataforma (Windows/Linux).
// Uso: npm run respaldo
// Variables opcionales en .env: RESPALDO_DIR (ej. una unidad externa), RESPALDO_CONSERVAR (cuántos conservar, 30), PG_DUMP (ruta completa a pg_dump).
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ubicarPg } from './pg.mjs';

const base = resolve(process.env.RESPALDO_DIR ?? './respaldos');
const conservar = Math.max(1, Number(process.env.RESPALDO_CONSERVAR ?? 30));
const storage = resolve(process.env.STORAGE_DIR ?? './storage');
const pgDump = ubicarPg('pg_dump', 'PG_DUMP');
const sello = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'); // AAAA-MM-DD-HH-MM
const dir = join(base, sello);

mkdirSync(dir, { recursive: true });
const r = spawnSync(
  pgDump,
  ['-h', process.env.DB_HOST ?? 'localhost', '-p', String(process.env.DB_PORT ?? 5432), '-U', process.env.DB_USER, '-F', 'c', '-f', join(dir, 'base_de_datos.dump'), process.env.DB_NAME],
  { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD ?? '' }, encoding: 'utf8' },
);
if (r.error || r.status !== 0) {
  rmSync(dir, { recursive: true, force: true });
  console.error('ERROR: no se pudo respaldar la base de datos.');
  console.error(r.error ? `${r.error.message}\nNo se encontró pg_dump: instala PostgreSQL o define PG_DUMP con su ruta completa en el .env.` : r.stderr);
  process.exit(1);
}
let pdfs = 0;
if (existsSync(storage)) {
  cpSync(storage, join(dir, 'storage'), { recursive: true });
  const contar = (d) => readdirSync(d).reduce((n, f) => (statSync(join(d, f)).isDirectory() ? n + contar(join(d, f)) : n + 1), 0);
  pdfs = contar(join(dir, 'storage'));
}

// Retención: se borran los respaldos más antiguos (solo carpetas con formato de fecha).
const previos = readdirSync(base).filter((f) => /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(f) && statSync(join(base, f)).isDirectory()).sort();
while (previos.length > conservar) rmSync(join(base, previos.shift()), { recursive: true, force: true });

console.log(`Respaldo creado en ${dir}`);
console.log(`  - base_de_datos.dump y ${pdfs} archivo(s) PDF. Se conservan los últimos ${conservar} respaldos.`);
console.log('  - Copia esta carpeta a un disco externo o a otra PC: un respaldo en la misma PC no protege contra una falla del disco.');
