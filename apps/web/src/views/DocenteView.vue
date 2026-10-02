<script setup lang="ts">
/**
 * Panel del docente (F6-03 / F4-05, parte de frontend): seguimiento de la cohorte con cinco
 * pestañas (Resumen, Estudiantes, Actividades, Mentor, Exportar).
 *
 * Permisos: el servidor es quien decide (403 `no_autorizado` a estudiantes), pero aquí un
 * estudiante ni siquiera monta los paneles, así que NO se dispara ninguna petición al panel:
 * ve una pantalla clara de "acceso solo para docentes".
 */
import type { Component } from 'vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { Lock } from '@lucide/vue';
import ActividadesPanel from '@/components/docente/ActividadesPanel.vue';
import EstudiantesPanel from '@/components/docente/EstudiantesPanel.vue';
import ExportarPanel from '@/components/docente/ExportarPanel.vue';
import MentorUsoPanel from '@/components/docente/MentorUsoPanel.vue';
import ResumenPanel from '@/components/docente/ResumenPanel.vue';
import { useAuthStore } from '@/stores/auth';

interface Pestana {
  id: string;
  etiqueta: string;
  componente: Component;
}

const PESTANAS: readonly Pestana[] = [
  { id: 'resumen', etiqueta: 'Resumen', componente: ResumenPanel },
  { id: 'estudiantes', etiqueta: 'Estudiantes', componente: EstudiantesPanel },
  { id: 'actividades', etiqueta: 'Actividades', componente: ActividadesPanel },
  { id: 'mentor', etiqueta: 'Mentor', componente: MentorUsoPanel },
  { id: 'exportar', etiqueta: 'Exportar', componente: ExportarPanel },
];

const auth = useAuthStore();
const esDocente = computed(() => auth.usuario?.rol === 'docente');

const activa = ref(PESTANAS[0]!.id);
const actual = computed(() => PESTANAS.find((p) => p.id === activa.value) ?? PESTANAS[0]!);
const lista = ref<HTMLElement | null>(null);

/**
 * La barra de pestañas se desplaza en horizontal en móvil. Su barra de desplazamiento nativa es
 * tosca, así que se oculta y se avisa con un degradado en el borde que tiene más pestañas; el
 * desplazamiento (táctil, rueda, teclado) y el foco visible siguen funcionando. Un degradado no es
 * el único aviso: la pestaña activa se centra al elegirla y las flechas del teclado la recorren.
 */
const masALaIzquierda = ref(false);
const masALaDerecha = ref(false);

function medirDesbordamiento(): void {
  const el = lista.value;
  if (!el) return;
  masALaIzquierda.value = el.scrollLeft > 1;
  masALaDerecha.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
}

function centrarActiva(): void {
  const el = lista.value?.querySelector<HTMLElement>(`#pestana-${activa.value}`);
  el?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
}

async function seleccionar(id: string, enfocar = false): Promise<void> {
  activa.value = id;
  await nextTick();
  if (enfocar) lista.value?.querySelector<HTMLElement>(`#pestana-${id}`)?.focus();
  centrarActiva();
}

watch(esDocente, async () => {
  await nextTick();
  medirDesbordamiento();
});

onMounted(() => {
  medirDesbordamiento();
  window.addEventListener('resize', medirDesbordamiento);
});
onBeforeUnmount(() => window.removeEventListener('resize', medirDesbordamiento));

// Patrón WAI-ARIA de pestañas: flechas, Inicio y Fin mueven el foco y activan la pestaña.
function teclado(e: KeyboardEvent): void {
  const i = PESTANAS.findIndex((p) => p.id === activa.value);
  let destino = -1;
  if (e.key === 'ArrowRight') destino = (i + 1) % PESTANAS.length;
  else if (e.key === 'ArrowLeft') destino = (i - 1 + PESTANAS.length) % PESTANAS.length;
  else if (e.key === 'Home') destino = 0;
  else if (e.key === 'End') destino = PESTANAS.length - 1;
  if (destino < 0) return;
  e.preventDefault();
  void seleccionar(PESTANAS[destino]!.id, true);
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
    <section
      v-if="!esDocente"
      aria-labelledby="titulo-sin-acceso"
      class="mx-auto flex max-w-xl flex-col items-start gap-4 py-8"
      data-testid="sin-acceso"
    >
      <span
        class="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <Lock class="size-6" />
      </span>
      <h1 id="titulo-sin-acceso" class="text-3xl font-semibold tracking-tight">
        Acceso solo para docentes
      </h1>
      <p class="text-muted-foreground text-lg">
        El panel de seguimiento de la cohorte es para el equipo docente. Tu cuenta es de estudiante,
        así que no tienes permiso para verlo. Si necesitas acceso, pídeselo a quien administra el
        curso.
      </p>
      <RouterLink
        :to="{ name: 'inicio' }"
        class="bg-primary text-primary-foreground inline-flex h-11 items-center rounded-md px-5 font-medium"
      >
        Ir al inicio
      </RouterLink>
    </section>

    <template v-else>
      <header class="mb-6 space-y-1">
        <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Panel del docente</h1>
        <p class="text-muted-foreground max-w-prose">
          Seguimiento del avance, los resultados y el uso del mentor de los estudiantes. Las
          identificaciones se muestran enmascaradas.
        </p>
      </header>

      <div class="relative -mx-4 mb-6" data-testid="pestanas">
        <div
          ref="lista"
          role="tablist"
          aria-label="Secciones del panel del docente"
          class="flex gap-1 overflow-x-auto border-b px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          @keydown="teclado"
          @scroll.passive="medirDesbordamiento"
        >
          <button
            v-for="p in PESTANAS"
            :id="`pestana-${p.id}`"
            :key="p.id"
            type="button"
            role="tab"
            :aria-selected="activa === p.id"
            :aria-controls="activa === p.id ? `panel-${p.id}` : undefined"
            :tabindex="activa === p.id ? 0 : -1"
            class="-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-4 text-base font-medium whitespace-nowrap transition-colors focus-visible:outline-offset-[-2px]"
            :class="
              activa === p.id
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            "
            @click="seleccionar(p.id)"
          >
            {{ p.etiqueta }}
          </button>
        </div>
        <!-- Degradados: avisan de que hay más pestañas a ese lado; no reciben clics ni foco. -->
        <span
          v-show="masALaIzquierda"
          class="from-background pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r to-transparent"
          aria-hidden="true"
          data-testid="degradado-izquierdo"
        />
        <span
          v-show="masALaDerecha"
          class="from-background pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent"
          aria-hidden="true"
          data-testid="degradado-derecho"
        />
      </div>

      <div
        :id="`panel-${actual.id}`"
        role="tabpanel"
        :aria-labelledby="`pestana-${actual.id}`"
        tabindex="0"
        class="outline-offset-4"
      >
        <!-- KeepAlive conserva la búsqueda, la página y el estudiante abierto al cambiar de pestaña. -->
        <KeepAlive>
          <component :is="actual.componente" />
        </KeepAlive>
      </div>
    </template>
  </div>
</template>
