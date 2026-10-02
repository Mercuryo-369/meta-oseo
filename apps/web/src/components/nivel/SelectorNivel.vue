<script setup lang="ts">
/**
 * Sección «Tu nivel» de la portada: control segmentado Pregrado / Posgrado.
 *
 * El registro no pregunta el nivel (decisión del equipo), así que este es el único sitio donde el
 * estudiante lo cambia. El nivel posgrado hace visibles los bloques de profundización de los
 * módulos (`visibleParaNivel`) y va en el contexto pedagógico que recibe el mentor.
 *
 * Comportamiento:
 * - Optimista: `contextoPedagogico.nivel` cambia al instante (ModuloView y el mentor lo leen de
 *   ahí, sin recargar) y en paralelo se guarda con PATCH /api/me (`auth.actualizarNivel`).
 * - Si el guardado falla, el contexto vuelve al último nivel confirmado, se explica el error y se
 *   ofrece «Reintentar». No se bloquea el control mientras se guarda (así no se pierde el foco del
 *   teclado): las elecciones seguidas se serializan y solo se envía la última.
 * - Sin token (modo de desarrollo sin backend) solo se cambia la vista local: no hay a quién guardar.
 * - El docente lo usa igual para previsualizar; no se envía nada más que el nivel.
 * - Accesible: grupo de radios nativos (flechas del teclado incluidas), el elegido lleva icono de
 *   visto además del color, y cada opción mide al menos 44 px de alto.
 */
import { computed, ref } from 'vue';
import { Check, LoaderCircle } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useContextoStore } from '@/stores/contextoPedagogico';
import type { Nivel } from '@/types/api';

const OPCIONES: readonly { valor: Nivel; etiqueta: string }[] = [
  { valor: 'pregrado', etiqueta: 'Pregrado' },
  { valor: 'posgrado', etiqueta: 'Posgrado' },
];

const auth = useAuthStore();
const contexto = useContextoStore();

const guardando = ref(false);
/** Nivel que no se pudo guardar (para «Reintentar»); `null` si no hay error pendiente. */
const fallido = ref<Nivel | null>(null);
const mensajeError = ref('');
/** Se muestra un instante «Nivel guardado» tras confirmar el servidor. */
const guardado = ref(false);

/** Último nivel que el usuario pidió; el bucle de guardado lo alcanza sin solaparse. */
let deseado: Nivel = contexto.nivel;

const nivelActual = computed<Nivel>(() => contexto.nivel);
const etiquetaActual = computed(
  () => OPCIONES.find((o) => o.valor === nivelActual.value)?.etiqueta ?? '',
);

function textoDeError(e: unknown): string {
  return e instanceof ApiError ? e.message : 'No pudimos guardar tu nivel. Inténtalo de nuevo.';
}

async function sincronizar(): Promise<void> {
  guardando.value = true;
  try {
    while (auth.usuario && auth.usuario.nivel !== deseado) {
      const objetivo = deseado;
      await auth.actualizarNivel(objetivo);
      // `actualizarNivel` deja el contexto en `objetivo`; si mientras tanto se eligió otro, se
      // vuelve a él en el mismo instante para que no parpadee.
      contexto.setNivel(deseado);
    }
    guardado.value = true;
  } catch (e) {
    const perdido = deseado;
    // Vuelve al último nivel confirmado: la pantalla nunca miente sobre lo que está guardado.
    if (auth.usuario) contexto.setNivel(auth.usuario.nivel);
    deseado = contexto.nivel;
    fallido.value = perdido;
    mensajeError.value = textoDeError(e);
  } finally {
    guardando.value = false;
  }
}

async function elegir(nivel: Nivel): Promise<void> {
  fallido.value = null;
  mensajeError.value = '';
  guardado.value = false;
  if (nivel === contexto.nivel && !guardando.value) return;
  contexto.setNivel(nivel);
  deseado = nivel;
  if (guardando.value) return; // el bucle en curso recogerá el último valor
  // Sin token (modo de desarrollo sin backend) no hay nada que guardar.
  if (!auth.token) return;
  await sincronizar();
}

function reintentar(): void {
  if (fallido.value) void elegir(fallido.value);
}
</script>

<template>
  <section aria-labelledby="titulo-nivel" class="mt-8 md:mt-12" data-testid="seccion-nivel">
    <h2 id="titulo-nivel" class="text-2xl font-semibold">Tu nivel</h2>

    <div class="bg-card mt-4 space-y-3 rounded-xl border p-4">
      <div
        role="radiogroup"
        aria-labelledby="titulo-nivel"
        aria-describedby="descripcion-nivel"
        class="grid max-w-sm grid-cols-2 gap-1 rounded-lg border p-1"
        data-testid="control-nivel"
      >
        <label
          v-for="o in OPCIONES"
          :key="o.valor"
          class="relative block"
          :data-testid="`opcion-nivel-${o.valor}`"
        >
          <input
            type="radio"
            name="nivel"
            :value="o.valor"
            :checked="nivelActual === o.valor"
            class="peer sr-only"
            @change="elegir(o.valor)"
          />
          <span
            class="peer-focus-visible:ring-ring peer-focus-visible:ring-offset-background text-foreground hover:bg-accent peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:hover:bg-primary flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-base font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2"
          >
            <Check v-if="nivelActual === o.valor" class="size-4 shrink-0" aria-hidden="true" />
            {{ o.etiqueta }}
          </span>
        </label>
      </div>

      <p id="descripcion-nivel" class="text-muted-foreground max-w-prose text-sm leading-relaxed">
        El nivel posgrado añade avisos de profundización en los módulos y hace que el mentor
        responda con más detalle. Puedes cambiarlo cuando quieras; el pregrado es el recorrido base.
      </p>

      <p class="text-sm" role="status" aria-live="polite" data-testid="estado-nivel">
        <span v-if="guardando" class="text-muted-foreground inline-flex items-center gap-2">
          <LoaderCircle class="size-4 motion-safe:animate-spin" aria-hidden="true" />
          Guardando tu nivel…
        </span>
        <span v-else-if="guardado" class="text-success inline-flex items-center gap-2 font-medium">
          <Check class="size-4" aria-hidden="true" />
          Nivel guardado: {{ etiquetaActual }}
        </span>
      </p>

      <div
        v-if="fallido"
        role="alert"
        class="bg-accent text-accent-foreground flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm"
        data-testid="error-nivel"
      >
        <span>{{ mensajeError }}</span>
        <Button
          variant="outline"
          class="min-h-11"
          data-testid="reintentar-nivel"
          @click="reintentar"
        >
          Reintentar
        </Button>
      </div>
    </div>
  </section>
</template>
