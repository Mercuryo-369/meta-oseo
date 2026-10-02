<script setup lang="ts">
/**
 * Cámara de la escena de exploración: dentro del <TresCanvas> (no dibuja nada). Hace tres cosas:
 *  1. Controles de órbita (un dedo gira, dos acercan; sin paneo, que en móvil hace perder el modelo).
 *  2. Transiciones suaves a una vista con nombre o a un nodo (`orden`). Con movimiento reducido son
 *     instantáneas. Tocar el lienzo durante una transición la cancela: el estudiante manda.
 *  3. Proyección de los puntos de interés a píxeles del lienzo (`proyeccion`), para que la interfaz
 *     dibuje sus botones HTML encima.
 *
 * Toda la matemática está en `vistas.ts` y `proyeccion.ts` (con pruebas). Aquí solo hay pegamento con
 * three y TresJS: las órdenes se aplican dentro del bucle de render, cuando la cámara y los controles
 * ya existen, así que una orden que llega antes de que el lienzo esté listo no se pierde.
 *
 * Al desmontar TresJS libera el renderizador; aquí se cancela la transición y se sueltan los ganchos.
 */
import { onBeforeUnmount, ref, watch } from 'vue';
import { useLoop, useTres } from '@tresjs/core';
import { OrbitControls } from '@tresjs/cientos';
import { TOUCH, Vector3 } from 'three';
import type { Camera } from 'three';
import { cambioSignificativo, enPantalla, miraALaCamara, ndcAPixeles } from './proyeccion';
import type { PosicionPunto } from './proyeccion';
import {
  DURACION_TRANSICION_MS,
  crearTransicion,
  estadoConZoom,
  type EstadoCamara,
  type LimitesZoom,
  type OrdenCamara,
  type Transicion,
  type Vec3,
} from './vistas';

const props = defineProps<{
  orden: OrdenCamara | null;
  limites: LimitesZoom;
  reducirMovimiento: boolean;
  /** Puntos de interés a proyectar (coordenadas del modelo). */
  puntos: readonly { id: string; punto: Vec3; normal?: Vec3 }[];
  /** Centro del modelo: sirve para saber qué puntos miran a la cámara. */
  centro: Vec3;
  /** Tamaño del lienzo en píxeles CSS. */
  ancho: number;
  alto: number;
}>();

const emit = defineEmits<{
  proyeccion: [posiciones: PosicionPunto[]];
  /** El estudiante tomó el control (giró o acercó): la vista deja de ser una "vista con nombre". */
  interrumpida: [];
}>();

/** Un dedo gira; dos dedos acercan o alejan. */
const TOQUES = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

/** Lo mínimo que se usa de los controles de órbita (three-stdlib). */
interface ControlesOrbita {
  target: Vector3;
  update: () => unknown;
}

const { camera, invalidate } = useTres();
const { onBeforeRender } = useLoop();
const controles = ref<{ instance: ControlesOrbita | null } | null>(null);

let transicion: Transicion | null = null;
let pendiente: OrdenCamara | null = null;
let ultimaOrden = 0;
let ultimas: PosicionPunto[] = [];
const auxiliar = new Vector3();

watch(
  () => props.orden,
  (orden) => {
    if (!orden || orden.id <= ultimaOrden) return;
    pendiente = orden;
    invalidate();
  },
  { immediate: true },
);

// Con otro tamaño, lienzo o puntos hay que reproyectar aunque la cámara no se mueva.
watch(
  () => [props.puntos, props.ancho, props.alto, props.centro] as const,
  () => {
    ultimas = [];
    invalidate();
  },
);

function estadoActual(cam: Camera, ctl: ControlesOrbita): EstadoCamara {
  return {
    objetivo: [ctl.target.x, ctl.target.y, ctl.target.z],
    posicion: [cam.position.x, cam.position.y, cam.position.z],
  };
}

function escribir(cam: Camera, ctl: ControlesOrbita, estado: EstadoCamara): void {
  cam.position.set(...estado.posicion);
  ctl.target.set(...estado.objetivo);
  ctl.update();
}

function aplicarPendiente(cam: Camera, ctl: ControlesOrbita): void {
  const orden = pendiente;
  if (!orden) return;
  pendiente = null;
  ultimaOrden = orden.id;
  const desde = estadoActual(cam, ctl);
  const hasta =
    orden.tipo === 'estado' ? orden.estado : estadoConZoom(desde, orden.factor, props.limites);
  // Zoom con los botones: media duración, es un ajuste y no un cambio de vista.
  const duracion = props.reducirMovimiento
    ? 0
    : orden.tipo === 'zoom'
      ? DURACION_TRANSICION_MS / 2
      : DURACION_TRANSICION_MS;
  transicion = crearTransicion(desde, hasta, performance.now(), duracion);
}

function proyectar(cam: Camera): void {
  cam.updateMatrixWorld(true);
  const posiciones: PosicionPunto[] = props.puntos.map(({ id, punto, normal }) => {
    auxiliar.set(punto[0], punto[1], punto[2]).project(cam);
    const { x, y } = ndcAPixeles(auxiliar.x, auxiliar.y, props.ancho, props.alto);
    return {
      id,
      x,
      y,
      enPantalla: enPantalla([auxiliar.x, auxiliar.y, auxiliar.z]),
      detras: !miraALaCamara(
        punto,
        props.centro,
        [cam.position.x, cam.position.y, cam.position.z],
        undefined,
        normal,
      ),
    };
  });
  if (cambioSignificativo(ultimas, posiciones)) {
    ultimas = posiciones;
    emit('proyeccion', posiciones);
  }
}

// Prioridad 10: después de los controles (que actualizan la cámara con prioridad 0).
const gancho = onBeforeRender(() => {
  const cam = camera.value;
  const ctl = controles.value?.instance ?? null;
  if (!cam || !ctl) return;
  aplicarPendiente(cam, ctl);
  if (transicion) {
    const { estado, terminada } = transicion.paso(performance.now());
    escribir(cam, ctl, estado);
    if (terminada) transicion = null;
    invalidate();
  }
  proyectar(cam);
}, 10);

function alTomarControl(): void {
  transicion = null;
  pendiente = null;
  emit('interrumpida');
}

onBeforeUnmount(() => {
  transicion = null;
  pendiente = null;
  gancho.off();
});
</script>

<template>
  <OrbitControls
    ref="controles"
    make-default
    :enable-damping="!reducirMovimiento"
    :damping-factor="0.08"
    :enable-pan="false"
    :rotate-speed="0.8"
    :touches="TOQUES"
    :min-distance="limites.minima"
    :max-distance="limites.maxima"
    @start="alTomarControl"
  />
</template>
