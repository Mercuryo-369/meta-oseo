<script setup lang="ts">
/**
 * Acciones sobre el certificado emitido: descargar el PDF (fetch con `Authorization` y descarga de
 * blob), copiar el enlace público de verificación y compartirlo (Web Share cuando el navegador
 * lo ofrece). Los resultados se anuncian en regiones `status` (éxito) y `alert` (error).
 */
import { computed, ref } from 'vue';
import { Copy, Download, LoaderCircle, Share2 } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { descargarCertificadoPdf, guardarArchivo, urlVerificacion } from '@/lib/certificado';

const props = defineProps<{ codigo: string }>();

const url = computed(() => urlVerificacion(props.codigo));
const puedeCompartir = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

const descargando = ref(false);
const errorDescarga = ref<string | null>(null);
const avisoDescarga = ref<string | null>(null);
const avisoEnlace = ref<string | null>(null);
const errorEnlace = ref<string | null>(null);
const campoEnlace = ref<HTMLInputElement | null>(null);

async function descargar(): Promise<void> {
  if (descargando.value) return;
  descargando.value = true;
  errorDescarga.value = null;
  avisoDescarga.value = null;
  try {
    const { blob, nombre } = await descargarCertificadoPdf(props.codigo);
    guardarArchivo(blob, nombre);
    avisoDescarga.value = `Descargamos tu certificado como ${nombre}.`;
  } catch (e) {
    errorDescarga.value =
      e instanceof ApiError
        ? e.message
        : 'No pudimos descargar el certificado. Inténtalo de nuevo.';
  } finally {
    descargando.value = false;
  }
}

async function copiar(): Promise<void> {
  avisoEnlace.value = null;
  errorEnlace.value = null;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('sin portapapeles');
    await navigator.clipboard.writeText(url.value);
    avisoEnlace.value = 'Enlace copiado.';
  } catch {
    // Respaldo: se selecciona el texto para que la persona lo copie con su teclado o su menú.
    campoEnlace.value?.focus();
    campoEnlace.value?.select();
    errorEnlace.value =
      'No pudimos copiar el enlace automáticamente. Ya está seleccionado: cópialo con tu teclado o con mantener pulsado.';
  }
}

async function compartir(): Promise<void> {
  avisoEnlace.value = null;
  errorEnlace.value = null;
  try {
    await navigator.share({
      title: 'Mi certificado de Metabolismo óseo',
      text: 'Verifica mi certificado de Metabolismo óseo con este enlace.',
      url: url.value,
    });
  } catch (e) {
    // Cancelar el cuadro de compartir no es un error.
    if (e instanceof DOMException && e.name === 'AbortError') return;
    errorEnlace.value = 'No pudimos abrir el menú de compartir. Usa el botón de copiar el enlace.';
  }
}
</script>

<template>
  <div class="space-y-6" data-testid="acciones-certificado">
    <section aria-labelledby="titulo-descarga" class="space-y-3">
      <h2 id="titulo-descarga" class="text-xl font-semibold">Descargar tu certificado</h2>
      <p class="text-muted-foreground text-sm">
        El PDF incluye tu nombre, el código y un QR para que otra persona lo verifique.
      </p>
      <Button
        size="lg"
        :disabled="descargando"
        :aria-busy="descargando"
        data-testid="descargar-pdf"
        @click="descargar"
      >
        <LoaderCircle v-if="descargando" class="motion-safe:animate-spin" aria-hidden="true" />
        <Download v-else aria-hidden="true" />
        {{ descargando ? 'Preparando el PDF…' : 'Descargar PDF' }}
      </Button>
      <p
        v-if="avisoDescarga"
        role="status"
        class="text-success text-sm"
        data-testid="aviso-descarga"
      >
        {{ avisoDescarga }}
      </p>
      <p
        v-if="errorDescarga"
        role="alert"
        class="bg-accent text-accent-foreground rounded-md px-3 py-2 text-sm"
        data-testid="error-descarga"
      >
        {{ errorDescarga }}
      </p>
    </section>

    <section aria-labelledby="titulo-enlace" class="space-y-3">
      <h2 id="titulo-enlace" class="text-xl font-semibold">Enlace de verificación</h2>
      <p class="text-muted-foreground text-sm">
        Cualquier persona con este enlace puede comprobar que tu certificado es auténtico, sin
        iniciar sesión. Solo verá tu nombre, la fecha, el puntaje y las últimas 3 cifras de tu
        identificación.
      </p>
      <div class="space-y-1.5">
        <label for="enlace-verificacion" class="text-sm font-medium">
          Enlace público de verificación
        </label>
        <input
          id="enlace-verificacion"
          ref="campoEnlace"
          type="text"
          readonly
          :value="url"
          class="border-input bg-background h-11 w-full rounded-md border px-3 font-mono text-sm"
          data-testid="enlace-verificacion"
          @focus="($event.target as HTMLInputElement).select()"
        />
      </div>
      <div class="flex flex-wrap gap-3">
        <Button variant="outline" data-testid="copiar-enlace" @click="copiar">
          <Copy aria-hidden="true" />
          Copiar enlace
        </Button>
        <Button v-if="puedeCompartir" variant="outline" data-testid="compartir" @click="compartir">
          <Share2 aria-hidden="true" />
          Compartir
        </Button>
      </div>
      <p v-if="avisoEnlace" role="status" class="text-success text-sm" data-testid="aviso-enlace">
        {{ avisoEnlace }}
      </p>
      <p
        v-if="errorEnlace"
        role="alert"
        class="bg-accent text-accent-foreground rounded-md px-3 py-2 text-sm"
        data-testid="error-enlace"
      >
        {{ errorEnlace }}
      </p>
    </section>
  </div>
</template>
