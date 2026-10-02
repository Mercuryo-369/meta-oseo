<script setup lang="ts">
/**
 * Pestaña "Exportar": descarga del CSV de progreso con fetch autenticado (un enlace directo
 * no llevaría el token). Por defecto la identificación sale enmascarada; el número completo
 * exige una confirmación explícita porque es un dato personal.
 */
import { nextTick, onBeforeUnmount, ref } from 'vue';
import { Download, ShieldAlert } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { descargarProgresoCsv } from '@/lib/docenteApi';
import { guardarBlob } from './descarga';
import { mensajeDeError } from './useCarga';

const descargando = ref(false);
const error = ref<string | null>(null);
const exito = ref<string | null>(null);
const confirmando = ref(false);
// Refs a componentes <Button>: el elemento nativo está en `$el`.
const botonCancelar = ref<{ $el?: HTMLElement } | null>(null);
const botonCompleta = ref<{ $el?: HTMLElement } | null>(null);
const controlador = ref<AbortController | null>(null);

onBeforeUnmount(() => controlador.value?.abort());

async function descargar(completa: boolean): Promise<void> {
  if (descargando.value) return;
  descargando.value = true;
  error.value = null;
  exito.value = null;
  const actual = new AbortController();
  controlador.value = actual;
  try {
    const { blob, nombre } = await descargarProgresoCsv(completa, actual.signal);
    guardarBlob(blob, nombre);
    exito.value = `Se descargó «${nombre}»${completa ? ' con identificación completa. Guárdalo en un lugar seguro.' : ' con la identificación enmascarada.'}`;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    error.value = mensajeDeError(e);
  } finally {
    descargando.value = false;
    if (confirmando.value) {
      confirmando.value = false;
      // El diálogo desaparece: el foco vuelve al botón que lo abrió.
      await nextTick();
      botonCompleta.value?.$el?.focus();
    }
  }
}

async function pedirConfirmacion(): Promise<void> {
  error.value = null;
  exito.value = null;
  confirmando.value = true;
  await nextTick();
  // El foco cae en la opción segura: cancelar.
  botonCancelar.value?.$el?.focus();
}

async function cancelar(): Promise<void> {
  confirmando.value = false;
  await nextTick();
  botonCompleta.value?.$el?.focus();
}
</script>

<template>
  <section aria-labelledby="titulo-exportar" class="space-y-6">
    <div>
      <h2 id="titulo-exportar" class="text-2xl font-semibold">Exportar progreso</h2>
      <p class="text-muted-foreground max-w-prose text-sm">
        Archivo CSV para Excel o una hoja de cálculo, con una fila por estudiante y por módulo:
        estado, sección actual, tiempo, puntaje del módulo, actividades completadas y puntaje total.
      </p>
    </div>

    <div class="bg-card max-w-2xl space-y-3 rounded-xl border p-4">
      <h3 class="text-lg font-semibold">Descarga con identificación enmascarada</h3>
      <p class="text-muted-foreground text-sm">
        Del número de identificación solo se ven los últimos 3 caracteres. Es la opción recomendada.
      </p>
      <Button :disabled="descargando" @click="descargar(false)">
        <Download aria-hidden="true" />
        {{ descargando && !confirmando ? 'Descargando…' : 'Descargar CSV' }}
      </Button>
    </div>

    <div class="bg-card max-w-2xl space-y-3 rounded-xl border p-4">
      <h3 class="text-lg font-semibold">Descarga con identificación completa</h3>
      <p class="text-muted-foreground text-sm">
        Incluye el número de identificación de cada estudiante sin enmascarar. Solo úsala si es
        imprescindible.
      </p>
      <Button
        v-if="!confirmando"
        ref="botonCompleta"
        variant="outline"
        :disabled="descargando"
        @click="pedirConfirmacion"
      >
        <ShieldAlert aria-hidden="true" />
        Descargar con identificación completa…
      </Button>

      <div
        v-else
        role="alertdialog"
        aria-labelledby="titulo-confirmacion"
        aria-describedby="texto-confirmacion"
        class="border-destructive space-y-3 rounded-lg border-2 p-4"
      >
        <h4 id="titulo-confirmacion" class="text-destructive flex items-center gap-2 font-semibold">
          <ShieldAlert class="size-5" aria-hidden="true" />
          Vas a descargar datos personales
        </h4>
        <p id="texto-confirmacion" class="text-sm">
          El archivo contendrá el nombre y el número de identificación completo de todos los
          estudiantes. Son datos personales: no lo compartas, no lo subas a servicios sin control y
          bórralo cuando ya no lo necesites. ¿Confirmas que quieres descargarlo?
        </p>
        <div class="flex flex-wrap gap-2">
          <Button ref="botonCancelar" variant="outline" @click="cancelar">Cancelar</Button>
          <Button variant="destructive" :disabled="descargando" @click="descargar(true)">
            <Download aria-hidden="true" />
            {{ descargando ? 'Descargando…' : 'Sí, descargar con identificación completa' }}
          </Button>
        </div>
      </div>
    </div>

    <p
      v-if="error"
      role="alert"
      class="border-destructive/50 text-destructive bg-card max-w-2xl rounded-lg border p-3 text-sm font-medium"
    >
      {{ error }}
    </p>
    <p
      v-if="exito"
      role="status"
      class="text-success bg-success-soft max-w-2xl rounded-lg p-3 text-sm font-medium"
    >
      {{ exito }}
    </p>
  </section>
</template>
