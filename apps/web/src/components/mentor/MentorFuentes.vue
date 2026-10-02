<script setup lang="ts">
/**
 * "Fuentes" de una respuesta del mentor (F3-05): los fragmentos del curso en los que se apoyó,
 * como enlaces INTERNOS a la sección correspondiente (`/modulo/<n>?s=<seccion>`).
 *
 * - Numeración igual a las etiquetas [1], [2]... que el mentor escribe en el texto.
 * - Accesible: es una navegación con nombre, una lista ordenada y enlaces reales (Tab + Enter),
 *   con objetivo táctil de 44 px de alto; el número visible se lee como parte del enlace.
 * - `useMentor` ya descartó cualquier `url` que no sea una ruta interna del OVA.
 * - Al seguir un enlace se emite `navegar` (en móvil el panel se cierra para mostrar el contenido).
 */
import { RouterLink } from 'vue-router';
import type { CitaMentor } from '@/ai/useMentor';

defineProps<{ citas: readonly CitaMentor[] }>();
defineEmits<{ navegar: [cita: CitaMentor] }>();
</script>

<template>
  <nav
    class="border-border mt-3 border-t pt-2"
    aria-label="Fuentes del curso consultadas"
    data-testid="mentor-fuentes"
  >
    <p class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Fuentes</p>
    <ol class="mt-1 flex flex-col">
      <li v-for="(cita, i) in citas" :key="cita.id">
        <RouterLink
          :to="cita.url"
          class="text-primary hover:bg-accent focus-visible:ring-ring -mx-1.5 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1.5 text-sm underline underline-offset-2 outline-none focus-visible:ring-2"
          data-testid="mentor-fuente"
          @click="$emit('navegar', cita)"
        >
          <span class="tabular-nums" aria-hidden="true">[{{ i + 1 }}]</span>
          <span class="sr-only">Fuente {{ i + 1 }}:</span>
          <span class="min-w-0 break-words">{{ cita.titulo }}</span>
        </RouterLink>
      </li>
    </ol>
  </nav>
</template>
