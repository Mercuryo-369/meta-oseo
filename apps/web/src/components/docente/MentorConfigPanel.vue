<script setup lang="ts">
/**
 * Pestaña "Configuración": proveedor de IA del mentor, configurable por el docente sin tocar el
 * servidor (pedido del usuario, 2026-11-07): proveedor (Anthropic, OpenAI o cualquier API compatible
 * con OpenAI), modelo y clave. La clave viaja una sola vez al servidor, que la guarda cifrada y
 * nunca la devuelve: aquí solo se ve si hay una guardada y en qué termina.
 */
import { computed, onMounted, ref } from 'vue';
import { CircleCheck, CircleX, Plug, Save, Trash2 } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { ApiError } from '@/lib/api';
import {
  borrarConfigMentorDocente,
  guardarConfigMentorDocente,
  obtenerConfigMentorDocente,
  probarConfigMentorDocente,
} from '@/lib/docenteApi';
import type { DocenteMentorConfig, DocenteMentorProveedor } from '@/types/api';
import { mensajeDeError } from './useCarga';

interface OpcionProveedor {
  valor: DocenteMentorProveedor;
  etiqueta: string;
  modeloEjemplo: string;
  ayuda: string;
}

const PROVEEDORES: readonly OpcionProveedor[] = [
  {
    valor: 'anthropic',
    etiqueta: 'Anthropic (Claude)',
    modeloEjemplo: 'claude-opus-5',
    ayuda: 'Clave de https://console.anthropic.com/settings/keys (empieza por sk-ant-).',
  },
  {
    valor: 'openai',
    etiqueta: 'OpenAI (GPT)',
    modeloEjemplo: 'gpt-5',
    ayuda: 'Clave de https://platform.openai.com/api-keys (empieza por sk-).',
  },
  {
    valor: 'openai_compatible',
    etiqueta: 'Otro proveedor compatible con OpenAI',
    modeloEjemplo: 'llama-3.3-70b-versatile',
    ayuda:
      'Groq, DeepSeek, Mistral, OpenRouter, Gemini (endpoint compatible) y similares: indica la URL base que termina en /v1.',
  },
];

const actual = ref<DocenteMentorConfig | null>(null);
const cargando = ref(true);
const errorCarga = ref<string | null>(null);

const proveedor = ref<DocenteMentorProveedor>('anthropic');
const baseUrl = ref('');
const modelo = ref('');
const apiKey = ref('');

const guardando = ref(false);
const probando = ref(false);
const borrando = ref(false);
const aviso = ref<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

const opcion = computed(
  () => PROVEEDORES.find((p) => p.valor === proveedor.value) ?? PROVEEDORES[0]!,
);
const compatible = computed(() => proveedor.value === 'openai_compatible');
const ocupado = computed(() => guardando.value || probando.value || borrando.value);

const textoOrigen = computed(() => {
  const c = actual.value;
  if (!c || c.origen === 'ninguno')
    return 'Sin configurar: el mentor responde que no está disponible.';
  const nombre = PROVEEDORES.find((p) => p.valor === c.proveedor)?.etiqueta ?? c.proveedor;
  const sufijo = c.clave_sufijo ? ` (termina en …${c.clave_sufijo})` : '';
  const origen = c.origen === 'panel' ? 'guardada desde este panel' : 'definida en el servidor';
  return `${nombre}, modelo ${c.modelo}, clave ${origen}${sufijo}.`;
});

function rellenar(c: DocenteMentorConfig): void {
  actual.value = c;
  if (c.origen !== 'ninguno') {
    proveedor.value = c.proveedor;
    baseUrl.value = c.base_url ?? '';
    modelo.value = c.modelo;
  }
  apiKey.value = '';
}

async function cargar(): Promise<void> {
  cargando.value = true;
  errorCarga.value = null;
  try {
    rellenar(await obtenerConfigMentorDocente());
  } catch (e) {
    errorCarga.value = mensajeDeError(e);
  } finally {
    cargando.value = false;
  }
}
onMounted(cargar);

function mensajeDe(e: unknown): string {
  if (e instanceof ApiError && e.status === 422 && e.code !== 'clave_requerida') {
    return 'Revisa los campos: ' + (e.message || 'hay datos que no son válidos.');
  }
  return mensajeDeError(e);
}

async function guardar(): Promise<void> {
  if (ocupado.value) return;
  aviso.value = null;
  guardando.value = true;
  try {
    rellenar(
      await guardarConfigMentorDocente({
        proveedor: proveedor.value,
        base_url: compatible.value ? baseUrl.value.trim() : null,
        modelo: modelo.value.trim(),
        api_key: apiKey.value.trim() === '' ? null : apiKey.value.trim(),
      }),
    );
    aviso.value = {
      tipo: 'ok',
      texto: 'Configuración guardada. Prueba la conexión para confirmar que responde.',
    };
  } catch (e) {
    aviso.value = { tipo: 'error', texto: mensajeDe(e) };
  } finally {
    guardando.value = false;
  }
}

async function probar(): Promise<void> {
  if (ocupado.value) return;
  aviso.value = null;
  probando.value = true;
  try {
    const r = await probarConfigMentorDocente();
    aviso.value = {
      tipo: 'ok',
      texto: `Conexión correcta con ${r.modelo} en ${(r.milisegundos / 1000).toFixed(1)} s. Respondió: «${r.respuesta}».`,
    };
  } catch (e) {
    aviso.value = { tipo: 'error', texto: mensajeDe(e) };
  } finally {
    probando.value = false;
  }
}

async function borrar(): Promise<void> {
  if (ocupado.value) return;
  if (
    !window.confirm(
      '¿Quitar la configuración guardada en el panel? El mentor volverá a usar la clave del servidor, si existe.',
    )
  )
    return;
  aviso.value = null;
  borrando.value = true;
  try {
    rellenar(await borrarConfigMentorDocente());
    aviso.value = { tipo: 'ok', texto: 'Configuración del panel eliminada.' };
  } catch (e) {
    aviso.value = { tipo: 'error', texto: mensajeDe(e) };
  } finally {
    borrando.value = false;
  }
}
</script>

<template>
  <section class="space-y-6" aria-labelledby="titulo-config-mentor" data-testid="config-mentor">
    <div>
      <h2 id="titulo-config-mentor" class="text-xl font-semibold">Proveedor de IA del mentor</h2>
      <p class="text-muted-foreground mt-1 max-w-prose">
        El mentor usa la clave que configures aquí. Se guarda cifrada en el servidor y no vuelve a
        mostrarse. El costo por uso lo cobra el proveedor a esa cuenta; puedes seguirlo en la
        pestaña «Mentor».
      </p>
    </div>

    <p v-if="cargando" class="text-muted-foreground text-sm" role="status">
      Cargando la configuración…
    </p>
    <p v-else-if="errorCarga" class="text-destructive text-sm" role="alert">{{ errorCarga }}</p>

    <template v-else>
      <p class="bg-muted rounded-xl px-4 py-3 text-sm" data-testid="config-mentor-estado">
        <span class="font-semibold">Ahora:</span> {{ textoOrigen }}
      </p>

      <form class="grid max-w-xl gap-5" @submit.prevent="guardar">
        <div class="grid gap-2">
          <Label for="mentor-proveedor">Proveedor</Label>
          <NativeSelect id="mentor-proveedor" v-model="proveedor" :disabled="ocupado">
            <option v-for="p in PROVEEDORES" :key="p.valor" :value="p.valor">
              {{ p.etiqueta }}
            </option>
          </NativeSelect>
          <p class="text-muted-foreground text-sm">{{ opcion.ayuda }}</p>
        </div>

        <div v-if="compatible" class="grid gap-2">
          <Label for="mentor-base-url">URL base de la API</Label>
          <Input
            id="mentor-base-url"
            v-model="baseUrl"
            type="url"
            inputmode="url"
            autocomplete="off"
            placeholder="https://api.groq.com/openai/v1"
            :disabled="ocupado"
            required
          />
        </div>

        <div class="grid gap-2">
          <Label for="mentor-modelo">Modelo</Label>
          <Input
            id="mentor-modelo"
            v-model="modelo"
            autocomplete="off"
            :placeholder="opcion.modeloEjemplo"
            :disabled="ocupado"
            required
          />
        </div>

        <div class="grid gap-2">
          <Label for="mentor-clave">Clave de la API</Label>
          <Input
            id="mentor-clave"
            v-model="apiKey"
            type="password"
            autocomplete="off"
            spellcheck="false"
            :placeholder="
              actual?.clave_configurada
                ? 'Déjala vacía para conservar la guardada'
                : 'Pega aquí la clave'
            "
            :disabled="ocupado"
          />
          <p class="text-muted-foreground text-sm">
            Se envía una sola vez y se guarda cifrada. Si cambias de proveedor, pega la clave de ese
            proveedor.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <Button type="submit" :disabled="ocupado">
            <Save aria-hidden="true" />
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </Button>
          <Button
            type="button"
            variant="outline"
            :disabled="ocupado || !actual?.clave_configurada"
            @click="probar"
          >
            <Plug aria-hidden="true" />
            {{ probando ? 'Probando…' : 'Probar conexión' }}
          </Button>
          <Button
            v-if="actual?.origen === 'panel'"
            type="button"
            variant="ghost"
            class="text-destructive"
            :disabled="ocupado"
            @click="borrar"
          >
            <Trash2 aria-hidden="true" />
            Quitar del panel
          </Button>
        </div>
      </form>

      <p
        v-if="aviso"
        class="flex max-w-xl items-start gap-2 rounded-xl border px-4 py-3 text-sm"
        :class="aviso.tipo === 'ok' ? 'border-success/40 bg-success-soft' : 'border-destructive/40'"
        role="status"
        aria-live="polite"
        data-testid="config-mentor-aviso"
      >
        <CircleCheck
          v-if="aviso.tipo === 'ok'"
          class="text-success mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <CircleX v-else class="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ aviso.texto }}</span>
      </p>
    </template>
  </section>
</template>
