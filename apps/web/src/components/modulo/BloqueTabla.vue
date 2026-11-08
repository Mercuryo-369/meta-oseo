<script setup lang="ts">
/**
 * Bloque `tabla` comparativa: cada columna es un elemento que se compara y cada fila un criterio.
 *
 *  - Desde `md`: tabla real (`<table>`) dentro de un contenedor con desplazamiento horizontal, por
 *    si el contenido es ancho.
 *  - En móvil: una tarjeta apilada por columna (lista de criterio: valor), sin desplazamiento
 *    horizontal. Ambas versiones se dibujan y Tailwind oculta la que no toca, así el lector de
 *    pantalla solo lee una.
 */
import type { BloqueTabla } from '@/content/schema';
import TextoRico from './TextoRico.vue';

defineProps<{
  bloque: BloqueTabla;
  /** El título ya es el encabezado de la parte: queda para el lector de pantalla. */
  tituloOculto?: boolean;
}>();
</script>

<template>
  <section
    :id="`bloque-${bloque.id}`"
    :aria-labelledby="`titulo-${bloque.id}`"
    class="space-y-3"
    data-testid="bloque-tabla"
  >
    <h3
      :id="`titulo-${bloque.id}`"
      class="font-serif text-xl font-semibold"
      :class="{ 'sr-only': tituloOculto }"
    >
      {{ bloque.titulo }}
    </h3>

    <!-- Escritorio y tabletas -->
    <div class="hidden overflow-x-auto rounded-lg border md:block" data-testid="tabla-ancha">
      <table class="bg-card w-full min-w-max border-collapse text-left text-sm">
        <thead class="bg-secondary text-secondary-foreground">
          <tr>
            <th scope="col" class="border-b px-4 py-3 font-semibold">
              {{ bloque.encabezado_criterio ?? '' }}
              <span v-if="!bloque.encabezado_criterio" class="sr-only">Criterio</span>
            </th>
            <th
              v-for="columna in bloque.columnas"
              :key="columna"
              scope="col"
              class="border-b px-4 py-3 font-semibold"
            >
              {{ columna }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in bloque.filas" :key="fila.criterio" class="border-b last:border-b-0">
            <th scope="row" class="bg-muted/60 px-4 py-3 font-semibold">{{ fila.criterio }}</th>
            <td
              v-for="(celda, i) in fila.celdas"
              :key="bloque.columnas[i] ?? i"
              class="px-4 py-3 align-top"
            >
              <TextoRico :texto="celda" modo="linea" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Móvil: una tarjeta por columna -->
    <ul class="space-y-3 md:hidden" role="list" data-testid="tabla-apilada">
      <li
        v-for="(columna, i) in bloque.columnas"
        :key="columna"
        class="bg-card rounded-lg border p-4"
      >
        <h4 class="text-primary font-semibold">{{ columna }}</h4>
        <dl class="mt-2 space-y-2 text-sm">
          <div v-for="fila in bloque.filas" :key="fila.criterio">
            <dt class="text-muted-foreground font-medium">{{ fila.criterio }}</dt>
            <dd>
              <TextoRico :texto="fila.celdas[i] ?? ''" modo="linea" />
            </dd>
          </div>
        </dl>
      </li>
    </ul>
  </section>
</template>
