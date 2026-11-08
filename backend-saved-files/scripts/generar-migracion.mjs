// Genera una migración de TypeORM comparando las entidades compiladas (dist/) con la base de datos actual.
//   - Con una BD VACÍA produce la migración inicial completa.
//   - Con la BD en el estado de la última migración produce solo la diferencia.
// Uso: npm run migracion:generar -- NombreDelCambio
import 'dotenv/config';
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DataSource } from 'typeorm';

function archivos(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? archivos(p) : [p];
  });
}

const nombre = (process.argv[2] ?? 'Cambios').replace(/[^A-Za-z0-9]/g, '');
const entities = archivos(resolve('dist')).filter((f) => /\.entit(y|ies)\.js$/.test(f));
const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  entities,
  synchronize: false,
});
await ds.initialize();
const log = await ds.driver.createSchemaBuilder().log();
await ds.destroy();

// Varias entidades pueden compartir un mismo tipo enum (p. ej. disposicion_final): TypeORM lo declara una
// vez por entidad, pero PostgreSQL solo permite crearlo/borrarlo una vez.
const sinTiposRepetidos = (qs) => {
  const vistos = new Set();
  return qs.filter((q) => {
    if (!/^(CREATE|DROP) TYPE /i.test(q.query)) return true;
    if (vistos.has(q.query)) return false;
    vistos.add(q.query);
    return true;
  });
};
const upQueries = sinTiposRepetidos(log.upQueries);
const downQueries = sinTiposRepetidos([...log.downQueries].reverse()).reverse();

if (!upQueries.length) {
  console.log('La base de datos ya coincide con las entidades: no hay cambios que migrar.');
  process.exit(0);
}
const ts = Date.now();
const clase = `${nombre}${ts}`;
const llamada = (q) => `    await q.query(${JSON.stringify(q.query)}${q.parameters?.length ? `, ${JSON.stringify(q.parameters)}` : ''});`;
const contenido = `import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ${clase} implements MigrationInterface {
  name = '${clase}';

  public async up(q: QueryRunner): Promise<void> {
${upQueries.map(llamada).join('\n')}
  }

  public async down(q: QueryRunner): Promise<void> {
${[...downQueries].reverse().map(llamada).join('\n')}
  }
}
`;
mkdirSync('src/migrations', { recursive: true });
const ruta = `src/migrations/${ts}-${nombre}.ts`;
writeFileSync(ruta, contenido);
console.log(`Migración creada: ${ruta} (${upQueries.length} sentencias). Ejecuta "npm run build" y reinicia para aplicarla.`);
