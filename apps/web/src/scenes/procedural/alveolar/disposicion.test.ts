/**
 * Pruebas de la disposición de la escena del hueso alveolar: los perfiles de la sección son coherentes entre
 * sí (la lámina rodea a la raíz, el trabecular no la pisa, el conducto cae dentro del trabecular) y las piezas
 * repetidas son deterministas y están donde deben.
 */
import { describe, expect, it } from 'vitest';
import {
  DESPLAZAMIENTO_LAMINA,
  alturaInicioTrabecular,
  bandaAlrededorDeRaiz,
  cajaDe,
  dentroDePoligono,
  fibrasLigamento,
  perfilCorona,
  perfilCuerpo,
  perforacionesLamina,
  regionTrabecular,
  semianchoCuerpo,
  semianchoInterior,
  semianchoRaiz,
  siluetaCorona,
  siluetaPulpa,
  siluetaRaiz,
  trabeculasAlveolares,
} from './disposicion';
import type { Punto2 } from './disposicion';
import {
  ALTO_CORONA,
  CONDUCTO,
  GROSOR_CORTICAL,
  GROSOR_LIGAMENTO,
  N_TRABECULAS,
  PROFUNDIDAD_TRABECULAR,
  SEMIANCHO_CRESTA,
  SEMIANCHO_MAXIMO,
  SEMIANCHO_RAIZ,
  Y_APICE,
  Y_BASE,
  Y_CRESTA,
  Y_MAS_ANCHO,
  Z_ALVEOLO,
} from './estado';

function esPoligonoSimpleYFinito(p: readonly Punto2[]): void {
  expect(p.length).toBeGreaterThan(8);
  for (const [z, y] of p) {
    expect(Number.isFinite(z)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
  }
  for (let i = 1; i < p.length; i++) {
    expect(Math.hypot(p[i]![0] - p[i - 1]![0], p[i]![1] - p[i - 1]![1])).toBeGreaterThan(1e-7);
  }
}

describe('contorno del cuerpo', () => {
  it('es más alto que ancho, se estrecha hacia la cresta y se redondea por la base', () => {
    expect(Y_CRESTA - Y_BASE).toBeGreaterThan(2 * SEMIANCHO_MAXIMO);
    expect(semianchoCuerpo(Y_CRESTA)).toBeLessThan(SEMIANCHO_CRESTA);
    expect(semianchoCuerpo(Y_CRESTA - 0.5)).toBeGreaterThan(SEMIANCHO_CRESTA);
    expect(semianchoCuerpo(Y_MAS_ANCHO)).toBeCloseTo(SEMIANCHO_MAXIMO, 9);
    expect(semianchoCuerpo(Y_BASE)).toBeCloseTo(0, 9);
    for (let y = Y_BASE; y < Y_MAS_ANCHO; y += 0.1) {
      expect(semianchoCuerpo(y)).toBeLessThanOrEqual(semianchoCuerpo(y + 0.1) + 1e-9);
    }
  });

  it('la tabla lingual y la base son más gruesas que la vestibular', () => {
    expect(GROSOR_CORTICAL.lingual).toBeGreaterThan(GROSOR_CORTICAL.vestibular);
    expect(GROSOR_CORTICAL.base).toBeGreaterThan(GROSOR_CORTICAL.lingual);
    for (const y of [1, 0, -1, -1.4]) {
      expect(semianchoCuerpo(y) - semianchoInterior(y, 'vestibular')).toBeCloseTo(
        GROSOR_CORTICAL.vestibular,
        9,
      );
      expect(semianchoCuerpo(y) - semianchoInterior(y, 'lingual')).toBeCloseTo(
        GROSOR_CORTICAL.lingual,
        9,
      );
    }
  });

  it('el polígono es válido y simétrico en Z', () => {
    const p = perfilCuerpo();
    esPoligonoSimpleYFinito(p);
    const caja = cajaDe(p);
    expect(caja.zMax).toBeCloseTo(-caja.zMin, 9);
    expect(caja.yMax).toBeCloseTo(Y_CRESTA, 9);
    expect(caja.yMin).toBeCloseTo(Y_BASE, 9);
  });
});

describe('raíz, corona y pulpa', () => {
  it('la raíz se afina del cuello al ápice y la silueta ensanchada la envuelve', () => {
    expect(semianchoRaiz(Y_CRESTA)).toBeCloseTo(SEMIANCHO_RAIZ, 9);
    expect(semianchoRaiz(Y_APICE)).toBe(0);
    expect(semianchoRaiz(0.5)).toBeLessThan(semianchoRaiz(1.5));
    const raiz = siluetaRaiz(0);
    const lamina = siluetaRaiz(DESPLAZAMIENTO_LAMINA);
    esPoligonoSimpleYFinito(raiz);
    esPoligonoSimpleYFinito(lamina);
    for (const p of raiz) {
      if (p[1] < Y_CRESTA - 1e-6) expect(dentroDePoligono(p, lamina)).toBe(true);
    }
    expect(cajaDe(lamina).yMin).toBeCloseTo(Y_APICE - DESPLAZAMIENTO_LAMINA, 6);
  });

  it('la banda del ligamento y la de la lámina son polígonos en U sin agujeros, uno fuera del otro', () => {
    const ligamento = bandaAlrededorDeRaiz(0, GROSOR_LIGAMENTO);
    const lamina = bandaAlrededorDeRaiz(GROSOR_LIGAMENTO, DESPLAZAMIENTO_LAMINA);
    esPoligonoSimpleYFinito(ligamento);
    esPoligonoSimpleYFinito(lamina);
    // Un punto en medio del ligamento no está en la lámina, y viceversa.
    const y = 0.8;
    const enLigamento: Punto2 = [Z_ALVEOLO + semianchoRaiz(y) + GROSOR_LIGAMENTO / 2, y];
    const enLamina: Punto2 = [
      Z_ALVEOLO +
        semianchoRaiz(y) +
        GROSOR_LIGAMENTO +
        (DESPLAZAMIENTO_LAMINA - GROSOR_LIGAMENTO) / 2,
      y,
    ];
    expect(dentroDePoligono(enLigamento, ligamento)).toBe(true);
    expect(dentroDePoligono(enLigamento, lamina)).toBe(false);
    expect(dentroDePoligono(enLamina, lamina)).toBe(true);
    expect(dentroDePoligono(enLamina, ligamento)).toBe(false);
  });

  it('la corona nace en la cresta y su silueta es el perfil del torno reflejado', () => {
    const perfil = perfilCorona();
    expect(perfil[0]![1]).toBeLessThan(Y_CRESTA);
    expect(perfil[perfil.length - 1]![0]).toBe(0);
    expect(perfil[perfil.length - 1]![1]).toBeCloseTo(Y_CRESTA - 0.04 + ALTO_CORONA, 9);
    const silueta = siluetaCorona();
    esPoligonoSimpleYFinito(silueta);
    const caja = cajaDe(silueta);
    expect((caja.zMax + caja.zMin) / 2).toBeCloseTo(Z_ALVEOLO, 9);
  });

  it('la pulpa cabe dentro del diente', () => {
    const pulpa = siluetaPulpa();
    esPoligonoSimpleYFinito(pulpa);
    const diente = [...siluetaRaiz(0)];
    const corona = siluetaCorona();
    for (const p of pulpa) {
      expect(dentroDePoligono(p, diente) || dentroDePoligono(p, corona), `${p}`).toBe(true);
    }
  });
});

describe('región trabecular', () => {
  const region = regionTrabecular();

  it('empieza más abajo del lado vestibular (tabla más fina, fundida con la lámina) que del lingual', () => {
    expect(alturaInicioTrabecular('vestibular')).toBeLessThan(alturaInicioTrabecular('lingual'));
    expect(alturaInicioTrabecular('lingual')).toBeLessThanOrEqual(
      Y_CRESTA - GROSOR_CORTICAL.cresta,
    );
    expect(alturaInicioTrabecular('vestibular')).toBeGreaterThan(0.5);
  });

  it('es un polígono válido que rodea la lámina sin pisarla y queda dentro de la cortical', () => {
    esPoligonoSimpleYFinito(region);
    // Puntos un poco por dentro del borde exterior de la lámina (el borde mismo es frontera compartida).
    const lamina = siluetaRaiz(DESPLAZAMIENTO_LAMINA - 0.03);
    for (const p of lamina) {
      if (p[1] < alturaInicioTrabecular('vestibular') - 0.05) {
        expect(dentroDePoligono(p, region), `${p}`).toBe(false);
      }
    }
    const cuerpo = perfilCuerpo();
    for (const p of region) expect(dentroDePoligono(p, cuerpo), `${p}`).toBe(true);
    // Puntos de médula a ambos lados de la raíz y bajo el ápice.
    expect(dentroDePoligono([Z_ALVEOLO + 0.6, 0], region)).toBe(true);
    expect(dentroDePoligono([Z_ALVEOLO - 0.6, 0], region)).toBe(true);
    expect(dentroDePoligono([Z_ALVEOLO, Y_APICE - 0.4], region)).toBe(true);
    // La raíz misma no es trabecular.
    expect(dentroDePoligono([Z_ALVEOLO, 0.5], region)).toBe(false);
  });

  it('el conducto mandibular cae entero dentro del trabecular, bajo el ápice', () => {
    expect(CONDUCTO.y + CONDUCTO.radio).toBeLessThan(Y_APICE - DESPLAZAMIENTO_LAMINA);
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24;
      const p: Punto2 = [
        CONDUCTO.z + (CONDUCTO.radio + 0.05) * Math.cos(a),
        CONDUCTO.y + (CONDUCTO.radio + 0.05) * Math.sin(a),
      ];
      expect(dentroDePoligono(p, region), `${p}`).toBe(true);
    }
  });
});

describe('trabéculas', () => {
  const lista = trabeculasAlveolares();

  it('da el número previsto y siempre las mismas', () => {
    expect(lista).toHaveLength(N_TRABECULAS);
    expect(trabeculasAlveolares()).toEqual(lista);
    expect(trabeculasAlveolares(99)).not.toEqual(lista);
  });

  it('cada una nace dentro del trabecular, fuera del conducto y dentro del hueco', () => {
    const region = regionTrabecular();
    for (const t of lista) {
      expect(dentroDePoligono([t.z, t.y], region)).toBe(true);
      expect(Math.hypot(t.z - CONDUCTO.z, t.y - CONDUCTO.y)).toBeGreaterThan(CONDUCTO.radio + 0.1);
      expect(t.x).toBeLessThan(0);
      expect(t.x).toBeGreaterThan(-PROFUNDIDAD_TRABECULAR);
      expect(t.largo).toBeGreaterThan(0.25);
      expect(Number.isFinite(t.angulo)).toBe(true);
    }
  });
});

describe('perforaciones y fibras', () => {
  it('las perforaciones están sobre la lámina, a ambos lados y en el ápice', () => {
    const lamina = bandaAlrededorDeRaiz(GROSOR_LIGAMENTO, DESPLAZAMIENTO_LAMINA);
    const puntos = perforacionesLamina();
    expect(puntos.length).toBeGreaterThanOrEqual(12);
    for (const p of puntos) expect(dentroDePoligono(p, lamina), `${p}`).toBe(true);
    expect(puntos.some((p) => p[0] > Z_ALVEOLO + 0.2)).toBe(true);
    expect(puntos.some((p) => p[0] < Z_ALVEOLO - 0.2)).toBe(true);
    expect(puntos.some((p) => p[1] < Y_APICE)).toBe(true);
  });

  it('las fibras van del hueso alveolar propio (arriba) al cemento de la raíz (abajo), oblicuas', () => {
    const fibras = fibrasLigamento();
    expect(fibras.length).toBeGreaterThan(30);
    const ligamento = bandaAlrededorDeRaiz(0, GROSOR_LIGAMENTO);
    for (const [hueso, raiz] of fibras) {
      const medio: Punto2 = [(hueso[0] + raiz[0]) / 2, (hueso[1] + raiz[1]) / 2];
      expect(dentroDePoligono(medio, ligamento), `${medio}`).toBe(true);
      if (hueso[1] > Y_APICE) {
        expect(hueso[1]).toBeGreaterThan(raiz[1]);
        expect(Math.abs(hueso[0] - Z_ALVEOLO)).toBeGreaterThan(Math.abs(raiz[0] - Z_ALVEOLO));
      }
    }
  });
});
