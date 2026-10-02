/**
 * Formas de la escena del hueso alveolar (aquí sí se usa three). Son funciones de construcción: reciben
 * polígonos y números y devuelven geometrías; no tienen estado ni dibujan nada. Los polígonos salen de
 * `disposicion.ts` (puro).
 *
 * Convención: los polígonos viven en el plano de corte con coordenadas `[z, y]`. Las formas planas
 * (`placa`) y los bloques extruidos (`bloque`) se giran para que ese plano sea el YZ del mundo: un punto
 * `[z, y]` va a `(x, y, z)`, y la extrusión avanza hacia −X (la mitad fija del cuerpo ocupa x de −largo a 0).
 * Los cilindros y tornos siguen la convención de three alrededor del eje Y (x = sen θ, z = cos θ): la mitad
 * x < 0 es θ de PI a 2·PI.
 */
import type { BufferGeometry } from 'three';
import { ExtrudeGeometry, LatheGeometry, Path, Shape, ShapeGeometry, Vector2 } from 'three';
import type { Punto2 } from './disposicion';
import { perfilCorona } from './disposicion';
import { Z_ALVEOLO } from './estado';

export const DOS_PI = Math.PI * 2;

function trazo(puntos: readonly Punto2[]): Path {
  const camino = new Path();
  puntos.forEach(([z, y], i) => (i === 0 ? camino.moveTo(z, y) : camino.lineTo(z, y)));
  camino.closePath();
  return camino;
}

/** Forma cerrada de three a partir de un polígono y sus agujeros. */
export function forma(
  contorno: readonly Punto2[],
  agujeros: readonly (readonly Punto2[])[] = [],
): Shape {
  const s = new Shape();
  contorno.forEach(([z, y], i) => (i === 0 ? s.moveTo(z, y) : s.lineTo(z, y)));
  s.closePath();
  for (const agujero of agujeros) s.holes.push(trazo(agujero));
  return s;
}

/** Lleva una geometría construida en el plano XY (x = z del corte, y = y) al plano YZ del mundo, en x = `x`. */
function alPlanoDeCorte(g: BufferGeometry, x: number): BufferGeometry {
  g.rotateY(-Math.PI / 2);
  if (x !== 0) g.translate(x, 0, 0);
  return g;
}

/** Placa plana (sin grosor) con la forma del polígono, en el plano de corte a la profundidad `x`. */
export function placa(
  contorno: readonly Punto2[],
  agujeros: readonly (readonly Punto2[])[] = [],
  x = 0,
): BufferGeometry {
  return alPlanoDeCorte(new ShapeGeometry(forma(contorno, agujeros)), x);
}

/**
 * Bloque extruido a lo largo del cuerpo: el polígono (con sus agujeros, que quedan como túneles) se extiende
 * `largo` unidades desde x = 0 hacia −X, con tapas en ambos extremos.
 */
export function bloque(
  contorno: readonly Punto2[],
  agujeros: readonly (readonly Punto2[])[],
  largo: number,
): BufferGeometry {
  const g = new ExtrudeGeometry(forma(contorno, agujeros), {
    depth: largo,
    bevelEnabled: false,
    curveSegments: 1,
  });
  return alPlanoDeCorte(g, 0);
}

/**
 * Media corona del diente (torno del perfil de `perfilCorona`), la mitad que queda en x < 0 (`lado` −1) o
 * en x > 0 (`lado` +1), centrada en el eje del alvéolo.
 */
export function mediaCorona(lado: 1 | -1, segmentos = 22): BufferGeometry {
  const puntos = perfilCorona().map(([r, y]) => new Vector2(r, y));
  const g = new LatheGeometry(puntos, segmentos, lado === -1 ? Math.PI : 0, Math.PI);
  g.translate(0, 0, Z_ALVEOLO);
  return g;
}
