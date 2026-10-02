<script setup lang="ts">
/**
 * Pestaña "Resumen": cifras de la cohorte, distribución de módulos completados y tiempo
 * promedio por módulo (docs/api-contract.md, GET /api/teacher/overview).
 */
import { computed, onMounted } from 'vue';
import { RefreshCw } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { moduloPorNumero } from '@/data/modulos';
import { obtenerResumenDocente } from '@/lib/docenteApi';
import EstadoPanel from './EstadoPanel.vue';
import GraficoBarras from './GraficoBarras.vue';
import type { PuntoBarra } from './GraficoBarras.vue';
import TarjetaDato from './TarjetaDato.vue';
import { conPuntoFinal, formatoDuracion, formatoFechaHora, formatoNumero } from './formato';
import { useCarga } from './useCarga';

const { datos, cargando, error, cargar } = useCarga(obtenerResumenDocente);
onMounted(cargar);

const sinEstudiantes = computed(() => datos.value !== null && datos.value.estudiantes === 0);

const barrasModulos = computed<PuntoBarra[]>(() =>
  (datos.value?.modulos_completados ?? []).map((b) => ({
    etiqueta: `${b.modulos_completados} ${b.modulos_completados === 1 ? 'módulo completado' : 'módulos completados'}`,
    corta: String(b.modulos_completados),
    valor: b.estudiantes,
  })),
);

const barrasTiempo = computed<PuntoBarra[]>(() =>
  (datos.value?.tiempo_por_modulo ?? []).map((t) => ({
    etiqueta: `Módulo ${t.modulo}: ${moduloPorNumero(t.modulo)?.titulo ?? ''} (${t.estudiantes} ${t.estudiantes === 1 ? 'estudiante' : 'estudiantes'})`,
    corta: `M${t.modulo}`,
    valor: t.tiempo_promedio_seg ?? 0,
  })),
);
</script>

<template>
  <section aria-labelledby="titulo-resumen" class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="titulo-resumen" class="text-2xl font-semibold">Resumen de la cohorte</h2>
        <p v-if="datos" class="text-muted-foreground text-sm">
          {{ conPuntoFinal(`Datos al ${formatoFechaHora(datos.generado_en)}`) }} Solo cuentan los
          estudiantes.
        </p>
      </div>
      <Button variant="outline" :disabled="cargando" @click="cargar">
        <RefreshCw aria-hidden="true" />
        Actualizar
      </Button>
    </div>

    <EstadoPanel
      :cargando="cargando"
      :error="error"
      :hay-datos="datos !== null"
      :vacio="sinEstudiantes"
      texto-vacio="Todavía no hay estudiantes registrados. Cuando se registren, aquí verás su avance."
      que="el resumen"
      @reintentar="cargar"
    >
      <template v-if="datos">
        <dl class="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <TarjetaDato rotulo="Estudiantes" :valor="formatoNumero(datos.estudiantes)" />
          <TarjetaDato
            rotulo="Activos en 7 días"
            :valor="formatoNumero(datos.activos_7d)"
            nota="Con alguna actividad reciente"
          />
          <TarjetaDato rotulo="Activos en 30 días" :valor="formatoNumero(datos.activos_30d)" />
          <TarjetaDato
            rotulo="Puntaje promedio"
            :valor="formatoNumero(datos.puntaje.promedio, 1)"
          />
          <TarjetaDato rotulo="Puntaje mediana" :valor="formatoNumero(datos.puntaje.mediana, 1)" />
        </dl>

        <div class="mt-6 grid gap-4 lg:grid-cols-2">
          <GraficoBarras
            titulo="Módulos completados por estudiante"
            descripcion="Cuántos estudiantes han completado 0, 1, 2… hasta 6 módulos."
            :datos="barrasModulos"
            columna-etiqueta="Módulos completados"
            columna-valor="Estudiantes"
            :formato-valor="(v) => formatoNumero(v)"
          />
          <GraficoBarras
            titulo="Tiempo promedio por módulo"
            descripcion="Promedio entre los estudiantes que han abierto cada módulo."
            :datos="barrasTiempo"
            columna-etiqueta="Módulo"
            columna-valor="Tiempo promedio"
            :formato-valor="formatoDuracion"
          />
        </div>
      </template>
    </EstadoPanel>
  </section>
</template>
