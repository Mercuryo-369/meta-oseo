/**
 * Pruebas de la disposición de las piezas repetidas de la escena del hueso: deterministas, dentro de sus
 * límites y coherentes con el estado (número de osteonas, de láminas y de osteocitos).
 */
import { describe, expect, it } from 'vitest';
import {
  HOLGURA_PERIOSTIO,
  METAFISIS,
  THETA_RETIRO,
  Y_CARTILAGO,
  arcoConservadoDeLamina,
  arcoRetiradoDeLamina,
  distanciaAngular,
  lagunasDeOsteocitos,
  osteonasDelCorte,
  perfilPeriostio,
  radioExteriorHueso,
  radiosDeLamina,
  trabeculasDeEpifisis,
} from './disposicion';
import {
  EPIFISIS_LARGO,
  EPIFISIS_RADIO,
  N_LAMINAS,
  N_OSTEOCITOS,
  N_OSTEONAS_CORTE,
  R_HAVERS,
  R_OSTEONA,
} from './estado';

describe('silueta del hueso largo y periostio', () => {
  it('la silueta es la diáfisis, se ensancha en la metáfisis y sigue la epífisis', () => {
    expect(radioExteriorHueso(0)).toBe(1);
    expect(radioExteriorHueso(METAFISIS.desde)).toBeCloseTo(1, 9);
    expect(radioExteriorHueso(METAFISIS.hasta)).toBeGreaterThan(1.35);
    expect(radioExteriorHueso(4.05)).toBeCloseTo(EPIFISIS_RADIO, 9);
    expect(radioExteriorHueso(-4.05)).toBeCloseTo(EPIFISIS_RADIO, 9);
  });

  it('el periostio va de un cartílago articular al otro, siempre por fuera del hueso y pegado a él', () => {
    const perfil = perfilPeriostio();
    expect(perfil).toHaveLength(24);
    expect(perfil[0]![1]).toBeCloseTo(-Y_CARTILAGO, 9);
    expect(perfil[perfil.length - 1]![1]).toBeCloseTo(Y_CARTILAGO, 9);
    expect(Y_CARTILAGO).toBeCloseTo(4.78, 2);
    for (let i = 1; i < perfil.length; i++)
      expect(perfil[i]![1]).toBeGreaterThan(perfil[i - 1]![1]);
    // Entre dos puntos del perfil (un segmento recto) el hueso no asoma por encima de la vaina.
    for (let i = 1; i < perfil.length; i++) {
      const [r0, y0] = perfil[i - 1]!;
      const [r1, y1] = perfil[i]!;
      for (let k = 0; k <= 10; k++) {
        const y = y0 + ((y1 - y0) * k) / 10;
        const r = r0 + ((r1 - r0) * k) / 10;
        expect(r, `y = ${y}`).toBeGreaterThan(radioExteriorHueso(y) - 0.012);
        expect(r - radioExteriorHueso(y), `y = ${y}`).toBeLessThan(HOLGURA_PERIOSTIO + 0.06);
      }
    }
  });
});

describe('osteonasDelCorte', () => {
  it('da el número previsto, siempre las mismas, dentro de la cortical y sin solaparse', () => {
    const osteonas = osteonasDelCorte();
    expect(osteonas).toHaveLength(N_OSTEONAS_CORTE);
    expect(osteonasDelCorte()).toEqual(osteonas);
    for (const o of osteonas) {
      const radio = Math.hypot(o.x, o.y);
      // Ni el borde interior toca el endostio (r = 0,65) ni el exterior la lámina externa (r = 0,95).
      expect(radio - 0.1).toBeGreaterThanOrEqual(0.65 - 1e-9);
      expect(radio + 0.1).toBeLessThanOrEqual(0.96);
    }
    osteonas.forEach((a, i) =>
      osteonas.slice(i + 1).forEach((b) => {
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.16);
      }),
    );
  });
});

describe('trabeculasDeEpifisis', () => {
  it('son deterministas, caen dentro de la epífisis y tienen dirección unitaria', () => {
    const a = trabeculasDeEpifisis(60, 5, 1, 4);
    expect(trabeculasDeEpifisis(60, 5, 1, 4)).toEqual(a);
    expect(a).toHaveLength(60);
    for (const t of a) {
      const dentro =
        (t.x / EPIFISIS_RADIO) ** 2 +
        (t.z / EPIFISIS_RADIO) ** 2 +
        ((t.y - 4) / EPIFISIS_LARGO) ** 2;
      expect(dentro).toBeLessThanOrEqual(0.74 + 1e-9);
      expect(Math.hypot(t.dx, t.dy, t.dz)).toBeCloseTo(1, 6);
      expect(t.largo).toBeGreaterThan(0.2);
    }
  });

  it('semillas distintas dan disposiciones distintas', () => {
    expect(trabeculasDeEpifisis(20, 1, 1, 0)).not.toEqual(trabeculasDeEpifisis(20, 2, 1, 0));
  });
});

describe('láminas de la osteona', () => {
  it('llenan sin huecos desde el conducto hasta el radio de la osteona', () => {
    expect(radiosDeLamina(0).interior).toBeGreaterThan(R_HAVERS);
    for (let i = 1; i < N_LAMINAS; i++) {
      expect(radiosDeLamina(i).interior).toBeCloseTo(radiosDeLamina(i - 1).exterior, 9);
    }
    expect(radiosDeLamina(N_LAMINAS - 1).exterior).toBeCloseTo(R_OSTEONA, 9);
  });

  it('el corte en escalera retira más de las láminas de fuera que de las de dentro', () => {
    for (let i = 1; i < N_LAMINAS; i++) {
      expect(arcoRetiradoDeLamina(i)).toBeGreaterThan(arcoRetiradoDeLamina(i - 1));
    }
    for (let i = 0; i < N_LAMINAS; i++) {
      const { arco } = arcoConservadoDeLamina(i);
      expect(arco + arcoRetiradoDeLamina(i)).toBeCloseTo(Math.PI * 2, 9);
      expect(arco).toBeGreaterThan(Math.PI / 2);
    }
  });
});

describe('lagunasDeOsteocitos', () => {
  const lagunas = lagunasDeOsteocitos();

  it('da el número previsto y siempre las mismas', () => {
    expect(lagunas).toHaveLength(N_OSTEOCITOS);
    expect(lagunasDeOsteocitos()).toEqual(lagunas);
  });

  it('cada una está en su lámina, a la vista: donde la lámina existe y la de fuera ya no', () => {
    for (const l of lagunas) {
      const d = distanciaAngular(l.theta, THETA_RETIRO);
      expect(d).toBeGreaterThanOrEqual(arcoRetiradoDeLamina(l.lamina) / 2 - 1e-9);
      if (l.lamina + 1 < N_LAMINAS) {
        expect(d).toBeLessThanOrEqual(arcoRetiradoDeLamina(l.lamina + 1) / 2 + 1e-9);
      }
      expect(l.radio).toBeCloseTo(radiosDeLamina(l.lamina).exterior, 2);
    }
  });

  it('hay al menos una en cada lámina', () => {
    for (let i = 0; i < N_LAMINAS; i++) {
      expect(lagunas.some((l) => l.lamina === i)).toBe(true);
    }
  });
});
