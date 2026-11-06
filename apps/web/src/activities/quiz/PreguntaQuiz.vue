<script setup lang="ts">
/**
 * Una pregunta del quiz, en sus cuatro formatos: `opcion_multiple` (una correcta = botones de radio,
 * varias = casillas), `verdadero_falso` (dos radios), `ordenar` (lista reordenable, ver
 * `OrdenarPasos.vue`) y `completar` (texto con huecos y banco de términos, ver `CompletarHuecos.vue`).
 *
 * Tres estados:
 *  - responder: el estudiante elige y pulsa "Comprobar respuesta". Hasta entonces NADA de la
 *    respuesta correcta está en el DOM (ni la explicación, ni marcas, ni atributos): las opciones
 *    llevan ids de presentación (`{idBase}-o-{k}`) y no los del contenido.
 *  - comprobada: entradas bloqueadas, cada opción marcada con icono Y texto ("Tu respuesta:
 *    correcta"...), veredicto, detalle y la explicación. El botón principal es el MISMO elemento y
 *    pasa a "Siguiente pregunta" / "Ver resultado", así el foco no se pierde (regla R6).
 *  - revisión (`revision`): solo lectura; muestra las respuestas CORRECTAS y la explicación, sin
 *    botones ni veredicto (modo `revisar` del contrato).
 *
 * No emite eventos del contrato de la actividad: eso es del componente principal. Este solo
 * informa al padre con `comprobar`, `siguiente`, `anuncio` (frase para la región aria-live) y
 * `editando`.
 */
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import { Check, CircleAlert, CircleCheck, CircleX, X } from '@lucide/vue';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import { precisionPregunta } from '@/content/scoring';
import type { RespuestaPregunta } from '@/content/scoring';
import { MARCA_HUECO } from '@/content/schema';
import { respuestaCorrecta, terminosDe, veredictoDe } from './logica';
import type { PreguntaPresentada, Veredicto } from './logica';
import CompletarHuecos from './CompletarHuecos.vue';
import OrdenarPasos from './OrdenarPasos.vue';
import TextoLinea from './TextoLinea.vue';

const props = withDefaults(
  defineProps<{
    presentada: PreguntaPresentada;
    /** Posición (1 a total) que se muestra en el encabezado. */
    numero: number;
    total: number;
    /** Respuesta confirmada (con `comprobada`) o la correcta (con `revision`). */
    respuesta?: RespuestaPregunta | null;
    comprobada?: boolean;
    revision?: boolean;
    /** La última: el botón dice "Ver resultado". */
    ultima?: boolean;
    movimientoReducido?: boolean;
    /** Prefijo único de los ids del DOM de esta pregunta. */
    idBase: string;
  }>(),
  {
    respuesta: null,
    comprobada: false,
    revision: false,
    ultima: false,
    movimientoReducido: false,
  },
);

const emit = defineEmits<{
  comprobar: [respuesta: RespuestaPregunta];
  siguiente: [];
  anuncio: [texto: string];
  editando: [];
}>();

const pregunta = computed(() => props.presentada.pregunta);
const bloqueada = computed(() => props.comprobada || props.revision);
/** Lo que se muestra como respuesta: la del estudiante, o la correcta en revisión. */
const respuestaVista = computed<RespuestaPregunta | null>(() =>
  props.revision ? respuestaCorrecta(pregunta.value) : props.respuesta,
);

/* ---- borrador (lo que el estudiante va eligiendo antes de comprobar) ---- */

function seleccionInicial(): number[] {
  const p = pregunta.value;
  const r = respuestaVista.value;
  if (p.formato !== 'opcion_multiple' || r?.formato !== 'opcion_multiple') return [];
  return p.opciones.flatMap((o, i) => (r.seleccion.includes(o.id) ? [i] : []));
}
function valorInicial(): boolean | null {
  const r = respuestaVista.value;
  return r?.formato === 'verdadero_falso' ? r.valor : null;
}
function ordenInicial(): number[] {
  const p = pregunta.value;
  if (p.formato !== 'ordenar') return [];
  const r = respuestaVista.value;
  if (r?.formato === 'ordenar') {
    const indices = r.orden.map((id) => p.pasos.findIndex((paso) => paso.id === id));
    if (indices.length === p.pasos.length && indices.every((i) => i >= 0)) return indices;
  }
  return [...props.presentada.ordenPasos];
}

function rellenoInicial(): (number | null)[] {
  const p = pregunta.value;
  if (p.formato !== 'completar') return [];
  const terminos = terminosDe(p);
  const r = respuestaVista.value;
  if (r?.formato === 'completar' && r.relleno.length === p.huecos.length) {
    return r.relleno.map((id) => {
      const i = id === null ? -1 : terminos.findIndex((t) => t.id === id);
      return i >= 0 ? i : null;
    });
  }
  return p.huecos.map(() => null);
}

const seleccion = ref<number[]>(seleccionInicial());
const valorVF = ref<boolean | null>(valorInicial());
const orden = ref<number[]>(ordenInicial());
const relleno = ref<(number | null)[]>(rellenoInicial());
const terminos = computed(() => terminosDe(pregunta.value));

const multiple = computed(() => {
  const p = pregunta.value;
  return p.formato === 'opcion_multiple' && new Set(p.correctas).size > 1;
});

interface Fila {
  /** Lugar en pantalla (para los ids del DOM). */
  k: number;
  /** Índice en `opciones` (o 1/0 en verdadero_falso). Nunca llega al DOM. */
  clave: number;
  texto: string;
  explicacion?: string;
  correcta: boolean;
  marcada: boolean;
}

const filas = computed<Fila[]>(() => {
  const p = pregunta.value;
  if (p.formato === 'opcion_multiple') {
    const correctas = new Set(p.correctas);
    return props.presentada.ordenOpciones.flatMap((indice, k) => {
      const o = p.opciones[indice];
      if (!o) return [];
      return [
        {
          k,
          clave: indice,
          texto: o.texto,
          explicacion: o.explicacion,
          correcta: correctas.has(o.id),
          marcada: seleccion.value.includes(indice),
        },
      ];
    });
  }
  if (p.formato === 'verdadero_falso') {
    return [true, false].map((valor, k) => ({
      k,
      clave: valor ? 1 : 0,
      texto: valor ? 'Verdadero' : 'Falso',
      correcta: p.correcta === valor,
      marcada: valorVF.value === valor,
    }));
  }
  return [];
});

function respuestaBorrador(): RespuestaPregunta | null {
  const p = pregunta.value;
  if (p.formato === 'opcion_multiple') {
    const ids = seleccion.value.flatMap((i) => (p.opciones[i] ? [p.opciones[i].id] : []));
    return ids.length > 0 ? { formato: 'opcion_multiple', seleccion: ids } : null;
  }
  if (p.formato === 'verdadero_falso') {
    return valorVF.value === null ? null : { formato: 'verdadero_falso', valor: valorVF.value };
  }
  if (p.formato === 'completar') {
    // Se comprueba con todos los huecos llenos.
    if (relleno.value.length !== p.huecos.length || relleno.value.some((v) => v === null)) {
      return null;
    }
    return {
      formato: 'completar',
      relleno: relleno.value.map((i) => (i === null ? null : (terminos.value[i]?.id ?? null))),
    };
  }
  return {
    formato: 'ordenar',
    orden: orden.value.flatMap((i) => (p.pasos[i] ? [p.pasos[i].id] : [])),
  };
}

const puedeComprobar = computed(() => respuestaBorrador() !== null);

function cambiar(fila: Fila, evento: Event): void {
  if (bloqueada.value) return;
  emit('editando');
  const p = pregunta.value;
  if (p.formato === 'verdadero_falso') {
    valorVF.value = fila.clave === 1;
  } else if (multiple.value) {
    const marcada = (evento.target as HTMLInputElement).checked;
    const sin = seleccion.value.filter((i) => i !== fila.clave);
    seleccion.value = marcada ? [...sin, fila.clave] : sin;
  } else {
    seleccion.value = [fila.clave];
  }
}

/* ---- retroalimentación ---- */

interface Retro {
  veredicto: Veredicto;
  titulo: string;
  detalle?: string;
}

const TITULOS: Record<Veredicto, string> = {
  correcta: '¡Correcto!',
  parcial: 'Parcialmente correcto',
  incorrecta: 'Incorrecto',
};

function retroDe(r: RespuestaPregunta): Retro {
  const p = pregunta.value;
  const veredicto = veredictoDe(precisionPregunta(p, r));
  let detalle: string | undefined;
  if (p.formato === 'opcion_multiple' && r.formato === 'opcion_multiple') {
    if (multiple.value) {
      const validas = new Set(p.opciones.map((o) => o.id));
      const correctas = new Set(p.correctas);
      const marcadas = new Set(r.seleccion.filter((id) => validas.has(id)));
      const aciertos = [...marcadas].filter((id) => correctas.has(id)).length;
      const errores = marcadas.size - aciertos;
      detalle = `Marcaste ${aciertos} de ${correctas.size} correctas`;
      detalle += errores > 0 ? ` y ${errores} incorrecta${errores === 1 ? '' : 's'}.` : '.';
    }
  } else if (p.formato === 'ordenar' && r.formato === 'ordenar') {
    const enSuLugar = p.pasos.filter((paso, i) => r.orden[i] === paso.id).length;
    detalle = `${enSuLugar} de ${p.pasos.length} pasos en su lugar.`;
  } else if (p.formato === 'completar' && r.formato === 'completar') {
    const bien = p.huecos.filter((h, i) => r.relleno[i] === h.id).length;
    detalle = `${bien} de ${p.huecos.length} huecos con su término.`;
  }
  return { veredicto, titulo: TITULOS[veredicto], detalle };
}

const retro = computed(() =>
  props.comprobada && props.respuesta && !props.revision ? retroDe(props.respuesta) : null,
);

const marcasOrden = computed<boolean[] | null>(() => {
  const p = pregunta.value;
  if (p.formato !== 'ordenar' || !props.comprobada || props.revision) return null;
  return orden.value.map((clave, k) => clave === k);
});

/** Tras comprobar, si cada hueco quedó con su término (el término `i` es el del hueco `i`). */
const marcasHuecos = computed<boolean[] | null>(() => {
  const p = pregunta.value;
  if (p.formato !== 'completar' || !props.comprobada || props.revision) return null;
  return relleno.value.map((t, i) => t === i);
});
/** El texto completo con los términos correctos, en negrita (retroalimentación de `completar`). */
const textoCorrecto = computed(() => {
  const p = pregunta.value;
  if (p.formato !== 'completar') return '';
  return p.texto.replace(
    new RegExp(MARCA_HUECO.source, 'g'),
    (_, n: string) => `**${p.huecos[Number(n) - 1]?.texto ?? ''}**`,
  );
});

const pasosEnOrden = computed(() => {
  const p = pregunta.value;
  return p.formato === 'ordenar' ? p.pasos.map((paso) => paso.texto) : [];
});

function comprobar(): void {
  if (bloqueada.value) return;
  const r = respuestaBorrador();
  if (!r) return;
  const { titulo, detalle } = retroDe(r);
  emit(
    'anuncio',
    `${titulo} ${detalle ?? ''} Explicación: ${textoPlanoDeMarkdown(pregunta.value.explicacion)}`.replace(
      /\s+/g,
      ' ',
    ),
  );
  emit('comprobar', r);
  void nextTick(() => {
    bloqueRetro.value?.scrollIntoView?.({ block: 'nearest' });
  });
}

function alPulsarPrincipal(): void {
  if (props.comprobada) emit('siguiente');
  else comprobar();
}

/* ---- presentación ---- */

const idEncabezado = computed(() => `${props.idBase}-enc`);
const idAyuda = computed(() => `${props.idBase}-ayuda`);
const idPista = computed(() => `${props.idBase}-pista`);

const ayuda = computed(() => {
  const p = pregunta.value;
  if (props.revision) return 'Estas son las respuestas correctas.';
  if (p.formato === 'verdadero_falso') return 'Elige verdadero o falso.';
  if (p.formato === 'ordenar') {
    return 'Ordena los pasos con los botones Subir y Bajar de cada uno, o arrástralos por el asa de la izquierda.';
  }
  if (p.formato === 'completar') {
    return 'Toca un término y luego el hueco donde va, o arrástralo hasta el hueco. Toca un hueco lleno para vaciarlo.';
  }
  return multiple.value ? 'Marca todas las opciones correctas.' : 'Elige una opción.';
});

function claseDeFila(fila: Fila): string {
  if (bloqueada.value) {
    if (props.revision)
      return fila.correcta ? 'border-success bg-success-soft' : 'border-border bg-card';
    if (fila.marcada && fila.correcta) return 'border-success bg-success-soft';
    if (fila.marcada) return 'border-destructive bg-card';
    if (fila.correcta) return 'border-success border-dashed bg-card';
    return 'border-border bg-card';
  }
  return fila.marcada ? 'border-primary bg-secondary' : 'border-input bg-card hover:bg-secondary';
}

const claseRetro: Record<Veredicto, string> = {
  correcta: 'border-success bg-success-soft',
  parcial: 'border-eosina bg-accent',
  incorrecta: 'border-destructive bg-card',
};

const encabezado = useTemplateRef<HTMLElement>('enunciado-el');
const bloqueRetro = ref<HTMLElement | null>(null);

/** Lleva el foco al encabezado de la pregunta (al avanzar; nunca al cargar). */
function enfocar(): void {
  encabezado.value?.focus();
}
defineExpose({ enfocar });
</script>

<template>
  <article
    class="flex flex-col gap-3"
    :data-formato="pregunta.formato"
    :data-pregunta="pregunta.id"
  >
    <h4
      :id="idEncabezado"
      ref="enunciado-el"
      tabindex="-1"
      class="text-foreground text-base leading-snug font-semibold outline-offset-4"
    >
      <span class="text-muted-foreground mb-0.5 block text-sm font-medium">
        Pregunta {{ numero }} de {{ total }}
      </span>
      <TextoLinea :texto="pregunta.enunciado" />
    </h4>

    <p :id="idAyuda" class="text-muted-foreground -mt-1 text-sm">{{ ayuda }}</p>

    <div
      v-if="pregunta.formato === 'ordenar'"
      role="group"
      :aria-labelledby="idEncabezado"
      :aria-describedby="idAyuda"
    >
      <OrdenarPasos
        :model-value="orden"
        :textos="pasosEnOrden"
        :deshabilitado="bloqueada"
        :marcas="marcasOrden"
        :movimiento-reducido="movimientoReducido"
        @update:model-value="orden = $event"
        @anuncio="emit('anuncio', $event)"
        @editando="emit('editando')"
      />
    </div>

    <div
      v-else-if="pregunta.formato === 'completar'"
      role="group"
      :aria-labelledby="idEncabezado"
      :aria-describedby="idAyuda"
    >
      <CompletarHuecos
        :model-value="relleno"
        :texto="pregunta.texto"
        :terminos="terminos"
        :orden-terminos="presentada.ordenTerminos"
        :deshabilitado="bloqueada"
        :marcas="marcasHuecos"
        :id-base="idBase"
        @update:model-value="relleno = $event"
        @anuncio="emit('anuncio', $event)"
        @editando="emit('editando')"
      />
    </div>

    <fieldset
      v-else
      class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0"
      :aria-labelledby="idEncabezado"
      :aria-describedby="idAyuda"
    >
      <div v-for="fila in filas" :key="fila.k" class="flex flex-col gap-1">
        <label
          :for="`${idBase}-o-${fila.k}`"
          class="flex min-h-11 items-start gap-3 rounded-xl border-2 px-3 py-2"
          :class="[claseDeFila(fila), bloqueada ? '' : 'cursor-pointer']"
        >
          <input
            :id="`${idBase}-o-${fila.k}`"
            :type="multiple ? 'checkbox' : 'radio'"
            :name="`${idBase}-grupo`"
            class="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
            :checked="fila.marcada"
            :disabled="bloqueada"
            :aria-describedby="bloqueada && fila.explicacion ? `${idBase}-e-${fila.k}` : undefined"
            @change="cambiar(fila, $event)"
          />
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <TextoLinea :texto="fila.texto" class="text-foreground" />
            <span
              v-if="bloqueada && !revision && (fila.marcada || fila.correcta)"
              class="flex items-center gap-1 text-sm font-semibold"
              :class="fila.correcta ? 'text-success' : 'text-destructive'"
            >
              <Check v-if="fila.correcta" class="size-4 shrink-0" aria-hidden="true" />
              <X v-else class="size-4 shrink-0" aria-hidden="true" />
              <template v-if="fila.marcada">
                Tu respuesta: {{ fila.correcta ? 'correcta' : 'incorrecta' }}
              </template>
              <template v-else>{{ multiple ? 'Era correcta' : 'Era la correcta' }}</template>
            </span>
            <span
              v-else-if="revision && fila.correcta"
              class="text-success flex items-center gap-1 text-sm font-semibold"
            >
              <Check class="size-4 shrink-0" aria-hidden="true" />
              Respuesta correcta
            </span>
          </span>
        </label>
        <p
          v-if="bloqueada && fila.explicacion"
          :id="`${idBase}-e-${fila.k}`"
          class="text-muted-foreground px-3 text-sm"
        >
          <TextoLinea :texto="fila.explicacion" />
        </p>
      </div>
    </fieldset>

    <div
      v-if="bloqueada"
      ref="bloqueRetro"
      class="flex flex-col gap-2 rounded-xl border-2 p-3"
      :class="retro ? claseRetro[retro.veredicto] : 'border-border bg-muted'"
      data-retroalimentacion
    >
      <p v-if="retro" class="text-foreground flex items-center gap-2 font-semibold">
        <CircleCheck
          v-if="retro.veredicto === 'correcta'"
          class="text-success size-5 shrink-0"
          aria-hidden="true"
        />
        <CircleAlert
          v-else-if="retro.veredicto === 'parcial'"
          class="text-accent-foreground size-5 shrink-0"
          aria-hidden="true"
        />
        <CircleX v-else class="text-destructive size-5 shrink-0" aria-hidden="true" />
        {{ retro.titulo }}
      </p>
      <p v-if="retro?.detalle" class="text-foreground text-sm">{{ retro.detalle }}</p>
      <p class="text-foreground text-sm leading-relaxed">
        <span class="font-semibold">Explicación: </span>
        <TextoLinea :texto="pregunta.explicacion" />
      </p>
      <div v-if="pregunta.formato === 'completar' && comprobada && !revision" class="text-sm">
        <p class="text-foreground font-semibold">Texto correcto:</p>
        <p class="text-foreground text-justify"><TextoLinea :texto="textoCorrecto" /></p>
      </div>
      <div v-if="pregunta.formato === 'ordenar' && comprobada && !revision" class="text-sm">
        <p class="text-foreground font-semibold">Orden correcto:</p>
        <ol class="text-foreground m-0 list-decimal pl-6">
          <li v-for="paso in pregunta.pasos" :key="paso.id">
            <TextoLinea :texto="paso.texto" />
          </li>
        </ol>
      </div>
    </div>

    <template v-if="!revision">
      <p v-if="!comprobada && !puedeComprobar" :id="idPista" class="text-muted-foreground text-sm">
        {{
          pregunta.formato === 'completar'
            ? 'Completa todos los huecos para poder comprobar.'
            : 'Elige una respuesta para poder comprobarla.'
        }}
      </p>
      <button
        type="button"
        class="bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 w-full rounded-xl px-5 py-2 font-semibold sm:w-auto sm:self-start"
        :class="!comprobada && !puedeComprobar ? 'opacity-60' : ''"
        :aria-disabled="!comprobada && !puedeComprobar ? 'true' : undefined"
        :aria-describedby="!comprobada && !puedeComprobar ? idPista : undefined"
        data-principal
        @click="alPulsarPrincipal"
      >
        {{ comprobada ? (ultima ? 'Ver resultado' : 'Siguiente pregunta') : 'Comprobar respuesta' }}
      </button>
    </template>
  </article>
</template>
