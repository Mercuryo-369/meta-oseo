/**
 * Store del contexto pedagógico: dónde está el estudiante y qué está viendo.
 * Es el eje del mentor de IA (PLAN §3): `toPayload()` produce el objeto que viaja en cada
 * petición a POST /api/chat.
 *
 * CONGELADO desde F1-09. El tipo `ContextoPedagogico` es el de docs/api-contract.md y
 * PLAN.md §3; el backend lo valida con app/schemas/contexto.py (camelCase). Cambiarlo
 * exige actualizar PLAN.md, este store y ese schema a la vez.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { MAX_INTERACCIONES_RECIENTES, MAX_LONGITUD_CONTEXTO } from '@/config';
import { useProgresoStore } from '@/stores/progreso';

export type ContextoPedagogico = {
  modulo: 1 | 2 | 3 | 4 | 5 | 6;
  seccion: string;
  actividadActual?: {
    id: string;
    tipo:
      | 'multicapa'
      | 'arrastre-molecular'
      | 'relacion-columnas'
      | 'quiz'
      | 'video-texto'
      | 'exploracion-3d'
      | 'clasificacion'
      | 'curva-esfuerzo';
    intentos: number;
    completada: boolean;
  };
  estructuraSeleccionada?: string;
  moleculaSeleccionada?: string;
  nivel: 'pregrado' | 'posgrado';
  tiempoEnSeccionSeg: number;
  interaccionesRecientes: string[]; // máximo 10
  progreso: {
    modulosCompletados: number[];
    puntajeTotal: number;
    logros: string[];
  };
};

export type ModuloContexto = ContextoPedagogico['modulo'];
export type ActividadActual = NonNullable<ContextoPedagogico['actividadActual']>;
type NivelContexto = ContextoPedagogico['nivel'];

/** Sección con la que se abre un módulo o el inicio, antes de que la página fije la suya. */
export const SECCION_INICIAL = 'inicio';

/** Recorta a 64 caracteres (límite del contrato) para que el backend nunca rechace el contexto. */
function acotar(texto: string): string {
  return [...texto].slice(0, MAX_LONGITUD_CONTEXTO).join('');
}

export const useContextoStore = defineStore('contextoPedagogico', () => {
  const modulo = ref<ModuloContexto>(1);
  const seccion = ref<string>(SECCION_INICIAL);
  const actividadActual = ref<ActividadActual | undefined>(undefined);
  const estructuraSeleccionada = ref<string | undefined>(undefined);
  const moleculaSeleccionada = ref<string | undefined>(undefined);
  const nivel = ref<NivelContexto>('pregrado');
  const tiempoEnSeccionSeg = ref(0);
  const interaccionesRecientes = ref<string[]>([]);

  /** Lo que el estudiante tiene "en pantalla" y vuelve a empezar al cambiar de sección. */
  function limpiarSeleccion(): void {
    actividadActual.value = undefined;
    estructuraSeleccionada.value = undefined;
    moleculaSeleccionada.value = undefined;
    tiempoEnSeccionSeg.value = 0;
  }

  /** Cambia de módulo. Si es otro, la sección vuelve a la inicial y se limpia la selección. */
  function setModulo(n: ModuloContexto): void {
    if (n === modulo.value) return;
    modulo.value = n;
    seccion.value = SECCION_INICIAL;
    limpiarSeleccion();
  }

  /** Cambia de sección. Si es otra, reinicia el tiempo en sección y la selección. */
  function setSeccion(id: string): void {
    const nueva = acotar(id.trim()) || SECCION_INICIAL;
    if (nueva === seccion.value) return;
    seccion.value = nueva;
    limpiarSeleccion();
  }

  /** Actividad que el estudiante tiene abierta (o `undefined` al salir de ella). */
  function setActividad(actividad: ActividadActual | undefined): void {
    actividadActual.value = actividad ? { ...actividad, id: acotar(actividad.id) } : undefined;
  }

  /** Registra un evento reciente. Se conservan los 10 últimos: los más antiguos se descartan. */
  function registrarInteraccion(evento: string): void {
    const limpio = acotar(evento.trim());
    if (!limpio) return;
    interaccionesRecientes.value = [...interaccionesRecientes.value, limpio].slice(
      -MAX_INTERACCIONES_RECIENTES,
    );
  }

  /** Vacía los eventos recientes (al cambiar de módulo: los del anterior ya no valen). */
  function limpiarInteracciones(): void {
    interaccionesRecientes.value = [];
  }

  function setEstructura(id: string | undefined): void {
    estructuraSeleccionada.value = id ? acotar(id) : undefined;
  }

  function setMolecula(id: string | undefined): void {
    moleculaSeleccionada.value = id ? acotar(id) : undefined;
  }

  function setNivel(n: NivelContexto): void {
    nivel.value = n;
  }

  /** Suma segundos al tiempo en la sección actual (lo llama un temporizador de la vista). */
  function tickTiempo(segundos = 1): void {
    if (!Number.isFinite(segundos) || segundos <= 0) return;
    tiempoEnSeccionSeg.value += Math.floor(segundos);
  }

  function reset(): void {
    modulo.value = 1;
    seccion.value = SECCION_INICIAL;
    nivel.value = 'pregrado';
    interaccionesRecientes.value = [];
    limpiarSeleccion();
  }

  /** Contexto completo, en la forma exacta del contrato (sin claves opcionales vacías). */
  function toPayload(): ContextoPedagogico {
    const progreso = useProgresoStore();
    const contexto: ContextoPedagogico = {
      modulo: modulo.value,
      seccion: seccion.value,
      nivel: nivel.value,
      tiempoEnSeccionSeg: tiempoEnSeccionSeg.value,
      interaccionesRecientes: [...interaccionesRecientes.value],
      progreso: {
        modulosCompletados: [...progreso.modulosCompletados],
        puntajeTotal: progreso.puntajeTotal,
        logros: [...progreso.logros],
      },
    };
    if (actividadActual.value) contexto.actividadActual = { ...actividadActual.value };
    if (estructuraSeleccionada.value) {
      contexto.estructuraSeleccionada = estructuraSeleccionada.value;
    }
    if (moleculaSeleccionada.value) contexto.moleculaSeleccionada = moleculaSeleccionada.value;
    return contexto;
  }

  return {
    modulo,
    seccion,
    actividadActual,
    estructuraSeleccionada,
    moleculaSeleccionada,
    nivel,
    tiempoEnSeccionSeg,
    interaccionesRecientes,
    setModulo,
    setSeccion,
    setActividad,
    registrarInteraccion,
    limpiarInteracciones,
    setEstructura,
    setMolecula,
    setNivel,
    tickTiempo,
    reset,
    toPayload,
  };
});
