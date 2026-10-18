/**
 * Carga del modelo de la actividad `exploracion-3d`, con la misma forma para los dos modelos:
 *  - `mandibula`: el STL provisional de una sola malla (F1-12). Sus nodos se ubican con `ancla` o con
 *    las posiciones aproximadas de `ANCLAS_PROVISIONALES`. Cuando exista el GLB de F0-09 se cambia la
 *    carga aquí sin tocar la escena ni la actividad.
 *  - `celulas`: un GLB de piezas separadas (F0-10, aún no existe). Sus nodos se buscan por nombre.
 *  - `hueso_largo`: un hueso largo serrado que se construye por código (`hueso_largo/modeloHuesoLargo.ts`), sin
 *    descarga. Sus regiones son piezas con nombre; la etiqueta de cada una va al punto que da el modelo.
 *
 * La descarga y el parseo ocurren FUERA del lienzo (el indicador de carga es HTML normal); al desmontar
 * se cancela la descarga y se libera lo cargado. Un fallo de carga NUNCA bloquea la actividad: la lista de
 * nodos sigue funcionando (docs/content-schema.md, 7.6).
 */
import { computed, onBeforeUnmount, onErrorCaptured, ref, shallowRef } from 'vue';
import type { ComputedRef, Ref, ShallowRef } from 'vue';
import { Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { Modelo3d } from '@/content/nodos3d';
import { ubicarNodoMandibula } from './anclas';
import type { CajaModelo, NodoUbicable, UbicacionNodo } from './anclas';
import { RADIO_NORMALIZADO, distanciaParaEncajar, posicionInicialCamara } from './encuadre';
import {
  RADIO_MIN_NODO,
  liberarEscena,
  normalizarEscena,
  parsearGlb,
  ubicarNodoGlb,
  urlGlb,
} from './glb';
import { ErrorModelo, descargarModelo } from './stl';
import { crearHuesoLargo, esRegionHuesoLargo, puntoDeRegion } from './hueso_largo/modeloHuesoLargo';
import { hayWebGL2 } from './webgl';
import { useModeloMandibula } from './useModeloMandibula';
import type { EstadoEscena } from './useModeloMandibula';

export type { EstadoEscena };

export interface OpcionesModeloExploracion {
  modelo: Modelo3d;
  /** Nombre del componente para los mensajes de la consola. */
  nombre: string;
  /** Ancho / alto del contenedor en este momento (encuadre inicial de la cámara). */
  aspecto: () => number;
}

export interface ModeloExploracion {
  estado: Ref<EstadoEscena>;
  mensajeError: Ref<string>;
  porcentaje: ComputedRef<number | null>;
  camaraInicial: ShallowRef<Vector3 | null>;
  /** Malla única (STL provisional). Nula con un GLB. */
  geometria: ShallowRef<BufferGeometry | null>;
  /** Escena completa (GLB). Nula con el STL. */
  raiz: ShallowRef<Object3D | null>;
  /** Caja envolvente del modelo ya normalizado; nula hasta que carga. */
  caja: ComputedRef<CajaModelo | null>;
  iniciar: () => void;
  cargar: () => Promise<void>;
  fallarRenderizado: (error: unknown) => void;
  /** Dónde está el nodo sobre el modelo, o `null` si no se puede ubicar (la cámara vuelve al general). */
  ubicar: (nodo: NodoUbicable) => UbicacionNodo | null;
}

function cajaDeGeometria(geometria: BufferGeometry | null): CajaModelo | null {
  const caja = geometria?.boundingBox;
  if (!caja) return null;
  return {
    min: [caja.min.x, caja.min.y, caja.min.z],
    max: [caja.max.x, caja.max.y, caja.max.z],
  };
}

function usarMandibula(opciones: OpcionesModeloExploracion): ModeloExploracion {
  const base = useModeloMandibula({ nombre: opciones.nombre, aspecto: opciones.aspecto });
  const caja = computed(() => cajaDeGeometria(base.geometria.value));
  return {
    estado: base.estado,
    mensajeError: base.mensajeError,
    porcentaje: base.porcentaje,
    camaraInicial: base.camaraInicial,
    geometria: base.geometria,
    raiz: shallowRef(null),
    caja,
    iniciar: base.iniciar,
    cargar: base.cargar,
    fallarRenderizado: base.fallarRenderizado,
    ubicar: (nodo) => (caja.value ? ubicarNodoMandibula(nodo, caja.value) : null),
  };
}

function usarGlb(opciones: OpcionesModeloExploracion): ModeloExploracion {
  const { nombre, aspecto, modelo } = opciones;
  const estado = ref<EstadoEscena>('detectando');
  const mensajeError = ref('');
  const progreso = ref<number | null>(null);
  const raiz = shallowRef<Object3D | null>(null);
  const cajaRef = shallowRef<CajaModelo | null>(null);
  const camaraInicial = shallowRef<Vector3 | null>(null);
  const porcentaje = computed(() =>
    progreso.value === null ? null : Math.round(progreso.value * 100),
  );
  let descarga: AbortController | null = null;

  function soltarEscena(): void {
    if (raiz.value) liberarEscena(raiz.value);
    raiz.value = null;
    cajaRef.value = null;
  }

  async function cargar(): Promise<void> {
    descarga?.abort();
    const control = new AbortController();
    descarga = control;
    estado.value = 'cargando';
    progreso.value = null;
    mensajeError.value = '';
    try {
      const bytes = await descargarModelo(urlGlb(modelo), {
        signal: control.signal,
        onProgreso: (p) => {
          progreso.value = p.fraccion;
        },
      });
      const normalizada = normalizarEscena(await parsearGlb(bytes));
      if (control.signal.aborted) {
        liberarEscena(normalizada.raiz);
        return;
      }
      soltarEscena();
      raiz.value = normalizada.raiz;
      cajaRef.value = normalizada.caja;
      camaraInicial.value = new Vector3(
        ...posicionInicialCamara(distanciaParaEncajar(RADIO_NORMALIZADO, aspecto())),
      );
      estado.value = 'listo';
    } catch (error) {
      if (control.signal.aborted) return;
      console.error(`[${nombre}] no se pudo cargar el modelo`, error);
      mensajeError.value =
        error instanceof ErrorModelo ? error.message : 'No se pudo preparar el modelo 3D.';
      estado.value = 'error';
    }
  }

  function iniciar(): void {
    if (!hayWebGL2()) {
      estado.value = 'sin_webgl';
      return;
    }
    void cargar();
  }

  function fallarRenderizado(error: unknown): void {
    console.error(`[${nombre}] falló el renderizado 3D`, error);
    mensajeError.value = 'No se pudo iniciar el renderizado 3D en este dispositivo.';
    estado.value = 'error';
  }

  onErrorCaptured((error) => {
    if (estado.value !== 'listo') return true;
    fallarRenderizado(error);
    return false;
  });

  onBeforeUnmount(() => {
    descarga?.abort();
    soltarEscena();
  });

  return {
    estado,
    mensajeError,
    porcentaje,
    camaraInicial,
    geometria: shallowRef(null),
    raiz,
    caja: computed(() => cajaRef.value),
    iniciar,
    cargar,
    fallarRenderizado,
    ubicar: (nodo) => (raiz.value ? ubicarNodoGlb(raiz.value, nodo.id) : null),
  };
}

/** Hueso largo serrado, construido por código: listo en el acto, sin descarga. */
function usarHuesoLargo(opciones: OpcionesModeloExploracion): ModeloExploracion {
  const { nombre, aspecto } = opciones;
  const estado = ref<EstadoEscena>('detectando');
  const mensajeError = ref('');
  const raiz = shallowRef<Object3D | null>(null);
  const cajaRef = shallowRef<CajaModelo | null>(null);
  const camaraInicial = shallowRef<Vector3 | null>(null);
  let hueso: Object3D | null = null;

  function soltar(): void {
    if (raiz.value) liberarEscena(raiz.value);
    raiz.value = null;
    cajaRef.value = null;
    hueso = null;
  }

  async function cargar(): Promise<void> {
    estado.value = 'cargando';
    mensajeError.value = '';
    try {
      soltar();
      const modelo = crearHuesoLargo();
      const normalizada = normalizarEscena(modelo);
      hueso = modelo;
      raiz.value = normalizada.raiz;
      cajaRef.value = normalizada.caja;
      camaraInicial.value = new Vector3(
        ...posicionInicialCamara(distanciaParaEncajar(RADIO_NORMALIZADO, aspecto())),
      );
      estado.value = 'listo';
    } catch (error) {
      console.error(`[${nombre}] no se pudo construir el hueso largo`, error);
      mensajeError.value = 'No se pudo preparar el modelo 3D.';
      estado.value = 'error';
    }
  }

  function iniciar(): void {
    if (!hayWebGL2()) {
      estado.value = 'sin_webgl';
      return;
    }
    void cargar();
  }

  function fallarRenderizado(error: unknown): void {
    console.error(`[${nombre}] falló el renderizado 3D`, error);
    mensajeError.value = 'No se pudo iniciar el renderizado 3D en este dispositivo.';
    estado.value = 'error';
  }

  /** Punto de la etiqueta de la región, pasado del modelo a la escena normalizada. */
  function ubicar(nodo: NodoUbicable): UbicacionNodo | null {
    if (!hueso || !raiz.value || !esRegionHuesoLargo(nodo.id)) return null;
    const region = puntoDeRegion(nodo.id);
    raiz.value.updateMatrixWorld(true);
    const punto = hueso.localToWorld(new Vector3(...region.punto));
    return {
      punto: [punto.x, punto.y, punto.z],
      radio: Math.max(RADIO_MIN_NODO, region.radio * raiz.value.scale.x),
      origen: 'nodo_glb',
      normal: region.normal,
    };
  }

  onErrorCaptured((error) => {
    if (estado.value !== 'listo') return true;
    fallarRenderizado(error);
    return false;
  });

  onBeforeUnmount(soltar);

  return {
    estado,
    mensajeError,
    porcentaje: computed(() => null),
    camaraInicial,
    geometria: shallowRef(null),
    raiz,
    caja: computed(() => cajaRef.value),
    iniciar,
    cargar,
    fallarRenderizado,
    ubicar,
  };
}

/** El modelo se elige al montar: quien use esta función debe volver a montarse si cambia `modelo`. */
export function useModeloExploracion(opciones: OpcionesModeloExploracion): ModeloExploracion {
  if (opciones.modelo === 'mandibula') return usarMandibula(opciones);
  if (opciones.modelo === 'hueso_largo') return usarHuesoLargo(opciones);
  return usarGlb(opciones);
}
