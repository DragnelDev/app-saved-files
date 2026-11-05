import { EstadoPropuesta as EP } from '../common/enums/archivo.enums.js';
import { TRANSICIONES_PROPUESTA as T } from './disposicion.service.js';

describe('máquina de estados de propuestas de disposición', () => {
  it('BORRADOR → EN_COMISION → APROBADA → EJECUTADA', () => {
    expect(T[EP.BORRADOR]).toEqual([EP.EN_COMISION]);
    expect(T[EP.EN_COMISION]).toEqual([EP.APROBADA, EP.RECHAZADA]);
    expect(T[EP.APROBADA]).toEqual([EP.EJECUTADA]);
  });
  it('RECHAZADA y EJECUTADA son terminales', () => {
    expect(T[EP.RECHAZADA]).toEqual([]);
    expect(T[EP.EJECUTADA]).toEqual([]);
  });
});
