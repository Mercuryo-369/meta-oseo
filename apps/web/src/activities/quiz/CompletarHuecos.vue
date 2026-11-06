<script setup lang="ts">
/**
 * Texto con huecos y un banco de términos (formato `completar` del quiz; 6.2 del documento de la docente: «Completa
 * la secuencia utilizando los términos…»). Se completa tocando un término y luego el hueco (sirve en el teléfono y con
 * teclado, porque todo son botones) o, en escritorio, arrastrando el término hasta el hueco. Tocar un hueco lleno
 * devuelve su término al banco.
 *
 * `modelValue[i]` es el índice (en `terminos`) del término del hueco `i`, o `null`. Los términos que ya están en un
 * hueco no se ven en el banco. Antes de comprobar, nada en el DOM dice cuál es el término correcto de cada hueco.
 */
import { computed, ref } from 'vue';
import { Check, X } from '@lucide/vue';
import { MARCA_HUECO } from '@/content/schema';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import TextoLinea from './TextoLinea.vue';

const props = withDefaults(
  defineProps<{
    texto: string;
    terminos: readonly { id: string; texto: string }[];
    /** Orden de los términos en el banco (índices en `terminos`). */
    ordenTerminos: readonly number[];
    modelValue: readonly (number | null)[];
    deshabilitado?: boolean;
    /** Tras comprobar: si cada hueco quedó bien (`null` mientras se responde). */
    marcas?: readonly boolean[] | null;
    idBase: string;
  }>(),
  { deshabilitado: false, marcas: null },
);

const emit = defineEmits<{
  'update:modelValue': [valor: (number | null)[]];
  anuncio: [texto: string];
  editando: [];
}>();

/**
 * Trozos del texto: cadenas y huecos (por su posición, 0 en adelante). La puntuación que sigue a un hueco va pegada a
 * él (`tras`), para que un salto de línea no deje «.» o «,» solos al comienzo de la línea siguiente.
 */
type Trozo = { tipo: 'texto'; texto: string } | { tipo: 'hueco'; i: number; tras: string };
const trozos = computed<Trozo[]>(() => {
  const salida: Trozo[] = [];
  let desde = 0;
  for (const m of props.texto.matchAll(new RegExp(MARCA_HUECO.source, 'g'))) {
    if (m.index > desde) salida.push({ tipo: 'texto', texto: props.texto.slice(desde, m.index) });
    desde = m.index + m[0].length;
    const tras = /^[.,;:)»”]+/.exec(props.texto.slice(desde))?.[0] ?? '';
    salida.push({ tipo: 'hueco', i: Number(m[1]) - 1, tras });
    desde += tras.length;
  }
  if (desde < props.texto.length) salida.push({ tipo: 'texto', texto: props.texto.slice(desde) });
  return salida;
});

const enHuecos = computed(() => new Set(props.modelValue.filter((v): v is number => v !== null)));
const banco = computed(() => props.ordenTerminos.filter((t) => !enHuecos.value.has(t)));
const elegido = ref<number | null>(null);

function nombre(t: number | null): string {
  return t === null ? '' : textoPlanoDeMarkdown(props.terminos[t]?.texto ?? '');
}

function elegir(t: number): void {
  if (props.deshabilitado) return;
  elegido.value = elegido.value === t ? null : t;
  if (elegido.value !== null) emit('anuncio', `Elegiste «${nombre(t)}». Ahora toca un hueco.`);
}

function colocar(i: number, termino: number | null = elegido.value): void {
  if (props.deshabilitado) return;
  const valor = [...props.modelValue];
  if (termino === null) {
    // Sin término elegido, tocar un hueco lleno lo vacía.
    if (valor[i] === null || valor[i] === undefined) return;
    emit('anuncio', `«${nombre(valor[i] ?? null)}» vuelve al banco.`);
    valor[i] = null;
  } else {
    const previo = valor.indexOf(termino);
    if (previo >= 0) valor[previo] = null;
    valor[i] = termino;
    emit('anuncio', `«${nombre(termino)}» en el hueco ${i + 1}.`);
  }
  elegido.value = null;
  emit('editando');
  emit('update:modelValue', valor);
}

/* Arrastre en escritorio (HTML5): el término viaja como su índice. */
const sobre = ref<number | null>(null);
function alArrastrar(evento: DragEvent, t: number): void {
  if (props.deshabilitado || !evento.dataTransfer) return;
  evento.dataTransfer.setData('text/plain', String(t));
  evento.dataTransfer.effectAllowed = 'move';
}
function alSoltar(evento: DragEvent, i: number): void {
  sobre.value = null;
  const t = Number(evento.dataTransfer?.getData('text/plain'));
  if (Number.isInteger(t) && t >= 0 && t < props.terminos.length) colocar(i, t);
}

function claseHueco(i: number): string {
  const marca = props.marcas?.[i];
  if (marca === true) return 'border-success bg-success-soft';
  if (marca === false) return 'border-destructive bg-card';
  if (sobre.value === i) return 'border-primary bg-secondary';
  if (elegido.value !== null) return 'border-primary border-dashed bg-card hover:bg-secondary';
  return props.modelValue[i] === null
    ? 'border-input border-dashed bg-muted'
    : 'border-input bg-card hover:bg-secondary';
}
</script>

<template>
  <div class="space-y-4" data-testid="completar-huecos">
    <p class="text-foreground text-justify text-base leading-[2.6]">
      <template v-for="(t, k) in trozos" :key="k">
        <TextoLinea v-if="t.tipo === 'texto'" :texto="t.texto" />
        <span v-else class="whitespace-nowrap"
          ><button
            type="button"
            class="focus-visible:ring-ring mx-0.5 inline-flex min-h-9 min-w-[7.5rem] items-center justify-center gap-1 rounded-lg border-2 px-2 py-0.5 align-middle text-sm leading-tight font-medium outline-none focus-visible:ring-2"
            :class="[claseHueco(t.i), deshabilitado ? 'cursor-default' : '']"
            :aria-label="
              modelValue[t.i] === null
                ? `Hueco ${t.i + 1}, vacío`
                : `Hueco ${t.i + 1}: ${nombre(modelValue[t.i] ?? null)}`
            "
            :aria-disabled="deshabilitado ? 'true' : undefined"
            :data-hueco="t.i"
            @click="colocar(t.i)"
            @dragover.prevent="sobre = t.i"
            @dragleave="sobre = null"
            @drop.prevent="alSoltar($event, t.i)"
          >
            <Check
              v-if="marcas?.[t.i] === true"
              class="text-success size-4 shrink-0"
              aria-hidden="true"
            />
            <X
              v-else-if="marcas?.[t.i] === false"
              class="text-destructive size-4 shrink-0"
              aria-hidden="true"
            />
            <span v-if="modelValue[t.i] !== null">
              <TextoLinea :texto="terminos[modelValue[t.i] ?? 0]?.texto ?? ''" />
            </span>
            <span v-else class="text-muted-foreground">{{ t.i + 1 }}</span></button
          >{{ t.tras }}</span
        >
      </template>
    </p>

    <div v-if="!deshabilitado" class="space-y-2">
      <p :id="`${idBase}-banco`" class="text-muted-foreground text-sm font-medium">
        Términos{{ banco.length === 0 ? ': todos colocados' : '' }}
      </p>
      <ul
        :aria-labelledby="`${idBase}-banco`"
        class="flex flex-wrap gap-2"
        data-testid="completar-banco"
      >
        <li v-for="t in banco" :key="terminos[t]?.id">
          <button
            type="button"
            draggable="true"
            class="focus-visible:ring-ring inline-flex min-h-10 cursor-grab items-center rounded-full border-2 px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 active:cursor-grabbing"
            :class="
              elegido === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-input bg-card hover:bg-secondary'
            "
            :aria-pressed="elegido === t"
            @click="elegir(t)"
            @dragstart="alArrastrar($event, t)"
          >
            <TextoLinea :texto="terminos[t]?.texto ?? ''" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
