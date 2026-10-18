/**
 * Formas de la escena de las dos rutas (aquí sí se usa three). Son funciones de construcción: reciben números y
 * devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números están en `estado.ts` y
 * `disposicion.ts`, que son puros.
 *
 * Convención: las piezas repetidas o que cambian de tamaño se construyen con tamaño UNITARIO (esfera de radio 1,
 * caja de lado 1, cilindro de radio 1 y alto 1, tramo de largo 1 a lo largo de +Y) para que cada instancia o cada
 * malla solo tenga que colocarse, girarse y escalarse. Todas llevan UV (el relieve de `realismo.ts` las necesita).
 */
import type { BufferGeometry } from 'three';
import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { anillo } from '../hueso/geometria';
import { cajaBiselada } from '../trabecular/geometria';
import { grados } from './disposicion';
import { APERTURA_COLLAR, PLACA } from './estado';

export const DOS_PI = Math.PI * 2;

/** Esfera unitaria: células, núcleos, lagunas, osteoclastos (el número de segmentos lo elige cada pieza). */
export function esfera(ancho = 8, alto = 6): BufferGeometry {
  return new SphereGeometry(1, ancho, alto);
}

/** Caja de lado 1 centrada en el origen: el panel de mesénquima. */
export function caja(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

/**
 * Tabla compacta del hueso plano: caja de lado 1 (se escala a `PLACA`) con las aristas biseladas unos 0,035 en el
 * plano y un 18 % del grosor, para que el borde se vea redondeado y no de caja. La cara delantera queda plana en la
 * franja de las laminillas (±30 % del grosor). UV en unidades de escena a su tamaño final (antes, de 0 a 1 por
 * cara: en la cara frontal, la de las laminillas, el grano salía 7 veces más fino en vertical que en horizontal).
 */
export function tabla(): BufferGeometry {
  return cajaBiselada(0.035 / PLACA.ancho, 0.18, 0.035 / PLACA.fondo, [
    PLACA.ancho,
    PLACA.grosor,
    PLACA.fondo,
  ]);
}

/**
 * Tramo: cilindro de radio 1 y largo 1 a lo largo de +Y con la base en el origen, para que una instancia escalada
 * en Y "se alargue" desde su punto de partida (espículas, trabéculas y vasos).
 */
export function tramo(segmentos = 6): BufferGeometry {
  const g = new CylinderGeometry(1, 1, 1, segmentos, 1, false);
  g.translate(0, 0.5, 0);
  return g;
}

/** Cilindro cerrado de radio 1 y alto 1 centrado en el origen (cartílago, calcificado, cavidad medular, vasos). */
export function cilindro(segmentos = 24): BufferGeometry {
  return new CylinderGeometry(1, 1, 1, segmentos, 1, false);
}

/** Medidas a las que la malla escala un anillo (para dar sus UV en unidades de escena). */
export interface MedidasAnillo {
  /** Alto final (escala en Y). */
  alto?: number;
  /** Escala en X y Z. */
  radial?: number;
}

/**
 * Anillo alrededor de Y, de alto 1, abierto hacia la cámara (+Z) en `APERTURA_COLLAR` grados para ver el interior:
 * el collar perióstico, la cortical y el pericondrio. Con las caras de corte (lo da `anillo` del hueso).
 *
 * UV en unidades de escena para la malla escalada a `medidas` (2026-10-17, realismo-04): en las paredes, la longitud
 * de arco alrededor y la altura; en las tapas, (x, z); en las caras de corte, (radio, altura). Antes cada parte
 * traía sus UV de 0 a 1 (las de `CylinderGeometry`, `RingGeometry` y `PlaneGeometry`): un grano distinto en cada
 * una y un salto en sus aristas. No hay costura: el ángulo da la vuelta dentro de la abertura.
 */
export function anilloAbierto(
  interior: number,
  exterior: number,
  segmentos = 40,
  medidas: MedidasAnillo = {},
): BufferGeometry {
  const apertura = grados(APERTURA_COLLAR);
  const g = anillo(interior, exterior, 1, apertura / 2, DOS_PI - apertura, segmentos);
  const alto = medidas.alto ?? 1;
  const radial = medidas.radial ?? 1;
  const pos = g.getAttribute('position');
  const normal = g.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    let u: number;
    let v: number;
    if (Math.abs(normal.getY(i)) > 0.9) {
      u = x * radial;
      v = z * radial;
    } else if (r > 1e-6 && Math.abs(normal.getX(i) * x + normal.getZ(i) * z) / r > 0.9) {
      let theta = Math.atan2(x, z);
      if (theta < 0) theta += DOS_PI;
      u = theta * r * radial;
      v = y * alto;
    } else {
      u = r * radial;
      v = y * alto;
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return g;
}

/** Aro fino y plano (en el plano XZ) para las osteonas de la tabla superior. */
export function aro(interior: number, exterior: number, segmentos = 18): BufferGeometry {
  return anillo(interior, exterior, 0.012, 0, DOS_PI, segmentos);
}

/** Color de vértice del conducto de Havers (multiplica al del material: queda un punto pardo oscuro). */
const COLOR_CONDUCTO = [0.3, 0.16, 0.13] as const;

/**
 * Osteona de la tabla superior: el aro de las laminillas (`aro`) y, en su centro, el conducto de Havers (un disco
 * oscuro). Lleva colores de vértice (blanco el aro, oscuro el conducto) para dibujarse en una sola malla instanciada
 * con el material en `vertexColors`.
 */
export function osteonaConCanal(
  interior = 0.06,
  exterior = 0.1,
  conducto = 0.032,
  segmentos = 16,
): BufferGeometry {
  const anilloOsteona = aro(interior, exterior, segmentos);
  const canal = new CircleGeometry(conducto, segmentos);
  canal.rotateX(-Math.PI / 2);
  // A la altura de la cara de arriba del aro (alto 0,012): dentro de su hueco, sin tocarlo.
  canal.translate(0, 0.006, 0);
  const pintar = (g: BufferGeometry, color: readonly number[]): void => {
    const n = g.getAttribute('position').count;
    const datos: number[] = [];
    for (let i = 0; i < n; i++) datos.push(...color);
    g.setAttribute('color', new Float32BufferAttribute(datos, 3));
  };
  pintar(anilloOsteona, [1, 1, 1]);
  pintar(canal, COLOR_CONDUCTO);
  const unida = mergeGeometries([anilloOsteona, canal], false);
  anilloOsteona.dispose();
  canal.dispose();
  if (!unida) throw new Error('No se pudo construir la osteona de la escena de las dos rutas.');
  return unida;
}
