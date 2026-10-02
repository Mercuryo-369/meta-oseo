<script setup lang="ts">
/**
 * Tabla con desplazamiento horizontal controlado para pantallas estrechas. El contenedor es
 * una región con nombre y se alcanza con teclado (tabindex 0) para poder desplazarla sin ratón.
 * El contenido (`<thead>`, `<tbody>`) va en el slot.
 */
defineProps<{ etiqueta: string }>();
</script>

<template>
  <div
    role="region"
    :aria-label="etiqueta"
    tabindex="0"
    class="bg-card max-w-full overflow-x-auto rounded-lg border"
  >
    <table
      class="w-full min-w-max border-collapse text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_thead]:border-b [&_tr:not(:last-child)]:border-b"
    >
      <caption class="sr-only">
        {{
          etiqueta
        }}
      </caption>
      <slot />
    </table>
  </div>
</template>
