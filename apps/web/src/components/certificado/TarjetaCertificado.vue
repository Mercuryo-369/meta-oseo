<script setup lang="ts">
/**
 * Vista previa del certificado emitido, como tarjeta. Es una vista de pantalla, no el documento:
 * el PDF (con QR) es lo que vale fuera de la aplicación.
 */
import { computed } from 'vue';
import { Award } from '@lucide/vue';
import { formatearFecha, formatearPorcentaje, formatearPuntos } from '@/lib/formato';
import type { CertificadoResumen } from '@/types/api';

const props = defineProps<{
  certificado: CertificadoResumen;
  nombreCompleto: string;
}>();

const fecha = computed(() => formatearFecha(props.certificado.emitido_en));
</script>

<template>
  <article
    aria-labelledby="titulo-tarjeta-cert"
    class="bg-card border-primary/40 relative overflow-hidden rounded-2xl border-2 p-5 shadow-sm md:p-8"
    data-testid="tarjeta-certificado"
  >
    <div
      class="border-primary/25 pointer-events-none absolute inset-2 rounded-xl border"
      aria-hidden="true"
    />
    <div class="relative space-y-5 text-center">
      <Award class="text-eosina mx-auto size-10" aria-hidden="true" />
      <div class="space-y-1">
        <h2
          id="titulo-tarjeta-cert"
          class="text-primary text-sm font-semibold tracking-widest uppercase"
        >
          Certificado de finalización
        </h2>
        <p class="text-muted-foreground text-sm">Se certifica que</p>
      </div>
      <p
        class="font-serif text-3xl leading-tight font-semibold break-words md:text-4xl"
        data-testid="tarjeta-nombre"
      >
        {{ nombreCompleto }}
      </p>
      <p class="mx-auto max-w-prose">
        completó los seis módulos de
        <em>Metabolismo óseo: un viaje interactivo desde la célula hasta el hueso</em>.
      </p>

      <dl class="grid gap-3 text-left text-sm sm:grid-cols-3">
        <div class="bg-muted/60 rounded-lg p-3">
          <dt class="text-muted-foreground">Fecha de emisión</dt>
          <dd class="font-medium" data-testid="tarjeta-fecha">{{ fecha }}</dd>
        </div>
        <div class="bg-muted/60 rounded-lg p-3">
          <dt class="text-muted-foreground">Puntaje</dt>
          <dd class="font-medium tabular-nums" data-testid="tarjeta-puntaje">
            {{ formatearPuntos(certificado.puntaje_total) }}
            <span v-if="certificado.porcentaje !== null" class="text-muted-foreground font-normal">
              · {{ formatearPorcentaje(certificado.porcentaje) }} en obligatorias
            </span>
          </dd>
        </div>
        <div class="bg-muted/60 rounded-lg p-3">
          <dt class="text-muted-foreground">Código de verificación</dt>
          <dd class="font-mono font-semibold tracking-wide break-all" data-testid="tarjeta-codigo">
            {{ certificado.codigo }}
          </dd>
        </div>
      </dl>
    </div>
  </article>
</template>
