<script setup lang="ts">
/**
 * Pestaña "Mentor": consultas, tokens y costo estimado del mentor de IA
 * (GET /api/teacher/mentor/usage). El costo es una ESTIMACIÓN con precios configurables en el
 * servidor, no la factura de Anthropic; se dice de forma visible.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { RefreshCw } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { obtenerUsoMentorDocente } from '@/lib/docenteApi';
import EstadoPanel from './EstadoPanel.vue';
import GraficoBarras from './GraficoBarras.vue';
import type { PuntoBarra } from './GraficoBarras.vue';
import TablaDesplazable from './TablaDesplazable.vue';
import TarjetaDato from './TarjetaDato.vue';
import { formatoDia, formatoDiaCorto, formatoNumero, formatoUsd } from './formato';
import { useCarga } from './useCarga';

const PERIODOS = [7, 30, 90] as const;

// Cadena porque el <select> nativo trabaja con texto.
const periodo = ref('30');
const dias = computed(() => Number(periodo.value));
const { datos, cargando, error, cargar } = useCarga((signal) =>
  obtenerUsoMentorDocente(dias.value, 10, signal),
);
onMounted(cargar);
watch(dias, cargar);

const sinConsultas = computed(() => datos.value !== null && datos.value.totales.consultas === 0);

const barrasConsultas = computed<PuntoBarra[]>(() =>
  (datos.value?.por_dia ?? []).map((d) => ({
    etiqueta: formatoDia(d.fecha),
    corta: formatoDiaCorto(d.fecha),
    valor: d.consultas,
  })),
);
const barrasCosto = computed<PuntoBarra[]>(() =>
  (datos.value?.por_dia ?? []).map((d) => ({
    etiqueta: formatoDia(d.fecha),
    corta: formatoDiaCorto(d.fecha),
    valor: d.costo_estimado_usd,
  })),
);
</script>

<template>
  <section aria-labelledby="titulo-mentor" class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="titulo-mentor" class="text-2xl font-semibold">Uso del mentor</h2>
        <p class="text-muted-foreground text-sm">
          Incluye las consultas de todas las cuentas, también las del equipo docente. Los días se
          cuentan en UTC.
        </p>
      </div>
      <div class="flex items-end gap-2">
        <div class="space-y-1">
          <label for="periodo-mentor" class="text-sm font-medium">Período</label>
          <NativeSelect id="periodo-mentor" v-model="periodo" class="w-40">
            <option v-for="p in PERIODOS" :key="p" :value="String(p)">Últimos {{ p }} días</option>
          </NativeSelect>
        </div>
        <Button variant="outline" :disabled="cargando" @click="cargar">
          <RefreshCw aria-hidden="true" />
          Actualizar
        </Button>
      </div>
    </div>

    <div role="note" class="bg-accent text-accent-foreground rounded-lg border p-3 text-sm">
      <strong>El costo es una estimación.</strong>
      Se calcula con precios configurables en el servidor (variables de entorno) y no es la factura
      de Anthropic.
      <template v-if="datos">
        Precios usados: entrada {{ formatoUsd(datos.precios.entrada_usd_por_mtok) }} y salida
        {{ formatoUsd(datos.precios.salida_usd_por_mtok) }} por millón de tokens; el caché leído
        cuesta {{ formatoNumero(datos.precios.cache_lectura_factor, 2) }} veces el precio de entrada
        y el escrito {{ formatoNumero(datos.precios.cache_escritura_factor, 2) }} veces.
        {{ datos.precios.nota }}
      </template>
    </div>

    <EstadoPanel
      :cargando="cargando"
      :error="error"
      :hay-datos="datos !== null"
      :vacio="sinConsultas"
      :texto-vacio="`Todavía no hay consultas al mentor en los últimos ${dias} días.`"
      que="el uso del mentor"
      @reintentar="cargar"
    >
      <div v-if="datos" class="space-y-8">
        <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TarjetaDato rotulo="Consultas" :valor="formatoNumero(datos.totales.consultas)" />
          <TarjetaDato rotulo="Usuarios" :valor="formatoNumero(datos.totales.usuarios)" />
          <TarjetaDato
            rotulo="Tokens de entrada"
            :valor="formatoNumero(datos.totales.tokens_entrada)"
            :nota="`Caché leído: ${formatoNumero(datos.totales.tokens_cache_lectura)}`"
          />
          <TarjetaDato
            rotulo="Tokens de salida"
            :valor="formatoNumero(datos.totales.tokens_salida)"
          />
          <TarjetaDato
            rotulo="Costo estimado"
            :valor="formatoUsd(datos.totales.costo_estimado_usd)"
            nota="Estimación, no la factura"
          />
        </dl>

        <div class="grid gap-4 lg:grid-cols-2">
          <GraficoBarras
            titulo="Consultas por día"
            :descripcion="`Consultas al mentor cada día de los últimos ${datos.dias} días.`"
            :datos="barrasConsultas"
            columna-etiqueta="Día"
            columna-valor="Consultas"
            :formato-valor="(v) => formatoNumero(v)"
          />
          <GraficoBarras
            titulo="Costo estimado por día"
            descripcion="Estimación en dólares (USD) con los precios configurados."
            :datos="barrasCosto"
            columna-etiqueta="Día"
            columna-valor="Costo estimado"
            :formato-valor="formatoUsd"
          />
        </div>

        <section aria-labelledby="titulo-mentor-modelo" class="space-y-3">
          <h3 id="titulo-mentor-modelo" class="text-xl font-semibold">Por modelo</h3>
          <TablaDesplazable etiqueta="Uso del mentor por modelo">
            <thead class="bg-muted">
              <tr>
                <th scope="col">Modelo</th>
                <th scope="col" class="text-right">Consultas</th>
                <th scope="col" class="text-right">Tokens de entrada</th>
                <th scope="col" class="text-right">Tokens de salida</th>
                <th scope="col" class="text-right">Costo estimado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in datos.por_modelo" :key="m.modelo">
                <th scope="row" class="font-normal">{{ m.modelo }}</th>
                <td class="text-right tabular-nums">{{ formatoNumero(m.consultas) }}</td>
                <td class="text-right tabular-nums">{{ formatoNumero(m.tokens_entrada) }}</td>
                <td class="text-right tabular-nums">{{ formatoNumero(m.tokens_salida) }}</td>
                <td class="text-right tabular-nums">{{ formatoUsd(m.costo_estimado_usd) }}</td>
              </tr>
            </tbody>
          </TablaDesplazable>
        </section>

        <section aria-labelledby="titulo-mentor-dia-modelo" class="space-y-3">
          <h3 id="titulo-mentor-dia-modelo" class="text-xl font-semibold">Por día y modelo</h3>
          <p class="text-muted-foreground text-sm">Solo los días con consultas.</p>
          <TablaDesplazable etiqueta="Tokens y costo estimado por día y modelo">
            <thead class="bg-muted">
              <tr>
                <th scope="col">Día</th>
                <th scope="col">Modelo</th>
                <th scope="col" class="text-right">Consultas</th>
                <th scope="col" class="text-right">Tokens de entrada</th>
                <th scope="col" class="text-right">Tokens de salida</th>
                <th scope="col" class="text-right">Costo estimado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in datos.por_dia_modelo" :key="`${f.fecha}-${f.modelo}`">
                <th scope="row" class="font-normal whitespace-nowrap">{{ formatoDia(f.fecha) }}</th>
                <td>{{ f.modelo }}</td>
                <td class="text-right tabular-nums">{{ formatoNumero(f.consultas) }}</td>
                <td class="text-right tabular-nums">{{ formatoNumero(f.tokens_entrada) }}</td>
                <td class="text-right tabular-nums">{{ formatoNumero(f.tokens_salida) }}</td>
                <td class="text-right tabular-nums">{{ formatoUsd(f.costo_estimado_usd) }}</td>
              </tr>
            </tbody>
          </TablaDesplazable>
        </section>

        <section aria-labelledby="titulo-mentor-top" class="space-y-3">
          <h3 id="titulo-mentor-top" class="text-xl font-semibold">Quienes más lo usan</h3>
          <p class="text-muted-foreground text-sm">
            Ordenados por costo estimado, de mayor a menor.
          </p>
          <TablaDesplazable etiqueta="Usuarios con más uso del mentor">
            <thead class="bg-muted">
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col" class="text-right">Consultas</th>
                <th scope="col" class="text-right">Tokens de entrada</th>
                <th scope="col" class="text-right">Tokens de salida</th>
                <th scope="col" class="text-right">Costo estimado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in datos.top_usuarios" :key="u.user_id">
                <th scope="row" class="font-normal">{{ u.nombre }} {{ u.apellido }}</th>
                <td class="text-right tabular-nums">{{ formatoNumero(u.consultas) }}</td>
                <td class="text-right tabular-nums">{{ formatoNumero(u.tokens_entrada) }}</td>
                <td class="text-right tabular-nums">{{ formatoNumero(u.tokens_salida) }}</td>
                <td class="text-right tabular-nums">{{ formatoUsd(u.costo_estimado_usd) }}</td>
              </tr>
            </tbody>
          </TablaDesplazable>
        </section>
      </div>
    </EstadoPanel>
  </section>
</template>
