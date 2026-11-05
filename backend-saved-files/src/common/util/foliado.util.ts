export interface RangoFojas {
  inicio: number;
  fin: number;
}

/**
 * Valida que los rangos de fojas formen una numeración continua desde 1:
 * sin solapes, sin vacíos y con fin >= inicio.
 */
export function validarFoliado(rangos: RangoFojas[]): {
  ok: boolean;
  errores: string[];
} {
  const errores: string[] = [];
  const orden = [...rangos].sort((a, b) => a.inicio - b.inicio);
  let esperado = 1;
  for (const r of orden) {
    if (r.fin < r.inicio) {
      errores.push(`Rango inválido ${r.inicio}-${r.fin}: foja fin menor que foja inicio`);
      continue;
    }
    if (r.inicio < esperado) {
      errores.push(`Solape: el rango ${r.inicio}-${r.fin} se superpone con fojas ya numeradas (hasta ${esperado - 1})`);
    } else if (r.inicio > esperado) {
      errores.push(`Vacío en la numeración: faltan las fojas ${esperado}-${r.inicio - 1}`);
    }
    esperado = Math.max(esperado, r.fin + 1);
  }
  return { ok: errores.length === 0, errores };
}
