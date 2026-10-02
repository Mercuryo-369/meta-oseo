<script setup lang="ts">
/**
 * Pestaña "Estudiantes": lista paginada con búsqueda y orden del lado del servidor y detalle
 * de un estudiante. La identificación llega enmascarada (`*******789`); solo se ve completa
 * cuando el docente busca ese número exacto y la API lo marca con `identificacion_completa`.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight, Search, X } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { obtenerEstudiantesDocente } from '@/lib/docenteApi';
import type { DocenteOrdenEstudiantes } from '@/types/api';
import EstadoPanel from './EstadoPanel.vue';
import EstudianteDetalle from './EstudianteDetalle.vue';
import { formatoDuracion, formatoFechaHora, formatoNumero, nombreCompleto } from './formato';
import { useCarga } from './useCarga';

const busqueda = ref('');
const consulta = ref('');
// Cadena porque el <select> nativo trabaja con texto; sus valores son los de DocenteOrdenEstudiantes.
const orden = ref('nombre');
const pagina = ref(1);
const seleccionado = ref<number | null>(null);
const raiz = ref<HTMLElement | null>(null);

const { datos, cargando, error, cargar } = useCarga((signal) =>
  obtenerEstudiantesDocente(
    { page: pagina.value, q: consulta.value, orden: orden.value as DocenteOrdenEstudiantes },
    signal,
  ),
);

onMounted(cargar);
// Varios cambios en el mismo instante (buscar reinicia la página) producen una sola petición.
watch([pagina, consulta, orden], cargar);

function buscar(): void {
  const nueva = busqueda.value.trim();
  if (nueva === consulta.value && pagina.value === 1) {
    void cargar();
    return;
  }
  consulta.value = nueva;
  pagina.value = 1;
}

function limpiar(): void {
  busqueda.value = '';
  buscar();
}

// Cambiar el orden vuelve a la primera página (sync: así ambos cambios generan una sola petición).
watch(orden, () => (pagina.value = 1), { flush: 'sync' });

// Si la página pedida quedó más allá de la última (por ejemplo, bajó el total), se vuelve a la última.
watch(datos, (d) => {
  if (d && d.estudiantes.length === 0 && d.total > 0 && pagina.value > d.total_pages) {
    pagina.value = Math.max(1, d.total_pages);
  }
});

const total = computed(() => datos.value?.total ?? 0);
const totalPaginas = computed(() => Math.max(1, datos.value?.total_pages ?? 1));
const rango = computed(() => {
  const d = datos.value;
  if (!d || d.estudiantes.length === 0) return '';
  const desde = (d.page - 1) * d.page_size + 1;
  return `Mostrando ${desde} a ${desde + d.estudiantes.length - 1} de ${formatoNumero(d.total)} estudiantes`;
});
const textoVacio = computed(() =>
  consulta.value
    ? `Ningún estudiante coincide con «${consulta.value}». El nombre se busca por palabras; el número de identificación debe escribirse completo y exacto.`
    : 'Todavía no hay estudiantes registrados.',
);

function abrir(id: number): void {
  seleccionado.value = id;
}

async function cerrar(): Promise<void> {
  const id = seleccionado.value;
  seleccionado.value = null;
  await nextTick();
  raiz.value?.querySelector<HTMLElement>(`[data-ver="${id}"]`)?.focus();
}

function anchoAvance(modulos: number): string {
  return `${Math.round((modulos / 6) * 100)}%`;
}
</script>

<template>
  <div ref="raiz">
    <div v-show="seleccionado === null" class="space-y-4">
      <section aria-labelledby="titulo-estudiantes" class="space-y-4">
        <h2 id="titulo-estudiantes" class="text-2xl font-semibold">Estudiantes</h2>

        <form
          role="search"
          aria-label="Buscar y ordenar estudiantes"
          class="grid gap-3 sm:grid-cols-[1fr_auto_14rem] sm:items-end"
          @submit.prevent="buscar"
        >
          <div class="space-y-1">
            <label for="busqueda-estudiantes" class="text-sm font-medium">
              Buscar por nombre o identificación
            </label>
            <Input
              id="busqueda-estudiantes"
              v-model="busqueda"
              type="search"
              maxlength="100"
              autocomplete="off"
              aria-describedby="ayuda-busqueda"
              placeholder="Ana, Pérez o número completo"
            />
            <p id="ayuda-busqueda" class="text-muted-foreground text-xs">
              El nombre se busca por palabras. Si escribes el número de identificación exacto, se
              mostrará completo.
            </p>
          </div>
          <div class="flex gap-2">
            <Button type="submit">
              <Search aria-hidden="true" />
              Buscar
            </Button>
            <Button v-if="consulta || busqueda" type="button" variant="outline" @click="limpiar">
              <X aria-hidden="true" />
              Limpiar
            </Button>
          </div>
          <div class="space-y-1">
            <label for="orden-estudiantes" class="text-sm font-medium">Ordenar por</label>
            <NativeSelect id="orden-estudiantes" v-model="orden">
              <option value="nombre">Nombre (A a Z)</option>
              <option value="puntaje">Puntaje (mayor primero)</option>
              <option value="ultima_actividad">Última actividad (reciente primero)</option>
            </NativeSelect>
          </div>
        </form>

        <p class="text-muted-foreground text-sm" role="status" aria-live="polite">
          {{ cargando ? 'Cargando estudiantes…' : rango }}
        </p>

        <EstadoPanel
          :cargando="cargando"
          :error="error"
          :hay-datos="datos !== null"
          :vacio="total === 0"
          :texto-vacio="textoVacio"
          que="los estudiantes"
          @reintentar="cargar"
        >
          <ul v-if="datos" role="list" class="space-y-3" aria-label="Lista de estudiantes">
            <li
              v-for="e in datos.estudiantes"
              :key="e.id"
              class="bg-card grid gap-3 rounded-xl border p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] lg:items-center"
            >
              <div class="min-w-0">
                <h3 class="truncate font-serif text-lg font-semibold">
                  {{ nombreCompleto(e) }}
                </h3>
                <p class="text-muted-foreground text-sm">
                  <span class="sr-only">Identificación: </span>{{ e.tipo_identificacion }}
                  <span class="font-mono">{{ e.numero_identificacion }}</span>
                  <span
                    v-if="e.identificacion_completa"
                    class="bg-accent text-accent-foreground ml-1 rounded-full px-2 py-0.5 text-xs"
                  >
                    completa por búsqueda exacta
                  </span>
                  <span v-else class="sr-only"> (enmascarada)</span>
                </p>
                <p class="text-muted-foreground text-sm">Nivel {{ e.nivel }}</p>
              </div>

              <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt class="text-muted-foreground">Módulos</dt>
                  <dd class="font-medium tabular-nums">{{ e.modulos_completados }} de 6</dd>
                  <dd
                    class="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full"
                    aria-hidden="true"
                  >
                    <span
                      class="bg-chart-1 block h-full rounded-full"
                      :style="{ width: anchoAvance(e.modulos_completados) }"
                    />
                  </dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Puntaje</dt>
                  <dd class="font-medium tabular-nums">{{ formatoNumero(e.puntaje_total) }}</dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Tiempo total</dt>
                  <dd class="font-medium tabular-nums">
                    {{ formatoDuracion(e.tiempo_total_seg) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Última actividad</dt>
                  <dd class="font-medium">
                    {{ formatoFechaHora(e.ultima_actividad, 'Sin actividad') }}
                  </dd>
                </div>
              </dl>

              <Button
                variant="outline"
                :data-ver="e.id"
                :aria-label="`Ver detalle de ${nombreCompleto(e)}`"
                @click="abrir(e.id)"
              >
                Ver detalle
              </Button>
            </li>
          </ul>

          <nav
            v-if="datos && totalPaginas > 1"
            aria-label="Paginación de estudiantes"
            class="mt-4 flex items-center justify-between gap-3"
          >
            <Button variant="outline" :disabled="pagina <= 1 || cargando" @click="pagina -= 1">
              <ChevronLeft aria-hidden="true" />
              Anterior
            </Button>
            <p class="text-sm tabular-nums">Página {{ datos.page }} de {{ totalPaginas }}</p>
            <Button
              variant="outline"
              :disabled="pagina >= totalPaginas || cargando"
              @click="pagina += 1"
            >
              Siguiente
              <ChevronRight aria-hidden="true" />
            </Button>
          </nav>
        </EstadoPanel>
      </section>
    </div>

    <EstudianteDetalle
      v-if="seleccionado !== null"
      :id="seleccionado"
      :key="seleccionado"
      @cerrar="cerrar"
    />
  </div>
</template>
