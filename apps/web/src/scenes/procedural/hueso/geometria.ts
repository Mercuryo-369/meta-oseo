/**
 * Formas de la escena del hueso (aquí sí se usa three). Son funciones de construcción: reciben números y
 * devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números (posiciones, ángulos,
 * radios) están en `estado.ts` y `disposicion.ts`, que son puros.
 *
 * Convención: los cilindros y los anillos se construyen alrededor del eje Y y sus ángulos son los de
 * `CylinderGeometry` (x = sen θ, z = cos θ). Los grupos se giran después para tumbarlos en X o mirar a la cámara.
 *
 * UV EN UNIDADES DE ESCENA (revisión de diseño 2026-10-17, realismo-04): todas las formas traen las UV medidas en
 * unidades de la geometría, no de 0 a 1 por pieza. En las superficies de revolución, U es la longitud del arco desde
 * θ = 0 (el frente) y V la longitud a lo largo del eje o del meridiano; en las tapas y caras de corte, las dos
 * coordenadas de su plano. Así la repetición del relieve se fija POR UNIDAD (`bumpMap.repeat` en `mallas.ts`) y el
 * grano mide lo mismo en la diáfisis, la metáfisis, la epífisis y las caras de corte. Antes cada pieza estiraba la
 * textura a su tamaño: grano comprimido hasta 35:1 en los cantos y bandas lisas en la metáfisis. Con θ absoluto, el
 * cuerpo y la cuña de una pieza abierta siguen el mismo dibujo a través de su unión de delante (θ0 + arco de la
 * cuña); el salto queda en la unión de atrás.
 */
import type { BufferGeometry } from 'three';
import {
  BufferGeometry as Geometria,
  CylinderGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const DOS_PI = Math.PI * 2;
const SEGMENTOS = 56;

/** Une varias geometrías en una (mismo material) y libera las partes. */
export function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías de la escena del hueso.');
  return unida;
}

/* -------------------------------------------------------------------------------------------
 * UV en unidades
 * ----------------------------------------------------------------------------------------- */

/**
 * UV en unidades de una superficie de revolución de three (`CylinderGeometry` abierto, `LatheGeometry`,
 * `SphereGeometry`), que traen la U de 0 a 1 a lo largo de su arco `theta0` + `arco`: U = θ · (distancia del
 * vértice al eje), la longitud del arco desde θ = 0, y V la que devuelva `v` para el vértice (recibe su índice, su
 * altura y la V original). El ángulo sale de la U original, no de atan2: en una vuelta completa la columna de la
 * costura vale θ0 + 2π (no vuelve a θ0) y no aparece una franja con la textura comprimida.
 */
export function uvRevolucion(
  g: BufferGeometry,
  theta0: number,
  arco: number,
  v: (i: number, y: number, vOriginal: number) => number,
): BufferGeometry {
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    const theta = theta0 + uv.getX(i) * arco;
    const radio = Math.hypot(pos.getX(i), pos.getZ(i));
    uv.setXY(i, theta * radio, v(i, pos.getY(i), uv.getY(i)));
  }
  uv.needsUpdate = true;
  return g;
}

/** UV de una cara plana en unidades: (distancia al eje, altura + `dv`). Las caras de corte de una pieza abierta. */
function uvCaraDeCorte(g: BufferGeometry, dv: number): void {
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, Math.hypot(pos.getX(i), pos.getZ(i)), pos.getY(i) + dv);
  }
  uv.needsUpdate = true;
}

/**
 * UV en unidades de un cilindro de `CylinderGeometry` (abierto o con tapas): la pared como `uvRevolucion` con
 * V = altura + `dv`, y las tapas (normal ±Y), planas: (x, z).
 */
export function uvCilindro(g: BufferGeometry, theta0 = 0, arco = DOS_PI, dv = 0): BufferGeometry {
  const pos = g.getAttribute('position');
  const normal = g.getAttribute('normal');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(normal.getY(i)) > 0.999) {
      uv.setXY(i, pos.getX(i), pos.getZ(i));
      continue;
    }
    const theta = theta0 + uv.getX(i) * arco;
    uv.setXY(i, theta * Math.hypot(pos.getX(i), pos.getZ(i)), pos.getY(i) + dv);
  }
  uv.needsUpdate = true;
  return g;
}

/* -------------------------------------------------------------------------------------------
 * Formas
 * ----------------------------------------------------------------------------------------- */

export interface OpcionesAnillo {
  /**
   * Se suma a la V de las paredes y de las caras de corte: la altura a la que se trasladará la pieza después, para
   * que dos anillos apilados (el tramo sano y el necrótico de la fractura) sigan el mismo dibujo en su unión.
   */
  desplazamientoV?: number;
  /**
   * Tapas con UV polares (distancia al eje, arco a media pared) en vez de planas (x, z): las vetas del patrón
   * `fibras`, que corren a lo largo de la V, dan entonces la vuelta al anillo (periostio y endostio del corte).
   */
  tapasPolares?: boolean;
  /**
   * Con `tapasPolares` en una vuelta completa: el largo (en unidades) de una repetición del relieve. La vuelta se
   * ajusta a un número entero de repeticiones, para que las vetas no se corten en la costura (θ = 0).
   */
  periodoTapas?: number;
  /**
   * Sin la pared interior o la exterior (las dos están por defecto): para anillos concéntricos que se tocan (los
   * niveles de una osteona del corte), cuyas paredes comunes quedan dentro de la pieza y no se ven.
   */
  paredInterior?: boolean;
  paredExterior?: boolean;
}

/**
 * Anillo con grosor alrededor del eje Y: entre los radios `interior` y `exterior`, de altura `alto`, en el
 * arco que empieza en `theta0` y dura `arco` radianes. Con un arco menor que la vuelta completa añade las dos
 * caras de corte (así el hueso se ve macizo al abrirlo). Con `interior` = 0 es un disco. UV en unidades.
 */
export function anillo(
  interior: number,
  exterior: number,
  alto: number,
  theta0 = 0,
  arco = DOS_PI,
  segmentos = SEGMENTOS,
  opciones: OpcionesAnillo = {},
): BufferGeometry {
  const dv = opciones.desplazamientoV ?? 0;
  const completo = arco >= DOS_PI - 1e-6;
  const n = Math.max(3, Math.ceil((segmentos * arco) / DOS_PI));
  const pared = (radio: number): BufferGeometry =>
    uvRevolucion(
      new CylinderGeometry(radio, radio, alto, n, 1, true, theta0, arco),
      theta0,
      arco,
      (_, y) => y + dv,
    );
  const partes: BufferGeometry[] = [];
  if (opciones.paredExterior ?? true) partes.push(pared(exterior));
  if (interior > 0 && (opciones.paredInterior ?? true)) partes.push(pared(interior));
  const medio = (interior + exterior) / 2;
  // Arco a media pared en las tapas polares (ajustado a un número entero de repeticiones en una vuelta completa).
  let arcoMedio = medio;
  if (completo && opciones.periodoTapas) {
    const p = opciones.periodoTapas;
    arcoMedio = (Math.max(1, Math.round((DOS_PI * medio) / p)) * p) / DOS_PI;
  }
  for (const y of [alto / 2, -alto / 2]) {
    // RingGeometry mide el ángulo desde +X en el plano XY; tras girarlo, θ de cilindro = φ + PI / 2.
    const tapa = new RingGeometry(interior, exterior, n, 1, theta0 - Math.PI / 2, arco);
    tapa.rotateX(-Math.PI / 2);
    tapa.translate(0, y, 0);
    const pos = tapa.getAttribute('position');
    const uv = tapa.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      if (opciones.tapasPolares) {
        // El vértice i está en la columna i % (n + 1) del anillo: su θ, sin atan2 (sin salto en la costura).
        const theta = theta0 + ((i % (n + 1)) / n) * arco;
        uv.setXY(i, Math.hypot(pos.getX(i), pos.getZ(i)), theta * arcoMedio);
      } else {
        uv.setXY(i, pos.getX(i), pos.getZ(i));
      }
    }
    uv.needsUpdate = true;
    partes.push(tapa);
  }
  if (!completo && exterior > interior) {
    for (const theta of [theta0, theta0 + arco]) {
      const cara = new PlaneGeometry(exterior - interior, alto);
      cara.rotateY(theta - Math.PI / 2);
      cara.translate(medio * Math.sin(theta), 0, medio * Math.cos(theta));
      uvCaraDeCorte(cara, dv);
      partes.push(cara);
    }
  }
  return unir(partes);
}

/**
 * Tronco de cono hueco alrededor de Y, de `yDesde` a `yHasta` (el signo da el sentido): radios interior y
 * exterior `interiorDesde`/`exteriorDesde` en un extremo y `interiorHasta`/`exteriorHasta` en el otro, en el
 * arco `theta0` + `arco`. Es la metáfisis: la diáfisis que se ensancha hacia la epífisis. Con un arco menor que
 * la vuelta completa añade las dos caras de corte (trapecios), igual que `anillo`.
 *
 * UV en unidades: en los conos, U = θ · radio del vértice y V = la altura en `yDesde` más la longitud a lo largo de
 * la generatriz; en `yDesde` coinciden con las de la pared de un `anillo` centrado en el origen del mismo radio (la
 * diáfisis), así que el relieve pasa de la diáfisis a la metáfisis sin costura. Trapecios: (distancia al eje, altura).
 */
export function tronco(
  interiorDesde: number,
  exteriorDesde: number,
  interiorHasta: number,
  exteriorHasta: number,
  yDesde: number,
  yHasta: number,
  theta0 = 0,
  arco = DOS_PI,
  segmentos = SEGMENTOS,
): BufferGeometry {
  const completo = arco >= DOS_PI - 1e-6;
  const n = Math.max(3, Math.ceil((segmentos * arco) / DOS_PI));
  const alto = Math.abs(yHasta - yDesde);
  const arriba = yHasta > yDesde;
  // CylinderGeometry: radiusTop en +Y.
  const [extArriba, extAbajo] = arriba
    ? [exteriorHasta, exteriorDesde]
    : [exteriorDesde, exteriorHasta];
  const [intArriba, intAbajo] = arriba
    ? [interiorHasta, interiorDesde]
    : [interiorDesde, interiorHasta];
  const centro = (yDesde + yHasta) / 2;
  const cono = (rArriba: number, rAbajo: number): BufferGeometry => {
    // Cuánto mide la generatriz por cada unidad de altura.
    const k = Math.hypot(alto, rArriba - rAbajo) / alto;
    return uvRevolucion(
      new CylinderGeometry(rArriba, rAbajo, alto, n, 2, true, theta0, arco),
      theta0,
      arco,
      (_, y) => yDesde + (y + centro - yDesde) * k,
    );
  };
  const partes: BufferGeometry[] = [cono(extArriba, extAbajo), cono(intArriba, intAbajo)];
  if (!completo) {
    for (const theta of [theta0, theta0 + arco]) {
      const s = Math.sin(theta);
      const c = Math.cos(theta);
      const y0 = -alto / 2;
      const y1 = alto / 2;
      // Trapecio en el plano del corte: interior y exterior abajo y arriba.
      const p = [
        [intAbajo, y0],
        [extAbajo, y0],
        [extArriba, y1],
        [intArriba, y1],
      ];
      // Indexada, como las piezas de CylinderGeometry: mergeGeometries exige que todas lo sean o ninguna.
      const cara = new Geometria();
      cara.setAttribute(
        'position',
        new Float32BufferAttribute(
          p.flatMap(([r, y]) => [r! * s, y!, r! * c]),
          3,
        ),
      );
      cara.setAttribute(
        'uv',
        new Float32BufferAttribute(
          p.flatMap(([r, y]) => [r!, y! + centro]),
          2,
        ),
      );
      cara.setIndex([0, 1, 2, 0, 2, 3]);
      cara.computeVertexNormals();
      partes.push(cara);
    }
  }
  const unida = unir(partes);
  unida.translate(0, centro, 0);
  return unida;
}

/**
 * Longitud del meridiano de un elipsoide de revolución (radio `radio`, semieje `semieje`) desde el polo +Y hasta
 * el ángulo polar `polar` (Simpson; el integrando es suave).
 */
export function longitudMeridiano(radio: number, semieje: number, polar: number): number {
  const pasos = 24;
  const h = polar / pasos;
  const f = (t: number) => Math.hypot(radio * Math.cos(t), semieje * Math.sin(t));
  let suma = f(0) + f(polar);
  for (let k = 1; k < pasos; k++) suma += (k % 2 === 1 ? 4 : 2) * f(k * h);
  return (suma * h) / 3;
}

/**
 * Cáscara de un elipsoide de revolución alrededor de Y (radio `radio` en X y Z, semieje `semieje` en Y),
 * centrada en (0, `yCentro`, 0), en el arco angular que empieza en `theta0` y dura `arco`. Con `poloDesde` y
 * `poloLargo` (radianes desde el polo +Y) se queda solo con un casquete. UV en unidades: U = θ · radio del vértice
 * y V = la longitud del meridiano desde el polo +Y.
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
  // En SphereGeometry x = -cos φ sen θpolo y z = sen φ sen θpolo, así que θ de cilindro = φ - PI / 2. Paralelos
  // repartidos como en la cáscara entera (22 en media vuelta): un casquete pequeño no necesita 22.
  const esfera = new SphereGeometry(
    1,
    Math.max(6, Math.ceil((SEGMENTOS * arco) / DOS_PI)),
    Math.max(6, Math.ceil((22 * poloLargo) / Math.PI)),
    theta0 + Math.PI / 2,
    arco,
    poloDesde,
    poloLargo,
  );
  esfera.scale(radio, semieje, radio);
  // La V original es 1 en el primer paralelo (`poloDesde`) y 0 en el último.
  uvRevolucion(esfera, theta0, arco, (_, __, v) =>
    longitudMeridiano(radio, semieje, poloDesde + (1 - v) * poloLargo),
  );
  esfera.translate(0, yCentro, 0);
  return esfera;
}

/**
 * Superficie de revolución (sin caras de corte) de un perfil `[radio, y]` alrededor de Y, en el arco `theta0` +
 * `arco`: un `LatheGeometry` con UV en unidades (U = θ · radio, V = la longitud del perfil desde su primer punto).
 */
export function revolucion(
  perfil: readonly (readonly [number, number])[],
  theta0 = 0,
  arco = DOS_PI,
  segmentos = 48,
): BufferGeometry {
  const largo: number[] = [0];
  for (let j = 1; j < perfil.length; j++) {
    const [r0, y0] = perfil[j - 1]!;
    const [r1, y1] = perfil[j]!;
    largo.push(largo[j - 1]! + Math.hypot(r1 - r0, y1 - y0));
  }
  const g = new LatheGeometry(
    perfil.map(([r, y]) => new Vector2(r, y)),
    segmentos,
    theta0,
    arco,
  );
  // La V original de LatheGeometry es j / (puntos - 1).
  return uvRevolucion(g, theta0, arco, (_, __, v) => largo[Math.round(v * (perfil.length - 1))]!);
}
