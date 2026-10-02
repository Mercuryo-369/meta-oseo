/**
 * Registro de escenas PROCEDURALES: escenas 3D hechas por código, con línea de tiempo, cuyo estado es una
 * función pura del tiempo `t` (docs/escena-3d-bmu.md). El contenido las pide por nombre
 * (`config.escena` de una actividad `exploracion-3d` con `modelo: "procedural"`) y la actividad las
 * descarga solo cuando se montan: este archivo NO importa three ni TresJS, solo declara cada escena y cómo
 * cargar su componente.
 *
 * Añadir otra escena = crear su carpeta en `scenes/procedural/<nombre>/` (estado puro, geometría y componente
 * de escena), registrarla aquí y añadir su nombre y sus vistas en `content/nodos3d.ts`.
 */
import type { Component } from 'vue';
import { ESCENAS_PROCEDURALES, vistasDeEscenaProcedural } from '@/content/nodos3d';
import type { EscenaProcedural } from '@/content/nodos3d';
import { HITOS_BMU, estadoBmu } from './bmu/estado';
import { HITOS_ALVEOLAR, estadoAlveolar } from './alveolar/estado';
import { HITOS_HUESO, estadoHueso } from './hueso/estado';
import { HITOS_MATRIZ, estadoMatriz } from './matriz/estado';
import { HITOS_ALVEOLO, estadoAlveolo } from './alveolo/estado';
import { HITOS_TRABECULAR, estadoTrabecular } from './trabecular/estado';
import { HITOS_FRACTURA, estadoFractura } from './fractura/estado';
import { HITOS_ORTODONCIA, estadoOrtodoncia } from './ortodoncia/estado';
import { HITOS_VESICULA, estadoVesicula } from './vesicula/estado';
import { HITOS_DOS_RUTAS, estadoDosRutas } from './dos_rutas/estado';
import { HITOS_MANDIBULA_FETAL, estadoMandibulaFetal } from './mandibula_fetal/estado';
import { HITOS_OSTEOCLASTO, estadoOsteoclasto } from './osteoclasto/estado';
import { HITOS_OSTEOCITO, estadoOsteocito } from './osteocito/estado';
import { HITOS_OSTEOBLASTO, estadoOsteoblasto } from './osteoblasto/estado';

/** Props que recibe el componente de cualquier escena procedural (contrato común). */
export interface PropsEscenaProcedural {
  /** Tiempo de la línea de tiempo, de 0 a 1. */
  t: number;
  /** Vista de cámara con nombre (una de `vistas` de la definición). */
  vista: string;
  /** Sube cada vez que la cámara debe volver a la `vista` aunque no haya cambiado (botón "Vista de la fase"). */
  ordenVista: number;
  /** Orden de acercar o alejar (botones de zoom); cada orden lleva un `id` distinto. */
  ordenZoom: { id: number; factor: number } | null;
  /** Descripción para lectores de pantalla. */
  alt: string;
  /** Con `true`: sin transiciones de cámara, sin inercia y sin vibraciones. */
  reducirMovimiento: boolean;
}

/** Eventos que emite el componente de cualquier escena procedural. */
export interface EventosEscenaProcedural {
  /** Estado de la escena: `listo`, `sin_webgl`, `error`... (mismos valores que `EstadoEscena`). */
  estado: [estado: 'detectando' | 'sin_webgl' | 'cargando' | 'error' | 'listo'];
  /** El estudiante giró o acercó la cámara con el dedo o el ratón: la vista deja de seguir a la fase. */
  camaraLibre: [];
}

export interface DefinicionEscenaProcedural {
  id: EscenaProcedural;
  titulo: string;
  /** Duración de la reproducción completa (de t = 0 a t = 1) a velocidad 1, en segundos. */
  duracionSeg: number;
  /** Vistas de cámara con nombre; la primera es la general. */
  vistas: readonly string[];
  /** Instante `t` canónico de cada fase (el contenido debe usar estos `t` en su línea de tiempo). */
  hitos: Readonly<Record<string, number>>;
  /** Estado de la escena en `t`: función pura (la misma `t` da siempre lo mismo). */
  estado: (t: number) => object;
  /** Carga perezosa del componente que dibuja la escena (aquí viven three y TresJS). */
  cargar: () => Promise<{ default: Component }>;
}

const ESCENAS: Readonly<Record<EscenaProcedural, DefinicionEscenaProcedural>> = {
  bmu_remodelado: {
    id: 'bmu_remodelado',
    titulo: 'Ciclo de remodelado de una BMU cortical',
    duracionSeg: 42,
    vistas: vistasDeEscenaProcedural('bmu_remodelado'),
    hitos: HITOS_BMU,
    estado: estadoBmu,
    cargar: () => import('./bmu/EscenaBmu.vue'),
  },
  hueso_largo_a_osteona: {
    id: 'hueso_largo_a_osteona',
    titulo: 'Del hueso largo a la osteona',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('hueso_largo_a_osteona'),
    hitos: HITOS_HUESO,
    estado: estadoHueso,
    cargar: () => import('./hueso/EscenaHueso.vue'),
  },
  matriz_osea: {
    id: 'matriz_osea',
    titulo: 'Dentro de la matriz ósea: del fragmento al cristal',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('matriz_osea'),
    hitos: HITOS_MATRIZ,
    estado: estadoMatriz,
    cargar: () => import('./matriz/EscenaMatriz.vue'),
  },
  hueso_alveolar: {
    id: 'hueso_alveolar',
    titulo: 'El hueso alveolar por dentro',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('hueso_alveolar'),
    hitos: HITOS_ALVEOLAR,
    estado: estadoAlveolar,
    cargar: () => import('./alveolar/EscenaAlveolar.vue'),
  },
  alveolo_postextraccion: {
    id: 'alveolo_postextraccion',
    titulo: 'El alvéolo tras la extracción y el reborde con los años',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('alveolo_postextraccion'),
    hitos: HITOS_ALVEOLO,
    estado: estadoAlveolo,
    cargar: () => import('./alveolo/EscenaAlveolo.vue'),
  },
  hueso_trabecular_tiempo: {
    id: 'hueso_trabecular_tiempo',
    titulo: 'Hueso trabecular que envejece',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('hueso_trabecular_tiempo'),
    hitos: HITOS_TRABECULAR,
    estado: estadoTrabecular,
    cargar: () => import('./trabecular/EscenaTrabecular.vue'),
  },
  reparacion_fractura: {
    id: 'reparacion_fractura',
    titulo: 'Cómo cicatriza una fractura',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('reparacion_fractura'),
    hitos: HITOS_FRACTURA,
    estado: estadoFractura,
    cargar: () => import('./fractura/EscenaFractura.vue'),
  },
  movimiento_ortodontico: {
    id: 'movimiento_ortodontico',
    titulo: 'Un movimiento ortodóntico, lado a lado',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('movimiento_ortodontico'),
    hitos: HITOS_ORTODONCIA,
    estado: estadoOrtodoncia,
    cargar: () => import('./ortodoncia/EscenaOrtodoncia.vue'),
  },
  vesicula_matriz: {
    id: 'vesicula_matriz',
    titulo: 'La vesícula de matriz y el primer cristal',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('vesicula_matriz'),
    hitos: HITOS_VESICULA,
    estado: estadoVesicula,
    cargar: () => import('./vesicula/EscenaVesicula.vue'),
  },
  dos_rutas_osificacion: {
    id: 'dos_rutas_osificacion',
    titulo: 'Dos rutas para construir hueso, lado a lado',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('dos_rutas_osificacion'),
    hitos: HITOS_DOS_RUTAS,
    estado: estadoDosRutas,
    cargar: () => import('./dos_rutas/EscenaDosRutas.vue'),
  },
  mandibula_fetal: {
    id: 'mandibula_fetal',
    titulo: 'La mandíbula fetal: de Meckel al nacimiento',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('mandibula_fetal'),
    hitos: HITOS_MANDIBULA_FETAL,
    estado: estadoMandibulaFetal,
    cargar: () => import('./mandibula_fetal/EscenaMandibulaFetal.vue'),
  },
  osteoclasto_resorcion: {
    id: 'osteoclasto_resorcion',
    titulo: 'El osteoclasto: de precursores a laguna de resorción',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('osteoclasto_resorcion'),
    hitos: HITOS_OSTEOCLASTO,
    estado: estadoOsteoclasto,
    cargar: () => import('./osteoclasto/EscenaOsteoclasto.vue'),
  },
  osteocito_red: {
    id: 'osteocito_red',
    titulo: 'El osteocito y su red lacuno-canalicular',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('osteocito_red'),
    hitos: HITOS_OSTEOCITO,
    estado: estadoOsteocito,
    cargar: () => import('./osteocito/EscenaOsteocito.vue'),
  },
  osteoblasto_celula: {
    id: 'osteoblasto_celula',
    titulo: 'El osteoblasto activo, de precursor a osteocito',
    duracionSeg: 36,
    vistas: vistasDeEscenaProcedural('osteoblasto_celula'),
    hitos: HITOS_OSTEOBLASTO,
    estado: estadoOsteoblasto,
    cargar: () => import('./osteoblasto/EscenaOsteoblasto.vue'),
  },
};

export function hayEscenaProcedural(id: string): id is EscenaProcedural {
  return (ESCENAS_PROCEDURALES as readonly string[]).includes(id);
}

/** La definición de la escena, o `undefined` si el nombre no está registrado. */
export function escenaProcedural(id: string | undefined): DefinicionEscenaProcedural | undefined {
  return id !== undefined && hayEscenaProcedural(id) ? ESCENAS[id] : undefined;
}

export function escenasProcedurales(): readonly DefinicionEscenaProcedural[] {
  return ESCENAS_PROCEDURALES.map((id) => ESCENAS[id]);
}
