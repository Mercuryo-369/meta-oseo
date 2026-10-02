/**
 * Pruebas de la disposición de la escena del movimiento ortodóntico: los perfiles estáticos son coherentes (la
 * región trabecular cabe en el bloque, la pulpa en el diente), los contornos del alvéolo se deforman como dice el
 * estado (ligamento estrecho a la derecha y ancho a la izquierda, lagunas solo en la pared de compresión, hueso
 * nuevo solo cuando el diente avanzó) y las piezas repetidas son deterministas y están donde deben.
 */
import { describe, expect, it } from 'vitest';
import {
  INDICE_APICE,
  MARGEN_HUELLA,
  N_MUESTRAS_RAIZ,
  TRAMO_HIALINIZADO,
  cajaDe,
  contornoRaiz,
  corrimientoEnAlveolo,
  dentroDeHuellaDiente,
  dentroDePoligono,
  fibrasLigamento,
  indicesOsteoblastos,
  indicesOsteoclastos,
  indicesVasos,
  paredInicial,
  perfilBloque,
  perfilCorona,
  perfilEncia,
  perfilesAlveolo,
  poseDiente,
  puntosFibra,
  regionTrabecular,
  semianchoRaiz,
  siluetaCorona,
  siluetaDienteInicial,
  siluetaPulpa,
  siluetaRaiz,
  trabeculasOrtodoncia,
  transformarPunto,
} from './disposicion';
import type { Punto2 } from './disposicion';
import {
  ALTO_CORONA,
  DESPLAZAMIENTO_MAXIMO,
  GROSOR_LAMINA,
  GROSOR_LIGAMENTO,
  HITOS_ORTODONCIA,
  N_TRABECULAS,
  PROFUNDIDAD_TRABECULAR,
  RADIO_APICE,
  SEMIANCHO_BLOQUE,
  SEMIANCHO_RAIZ,
  X_DIENTE_INICIAL,
  Y_APICE,
  Y_BASE,
  Y_CRESTA,
  estadoOrtodoncia,
} from './estado';

function esPoligonoSimpleYFinito(p: readonly Punto2[]): void {
  expect(p.length).toBeGreaterThan(8);
  for (const [x, y] of p) {
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
  }
  for (let i = 1; i < p.length; i++) {
    expect(Math.hypot(p[i]![0] - p[i - 1]![0], p[i]![1] - p[i - 1]![1])).toBeGreaterThan(1e-7);
  }
}

function distancia(a: Punto2, b: Punto2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Muestras del tercio medio de cada lado de la raíz (lejos de la cresta y del ápice). */
const IZQUIERDA = [12, 20, 28];
const DERECHA = IZQUIERDA.map((i) => N_MUESTRAS_RAIZ - 1 - i);

describe('perfiles estáticos', () => {
  it('el bloque, la región trabecular y la encía son polígonos válidos y anidados', () => {
    const bloque = perfilBloque();
    const trabecular = regionTrabecular();
    const encia = perfilEncia();
    esPoligonoSimpleYFinito(bloque);
    esPoligonoSimpleYFinito(trabecular);
    esPoligonoSimpleYFinito(encia);
    const caja = cajaDe(bloque);
    expect(caja.xMin).toBeCloseTo(-SEMIANCHO_BLOQUE, 9);
    expect(caja.xMax).toBeCloseTo(SEMIANCHO_BLOQUE, 9);
    expect(caja.yMin).toBeCloseTo(Y_BASE, 9);
    expect(caja.yMax).toBeCloseTo(Y_CRESTA, 9);
    for (const p of trabecular) expect(dentroDePoligono(p, bloque), `${p}`).toBe(true);
    expect(cajaDe(encia).yMin).toBeLessThanOrEqual(Y_CRESTA);
    expect(cajaDe(encia).yMax).toBeGreaterThan(Y_CRESTA);
  });

  it('la raíz se afina del cuello al ápice redondeado y su contorno tiene las muestras previstas', () => {
    expect(semianchoRaiz(Y_CRESTA)).toBeCloseTo(SEMIANCHO_RAIZ, 9);
    expect(semianchoRaiz(Y_APICE + RADIO_APICE)).toBeCloseTo(RADIO_APICE, 9);
    expect(semianchoRaiz(0)).toBeLessThan(semianchoRaiz(1));
    const { puntos, normales } = contornoRaiz();
    expect(puntos).toHaveLength(N_MUESTRAS_RAIZ);
    expect(normales).toHaveLength(N_MUESTRAS_RAIZ);
    esPoligonoSimpleYFinito(puntos);
    // Empieza en la cresta izquierda, pasa por el fondo del ápice y termina en la cresta derecha.
    expect(puntos[0]).toEqual([-SEMIANCHO_RAIZ, Y_CRESTA]);
    expect(puntos[INDICE_APICE]![0]).toBeCloseTo(0, 9);
    expect(puntos[INDICE_APICE]![1]).toBeCloseTo(Y_APICE, 9);
    expect(puntos[N_MUESTRAS_RAIZ - 1]).toEqual([SEMIANCHO_RAIZ, Y_CRESTA]);
    // Normales unitarias y hacia fuera: −X a la izquierda, −Y en el ápice, +X a la derecha.
    for (const [nx, ny] of normales) expect(Math.hypot(nx, ny)).toBeCloseTo(1, 6);
    expect(normales[20]![0]).toBeLessThan(-0.9);
    expect(normales[INDICE_APICE]![1]).toBeLessThan(-0.99);
    expect(normales[N_MUESTRAS_RAIZ - 21]![0]).toBeGreaterThan(0.9);
  });

  it('la corona nace en el cuello y termina en punta; su silueta y la pulpa caben donde deben', () => {
    const perfil = perfilCorona();
    expect(perfil[0]![1]).toBeLessThan(Y_CRESTA);
    expect(perfil[perfil.length - 1]![0]).toBe(0);
    expect(perfil[perfil.length - 1]![1]).toBeCloseTo(Y_CRESTA - 0.05 + ALTO_CORONA, 9);
    const corona = siluetaCorona();
    esPoligonoSimpleYFinito(corona);
    expect((cajaDe(corona).xMax + cajaDe(corona).xMin) / 2).toBeCloseTo(0, 9);
    const pulpa = siluetaPulpa();
    esPoligonoSimpleYFinito(pulpa);
    const raiz = siluetaRaiz();
    for (const p of pulpa) {
      expect(dentroDePoligono(p, raiz) || dentroDePoligono(p, corona), `${p}`).toBe(true);
    }
  });

  it('la silueta inicial del diente es un contorno cerrado con la raíz y la corona, en la posición inicial', () => {
    const silueta = siluetaDienteInicial();
    esPoligonoSimpleYFinito(silueta);
    const caja = cajaDe(silueta);
    expect((caja.xMax + caja.xMin) / 2).toBeCloseTo(X_DIENTE_INICIAL, 6);
    expect(caja.yMin).toBeCloseTo(Y_APICE, 6);
    expect(caja.yMax).toBeCloseTo(Y_CRESTA - 0.05 + ALTO_CORONA, 6);
  });
});

describe('pose y contornos del alvéolo', () => {
  it('en reposo el diente está en su posición inicial, sin inclinar, con el ligamento igual a ambos lados', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.reposo);
    expect(poseDiente(e)).toEqual({ x: X_DIENTE_INICIAL, angulo: 0 });
    expect(corrimientoEnAlveolo(e)).toBe(0);
    const p = perfilesAlveolo(e);
    for (const i of [...IZQUIERDA, ...DERECHA, INDICE_APICE]) {
      expect(distancia(p.raiz[i]!, p.pared[i]!)).toBeCloseTo(GROSOR_LIGAMENTO, 6);
      expect(distancia(p.pared[i]!, p.lamina[i]!)).toBeCloseTo(GROSOR_LAMINA, 6);
      expect(distancia(p.osteoide[i]!, p.pared[i]!)).toBeCloseTo(0, 6);
    }
    paredInicial().forEach((q, i) => expect(distancia(q, p.pared[i]!)).toBeLessThan(1e-9));
  });

  it('con la fuerza el ligamento se estrecha a la derecha y se ensancha a la izquierda; la pared no se mueve', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.ligamento);
    const p = perfilesAlveolo(e);
    const inicial = paredInicial();
    for (const i of DERECHA) {
      expect(distancia(p.raiz[i]!, p.pared[i]!)).toBeLessThan(GROSOR_LIGAMENTO * 0.6);
    }
    for (const i of IZQUIERDA) {
      expect(distancia(p.raiz[i]!, p.pared[i]!)).toBeGreaterThan(GROSOR_LIGAMENTO * 1.4);
    }
    // La pared solo se inclina un poco con el diente (nada de avanzar): queda a centésimas de la inicial.
    for (const i of [...IZQUIERDA, ...DERECHA]) {
      expect(distancia(p.pared[i]!, inicial[i]!)).toBeLessThan(0.08);
    }
    expect(poseDiente(e).angulo).toBeGreaterThan(0);
    // La corona se inclina hacia la derecha: un punto alto del eje queda más a la derecha que uno bajo.
    const pose = poseDiente(e);
    expect(transformarPunto([0, Y_CRESTA + 1], pose)[0]).toBeGreaterThan(
      transformarPunto([0, Y_APICE], pose)[0],
    );
  });

  it('en la resorción la pared derecha se festonea (lagunas) y adelgaza; la izquierda sigue lisa', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.resorcion);
    const p = perfilesAlveolo(e);
    const anchos = DERECHA.map((i) => distancia(p.raiz[i]!, p.pared[i]!));
    const anchosVecinos = DERECHA.map((i) => distancia(p.raiz[i + 2]!, p.pared[i + 2]!));
    // Con lagunas, el ancho del ligamento varía de una muestra a otra cercana del lado derecho.
    expect(Math.max(...anchos.map((a, k) => Math.abs(a - anchosVecinos[k]!)))).toBeGreaterThan(
      0.01,
    );
    for (const i of DERECHA) {
      expect(distancia(p.pared[i]!, p.lamina[i]!)).toBeLessThan(GROSOR_LAMINA * 0.8);
    }
    for (const i of IZQUIERDA) {
      expect(distancia(p.pared[i]!, p.lamina[i]!)).toBeCloseTo(GROSOR_LAMINA, 6);
      expect(distancia(p.raiz[i]!, p.pared[i]!)).toBeCloseTo(
        distancia(p.raiz[i + 2]!, p.pared[i + 2]!),
        1,
      );
    }
  });

  it('en la aposición hay ribete de osteoide solo a la izquierda y la pared ya avanzó desde la inicial', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.aposicion);
    const p = perfilesAlveolo(e);
    const inicial = paredInicial();
    for (const i of IZQUIERDA) {
      expect(distancia(p.osteoide[i]!, p.pared[i]!)).toBeGreaterThan(0.03);
      // La pared izquierda actual está a la derecha de la inicial: entre ambas va el hueso nuevo.
      expect(p.pared[i]![0]).toBeGreaterThan(inicial[i]![0] + 0.2);
    }
    for (const i of DERECHA) expect(distancia(p.osteoide[i]!, p.pared[i]!)).toBeCloseTo(0, 6);
  });

  it('al final el diente avanzó todo el recorrido, el ligamento vuelve a ser simétrico y la pared, lisa', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.retencion);
    expect(poseDiente(e).x).toBeCloseTo(X_DIENTE_INICIAL + DESPLAZAMIENTO_MAXIMO, 9);
    const p = perfilesAlveolo(e);
    for (const i of [...IZQUIERDA, ...DERECHA]) {
      expect(distancia(p.raiz[i]!, p.pared[i]!)).toBeCloseTo(GROSOR_LIGAMENTO, 6);
      expect(distancia(p.pared[i]!, p.lamina[i]!)).toBeCloseTo(GROSOR_LAMINA, 6);
    }
  });

  it('los contornos tienen siempre el mismo número de muestras y ningún NaN', () => {
    for (let k = 0; k <= 40; k++) {
      const p = perfilesAlveolo(estadoOrtodoncia(k / 40));
      for (const lista of [p.raiz, p.pared, p.lamina, p.osteoide, p.normales]) {
        expect(lista).toHaveLength(N_MUESTRAS_RAIZ);
        for (const [x, y] of lista) {
          expect(Number.isFinite(x)).toBe(true);
          expect(Number.isFinite(y)).toBe(true);
        }
      }
    }
  });
});

describe('trabéculas', () => {
  const lista = trabeculasOrtodoncia();

  it('da el número previsto y siempre las mismas', () => {
    expect(lista).toHaveLength(N_TRABECULAS);
    expect(trabeculasOrtodoncia()).toEqual(lista);
    expect(trabeculasOrtodoncia(99)).not.toEqual(lista);
  });

  it('cada una nace dentro del trabecular, fuera de la huella del diente y dentro del hueco', () => {
    const region = regionTrabecular();
    for (const t of lista) {
      expect(dentroDePoligono([t.x, t.y], region)).toBe(true);
      expect(dentroDeHuellaDiente([t.x, t.y], MARGEN_HUELLA)).toBe(false);
      expect(t.z).toBeLessThan(0);
      expect(t.z).toBeGreaterThan(-PROFUNDIDAD_TRABECULAR);
      expect(t.largo).toBeGreaterThan(0.25);
      expect(Number.isFinite(t.angulo)).toBe(true);
    }
  });

  it('la huella cubre la raíz en su posición inicial y en la final, y no el hueso lejano', () => {
    expect(dentroDeHuellaDiente([X_DIENTE_INICIAL, 0], 0)).toBe(true);
    expect(dentroDeHuellaDiente([X_DIENTE_INICIAL + DESPLAZAMIENTO_MAXIMO, 0], 0)).toBe(true);
    expect(
      dentroDeHuellaDiente([X_DIENTE_INICIAL + DESPLAZAMIENTO_MAXIMO / 2, Y_APICE + 0.05], 0),
    ).toBe(true);
    expect(dentroDeHuellaDiente([2, 0], MARGEN_HUELLA)).toBe(false);
    expect(dentroDeHuellaDiente([X_DIENTE_INICIAL, Y_APICE - 1], MARGEN_HUELLA)).toBe(false);
  });
});

describe('fibras, vasos y células', () => {
  it('las fibras van del hueso (más arriba) al cemento (más abajo) a ambos lados, y radiales en el ápice', () => {
    const fibras = fibrasLigamento();
    expect(fibras.length).toBeGreaterThan(20);
    const p = perfilesAlveolo(estadoOrtodoncia(0));
    let izquierda = 0;
    let derecha = 0;
    for (const f of fibras) {
      const hueso = p.osteoide[f.pared]!;
      const raiz = p.raiz[f.raiz]!;
      if (f.pared < INDICE_APICE - 6) {
        izquierda++;
        expect(hueso[1]).toBeGreaterThan(raiz[1]);
      } else if (f.pared > INDICE_APICE + 6) {
        derecha++;
        expect(hueso[1]).toBeGreaterThan(raiz[1]);
      } else {
        expect(f.pared).toBe(f.raiz);
      }
    }
    expect(izquierda).toBeGreaterThan(8);
    expect(derecha).toBeGreaterThan(8);
  });

  it('las fibras se arrugan del lado de compresión y se tensan del lado de tensión', () => {
    const fibras = fibrasLigamento();
    const reposo = estadoOrtodoncia(0);
    const fuerza = estadoOrtodoncia(HITOS_ORTODONCIA.ligamento);
    const desvio = (puntos: Punto2[]): number => {
      const [a, , , b] = puntos as [Punto2, Punto2, Punto2, Punto2];
      const largo = distancia(a, b) || 1;
      return puntos.slice(1, 3).reduce((m, q) => {
        const cruz = Math.abs((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]));
        return Math.max(m, cruz / largo);
      }, 0);
    };
    const izquierda = fibras.find((f) => f.pared === 20)!;
    const derecha = fibras.find((f) => f.pared === N_MUESTRAS_RAIZ - 1 - 20)!;
    expect(desvio(puntosFibra(perfilesAlveolo(fuerza), izquierda, fuerza))).toBeLessThan(1e-6);
    expect(desvio(puntosFibra(perfilesAlveolo(fuerza), derecha, fuerza))).toBeGreaterThan(
      desvio(puntosFibra(perfilesAlveolo(reposo), derecha, reposo)),
    );
    for (const f of fibras) {
      const puntos = puntosFibra(perfilesAlveolo(fuerza), f, fuerza);
      expect(puntos).toHaveLength(4);
      for (const [x, y] of puntos) {
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
      }
    }
  });

  it('los osteoclastos están en la pared derecha, los osteoblastos en la izquierda y los vasos en ambas', () => {
    for (const i of indicesOsteoclastos()) expect(i).toBeGreaterThan(INDICE_APICE + 6);
    for (const i of indicesOsteoblastos()) expect(i).toBeLessThan(INDICE_APICE - 6);
    const vasos = indicesVasos();
    expect(vasos.filter((i) => i < INDICE_APICE)).toHaveLength(vasos.length / 2);
    expect(vasos.filter((i) => i > INDICE_APICE)).toHaveLength(vasos.length / 2);
    expect(TRAMO_HIALINIZADO.desde).toBeGreaterThan(INDICE_APICE);
    expect(TRAMO_HIALINIZADO.hasta).toBeLessThan(N_MUESTRAS_RAIZ);
    for (const i of [...indicesOsteoclastos(), ...indicesOsteoblastos(), ...vasos]) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(N_MUESTRAS_RAIZ);
    }
  });
});
