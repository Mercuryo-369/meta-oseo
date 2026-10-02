<script setup lang="ts">
/**
 * Verificación pública de certificados (`/verify/:codigo`, sin sesión ni AppShell). La abre un
 * tercero desde el QR o la URL impresa en el PDF, o escribe el código a mano.
 *
 * Estados: sin código (formulario), consultando, válido (nombre, apellido, fecha, puntaje e
 * identificación ENMASCARADA tal como llega), no encontrado (mensaje neutro: no revela nada más),
 * demasiados intentos (429 con `Retry-After`: cuenta atrás y reintento) y error de red o servidor.
 * Un código mal formado ni siquiera se envía y muestra el mismo mensaje neutro.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import {
  CircleCheck,
  CircleX,
  Clock,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { codigoBienFormado, normalizarCodigo, verificarCertificado } from '@/lib/certificado';
import { formatearFecha, formatearPorcentaje, formatearPuntos } from '@/lib/formato';
import type { CertificadoVerificado } from '@/types/api';

type Fase = 'vacio' | 'cargando' | 'valido' | 'no_encontrado' | 'limite' | 'error';

const route = useRoute();
const router = useRouter();

const LOGO = '/favicon.svg';

const entrada = ref('');
const fase = ref<Fase>('vacio');
const resultado = ref<CertificadoVerificado | null>(null);
const mensajeError = ref('');
/** Segundos que faltan para poder reintentar tras un 429. */
const espera = ref(0);
/** Código normalizado de la consulta en curso o la última hecha. */
const consultado = ref('');
const encabezado = ref<HTMLElement | null>(null);

let cancelar: AbortController | null = null;
let reloj: ReturnType<typeof setInterval> | null = null;

const codigoDeRuta = computed(() => {
  const p = route.params.codigo;
  return typeof p === 'string' ? p : Array.isArray(p) ? (p[0] ?? '') : '';
});
const bloqueado = computed(() => fase.value === 'cargando' || espera.value > 0);
const ultimosDigitos = computed(() => resultado.value?.identificacion_enmascarada.slice(-3) ?? '');

function detenerReloj(): void {
  if (reloj !== null) clearInterval(reloj);
  reloj = null;
}

function iniciarCuentaAtras(segundos: number): void {
  detenerReloj();
  espera.value = segundos;
  reloj = setInterval(() => {
    espera.value = Math.max(0, espera.value - 1);
    if (espera.value === 0) detenerReloj();
  }, 1000);
}

async function enfocarEncabezado(): Promise<void> {
  await nextTick();
  encabezado.value?.focus({ preventScroll: false });
}

async function consultar(bruto: string): Promise<void> {
  cancelar?.abort();
  detenerReloj();
  espera.value = 0;
  const codigo = normalizarCodigo(bruto);
  entrada.value = codigo;
  consultado.value = codigo;
  resultado.value = null;

  if (!codigo) {
    fase.value = 'vacio';
    return;
  }
  // Un código mal formado no puede existir: se evita gastar uno de los intentos por minuto.
  if (!codigoBienFormado(codigo)) {
    fase.value = 'no_encontrado';
    await enfocarEncabezado();
    return;
  }

  const control = new AbortController();
  cancelar = control;
  fase.value = 'cargando';
  try {
    const datos = await verificarCertificado(codigo, control.signal);
    if (control.signal.aborted) return;
    if (datos.valido === false) {
      fase.value = 'no_encontrado';
    } else {
      resultado.value = datos;
      fase.value = 'valido';
    }
  } catch (e) {
    if (control.signal.aborted) return;
    if (e instanceof ApiError && e.code === 'certificado_no_encontrado') {
      fase.value = 'no_encontrado';
    } else if (e instanceof ApiError && e.status === 429) {
      const segundos = Number(e.detalle.retry_after);
      iniciarCuentaAtras(Number.isFinite(segundos) && segundos > 0 ? segundos : 30);
      fase.value = 'limite';
    } else {
      mensajeError.value =
        e instanceof ApiError
          ? e.message
          : 'No pudimos verificar el certificado. Inténtalo de nuevo.';
      fase.value = 'error';
    }
  }
  if (!control.signal.aborted) await enfocarEncabezado();
}

function enviar(): void {
  if (bloqueado.value) return;
  const codigo = normalizarCodigo(entrada.value);
  if (codigo && codigo !== codigoDeRuta.value) {
    // La URL pasa a ser el enlace compartible del certificado; el watch de la ruta consulta.
    void router.push({ name: 'verificar', params: { codigo } });
  } else {
    void consultar(entrada.value);
  }
}

watch(
  codigoDeRuta,
  (codigo) => {
    entrada.value = codigo;
    void consultar(codigo);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  cancelar?.abort();
  detenerReloj();
});
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="border-b">
      <div class="mx-auto flex min-h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
        <span class="text-primary flex items-center gap-2 font-serif text-lg font-semibold">
          <img :src="LOGO" alt="" class="size-8" width="32" height="32" />
          Metabolismo óseo
        </span>
        <RouterLink
          :to="{ name: 'inicio' }"
          class="text-primary inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
        >
          Ir al OVA
        </RouterLink>
      </div>
    </header>

    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:py-10" data-testid="verificar">
      <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Verificar un certificado</h1>
      <p class="text-muted-foreground mt-2 max-w-prose">
        Escribe el código que aparece en el certificado (por ejemplo, OVA-7K3M-9QXA) o abre el
        enlace o el QR del documento. Comprueba que los datos coincidan con los del certificado que
        tienes.
      </p>

      <form class="mt-6 space-y-3" novalidate @submit.prevent="enviar">
        <label for="codigo-verificacion" class="block text-sm font-medium">
          Código de verificación
        </label>
        <div class="flex flex-col gap-3 sm:flex-row">
          <input
            id="codigo-verificacion"
            v-model="entrada"
            type="text"
            inputmode="text"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            maxlength="40"
            placeholder="OVA-XXXX-XXXX"
            class="border-input bg-background h-11 min-w-0 flex-1 rounded-md border px-3 font-mono text-base uppercase"
            data-testid="campo-codigo"
          />
          <Button type="submit" size="lg" :disabled="bloqueado" data-testid="verificar-enviar">
            <LoaderCircle
              v-if="fase === 'cargando'"
              class="motion-safe:animate-spin"
              aria-hidden="true"
            />
            <ShieldCheck v-else aria-hidden="true" />
            Verificar
          </Button>
        </div>
      </form>

      <!-- Resultado. Un solo contenedor con aria-live: el lector de pantalla anuncia el cambio. -->
      <div class="mt-8" aria-live="polite" data-testid="resultado">
        <p
          v-if="fase === 'cargando'"
          class="text-muted-foreground flex items-center gap-2"
          data-testid="verificar-cargando"
        >
          <LoaderCircle class="size-5 motion-safe:animate-spin" aria-hidden="true" />
          Verificando el certificado…
        </p>

        <section
          v-else-if="fase === 'valido' && resultado"
          aria-labelledby="titulo-resultado"
          class="bg-success-soft space-y-4 rounded-xl border p-5"
          data-testid="verificar-valido"
        >
          <h2
            id="titulo-resultado"
            ref="encabezado"
            tabindex="-1"
            class="text-foreground flex items-center gap-2 font-serif text-2xl font-semibold outline-none"
          >
            <CircleCheck class="text-success size-7 shrink-0" aria-hidden="true" />
            Certificado válido
          </h2>
          <p class="text-foreground">
            Este certificado fue emitido por el OVA «Metabolismo óseo» y sus datos son los
            siguientes.
          </p>
          <dl class="grid gap-3 text-sm sm:grid-cols-2">
            <div class="bg-card rounded-lg border p-3">
              <dt class="text-muted-foreground">Nombre</dt>
              <dd class="text-base font-medium" data-testid="dato-nombre">
                {{ resultado.nombre }} {{ resultado.apellido }}
              </dd>
            </div>
            <div class="bg-card rounded-lg border p-3">
              <dt class="text-muted-foreground">Identificación</dt>
              <dd class="text-base font-medium" data-testid="dato-identificacion">
                {{ resultado.tipo_identificacion }}
                <span aria-hidden="true" class="font-mono">{{
                  resultado.identificacion_enmascarada
                }}</span>
                <span class="sr-only">terminada en {{ ultimosDigitos }}</span>
              </dd>
            </div>
            <div class="bg-card rounded-lg border p-3">
              <dt class="text-muted-foreground">Fecha de emisión</dt>
              <dd class="text-base font-medium" data-testid="dato-fecha">
                {{ formatearFecha(resultado.emitido_en) }}
              </dd>
            </div>
            <div class="bg-card rounded-lg border p-3">
              <dt class="text-muted-foreground">Puntaje</dt>
              <dd class="text-base font-medium tabular-nums" data-testid="dato-puntaje">
                {{ formatearPuntos(resultado.puntaje_total) }}
                <span
                  v-if="resultado.porcentaje !== null"
                  class="text-muted-foreground font-normal"
                >
                  · {{ formatearPorcentaje(resultado.porcentaje) }} en las actividades obligatorias
                </span>
              </dd>
            </div>
            <div class="bg-card rounded-lg border p-3 sm:col-span-2">
              <dt class="text-muted-foreground">Código</dt>
              <dd class="font-mono text-base font-semibold tracking-wide" data-testid="dato-codigo">
                {{ resultado.codigo }}
              </dd>
            </div>
          </dl>
          <p class="text-muted-foreground text-sm">
            Por privacidad solo se muestran las últimas 3 cifras de la identificación.
          </p>
        </section>

        <section
          v-else-if="fase === 'no_encontrado'"
          aria-labelledby="titulo-resultado"
          class="bg-accent text-accent-foreground space-y-2 rounded-xl border p-5"
          data-testid="verificar-no-encontrado"
        >
          <h2
            id="titulo-resultado"
            ref="encabezado"
            tabindex="-1"
            class="flex items-center gap-2 font-serif text-2xl font-semibold outline-none"
          >
            <CircleX class="size-7 shrink-0" aria-hidden="true" />
            No encontramos ese certificado
          </h2>
          <p>
            No hay ningún certificado con ese código. Revisa que esté escrito tal como aparece en el
            documento e inténtalo de nuevo.
          </p>
        </section>

        <section
          v-else-if="fase === 'limite'"
          aria-labelledby="titulo-resultado"
          class="bg-accent text-accent-foreground space-y-3 rounded-xl border p-5"
          data-testid="verificar-limite"
        >
          <h2
            id="titulo-resultado"
            ref="encabezado"
            tabindex="-1"
            class="flex items-center gap-2 font-serif text-2xl font-semibold outline-none"
          >
            <Clock class="size-7 shrink-0" aria-hidden="true" />
            Demasiadas consultas
          </h2>
          <p>Hiciste muchas consultas seguidas. Espera un poco e inténtalo de nuevo.</p>
          <p class="font-medium tabular-nums" data-testid="verificar-espera">
            <template v-if="espera > 0">
              Podrás volver a intentarlo en {{ espera }}
              {{ espera === 1 ? 'segundo' : 'segundos' }}.
            </template>
            <template v-else>Ya puedes intentarlo de nuevo.</template>
          </p>
          <Button
            variant="outline"
            :disabled="espera > 0"
            data-testid="verificar-reintentar"
            @click="consultar(consultado)"
          >
            <RefreshCw aria-hidden="true" />
            Reintentar
          </Button>
        </section>

        <section
          v-else-if="fase === 'error'"
          role="alert"
          aria-labelledby="titulo-resultado"
          class="bg-accent text-accent-foreground space-y-3 rounded-xl border p-5"
          data-testid="verificar-error"
        >
          <h2
            id="titulo-resultado"
            ref="encabezado"
            tabindex="-1"
            class="flex items-center gap-2 font-serif text-2xl font-semibold outline-none"
          >
            <TriangleAlert class="size-7 shrink-0" aria-hidden="true" />
            No pudimos verificarlo
          </h2>
          <p>{{ mensajeError }}</p>
          <Button
            variant="outline"
            data-testid="verificar-reintentar"
            @click="consultar(consultado)"
          >
            <RefreshCw aria-hidden="true" />
            Reintentar
          </Button>
        </section>
      </div>
    </main>

    <footer class="text-muted-foreground border-t px-4 py-4 text-center text-sm">
      Metabolismo óseo · Objeto Virtual de Aprendizaje
    </footer>
  </div>
</template>
