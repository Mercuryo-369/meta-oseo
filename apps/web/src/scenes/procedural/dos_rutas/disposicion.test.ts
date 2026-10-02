/**
 * Pruebas de la disposición de las piezas repetidas de la escena de las dos rutas: deterministas, dentro de sus
 * límites (el panel, el elipsoide de la red, el molde) y coherentes con las constantes del estado.
 */
import { describe, expect, it } from 'vitest';
import {
  N_TRABECULAS_CENTRO,
  N_VASOS_IM,
  TRAMOS_VASO,
  celulasEndocondrales,
  celulasIntramembranosas,
  espiculasIntramembranosas,
  medio,
  osteonasDePlaca,
  radioDelMolde,
  trabeculasDelCentro,
  vasosIntramembranosos,
} from './disposicion';
import type { Punto3 } from './disposicion';
import {
  CADA_OSTEOCITO,
  MOLDE,
  N_CELULAS_EC,
  N_CELULAS_IM,
  N_OSTEONAS_PLACA,
  PANEL,
  PLACA,
  RED_ESPICULAS,
  R_INTERIOR_DIAFISIS,
  Y_CENTRAL,
} from './estado';

function dentroDelPanel(p: Punto3): boolean {
  return (
    Math.abs(p[0]) <= PANEL.ancho / 2 &&
    Math.abs(p[1]) <= PANEL.alto / 2 &&
    Math.abs(p[2]) <= PANEL.fondo / 2
  );
}

function dentroDeLaRed(p: Punto3, holgura = 1): boolean {
  return (
    (p[0] / RED_ESPICULAS.x) ** 2 + (p[1] / RED_ESPICULAS.y) ** 2 + (p[2] / RED_ESPICULAS.z) ** 2 <=
    holgura + 1e-9
  );
}

describe('espiculasIntramembranosas', () => {
  const espiculas = espiculasIntramembranosas();

  it('son deterministas, bastantes, y caben en el elipsoide de la red', () => {
    expect(espiculasIntramembranosas()).toEqual(espiculas);
    expect(espiculas.length).toBeGreaterThan(30);
    expect(espiculas.length).toBeLessThanOrEqual(84);
    for (const e of espiculas) {
      expect(dentroDeLaRed(e.b)).toBe(true);
      expect(dentroDeLaRed(e.a)).toBe(true);
      expect(e.orden).toBeGreaterThanOrEqual(0);
      expect(e.orden).toBeLessThanOrEqual(1);
    }
  });

  it('se ramifican desde el centro: las primeras nacen en el origen y cada una sigue a otra', () => {
    const iniciales = espiculas.filter((e) => e.a[0] === 0 && e.a[1] === 0 && e.a[2] === 0);
    expect(iniciales.length).toBeGreaterThanOrEqual(4);
    for (const e of espiculas) {
      if (iniciales.includes(e)) continue;
      const madre = espiculas.find((m) => m.b === e.a);
      expect(madre).toBeDefined();
      expect(madre!.orden).toBeLessThanOrEqual(e.orden + 0.14);
    }
  });

  it('las externas son las que quedan a la altura de las tablas; hay externas e interiores', () => {
    for (const e of espiculas) {
      expect(e.externa).toBe(Math.abs(medio(e)[1]) > PLACA.y - PLACA.grosor);
    }
    expect(espiculas.some((e) => e.externa)).toBe(true);
    expect(espiculas.filter((e) => !e.externa).length).toBeGreaterThan(10);
  });
});

describe('celulasIntramembranosas', () => {
  const celulas = celulasIntramembranosas();

  it('da el número previsto, deterministas, dispersas en el panel y condensadas en el centro', () => {
    expect(celulas).toHaveLength(N_CELULAS_IM);
    expect(celulasIntramembranosas()).toEqual(celulas);
    for (const c of celulas) {
      expect(dentroDelPanel(c.dispersa)).toBe(true);
      expect(
        Math.hypot(c.condensada[0] / 1.15, c.condensada[1] / 0.5, c.condensada[2] / 0.45),
      ).toBeLessThanOrEqual(1 + 1e-9);
      expect(c.retraso).toBeGreaterThanOrEqual(0);
      expect(c.retraso).toBeLessThanOrEqual(1);
    }
  });

  it('una de cada CADA_OSTEOCITO es osteocito y su destino es el centro de una espícula interior', () => {
    const espiculas = espiculasIntramembranosas();
    const interiores = espiculas.filter((e) => !e.externa && e.orden < 0.7).map((e) => medio(e));
    const osteocitos = celulas.filter((c) => c.papel === 'osteocito');
    expect(osteocitos).toHaveLength(Math.ceil(N_CELULAS_IM / CADA_OSTEOCITO));
    for (const c of osteocitos) {
      expect(interiores.some((m) => m.every((v, i) => Math.abs(v - c.destino[i]!) < 1e-9))).toBe(
        true,
      );
    }
  });

  it('los osteoblastos acaban cerca de una espícula, sin alejarse de la red', () => {
    const espiculas = espiculasIntramembranosas();
    for (const c of celulas.filter((c) => c.papel === 'osteoblasto')) {
      const distancia = Math.min(
        ...espiculas.map((e) => {
          const m = medio(e);
          return Math.hypot(m[0] - c.destino[0], m[1] - c.destino[1], m[2] - c.destino[2]);
        }),
      );
      expect(distancia).toBeLessThan(0.45);
      expect(dentroDeLaRed(c.destino, 1.6)).toBe(true);
    }
  });
});

describe('vasosIntramembranosos y osteonasDePlaca', () => {
  it('cada vaso tiene sus tramos, entra desde el borde de la red y acaba cerca del centro', () => {
    const vasos = vasosIntramembranosos();
    expect(vasos).toHaveLength(N_VASOS_IM);
    expect(vasosIntramembranosos()).toEqual(vasos);
    for (const v of vasos) {
      expect(v.puntos).toHaveLength(TRAMOS_VASO + 1);
      const inicio = v.puntos[0]!;
      const fin = v.puntos[TRAMOS_VASO]!;
      // Nace en el borde de la red (fuera de su mitad interior) y no se sale de ella.
      expect(dentroDeLaRed(inicio, 0.5)).toBe(false);
      expect(dentroDeLaRed(inicio, 1.4)).toBe(true);
      expect(Math.hypot(fin[0], fin[1], fin[2])).toBeLessThan(0.5);
    }
  });

  it('las osteonas caben en la cara de la tabla y no se tocan', () => {
    const osteonas = osteonasDePlaca();
    expect(osteonas).toHaveLength(N_OSTEONAS_PLACA);
    for (const o of osteonas) {
      expect(Math.abs(o.x) + 0.1 * o.escala).toBeLessThan(PLACA.ancho / 2);
      expect(Math.abs(o.z) + 0.1 * o.escala).toBeLessThan(PLACA.fondo / 2);
    }
    osteonas.forEach((a, i) =>
      osteonas.slice(i + 1).forEach((b) => {
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.22);
      }),
    );
  });
});

describe('molde y células endocondrales', () => {
  it('el radio del molde es el de la diáfisis en el centro, el de la epífisis en los extremos y 0 fuera', () => {
    expect(radioDelMolde(0)).toBeCloseTo(MOLDE.radio, 9);
    expect(radioDelMolde(MOLDE.yEpifisis)).toBeCloseTo(MOLDE.rEpifisis, 9);
    expect(radioDelMolde(-MOLDE.yEpifisis)).toBeCloseTo(MOLDE.rEpifisis, 9);
    expect(radioDelMolde(MOLDE.yEpifisis + MOLDE.semiejeEpifisis + 0.01)).toBe(0);
  });

  it('las células son deterministas, dispersas en el panel y cada laguna cae dentro del molde', () => {
    const celulas = celulasEndocondrales();
    expect(celulas).toHaveLength(N_CELULAS_EC);
    expect(celulasEndocondrales()).toEqual(celulas);
    for (const c of celulas) {
      expect(dentroDelPanel(c.dispersa)).toBe(true);
      const r = Math.hypot(c.laguna[0], c.laguna[2]);
      expect(r).toBeLessThanOrEqual(radioDelMolde(c.laguna[1]) * 0.78 + 1e-9);
      expect(c.central).toBe(Math.abs(c.laguna[1]) < Y_CENTRAL);
      for (let i = 0; i < 3; i++) expect(c.condensada[i]).toBeCloseTo(c.laguna[i]! * 0.8, 9);
    }
    expect(celulas.filter((c) => c.central).length).toBeGreaterThan(5);
    expect(celulas.filter((c) => Math.abs(c.laguna[1]) > MOLDE.medioLargo).length).toBeGreaterThan(
      5,
    );
  });
});

describe('trabeculasDelCentro', () => {
  it('son deterministas, caben en el interior de la diáfisis y su altura es la del punto medio', () => {
    const trabeculas = trabeculasDelCentro();
    expect(trabeculas).toHaveLength(N_TRABECULAS_CENTRO);
    expect(trabeculasDelCentro()).toEqual(trabeculas);
    for (const t of trabeculas) {
      expect(Math.hypot(t.a[0], t.a[2])).toBeLessThanOrEqual(R_INTERIOR_DIAFISIS + 1e-9);
      expect(Math.abs(t.a[1])).toBeLessThan(MOLDE.medioLargo);
      expect(Math.abs(t.b[1])).toBeLessThan(MOLDE.medioLargo + 0.45);
      expect(t.altura).toBeCloseTo(Math.abs((t.a[1] + t.b[1]) / 2), 9);
    }
    expect(trabeculas.filter((t) => t.altura < 0.35).length).toBeGreaterThan(3);
  });
});
