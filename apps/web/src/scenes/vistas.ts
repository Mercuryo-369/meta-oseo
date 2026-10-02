/**
 * Vistas de cámara con nombre y transiciones suaves (lógica pura, sin three ni Vue).
 *
 * El contenido no lleva coordenadas de cámara: elige una vista (`VistaCamara`, docs/content-schema.md
 * sección 9) y un zoom, y la escena calcula la posición a partir del tamaño del nodo. Todo se
 * expresa en el sistema del MODELO normalizado (stl.ts): esfera envolvente de radio 1, `+Y` arriba y
 * `+Z` hacia delante (el mentón). El lado derecho del sujeto es, por tanto, `-X`.
 */
import type { VistaCamara } from '@/content/nodos3d';
import { FOV_VERTICAL_GRADOS, RADIO_NORMALIZADO, distanciaParaEncajar } from './encuadre';

export type Vec3 = readonly [number, number, number];

const aRadianes = (grados: number): number => (grados * Math.PI) / 180;

/** Azimut (positivo hacia el lado derecho del sujeto) y elevación de cada vista, en grados. */
const ANGULOS_VISTA: Readonly<Record<VistaCamara, { azimut: number; elevacion: number }>> = {
  frontal: { azimut: 0, elevacion: 12 },
  posterior: { azimut: 180, elevacion: 12 },
  lateral_derecha: { azimut: 90, elevacion: 12 },
  lateral_izquierda: { azimut: -90, elevacion: 12 },
  // Ni 90º ni -90º exactos: OrbitControls no admite el polo y la cámara giraría sin control.
  superior: { azimut: 0, elevacion: 78 },
  inferior: { azimut: 0, elevacion: -78 },
  oblicua: { azimut: 40, elevacion: 28 },
  // Cámara del lado contrario mirando la cara MEDIAL (interna) de la rama: `medial_derecha` está en el lado
  // izquierdo del sujeto (+X), dentro del arco, y mira hacia el lado derecho. Algo adelantada y elevada para
  // asomarse por encima de la rama contraria y ver de frente el foramen y la língula.
  medial_derecha: { azimut: -75, elevacion: 25 },
  medial_izquierda: { azimut: 75, elevacion: 25 },
};

/**
 * Dirección UNITARIA desde el objetivo hacia la cámara para una vista con nombre. `lateral_derecha`
 * coloca la cámara del lado derecho del sujeto (`-X`) y `frontal` delante (`+Z`).
 */
export function direccionDeVista(vista: VistaCamara): Vec3 {
  const { azimut, elevacion } = ANGULOS_VISTA[vista] ?? ANGULOS_VISTA.frontal;
  const az = aRadianes(azimut);
  const el = aRadianes(elevacion);
  return [-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
}

/* -------------------------------------------------------------------------------------------
 * Encuadre de un nodo
 * ----------------------------------------------------------------------------------------- */

/** Radio (en unidades del modelo) de la zona que abarca un nodo por ancla, que no tiene tamaño propio. */
export const RADIO_ZONA_ANCLA = 0.45;

/** Distancia mínima al objetivo: cerca del plano cercano (0,1) el hueso se recorta. */
export const DISTANCIA_MIN_ABSOLUTA = 0.3;

/**
 * Distancia máxima de las vistas mediales al nodo: la cámara se queda DENTRO del arco de la mandíbula (entre las
 * dos ramas, a unos 0,5 de la cara medial que mira) en vez de detrás de la rama contraria. Solo rige al
 * encuadrar un nodo (radio menor que el del modelo entero): la vista medial del modelo entero no tiene arco.
 */
export const DISTANCIA_MAX_VISTA_MEDIAL = 0.9;
const VISTAS_MEDIALES: readonly VistaCamara[] = ['medial_derecha', 'medial_izquierda'];

export interface LimitesZoom {
  minima: number;
  maxima: number;
}

/**
 * Límites del zoom para explorar nodos: la mínima NO depende del tamaño del modelo entero (con
 * `limitesDistancia` de encuadre.ts, 1,4 x radio, no se podría acercar a un nodo pequeño) sino de
 * `DISTANCIA_MIN_ABSOLUTA`; la máxima deja ver el modelo completo con holgura.
 */
export function limitesZoomExploracion(distanciaEncuadreGeneral: number): LimitesZoom {
  return {
    minima: DISTANCIA_MIN_ABSOLUTA,
    maxima: Math.max(DISTANCIA_MIN_ABSOLUTA * 4, distanciaEncuadreGeneral * 2.2),
  };
}

export interface EntradaEncuadre {
  /** Punto al que mira la cámara (centro del nodo o ancla), en coordenadas del modelo. */
  centro: Vec3;
  /** Radio de la zona a encuadrar, relativo al TAMAÑO DEL NODO (no del modelo entero). */
  radio: number;
  vista: VistaCamara;
  /** 1 = encuadre automático del nodo; 2 = el doble de cerca; 0,5 = la mitad (0,5 a 3). */
  zoom: number;
  /** Ancho / alto del lienzo. */
  aspecto: number;
  fovVerticalGrados?: number;
}

export interface EncuadreCamara {
  objetivo: Vec3;
  /** Unitaria, desde el objetivo hacia la cámara. */
  direccion: Vec3;
  distancia: number;
}

function acotar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

/**
 * Encuadre que deja el nodo (esfera de `radio` alrededor de `centro`) ocupando el lienzo, mirado
 * desde `vista`, con el `zoom` del contenido. La distancia sale de `distanciaParaEncajar` (que ya
 * respeta el eje más estrecho en móviles verticales), dividida entre el zoom y acotada a `limites`.
 * Entradas absurdas (zoom 0, radio negativo, NaN) se corrigen en vez de fallar.
 */
export function calcularEncuadre(entrada: EntradaEncuadre, limites?: LimitesZoom): EncuadreCamara {
  const radio = Number.isFinite(entrada.radio) && entrada.radio > 0 ? entrada.radio : 1;
  const zoom = Number.isFinite(entrada.zoom) && entrada.zoom > 0 ? entrada.zoom : 1;
  const base = distanciaParaEncajar(
    radio,
    entrada.aspecto,
    entrada.fovVerticalGrados ?? FOV_VERTICAL_GRADOS,
  );
  let bruta = base / zoom;
  if (radio < RADIO_NORMALIZADO && VISTAS_MEDIALES.includes(entrada.vista)) {
    bruta = Math.min(bruta, DISTANCIA_MAX_VISTA_MEDIAL);
  }
  return {
    objetivo: entrada.centro,
    direccion: direccionDeVista(entrada.vista),
    distancia: limites ? acotar(bruta, limites.minima, limites.maxima) : bruta,
  };
}

/* -------------------------------------------------------------------------------------------
 * Interpolación de la cámara (esférica alrededor del objetivo)
 * ----------------------------------------------------------------------------------------- */

export interface EstadoCamara {
  objetivo: Vec3;
  posicion: Vec3;
}

/** Estado de cámara que corresponde a un encuadre. */
export function estadoDeEncuadre(encuadre: EncuadreCamara): EstadoCamara {
  const { objetivo, direccion, distancia } = encuadre;
  return {
    objetivo,
    posicion: [
      objetivo[0] + direccion[0] * distancia,
      objetivo[1] + direccion[1] * distancia,
      objetivo[2] + direccion[2] * distancia,
    ],
  };
}

interface Esfericas {
  radio: number;
  /** Ángulo alrededor de Y medido desde +Z: `atan2(x, z)`. */
  azimut: number;
  /** Ángulo desde +Y (0 = arriba del todo). */
  polar: number;
}

function aEsfericas(x: number, y: number, z: number): Esfericas {
  const radio = Math.hypot(x, y, z);
  if (radio < 1e-9) return { radio: 0, azimut: 0, polar: Math.PI / 2 };
  return { radio, azimut: Math.atan2(x, z), polar: Math.acos(acotar(y / radio, -1, 1)) };
}

function deEsfericas(e: Esfericas): [number, number, number] {
  const senoPolar = Math.sin(e.polar);
  return [
    e.radio * senoPolar * Math.sin(e.azimut),
    e.radio * Math.cos(e.polar),
    e.radio * senoPolar * Math.cos(e.azimut),
  ];
}

/** Diferencia angular por el camino corto, en (-PI, PI]. Con 180º exactos gira en sentido positivo. */
function diferenciaAngular(desde: number, hasta: number): number {
  let d = (hasta - desde) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  else if (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * Estado de la cámara a la fracción `t` (0 a 1) de la transición. El objetivo se interpola en
 * línea recta y la posición de la cámara respecto a él en coordenadas ESFÉRICAS por el camino
 * corto: pasar de la vista frontal a la posterior rodea el hueso en vez de atravesarlo.
 */
export function interpolarCamara(
  desde: EstadoCamara,
  hasta: EstadoCamara,
  t: number,
): EstadoCamara {
  const f = acotar(Number.isFinite(t) ? t : 1, 0, 1);
  const objetivo: [number, number, number] = [
    desde.objetivo[0] + (hasta.objetivo[0] - desde.objetivo[0]) * f,
    desde.objetivo[1] + (hasta.objetivo[1] - desde.objetivo[1]) * f,
    desde.objetivo[2] + (hasta.objetivo[2] - desde.objetivo[2]) * f,
  ];
  const a = aEsfericas(
    desde.posicion[0] - desde.objetivo[0],
    desde.posicion[1] - desde.objetivo[1],
    desde.posicion[2] - desde.objetivo[2],
  );
  const b = aEsfericas(
    hasta.posicion[0] - hasta.objetivo[0],
    hasta.posicion[1] - hasta.objetivo[1],
    hasta.posicion[2] - hasta.objetivo[2],
  );
  const offset = deEsfericas({
    radio: a.radio + (b.radio - a.radio) * f,
    azimut: a.azimut + diferenciaAngular(a.azimut, b.azimut) * f,
    polar: a.polar + (b.polar - a.polar) * f,
  });
  return {
    objetivo,
    posicion: [objetivo[0] + offset[0], objetivo[1] + offset[1], objetivo[2] + offset[2]],
  };
}

/** Aceleración y frenado suaves; entradas fuera de 0 a 1 se acotan. */
export function suavizar(t: number): number {
  const f = acotar(Number.isFinite(t) ? t : 1, 0, 1);
  return f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2;
}

/* -------------------------------------------------------------------------------------------
 * Transición
 * ----------------------------------------------------------------------------------------- */

/** Duración de la transición entre dos vistas, en ms. */
export const DURACION_TRANSICION_MS = 700;

export interface Transicion {
  /** Estado en el instante `ahoraMs` (mismo reloj que `inicioMs`) y si ya terminó. */
  paso(ahoraMs: number): { estado: EstadoCamara; terminada: boolean };
}

/**
 * Transición de `desde` a `hasta`. Con `duracionMs <= 0` (movimiento reducido) termina en el primer
 * paso y ese paso ya devuelve el estado final: sin animación, sin fotogramas intermedios.
 */
export function crearTransicion(
  desde: EstadoCamara,
  hasta: EstadoCamara,
  inicioMs: number,
  duracionMs: number = DURACION_TRANSICION_MS,
): Transicion {
  return {
    paso(ahoraMs) {
      if (!(duracionMs > 0)) return { estado: hasta, terminada: true };
      const t = (ahoraMs - inicioMs) / duracionMs;
      if (!(t < 1)) return { estado: hasta, terminada: true };
      return { estado: interpolarCamara(desde, hasta, suavizar(Math.max(0, t))), terminada: false };
    },
  };
}

/* -------------------------------------------------------------------------------------------
 * Nombres para la interfaz y órdenes de cámara
 * ----------------------------------------------------------------------------------------- */

/** Nombre de cada vista para la interfaz (botones y anuncios). */
export const ETIQUETA_VISTA: Readonly<Record<VistaCamara, string>> = {
  frontal: 'Frontal',
  posterior: 'Posterior',
  lateral_derecha: 'Lateral derecha',
  lateral_izquierda: 'Lateral izquierda',
  superior: 'Superior',
  inferior: 'Inferior',
  oblicua: 'Oblicua',
  medial_derecha: 'Medial derecha',
  medial_izquierda: 'Medial izquierda',
};

/**
 * Lo que la interfaz le pide a la cámara. `id` crece con cada orden: dos órdenes iguales seguidas
 * (volver a pulsar el mismo nodo) se distinguen y la cámara vuelve a enfocar.
 */
export type OrdenCamara =
  | { id: number; tipo: 'estado'; estado: EstadoCamara }
  | { id: number; tipo: 'zoom'; factor: number };

/** Factor de zoom de los botones de acercar y alejar. */
export const FACTOR_ZOOM_BOTON = 1.4;

/**
 * Estado que resulta de acercar (`factor > 1`) o alejar (`factor < 1`) la cámara manteniendo su
 * dirección y su objetivo, con la distancia acotada a `limites`. Un factor no válido no mueve nada.
 */
export function estadoConZoom(
  actual: EstadoCamara,
  factor: number,
  limites: LimitesZoom,
): EstadoCamara {
  if (!Number.isFinite(factor) || factor <= 0) return actual;
  const dx = actual.posicion[0] - actual.objetivo[0];
  const dy = actual.posicion[1] - actual.objetivo[1];
  const dz = actual.posicion[2] - actual.objetivo[2];
  const distancia = Math.hypot(dx, dy, dz);
  if (!(distancia > 1e-9)) return actual;
  const nueva = acotar(distancia / factor, limites.minima, limites.maxima);
  const k = nueva / distancia;
  return {
    objetivo: actual.objetivo,
    posicion: [
      actual.objetivo[0] + dx * k,
      actual.objetivo[1] + dy * k,
      actual.objetivo[2] + dz * k,
    ],
  };
}
