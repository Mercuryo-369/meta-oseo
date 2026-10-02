<script setup lang="ts">
/**
 * Pestaña "Actividades": estadísticas por actividad y por módulo, con las más difíciles
 * resaltadas (GET /api/teacher/activities/stats). La unidad de conteo es el par
 * (estudiante, actividad). La dificultad se marca con texto, no solo con color.
 */
import { computed, onMounted, ref } from 'vue';
import { RefreshCw } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { MODULOS, moduloPorNumero } from '@/data/modulos';
import { obtenerActividadesDocente } from '@/lib/docenteApi';
import EstadoPanel from './EstadoPanel.vue';
import TablaDesplazable from './TablaDesplazable.vue';
import { formatoNumero, formatoPorcentaje } from './formato';
import { useCarga } from './useCarga';

const LIMITE_DIFICILES = 5;

const { datos, cargando, error, cargar } = useCarga((signal) =>
  obtenerActividadesDocente(LIMITE_DIFICILES, signal),
);
onMounted(cargar);

/** '' = todos los módulos. */
const filtroModulo = ref('');

const idsDificiles = computed(
  () => new Set((datos.value?.mas_dificiles ?? []).map((a) => a.activity_id)),
);
const posicionDificil = (id: string): number =>
  (datos.value?.mas_dificiles ?? []).findIndex((a) => a.activity_id === id) + 1;

const filas = computed(() => {
  const todas = datos.value?.actividades ?? [];
  return filtroModulo.value ? todas.filter((a) => a.modulo === Number(filtroModulo.value)) : todas;
});

const sinActividades = computed(() => datos.value !== null && datos.value.actividades.length === 0);

function tituloModulo(n: number): string {
  return moduloPorNumero(n)?.titulo ?? '';
}
</script>

<template>
  <section aria-labelledby="titulo-actividades" class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="titulo-actividades" class="text-2xl font-semibold">Actividades</h2>
        <p class="text-muted-foreground text-sm">
          Cada cifra cuenta pares estudiante-actividad. Finalización = quienes la completaron entre
          quienes la intentaron.
        </p>
      </div>
      <Button variant="outline" :disabled="cargando" @click="cargar">
        <RefreshCw aria-hidden="true" />
        Actualizar
      </Button>
    </div>

    <EstadoPanel
      :cargando="cargando"
      :error="error"
      :hay-datos="datos !== null"
      :vacio="sinActividades"
      texto-vacio="Todavía no hay resultados de actividades. Aparecerán cuando los estudiantes las intenten."
      que="las estadísticas de actividades"
      @reintentar="cargar"
    >
      <div v-if="datos" class="space-y-8">
        <section aria-labelledby="titulo-dificiles" class="space-y-3">
          <h3 id="titulo-dificiles" class="text-xl font-semibold">Las más difíciles</h3>
          <p class="text-muted-foreground text-sm">
            Las {{ LIMITE_DIFICILES }} con menor finalización y, a igualdad, más intentos.
          </p>
          <p
            v-if="datos.mas_dificiles.length === 0"
            class="bg-card text-muted-foreground rounded-lg border border-dashed p-4 text-sm"
          >
            Aún no hay actividades intentadas.
          </p>
          <ol v-else role="list" class="grid gap-3 md:grid-cols-2">
            <li
              v-for="(a, i) in datos.mas_dificiles"
              :key="a.activity_id"
              class="bg-accent text-accent-foreground rounded-xl border p-4"
            >
              <p class="text-sm font-semibold">
                <span class="sr-only">Puesto </span>{{ i + 1 }}.
                <span class="break-all">{{ a.activity_id }}</span>
              </p>
              <p class="text-sm">
                Módulo {{ a.modulo }} · {{ a.tipo }} · Finalización
                <strong>{{ formatoPorcentaje(a.tasa_finalizacion) }}</strong>
                ({{ a.estudiantes_completaron }} de {{ a.estudiantes_intentaron }}) · Intentos
                promedio <strong>{{ formatoNumero(a.intentos_promedio, 1) }}</strong>
              </p>
            </li>
          </ol>
        </section>

        <section aria-labelledby="titulo-por-modulo" class="space-y-3">
          <h3 id="titulo-por-modulo" class="text-xl font-semibold">Por módulo</h3>
          <TablaDesplazable etiqueta="Estadísticas de actividades por módulo">
            <thead class="bg-muted">
              <tr>
                <th scope="col">Módulo</th>
                <th scope="col" class="text-right">Actividades</th>
                <th scope="col" class="text-right">Pares intentados</th>
                <th scope="col" class="text-right">Finalización</th>
                <th scope="col" class="text-right">Intentos prom.</th>
                <th scope="col" class="text-right">Puntaje prom.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in datos.por_modulo" :key="m.modulo">
                <th scope="row" class="font-normal">
                  {{ m.modulo }}. {{ tituloModulo(m.modulo) }}
                </th>
                <td class="text-right tabular-nums">{{ formatoNumero(m.actividades) }}</td>
                <td class="text-right tabular-nums">
                  {{ formatoNumero(m.estudiantes_intentaron) }}
                </td>
                <td class="text-right tabular-nums">
                  {{ formatoPorcentaje(m.tasa_finalizacion) }}
                </td>
                <td class="text-right tabular-nums">{{ formatoNumero(m.intentos_promedio, 1) }}</td>
                <td class="text-right tabular-nums">{{ formatoNumero(m.puntaje_promedio, 1) }}</td>
              </tr>
            </tbody>
          </TablaDesplazable>
        </section>

        <section aria-labelledby="titulo-por-actividad" class="space-y-3">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h3 id="titulo-por-actividad" class="text-xl font-semibold">Por actividad</h3>
            <div class="w-full space-y-1 sm:w-64">
              <label for="filtro-modulo" class="text-sm font-medium">Filtrar por módulo</label>
              <NativeSelect id="filtro-modulo" v-model="filtroModulo">
                <option value="">Todos los módulos</option>
                <option v-for="m in MODULOS" :key="m.numero" :value="String(m.numero)">
                  {{ m.numero }}. {{ m.titulo }}
                </option>
              </NativeSelect>
            </div>
          </div>
          <p role="status" class="text-muted-foreground text-sm">
            {{ filas.length }} {{ filas.length === 1 ? 'actividad' : 'actividades' }}
          </p>
          <p
            v-if="filas.length === 0"
            class="bg-card text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm"
          >
            No hay actividades con intentos en este módulo.
          </p>
          <TablaDesplazable v-else etiqueta="Estadísticas por actividad">
            <thead class="bg-muted">
              <tr>
                <th scope="col">Actividad</th>
                <th scope="col" class="text-right">Módulo</th>
                <th scope="col">Tipo</th>
                <th scope="col" class="text-right">Intentaron</th>
                <th scope="col" class="text-right">Completaron</th>
                <th scope="col" class="text-right">Finalización</th>
                <th scope="col" class="text-right">Intentos prom.</th>
                <th scope="col" class="text-right">Puntaje prom.</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="a in filas"
                :key="a.activity_id"
                :class="idsDificiles.has(a.activity_id) ? 'bg-accent text-accent-foreground' : ''"
                :data-dificil="idsDificiles.has(a.activity_id) ? 'si' : undefined"
              >
                <th scope="row" class="font-normal">
                  {{ a.activity_id }}
                  <span
                    v-if="idsDificiles.has(a.activity_id)"
                    class="ml-1 rounded-full border border-current px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
                  >
                    Más difícil n.º {{ posicionDificil(a.activity_id) }}
                  </span>
                </th>
                <td class="text-right tabular-nums">{{ a.modulo }}</td>
                <td>{{ a.tipo }}</td>
                <td class="text-right tabular-nums">
                  {{ formatoNumero(a.estudiantes_intentaron) }}
                </td>
                <td class="text-right tabular-nums">
                  {{ formatoNumero(a.estudiantes_completaron) }}
                </td>
                <td class="text-right tabular-nums">
                  {{ formatoPorcentaje(a.tasa_finalizacion) }}
                </td>
                <td class="text-right tabular-nums">{{ formatoNumero(a.intentos_promedio, 1) }}</td>
                <td class="text-right tabular-nums">{{ formatoNumero(a.puntaje_promedio, 1) }}</td>
              </tr>
            </tbody>
          </TablaDesplazable>
        </section>
      </div>
    </EstadoPanel>
  </section>
</template>
