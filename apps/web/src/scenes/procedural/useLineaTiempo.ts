/**
 * Línea de tiempo de una escena procedural: el tiempo `t` (0 a 1), la reproducción y los saltos. Vue sin
 * three ni DOM más allá de `requestAnimationFrame` (que se puede inyectar para las pruebas).
 *
 * `t` es la ÚNICA fuente de verdad: la escena dibuja `estado(t)`. Reproducir solo avanza `t` con el reloj;
 * adelantar, atrasar o saltar lo fija de golpe, y la escena queda exactamente donde habría estado.
 *
 * Qué cuenta como visitar un paso (`alVisitar`):
 *  - reproducir o mover el deslizador PASANDO por su hito (en cualquier sentido);
 *  - DETENERSE en él: pausar, soltar el deslizador o saltar a él con los botones o la lista, a menos de
 *    `TOLERANCIA_PARADA`.
 * Un salto no visita los pasos intermedios. Nada arranca solo: la línea empieza detenida en t = 0 y
 * `prefers-reduced-motion` no cambia eso (no hay reproducción automática en ningún caso).
 */
import { getCurrentInstance, onBeforeUnmount, ref } from 'vue';
import type { Ref } from 'vue';
import {
  acotarTiempo,
  pasosCruzados,
  pasosEnParada,
  tiempoPasoAnterior,
  tiempoPasoSiguiente,
} from './lineaTiempo';
import type { PasoTiempo } from './lineaTiempo';

/** Velocidades ofrecidas, como múltiplo de la duración de la escena. */
export const VELOCIDADES = [0.5, 1, 2] as const;
export type Velocidad = (typeof VELOCIDADES)[number];

/** Un cuadro con más de este tiempo entre medias (pestaña en segundo plano) se recorta: no salta la escena. */
const SALTO_MAXIMO_S = 0.1;

export interface OpcionesLineaTiempo {
  /** Pasos ordenados por `t`. */
  pasos: () => readonly PasoTiempo[];
  /** Duración de la reproducción completa (t de 0 a 1) a velocidad 1, en segundos. */
  duracionSeg: () => number;
  /** Se llama con los ids de los pasos visitados (pueden repetirse entre llamadas). */
  alVisitar: (ids: string[]) => void;
  /** Inyectables para las pruebas. */
  ahora?: () => number;
  pedirCuadro?: (devolucion: () => void) => number;
  cancelarCuadro?: (id: number) => void;
}

export interface LineaTiempo {
  t: Ref<number>;
  reproduciendo: Ref<boolean>;
  velocidad: Ref<Velocidad>;
  reproducir: () => void;
  pausar: () => void;
  alternar: () => void;
  /** El estudiante arrastra el deslizador: pasa por los hitos que haya en medio. */
  arrastrar: (t: number) => void;
  /** Suelta el deslizador: si quedó en un hito, lo visita. */
  soltar: () => void;
  /** Salta a un instante (los botones de paso y la lista): visita solo el hito donde aterriza. */
  saltar: (t: number) => void;
  siguiente: () => void;
  anterior: () => void;
  /** Vuelve a t = 0 sin visitar nada. */
  reiniciar: () => void;
  cambiarVelocidad: (v: Velocidad) => void;
}

export function useLineaTiempo(opciones: OpcionesLineaTiempo): LineaTiempo {
  const t = ref(0);
  const reproduciendo = ref(false);
  const velocidad = ref<Velocidad>(1);
  const ahora = opciones.ahora ?? (() => performance.now());
  const pedir = opciones.pedirCuadro ?? ((f: () => void) => requestAnimationFrame(f));
  const cancelar = opciones.cancelarCuadro ?? ((id: number) => cancelAnimationFrame(id));

  let cuadro: number | null = null;
  let ultimo = 0;
  /**
   * ¿Se llegó al `t` actual moviéndose de forma continua (reproduciendo o arrastrando)? Entonces un hito
   * que quedó justo en él ya se contó al pasar, y no se vuelve a contar en el movimiento siguiente.
   */
  let continuo = false;

  function visitar(ids: string[]): void {
    if (ids.length > 0) opciones.alVisitar(ids);
  }

  function detener(): void {
    if (cuadro !== null) cancelar(cuadro);
    cuadro = null;
    reproduciendo.value = false;
  }

  /** Mueve `t` como movimiento continuo: visita los hitos por los que pasa. */
  function moverContinuo(nuevo: number): void {
    const previo = t.value;
    t.value = acotarTiempo(nuevo);
    const cruzados = pasosCruzados(opciones.pasos(), previo, t.value);
    const ya = continuo
      ? new Set(pasosEnParada(opciones.pasos(), previo, 1e-9))
      : new Set<string>();
    continuo = true;
    visitar(cruzados.filter((id) => !ya.has(id)));
  }

  function cuadroSiguiente(): void {
    cuadro = null;
    if (!reproduciendo.value) return;
    const marca = ahora();
    const dt = Math.min(SALTO_MAXIMO_S, Math.max(0, (marca - ultimo) / 1000));
    ultimo = marca;
    const duracion = Math.max(1, opciones.duracionSeg());
    moverContinuo(t.value + (dt * velocidad.value) / duracion);
    if (t.value >= 1) {
      detener();
      return;
    }
    cuadro = pedir(cuadroSiguiente);
  }

  function reproducir(): void {
    if (reproduciendo.value) return;
    // Al final, reproducir empieza de nuevo (sin visitar nada por el salto).
    if (t.value >= 1) {
      t.value = 0;
      continuo = false;
    }
    reproduciendo.value = true;
    ultimo = ahora();
    cuadro = pedir(cuadroSiguiente);
  }

  function pausar(): void {
    if (!reproduciendo.value) return;
    detener();
    visitar(pasosEnParada(opciones.pasos(), t.value));
  }

  function saltar(nuevo: number): void {
    // Saltar durante la reproducción la deja en marcha desde el nuevo punto.
    t.value = acotarTiempo(nuevo);
    continuo = false;
    if (!reproduciendo.value) visitar(pasosEnParada(opciones.pasos(), t.value));
  }

  // Al desmontar el componente que la usa se cancela el cuadro pendiente (fuera de uno, no hay nada que ligar).
  if (getCurrentInstance()) onBeforeUnmount(detener);

  return {
    t,
    reproduciendo,
    velocidad,
    reproducir,
    pausar,
    alternar: () => (reproduciendo.value ? pausar() : reproducir()),
    arrastrar: (valor) => moverContinuo(valor),
    soltar: () => {
      if (!reproduciendo.value) visitar(pasosEnParada(opciones.pasos(), t.value));
    },
    saltar,
    siguiente: () => {
      const destino = tiempoPasoSiguiente(opciones.pasos(), t.value);
      if (destino !== null) saltar(destino);
    },
    anterior: () => {
      const destino = tiempoPasoAnterior(opciones.pasos(), t.value);
      if (destino !== null) saltar(destino);
    },
    reiniciar: () => {
      detener();
      t.value = 0;
      continuo = false;
    },
    cambiarVelocidad: (v) => {
      velocidad.value = v;
    },
  };
}
