<script setup lang="ts">
/** Cifra destacada con su rótulo. Va dentro de un `<dl>`: rótulo = `<dt>`, cifra = `<dd>`. */
defineProps<{ rotulo: string; valor: string; nota?: string }>();
</script>

<template>
  <div class="bg-card rounded-xl border p-4">
    <dt class="text-muted-foreground text-sm">{{ rotulo }}</dt>
    <dd class="mt-1 font-serif text-2xl font-semibold tabular-nums">{{ valor }}</dd>
    <dd v-if="nota" class="text-muted-foreground mt-1 text-xs">{{ nota }}</dd>
  </div>
</template>
