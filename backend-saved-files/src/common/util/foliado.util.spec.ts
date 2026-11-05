import { validarFoliado } from './foliado.util.js';

describe('validarFoliado', () => {
  it('acepta numeración continua desde 1', () => {
    expect(validarFoliado([{ inicio: 1, fin: 5 }, { inicio: 6, fin: 6 }]).ok).toBe(true);
  });
  it('detecta vacíos', () => {
    const r = validarFoliado([{ inicio: 1, fin: 5 }, { inicio: 8, fin: 9 }]);
    expect(r.ok).toBe(false);
    expect(r.errores[0]).toContain('6-7');
  });
  it('detecta solapes', () => {
    expect(validarFoliado([{ inicio: 1, fin: 5 }, { inicio: 5, fin: 9 }]).ok).toBe(false);
  });
  it('exige empezar en la foja 1', () => {
    expect(validarFoliado([{ inicio: 2, fin: 3 }]).ok).toBe(false);
  });
  it('rechaza fin menor que inicio', () => {
    expect(validarFoliado([{ inicio: 4, fin: 2 }]).ok).toBe(false);
  });
});
