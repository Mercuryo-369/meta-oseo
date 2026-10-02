/**
 * Formas de la escena del hueso (aquí sí se usa three). Son funciones de construcción: reciben números y
 * devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números (posiciones, ángulos,
 * radios) están en `estado.ts` y `disposicion.ts`, que son puros.
 *
 * Convención: los cilindros y los anillos se construyen alrededor del eje Y y sus ángulos son los de
 * `CylinderGeometry` (x = sen θ, z = cos θ). Los grupos se giran después para tumbarlos en X o mirar a la cámara.
 */
import type { BufferGeometry } from 'three';
import { CylinderGeometry, PlaneGeometry, RingGeometry, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const DOS_PI = Math.PI * 2;
const SEGMENTOS = 56;

function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías de la escena del hueso.');
  return unida;
}

/**
 * Anillo con grosor alrededor del eje Y: entre los radios `interior` y `exterior`, de altura `alto`, en el
 * arco que empieza en `theta0` y dura `arco` radianes. Con un arco menor que la vuelta completa añade las dos
 * caras de corte (así el hueso se ve macizo al abrirlo). Con `interior` = 0 es un disco.
 */
export function anillo(
  interior: number,
  exterior: number,
  alto: number,
  theta0 = 0,
  arco = DOS_PI,
  segmentos = SEGMENTOS,
): BufferGeometry {
  const completo = arco >= DOS_PI - 1e-6;
  const n = Math.max(3, Math.ceil((segmentos * arco) / DOS_PI));
  const partes: BufferGeometry[] = [
    new CylinderGeometry(exterior, exterior, alto, n, 1, true, theta0, arco),
  ];
  if (interior > 0) {
    partes.push(new CylinderGeometry(interior, interior, alto, n, 1, true, theta0, arco));
  }
  for (const y of [alto / 2, -alto / 2]) {
    // RingGeometry mide el ángulo desde +X en el plano XY; tras girarlo, θ de cilindro = φ + PI / 2.
    const tapa = new RingGeometry(interior, exterior, n, 1, theta0 - Math.PI / 2, arco);
    tapa.rotateX(-Math.PI / 2);
    tapa.translate(0, y, 0);
    partes.push(tapa);
  }
  if (!completo && exterior > interior) {
    for (const theta of [theta0, theta0 + arco]) {
      const cara = new PlaneGeometry(exterior - interior, alto);
      cara.rotateY(theta - Math.PI / 2);
      const medio = (interior + exterior) / 2;
      cara.translate(medio * Math.sin(theta), 0, medio * Math.cos(theta));
      partes.push(cara);
    }
  }
  return unir(partes);
}

/**
 * Cáscara de un elipsoide de revolución alrededor de Y (radio `radio` en X y Z, semieje `semieje` en Y),
 * centrada en (0, `yCentro`, 0), en el arco angular que empieza en `theta0` y dura `arco`. Con `poloDesde` y
 * `poloLargo` (radianes desde el polo +Y) se queda solo con un casquete.
 */
export function cascaraElipsoide(
  radio: number,
  semieje: number,
  yCentro: number,
  theta0: number,
  arco: number,
  poloDesde = 0,
  poloLargo = Math.PI,
): BufferGeometry {
  // En SphereGeometry x = -cos φ sen θpolo y z = sen φ sen θpolo, así que θ de cilindro = φ - PI / 2.
  const esfera = new SphereGeometry(
    1,
    Math.max(6, Math.ceil((SEGMENTOS * arco) / DOS_PI)),
    22,
    theta0 + Math.PI / 2,
    arco,
    poloDesde,
    poloLargo,
  );
  esfera.scale(radio, semieje, radio);
  esfera.translate(0, yCentro, 0);
  return esfera;
}
