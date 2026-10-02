/**
 * Pruebas de la disposición de las piezas repetidas de la escena de la vesícula: deterministas, dentro de sus
 * límites y coherentes con el estado (enzimas colgando de la membrana, fibrillas con su bandeo, placas en los
 * huecos, proteínas en la membrana de la vesícula, iones que entran por sus canales, racimo que sale de la
 * vesícula, vecinas apoyadas en sus fibrillas y pirofosfato sobre las caras de las placas).
 */
import { describe, expect, it } from 'vitest';
import {
  ALCANCE_PROPAGACION,
  N_ENZIMAS,
  N_HIDROLISIS,
  N_PPI_CRISTALES,
  N_PPI_ENPP1,
  R_ACUMULACION,
  R_NUCLEACION,
  alturaMembrana,
  corteDePpi,
  crecimientoDePlaca,
  cristalesDeFibrillas,
  cristalesDeVecinas,
  cristalesDeVesicula,
  direccion,
  enzimasDeMembrana,
  fibrillasDelOsteoide,
  girarY,
  ionesDeVesicula,
  largoDeCristal,
  posicionDeIon,
  ppiJuntoAEnpp1,
  ppiSobreCristales,
  ppiSobreRacimo,
  proteinasDeVesicula,
  puntoDeContacto,
  puntoDeFibrilla,
  puntoDeGemacion,
  segmentosDeBandeo,
  sitiosDeHidrolisis,
  vesiculasVecinas,
} from './disposicion';
import {
  DIRECCION_NUCLEACION,
  FRACCION_HUECO,
  LARGO_FIBRILLA,
  MEMBRANA,
  N_CRISTALES_VESICULA,
  N_FIBRILLAS,
  N_IONES,
  N_VESICULAS_VECINAS,
  PERIODO_D,
  R_FIBRILLA,
  R_VESICULA,
  X_VESICULA,
  Y_VESICULA_FINAL,
  Z_VESICULA,
} from './estado';

const norma = (v: readonly number[]) => Math.hypot(v[0]!, v[1]!, v[2]!);

describe('membrana del osteoblasto y enzimas', () => {
  it('la membrana ondula alrededor de su altura media sin pasarse de la amplitud', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let x = -MEMBRANA.ancho / 2; x <= MEMBRANA.ancho / 2; x += 0.1) {
      for (let z = -MEMBRANA.fondo / 2; z <= MEMBRANA.fondo / 2; z += 0.1) {
        const y = alturaMembrana(x, z);
        min = Math.min(min, y);
        max = Math.max(max, y);
      }
    }
    expect(min).toBeGreaterThanOrEqual(MEMBRANA.y - MEMBRANA.amplitud - 1e-9);
    expect(max).toBeLessThanOrEqual(MEMBRANA.y + MEMBRANA.amplitud + 1e-9);
    expect(max - min).toBeGreaterThan(MEMBRANA.amplitud);
  });

  it('el punto de gemación está sobre la vesícula, en la membrana', () => {
    const [x, y, z] = puntoDeGemacion();
    expect(x).toBe(X_VESICULA);
    expect(z).toBe(Z_VESICULA);
    expect(y).toBeCloseTo(alturaMembrana(X_VESICULA, Z_VESICULA), 9);
  });

  it('las enzimas son deterministas, del número pedido, cuelgan de la cara externa y dejan libre la gemación', () => {
    const enzimas = enzimasDeMembrana();
    expect(enzimasDeMembrana()).toEqual(enzimas);
    for (const tipo of ['tnap', 'enpp1', 'ank'] as const) {
      expect(enzimas.filter((e) => e.tipo === tipo)).toHaveLength(N_ENZIMAS[tipo]);
    }
    for (const e of enzimas) {
      expect(e.y + e.sy / 2).toBeLessThan(alturaMembrana(e.x, e.z));
      expect(Math.abs(e.x)).toBeLessThan(MEMBRANA.ancho / 2);
      expect(Math.abs(e.z)).toBeLessThan(MEMBRANA.fondo / 2);
      expect(Math.hypot(e.x - X_VESICULA, e.z - Z_VESICULA)).toBeGreaterThan(R_VESICULA);
    }
  });

  it('los sitios de hidrólisis están bajo TNAP y las PPi de ENPP1 bajo ENPP1', () => {
    const enzimas = enzimasDeMembrana();
    const sitios = sitiosDeHidrolisis(enzimas);
    expect(sitios).toHaveLength(N_HIDROLISIS);
    for (const s of sitios) {
      const tnap = enzimas.find((e) => e.tipo === 'tnap' && e.x === s.x && e.z === s.z);
      expect(tnap).toBeDefined();
      expect(s.y).toBeLessThan(tnap!.y);
    }
    expect(ppiJuntoAEnpp1(enzimas)).toHaveLength(N_PPI_ENPP1);
    for (const p of ppiJuntoAEnpp1(enzimas)) expect(p.y).toBeLessThan(alturaMembrana(p.x, p.z));
  });

  it('el corte de PPi separa los fosfatos y los vuelve fosfato libre solo cuando avanza', () => {
    expect(corteDePpi(0)).toEqual({ separacion: 0.05, libre: 0 });
    expect(corteDePpi(1).separacion).toBeCloseTo(0.3, 9);
    expect(corteDePpi(1).libre).toBe(1);
    expect(corteDePpi(0.2).libre).toBe(0);
    expect(corteDePpi(0.6).separacion).toBeGreaterThan(corteDePpi(0.3).separacion);
  });
});

describe('fibrillas y bandeo', () => {
  it('hay N_FIBRILLAS, la primera es la anfitriona y ninguna se toca con otra', () => {
    const fibrillas = fibrillasDelOsteoide();
    expect(fibrillas).toHaveLength(N_FIBRILLAS);
    expect(fibrillas[0]!.anfitriona).toBe(true);
    expect(fibrillas.filter((f) => f.anfitriona)).toHaveLength(1);
    for (let i = 0; i < fibrillas.length; i++) {
      for (let j = i + 1; j < fibrillas.length; j++) {
        const a = fibrillas[i]!;
        const b = fibrillas[j]!;
        expect(Math.hypot(a.y - b.y, a.z - b.z)).toBeGreaterThan(2 * R_FIBRILLA);
      }
    }
    // Todas por debajo de la vesícula apoyada.
    for (const f of fibrillas)
      expect(f.y + R_FIBRILLA).toBeLessThanOrEqual(Y_VESICULA_FINAL - R_VESICULA + 1e-9);
  });

  it('el bandeo alterna hueco y solapamiento con las proporciones del periodo D y cubre toda la fibrilla', () => {
    const segmentos = segmentosDeBandeo();
    expect(segmentos.length).toBeGreaterThan(20);
    let total = 0;
    for (let i = 0; i < segmentos.length; i++) {
      const s = segmentos[i]!;
      total += s.largo;
      expect(Math.abs(s.s) + s.largo / 2).toBeLessThanOrEqual(LARGO_FIBRILLA / 2 + 1e-9);
      if (i > 0) expect(s.hueco).not.toBe(segmentos[i - 1]!.hueco);
    }
    expect(total).toBeCloseTo(LARGO_FIBRILLA, 6);
    const enteros = segmentos.filter((s) => Math.abs(s.s) < LARGO_FIBRILLA / 2 - PERIODO_D);
    for (const s of enteros) {
      expect(s.largo).toBeCloseTo(PERIODO_D * (s.hueco ? FRACCION_HUECO : 1 - FRACCION_HUECO), 9);
    }
  });

  it('puntoDeFibrilla queda a la distancia pedida del eje y sigue el giro de la fibrilla', () => {
    const f = { x: 1, y: -2, z: 0.5, yaw: 0.3, anfitriona: false };
    const p = puntoDeFibrilla(f, 2, 0.7, 0.4);
    const eje = girarY([2, 0, 0], f.yaw);
    const dx = p[0] - f.x - eje[0];
    const dy = p[1] - f.y - eje[1];
    const dz = p[2] - f.z - eje[2];
    expect(Math.hypot(dx, dy, dz)).toBeCloseTo(0.4, 9);
    expect(norma(direccion(30, 45))).toBeCloseTo(1, 9);
  });

  it('el punto de contacto es donde la vesícula apoyada toca a la anfitriona', () => {
    const [x, y, z] = puntoDeContacto();
    expect(x).toBe(X_VESICULA);
    expect(z).toBe(Z_VESICULA);
    expect(y).toBeCloseTo(Y_VESICULA_FINAL - R_VESICULA, 9);
  });
});

describe('cristales sobre las fibrillas', () => {
  const cristales = cristalesDeFibrillas();

  it('son deterministas, muchos, pegados a la superficie de alguna fibrilla y con distancia finita', () => {
    expect(cristalesDeFibrillas()).toEqual(cristales);
    expect(cristales.length).toBeGreaterThan(150);
    const fibrillas = fibrillasDelOsteoide();
    for (const c of cristales) {
      const distanciaAlEje = Math.min(
        ...fibrillas.map((f) => {
          // Distancia del punto al eje de la fibrilla (recta por su centro con dirección girada).
          const d = girarY([1, 0, 0], f.yaw);
          const vx = c.x - f.x;
          const vy = c.y - f.y;
          const vz = c.z - f.z;
          const a = vx * d[0] + vy * d[1] + vz * d[2];
          return Math.hypot(vx - a * d[0], vy - a * d[1], vz - a * d[2]);
        }),
      );
      expect(distanciaAlEje).toBeCloseTo(R_FIBRILLA, 1);
      expect(Number.isFinite(c.distancia)).toBe(true);
      expect(c.escala).toBeGreaterThan(0.7);
    }
  });

  it('las placas más cercanas a la vesícula crecen antes; con propagación completa crecen todas', () => {
    expect(crecimientoDePlaca(0, 0)).toBe(0);
    expect(crecimientoDePlaca(0, 0.3)).toBeGreaterThan(crecimientoDePlaca(3, 0.3));
    expect(crecimientoDePlaca(ALCANCE_PROPAGACION, 0.6)).toBe(0);
    for (const c of cristales) expect(crecimientoDePlaca(c.distancia, 1)).toBe(1);
  });
});

describe('proteínas de la membrana de la vesícula', () => {
  it('canales y transportadores atraviesan la membrana, TNAP queda fuera y PHOSPHO1 dentro', () => {
    const proteinas = proteinasDeVesicula();
    expect(proteinas.filter((p) => p.tipo === 'anexina').length).toBeGreaterThanOrEqual(4);
    for (const p of proteinas) {
      expect(norma(p.dir)).toBeCloseTo(1, 9);
      expect(p.frente).toBe(p.dir[2] > 0);
      if (p.tipo === 'anexina' || p.tipo === 'pit') expect(p.radio).toBe(1);
      if (p.tipo === 'tnap') expect(p.radio).toBeGreaterThan(1);
      if (p.tipo === 'phospho1') expect(p.radio).toBeLessThan(0.8);
    }
    // Ninguna en el sitio de nucleación (así los iones cruzan el lumen).
    for (const p of proteinas) {
      const coseno =
        p.dir[0] * DIRECCION_NUCLEACION[0] +
        p.dir[1] * DIRECCION_NUCLEACION[1] +
        p.dir[2] * DIRECCION_NUCLEACION[2];
      expect(coseno).toBeLessThan(0.8);
    }
  });
});

describe('iones y su camino', () => {
  const iones = ionesDeVesicula();

  it('son deterministas y del número pedido; el calcio arranca fuera y pasa por una anexina', () => {
    expect(ionesDeVesicula()).toEqual(iones);
    expect(iones.filter((i) => i.tipo === 'calcio')).toHaveLength(N_IONES.calcio);
    expect(iones.filter((i) => i.tipo === 'fosfato')).toHaveLength(N_IONES.fosfato);
    const anexinas = proteinasDeVesicula().filter((p) => p.tipo === 'anexina');
    for (const ion of iones.filter((i) => i.tipo === 'calcio')) {
      expect(norma(ion.origen)).toBeGreaterThan(1.3);
      expect(norma(ion.paso)).toBeCloseTo(1, 9);
      expect(
        anexinas.some(
          (a) => Math.abs(a.dir[0] - ion.paso[0]) < 1e-9 && Math.abs(a.dir[1] - ion.paso[1]) < 1e-9,
        ),
      ).toBe(true);
    }
  });

  it('la mitad del fosfato entra por PiT desde fuera y la otra mitad nace dentro, junto a PHOSPHO1', () => {
    const fosfatos = iones.filter((i) => i.tipo === 'fosfato');
    const desdeFuera = fosfatos.filter((i) => norma(i.origen) > 1.3);
    const desdeDentro = fosfatos.filter((i) => norma(i.origen) < 0.8);
    expect(desdeFuera.length + desdeDentro.length).toBe(fosfatos.length);
    expect(desdeFuera).toHaveLength(N_IONES.fosfato / 2);
    for (const ion of desdeDentro) expect(ion.origen).toEqual(ion.paso);
  });

  it('todos los destinos están en la cara interna, sesgados al sitio de nucleación, con retardos acotados', () => {
    for (const ion of iones) {
      expect(norma(ion.destino)).toBeCloseTo(R_ACUMULACION, 9);
      expect(ion.retardo).toBeGreaterThanOrEqual(0);
      expect(ion.retardo).toBeLessThan(0.56);
    }
    const media = iones.reduce(
      (s, i) => [s[0] + i.destino[0], s[1] + i.destino[1], s[2] + i.destino[2]],
      [0, 0, 0],
    );
    const n = norma(media) || 1;
    const coseno =
      (media[0] * DIRECCION_NUCLEACION[0] +
        media[1] * DIRECCION_NUCLEACION[1] +
        media[2] * DIRECCION_NUCLEACION[2]) /
      n;
    expect(coseno).toBeGreaterThan(0.85);
  });

  it('posicionDeIon: en el origen sin entrada, en el destino con la entrada completa y en el núcleo con el cúmulo', () => {
    for (const ion of iones) {
      expect(posicionDeIon(ion, 0, 0)).toEqual(ion.origen);
      const dentro = posicionDeIon(ion, 1, 0);
      dentro.forEach((v, k) => expect(v).toBeCloseTo(ion.destino[k]!, 9));
      const apretado = posicionDeIon(ion, 1, 1);
      expect(norma(apretado)).toBeLessThan(R_ACUMULACION);
      expect(norma(apretado)).toBeGreaterThan(R_NUCLEACION - 0.35);
      // Cerca del núcleo: a menos de 0,35 radios del sitio de nucleación.
      const sitio = DIRECCION_NUCLEACION.map((d) => d * R_NUCLEACION);
      expect(
        Math.hypot(apretado[0] - sitio[0]!, apretado[1] - sitio[1]!, apretado[2] - sitio[2]!),
      ).toBeLessThan(0.35);
    }
  });

  it('posicionDeIon es continua y pasa por el canal a mitad de camino', () => {
    const ion = iones[0]!;
    let anterior = posicionDeIon(ion, 0, 0);
    for (let e = 0.001; e <= 1; e += 0.001) {
      const actual = posicionDeIon(ion, e, 0);
      expect(
        Math.hypot(actual[0] - anterior[0], actual[1] - anterior[1], actual[2] - anterior[2]),
      ).toBeLessThan(0.05);
      anterior = actual;
    }
    const medio = posicionDeIon(ion, ion.retardo + 0.225, 0);
    medio.forEach((v, k) => expect(v).toBeCloseTo(ion.paso[k]!, 6));
  });
});

describe('racimo de cristales de la vesícula', () => {
  const racimo = cristalesDeVesicula();

  it('es determinista, anclado en la cara interna, con direcciones y normales unitarias y perpendiculares', () => {
    expect(cristalesDeVesicula()).toEqual(racimo);
    expect(racimo).toHaveLength(N_CRISTALES_VESICULA);
    for (const c of racimo) {
      expect(norma(c.anclaje)).toBeLessThan(1);
      expect(norma(c.anclaje)).toBeGreaterThan(R_NUCLEACION - 0.1);
      expect(norma(c.dir)).toBeCloseTo(1, 9);
      expect(norma(c.normal)).toBeCloseTo(1, 9);
      expect(c.dir[0] * c.normal[0] + c.dir[1] * c.normal[1] + c.dir[2] * c.normal[2]).toBeCloseTo(
        0,
        9,
      );
      // Todas crecen hacia fuera (alejándose del centro).
      expect(
        c.dir[0] * c.anclaje[0] + c.dir[1] * c.anclaje[1] + c.dir[2] * c.anclaje[2],
      ).toBeGreaterThan(0);
    }
    expect(racimo[0]!.dir).toEqual([...DIRECCION_NUCLEACION]);
  });

  it('el primer cristal crece antes que el resto y, con la ruptura, todos sobresalen de la membrana', () => {
    expect(largoDeCristal(0, 0, 0)).toBe(0);
    expect(largoDeCristal(1, 0.5, 0)).toBe(0);
    expect(largoDeCristal(0, 0.5, 0)).toBeGreaterThan(0);
    expect(largoDeCristal(0, 1, 0)).toBeLessThan(1 - R_NUCLEACION + 0.05);
    for (let i = 0; i < N_CRISTALES_VESICULA; i++) {
      const c = racimo[i]!;
      const largo = largoDeCristal(i, 1, 1);
      const punta = c.anclaje.map((a, k) => a + c.dir[k]! * largo);
      expect(norma(punta)).toBeGreaterThan(1.1);
    }
  });
});

describe('vesículas vecinas', () => {
  const vecinas = vesiculasVecinas();

  it('están apoyadas sobre una fibrilla, lejos de la vesícula principal y no se solapan', () => {
    expect(vecinas).toHaveLength(N_VESICULAS_VECINAS);
    const fibrillas = fibrillasDelOsteoide();
    for (const v of vecinas) {
      const apoyo = fibrillas.some((f) => {
        const d = girarY([1, 0, 0], f.yaw);
        const vx = v.x - f.x;
        const vy = v.y - f.y;
        const vz = v.z - f.z;
        const a = vx * d[0] + vy * d[1] + vz * d[2];
        const distancia = Math.hypot(vx - a * d[0], vy - a * d[1], vz - a * d[2]);
        return Math.abs(distancia - (R_FIBRILLA + v.radio)) < 1e-6;
      });
      expect(apoyo).toBe(true);
      expect(
        Math.hypot(v.x - X_VESICULA, v.y - Y_VESICULA_FINAL, v.z - Z_VESICULA),
      ).toBeGreaterThan(R_VESICULA + v.radio);
    }
    for (let i = 0; i < vecinas.length; i++) {
      for (let j = i + 1; j < vecinas.length; j++) {
        const a = vecinas[i]!;
        const b = vecinas[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan(a.radio + b.radio);
      }
    }
  });

  it('cada vecina tiene cuatro cristales que salen hacia abajo y sobresalen de ella', () => {
    const cristales = cristalesDeVecinas(vecinas);
    expect(cristales).toHaveLength(4 * vecinas.length);
    for (const c of cristales) {
      const v = vecinas[c.vesicula]!;
      expect(norma(c.dir)).toBeCloseTo(1, 9);
      expect(c.dir[1]).toBeLessThan(0);
      const punta = [
        c.anclaje[0] + c.dir[0] * c.largo,
        c.anclaje[1] + c.dir[1] * c.largo,
        c.anclaje[2] + c.dir[2] * c.largo,
      ];
      expect(Math.hypot(punta[0]! - v.x, punta[1]! - v.y, punta[2]! - v.z)).toBeGreaterThan(
        v.radio,
      );
    }
  });
});

describe('pirofosfato', () => {
  it('se pega a la cara externa de las placas cercanas a la vesícula', () => {
    const cristales = cristalesDeFibrillas();
    const ppi = ppiSobreCristales(cristales);
    expect(ppi).toHaveLength(N_PPI_CRISTALES);
    const [cx, cy, cz] = puntoDeContacto();
    for (const p of ppi) {
      expect(Math.hypot(p.x - cx, p.y - cy, p.z - cz)).toBeLessThan(2.8);
      const cercano = Math.min(
        ...cristales.map((c) => Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z)),
      );
      expect(cercano).toBeLessThan(0.08);
    }
  });

  it('sobre el racimo hay cinco, junto a una placa y fuera del centro', () => {
    const ppi = ppiSobreRacimo();
    expect(ppi).toHaveLength(5);
    for (const p of ppi) {
      expect(norma([p.x, p.y, p.z])).toBeGreaterThan(R_NUCLEACION);
      expect(norma(p.dir)).toBeCloseTo(1, 9);
    }
  });
});
