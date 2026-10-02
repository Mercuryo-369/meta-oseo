/**
 * Pruebas de la disposición de la escena del alvéolo tras la extracción: el contorno del cuerpo coincide con el de
 * la escena `hueso_alveolar` cuando el reborde está intacto y, con la pérdida, baja, se estrecha (más por
 * vestibular), se desplaza hacia lingual y se acerca al conducto sin tragárselo; los polígonos que se morfan tienen
 * topología fija; la encía cierra hacia el centro de la cresta; los rellenos caben en la cavidad; las piezas
 * repetidas son deterministas y están donde deben.
 */
import { describe, expect, it } from 'vitest';
import {
  CENTRO_MEDULA,
  PASOS_CONTORNO,
  PASOS_RELLENO,
  PUNTOS_ENCIA,
  Y_FONDO_CAVIDAD,
  bordeEncia,
  cajaDe,
  carrilesEncia,
  contornoExterior,
  contornoInterior,
  dentroDelTrabecular,
  desplazamientoLingual,
  osteoclastosReborde,
  poligonoCavidad,
  poligonoRelleno,
  poligonoTapa,
  posicionForamen,
  puntosSangrado,
  puntosVasos,
  semianchoBase,
  semianchoInteriorReborde,
  semianchoReborde,
  techoAlveolo,
  trabeculasReborde,
  yCrestaInterior,
  zCentroCresta,
  zSuperficie,
} from './disposicion';
import type { Punto2 } from './disposicion';
import {
  DESPLAZAMIENTO_LAMINA,
  Y_FONDO_INTERIOR,
  dentroDePoligono,
  perfilCuerpo,
  semianchoCuerpo,
  semianchoInterior,
  siluetaRaiz,
} from '../alveolar/disposicion';
import {
  CONDUCTO,
  GROSOR_CORTICAL,
  GROSOR_LIGAMENTO,
  LARGO_SEGMENTO,
  PROFUNDIDAD_TRABECULAR,
  SEMIANCHO_RAIZ,
  Y_APICE,
  Y_BASE,
  Y_CRESTA,
  Y_MAS_ANCHO,
  Z_ALVEOLO,
} from '../alveolar/estado';
import { GROSOR_CRESTA, N_OSTEOCLASTOS_REBORDE, N_TRABECULAS_ALVEOLO, yCresta } from './estado';

const PERDIDAS = [0, 0.06, 0.25, 0.6, 0.85, 1];

function esPoligonoFinito(p: readonly Punto2[]): void {
  expect(p.length).toBeGreaterThan(8);
  for (const [z, y] of p) {
    expect(Number.isFinite(z)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
  }
}

/** Ancho del contorno exterior a la altura `y` (interpolando entre muestras). */
function anchoA(y: number, reborde: number): number {
  return zSuperficie(y, 'vestibular', reborde) - zSuperficie(y, 'lingual', reborde);
}

describe('contorno del cuerpo con el reborde intacto', () => {
  it('coincide con el de la escena hueso_alveolar (mismo segmento de mandíbula)', () => {
    for (let y = Y_BASE; y <= Y_CRESTA + 1e-9; y += 0.05) {
      expect(semianchoReborde(y, 'vestibular', 0)).toBeCloseTo(
        Math.max(0.01, semianchoCuerpo(y)),
        9,
      );
      expect(semianchoReborde(y, 'lingual', 0)).toBeCloseTo(Math.max(0.01, semianchoCuerpo(y)), 9);
      const interior = semianchoInterior(y, 'lingual');
      expect(semianchoInteriorReborde(y, 'lingual', 0)).toBeCloseTo(
        y < Y_MAS_ANCHO ? interior : Math.max(0.01, interior),
        9,
      );
    }
    expect(desplazamientoLingual(Y_CRESTA, 0)).toBe(0);
    expect(semianchoBase(Y_CRESTA - 0.5)).toBeGreaterThan(semianchoBase(Y_CRESTA));
  });

  it('el contorno exterior es un polígono válido dentro de la caja del perfil original', () => {
    const p = contornoExterior(0);
    esPoligonoFinito(p);
    expect(p).toHaveLength(2 * (PASOS_CONTORNO + 1));
    const caja = cajaDe(p);
    const original = cajaDe(perfilCuerpo());
    expect(caja.yMax).toBeCloseTo(original.yMax, 9);
    expect(caja.yMin).toBeCloseTo(original.yMin, 9);
    expect(caja.zMax).toBeCloseTo(original.zMax, 6);
  });
});

describe('contorno del cuerpo con la pérdida del reborde', () => {
  it.each(PERDIDAS)(
    'con pérdida %s los contornos tienen topología fija y el interior cabe en el exterior',
    (r) => {
      const fuera = contornoExterior(r);
      const dentro = contornoInterior(r);
      esPoligonoFinito(fuera);
      esPoligonoFinito(dentro);
      expect(fuera).toHaveLength(2 * (PASOS_CONTORNO + 1));
      expect(dentro).toHaveLength(2 * (PASOS_CONTORNO + 1));
      for (const p of dentro) {
        // Un poco hacia dentro del propio punto, porque en la cresta ambos contornos se afinan al mínimo.
        const q: Punto2 = [p[0] * 0.98, p[1] - 0.01];
        expect(dentroDePoligono(q, fuera), `r = ${r}, ${p}`).toBe(true);
      }
      expect(dentroDePoligono(CENTRO_MEDULA, dentro)).toBe(true);
      expect(cajaDe(fuera).yMax).toBeCloseTo(yCresta(r), 9);
      expect(cajaDe(dentro).yMax).toBeCloseTo(yCrestaInterior(r), 9);
    },
  );

  it('la cresta baja, el reborde se estrecha y el desplazamiento hacia lingual crece con la pérdida', () => {
    let anteriorCresta = Infinity;
    let anteriorAncho = Infinity;
    let anteriorDesplazamiento = -1;
    for (const r of PERDIDAS) {
      const yC = yCresta(r);
      expect(yC).toBeLessThanOrEqual(anteriorCresta);
      anteriorCresta = yC;
      const ancho = anchoA(yC - 0.2, r);
      expect(ancho).toBeLessThanOrEqual(anteriorAncho + 1e-9);
      anteriorAncho = ancho;
      const s = desplazamientoLingual(yC, r);
      expect(s).toBeGreaterThanOrEqual(anteriorDesplazamiento);
      anteriorDesplazamiento = s;
    }
    // Primer año (pérdida 0,6): el ancho a 0,2 bajo la cresta queda entre el 40 y el 65 % del original.
    const original = anchoA(Y_CRESTA - 0.2, 0);
    const primerAnio = anchoA(yCresta(0.6) - 0.2, 0.6) / original;
    expect(primerAnio).toBeGreaterThan(0.4);
    expect(primerAnio).toBeLessThan(0.65);
    // Al final, en filo: la cresta es casi un punto y está desplazada hacia lingual.
    expect(anchoA(yCresta(1), 1)).toBeLessThan(0.1);
    expect(zCentroCresta(1)).toBeLessThan(-0.1);
    expect(zCentroCresta(0)).toBeCloseTo(0, 9);
  });

  it('la tabla vestibular pierde más que la lingual', () => {
    const yC = yCresta(1);
    const perdidaVestibular =
      semianchoReborde(yC - 0.4, 'vestibular', 0) - semianchoReborde(yC - 0.4, 'vestibular', 1);
    const perdidaLingual =
      semianchoReborde(yC - 0.4, 'lingual', 0) - semianchoReborde(yC - 0.4, 'lingual', 1);
    expect(perdidaVestibular).toBeGreaterThan(perdidaLingual);
  });

  it('la base no cambia: por debajo de la parte más ancha el contorno es el original', () => {
    for (const r of PERDIDAS) {
      for (const y of [Y_BASE + 0.1, -2, Y_MAS_ANCHO]) {
        expect(zSuperficie(y, 'vestibular', r)).toBeCloseTo(semianchoCuerpo(y), 9);
        expect(zSuperficie(y, 'lingual', r)).toBeCloseTo(-semianchoCuerpo(y), 9);
      }
    }
  });

  it.each(PERDIDAS)(
    'con pérdida %s el conducto mandibular sigue dentro del hueso trabecular',
    (r) => {
      for (let i = 0; i < 24; i++) {
        const a = (Math.PI * 2 * i) / 24;
        const z = CONDUCTO.z + (CONDUCTO.radio + 0.03) * Math.cos(a);
        const y = CONDUCTO.y + (CONDUCTO.radio + 0.03) * Math.sin(a);
        expect(dentroDelTrabecular(z, y, r, 0), `r = ${r}, ${[z, y]}`).toBe(true);
      }
    },
  );

  it('al final el conducto queda cerca de la cresta (menos de media unidad bajo la cara interna)', () => {
    const distancia = yCrestaInterior(1) - (CONDUCTO.y + CONDUCTO.radio);
    expect(distancia).toBeGreaterThan(0.03);
    expect(distancia).toBeLessThan(0.5);
    expect(yCrestaInterior(0) - (CONDUCTO.y + CONDUCTO.radio)).toBeGreaterThan(2);
  });

  it('dentroDelTrabecular respeta el techo, el fondo y las tablas', () => {
    expect(dentroDelTrabecular(0, 0, 0)).toBe(true);
    expect(dentroDelTrabecular(0, yCrestaInterior(0) + 0.05, 0)).toBe(false);
    expect(dentroDelTrabecular(0, Y_FONDO_INTERIOR - 0.05, 0)).toBe(false);
    expect(dentroDelTrabecular(semianchoCuerpo(0) - GROSOR_CORTICAL.vestibular / 2, 0, 0)).toBe(
      false,
    );
    expect(dentroDelTrabecular(0, 1, 1)).toBe(false);
  });
});

describe('encía', () => {
  it('abierta, el borde libre queda junto al cuello del diente; cerrada, los dos bordes se solapan en el centro de la cresta', () => {
    expect(bordeEncia('vestibular', 0, 0)).toBeGreaterThan(Z_ALVEOLO + SEMIANCHO_RAIZ);
    expect(bordeEncia('lingual', 0, 0)).toBeLessThan(Z_ALVEOLO - SEMIANCHO_RAIZ);
    for (const r of PERDIDAS) {
      const centro = zCentroCresta(r);
      expect(bordeEncia('vestibular', 1, r)).toBeGreaterThan(centro);
      expect(bordeEncia('lingual', 1, r)).toBeLessThan(centro);
      expect(bordeEncia('vestibular', 1, r)).toBeLessThan(bordeEncia('lingual', 1, r) + 0.1);
    }
  });

  it.each([0, 0.5, 1])(
    'con cierre %s los carriles tienen topología fija, el exterior más afuera y pegados a la cresta',
    (c) => {
      for (const r of PERDIDAS) {
        for (const lado of ['vestibular', 'lingual'] as const) {
          const { interior, exterior } = carrilesEncia(lado, c, r);
          expect(interior).toHaveLength(PUNTOS_ENCIA);
          expect(exterior).toHaveLength(PUNTOS_ENCIA);
          esPoligonoFinito([...interior, ...exterior]);
          const yC = yCresta(r);
          for (let i = 0; i < interior.length; i++) {
            expect(interior[i]![1]).toBeLessThanOrEqual(yC + 1e-9);
            expect(exterior[i]![1]).toBeGreaterThanOrEqual(interior[i]![1] - 1e-9);
            expect(Math.abs(exterior[i]![0])).toBeGreaterThanOrEqual(
              Math.abs(interior[i]![0]) - 0.25,
            );
          }
          // Los puntos de la cara del cuerpo están sobre la superficie.
          const [z0, y0] = interior[0]!;
          expect(z0).toBeCloseTo(zSuperficie(y0, lado, r), 9);
        }
      }
    },
  );
});

describe('relleno del alvéolo', () => {
  it('la cavidad entera es un polígono de topología fija que contiene la raíz y cabe en la lámina', () => {
    const cavidad = poligonoCavidad(Y_FONDO_CAVIDAD, Y_CRESTA, 1);
    expect(cavidad).toHaveLength(2 * (PASOS_RELLENO + 1));
    esPoligonoFinito(cavidad);
    const raiz = siluetaRaiz(0);
    for (const p of raiz)
      if (p[1] < Y_CRESTA - 0.05) expect(dentroDePoligono(p, cavidad), `${p}`).toBe(true);
    const lamina = siluetaRaiz(DESPLAZAMIENTO_LAMINA);
    for (const p of cavidad)
      if (p[1] < Y_CRESTA - 0.05) expect(dentroDePoligono(p, lamina), `${p}`).toBe(true);
    expect(cajaDe(cavidad).yMin).toBeCloseTo(Y_APICE - GROSOR_LIGAMENTO, 9);
  });

  it('el relleno sube desde el fondo con el nivel y se encoge desde las paredes y el fondo', () => {
    const entero = poligonoRelleno(0, 1, Y_CRESTA);
    const medio = poligonoRelleno(0, 0.5, Y_CRESTA);
    const encogido = poligonoRelleno(0.5, 1, Y_CRESTA);
    expect(cajaDe(medio).yMin).toBeCloseTo(cajaDe(entero).yMin, 9);
    expect(cajaDe(medio).yMax).toBeLessThan(cajaDe(entero).yMax);
    expect(cajaDe(encogido).yMin).toBeGreaterThan(cajaDe(entero).yMin);
    expect(cajaDe(encogido).zMax - cajaDe(encogido).zMin).toBeLessThan(
      0.6 * (cajaDe(entero).zMax - cajaDe(entero).zMin),
    );
    for (const p of encogido) {
      expect(dentroDePoligono([p[0] * 0.999 + Z_ALVEOLO * 0.001, p[1] - 0.001], entero)).toBe(true);
    }
    const nada = poligonoRelleno(1, 1, Y_CRESTA);
    expect(cajaDe(nada).yMax - cajaDe(nada).yMin).toBeLessThan(1e-9);
  });

  it('el techo del alvéolo sigue a la cresta cuando el reborde baja y la tapa es una banda bajo él', () => {
    expect(techoAlveolo(0)).toBe(Y_CRESTA);
    expect(techoAlveolo(0.6)).toBeCloseTo(yCresta(0.6), 9);
    const tapa = poligonoTapa(1, Y_CRESTA);
    const caja = cajaDe(tapa);
    expect(caja.yMax).toBeCloseTo(Y_CRESTA, 9);
    expect(caja.yMin).toBeCloseTo(Y_CRESTA - GROSOR_CRESTA, 9);
    expect(cajaDe(poligonoTapa(0, Y_CRESTA)).yMin).toBeCloseTo(Y_CRESTA, 9);
  });

  it('el sangrado está en las paredes y los vasos dentro de la cavidad', () => {
    const cavidad = poligonoCavidad(Y_FONDO_CAVIDAD, Y_CRESTA, 1);
    const raiz = siluetaRaiz(0);
    expect(puntosSangrado().length).toBeGreaterThanOrEqual(6);
    for (const p of puntosSangrado()) {
      expect(dentroDePoligono(p, cavidad), `${p}`).toBe(true);
      expect(dentroDePoligono(p, raiz), `${p}`).toBe(false);
    }
    expect(puntosVasos().length).toBeGreaterThanOrEqual(8);
    for (const p of puntosVasos()) expect(dentroDePoligono(p, cavidad), `${p}`).toBe(true);
  });
});

describe('trabéculas, osteoclastos y foramen', () => {
  const lista = trabeculasReborde();

  it('da el número previsto, siempre las mismas, dentro del hueso intacto, fuera del conducto y en el hueco', () => {
    expect(lista).toHaveLength(N_TRABECULAS_ALVEOLO);
    expect(trabeculasReborde()).toEqual(lista);
    expect(trabeculasReborde(3)).not.toEqual(lista);
    const region = contornoInterior(0);
    for (const t of lista) {
      expect(dentroDePoligono([t.z, t.y], region)).toBe(true);
      expect(Math.hypot(t.z - CONDUCTO.z, t.y - CONDUCTO.y)).toBeGreaterThan(CONDUCTO.radio + 0.1);
      expect(t.x).toBeLessThan(0);
      expect(t.x).toBeGreaterThan(-PROFUNDIDAD_TRABECULAR);
      expect(t.largo).toBeGreaterThan(0.25);
      expect(Number.isFinite(t.angulo)).toBe(true);
    }
  });

  it('marca las del alvéolo original y hay de los dos tipos; las de arriba se pierden con el reborde', () => {
    const enAlveolo = lista.filter((t) => t.enAlveolo);
    expect(enAlveolo.length).toBeGreaterThan(5);
    expect(enAlveolo.length).toBeLessThan(lista.length / 2);
    const lamina = siluetaRaiz(DESPLAZAMIENTO_LAMINA);
    for (const t of lista) expect(t.enAlveolo).toBe(dentroDePoligono([t.z, t.y], lamina));
    const quedan = lista.filter((t) => dentroDelTrabecular(t.z, t.y, 1, 0.1)).length;
    expect(quedan).toBeGreaterThan(10);
    expect(quedan).toBeLessThan(lista.length / 2);
    for (const t of lista)
      if (t.y > yCrestaInterior(1)) expect(dentroDelTrabecular(t.z, t.y, 1)).toBe(false);
  });

  it('los osteoclastos del reborde están sobre la superficie, cerca de la cresta actual y más por vestibular', () => {
    for (const r of PERDIDAS) {
      const puntos = osteoclastosReborde(r, LARGO_SEGMENTO / 2);
      expect(puntos).toHaveLength(N_OSTEOCLASTOS_REBORDE);
      const yC = yCresta(r);
      let vestibulares = 0;
      for (const p of puntos) {
        expect(p.y).toBeLessThan(yC);
        expect(p.y).toBeGreaterThan(yC - 0.6);
        expect(p.x).toBeLessThan(0);
        expect(p.x).toBeGreaterThan(-LARGO_SEGMENTO / 2);
        const lado = p.z > zCentroCresta(r) ? 'vestibular' : 'lingual';
        if (lado === 'vestibular') vestibulares++;
        expect(Math.abs(p.z - zSuperficie(p.y, lado, r))).toBeLessThan(0.05);
      }
      expect(vestibulares).toBeGreaterThan(puntos.length / 2);
    }
  });

  it('el foramen está sobre la cara vestibular y la cresta se le acerca con la pérdida', () => {
    const inicio = posicionForamen(0);
    const final = posicionForamen(1);
    expect(inicio.z).toBeCloseTo(semianchoCuerpo(inicio.y) + 0.006, 9);
    expect(final.z).toBeLessThanOrEqual(inicio.z);
    expect(yCresta(0) - inicio.y).toBeGreaterThan(2.5);
    expect(yCresta(1) - final.y).toBeLessThan(0.6);
    expect(yCresta(1) - final.y).toBeGreaterThan(0.2);
  });
});
