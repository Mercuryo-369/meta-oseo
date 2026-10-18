/**
 * Realismo compartido de las escenas procedurales: materiales orgánicos y relieve de superficie hecho por
 * código (sin descargar imágenes).
 *
 *  - Texturas de relieve: ruido fractal periódico (se repite sin costuras) calculado en la CPU una sola vez
 *    y guardado como `DataTexture` de 256 × 256. Dos patrones: `poros` (hueso: grano fino con pequeñas
 *    depresiones, como la superficie de un hueso real) y `fibras` (membranas y tejido fibroso: vetas
 *    alargadas). Se usan como mapa de relieve (`bumpMap`) y de rugosidad, así que necesitan UV: las
 *    geometrías de three (cilindros, esferas, toros, tornos) los traen.
 *  - `materialOrganico(color, tipo)`: `MeshPhysicalMaterial` con los ajustes de cada tejido (hueso mate y
 *    poroso, cartílago liso y húmedo, médula grasa y brillante, membrana fibrosa con brillo de terciopelo,
 *    célula con brillo húmedo suave). Brilla de verdad cuando la escena tiene luz de entorno
 *    (`EntornoRealista.vue`).
 *
 * Coste en el móvil: sin transmisión ni refracción (lo caro); el `sheen` y el `clearcoat` añaden unas pocas
 * operaciones por píxel. Las texturas pesan 256 KB cada una en memoria de vídeo y se comparten.
 */
import type {
  Material,
  MeshPhysicalMaterialParameters,
  WebGLProgramParametersWithUniforms,
} from 'three';
import {
  DataTexture,
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshPhysicalMaterial,
  RGBAFormat,
  RepeatWrapping,
  UnsignedByteType,
} from 'three';

/* ----- Ruido periódico (puro, determinista) ----- */

const LADO = 256;

/** Generador congruencial: el mismo relieve en todas las cargas y en las pruebas. */
function aleatorio(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Rejilla periódica de `nx × ny` valores aleatorios. */
function rejilla(nx: number, ny: number, azar: () => number): Float32Array {
  const r = new Float32Array(nx * ny);
  for (let i = 0; i < r.length; i++) r[i] = azar();
  return r;
}

const suave = (t: number): number => t * t * (3 - 2 * t);

/** Ruido de valor periódico en [0, 1): `x` en [0, nx) celdas e `y` en [0, ny) (se repite en cada eje). */
function ruidoValor(r: Float32Array, nx: number, ny: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = suave(x - x0);
  const fy = suave(y - y0);
  const i0 = ((x0 % nx) + nx) % nx;
  const j0 = ((y0 % ny) + ny) % ny;
  const i1 = (i0 + 1) % nx;
  const j1 = (j0 + 1) % ny;
  const a = r[j0 * nx + i0]!;
  const b = r[j0 * nx + i1]!;
  const c = r[j1 * nx + i0]!;
  const d = r[j1 * nx + i1]!;
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/**
 * Ruido fractal (fBm) periódico sobre la textura: `escalaX` y `escalaY` son las celdas de la primera octava
 * a lo ancho y a lo alto (distintas = vetas alargadas). Devuelve valores normalizados a [0, 1].
 */
export function ruidoFractal(
  semilla: number,
  escalaX: number,
  escalaY: number,
  octavas = 4,
): Float32Array {
  const azar = aleatorio(semilla);
  const capas = Array.from({ length: octavas }, (_, o) => {
    const nx = escalaX * 2 ** o;
    const ny = escalaY * 2 ** o;
    return { nx, ny, r: rejilla(nx, ny, azar) };
  });
  const salida = new Float32Array(LADO * LADO);
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < LADO; j++) {
    for (let i = 0; i < LADO; i++) {
      let v = 0;
      let amplitud = 0.5;
      for (const c of capas) {
        v += amplitud * ruidoValor(c.r, c.nx, c.ny, (i / LADO) * c.nx, (j / LADO) * c.ny);
        amplitud *= 0.5;
      }
      salida[j * LADO + i] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  const rango = max - min || 1;
  for (let k = 0; k < salida.length; k++) salida[k] = (salida[k]! - min) / rango;
  return salida;
}

/** Pequeñas depresiones (poros) repartidas al azar, con vuelta en los bordes (sin costura). */
function poros(base: Float32Array, semilla: number, cuantos: number): Float32Array {
  const azar = aleatorio(semilla);
  const salida = Float32Array.from(base, (v) => 0.35 + 0.65 * v);
  for (let p = 0; p < cuantos; p++) {
    const cx = azar() * LADO;
    const cy = azar() * LADO;
    const radio = 0.8 + azar() * 2.2;
    const hondura = 0.35 + azar() * 0.45;
    const alcance = Math.ceil(radio * 2);
    for (let dy = -alcance; dy <= alcance; dy++) {
      for (let dx = -alcance; dx <= alcance; dx++) {
        const d2 = (dx * dx + dy * dy) / (radio * radio);
        if (d2 > 4) continue;
        const i = (((Math.round(cx) + dx) % LADO) + LADO) % LADO;
        const j = (((Math.round(cy) + dy) % LADO) + LADO) % LADO;
        const k = j * LADO + i;
        salida[k] = salida[k]! * (1 - hondura * Math.exp(-d2 * 1.6));
      }
    }
  }
  return salida;
}

/**
 * Hueso esponjoso visto en un corte: una red de tabiques (las trabéculas) alrededor de huecos (los espacios de la
 * médula). Ruido celular periódico de `n × n` celdas con un punto al azar en cada una: donde las distancias a los
 * dos puntos más cercanos casi coinciden (F2 − F1 pequeño) hay un tabique; en el resto, un hueco. Un poco de ruido
 * fractal hace que los tabiques no sean todos igual de gruesos.
 */
function celdas(semilla: number, n: number): Float32Array {
  const azar = aleatorio(semilla);
  const puntos = Array.from({ length: n * n }, () => [azar(), azar()] as const);
  const variacion = ruidoFractal(semilla + 1, 6, 6, 3);
  const salida = new Float32Array(LADO * LADO);
  for (let j = 0; j < LADO; j++) {
    for (let i = 0; i < LADO; i++) {
      const px = (i / LADO) * n;
      const py = (j / LADO) * n;
      const cx = Math.floor(px);
      const cy = Math.floor(py);
      let f1 = Infinity;
      let f2 = Infinity;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const gx = cx + dx;
          const gy = cy + dy;
          const p = puntos[(((gy % n) + n) % n) * n + (((gx % n) + n) % n)]!;
          const d = Math.hypot(px - (gx + p[0]), py - (gy + p[1]));
          if (d < f1) {
            f2 = f1;
            f1 = d;
          } else if (d < f2) {
            f2 = d;
          }
        }
      }
      const k = j * LADO + i;
      // Grosor del tabique entre 0,12 y 0,3 celdas, según el ruido.
      const grosor = 0.12 + 0.18 * variacion[k]!;
      const tabique = 1 - suave(Math.min(1, (f2 - f1) / grosor));
      salida[k] = 0.08 + 0.92 * tabique;
    }
  }
  return salida;
}

/** Rugosidad relativa en el fondo de un poro (1 en las crestas): ver `aTextura`. */
export const RUGOSIDAD_MINIMA_RELIEVE = 0.78;

/**
 * Textura de relieve: la altura va en los canales R y B (el relieve, `bumpMap`, lee R, y el triplanar también) y en
 * G un factor de rugosidad derivado de ella, entre `RUGOSIDAD_MINIMA_RELIEVE` en el fondo de los poros y 1 en las
 * crestas (`roughnessMap` lee G y MULTIPLICA la rugosidad del material). Antes G era la propia altura: la
 * rugosidad de cada tejido quedaba de media en la mitad de la de su ajuste, y el fondo de los poros brillaba
 * casi como un espejo (aspecto de plástico).
 */
function aTextura(valores: Float32Array, nombre: string): DataTexture {
  const datos = new Uint8Array(LADO * LADO * 4);
  for (let k = 0; k < valores.length; k++) {
    const h = Math.max(0, Math.min(1, valores[k]!));
    const v = Math.round(h * 255);
    datos[k * 4] = v;
    datos[k * 4 + 1] = Math.round((1 - (1 - RUGOSIDAD_MINIMA_RELIEVE) * (1 - h)) * 255);
    datos[k * 4 + 2] = v;
    datos[k * 4 + 3] = 255;
  }
  const textura = new DataTexture(datos, LADO, LADO, RGBAFormat, UnsignedByteType);
  textura.name = nombre;
  textura.wrapS = RepeatWrapping;
  textura.wrapT = RepeatWrapping;
  textura.magFilter = LinearFilter;
  textura.minFilter = LinearMipmapLinearFilter;
  textura.generateMipmaps = true;
  // Filtrado anisótropo: el grano no se emborrona en las superficies que se ven de canto (three lo acota al
  // máximo del dispositivo; los clones lo heredan).
  textura.anisotropy = 4;
  textura.needsUpdate = true;
  return textura;
}

export type PatronRelieve = 'poros' | 'fibras' | 'grumos' | 'celdas';

const PATRONES: Record<PatronRelieve, () => Float32Array> = {
  poros: () => poros(ruidoFractal(11, 8, 8, 5), 29, 900),
  fibras: () => ruidoFractal(17, 32, 3, 4),
  grumos: () => ruidoFractal(23, 5, 5, 4),
  celdas: () => celdas(31, 10),
};
const texturas = new Map<PatronRelieve, DataTexture>();

/** Textura de relieve compartida (se calcula la primera vez que se pide). */
export function texturaRelieve(patron: PatronRelieve): DataTexture {
  let t = texturas.get(patron);
  if (!t) {
    t = aTextura(PATRONES[patron](), `relieve_${patron}`);
    texturas.set(patron, t);
  }
  return t;
}

/* ----- Materiales ----- */

export type TipoTejido =
  | 'hueso'
  | 'hueso_esponjoso'
  | 'cartilago'
  | 'medula'
  | 'membrana'
  | 'celula'
  | 'vaso'
  | 'cavidad'
  | 'fibra'
  | 'cristal'
  | 'molecula'
  | 'hueso_inmaduro'
  | 'nucleo'
  | 'organulo'
  | 'esmalte'
  | 'dentina'
  | 'encia'
  | 'coagulo'
  | 'mesenquima'
  | 'nervio'
  | 'liquido'
  | 'hueso_trabecular';

interface AjusteTejido {
  roughness: number;
  patron?: PatronRelieve;
  /** Intensidad del relieve. */
  relieve?: number;
  /** Repeticiones de la textura a lo ancho y a lo alto de las UV. */
  repetir?: [number, number];
  sheen?: number;
  sheenRoughness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  /**
   * Variación del color con el relieve (0 a 0,3): el fondo de los poros y de los grumos algo más oscuro y las
   * crestas algo más claras. Ningún tejido real es de un tono uniforme; sin esto, el color plano delata el 3D.
   */
  motas?: number;
}

const AJUSTES: Record<TipoTejido, AjusteTejido> = {
  // Hueso compacto: mate, granuloso y con poros vasculares.
  hueso: {
    roughness: 0.78,
    patron: 'poros',
    relieve: 0.9,
    repetir: [6, 10],
    motas: 0.22,
    clearcoat: 0.08,
    clearcoatRoughness: 0.7,
  },
  hueso_esponjoso: { roughness: 0.82, patron: 'grumos', relieve: 0.6, repetir: [2, 6], motas: 0.2 },
  // Cartílago hialino: liso, húmedo, algo brillante.
  cartilago: {
    roughness: 0.32,
    patron: 'grumos',
    relieve: 0.15,
    repetir: [3, 3],
    motas: 0.08,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
  },
  // Médula: grasa húmeda, brillo suave.
  medula: {
    roughness: 0.42,
    patron: 'grumos',
    relieve: 0.5,
    repetir: [4, 8],
    motas: 0.2,
    clearcoat: 0.2,
    clearcoatRoughness: 0.4,
  },
  // Membranas fibrosas (periostio, ligamento): vetas y brillo de terciopelo.
  membrana: {
    roughness: 0.7,
    patron: 'fibras',
    relieve: 0.7,
    repetir: [4, 2],
    motas: 0.15,
    sheen: 0.6,
    sheenRoughness: 0.5,
  },
  // Células: superficie blanda y húmeda.
  celula: {
    roughness: 0.45,
    patron: 'grumos',
    relieve: 0.25,
    repetir: [2, 2],
    motas: 0.1,
    sheen: 0.35,
    sheenRoughness: 0.4,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
  },
  // Vasos: pared lisa y húmeda.
  vaso: { roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.2 },
  // Cavidades (lagunas, conductos): oscuras y sin brillo.
  cavidad: { roughness: 0.9 },
  // Fibras de colágeno: estrías a lo largo (las fibrillas que la forman) y brillo sedoso.
  fibra: {
    roughness: 0.55,
    patron: 'fibras',
    relieve: 0.5,
    repetir: [1, 6],
    motas: 0.12,
    sheen: 0.45,
    sheenRoughness: 0.45,
  },
  // Cristal mineral (hidroxiapatita): liso y con brillo vítreo.
  cristal: { roughness: 0.18, clearcoat: 0.9, clearcoatRoughness: 0.1 },
  // Moléculas (escala nanométrica): superficie lisa, algo satinada; sin relieve.
  molecula: {
    roughness: 0.5,
    sheen: 0.2,
    sheenRoughness: 0.5,
    clearcoat: 0.2,
    clearcoatRoughness: 0.4,
  },
  // Hueso inmaduro (entretejido, fetal o de reparación): más poroso y vascular que el compacto.
  hueso_inmaduro: {
    roughness: 0.72,
    patron: 'poros',
    relieve: 1.3,
    repetir: [4, 6],
    motas: 0.25,
    clearcoat: 0.12,
    clearcoatRoughness: 0.6,
  },
  // Núcleo celular: cromatina granulosa.
  nucleo: {
    roughness: 0.5,
    patron: 'grumos',
    relieve: 0.6,
    repetir: [3, 3],
    motas: 0.15,
    clearcoat: 0.2,
    clearcoatRoughness: 0.4,
  },
  // Orgánulos (retículo, Golgi, mitocondrias, vesículas): lisos y húmedos.
  organulo: {
    roughness: 0.4,
    sheen: 0.2,
    sheenRoughness: 0.5,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
  },
  // Esmalte dental: liso y satinado, con un brillo suave (con rugosidad 0,14 y barniz 1 parecía porcelana).
  esmalte: { roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.12 },
  // Dentina y raíz: lisa, menos brillante que el esmalte.
  dentina: {
    roughness: 0.4,
    patron: 'grumos',
    relieve: 0.15,
    repetir: [2, 2],
    motas: 0.1,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
  },
  // Encía y mucosa: blanda, húmeda, con brillo de terciopelo.
  encia: {
    roughness: 0.5,
    patron: 'grumos',
    relieve: 0.3,
    repetir: [3, 3],
    motas: 0.12,
    sheen: 0.4,
    sheenRoughness: 0.5,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
  },
  // Coágulo y hematoma: grumoso y muy húmedo.
  coagulo: {
    roughness: 0.3,
    patron: 'grumos',
    relieve: 0.8,
    repetir: [3, 3],
    motas: 0.25,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
  },
  // Mesénquima embrionario: masa gelatinosa, blanda y algo aterciopelada.
  mesenquima: {
    roughness: 0.65,
    patron: 'grumos',
    relieve: 0.35,
    repetir: [2, 4],
    motas: 0.12,
    sheen: 0.5,
    sheenRoughness: 0.6,
  },
  // Nervio: cordón blanquecino con fascículos a lo largo y brillo húmedo.
  nervio: {
    roughness: 0.5,
    patron: 'fibras',
    relieve: 0.45,
    repetir: [1, 8],
    motas: 0.12,
    sheen: 0.5,
    sheenRoughness: 0.45,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
  },
  // Líquido o membrana fina (vesículas, superficie de un fluido): liso y brillante.
  liquido: { roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 },
  // Hueso esponjoso serrado (cara de corte): red de trabéculas con los huecos de la médula, más oscuros.
  hueso_trabecular: {
    roughness: 0.8,
    patron: 'celdas',
    relieve: 1.6,
    repetir: [1, 1],
    motas: 0.5,
  },
};

/**
 * Material de un tejido. `extra` pisa cualquier ajuste (por ejemplo `emissive` para un resalte o
 * `transparent`). Doble cara por defecto: muchas piezas son cáscaras abiertas que se ven por dentro.
 */
export function materialOrganico(
  color: string,
  tipo: TipoTejido,
  extra: MeshPhysicalMaterialParameters = {},
): MeshPhysicalMaterial {
  const a = AJUSTES[tipo];
  const parametros: MeshPhysicalMaterialParameters = {
    color,
    roughness: a.roughness,
    metalness: 0,
    side: DoubleSide,
  };
  if (a.patron && extra.bumpMap !== null) {
    // Clon: comparte los datos de la imagen pero tiene su propia repetición.
    const relieve = texturaRelieve(a.patron).clone();
    const [rx, ry] = a.repetir ?? [1, 1];
    relieve.repeat.set(rx, ry);
    relieve.needsUpdate = true;
    parametros.bumpMap = relieve;
    parametros.bumpScale = a.relieve ?? 0.5;
    parametros.roughnessMap = relieve;
  }
  if (a.sheen) {
    parametros.sheen = a.sheen;
    parametros.sheenRoughness = a.sheenRoughness ?? 0.5;
    // Con color por vértice o por instancia el material es blanco: un brillo blanco haría un halo de terciopelo
    // en el contorno de las piezas de color. Un gris medio lo deja neutro (la escena puede pasar otro en `extra`).
    parametros.sheenColor = /^#f{3}(f{3})?$/i.test(color) ? '#8a8590' : color;
  }
  if (a.clearcoat) {
    parametros.clearcoat = a.clearcoat;
    parametros.clearcoatRoughness = a.clearcoatRoughness ?? 0.4;
  }
  const material = new MeshPhysicalMaterial({ ...parametros, ...extra });
  if (material.bumpMap && a.motas) conMotas(material, a.motas);
  return material;
}

/* ----- Modificaciones del sombreador ----- */

type ModificarSombreador = (shader: WebGLProgramParametersWithUniforms) => void;

/**
 * Añade una modificación del sombreador a un material, encadenada con las que ya tenga (motas, velo, oclusión,
 * triplanar): three admite un solo `onBeforeCompile` por material, así que todas pasan por aquí. Cada una debe
 * conservar en su sustitución la marca que sustituye (`#include <common>`…), para que la siguiente la encuentre.
 * La clave del programa reúne los nombres: los materiales con las mismas modificaciones comparten programa, y
 * cada uno lleva sus propios uniformes. Añadir dos veces el mismo nombre no hace nada.
 */
export function inyectar(material: Material, nombre: string, modificar: ModificarSombreador): void {
  const lista = (material.userData.inyecciones ??= []) as {
    nombre: string;
    modificar: ModificarSombreador;
  }[];
  if (lista.some((i) => i.nombre === nombre)) return;
  lista.push({ nombre, modificar });
  const clave = `ova-${lista.map((i) => i.nombre).join('-')}`;
  material.customProgramCacheKey = () => clave;
  material.onBeforeCompile = (shader) => {
    for (const i of lista) i.modificar(shader);
  };
  material.needsUpdate = true;
}

/**
 * Hace que el color varíe con el relieve: lee la altura de la misma textura y con las mismas UV que el relieve
 * (también con la repetición que fije la escena) y multiplica el color, hasta `motas` más oscuro en el fondo de
 * un poro y algo más claro en las crestas. Una sola lectura más de una textura que ya está en caché. Todos los
 * materiales con motas comparten el mismo programa; cada uno lleva su propia cantidad.
 */
function conMotas(material: MeshPhysicalMaterial, motas: number): void {
  const uniforme = { value: motas };
  material.userData.motas = uniforme;
  inyectar(material, 'motas', (shader) => {
    shader.uniforms.uMotasOrg = uniforme;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uMotasOrg;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
#ifdef USE_BUMPMAP
  diffuseColor.rgb *= mix(1.0 - uMotasOrg, 1.0 + uMotasOrg * 0.35, texture2D(bumpMap, vBumpMapUv).r);
#endif`,
      );
  });
}

/**
 * Velo de una membrana o un tejido translúcido (vesícula, cartílago que se desvanece, periostio): más transparente
 * de frente y más opaco de canto, como una pompa o una lámina de tejido real (efecto Fresnel). Con una opacidad
 * constante parecía vidrio o plástico. `centro` y `borde` multiplican la opacidad del material de frente y de canto.
 */
export function veloFresnel(material: MeshPhysicalMaterial, centro: number, borde: number): void {
  const uniformes = { uVeloCentro: { value: centro }, uVeloBorde: { value: borde } };
  material.userData.velo = uniformes;
  inyectar(material, 'velo', (shader) => {
    Object.assign(shader.uniforms, uniformes);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uVeloCentro;\nuniform float uVeloBorde;',
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
  float fVelo = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
  diffuseColor.a = clamp(diffuseColor.a * mix(uVeloCentro, uVeloBorde, fVelo), 0.0, 1.0);`,
      );
  });
}

/**
 * Oclusión ambiental por vértice: la geometría trae un atributo `ao` (1 al aire libre, menos en el fondo de una
 * cavidad) que apaga la luz indirecta (entorno y hemisferio, que three no ocluye) en túneles, cavidades y
 * rincones. La luz directa ya la ocultan las sombras. Barata: un número por vértice.
 */
export function oclusionPorVertice(material: MeshPhysicalMaterial): void {
  inyectar(material, 'ao', (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float ao;\nvarying float vAo;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vAo = ao;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAo;')
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
  reflectedLight.indirectDiffuse *= vAo;
  reflectedLight.indirectSpecular *= vAo;
  #ifdef USE_CLEARCOAT
    clearcoatSpecularIndirect *= vAo;
  #endif
  #ifdef USE_SHEEN
    sheenSpecularIndirect *= vAo;
  #endif`,
      );
  });
}

/**
 * Material de un tejido con relieve TRIPLANAR: para mallas sin coordenadas UV (la mandíbula anatómica, un STL
 * de BodyParts3D). El relieve no se pega con UV: el sombreador lo proyecta desde los tres ejes del objeto y
 * mezcla las tres proyecciones según hacia dónde mira la superficie, así que no hay costuras. Además de
 * perturbar la normal (poros, grano), varía un poco el color y la rugosidad con la misma altura: un hueso real
 * no es de un tono uniforme.
 *
 *  - `escala`: repeticiones de la textura por unidad del objeto (la mandíbula normalizada mide ~2 unidades).
 *  - `intensidad`: fuerza del relieve. `motas`: variación de color (0 a 0,3).
 */
export function materialTriplanar(
  color: string,
  tipo: TipoTejido,
  opciones: { escala?: number; intensidad?: number; motas?: number; patron?: PatronRelieve } = {},
  extra: MeshPhysicalMaterialParameters = {},
): MeshPhysicalMaterial {
  const patron = opciones.patron ?? AJUSTES[tipo].patron ?? 'poros';
  const material = materialOrganico(color, tipo, { bumpMap: null, roughnessMap: null, ...extra });
  // Clon propio (se libera con el material): la textura de la caché no debe quedar enganchada a cada
  // renderizador que la usó y ya se destruyó.
  const relieve = texturaRelieve(patron).clone();
  relieve.needsUpdate = true;
  const uniformes = {
    uRelieveTri: { value: relieve },
    uEscalaTri: { value: opciones.escala ?? 1.4 },
    uIntensidadTri: { value: opciones.intensidad ?? 1.2 },
    uMotasTri: { value: opciones.motas ?? 0.12 },
  };
  material.userData.triplanar = uniformes;
  inyectar(material, `triplanar-${patron}`, (shader) => {
    Object.assign(shader.uniforms, uniformes);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vPosTri;\nvarying vec3 vNormalTri;',
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\n  vNormalTri = objectNormal;',
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPosTri = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vPosTri;
varying vec3 vNormalTri;
uniform sampler2D uRelieveTri;
uniform float uEscalaTri;
uniform float uIntensidadTri;
uniform float uMotasTri;
float alturaTri() {
  vec3 p = vPosTri * uEscalaTri;
  vec3 w = abs(normalize(vNormalTri));
  w = pow(w, vec3(4.0));
  w /= (w.x + w.y + w.z + 1e-5);
  return texture2D(uRelieveTri, p.yz).r * w.x
    + texture2D(uRelieveTri, p.zx).r * w.y
    + texture2D(uRelieveTri, p.xy).r * w.z;
}
vec3 perturbarTri(vec3 posicion, vec3 normalBase, vec2 dHdxy, float cara) {
  vec3 sx = normalize(dFdx(posicion));
  vec3 sy = normalize(dFdy(posicion));
  vec3 r1 = cross(sy, normalBase);
  vec3 r2 = cross(normalBase, sx);
  float det = dot(sx, r1) * cara;
  vec3 gradiente = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * normalBase - gradiente);
}`,
      )
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n  float hTri = alturaTri();\n  diffuseColor.rgb *= mix(1.0 - uMotasTri, 1.0 + uMotasTri * 0.35, hTri);',
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\n  roughnessFactor = clamp(roughnessFactor * mix(1.1, 0.88, hTri), 0.0, 1.0);',
      )
      .replace(
        '#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\n  normal = perturbarTri(-vViewPosition, normal, vec2(dFdx(hTri), dFdy(hTri)) * uIntensidadTri, faceDirection);',
      );
  });
  return material;
}

/** Libera un material orgánico y los clones de textura que creó (los datos compartidos no se tocan). */
export function liberarMaterialOrganico(material: MeshPhysicalMaterial): void {
  material.bumpMap?.dispose();
  (
    material.userData.triplanar as { uRelieveTri: { value: DataTexture } } | undefined
  )?.uRelieveTri.value.dispose();
  material.dispose();
}

/* ----- Desvanecidos ----- */

/**
 * Aplica una opacidad (0 a 1) a unos materiales: transparentes solo mientras hace falta, y sin escribir
 * profundidad por debajo de la mitad (lo de detrás se ve a través).
 *
 * Al pasar de opaco a transparente, o al revés, el material se recompila: three compila un material opaco con la
 * constante OPAQUE, que fija el alfa a 1, y no vuelve a compilarlo por sí solo al cambiar `transparent`; sin esto
 * la pieza se vería opaca hasta desaparecer de golpe. Cada variante queda en la caché de programas: solo la
 * primera vez cuesta, y mientras la opacidad cambia sin cruzar el umbral no se recompila nada.
 */
export function ponerOpacidad(materiales: readonly Material[], opacidad: number): void {
  const o = Math.max(0, Math.min(1, opacidad));
  const transparente = o < 0.995;
  for (const m of materiales) {
    m.opacity = o;
    if (m.transparent !== transparente) {
      m.transparent = transparente;
      m.needsUpdate = true;
    }
    m.depthWrite = o > 0.5;
  }
}
