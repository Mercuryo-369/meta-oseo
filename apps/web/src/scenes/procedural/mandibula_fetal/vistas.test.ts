/**
 * Pruebas de las vistas de cámara de la mandíbula fetal: las cercanas (`corte` y `detalle`) se orientan respecto al
 * arco en su objetivo y conservan el encuadre que tenían antes de mover el centro de osificación y la ventana de
 * corte (fidelidad-05).
 */
import { describe, expect, it } from 'vitest';
import { VENTANA_CORTE, centroCuerpo, tangenteArco } from './disposicion';
import { U_CENTRO } from './estado';
import {
  ANGULO_CON_ARCO,
  estadoDeVistaMandibulaFetal,
  rumboArco,
  vistaMandibulaFetal,
} from './vistas';

describe('vistas de la mandíbula fetal', () => {
  it('con la disposición anterior (ventana en 0,52 y centro en 0,7) darían los azimuts de antes (20° y 40°)', () => {
    expect(rumboArco(0.52) + ANGULO_CON_ARCO.corte).toBeCloseTo(20, 0);
    expect(rumboArco(0.7) + ANGULO_CON_ARCO.detalle).toBeCloseTo(40, 0);
  });

  it('`corte` mira de frente la tapa del tramo de atrás de la ventana; `detalle`, el centro de osificación', () => {
    const corte = estadoDeVistaMandibulaFetal('corte', 1);
    const u = (VENTANA_CORTE.u0 + VENTANA_CORTE.u1) / 2;
    expect(corte.objetivo).toEqual(centroCuerpo(VENTANA_CORTE.lado, u));
    const [px, py, pz] = corte.posicion;
    const [ox, oy, oz] = corte.objetivo;
    const d = Math.hypot(px - ox, py - oy, pz - oz);
    const [tx, , tz] = tangenteArco(VENTANA_CORTE.lado, VENTANA_CORTE.u0);
    // La tapa del final del tramo de atrás mira hacia delante a lo largo del arco: hacia la cámara.
    expect((tx * (px - ox) + tz * (pz - oz)) / d).toBeGreaterThan(0.5);
    expect(vistaMandibulaFetal('detalle').objetivo).toEqual(centroCuerpo(1, U_CENTRO));
  });

  it('una vista desconocida cae en la general', () => {
    expect(vistaMandibulaFetal('no_existe')).toEqual(vistaMandibulaFetal('general'));
  });
});
