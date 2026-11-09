// Localiza pg_dump / pg_restore: variable de entorno > PATH > carpeta de instalación de PostgreSQL en Windows.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function ubicarPg(programa, variableEnv) {
  if (process.env[variableEnv]) return process.env[variableEnv];

  const prueba = spawnSync(programa, ['--version'], { encoding: 'utf8' });
  if (!prueba.error && prueba.status === 0) return programa; // está en el PATH

  if (process.platform === 'win32') {
    const raices = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\Program Files'].filter(Boolean);
    for (const raiz of raices) {
      const base = join(raiz, 'PostgreSQL');
      if (!existsSync(base)) continue;
      // la versión más nueva primero (16, 15, 14...)
      const versiones = readdirSync(base).sort((a, b) => Number(b) - Number(a));
      for (const v of versiones) {
        const exe = join(base, v, 'bin', `${programa}.exe`);
        if (existsSync(exe)) return exe;
      }
    }
  }
  return programa; // el llamador mostrará un mensaje claro si no existe
}
