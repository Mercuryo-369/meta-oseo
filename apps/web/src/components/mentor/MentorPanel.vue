<script setup lang="ts">
/**
 * Panel del mentor de IA (F1-13). AppShell lo monta sin props y él se posiciona solo.
 *
 * - Móvil (< 768 px): botón flotante abajo a la derecha que abre una hoja inferior casi a
 *   pantalla completa. Es modal (con fondo atenuado, foco atrapado, Escape cierra) y se ajusta
 *   al teclado virtual.
 * - Escritorio (>= 768 px): el mismo botón abre un panel lateral derecho NO modal: el
 *   estudiante puede seguir usando la escena 3D o el contenido mientras conversa. Se cierra
 *   con su botón o con Escape.
 *
 * El estado de la conversación vive aquí (no dentro de la hoja), así que cerrar el panel no
 * borra el chat ni corta una respuesta en curso; lo hace cerrar sesión o "Nueva conversación"
 * (que pide confirmación y borra la conversación también en el servidor). El borrador sin enviar
 * también se conserva. Al abrir el panel se recupera la conversación guardada (F3-09).
 *
 * Funciones del mentor (briefing: monitorear, profundizar, evaluar):
 * - Monitoreo (F3-07): tarjeta "Para reforzar" en el estado vacío, con las sugerencias del servidor.
 * - Profundizar (F3-06): "Explícame {nombre}" para lo que el estudiante tiene seleccionado, y un
 *   botón "Preguntar al mentor" junto al del panel (cerrado) que envía esa misma pregunta. Cualquier
 *   componente puede pedirle algo al mentor con el evento de documento `ova:preguntar-al-mentor`
 *   (ver `ai/explicame.ts`).
 * - Evaluar (F4-03): "Ponme a prueba", un quiz de práctica de 3 preguntas que no da puntos.
 *
 * Accesibilidad: título y descripción para el lector de pantalla; el anuncio de la respuesta
 * completa va en una región `aria-live="polite"` (nunca token a token); foco al abrir (en el
 * campo en escritorio; en el título en móvil, para no abrir el teclado sin que el estudiante
 * lo pida) y al cerrar vuelve al botón; objetivos táctiles de al menos 44 px.
 */
import { computed, defineAsyncComponent, nextTick, reactive, ref, watch } from 'vue';
import { useEventListener, useMediaQuery } from '@vueuse/core';
import { ClipboardCheck, MessageCircle, SquarePen, TriangleAlert } from '@lucide/vue';
import { EVENTO_PREGUNTAR_AL_MENTOR, textoDelEvento, useExplicame } from '@/ai/explicame';
import type { SugerenciaRefuerzo } from '@/ai/mentorApi';
import { useRefuerzoStore } from '@/ai/refuerzo';
import { useMentor } from '@/ai/useMentor';
import { useQuiz } from '@/ai/useQuiz';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import MentorEntrada from './MentorEntrada.vue';
import MentorQuiz from './MentorQuiz.vue';
import MentorVacio from './MentorVacio.vue';
import { estiloDeLaHoja } from './geometria';
import { useVisualViewport } from './useVisualViewport';

// La lista de mensajes arrastra markdown-it y DOMPurify (~60 KB gzip): no se descargan hasta que
// se abre el panel por primera vez (se precargan al abrirlo, antes de que el estudiante escriba).
const cargarLista = () => import('./MentorMensajes.vue');
const MentorMensajes = defineAsyncComponent(cargarLista);

const abierto = ref(false);
const esEscritorio = useMediaQuery('(min-width: 768px)');
const esMovil = computed(() => !esEscritorio.value);

const {
  mensajes,
  fase,
  error,
  ocupado,
  puedeReintentar,
  estadoHistorial,
  errorHistorial,
  errorHistorialReintentable,
  borrando,
  errorBorrado,
  enviar,
  detener,
  reintentar,
  restaurar,
  valorar,
  nuevaConversacion,
} = useMentor();

/** `reactive` desenvuelve los refs del controlador: los componentes lo reciben sin `.value`. */
const quiz = reactive(useQuiz());
const refuerzo = useRefuerzoStore();
const { chips } = useExplicame();

/** Qué se ve en el panel: la conversación o el quiz de práctica. */
const vista = ref<'chat' | 'quiz'>('chat');
/** Pide confirmación antes de borrar la conversación. */
const confirmando = ref(false);

const sugerenciasPanel = computed(() => refuerzo.sugerencias.slice(0, 3));
/** Lo que el botón junto al del panel pregunta: la primera selección (la molécula si trabaja con ellas). */
const chipPrincipal = computed(() => chips.value[0] ?? null);

/** Texto del campo; vive aquí para sobrevivir al cierre de la hoja. */
const borrador = ref('');

const entrada = ref<InstanceType<typeof MentorEntrada> | null>(null);
const titulo = ref<{ $el?: HTMLElement } | null>(null);

// ---- Aviso de respuesta nueva con el panel cerrado ----------------------------------------
const sinLeer = ref(false);
watch(ocupado, (ahora, antes) => {
  if (antes && !ahora && !abierto.value) sinLeer.value = true;
});
watch(abierto, (valor) => {
  if (valor) {
    sinLeer.value = false;
    void cargarLista();
    // Al abrir: recupera la conversación guardada y refresca las sugerencias de refuerzo.
    void restaurar();
    void refuerzo.cargar();
  } else {
    confirmando.value = false;
  }
});

// ---- Anuncios para lectores de pantalla ----------------------------------------------------
// Con el panel abierto, una región viva DENTRO de la hoja avisa que el mentor piensa y, al
// terminar, lee la respuesta completa (nunca token a token). Con el panel cerrado, otra región
// FUERA de la hoja da un aviso corto; la de dentro no sirve entonces porque no existe, y la de
// fuera no sirve con la hoja modal abierta porque queda `aria-hidden`.
const anuncio = ref('');
const avisoCerrado = computed(() =>
  sinLeer.value && !abierto.value
    ? 'El mentor respondió. Abre el panel del mentor para leer la respuesta.'
    : '',
);
watch(fase, (actual) => {
  if (actual === 'thinking') anuncio.value = 'El mentor está pensando.';
});
watch(
  () => {
    const ultimo = mensajes.value.at(-1);
    return ultimo?.role === 'assistant' && ultimo.status === 'completo' ? ultimo : null;
  },
  async (completo) => {
    if (!completo) return;
    // markdown-it ya está cargado (lo usa la lista); se importa aquí para no fijarlo al panel.
    const { textoPlano } = await import('@/ai/markdown');
    anuncio.value = `Respuesta del mentor: ${textoPlano(completo.content)}`;
  },
);

// ---- Envío ---------------------------------------------------------------------------------
function alEnviar(texto: string): void {
  borrador.value = '';
  void enviar(texto);
}

function alPreguntarEjemplo(pregunta: string): void {
  void enviar(pregunta);
}

/**
 * Abre el panel (en la conversación) y envía `texto`. Antes recupera la conversación guardada
 * para no abrir una aparte si ya había una. Si el mentor está respondiendo, no hace nada.
 */
async function preguntarDesdeFuera(texto: string): Promise<void> {
  if (ocupado.value) {
    abierto.value = true;
    return;
  }
  vista.value = 'chat';
  abierto.value = true;
  await restaurar();
  await enviar(texto);
}

// Evento de documento documentado en `ai/explicame.ts`: cualquier componente puede usarlo.
useEventListener(document, EVENTO_PREGUNTAR_AL_MENTOR, (evento: Event) => {
  const texto = textoDelEvento(evento);
  if (texto) void preguntarDesdeFuera(texto);
});

// ---- Ponme a prueba (F4-03) ------------------------------------------------------------------
/** Abre el quiz: retoma el que ya hay o pide uno nuevo sobre lo que el estudiante está viendo. */
function abrirQuiz(): void {
  vista.value = 'quiz';
  if (quiz.estado === 'inactivo') void quiz.iniciar();
}

/** Quiz nuevo sobre el concepto de una sugerencia de refuerzo. */
function practicarSugerencia(sugerencia: SugerenciaRefuerzo): void {
  vista.value = 'quiz';
  void quiz.iniciar({
    tema: sugerencia.concepto,
    modulo: sugerencia.modulo,
    seccion: sugerencia.seccion,
  });
}

function volverAlChat(): void {
  vista.value = 'chat';
  void nextTick(() => {
    if (esEscritorio.value) entrada.value?.enfocar();
  });
}

/**
 * Al abrir una fuente del curso: en móvil la hoja tapa la pantalla, así que se cierra para dejar
 * ver el contenido; en escritorio el panel es lateral y se queda abierto.
 */
function alSeguirUnaFuente(): void {
  if (esMovil.value) abierto.value = false;
}

/** Botón de la cabecera: pide confirmación y lleva el foco al botón seguro ("Cancelar"). */
const botonCancelar = ref<{ $el?: HTMLElement } | null>(null);
function pedirConfirmacion(): void {
  errorBorrado.value = null;
  confirmando.value = true;
  void nextTick(() => botonCancelar.value?.$el?.focus({ preventScroll: true }));
}

function cancelarConfirmacion(): void {
  confirmando.value = false;
  void nextTick(() => botonNueva.value?.$el?.focus({ preventScroll: true }));
}

const botonNueva = ref<{ $el?: HTMLElement } | null>(null);

async function confirmarNuevaConversacion(): Promise<void> {
  const listo = await nuevaConversacion();
  if (!listo) return; // el aviso de `errorBorrado` explica por qué se conserva la conversación
  confirmando.value = false;
  borrador.value = '';
  void nextTick(() => {
    if (esEscritorio.value) entrada.value?.enfocar();
  });
}

// ---- Foco y cierre -------------------------------------------------------------------------
function alAbrir(evento: Event): void {
  // Se decide el foco a mano: en móvil el campo no debe abrir el teclado sin que se toque.
  evento.preventDefault();
  void nextTick(() => {
    if (esEscritorio.value) entrada.value?.enfocar();
    else titulo.value?.$el?.focus({ preventScroll: true });
  });
}

function alInteractuarFuera(evento: Event): void {
  // Panel lateral no modal: tocar la escena 3D o el contenido no lo cierra.
  if (esEscritorio.value) evento.preventDefault();
}

// ---- Geometría según el dispositivo ---------------------------------------------------------
const hojaMovilAbierta = computed(() => abierto.value && esMovil.value);
const medidasTeclado = useVisualViewport(hojaMovilAbierta);

const estiloHoja = computed(() => estiloDeLaHoja(esEscritorio.value, medidasTeclado.value));
</script>

<template>
  <!-- Atajo "Preguntar al mentor" (F3-06): aparece con el panel cerrado cuando el estudiante tiene
       algo seleccionado (una capa, un punto 3D o una molécula) y envía "Explícame ...". -->
  <button
    v-if="!abierto && chipPrincipal"
    type="button"
    class="bg-card text-card-foreground hover:bg-accent focus-visible:ring-ring fixed z-40 flex min-h-11 max-w-[min(20rem,calc(100vw-2rem))] items-center gap-2 rounded-full border px-3.5 text-sm font-medium shadow-md outline-none focus-visible:ring-2"
    style="
      right: max(1rem, var(--area-segura-derecha));
      bottom: calc(max(1rem, var(--area-segura-abajo)) + 3.75rem);
    "
    data-testid="mentor-preguntar-seleccion"
    @click="preguntarDesdeFuera(chipPrincipal.pregunta)"
  >
    <MessageCircle aria-hidden="true" class="text-primary size-4 shrink-0" />
    <span class="truncate">
      Preguntar al mentor<span class="sr-only"> sobre {{ chipPrincipal.nombre }}</span>
    </span>
  </button>

  <Sheet v-model:open="abierto" :modal="esMovil">
    <SheetTrigger as-child>
      <Button
        size="icon-lg"
        class="fixed z-40 rounded-full shadow-lg"
        :tabindex="abierto ? -1 : undefined"
        style="
          right: max(1rem, var(--area-segura-derecha));
          bottom: max(1rem, var(--area-segura-abajo));
        "
        data-testid="mentor-abrir"
      >
        <MessageCircle aria-hidden="true" />
        <span class="sr-only">Abrir al mentor de IA</span>
        <template v-if="sinLeer">
          <span
            class="bg-eosina ring-background absolute -top-0.5 -right-0.5 size-3.5 rounded-full ring-2"
            aria-hidden="true"
            data-testid="mentor-sin-leer"
          />
          <span class="sr-only">, hay una respuesta nueva</span>
        </template>
      </Button>
    </SheetTrigger>

    <SheetContent
      :side="esMovil ? 'bottom' : 'right'"
      class="gap-0 overflow-hidden p-0"
      :class="esMovil ? 'rounded-t-2xl' : ''"
      :style="estiloHoja"
      data-testid="mentor-panel"
      @open-auto-focus="alAbrir"
      @interact-outside="alInteractuarFuera"
    >
      <SheetHeader class="flex-row items-center gap-2 border-b py-2 pr-16 pl-4">
        <div class="min-w-0 flex-1">
          <SheetTitle
            ref="titulo"
            tabindex="-1"
            class="font-serif text-lg leading-tight outline-none"
          >
            Mentor de IA
          </SheetTitle>
          <SheetDescription class="text-xs leading-snug">
            Pregunta sobre lo que estás estudiando.
          </SheetDescription>
        </div>
        <Button
          v-if="vista === 'chat'"
          type="button"
          variant="ghost"
          size="icon"
          class="shrink-0"
          title="Ponme a prueba"
          data-testid="mentor-abrir-quiz"
          @click="abrirQuiz"
        >
          <ClipboardCheck aria-hidden="true" />
          <span class="sr-only">Ponme a prueba</span>
        </Button>
        <Button
          v-if="mensajes.length > 0 && vista === 'chat'"
          ref="botonNueva"
          type="button"
          variant="ghost"
          size="icon"
          class="shrink-0"
          title="Nueva conversación"
          data-testid="mentor-nueva"
          :aria-expanded="confirmando"
          @click="pedirConfirmacion"
        >
          <SquarePen aria-hidden="true" />
          <span class="sr-only">Nueva conversación</span>
        </Button>
      </SheetHeader>

      <!-- Confirmación sencilla: borrar la conversación también la quita del servidor. -->
      <div
        v-if="confirmando && vista === 'chat'"
        role="group"
        aria-label="Confirmar nueva conversación"
        class="bg-accent text-accent-foreground border-b px-4 py-3 text-sm"
        data-testid="mentor-confirmar-nueva"
        @keydown.esc.stop.prevent="cancelarConfirmacion"
      >
        <p>¿Borrar esta conversación y empezar otra? No se podrá recuperar.</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <Button
            ref="botonCancelar"
            type="button"
            size="sm"
            variant="outline"
            data-testid="mentor-nueva-cancelar"
            @click="cancelarConfirmacion"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            :aria-disabled="borrando ? 'true' : undefined"
            data-testid="mentor-nueva-confirmar"
            @click="confirmarNuevaConversacion"
          >
            {{ borrando ? 'Borrando…' : 'Sí, empezar de nuevo' }}
          </Button>
        </div>
      </div>
      <p
        v-if="errorBorrado && vista === 'chat'"
        role="alert"
        class="bg-accent text-accent-foreground mx-3 mt-2 rounded-md px-3 py-2 text-sm"
        data-testid="mentor-error-borrado"
      >
        {{ errorBorrado }}
      </p>

      <MentorQuiz
        v-if="vista === 'quiz'"
        :quiz="quiz"
        @volver="volverAlChat"
        @navegar="alSeguirUnaFuente"
      />
      <template v-else>
        <MentorVacio
          v-if="mensajes.length === 0"
          class="flex-1 overflow-y-auto"
          :chips="chips"
          :sugerencias="sugerenciasPanel"
          :estado-historial="estadoHistorial"
          :error-historial="errorHistorial"
          :puede-reintentar-historial="errorHistorialReintentable"
          @preguntar="alPreguntarEjemplo"
          @poner-a-prueba="abrirQuiz"
          @practicar="practicarSugerencia"
          @navegar="alSeguirUnaFuente"
          @reintentar-historial="restaurar"
        />
        <MentorMensajes
          v-else
          :mensajes="mensajes"
          @navegar="alSeguirUnaFuente"
          @valorar="valorar"
        />
      </template>

      <div
        v-if="error && vista === 'chat'"
        role="alert"
        class="bg-accent text-accent-foreground mx-3 mb-2 flex items-start gap-2 rounded-md px-3 py-2 text-sm"
        data-testid="mentor-error"
      >
        <TriangleAlert aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
        <p class="min-w-0 flex-1">{{ error }}</p>
        <Button
          v-if="puedeReintentar"
          type="button"
          size="sm"
          variant="outline"
          class="shrink-0"
          data-testid="mentor-reintentar"
          @click="reintentar()"
        >
          Reintentar
        </Button>
      </div>

      <MentorEntrada
        v-if="vista === 'chat'"
        ref="entrada"
        v-model="borrador"
        :ocupado="ocupado"
        @enviar="alEnviar"
        @detener="detener"
      />

      <!-- Región viva: se lee una vez, al terminar la respuesta; nunca token a token. -->
      <div
        class="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="mentor-anuncio"
      >
        {{ anuncio }}
      </div>
    </SheetContent>
  </Sheet>

  <div
    class="sr-only"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    data-testid="mentor-aviso-cerrado"
  >
    {{ avisoCerrado }}
  </div>
</template>
