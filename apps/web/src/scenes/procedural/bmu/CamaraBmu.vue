<script setup lang="ts">
/**
 * Cámara de la escena de la BMU (dentro del <TresCanvas>, no dibuja nada): controles de órbita (un dedo gira,
 * dos dedos acercan; sin paneo, que en móvil hace perder el modelo) y transiciones suaves a una vista con
 * nombre. Tocar el lienzo durante una transición la cancela y avisa (`libre`): el estudiante manda, y la
 * vista deja de seguir a la fase hasta que pida "Vista de la fase". Con movimiento reducido las transiciones
 * son instantáneas y sin inercia.
 *
 * La matemática está en `vistas.ts` (pura). Aquí solo hay pegamento con three y TresJS.
 */
import { onBeforeUnmount, ref, watch } from 'vue';
import { useLoop, useTres } from '@tresjs/core';
import { OrbitControls } from '@tresjs/cientos';
import { TOUCH } from 'three';
import type { Camera, Vector3 } from 'three';
import { LIMITES_DISTANCIA, estadoConZoom, estadoDeVista, mezclarCamara } from './vistas';
import type { EstadoCamara } from './vistas';

const props = defineProps<{
  vista: string;
  /** Sube para volver a la vista aunque no haya cambiado. */
  orden: number;
  /** Acercar (factor < 1) o alejar (factor > 1); cada orden lleva un `id` distinto. */
  zoom: { id: number; factor: number } | null;
  reducirMovimiento: boolean;
  /** Ancho / alto del lienzo (en un lienzo estrecho la cámara se aleja). */
  aspecto: number;
  /** Cómo se resuelve una vista con nombre; por defecto, las de la BMU (otras escenas pasan las suyas). */
  resolverVista?: (nombre: string, aspecto: number) => EstadoCamara;
}>();

const emit = defineEmits<{ libre: [] }>();

const DURACION_MS = 900;
/** Un dedo gira; dos dedos acercan o alejan. */
const TOQUES = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

interface ControlesOrbita {
  target: Vector3;
  update: () => unknown;
}

const { camera, invalidate } = useTres();
const { onBeforeRender } = useLoop();
const controles = ref<{ instance: ControlesOrbita | null } | null>(null);

interface Transicion {
  desde: EstadoCamara;
  hasta: EstadoCamara;
  inicio: number;
  duracion: number;
}

let transicion: Transicion | null = null;
type Pendiente =
  { tipo: 'vista'; estado: EstadoCamara; instantanea: boolean } | { tipo: 'zoom'; factor: number };
let pendiente: Pendiente | null = null;

function pedirVista(instantanea: boolean): void {
  pendiente = {
    tipo: 'vista',
    estado: (props.resolverVista ?? estadoDeVista)(props.vista, props.aspecto),
    instantanea: instantanea || props.reducirMovimiento,
  };
  invalidate();
}

watch(
  () => props.zoom?.id,
  () => {
    if (!props.zoom) return;
    pendiente = { tipo: 'zoom', factor: props.zoom.factor };
    invalidate();
  },
);

// Cambiar de vista o pedir "Vista de la fase" mueve la cámara con transición; la primera vez, sin ella.
let primera = true;
watch(
  () => [props.vista, props.orden] as const,
  () => {
    pedirVista(primera);
    primera = false;
  },
  { immediate: true },
);

// Un lienzo con otra forma (girar el móvil) recoloca la cámara sin transición.
watch(
  () => Math.round(props.aspecto * 10),
  () => pedirVista(true),
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

// Prioridad 10: después de los controles, que actualizan la cámara con prioridad 0.
const gancho = onBeforeRender(() => {
  const cam = camera.value;
  const ctl = controles.value?.instance ?? null;
  if (!cam || !ctl) return;
  if (pendiente) {
    const orden = pendiente;
    pendiente = null;
    const desde = estadoActual(cam, ctl);
    const hasta = orden.tipo === 'vista' ? orden.estado : estadoConZoom(desde, orden.factor);
    if (orden.tipo === 'vista' && orden.instantanea) {
      transicion = null;
      escribir(cam, ctl, hasta);
      invalidate();
    } else {
      // El zoom con botones es un ajuste: dura la mitad que un cambio de vista.
      const duracion = props.reducirMovimiento
        ? 0
        : orden.tipo === 'zoom'
          ? DURACION_MS / 2
          : DURACION_MS;
      transicion = { desde, hasta, inicio: performance.now(), duracion };
    }
  }
  if (transicion) {
    const k =
      transicion.duracion <= 0
        ? 1
        : Math.min(1, (performance.now() - transicion.inicio) / transicion.duracion);
    escribir(cam, ctl, mezclarCamara(transicion.desde, transicion.hasta, k));
    if (k >= 1) transicion = null;
    invalidate();
  }
}, 10);

function alTomarControl(): void {
  transicion = null;
  pendiente = null;
  emit('libre');
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
    :min-distance="LIMITES_DISTANCIA.minima"
    :max-distance="LIMITES_DISTANCIA.maxima"
    @start="alTomarControl"
  />
</template>
