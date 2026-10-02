<script setup lang="ts">
/**
 * Detalle de un estudiante (GET /api/teacher/students/{id}): progreso por módulo, resultados
 * por actividad y uso del mentor. La identificación siempre llega enmascarada.
 */
import { computed, nextTick, onMounted, ref } from 'vue';
import { ArrowLeft, CircleCheck } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { moduloPorNumero } from '@/data/modulos';
import { obtenerEstudianteDocente } from '@/lib/docenteApi';
import EstadoPanel from './EstadoPanel.vue';
import TablaDesplazable from './TablaDesplazable.vue';
import TarjetaDato from './TarjetaDato.vue';
import {
  formatoDuracion,
  formatoFechaHora,
  formatoNumero,
  formatoUsd,
  nombreCompleto,
} from './formato';
import { useCarga } from './useCarga';
import type { DocenteEstudianteModulo } from '@/types/api';

const props = defineProps<{ id: number }>();
defineEmits<{ cerrar: [] }>();

const { datos, cargando, error, cargar } = useCarga((signal) =>
  obtenerEstudianteDocente(props.id, signal),
);

const titulo = ref<HTMLElement | null>(null);

onMounted(async () => {
  await cargar();
  await nextTick();
  titulo.value?.focus({ preventScroll: false });
});

const nombre = computed(() => (datos.value ? nombreCompleto(datos.value) : 'Estudiante'));

function estadoModulo(m: DocenteEstudianteModulo): string {
  if (m.completado) return 'Completado';
  return m.updated_at || m.tiempo_total_seg > 0 ? 'En curso' : 'Sin iniciar';
}

function tituloModulo(n: number): string {
  return moduloPorNumero(n)?.titulo ?? '';
}
</script>

<template>
  <section aria-labelledby="titulo-detalle-estudiante" class="space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline" @click="$emit('cerrar')">
        <ArrowLeft aria-hidden="true" />
        Volver a la lista
      </Button>
    </div>

    <h2
      id="titulo-detalle-estudiante"
      ref="titulo"
      tabindex="-1"
      class="text-2xl font-semibold outline-none"
    >
      {{ nombre }}
    </h2>

    <EstadoPanel
      :cargando="cargando"
      :error="error"
      :hay-datos="datos !== null"
      que="el detalle del estudiante"
      @reintentar="cargar"
    >
      <div v-if="datos" class="space-y-8">
        <p class="text-muted-foreground text-sm">
          {{ datos.tipo_identificacion }} {{ datos.numero_identificacion }} (enmascarado) · Nivel
          {{ datos.nivel }} · Registrado el {{ formatoFechaHora(datos.created_at) }}
        </p>

        <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TarjetaDato rotulo="Módulos completados" :valor="`${datos.modulos_completados} de 6`" />
          <TarjetaDato rotulo="Puntaje total" :valor="formatoNumero(datos.puntaje_total)" />
          <TarjetaDato rotulo="Tiempo total" :valor="formatoDuracion(datos.tiempo_total_seg)" />
          <TarjetaDato
            rotulo="Última actividad"
            :valor="formatoFechaHora(datos.ultima_actividad, 'Sin actividad')"
          />
        </dl>

        <section aria-labelledby="titulo-detalle-progreso" class="space-y-3">
          <h3 id="titulo-detalle-progreso" class="text-xl font-semibold">Progreso por módulo</h3>
          <TablaDesplazable etiqueta="Progreso por módulo">
            <thead class="bg-muted">
              <tr>
                <th scope="col">Módulo</th>
                <th scope="col">Estado</th>
                <th scope="col">Sección actual</th>
                <th scope="col" class="text-right">Tiempo</th>
                <th scope="col">Última actualización</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in datos.progreso" :key="m.modulo">
                <th scope="row" class="font-normal">
                  {{ m.modulo }}. {{ tituloModulo(m.modulo) }}
                </th>
                <td>
                  <span
                    v-if="m.completado"
                    class="text-success inline-flex items-center gap-1 font-medium"
                  >
                    <CircleCheck class="size-4" aria-hidden="true" />
                    Completado
                  </span>
                  <span v-else>{{ estadoModulo(m) }}</span>
                </td>
                <td>{{ m.seccion_actual ?? '—' }}</td>
                <td class="text-right tabular-nums">{{ formatoDuracion(m.tiempo_total_seg) }}</td>
                <td>{{ formatoFechaHora(m.updated_at) }}</td>
              </tr>
            </tbody>
          </TablaDesplazable>
        </section>

        <section aria-labelledby="titulo-detalle-actividades" class="space-y-3">
          <h3 id="titulo-detalle-actividades" class="text-xl font-semibold">
            Resultados por actividad
          </h3>
          <p
            v-if="datos.actividades.length === 0"
            class="bg-card text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm"
          >
            Este estudiante aún no ha intentado ninguna actividad.
          </p>
          <TablaDesplazable v-else etiqueta="Resultados por actividad">
            <thead class="bg-muted">
              <tr>
                <th scope="col">Actividad</th>
                <th scope="col" class="text-right">Módulo</th>
                <th scope="col">Tipo</th>
                <th scope="col">Estado</th>
                <th scope="col" class="text-right">Mejor puntaje</th>
                <th scope="col" class="text-right">Puntaje que suma</th>
                <th scope="col" class="text-right">Intentos</th>
                <th scope="col">Último intento</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in datos.actividades" :key="a.activity_id">
                <th scope="row" class="font-normal">{{ a.activity_id }}</th>
                <td class="text-right tabular-nums">{{ a.modulo }}</td>
                <td>{{ a.tipo }}</td>
                <td>{{ a.completada ? 'Completada' : 'Sin completar' }}</td>
                <td class="text-right tabular-nums">{{ formatoNumero(a.mejor_puntaje) }}</td>
                <td class="text-right tabular-nums">
                  {{ formatoNumero(a.puntaje_contabilizado) }}
                </td>
                <td class="text-right tabular-nums">{{ formatoNumero(a.intentos) }}</td>
                <td>{{ formatoFechaHora(a.ultimo_intento) }}</td>
              </tr>
            </tbody>
          </TablaDesplazable>
        </section>

        <section aria-labelledby="titulo-detalle-mentor" class="space-y-3">
          <h3 id="titulo-detalle-mentor" class="text-xl font-semibold">Uso del mentor</h3>
          <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <TarjetaDato rotulo="Consultas" :valor="formatoNumero(datos.mentor.consultas)" />
            <TarjetaDato
              rotulo="Tokens de entrada"
              :valor="formatoNumero(datos.mentor.tokens_entrada)"
            />
            <TarjetaDato
              rotulo="Tokens de salida"
              :valor="formatoNumero(datos.mentor.tokens_salida)"
            />
            <TarjetaDato
              rotulo="Costo estimado"
              :valor="formatoUsd(datos.mentor.costo_estimado_usd)"
              nota="Estimación, no la factura"
            />
          </dl>
          <p class="text-muted-foreground text-sm">
            Última consulta: {{ formatoFechaHora(datos.mentor.ultima_consulta, 'Nunca') }}
          </p>
        </section>
      </div>
    </EstadoPanel>
  </section>
</template>
