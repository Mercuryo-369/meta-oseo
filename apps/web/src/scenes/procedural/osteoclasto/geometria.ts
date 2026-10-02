/**
 * Formas de la escena del osteoclasto (aquí sí se usa three). Son funciones de construcción: reciben números y
 * devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números están en `estado.ts` y
 * `disposicion.ts`, que son puros.
 *
 * Convención: la superficie del hueso es el plano y = 0 y la escena se corta por z = 0. Las piezas "traseras"
 * ocupan z <= 0 y las "delanteras" z >= 0.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FRACCION_POLAR_CUPULA } from './estado';

export type Mitad = 'trasera' | 'delantera';

function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías de la escena del osteoclasto.');
  return unida;
}

/**
 * Media cúpula de la célula (esfera unidad cortada por debajo del ecuador, hasta el ángulo polar
 * `FRACCION_POLAR_CUPULA`·π), de la mitad pedida. En `SphereGeometry` z = sen φ · sen θ, así que la mitad
 * trasera (z <= 0) es φ de π a 2π.
 */
export function mediaCupula(mitad: Mitad, segmentos = 22): SphereGeometry {
  return new SphereGeometry(
    1,
    segmentos,
    12,
    mitad === 'trasera' ? Math.PI : 0,
    Math.PI,
    0,
    Math.PI * FRACCION_POLAR_CUPULA,
  );
}

/**
 * Tapa de la sección de la cúpula: el segmento circular que queda al cortar la esfera unidad por z = 0 (el
 * arco por encima del borde inferior de la cúpula más la cuerda). Abanico desde el centro; mira a +Z.
 */
export function tapaCupula(segmentos = 28): BufferGeometry {
  // El borde inferior de la cúpula (y = cos(0,6·π)) corresponde al ángulo -(0,6 - 0,5)·π sobre la circunferencia.
  const inicio = -(FRACCION_POLAR_CUPULA - 0.5) * Math.PI;
  const fin = Math.PI - inicio;
  const posiciones: number[] = [0, 0, 0];
  const normales: number[] = [0, 0, 1];
  for (let i = 0; i <= segmentos; i++) {
    const a = inicio + ((fin - inicio) * i) / segmentos;
    posiciones.push(Math.cos(a), Math.sin(a), 0);
    normales.push(0, 0, 1);
  }
  const indices: number[] = [];
  for (let i = 1; i <= segmentos; i++) indices.push(0, i, i + 1);
  // Cierra con la cuerda: del último punto del arco al primero.
  indices.push(0, segmentos + 1, 1);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(posiciones, 3));
  g.setAttribute('normal', new Float32BufferAttribute(normales, 3));
  g.setIndex(indices);
  return g;
}

/**
 * Superficie del hueso de una mitad: rejilla en el plano XZ (y = 0) de `nx` × `nz` celdas entre x0..x1 y z0..z1,
 * con atributo de color por vértice. Las alturas (la laguna) se escriben después, en su sitio.
 */
export function superficieHueso(
  nx: number,
  nz: number,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
): PlaneGeometry {
  const g = new PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  // PlaneGeometry está en XY mirando a +Z; tumbada mira a +Y y su "alto" pasa a ser Z.
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const n = g.getAttribute('position').count;
  g.setAttribute('color', new BufferAttribute(new Float32Array(n * 3), 3));
  return g;
}

/**
 * Cara de corte de una mitad del bloque: una tira vertical en z = 0 de `nx` columnas, con la fila de abajo en
 * y = `yFondo` y la de arriba en y = 0 (la malla la baja donde la laguna la excava). Mira hacia `direccion` Z.
 */
export function caraCorte(
  nx: number,
  x0: number,
  x1: number,
  yFondo: number,
  direccion: 1 | -1,
): PlaneGeometry {
  const g = new PlaneGeometry(x1 - x0, -yFondo, nx, 1);
  if (direccion < 0) g.rotateY(Math.PI);
  g.translate((x0 + x1) / 2, yFondo / 2, 0);
  return g;
}

/**
 * Caras fijas de una mitad del bloque: los lados exteriores (x = x0, x = x1 y la cara de z lejana) y el fondo.
 * La superficie a la vista y la cara de corte van aparte porque se deforman.
 */
export function ladosBloque(
  x0: number,
  x1: number,
  zLejano: number,
  yFondo: number,
): BufferGeometry {
  const ancho = x1 - x0;
  const fondo = Math.abs(zLejano);
  const alto = -yFondo;
  const zMedio = zLejano / 2;
  const partes: BufferGeometry[] = [];
  // Lados en x = x0 (mira a -X) y x = x1 (mira a +X).
  const ladoA = new PlaneGeometry(fondo, alto);
  ladoA.rotateY(-Math.PI / 2);
  ladoA.translate(x0, yFondo / 2, zMedio);
  const ladoB = new PlaneGeometry(fondo, alto);
  ladoB.rotateY(Math.PI / 2);
  ladoB.translate(x1, yFondo / 2, zMedio);
  // Cara lejana en z = zLejano, mirando hacia fuera.
  const lejana = new PlaneGeometry(ancho, alto);
  if (zLejano < 0) lejana.rotateY(Math.PI);
  lejana.translate((x0 + x1) / 2, yFondo / 2, zLejano);
  // Fondo, mirando a -Y.
  const suelo = new PlaneGeometry(ancho, fondo);
  suelo.rotateX(Math.PI / 2);
  suelo.translate((x0 + x1) / 2, yFondo, zMedio);
  partes.push(ladoA, ladoB, lejana, suelo);
  return unir(partes);
}

/**
 * Medio anillo de sellado: un toro de radio `radio` y grosor `tubo` tumbado en el plano XZ, solo la mitad
 * pedida. `TorusGeometry` gira alrededor de Z en el plano XY; al tumbarlo, y pasa a -z, así que u de 0 a π
 * cae en z <= 0.
 */
export function medioAnillo(radio: number, tubo: number, mitad: Mitad): TorusGeometry {
  const g = new TorusGeometry(radio, tubo, 10, 28, Math.PI);
  if (mitad === 'delantera') g.rotateZ(Math.PI);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Tubo (cilindro cerrado) de radio `radio` y largo `largo` a lo largo de X, centrado en el origen. */
export function tubo(radio: number, largo: number, segmentos = 18): CylinderGeometry {
  const g = new CylinderGeometry(radio, radio, largo, segmentos, 1, false);
  g.rotateZ(Math.PI / 2);
  return g;
}

/** Esfera unidad de pocos polígonos para instanciar (células pequeñas, núcleos, partículas, pliegues). */
export function esferaSencilla(anchoSegmentos = 10, altoSegmentos = 7): SphereGeometry {
  return new SphereGeometry(1, anchoSegmentos, altoSegmentos);
}
