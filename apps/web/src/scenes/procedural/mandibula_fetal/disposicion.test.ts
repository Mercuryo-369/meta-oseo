/**
 * Pruebas de la disposición de la escena de la mandíbula fetal: el arco es simétrico y se junta en la línea
 * media, las normales son horizontales y apuntan hacia fuera, el perfil del cuerpo y la silueta de la rama son
 * polígonos válidos, y las células son deterministas y caen dentro de su masa.
 */
import { describe, expect, it } from 'vitest';
import {
  CONDENSACION,
  U_GERMENES,
  U_OIDO,
  VENTANA_CORTE,
  celulasCondensacion,
  celulasMesenquima,
  centroCondensacion,
  centroCuerpo,
  escalaCuerpoEn,
  normalLateral,
  osiculos,
  perfilCuerpo,
  posicionGermen,
  puntoArco,
  puntoNervio,
  puntosMentoniano,
  radioMeckel,
  siluetaRama,
  tangenteArco,
  tramosCuerpo,
} from './disposicion';
import type { Lado, Punto2 } from './disposicion';
import {
  ALCANCE_COMPLETO,
  MESENQUIMA,
  N_GERMENES,
  R_LIGAMENTO,
  R_MECKEL,
  U_CENTRO,
  U_CUERPO,
} from './estado';

const LADOS: Lado[] = [1, -1];
const U = Array.from({ length: 27 }, (_, i) => U_OIDO + (i / 26) * (1 - U_OIDO));

/** Área con signo de un polígono (positiva si es antihorario). */
function areaConSigno(p: readonly Punto2[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i]!;
    const [x2, y2] = p[(i + 1) % p.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function seCruzan(a: Punto2, b: Punto2, c: Punto2, d: Punto2): boolean {
  const orient = (p: Punto2, q: Punto2, r: Punto2) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return orient(a, b, c) !== orient(a, b, d) && orient(c, d, a) !== orient(c, d, b);
}

/** Un polígono es simple si ningún par de lados no consecutivos se cruza. */
function esSimple(p: readonly Punto2[]): boolean {
  const n = p.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (seCruzan(p[i]!, p[(i + 1) % n]!, p[j]!, p[(j + 1) % n]!)) return false;
    }
  }
  return true;
}

describe('el arco', () => {
  it('las dos mitades son simétricas en X y se juntan en la línea media', () => {
    for (const u of U) {
      const a = puntoArco(1, u);
      const b = puntoArco(-1, u);
      expect(a[0]).toBeCloseTo(-b[0], 9);
      expect(a[1]).toBeCloseTo(b[1], 9);
      expect(a[2]).toBeCloseTo(b[2], 9);
    }
    expect(puntoArco(1, 1)[0]).toBeCloseTo(0, 9);
    expect(puntoArco(1, 1)[2]).toBeGreaterThan(puntoArco(1, 0)[2]);
  });

  it('sube hacia el oído por detrás del cuerpo y es continuo en u = 0', () => {
    const oido = puntoArco(1, U_OIDO);
    const union = puntoArco(1, 0);
    expect(oido[1]).toBeGreaterThan(union[1] + 1);
    expect(oido[2]).toBeLessThan(union[2]);
    const antes = puntoArco(1, -1e-4);
    const despues = puntoArco(1, 1e-4);
    expect(
      Math.hypot(antes[0] - despues[0], antes[1] - despues[1], antes[2] - despues[2]),
    ).toBeLessThan(0.01);
  });

  it('la tangente es unitaria y avanza hacia delante; la normal es horizontal, unitaria y hacia fuera', () => {
    for (const lado of LADOS) {
      for (const u of U) {
        const t = tangenteArco(lado, u);
        expect(Math.hypot(...t)).toBeCloseTo(1, 6);
        const n = normalLateral(lado, u);
        expect(n[1]).toBe(0);
        expect(Math.hypot(...n)).toBeCloseTo(1, 6);
        expect(n[0] * t[0] + n[2] * t[2]).toBeCloseTo(0, 6);
        // Hacia fuera: en la mitad +X la normal tiene componente +X o mira hacia delante en la línea media.
        const p = puntoArco(lado, u);
        const fuera = (p[0] + n[0] * 0.5) * lado >= p[0] * lado - 1e-9 || n[2] > 0.5;
        expect(fuera).toBe(true);
      }
      expect(tangenteArco(lado, 0.5)[2]).toBeGreaterThan(0.5);
    }
  });
});

describe('cartílago de Meckel y nervio', () => {
  it('el radio de Meckel es la varilla entera sin regresión y solo el ligamento posterior con regresión', () => {
    for (const u of U) expect(radioMeckel(u, 0)).toBeCloseTo(R_MECKEL, 9);
    expect(radioMeckel(-0.15, 1)).toBeCloseTo(R_LIGAMENTO, 9);
    expect(radioMeckel(0.5, 1)).toBe(0);
    expect(radioMeckel(0.9, 1)).toBe(0);
    expect(radioMeckel(U_OIDO, 1)).toBe(0);
    for (const u of U) {
      const r = radioMeckel(u, 0.5);
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(R_MECKEL);
    }
  });

  it('el martillo y el yunque quedan junto al extremo del oído del arco', () => {
    for (const lado of LADOS) {
      const p = puntoArco(lado, U_OIDO);
      for (const o of osiculos(lado)) {
        expect(Math.hypot(o.centro[0] - p[0], o.centro[1] - p[1], o.centro[2] - p[2])).toBeLessThan(
          0.5,
        );
        for (const s of o.semiejes) expect(s).toBeGreaterThan(0);
      }
    }
  });

  it('el nervio corre lateral al Meckel y el mentoniano sale hacia fuera y arriba', () => {
    for (const lado of LADOS) {
      for (const u of [0, 0.3, 0.6, 0.72]) {
        const meckel = puntoArco(lado, u);
        const nervio = puntoNervio(lado, u);
        // Más lejos de la línea media que el Meckel (en el plano horizontal).
        expect(Math.hypot(nervio[0], nervio[2] - 2.75)).toBeGreaterThan(
          Math.hypot(meckel[0], meckel[2] - 2.75),
        );
      }
      const m = puntosMentoniano(lado, 8);
      expect(m).toHaveLength(8);
      expect(m[7]![1]).toBeGreaterThan(m[0]![1] + 0.2);
      expect(Math.abs(m[7]![0])).toBeGreaterThan(Math.abs(m[0]![0]));
    }
  });
});

describe('cuerpo óseo', () => {
  it('el perfil es un polígono simple, antihorario, con la misma topología para cualquier altura alveolar', () => {
    const n = perfilCuerpo(1).length;
    for (const alveolar of [0, 0.25, 0.5, 0.75, 1]) {
      const p = perfilCuerpo(alveolar);
      expect(p).toHaveLength(n);
      expect(areaConSigno(p)).toBeGreaterThan(0);
      expect(esSimple(p)).toBe(true);
    }
    // Las láminas suben con `alveolar`.
    expect(perfilCuerpo(1)[0]![1]).toBeGreaterThan(perfilCuerpo(0)[0]![1] + 0.4);
  });

  it('la escala del cuerpo es cero fuera del alcance, se afila en la punta y es plena con el hueso completo', () => {
    expect(escalaCuerpoEn(U_CENTRO, 0.1, 0.5)).toBeCloseTo(0.5, 6);
    expect(escalaCuerpoEn(U_CENTRO + 0.2, 0.1, 0.5)).toBe(0);
    expect(escalaCuerpoEn(U_CENTRO + 0.09, 0.1, 0.5)).toBeGreaterThan(0);
    expect(escalaCuerpoEn(U_CENTRO + 0.09, 0.1, 0.5)).toBeLessThan(0.25);
    expect(escalaCuerpoEn(U_CUERPO.inicio, ALCANCE_COMPLETO, 1)).toBeCloseTo(1, 6);
    expect(escalaCuerpoEn(U_CUERPO.fin, ALCANCE_COMPLETO, 1)).toBeCloseTo(1, 6);
  });

  it('el alcance completo cubre los dos extremos del cuerpo', () => {
    expect(U_CENTRO - ALCANCE_COMPLETO).toBeLessThan(U_CUERPO.inicio);
    expect(U_CENTRO + ALCANCE_COMPLETO).toBeGreaterThan(U_CUERPO.fin);
  });

  it('la ventana de corte deja dos tramos en su mitad y uno en la otra, sin huecos fuera de ella', () => {
    const conVentana = tramosCuerpo(VENTANA_CORTE.lado);
    expect(conVentana).toHaveLength(2);
    expect(conVentana[0]!.u0).toBe(U_CUERPO.inicio);
    expect(conVentana[0]!.u1).toBe(VENTANA_CORTE.u0);
    expect(conVentana[1]!.u0).toBe(VENTANA_CORTE.u1);
    expect(conVentana[1]!.u1).toBe(U_CUERPO.fin);
    const otro = tramosCuerpo(VENTANA_CORTE.lado === 1 ? -1 : 1);
    expect(otro).toEqual([{ u0: U_CUERPO.inicio, u1: U_CUERPO.fin }]);
  });

  it('el centro del cuerpo queda lateral al Meckel y la condensación, en el centro de osificación', () => {
    for (const lado of LADOS) {
      const c = centroCuerpo(lado, 0.5);
      const m = puntoArco(lado, 0.5);
      expect(Math.abs(c[0])).toBeGreaterThan(Math.abs(m[0]));
      const k = centroCondensacion(lado);
      const centro = centroCuerpo(lado, U_CENTRO);
      expect(Math.hypot(k[0] - centro[0], k[1] - centro[1], k[2] - centro[2])).toBeLessThan(0.1);
    }
    expect(CONDENSACION.semiejes.every((s) => s > 0)).toBe(true);
  });
});

describe('gérmenes dentarios', () => {
  it('hay cinco por lado, en orden de atrás adelante, dentro del cuerpo y sin tocarse', () => {
    expect(U_GERMENES).toHaveLength(N_GERMENES);
    for (let i = 1; i < U_GERMENES.length; i++) {
      expect(U_GERMENES[i]!).toBeGreaterThan(U_GERMENES[i - 1]!);
    }
    for (const u of U_GERMENES) {
      expect(u).toBeGreaterThan(U_CUERPO.inicio);
      expect(u).toBeLessThan(U_CUERPO.fin);
    }
    for (const lado of LADOS) {
      for (let i = 1; i < N_GERMENES; i++) {
        const a = posicionGermen(lado, i - 1);
        const b = posicionGermen(lado, i);
        expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeGreaterThan(0.4);
      }
    }
  });

  it('uno cae dentro de la ventana de corte, para verlo en la sección', () => {
    expect(U_GERMENES.some((u) => u > VENTANA_CORTE.u0 && u < VENTANA_CORTE.u1)).toBe(true);
  });
});

describe('rama', () => {
  it('la silueta es un polígono simple antihorario con el cóndilo arriba y atrás y la base abajo', () => {
    const s = siluetaRama();
    expect(s.length).toBeGreaterThan(6);
    expect(areaConSigno(s)).toBeGreaterThan(0);
    expect(esSimple(s)).toBe(true);
    const masAlto = s.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(masAlto[0]).toBeLessThan(0);
    expect(Math.min(...s.map((p) => p[1]))).toBeLessThan(0);
  });
});

describe('células del mesénquima', () => {
  it('son deterministas, del número pedido y caen dentro de la masa', () => {
    const a = celulasMesenquima(60, 5);
    expect(celulasMesenquima(60, 5)).toEqual(a);
    expect(a).toHaveLength(60);
    expect(celulasMesenquima(60, 6)).not.toEqual(a);
    for (const c of a) {
      // Cerca del arco: a menos de un semieje y medio de algún punto del arco.
      const distancia = Math.min(
        ...LADOS.flatMap((lado) =>
          U.map((u) => {
            const p = puntoArco(lado, u);
            return Math.hypot(c.posicion[0] - p[0], c.posicion[1] - p[1], c.posicion[2] - p[2]);
          }),
        ),
      );
      expect(distancia).toBeLessThan(MESENQUIMA.ancho * 1.5);
      expect(c.escala).toBeGreaterThan(0.6);
    }
  });

  it('las de la condensación se apretan alrededor de su centro, en los dos lados', () => {
    const lista = celulasCondensacion(20, 9);
    expect(lista).toHaveLength(40);
    expect(celulasCondensacion(20, 9)).toEqual(lista);
    for (const lado of LADOS) {
      const centro = centroCondensacion(lado);
      const cerca = lista.filter(
        (c) =>
          Math.hypot(
            c.posicion[0] - centro[0],
            c.posicion[1] - centro[1],
            c.posicion[2] - centro[2],
          ) < Math.max(...CONDENSACION.semiejes),
      );
      expect(cerca.length).toBeGreaterThanOrEqual(20);
    }
  });
});
