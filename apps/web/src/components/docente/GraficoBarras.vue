<script setup lang="ts">
/**
 * Gráfico de barras verticales propio (sin bibliotecas), accesible:
 * - título y descripción visibles; el dibujo es una imagen con resumen textual;
 * - el valor de cada barra se escribe como texto (no solo color) cuando hay pocas barras;
 * - alternativa completa en una tabla ("Ver datos en tabla");
 * - colores de los tokens del tema (claro y oscuro) con contraste AA sobre la tarjeta.
 */
import { computed, useId } from 'vue';

export interface PuntoBarra {
  /** Texto completo de la categoría (tabla y lector de pantalla). */
  etiqueta: string;
  /** Texto corto bajo la barra. Por defecto, `etiqueta`. */
  corta?: string;
  valor: number;
}

const props = withDefaults(
  defineProps<{
    titulo: string;
    descripcion: string;
    datos: PuntoBarra[];
    /** Encabezados de la tabla equivalente. */
    columnaEtiqueta: string;
    columnaValor: string;
    formatoValor?: (valor: number) => string;
    /** Con más barras que este número se omiten los valores sobre las barras. */
    maxValoresVisibles?: number;
  }>(),
  { formatoValor: (v: number) => String(v), maxValoresVisibles: 12 },
);

const id = useId();
const maximo = computed(() => Math.max(0, ...props.datos.map((d) => d.valor)));
const mostrarValores = computed(() => props.datos.length <= props.maxValoresVisibles);
// Con muchas barras solo se rotulan algunas, para que las etiquetas no se pisen.
const paso = computed(() => Math.max(1, Math.ceil(props.datos.length / 6)));

function altura(valor: number): string {
  if (maximo.value <= 0 || valor <= 0) return '2px';
  return `${Math.max(2, (valor / maximo.value) * 100)}%`;
}

function rotular(indice: number): boolean {
  return indice % paso.value === 0 || indice === props.datos.length - 1;
}

const resumen = computed(
  () =>
    `${props.titulo}. ${props.descripcion} ` +
    props.datos.map((d) => `${d.etiqueta}: ${props.formatoValor(d.valor)}`).join('; ') +
    '.',
);
</script>

<template>
  <figure class="bg-card rounded-xl border p-4" :aria-labelledby="`${id}-titulo`">
    <figcaption>
      <h3 :id="`${id}-titulo`" class="text-lg font-semibold">{{ titulo }}</h3>
      <p class="text-muted-foreground mt-1 text-sm">{{ descripcion }}</p>
    </figcaption>

    <div class="mt-4 flex gap-2" role="img" :aria-label="resumen">
      <div
        class="text-muted-foreground flex w-12 shrink-0 flex-col justify-between pb-6 text-right text-xs tabular-nums"
        aria-hidden="true"
      >
        <span>{{ formatoValor(maximo) }}</span>
        <span>0</span>
      </div>
      <div class="min-w-0 flex-1" aria-hidden="true">
        <div class="border-foreground/40 flex h-40 items-end gap-1 border-b border-l pl-1">
          <div
            v-for="(d, i) in datos"
            :key="`${d.etiqueta}-${i}`"
            class="flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <span
              v-if="mostrarValores"
              class="mb-0.5 text-center text-xs font-medium tabular-nums"
              data-testid="valor-barra"
            >
              {{ formatoValor(d.valor) }}
            </span>
            <div
              class="w-full rounded-t-sm"
              :class="d.valor > 0 ? 'bg-chart-1' : 'bg-muted-foreground/60'"
              :style="{ height: altura(d.valor) }"
              data-testid="barra"
            />
          </div>
        </div>
        <div class="flex gap-1 pl-1">
          <div
            v-for="(d, i) in datos"
            :key="`e-${d.etiqueta}-${i}`"
            class="text-muted-foreground relative h-6 min-w-0 flex-1 text-center text-xs"
          >
            <span v-if="rotular(i)" class="absolute inset-x-0 top-1 whitespace-nowrap">
              {{ d.corta ?? d.etiqueta }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <details class="mt-3">
      <summary
        class="text-primary flex min-h-11 cursor-pointer items-center text-sm font-medium underline-offset-4 hover:underline"
      >
        Ver datos en tabla
      </summary>
      <div
        class="max-h-72 overflow-auto rounded-lg border"
        tabindex="0"
        role="region"
        :aria-label="`Tabla: ${titulo}`"
      >
        <table
          class="w-full border-collapse text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2"
        >
          <caption class="sr-only">
            {{
              titulo
            }}
          </caption>
          <thead class="bg-muted">
            <tr>
              <th scope="col" class="text-left font-medium">{{ columnaEtiqueta }}</th>
              <th scope="col" class="text-right font-medium">{{ columnaValor }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in datos" :key="`t-${d.etiqueta}-${i}`" class="border-t">
              <th scope="row" class="text-left font-normal">{{ d.etiqueta }}</th>
              <td class="text-right tabular-nums">{{ formatoValor(d.valor) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
