/**
 * Pruebas del estado puro de la escena de la BMU: `estadoBmu(t)` debe ser una función pura del tiempo
 * (misma `t`, mismo estado), continua, monótona donde la biología lo exige, con los valores esperados en
 * el hito de cada fase y en t = 0 y t = 1, y reversible (ir y volver no deja huella).
 */
import { describe, expect, it } from 'vitest';
import {
  FASES_BMU,
  HITOS_BMU,
  LARGO,
  LIMITES_FASES_BMU,
  N_OSTEOCITOS,
  N_OSTEOCLASTOS,
  R_CANAL,
  R_CAVIDAD,
  R_LUMEN_FINAL,
  X_FRENTE_FINAL,
  X_INICIO,
  avanceLocalFormacion,
  espesorEn,
  estadoBmu,
  faseEnTiempo,
  posicionEnTunel,
  radioExcavado,
  radioLumenEn,
} from './estado';
import type { EstadoBmu } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

type Serie = (e: EstadoBmu) => number;

/** Valores de una magnitud a lo largo de todo el tiempo. */
function serie(f: Serie): number[] {
  return muestras.map((t) => f(estadoBmu(t)));
}

function esNoDecreciente(valores: number[]): boolean {
  return valores.every((v, i) => i === 0 || v >= valores[i - 1]! - 1e-12);
}

function esNoCreciente(valores: number[]): boolean {
  return valores.every((v, i) => i === 0 || v <= valores[i - 1]! + 1e-12);
}

/** El salto máximo entre dos muestras consecutivas. */
function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoBmu: función pura y acotada', () => {
  it('la misma t da exactamente el mismo estado, se llame como se llame y en el orden que sea', () => {
    const a = estadoBmu(0.4321);
    // Se calcula mucho entre medias, en cualquier orden.
    for (const t of [0.9, 0.1, 0.7, 0.3, 1, 0]) estadoBmu(t);
    const b = estadoBmu(0.4321);
    expect(b).toEqual(a);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('acota t a [0, 1] y trata un valor no numérico como 0', () => {
    expect(estadoBmu(-3)).toEqual(estadoBmu(0));
    expect(estadoBmu(7)).toEqual(estadoBmu(1));
    expect(estadoBmu(Number.NaN)).toEqual(estadoBmu(0));
    expect(estadoBmu(Infinity).t).toBe(0);
  });

  it('no produce NaN ni valores fuera de rango en ningún instante', () => {
    for (const t of muestras) {
      const e = estadoBmu(t);
      for (const [nombre, v] of Object.entries({
        frenteX: e.frenteX,
        longitudTunel: e.longitudTunel,
        festoneado: e.festoneado,
        revestimiento: e.revestimiento,
        llegada: e.precursores.llegada,
        fusion: e.precursores.fusion,
        escalaOc: e.osteoclastos.escala,
        inversion: e.inversion,
        cemento: e.lineaCemento,
        coberturaOb: e.osteoblastos.cobertura,
        formacion: e.avanceFormacion,
        espesor: e.espesorOsteoide,
        mineral: e.fraccionMineralizada,
        osteocitos: e.osteocitos.progreso,
        radioLumen: e.radioLumen,
      })) {
        expect(Number.isFinite(v), `${nombre} en t = ${t}`).toBe(true);
      }
      for (const v of [
        e.festoneado,
        e.revestimiento,
        e.precursores.llegada,
        e.precursores.fusion,
        e.osteoclastos.escala,
        e.inversion,
        e.lineaCemento,
        e.osteoblastos.cobertura,
        e.avanceFormacion,
        e.fraccionMineralizada,
        e.progresoFase,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(e.osteocitos.progreso).toBeLessThanOrEqual(N_OSTEOCITOS);
      expect(e.osteoclastos.cantidad).toBeLessThanOrEqual(N_OSTEOCLASTOS);
    }
  });
});

describe('estadoBmu: monotonía de lo que solo puede crecer o decrecer', () => {
  it('el túnel solo se alarga: el frente avanza hacia la izquierda y la longitud crece', () => {
    expect(esNoCreciente(serie((e) => e.frenteX))).toBe(true);
    expect(esNoDecreciente(serie((e) => e.longitudTunel))).toBe(true);
  });

  it('el osteoide, la mineralización, los osteocitos y la línea de cemento solo crecen', () => {
    expect(esNoDecreciente(serie((e) => e.avanceFormacion))).toBe(true);
    expect(esNoDecreciente(serie((e) => e.espesorOsteoide))).toBe(true);
    expect(esNoDecreciente(serie((e) => e.fraccionMineralizada))).toBe(true);
    expect(esNoDecreciente(serie((e) => e.osteocitos.progreso))).toBe(true);
    expect(esNoDecreciente(serie((e) => e.osteocitos.cantidad))).toBe(true);
    expect(esNoDecreciente(serie((e) => e.lineaCemento))).toBe(true);
  });

  it('la luz del conducto solo se estrecha', () => {
    expect(esNoCreciente(serie((e) => e.radioLumen))).toBe(true);
  });

  it('la fusión y la llegada de precursores solo crecen', () => {
    expect(esNoDecreciente(serie((e) => e.precursores.llegada))).toBe(true);
    expect(esNoDecreciente(serie((e) => e.precursores.fusion))).toBe(true);
  });

  it('los osteoclastos crecen al fusionarse y solo después decrecen (una sola subida y una sola bajada)', () => {
    const escala = serie((e) => e.osteoclastos.escala);
    const pico = escala.indexOf(Math.max(...escala));
    expect(esNoDecreciente(escala.slice(0, pico + 1))).toBe(true);
    expect(esNoCreciente(escala.slice(pico))).toBe(true);
    // Cero al principio y al final, llenos en plena resorción.
    expect(escala[0]).toBe(0);
    expect(escala.at(-1)).toBe(0);
    expect(estadoBmu(HITOS_BMU.resorcion).osteoclastos.escala).toBe(1);
  });

  it('el orden de los acontecimientos es el del ciclo', () => {
    // El primer instante en que ocurre cada cosa.
    const primero = (f: (e: EstadoBmu) => boolean): number =>
      muestras.find((t) => f(estadoBmu(t)))!;
    const llegan = primero((e) => e.precursores.llegada > 0);
    const excava = primero((e) => e.frenteX < X_INICIO - 1e-6);
    const cemento = primero((e) => e.lineaCemento > 0);
    const rellena = primero((e) => e.avanceFormacion > 0);
    const mineraliza = primero((e) => e.fraccionMineralizada > 0);
    const osteocito = primero((e) => e.osteocitos.cantidad >= 1);
    expect(llegan).toBeLessThan(excava);
    expect(excava).toBeLessThan(cemento);
    expect(cemento).toBeLessThan(rellena);
    expect(rellena).toBeLessThan(mineraliza);
    expect(mineraliza).toBeLessThanOrEqual(osteocito);
    // La resorción termina (el frente llega al final) antes de que empiece el relleno.
    const terminaResorcion = primero((e) => e.frenteX <= X_FRENTE_FINAL + 1e-6);
    expect(terminaResorcion).toBeLessThanOrEqual(rellena);
  });
});

describe('estadoBmu: continuidad', () => {
  it('ninguna magnitud continua da saltos entre instantes vecinos (paso de 0,001)', () => {
    const series: [string, Serie, number][] = [
      ['frenteX', (e) => e.frenteX, 0.2],
      ['revestimiento', (e) => e.revestimiento, 0.05],
      ['llegada', (e) => e.precursores.llegada, 0.05],
      ['fusion', (e) => e.precursores.fusion, 0.05],
      ['escala de osteoclastos', (e) => e.osteoclastos.escala, 0.05],
      ['festoneado', (e) => e.festoneado, 0.05],
      ['inversión', (e) => e.inversion, 0.05],
      ['cemento', (e) => e.lineaCemento, 0.05],
      ['cobertura de osteoblastos', (e) => e.osteoblastos.cobertura, 0.05],
      ['formación', (e) => e.avanceFormacion, 0.05],
      ['espesor', (e) => e.espesorOsteoide, 0.05],
      ['mineralización', (e) => e.fraccionMineralizada, 0.05],
      ['osteocitos', (e) => e.osteocitos.progreso, 0.3],
      ['luz', (e) => e.radioLumen, 0.05],
    ];
    for (const [nombre, f, maximo] of series) {
      expect(saltoMaximo(serie(f)), nombre).toBeLessThanOrEqual(maximo);
    }
  });

  it('la posición de cada osteoclasto es continua mientras existe (sin teletransportes)', () => {
    let anterior: number[] | null = null;
    for (const t of muestras) {
      const e = estadoBmu(t);
      if (e.osteoclastos.celulas.length === 0) {
        anterior = null;
        continue;
      }
      const xs = e.osteoclastos.celulas.map((c) => c.x);
      if (anterior) xs.forEach((x, k) => expect(Math.abs(x - anterior![k]!)).toBeLessThan(0.15));
      anterior = xs;
    }
  });
});

describe('estadoBmu: valores en t = 0, en cada hito y en t = 1', () => {
  it('t = 0: hueso en reposo, sin túnel, sin células activas y con revestimiento', () => {
    const e = estadoBmu(0);
    expect(e.fase).toBe('quiescencia');
    expect(e.frenteX).toBe(X_INICIO);
    expect(e.longitudTunel).toBe(0);
    expect(e.revestimiento).toBe(1);
    expect(e.precursores.cantidad).toBe(0);
    expect(e.osteoclastos.cantidad).toBe(0);
    expect(e.inversion).toBe(0);
    expect(e.lineaCemento).toBe(0);
    expect(e.osteoblastos.cobertura).toBe(0);
    expect(e.espesorOsteoide).toBe(0);
    expect(e.fraccionMineralizada).toBe(0);
    expect(e.osteocitos.cantidad).toBe(0);
    expect(e.radioLumen).toBe(R_CAVIDAD);
  });

  it('cada hito cae en su fase y las fases van en el orden del ciclo', () => {
    for (const fase of FASES_BMU) {
      expect(estadoBmu(HITOS_BMU[fase]).fase, fase).toBe(fase);
      expect(faseEnTiempo(HITOS_BMU[fase]).fase, fase).toBe(fase);
    }
    const fases = muestras.map((t) => FASES_BMU.indexOf(estadoBmu(t).fase));
    expect(esNoDecreciente(fases)).toBe(true);
    expect(new Set(fases).size).toBe(FASES_BMU.length);
  });

  it('los límites de las fases son los puntos medios entre hitos consecutivos', () => {
    expect(LIMITES_FASES_BMU).toHaveLength(FASES_BMU.length - 1);
    LIMITES_FASES_BMU.forEach((limite, i) => {
      const a = HITOS_BMU[FASES_BMU[i]!];
      const b = HITOS_BMU[FASES_BMU[i + 1]!];
      expect(limite).toBeCloseTo((a + b) / 2, 12);
    });
    // Justo antes y después de un límite cambia la fase.
    LIMITES_FASES_BMU.forEach((limite, i) => {
      expect(faseEnTiempo(limite - 1e-6).fase).toBe(FASES_BMU[i]);
      expect(faseEnTiempo(limite).fase).toBe(FASES_BMU[i + 1]);
    });
  });

  it('activación: llegan precursores y aún no hay túnel', () => {
    const e = estadoBmu(HITOS_BMU.activacion);
    expect(e.fase).toBe('activacion');
    expect(e.precursores.cantidad).toBeGreaterThan(0);
    expect(e.precursores.llegada).toBeGreaterThan(0.3);
    // Las células de revestimiento se retraen: ya cubren menos que en reposo.
    expect(e.revestimiento).toBeLessThan(0.5);
    expect(e.longitudTunel).toBe(0);
  });

  it('resorción: túnel a medio excavar y todos los osteoclastos en el frente', () => {
    const e = estadoBmu(HITOS_BMU.resorcion);
    expect(e.fase).toBe('resorcion');
    expect(e.osteoclastos.cantidad).toBe(N_OSTEOCLASTOS);
    expect(e.osteoclastos.celulas).toHaveLength(N_OSTEOCLASTOS);
    expect(e.longitudTunel).toBeGreaterThan(2);
    expect(e.longitudTunel).toBeLessThan(X_INICIO - X_FRENTE_FINAL - 2);
    expect(e.festoneado).toBeGreaterThan(0);
    expect(e.avanceFormacion).toBe(0);
    // Los osteoclastos van sobre el flanco del cono de corte, a la derecha de su punta.
    for (const c of e.osteoclastos.celulas) {
      expect(c.x).toBeGreaterThan(e.frenteX);
      expect(c.u).toBeGreaterThan(0);
      expect(c.u).toBeLessThan(1);
    }
  });

  it('inversión: sin osteoclastos, con células de inversión y línea de cemento', () => {
    const e = estadoBmu(HITOS_BMU.inversion);
    expect(e.fase).toBe('inversion');
    expect(e.osteoclastos.cantidad).toBe(0);
    expect(e.frenteX).toBeCloseTo(X_FRENTE_FINAL, 6);
    expect(e.inversion).toBe(1);
    expect(e.lineaCemento).toBeGreaterThan(0);
    expect(e.avanceFormacion).toBe(0);
  });

  it('formación: osteoblastos y osteoide a medias', () => {
    const e = estadoBmu(HITOS_BMU.formacion);
    expect(e.fase).toBe('formacion');
    expect(e.osteoblastos.cobertura).toBe(1);
    expect(e.avanceFormacion).toBeGreaterThan(0.2);
    expect(e.avanceFormacion).toBeLessThan(0.8);
    expect(e.espesorOsteoide).toBeGreaterThan(0.1);
    expect(e.radioLumen).toBeGreaterThan(R_LUMEN_FINAL);
    expect(e.radioLumen).toBeLessThan(R_CAVIDAD);
    expect(e.fraccionMineralizada).toBe(0);
    expect(e.lineaCemento).toBe(1);
  });

  it('mineralización: mineral a medias y osteocitos apareciendo', () => {
    const e = estadoBmu(HITOS_BMU.mineralizacion);
    expect(e.fase).toBe('mineralizacion');
    expect(e.avanceFormacion).toBe(1);
    expect(e.fraccionMineralizada).toBeGreaterThan(0.2);
    expect(e.fraccionMineralizada).toBeLessThan(1);
    expect(e.osteocitos.cantidad).toBeGreaterThanOrEqual(3);
    expect(e.osteocitos.cantidad).toBeLessThan(N_OSTEOCITOS);
  });

  it('t = 1: osteona nueva con el conducto estrechado, mineralizada y con todos sus osteocitos', () => {
    const e = estadoBmu(1);
    expect(e.fase).toBe('reposo');
    expect(e.avanceFormacion).toBe(1);
    expect(e.radioLumen).toBeCloseTo(R_LUMEN_FINAL, 12);
    expect(e.espesorOsteoide).toBeCloseTo(R_CAVIDAD - R_LUMEN_FINAL, 12);
    expect(e.fraccionMineralizada).toBe(1);
    expect(e.osteocitos.cantidad).toBe(N_OSTEOCITOS);
    expect(e.osteoclastos.cantidad).toBe(0);
    expect(e.inversion).toBe(0);
    expect(e.lineaCemento).toBe(1);
    expect(e.revestimiento).toBe(1);
    expect(e.osteoblastos.cobertura).toBeLessThan(0.2);
  });

  it('el conducto final es más estrecho que el túnel excavado y no más que el previo', () => {
    expect(R_LUMEN_FINAL).toBeLessThan(R_CAVIDAD);
    expect(R_LUMEN_FINAL).toBeGreaterThanOrEqual(R_CANAL - 1e-9);
  });
});

describe('estadoBmu: reversibilidad', () => {
  it('ir hasta el final y volver deja exactamente el mismo estado que al pasar la primera vez', () => {
    const ida = muestras.map((t) => JSON.stringify(estadoBmu(t)));
    const vuelta = [...muestras]
      .reverse()
      .map((t) => JSON.stringify(estadoBmu(t)))
      .reverse();
    expect(vuelta).toEqual(ida);
  });

  it('saltar directamente a un instante equivale a llegar a él paso a paso', () => {
    const directo = estadoBmu(0.7333);
    // Recorrer todo antes no cambia nada: no hay estado acumulado.
    for (const t of muestras) estadoBmu(t);
    expect(estadoBmu(0.7333)).toEqual(directo);
  });
});

describe('perfil del túnel a lo largo de x', () => {
  const sinExcavar = { frenteX: X_INICIO };
  const excavado = { frenteX: X_FRENTE_FINAL };

  it('sin excavar, todo el conducto tiene el radio del canal previo', () => {
    for (let x = -LARGO / 2; x <= LARGO / 2; x += 0.1) {
      expect(radioExcavado(x, sinExcavar)).toBeCloseTo(R_CANAL, 12);
    }
  });

  it('con la resorción terminada, el cono de corte crece de la punta (canal) al radio pleno del túnel', () => {
    expect(radioExcavado(X_FRENTE_FINAL, excavado)).toBeCloseTo(R_CANAL, 12);
    expect(radioExcavado(-LARGO / 2, excavado)).toBeCloseTo(R_CANAL, 12);
    expect(radioExcavado(0, excavado)).toBeCloseTo(R_CAVIDAD, 12);
    expect(radioExcavado(LARGO / 2, excavado)).toBeCloseTo(R_CAVIDAD, 12);
    // Entre la punta y el radio pleno crece sin bajar nunca.
    let previo = 0;
    for (let x = X_FRENTE_FINAL; x <= LARGO / 2; x += 0.02) {
      const r = radioExcavado(x, excavado);
      expect(r).toBeGreaterThanOrEqual(previo - 1e-12);
      previo = r;
    }
  });

  it('el túnel solo se ensancha con el tiempo en cada x', () => {
    for (const x of [-3, -1, 0, 2, 4.5]) {
      const radios = muestras.map((t) => radioExcavado(x, estadoBmu(t)));
      expect(esNoDecreciente(radios), `x = ${x}`).toBe(true);
    }
  });

  it('el cierre sigue a la BMU: en mitad de la formación la cabecera está más cerrada que el extremo del cono', () => {
    const e = estadoBmu(HITOS_BMU.formacion);
    const cerca = espesorEn(3, e) / Math.max(1e-9, radioExcavado(3, e) - R_LUMEN_FINAL);
    const lejos = espesorEn(-2, e) / Math.max(1e-9, radioExcavado(-2, e) - R_LUMEN_FINAL);
    expect(cerca).toBeGreaterThan(lejos);
    expect(radioLumenEn(3, e)).toBeLessThan(radioLumenEn(-2, e));
  });

  it('el avance local del relleno va de 0 a 1 y solo crece con el avance de la formación', () => {
    expect(posicionEnTunel(X_INICIO)).toBe(0);
    expect(posicionEnTunel(X_FRENTE_FINAL)).toBe(1);
    for (const x of [X_INICIO, 2, 0, -2, X_FRENTE_FINAL]) {
      expect(avanceLocalFormacion(x, 0)).toBe(0);
      expect(avanceLocalFormacion(x, 1)).toBe(1);
      let previo = 0;
      for (let a = 0; a <= 1; a += 0.01) {
        const v = avanceLocalFormacion(x, a);
        expect(v).toBeGreaterThanOrEqual(previo - 1e-12);
        previo = v;
      }
    }
  });

  it('la luz nunca es menor que el conducto final ni mayor que la cavidad', () => {
    for (const t of muestras.filter((_, i) => i % 20 === 0)) {
      const e = estadoBmu(t);
      for (let x = -LARGO / 2; x <= LARGO / 2; x += 0.3) {
        const r = radioLumenEn(x, e);
        expect(r).toBeGreaterThanOrEqual(R_CANAL - 1e-9);
        expect(r).toBeLessThanOrEqual(R_CAVIDAD + 1e-9);
      }
    }
  });
});
