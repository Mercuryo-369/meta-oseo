/**
 * Pruebas de la disposición de la red trabecular: determinista, dentro del cubo, con las dos familias de placas
 * y de barras, con las BMU en la cara frontal y las microfracturas marcadas; y de las reglas puras con las que
 * cada trabécula envejece según su vida.
 */
import { describe, expect, it } from 'vitest';
import {
  PRESENCIA,
  agujeroDePlaca,
  factorGrosor,
  grosorDePlaca,
  porosDeCortical,
  presenciaDeBarra,
  radioDeBarra,
  redTrabecular,
} from './disposicion';
import {
  GROSOR_PLACA,
  LADO,
  N_BMU,
  N_CELDAS,
  N_MICROFRACTURAS,
  PASO,
  RADIO_BARRA,
  RED_JOVEN,
  estadoTrabecular,
} from './estado';

const MITAD = LADO / 2;
const red = redTrabecular();

describe('redTrabecular', () => {
  it('es determinista y otra semilla da otra red', () => {
    expect(redTrabecular()).toEqual(red);
    expect(redTrabecular(1234).placas).not.toEqual(red.placas);
  });

  it('tiene un número razonable de placas y barras (ni panal ni vacío)', () => {
    const carasPosibles = 2 * (N_CELDAS - 1) * N_CELDAS * N_CELDAS;
    const aristasPosibles = 2 * (N_CELDAS - 1) * (N_CELDAS - 1) * N_CELDAS;
    expect(red.placas.length).toBeGreaterThan(carasPosibles * (PRESENCIA.placas - 0.15));
    expect(red.placas.length).toBeLessThan(carasPosibles * (PRESENCIA.placas + 0.1));
    expect(red.barras.length).toBeGreaterThan(aristasPosibles * (PRESENCIA.barras - 0.15));
    expect(red.barras.length).toBeLessThan(aristasPosibles * (PRESENCIA.barras + 0.1));
  });

  it('todas las trabéculas caen dentro del cubo y ninguna en sus paredes', () => {
    for (const p of red.placas) {
      for (const c of [p.x, p.y, p.z]) expect(Math.abs(c)).toBeLessThan(MITAD - 0.2);
      expect(p.ancho).toBeGreaterThan(PASO * 0.8);
      expect(p.alto).toBeGreaterThan(PASO * 0.8);
      expect(p.grosor).toBeGreaterThan(0.8);
      expect(p.vida).toBeGreaterThanOrEqual(0);
      expect(p.vida).toBeLessThanOrEqual(1);
    }
    for (const b of red.barras) {
      for (const c of [b.x, b.y, b.z]) expect(Math.abs(c)).toBeLessThan(MITAD - 0.2);
      expect(b.largo).toBeGreaterThan(PASO * 0.9);
      expect(Math.abs(b.inclinacion)).toBeLessThan(0.2);
    }
  });

  it('hay placas de las dos familias y barras en las dos direcciones', () => {
    expect(red.placas.some((p) => p.normal === 'z')).toBe(true);
    expect(red.placas.some((p) => p.normal === 'x')).toBe(true);
    expect(red.barras.some((b) => b.eje === 'x')).toBe(true);
    expect(red.barras.some((b) => b.eje === 'z')).toBe(true);
  });

  it('las BMU están en placas de la cara frontal, planas, con vida alta, y hay resorción y formación', () => {
    const conBmu = red.placas.filter((p) => p.bmu !== null);
    expect(conBmu).toHaveLength(N_BMU);
    const zFrontal = Math.max(...red.placas.filter((p) => p.normal === 'z').map((p) => p.z));
    for (const p of conBmu) {
      expect(p.normal).toBe('z');
      expect(p.z).toBeGreaterThan(zFrontal - PASO / 2);
      expect(p.giro).toBe(0);
      expect(p.cabeceo).toBe(0);
      expect(p.vida).toBeGreaterThan(0.9);
      expect(p.microfractura).toBe(false);
    }
    expect(conBmu.filter((p) => p.bmu === 'resorcion').length).toBeGreaterThanOrEqual(1);
    expect(conBmu.filter((p) => p.bmu === 'formacion').length).toBeGreaterThanOrEqual(1);
    // Nada de canto delante de una BMU en la capa frontal: se le abre una ventana.
    for (const s of conBmu) {
      const delante = red.placas.filter(
        (p) =>
          p.normal === 'x' &&
          p.z > s.z &&
          Math.abs(p.x - s.x) < PASO * 0.9 &&
          Math.abs(p.y - s.y) < PASO * 0.7,
      );
      expect(delante).toHaveLength(0);
    }
  });

  it('marca las microfracturas en placas interiores a media altura, con vida alta', () => {
    const rotas = red.placas.filter((p) => p.microfractura);
    expect(rotas).toHaveLength(N_MICROFRACTURAS);
    for (const p of rotas) {
      expect(Math.abs(p.y)).toBeLessThan(PASO * 1.2);
      expect(p.vida).toBeGreaterThan(0.85);
      expect(p.bmu).toBeNull();
    }
    expect(new Set(rotas.map((p) => p.normal)).size).toBe(2);
  });
});

describe('reglas de envejecimiento por trabécula', () => {
  it('con la red joven nada se adelgaza, se perfora ni se corta', () => {
    for (const p of red.placas) {
      expect(grosorDePlaca(p, RED_JOVEN)).toBeCloseTo(GROSOR_PLACA * p.grosor, 9);
      expect(agujeroDePlaca(p, RED_JOVEN)).toBe(0);
    }
    for (const b of red.barras) {
      expect(radioDeBarra(b, RED_JOVEN)).toBeCloseTo(RADIO_BARRA * b.grosor, 9);
      expect(presenciaDeBarra(b, RED_JOVEN)).toBe(1);
    }
  });

  it('factorGrosor baja con el grosor global, más en las trabéculas de menor vida, y nunca llega a 0', () => {
    expect(factorGrosor(0.5, 1)).toBe(1);
    expect(factorGrosor(0.2, 0.6)).toBeLessThan(factorGrosor(0.9, 0.6));
    expect(factorGrosor(0, 0)).toBeGreaterThanOrEqual(0.3);
    for (const vida of [0, 0.3, 0.7, 1]) {
      let anterior = 2;
      for (let g = 1; g >= 0; g -= 0.05) {
        const f = factorGrosor(vida, g);
        expect(f).toBeLessThanOrEqual(anterior + 1e-9);
        expect(f).toBeGreaterThan(0);
        anterior = f;
      }
    }
  });

  it('la fracción de placas con agujero y de barras perdidas sigue a los factores globales', () => {
    const e = estadoTrabecular(0.83);
    const perforadas =
      red.placas.filter((p) => agujeroDePlaca(p, e.red) > 0).length / red.placas.length;
    expect(perforadas).toBeGreaterThan(e.red.perforacion - 0.15);
    expect(perforadas).toBeLessThan(e.red.perforacion + 0.15);
    const presentes =
      red.barras.filter((b) => presenciaDeBarra(b, e.red) > 0).length / red.barras.length;
    expect(presentes).toBeGreaterThan(e.red.barras - 0.15);
    expect(presentes).toBeLessThan(e.red.barras + 0.15);
  });

  it('las placas con BMU o microfractura siguen enteras al final', () => {
    const e = estadoTrabecular(1);
    for (const p of red.placas.filter((p) => p.bmu !== null || p.microfractura)) {
      expect(agujeroDePlaca(p, e.red)).toBe(0);
    }
  });

  it('a mitad de la vida, cortes y agujeros parciales: se ve el proceso, no un salto', () => {
    const e = estadoTrabecular(0.5);
    const parciales = red.barras.filter((b) => {
      const k = presenciaDeBarra(b, e.red);
      return k > 0 && k < 1;
    });
    expect(parciales.length).toBeGreaterThan(0);
    const abriendose = red.placas.filter((p) => {
      const h = agujeroDePlaca(p, e.red);
      return h > 0 && h < 1;
    });
    expect(abriendose.length).toBeGreaterThan(0);
  });
});

describe('porosDeCortical', () => {
  it('son deterministas, caen dentro de la cara superior y no se solapan', () => {
    const poros = porosDeCortical();
    expect(porosDeCortical()).toEqual(poros);
    expect(poros).toHaveLength(16);
    for (const p of poros) {
      expect(Math.abs(p.x) + p.radio).toBeLessThan(MITAD);
      expect(Math.abs(p.z) + p.radio).toBeLessThan(MITAD);
    }
    poros.forEach((a, i) =>
      poros.slice(i + 1).forEach((b) => {
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(a.radio + b.radio);
      }),
    );
  });
});
