<script setup lang="ts">
/**
 * Certificado (F5-05). Cuatro estados a partir de `GET /api/certificate/status`:
 *   cargando / error  → mensajes legibles y reintento;
 *   no elegible       → requisitos: módulos y puntaje frente al umbral, y qué falta;
 *   elegible          → botón "Obtener mi certificado" (POST idempotente);
 *   emitido           → tarjeta, descarga del PDF y enlace público de verificación.
 * Un 409 `certificado_no_elegible` al emitir (el avance cambió entre la lectura y el clic) muestra
 * los motivos y vuelve a leer el estado.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { Award, LoaderCircle, RefreshCw, TriangleAlert } from '@lucide/vue';
import AccionesCertificado from '@/components/certificado/AccionesCertificado.vue';
import CelebracionCertificado from '@/components/certificado/CelebracionCertificado.vue';
import RequisitosCertificado from '@/components/certificado/RequisitosCertificado.vue';
import TarjetaCertificado from '@/components/certificado/TarjetaCertificado.vue';
import { Button, buttonVariants } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { emitirCertificado, obtenerEstadoCertificado } from '@/lib/certificado';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import type { CertificadoEstado } from '@/types/api';

const auth = useAuthStore();

const estado = ref<CertificadoEstado | null>(null);
const cargando = ref(true);
const errorCarga = ref<string | null>(null);

const emitiendo = ref(false);
const errorEmision = ref<string | null>(null);
const motivosEmision = ref<string[]>([]);
/** `true` solo cuando este clic creó el certificado (201): habilita la celebración. */
const recienEmitido = ref(false);
const tituloEmitido = ref<HTMLElement | null>(null);

let cancelar: AbortController | null = null;

const nombreCompleto = computed(() =>
  auth.usuario ? `${auth.usuario.nombre} ${auth.usuario.apellido}` : '',
);
const certificado = computed(() => (estado.value?.emitido ? estado.value.certificado : null));

function mensajeDe(e: unknown, respaldo: string): string {
  return e instanceof ApiError ? e.message : respaldo;
}

async function cargar(): Promise<void> {
  cancelar?.abort();
  const control = new AbortController();
  cancelar = control;
  cargando.value = true;
  errorCarga.value = null;
  try {
    const datos = await obtenerEstadoCertificado(control.signal);
    if (control.signal.aborted) return;
    estado.value = datos;
  } catch (e) {
    if (control.signal.aborted) return;
    errorCarga.value = mensajeDe(e, 'No pudimos consultar tu certificado. Inténtalo de nuevo.');
  } finally {
    if (cancelar === control) cargando.value = false;
  }
}

async function emitir(): Promise<void> {
  if (emitiendo.value) return;
  emitiendo.value = true;
  errorEmision.value = null;
  motivosEmision.value = [];
  try {
    const respuesta = await emitirCertificado();
    if (estado.value) {
      estado.value = { ...estado.value, emitido: true, certificado: respuesta.certificado };
    }
    recienEmitido.value = respuesta.nuevo;
    await nextTick();
    tituloEmitido.value?.focus({ preventScroll: false });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'certificado_no_elegible') {
      const motivos = e.detalle.motivos;
      motivosEmision.value = Array.isArray(motivos)
        ? motivos.filter((m): m is string => typeof m === 'string')
        : [];
      errorEmision.value = 'Todavía no cumples los requisitos para obtener el certificado.';
      // Se vuelve a leer para que los requisitos en pantalla reflejen la realidad.
      void cargar();
    } else {
      errorEmision.value = mensajeDe(e, 'No pudimos emitir tu certificado. Inténtalo de nuevo.');
    }
  } finally {
    emitiendo.value = false;
  }
}

onMounted(() => {
  void cargar();
});
onBeforeUnmount(() => cancelar?.abort());
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
    <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Mi certificado</h1>
    <p class="text-muted-foreground mt-2 max-w-prose">
      Al completar los seis módulos con el puntaje mínimo obtienes un certificado con un código que
      cualquiera puede verificar.
    </p>

    <!-- Cargando -->
    <p
      v-if="cargando && !estado"
      role="status"
      class="text-muted-foreground mt-8 flex items-center gap-2"
      data-testid="cert-cargando"
    >
      <LoaderCircle class="size-5 motion-safe:animate-spin" aria-hidden="true" />
      Consultando tu certificado…
    </p>

    <!-- Error de carga -->
    <div
      v-else-if="errorCarga && !estado"
      role="alert"
      class="bg-accent text-accent-foreground mt-8 space-y-3 rounded-xl border p-4"
      data-testid="cert-error"
    >
      <p class="flex items-start gap-2">
        <TriangleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span>{{ errorCarga }}</span>
      </p>
      <Button variant="outline" data-testid="cert-reintentar" @click="cargar">
        <RefreshCw aria-hidden="true" />
        Reintentar
      </Button>
    </div>

    <template v-else-if="estado">
      <!-- Emitido -->
      <div v-if="certificado" class="relative mt-8 space-y-8" data-testid="cert-emitido">
        <CelebracionCertificado v-if="recienEmitido" />
        <div class="space-y-2">
          <h2
            ref="tituloEmitido"
            tabindex="-1"
            class="text-success text-2xl font-semibold outline-none"
          >
            {{
              recienEmitido
                ? '¡Felicitaciones, obtuviste tu certificado!'
                : 'Tu certificado está emitido'
            }}
          </h2>
          <p v-if="recienEmitido" role="status" class="sr-only">
            Certificado emitido con el código {{ certificado.codigo }}.
          </p>
        </div>
        <TarjetaCertificado :certificado="certificado" :nombre-completo="nombreCompleto" />
        <AccionesCertificado :codigo="certificado.codigo" />
      </div>

      <!-- Elegible: puede emitirlo -->
      <div v-else-if="estado.elegible" class="mt-8 space-y-6" data-testid="cert-elegible">
        <div class="bg-success-soft space-y-3 rounded-xl border p-5">
          <h2 class="text-foreground flex items-center gap-2 font-serif text-2xl font-semibold">
            <Award class="text-success size-6 shrink-0" aria-hidden="true" />
            ¡Cumples los requisitos!
          </h2>
          <p class="text-foreground">
            Completaste los seis módulos y alcanzaste el puntaje mínimo. Al obtener el certificado
            se guarda con tu nombre y el puntaje de hoy; no cambia si después sigues practicando.
          </p>
          <Button
            size="lg"
            :disabled="emitiendo"
            :aria-busy="emitiendo"
            data-testid="obtener-certificado"
            @click="emitir"
          >
            <LoaderCircle v-if="emitiendo" class="motion-safe:animate-spin" aria-hidden="true" />
            <Award v-else aria-hidden="true" />
            {{ emitiendo ? 'Emitiendo…' : 'Obtener mi certificado' }}
          </Button>
        </div>
        <RequisitosCertificado :estado="estado" />
      </div>

      <!-- No elegible: qué falta -->
      <div v-else class="mt-8 space-y-6" data-testid="cert-no-elegible">
        <div class="bg-accent text-accent-foreground space-y-2 rounded-xl border p-4">
          <h2 class="font-serif text-xl font-semibold">Aún no puedes obtener el certificado</h2>
          <ul
            v-if="estado.motivos.length > 0"
            class="list-disc space-y-1 pl-5"
            data-testid="motivos"
          >
            <li v-for="motivo in estado.motivos" :key="motivo">{{ motivo }}</li>
          </ul>
        </div>
        <RequisitosCertificado :estado="estado" />
      </div>

      <!-- Error al emitir -->
      <div
        v-if="errorEmision"
        role="alert"
        class="bg-accent text-accent-foreground mt-6 space-y-2 rounded-xl border p-4"
        data-testid="error-emision"
      >
        <p class="flex items-start gap-2">
          <TriangleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>{{ errorEmision }}</span>
        </p>
        <ul v-if="motivosEmision.length > 0" class="list-disc space-y-1 pl-9">
          <li v-for="motivo in motivosEmision" :key="motivo">{{ motivo }}</li>
        </ul>
      </div>

      <!-- Un error al releer el estado no oculta lo que ya se mostraba -->
      <p
        v-if="errorCarga"
        role="alert"
        class="text-accent-foreground mt-4 flex flex-wrap items-center gap-2 text-sm"
        data-testid="cert-error-recarga"
      >
        {{ errorCarga }}
        <Button variant="outline" size="sm" @click="cargar">Reintentar</Button>
      </p>
    </template>

    <RouterLink :to="{ name: 'inicio' }" :class="cn(buttonVariants({ variant: 'ghost' }), 'mt-8')">
      Volver al inicio
    </RouterLink>
  </div>
</template>
