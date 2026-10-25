<script setup lang="ts">
/**
 * Menú de los seis módulos (sustituye al menú circular, 2026-10-14: el público son médicos y odontólogos y
 * se pidió una navegación más sobria). Rediseño del 2026-10-17: los módulos son una secuencia, así que el
 * menú es un recorrido vertical: un nodo por módulo unido por un riel, con el estado en el propio nodo
 * (número, marca de completado o candado) y en texto debajo del título.
 *
 *  - En todas las pantallas es un panel que se desliza desde la izquierda al pulsar «Módulos» en la cabecera
 *    (`BotonModulos`), con un velo detrás: el recorrido de los seis módulos y los accesos a inicio, logros y
 *    certificado. Se cierra al elegir un destino, con Escape (el foco vuelve al botón) o tocando el velo.
 *    Hasta el 2026-10-25 era además una barra lateral fija («Tu recorrido») en pantallas anchas; se quitó a
 *    pedido de la usuaria para que la portada del módulo ocupe todo el ancho.
 *
 * El estado de cada módulo es el de las tarjetas del inicio (`usePasosModulos`) y se dice con icono y texto.
 * El módulo abierto lleva `aria-current="page"`. Un módulo bloqueado sigue siendo un enlace: su página explica
 * qué falta.
 */
import { computed, nextTick, onMounted, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Award, Check, House, Lock, Trophy } from '@lucide/vue';
import { moduloDeLaRuta } from '@/components/menu/estados';
import { usePasosModulos } from '@/components/modulo/usePasosModulos';
import { ID_CONTROL_MENU, ID_MENU, useMenuModulos } from './useMenuModulos';

const route = useRoute();
const { abierto, cerrar } = useMenuModulos();
const { pasos } = usePasosModulos();

const moduloActual = computed(() => moduloDeLaRuta(route));

// Cada visita empieza con el menú plegado (y las pruebas no heredan el estado de otra).
onMounted(cerrar);

// Elegir un destino cierra el panel en pantallas estrechas.
watch(
  () => route.fullPath,
  () => cerrar(),
);

watch(abierto, async (ahora) => {
  if (!ahora) return;
  await nextTick();
  document.querySelector<HTMLElement>(`#${ID_MENU} a`)?.focus();
});

function alPulsarEscape(): void {
  if (!abierto.value) return;
  cerrar();
  document.getElementById(ID_CONTROL_MENU)?.focus();
}

/** Aspecto del nodo de un paso: el estado manda, salvo que sea el módulo abierto. */
function claseNodo(p: (typeof pasos.value)[number]): string {
  if (moduloActual.value === p.m.numero) return 'bg-primary text-primary-foreground';
  if (p.marca === 'completada') return 'bg-success text-white';
  if (p.marca === 'bloqueada') return 'bg-muted text-muted-foreground';
  if (p.actual) return 'border-primary text-primary border-2 bg-card';
  return 'bg-card text-foreground border';
}

const ENLACES = [
  { nombre: 'inicio', texto: 'Inicio', icono: House },
  { nombre: 'logros', texto: 'Mis logros', icono: Trophy },
  { nombre: 'certificado', texto: 'Mi certificado', icono: Award },
] as const;
</script>

<template>
  <!-- Velo (con el panel abierto) -->
  <div
    v-if="abierto"
    class="fixed inset-0 z-40 bg-slate-950/40"
    aria-hidden="true"
    data-testid="velo-menu"
    @click="cerrar"
  />

  <nav
    :id="ID_MENU"
    aria-label="Módulos"
    class="bg-card fixed bottom-0 left-0 z-50 w-[min(19rem,86vw)] flex-col overflow-y-auto border-r shadow-xl"
    :class="abierto ? 'flex' : 'hidden'"
    style="
      top: calc(var(--altura-cabecera) + 1px + var(--area-segura-arriba));
      padding-bottom: var(--area-segura-abajo);
    "
    data-testid="menu-modulos"
    @keydown.escape="alPulsarEscape"
  >
    <p class="px-5 pt-5 pb-2 text-base font-semibold tracking-tight">Módulos</p>

    <ol class="flex-1 px-2 pb-2" role="list">
      <li v-for="(p, i) in pasos" :key="p.m.numero">
        <RouterLink
          :to="{ name: 'modulo', params: { n: p.m.numero } }"
          :aria-current="moduloActual === p.m.numero ? 'page' : undefined"
          class="focus-visible:ring-ring relative flex min-h-12 items-start gap-3 rounded-lg px-3 py-2.5 outline-none focus-visible:ring-2"
          :class="moduloActual === p.m.numero ? 'bg-secondary' : 'hover:bg-muted'"
          :data-modulo="p.m.numero"
          :data-estado="p.marca"
        >
          <!-- Riel que une este nodo con el siguiente -->
          <span
            v-if="i < pasos.length - 1"
            class="bg-border absolute top-[2.625rem] -bottom-1.5 left-[1.625rem] w-px"
            aria-hidden="true"
          />
          <span
            class="relative grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums"
            :class="claseNodo(p)"
            aria-hidden="true"
          >
            <Check v-if="p.marca === 'completada'" class="size-3.5" :stroke-width="3" />
            <Lock v-else-if="p.marca === 'bloqueada'" class="size-3" :stroke-width="2.5" />
            <template v-else>{{ p.m.numero }}</template>
          </span>
          <span class="min-w-0 flex-1 pt-0.5">
            <span class="sr-only">Módulo {{ p.m.numero }}: </span>
            <span
              class="block text-sm leading-snug"
              :class="[
                moduloActual === p.m.numero || p.actual ? 'font-semibold' : 'font-medium',
                p.marca === 'bloqueada' ? 'text-muted-foreground' : 'text-foreground',
              ]"
            >
              {{ p.m.titulo }}
            </span>
            <span
              class="mt-0.5 block text-xs leading-snug"
              :class="
                p.marca === 'completada'
                  ? 'text-success'
                  : p.actual && p.marca === 'normal'
                    ? 'text-primary'
                    : 'text-muted-foreground'
              "
            >
              {{ p.etiqueta }}
            </span>
          </span>
        </RouterLink>
      </li>
    </ol>

    <ul class="border-t p-2" role="list">
      <li v-for="e in ENLACES" :key="e.nombre">
        <RouterLink
          :to="{ name: e.nombre }"
          class="hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm outline-none focus-visible:ring-2"
          exact-active-class="!text-foreground font-medium bg-secondary"
        >
          <component :is="e.icono" class="size-4" aria-hidden="true" />
          {{ e.texto }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
