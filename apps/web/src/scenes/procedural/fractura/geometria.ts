/**
 * Formas de la escena de la fractura (aquí sí se usa three). Son funciones de construcción: reciben números y
 * devuelven geometrías; no tienen estado ni dibujan nada. Los números (perfiles, radios, ángulos) salen de
 * `estado.ts` y `disposicion.ts`, que son puros.
 *
 * Convención: todo alrededor del eje Y con los ángulos de `CylinderGeometry` (x = sen θ, z = cos θ). La escena
 * se tumba después a lo largo de X. Los anillos con grosor (cortical, periostio, médula) son el `anillo` de la
 * escena del hueso; aquí se añade el sólido de revolución `fusiforme` (hematoma y callo).
 */
import type { BufferGeometry } from 'three';
import {
  CylinderGeometry,
  LatheGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { anillo } from '../hueso/geometria';
import { grados } from './disposicion';
import { CUNA } from './estado';

export { anillo };

export const DOS_PI = Math.PI * 2;

/** Une varias geometrías en una (mismo material) y libera las partes. */
export function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías de la escena de la fractura.');
  return unida;
}

/** Arco angular (θ0 y amplitud, radianes) de la CUÑA que se abre, agrandada `retiroGrados` a cada lado. */
export function arcoDeCuna(retiroGrados = 0): { theta0: number; arco: number } {
  return {
    theta0: grados(CUNA.inicio - retiroGrados),
    arco: grados(CUNA.arco + 2 * retiroGrados),
  };
}

/** Arco angular del CUERPO (lo que queda al abrir la cuña), encogido `retiroGrados` a cada lado. */
export function arcoDeCuerpo(retiroGrados = 0): { theta0: number; arco: number } {
  const cuna = arcoDeCuna(retiroGrados);
  return { theta0: cuna.theta0 + cuna.arco, arco: DOS_PI - cuna.arco };
}

/**
 * Sólido de revolución alrededor de Y a partir de un perfil `[radio, y]` (que empieza y termina sobre el eje,
 * radio 0), en el arco que empieza en `theta0` y dura `arco` radianes. Con un arco menor que la vuelta completa
 * añade las dos caras de corte (el perfil relleno), para que el sólido se vea macizo al abrirlo.
 */
export function fusiforme(
  perfil: readonly (readonly [number, number])[],
  theta0 = 0,
  arco = DOS_PI,
  segmentos = 48,
): BufferGeometry {
  const completo = arco >= DOS_PI - 1e-6;
  const n = Math.max(3, Math.ceil((segmentos * arco) / DOS_PI));
  const puntos = perfil.map(([r, y]) => new Vector2(r, y));
  const partes: BufferGeometry[] = [new LatheGeometry(puntos, n, theta0, arco)];
  if (!completo) {
    for (const theta of [theta0, theta0 + arco]) {
      // La forma se dibuja en el plano XY (x = radio) y se gira para que X apunte en la dirección θ.
      const forma = new Shape(perfil.map(([r, y]) => new Vector2(r, y)));
      const cara = new ShapeGeometry(forma);
      cara.rotateY(theta - Math.PI / 2);
      partes.push(cara);
    }
  }
  return unir(partes);
}

/** Esfera unitaria de pocos polígonos: células y gotas. */
export function esfera(ancho = 8, alto = 6): BufferGeometry {
  return new SphereGeometry(1, ancho, alto);
}

/**
 * Tramo: cilindro de radio 1 y largo 1 a lo largo de +Y con la base en el origen, para que una instancia
 * escalada en Y "se alargue" desde su punto de partida (vasos).
 */
export function tramo(segmentos = 6): BufferGeometry {
  const g = new CylinderGeometry(1, 1, 1, segmentos, 1, false);
  g.translate(0, 0.5, 0);
  return g;
}
