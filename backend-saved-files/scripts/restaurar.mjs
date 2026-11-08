// Restaura un respaldo creado con "npm run respaldo".
// Uso: npm run restaurar -- <carpeta-del-respaldo> [--db nombre] [--storage carpeta] [--confirmar]
// Sin --confirmar solo muestra lo que haría. Restaurar SOBRESCRIBE los datos actuales de la base indicada.
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opcion = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const carpeta = args.find((a, i) => !a.startsWith('--') && !['--db', '--storage'].includes(args[i - 1]));
if (!carpeta) { console.error('Indica la carpeta del respaldo. Ej: npm run restaurar -- respaldos/2026-11-06-09-30 --confirmar'); process.exit(1); }

const dir = resolve(carpeta);
const dump = join(dir, 'base_de_datos.dump');
if (!existsSync(dump)) { console.error(`No se encontró ${dump}`); process.exit(1); }
const db = opcion('--db') ?? process.env.DB_NAME;
const destinoPdf = resolve(opcion('--storage') ?? process.env.STORAGE_DIR ?? './storage');

console.log(`Respaldo : ${dir}\nBase     : ${db} (se sobrescribe)\nPDF a    : ${destinoPdf}`);
if (!args.includes('--confirmar')) { console.log('\nNo se hizo nada. Agrega --confirmar para restaurar. Detén el sistema antes de restaurar.'); process.exit(0); }

const pgRestore = process.env.PG_RESTORE ?? 'pg_restore';
const r = spawnSync(pgRestore, ['-h', process.env.DB_HOST ?? 'localhost', '-p', String(process.env.DB_PORT ?? 5432), '-U', process.env.DB_USER, '-d', db, '--clean', '--if-exists', '--no-owner', dump], {
  env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD ?? '' },
  encoding: 'utf8',
});
if (r.error) { console.error(`ERROR: ${r.error.message}\nSi pg_restore no está en el PATH, define PG_RESTORE con su ruta completa.`); process.exit(1); }
if (r.status !== 0) console.warn(`pg_restore terminó con avisos:\n${r.stderr}`);
if (existsSync(join(dir, 'storage'))) cpSync(join(dir, 'storage'), destinoPdf, { recursive: true });
console.log('Restauración terminada. Inicia el sistema y verifica un expediente con su visor de PDF.');
