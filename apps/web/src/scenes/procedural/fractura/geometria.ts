/**
 * Formas de la escena de la fractura (aquí sí se usa three). Son funciones de construcción: reciben números y
 * devuelven geometrías; no tienen estado ni dibujan nada. Los números (perfiles, radios, ángulos) salen de
 * `estado.ts` y `disposicion.ts`, que son puros.
 *
 * Convención: todo alrededor del eje Y con los ángulos de `CylinderGeometry` (x = sen θ, z = cos θ). La escena
 * se tumba después a lo largo de X. Los anillos con grosor (cortical, periostio, médula) son el `anillo` de la
 * escena del hueso; aquí se añade el sólido de revolución `fusiforme` (hematoma y callo).
 *
 * Realismo (2026-10-14): `fracturar` hace dentado el borde de un anillo (la superficie de fractura de la cortical y
 * el borde desgarrado del periostio), en vez de un corte limpio de sierra; `abollar` da una superficie algo
 * irregular a un sólido de revolución (hematoma, callo), que de otro modo sería un huso perfecto.
 */
import type { BufferGeometry } from 'three';
import { CylinderGeometry, Shape, ShapeGeometry, SphereGeometry, Vector2 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { anillo, revolucion } from '../hueso/geometria';
import { grados, grumo } from './disposicion';
import { CUNA } from './estado';

export { anillo, grumo };

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
 * añade las dos caras de corte (el perfil relleno), para que el sólido se vea macizo al abrirlo. UV en unidades de
 * escena (como `anillo`): en el torno, U = θ · radio y V = la longitud del perfil; en las caras, (radio, y).
 */
export function fusiforme(
  perfil: readonly (readonly [number, number])[],
  theta0 = 0,
  arco = DOS_PI,
  segmentos = 48,
): BufferGeometry {
  const completo = arco >= DOS_PI - 1e-6;
  const n = Math.max(3, Math.ceil((segmentos * arco) / DOS_PI));
  const partes: BufferGeometry[] = [revolucion(perfil, theta0, arco, n)];
  if (!completo) {
    for (const theta of [theta0, theta0 + arco]) {
      // La forma se dibuja en el plano XY (x = radio) y se gira para que X apunte en la dirección θ. Sus UV ya son
      // las coordenadas de la forma: (radio, y), en unidades.
      const forma = new Shape(perfil.map(([r, y]) => new Vector2(r, y)));
      const cara = new ShapeGeometry(forma);
      cara.rotateY(theta - Math.PI / 2);
      partes.push(cara);
    }
  }
  return unir(partes);
}

/**
 * Perfil dentado de un borde de fractura (entre −1 y 1) según el ángulo θ alrededor del eje: suma de senos de
 * frecuencias enteras, así que la vuelta cierra sin salto. Determinista; `fase` da otro dibujo.
 */
export function dentado(theta: number, fase = 0): number {
  return (
    0.55 * Math.sin(3 * theta + 0.7 + fase) +
    0.3 * Math.sin(7 * theta + 2.1 + 1.7 * fase) +
    0.15 * Math.sin(13 * theta + 4.2 + 2.3 * fase)
  );
}

/**
 * Borde roto: desplaza a lo largo de Y los vértices que están a la altura `yBorde` (el extremo de un anillo que
 * mira a la brecha) `amplitud · dentado(θ)`. Como el desplazamiento depende solo del ángulo, las piezas que
 * comparten ese borde (paredes, tapa y caras de corte; cuerpo y tapa de la cuña) siguen cerradas y encajan. Con
 * el mismo dibujo en los dos fragmentos, sus bordes son complementarios, como los de una fractura real que se ha
 * separado. En las paredes y las caras de corte (UV en unidades, V = altura) la V se mueve con el vértice: el grano
 * no se estira en el borde. Recalcula las normales. Modifica la geometría y la devuelve.
 */
export function fracturar(
  g: BufferGeometry,
  yBorde: number,
  amplitud: number,
  fase = 0,
): BufferGeometry {
  const posiciones = g.getAttribute('position');
  const normales = g.getAttribute('normal');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < posiciones.count; i++) {
    if (Math.abs(posiciones.getY(i) - yBorde) > 1e-5) continue;
    const theta = Math.atan2(posiciones.getX(i), posiciones.getZ(i));
    const dy = amplitud * dentado(theta, fase);
    posiciones.setY(i, yBorde + dy);
    // Pared o cara de corte (normal horizontal); las tapas (normal ±Y) tienen UV (x, z) y no cambian.
    if (uv && Math.abs(normales.getY(i)) < 0.5) uv.setY(i, uv.getY(i) + dy);
  }
  posiciones.needsUpdate = true;
  if (uv) uv.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/**
 * Superficie irregular para un sólido de revolución (hematoma, callo), que de otro modo es un huso perfecto: cambia
 * la distancia al eje de cada vértice por el factor `1 + amplitud · grumo(θ, y)`, sin cambiar su ángulo ni su
 * altura. Como depende solo de (θ, y), el torno y sus caras de corte (planas, en un mismo θ) siguen encajando, y el
 * cuerpo y la tapa de la cuña también. Recalcula las normales. Modifica la geometría y la devuelve.
 */
export function abollar(g: BufferGeometry, amplitud: number, semilla = 0): BufferGeometry {
  const posiciones = g.getAttribute('position');
  for (let i = 0; i < posiciones.count; i++) {
    const x = posiciones.getX(i);
    const z = posiciones.getZ(i);
    if (Math.hypot(x, z) < 1e-9) continue;
    const y = posiciones.getY(i);
    const k = 1 + amplitud * grumo(Math.atan2(x, z), y, semilla);
    posiciones.setXYZ(i, x * k, y, z * k);
  }
  posiciones.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Esfera unitaria de pocos polígonos: células (12 × 8) y gotas (8 × 6). */
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
