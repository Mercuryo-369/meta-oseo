/**
 * Formas de la escena del hueso trabecular (aquí sí se usa three). Son funciones de construcción: reciben
 * números y devuelven geometrías; no tienen estado ni dibujan nada. Casi todo se instancia: una losa de canto
 * biselado para las tiras de las placas, una barra con cintura para las barras, una caja biselada para la
 * cortical, un cilindro para los poros, una esfera para las células y un disco para los hoyos. Las mallas
 * (`mallas.ts`) las escalan con matrices de instancia.
 *
 * Realismo (2026-10-14): las piezas de tamaño unidad tienen las aristas biseladas con normales «redondeadas» (la
 * luz pasa de una cara a la siguiente por el bisel), así que se ven como hueso y no como cajas, con muy pocos
 * triángulos más. Todas llevan UV para el relieve de superficie de `realismo.ts`.
 */
import type { BufferGeometry } from 'three';
import {
  BoxGeometry,
  BufferGeometry as Geometria,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías de la escena trabecular.');
  return unida;
}

/**
 * Da la vuelta a los triángulos que miran hacia dentro. Vale para sólidos convexos (o casi) que contienen el
 * origen: la normal de cada cara exterior apunta hacia el mismo lado que sus propios vértices.
 */
function haciaFuera(posiciones: readonly number[], indices: number[]): number[] {
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const ab = new Vector3();
  const ac = new Vector3();
  for (let i = 0; i < indices.length; i += 3) {
    a.fromArray(posiciones, indices[i]! * 3);
    b.fromArray(posiciones, indices[i + 1]! * 3);
    c.fromArray(posiciones, indices[i + 2]! * 3);
    const normal = ab.subVectors(b, a).cross(ac.subVectors(c, a));
    if (normal.dot(a.add(b).add(c)) < 0) {
      const t = indices[i + 1]!;
      indices[i + 1] = indices[i + 2]!;
      indices[i + 2] = t;
    }
  }
  return indices;
}

function geometriaIndexada(
  posiciones: number[],
  normales: number[],
  uvs: number[],
  indices: number[],
): BufferGeometry {
  const g = new Geometria();
  g.setAttribute('position', new Float32BufferAttribute(posiciones, 3));
  g.setAttribute('normal', new Float32BufferAttribute(normales, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
}

/** Caja de lado 1 centrada en el origen (12 triángulos). */
export function cajaUnidad(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

/**
 * Losa de lado 1 (X e Y de -0,5 a 0,5) y grosor 1 en Z con el canto biselado en arista: cada cara grande es un
 * rectángulo metido `bx` (en X) y `by` (en Y) hacia dentro, y el canto es una arista a media altura (z = 0) en el
 * borde. Las normales de las caras miran en ±Z y las de la arista, hacia fuera en el plano: la luz redondea el
 * canto como el de una trabécula real. 20 triángulos (una caja tiene 12). Es la tira de las placas trabeculares.
 */
export function losa(bx = 0.06, by = 0.08): BufferGeometry {
  const sx = [-1, 1, 1, -1];
  const sy = [-1, -1, 1, 1];
  const posiciones: number[] = [];
  const normales: number[] = [];
  const uvs: number[] = [];
  const vertice = (x: number, y: number, z: number, n: [number, number, number]): void => {
    posiciones.push(x, y, z);
    normales.push(...n);
    uvs.push(x + 0.5, y + 0.5);
  };
  // 0 a 3: cara delantera; 4 a 7: cara trasera; 8 a 11: esquinas de la arista del canto.
  for (const z of [0.5, -0.5]) {
    for (let k = 0; k < 4; k++) vertice(sx[k]! * (0.5 - bx), sy[k]! * (0.5 - by), z, [0, 0, z * 2]);
  }
  for (let k = 0; k < 4; k++) {
    vertice(sx[k]! * 0.5, sy[k]! * 0.5, 0, [sx[k]! * Math.SQRT1_2, sy[k]! * Math.SQRT1_2, 0]);
  }
  const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4;
    // Bisel delantero y trasero de cada lado: trapecios entre el borde de la cara y la arista.
    indices.push(k, 8 + k, 8 + j, k, 8 + j, j);
    indices.push(4 + k, 8 + k, 8 + j, 4 + k, 8 + j, 4 + j);
  }
  return geometriaIndexada(posiciones, normales, uvs, haciaFuera(posiciones, indices));
}

/**
 * Caja de lado 1 con las doce aristas biseladas: el chaflán mide `cx`, `cy` y `cz` (fracción del lado) en cada
 * eje. Cada cara tiene sus cuatro vértices con la normal de la cara, y los biseles y las esquinas los comparten:
 * la luz pasa de una cara a la otra por el bisel y las aristas se ven redondeadas. 44 triángulos. La cortical
 * superior de esta escena y las tablas compactas del hueso plano (`dos_rutas`).
 *
 * `medidas`: tamaño (X, Y, Z) al que la malla escala la caja. Las UV de cada cara (su proyección plana) se dan en
 * unidades de escena para esas medidas: el relieve se repite por unidad y el grano sale igual en las caras grandes y
 * en los cantos. Con UV de 0 a 1 por cara, una lámina de 3 × 0,2 salía con el grano 25 veces más fino en el canto.
 */
export function cajaBiselada(
  cx: number,
  cy: number,
  cz: number,
  medidas: readonly [number, number, number] = [1, 1, 1],
): BufferGeometry {
  const dentro = [0.5 - cx, 0.5 - cy, 0.5 - cz];
  const posiciones: number[] = [];
  const normales: number[] = [];
  const uvs: number[] = [];
  /** Índice del vértice de la cara del eje `a` (signo `s[a]`) en la esquina de signos `s` de los otros ejes. */
  const indice = (a: number, s: readonly number[]): number => {
    const b = (a + 1) % 3;
    const c = (a + 2) % 3;
    return (a * 2 + (s[a]! > 0 ? 0 : 1)) * 4 + (s[b]! > 0 ? 1 : 0) + (s[c]! > 0 ? 2 : 0);
  };
  for (let a = 0; a < 3; a++) {
    for (const signo of [1, -1]) {
      for (let k = 0; k < 4; k++) {
        const p = [0, 0, 0];
        const n = [0, 0, 0];
        p[a] = signo * 0.5;
        n[a] = signo;
        p[(a + 1) % 3] = (k & 1 ? 1 : -1) * dentro[(a + 1) % 3]!;
        p[(a + 2) % 3] = (k & 2 ? 1 : -1) * dentro[(a + 2) % 3]!;
        posiciones.push(...p);
        normales.push(...n);
        // Proyección plana en cada cara: las dos coordenadas que no son su eje (en unidades de `medidas`).
        const uv = (eje: number): number => (p[eje]! + 0.5) * medidas[eje]!;
        if (a === 0) uvs.push(uv(2), uv(1));
        else if (a === 1) uvs.push(uv(0), uv(2));
        else uvs.push(uv(0), uv(1));
      }
    }
  }
  const indices: number[] = [];
  const signos = [1, -1];
  // Caras.
  for (let a = 0; a < 3; a++) {
    for (const s of signos) {
      const esquina = (sb: number, sc: number): number => {
        const v = [0, 0, 0];
        v[a] = s;
        v[(a + 1) % 3] = sb;
        v[(a + 2) % 3] = sc;
        return indice(a, v);
      };
      indices.push(esquina(-1, -1), esquina(1, -1), esquina(1, 1));
      indices.push(esquina(-1, -1), esquina(1, 1), esquina(-1, 1));
    }
  }
  // Biseles de las aristas: unen las dos caras que comparten cada arista.
  for (let a = 0; a < 3; a++) {
    const b = (a + 1) % 3;
    const c = (a + 2) % 3;
    for (const sa of signos) {
      for (const sb of signos) {
        const v = (sc: number): number[] => {
          const s = [0, 0, 0];
          s[a] = sa;
          s[b] = sb;
          s[c] = sc;
          return s;
        };
        const p1 = indice(a, v(-1));
        const p2 = indice(a, v(1));
        const p3 = indice(b, v(1));
        const p4 = indice(b, v(-1));
        indices.push(p1, p2, p3, p1, p3, p4);
      }
    }
  }
  // Esquinas: un triángulo entre las tres caras.
  for (const x of signos) {
    for (const y of signos) {
      for (const z of signos) {
        const s = [x, y, z];
        indices.push(indice(0, s), indice(1, s), indice(2, s));
      }
    }
  }
  return geometriaIndexada(posiciones, normales, uvs, haciaFuera(posiciones, indices));
}

/**
 * Sólido de revolución alrededor de Y: `perfil` son pares (radio, y) de abajo arriba; un radio 0 en un extremo es
 * un polo (abanico de triángulos). Normales suavizadas (también en la costura) y UV: u alrededor, v a lo largo
 * del perfil.
 */
function revolucion(
  perfil: readonly (readonly [number, number])[],
  segmentos: number,
): BufferGeometry {
  const posiciones: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const largos = [0];
  for (let i = 1; i < perfil.length; i++) {
    const [r0, y0] = perfil[i - 1]!;
    const [r1, y1] = perfil[i]!;
    largos.push(largos[i - 1]! + Math.hypot(r1 - r0, y1 - y0));
  }
  const total = largos[largos.length - 1] || 1;
  /** Primer vértice de cada punto del perfil (un polo es un solo vértice). */
  const inicio: number[] = [];
  perfil.forEach(([r, y], i) => {
    inicio.push(posiciones.length / 3);
    const v = largos[i]! / total;
    if (r === 0) {
      posiciones.push(0, y, 0);
      uvs.push(0.5, v);
      return;
    }
    for (let j = 0; j <= segmentos; j++) {
      const fi = (j / segmentos) * Math.PI * 2;
      posiciones.push(r * Math.sin(fi), y, r * Math.cos(fi));
      uvs.push(j / segmentos, v);
    }
  });
  for (let i = 0; i + 1 < perfil.length; i++) {
    const abajo = inicio[i]!;
    const arriba = inicio[i + 1]!;
    const poloAbajo = perfil[i]![0] === 0;
    const poloArriba = perfil[i + 1]![0] === 0;
    for (let j = 0; j < segmentos; j++) {
      if (poloAbajo) indices.push(abajo, arriba + j + 1, arriba + j);
      else if (poloArriba) indices.push(arriba, abajo + j, abajo + j + 1);
      else {
        const a = abajo + j;
        const b = abajo + j + 1;
        const c = arriba + j + 1;
        const d = arriba + j;
        indices.push(a, b, c, a, c, d);
      }
    }
  }
  const g = new Geometria();
  g.setAttribute('position', new Float32BufferAttribute(posiciones, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  // Costura: el primer y el último vértice de cada anillo están en el mismo sitio; misma normal para los dos.
  const normal = g.getAttribute('normal');
  const n = new Vector3();
  perfil.forEach(([r], i) => {
    if (r === 0) return;
    const a = inicio[i]!;
    const b = a + segmentos;
    n.fromBufferAttribute(normal, a).add(new Vector3().fromBufferAttribute(normal, b)).normalize();
    normal.setXYZ(a, n.x, n.y, n.z);
    normal.setXYZ(b, n.x, n.y, n.z);
  });
  return g;
}

/**
 * Barra trabecular de radio 1 y largo 1 a lo largo de Y: más gruesa en los extremos (donde se une a las placas),
 * con cintura en el centro (por donde adelgaza y se rompe con los años) y puntas romas. 60 triángulos con 10
 * segmentos (un cilindro de 7 con tapas tenía 28).
 */
export function barraUnidad(segmentos = 10): BufferGeometry {
  return revolucion(
    [
      [0, -0.5],
      [1, -0.43],
      [0.8, 0],
      [1, 0.43],
      [0, 0.5],
    ],
    segmentos,
  );
}

/** Cilindro de radio 1 y alto 1 a lo largo de Y, con tapas. */
export function cilindroUnidad(segmentos = 7): BufferGeometry {
  return new CylinderGeometry(1, 1, 1, segmentos, 1, false);
}

/** Esfera de radio 1 (células de las BMU): 12 × 8 segmentos, redonda de cerca. */
export function esferaUnidad(): BufferGeometry {
  return new SphereGeometry(1, 12, 8);
}

/** Disco de radio 1 en el plano XY, mirando a +Z. */
export function discoUnidad(segmentos = 24): BufferGeometry {
  return new CircleGeometry(1, segmentos);
}

/**
 * Flecha que apunta hacia -Y (hacia abajo): un vástago y una punta. La punta queda en el origen y el vástago
 * sube desde ella `largo` unidades, así la flecha se apoya donde se coloca.
 */
export function flecha(largo: number, radio: number): BufferGeometry {
  const largoPunta = radio * 3.2;
  const punta = new ConeGeometry(radio * 2.1, largoPunta, 20);
  // ConeGeometry apunta a +Y: se invierte para que la punta mire hacia abajo y se apoye en el origen.
  punta.rotateZ(Math.PI);
  punta.translate(0, largoPunta / 2, 0);
  const vastago = new CylinderGeometry(radio, radio, largo - largoPunta, 16);
  vastago.translate(0, largoPunta + (largo - largoPunta) / 2, 0);
  return unir([punta, vastago]);
}
