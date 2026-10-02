<script setup lang="ts">
/**
 * Un mensaje de la conversación. El estudiante escribe texto plano; el mentor responde en
 * Markdown, que se renderiza con `renderizarMarkdown` (markdown-it sin HTML crudo + DOMPurify).
 * Ese resultado es lo único que se pasa a `v-html` en toda la interfaz del mentor.
 *
 * Cuando la respuesta termina y trae `citas`, debajo se listan las "Fuentes" del curso como
 * enlaces internos (`MentorFuentes`). Si además ya está guardada en el servidor (`idServidor`), se
 * ofrecen los pulgares para valorarla (`MentorValoracion`, F3-11).
 *
 * Accesibilidad: el mensaje en curso lleva `aria-busy` y NO es una región viva (leerlo token a
 * token sería ruidoso); el anuncio de la respuesta completa lo hace el panel.
 */
import { computed } from 'vue';
import { renderizarMarkdown } from '@/ai/markdown';
import type { CitaMentor, MensajeMentor } from '@/ai/useMentor';
import type { Valoracion } from '@/ai/mentorApi';
import MentorFuentes from './MentorFuentes.vue';
import MentorValoracion from './MentorValoracion.vue';

const props = defineProps<{ mensaje: MensajeMentor }>();
defineEmits<{ navegar: [cita: CitaMentor]; valorar: [valor: Valoracion] }>();

const esEstudiante = computed(() => props.mensaje.role === 'user');
const html = computed(() => (esEstudiante.value ? '' : renderizarMarkdown(props.mensaje.content)));
/** El mentor aún no ha escrito nada: se muestra el indicador de "pensando". */
const pensando = computed(
  () =>
    !esEstudiante.value && props.mensaje.status === 'transmitiendo' && props.mensaje.content === '',
);
const interrumpido = computed(() => !esEstudiante.value && props.mensaje.status === 'interrumpido');
/** Las fuentes se muestran solo con la respuesta completa (mientras llega el texto, no). */
const fuentes = computed(() =>
  !esEstudiante.value && props.mensaje.status === 'completo' ? (props.mensaje.citas ?? []) : [],
);
/** Solo se valora una respuesta completa que el servidor ya guardó (sin `id` no hay a qué votar). */
const valorable = computed(
  () =>
    !esEstudiante.value &&
    props.mensaje.status === 'completo' &&
    props.mensaje.idServidor !== undefined,
);
</script>

<template>
  <li
    class="flex"
    :class="esEstudiante ? 'justify-end' : 'justify-start'"
    :data-role="mensaje.role"
    :data-status="mensaje.status"
    data-testid="mentor-mensaje"
  >
    <div
      class="max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[0.9375rem] leading-relaxed break-words"
      :class="
        esEstudiante
          ? 'bg-primary text-primary-foreground rounded-br-md'
          : 'bg-card text-card-foreground border-border rounded-bl-md border'
      "
      :aria-busy="mensaje.status === 'transmitiendo' ? 'true' : undefined"
    >
      <span class="sr-only">{{ esEstudiante ? 'Tú:' : 'Mentor:' }}</span>

      <p v-if="esEstudiante" class="whitespace-pre-wrap">{{ mensaje.content }}</p>

      <template v-else>
        <!-- Seguro: el HTML pasó por markdown-it (html: false) y por DOMPurify. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="html" class="mentor-md" data-testid="mentor-markdown" v-html="html" />

        <MentorFuentes
          v-if="fuentes.length > 0"
          :citas="fuentes"
          @navegar="(cita) => $emit('navegar', cita)"
        />

        <MentorValoracion
          v-if="valorable"
          :valoracion="mensaje.valoracion"
          :ocupado="mensaje.valorando"
          :error="mensaje.errorValoracion"
          @votar="(valor) => $emit('valorar', valor)"
        />

        <p v-if="pensando" class="text-muted-foreground flex items-center gap-2 text-sm">
          <span class="flex gap-1" aria-hidden="true">
            <span class="bg-muted-foreground size-1.5 rounded-full motion-safe:animate-pulse" />
            <span
              class="bg-muted-foreground size-1.5 rounded-full motion-safe:animate-pulse [animation-delay:200ms]"
            />
            <span
              class="bg-muted-foreground size-1.5 rounded-full motion-safe:animate-pulse [animation-delay:400ms]"
            />
          </span>
          Pensando…
        </p>

        <p
          v-if="interrumpido"
          class="text-muted-foreground mt-2 text-xs"
          data-testid="mentor-interrumpido"
        >
          Respuesta interrumpida
        </p>
      </template>
    </div>
  </li>
</template>

<style scoped>
/* Estilo del Markdown del mentor con los tokens del sistema de diseño (tema claro y oscuro). */
.mentor-md :deep(p),
.mentor-md :deep(ul),
.mentor-md :deep(ol),
.mentor-md :deep(pre),
.mentor-md :deep(blockquote),
.mentor-md :deep(table) {
  margin: 0 0 0.6em;
}
.mentor-md :deep(:last-child) {
  margin-bottom: 0;
}
.mentor-md :deep(h1),
.mentor-md :deep(h2),
.mentor-md :deep(h3),
.mentor-md :deep(h4),
.mentor-md :deep(h5),
.mentor-md :deep(h6) {
  margin: 0.8em 0 0.35em;
  font-family: var(--font-sans);
  font-size: 1em;
  font-weight: 700;
}
.mentor-md :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}
.mentor-md :deep(ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}
.mentor-md :deep(li + li) {
  margin-top: 0.2em;
}
.mentor-md :deep(a) {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  overflow-wrap: anywhere;
}
.mentor-md :deep(code) {
  background: var(--muted);
  border-radius: 0.25rem;
  padding: 0.1em 0.35em;
  font-size: 0.9em;
}
.mentor-md :deep(pre) {
  background: var(--muted);
  border-radius: 0.5rem;
  padding: 0.75rem;
  overflow-x: auto;
}
.mentor-md :deep(pre code) {
  background: none;
  padding: 0;
}
.mentor-md :deep(blockquote) {
  border-left: 3px solid var(--border);
  padding-left: 0.75rem;
  color: var(--muted-foreground);
}
.mentor-md :deep(table) {
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
}
.mentor-md :deep(th),
.mentor-md :deep(td) {
  border: 1px solid var(--border);
  padding: 0.25rem 0.5rem;
  text-align: left;
}
.mentor-md :deep(hr) {
  border: 0;
  border-top: 1px solid var(--border);
  margin: 0.8em 0;
}
</style>
