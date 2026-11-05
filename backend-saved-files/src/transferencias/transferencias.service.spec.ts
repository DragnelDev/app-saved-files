import { EstadoTransferencia as ET } from '../common/enums/archivo.enums.js';
import { TRANSICIONES } from './transferencias.service.js';

describe('máquina de estados de transferencias', () => {
  it('sigue el flujo BORRADOR → ENVIADO → EN_REVISION → APROBADO', () => {
    expect(TRANSICIONES[ET.BORRADOR]).toEqual([ET.ENVIADO]);
    expect(TRANSICIONES[ET.ENVIADO]).toEqual([ET.EN_REVISION]);
    expect(TRANSICIONES[ET.EN_REVISION]).toContain(ET.APROBADO_Y_RECIBIDO);
  });
  it('OBSERVADO permite reenviar y APROBADO es terminal', () => {
    expect(TRANSICIONES[ET.OBSERVADO]).toEqual([ET.ENVIADO]);
    expect(TRANSICIONES[ET.APROBADO_Y_RECIBIDO]).toEqual([]);
  });
});
