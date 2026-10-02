/**
 * "Explícame esto" (F3-06): convierte lo que el estudiante tiene seleccionado (una capa, un punto
 * de una escena 3D o una molécula) en una pregunta clara y fija para el mentor.
 *
 * El nombre legible sale del CONTENIDO del módulo (la `etiqueta` de la capa, del nodo o de la
 * molécula), no del id técnico; si el contenido no lo trae se deriva del id (`histo_osteoclasto`
 * pasa a «Osteoclasto»). El servidor ya recibe la selección en el contexto pedagógico
 * (`estructuraSeleccionada`, `moleculaSeleccionada`) y su nivel: la pregunta solo señala qué
 * explicar y el prompt del mentor adapta la profundidad y la analogía al nivel.
 *
 * EVENTO DE DOCUMENTO. Cualquier componente puede pedirle algo al mentor sin importarlo:
 *
 *     document.dispatchEvent(new CustomEvent('ova:preguntar-al-mentor', { detail: { texto } }))
 *
 * (o `preguntarAlMentor(texto)`). El panel del mentor se abre y envía `texto` como si el
 * estudiante lo hubiera escrito; si el mentor está respondiendo, se ignora. `texto` es texto plano
 * de 1 a 500 caracteres.
 */
import { computed, ref, watch } from 'vue';
import { buscarEstructura, indiceEstructuras, indiceMoleculas } from '@/content/consultas';
import type { EstructuraIndexada, MoleculaIndexada } from '@/content/consultas';
import { cargarModulo } from '@/content/registry';
import { useContextoStore } from '@/stores/contextoPedagogico';

export const EVENTO_PREGUNTAR_AL_MENTOR = 'ova:preguntar-al-mentor';
/** Largo máximo del texto que viaja en el evento. */
export const MAX_TEXTO_EVENTO = 500;

export interface DetalleEventoPreguntar {
  texto: string;
}

/** Pide al mentor (con el panel abierto) que responda `texto`. */
export function preguntarAlMentor(texto: string): void {
  document.dispatchEvent(
    new CustomEvent<DetalleEventoPreguntar>(EVENTO_PREGUNTAR_AL_MENTOR, { detail: { texto } }),
  );
}

/** Texto del evento, o `null` si no es un texto usable. */
export function textoDelEvento(evento: Event): string | null {
  const detalle = (evento as CustomEvent<unknown>).detail;
  if (typeof detalle !== 'object' || detalle === null) return null;
  const texto = (detalle as { texto?: unknown }).texto;
  if (typeof texto !== 'string') return null;
  const limpio = texto.trim();
  return limpio !== '' && limpio.length <= MAX_TEXTO_EVENTO ? limpio : null;
}

const PREFIJOS_ID = /^(?:mol|rec|par|histo|ident|capa|paso|ea|eb|nodo)_/;

/** `histo_osteoclasto` -> «Osteoclasto»; `mol_rankl` -> «Rankl». */
export function nombreDesdeId(id: string): string {
  const texto = id.replace(PREFIJOS_ID, '').replace(/_+/g, ' ').trim();
  return texto === '' ? id : texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** La pregunta fija de "Explícame": la misma para capas, puntos 3D y moléculas. */
export function preguntaExplicame(nombre: string): string {
  return `Explícame «${nombre}»: ¿qué es, qué función cumple y cómo se relaciona con lo que estoy estudiando?`;
}

export type TipoSeleccion = 'estructura' | 'molecula';

export interface ChipExplicame {
  /** Estable para `v-for`: `estructura:histo_osteoclasto`. */
  clave: string;
  tipo: TipoSeleccion;
  /** Nombre legible (etiqueta del contenido o derivado del id). */
  nombre: string;
  /** Texto que se envía al mentor. */
  pregunta: string;
}

interface IndicesModulo {
  estructuras: Map<string, EstructuraIndexada>;
  moleculas: Map<string, MoleculaIndexada>;
}

/** Índices por módulo ya cargado (los módulos son inmutables mientras la página vive). */
const indicesPorModulo = new Map<number, IndicesModulo>();

async function indicesDe(modulo: number): Promise<IndicesModulo | null> {
  const previo = indicesPorModulo.get(modulo);
  if (previo) return previo;
  const carga = await cargarModulo(modulo);
  if (!carga.ok) return null;
  const indices = {
    estructuras: indiceEstructuras(carga.modulo),
    moleculas: indiceMoleculas(carga.modulo),
  };
  indicesPorModulo.set(modulo, indices);
  return indices;
}

/** Solo para pruebas. */
export function limpiarIndicesExplicame(): void {
  indicesPorModulo.clear();
}

/**
 * Etiqueta de una estructura. Un id de nodo o de capa solo es único dentro de su actividad, así
 * que primero se busca con la actividad abierta y, si no, con cualquier actividad del módulo.
 */
function etiquetaDeEstructura(
  indices: IndicesModulo,
  id: string,
  actividadId: string | undefined,
): string | undefined {
  if (actividadId) {
    const exacta = buscarEstructura(indices.estructuras, actividadId, id);
    if (exacta) return exacta.etiqueta;
  }
  for (const entrada of indices.estructuras.values()) {
    if (entrada.id === id) return entrada.etiqueta;
  }
  return undefined;
}

/** Chips "Explícame ..." de lo que el estudiante tiene seleccionado ahora. */
export function useExplicame() {
  const contexto = useContextoStore();
  const indices = ref<IndicesModulo | null>(null);

  watch(
    () =>
      [contexto.modulo, contexto.estructuraSeleccionada, contexto.moleculaSeleccionada] as const,
    async ([modulo, estructura, molecula]) => {
      if (!estructura && !molecula) return;
      const cargados = await indicesDe(modulo);
      // La selección pudo cambiar de módulo mientras cargaba: solo se guarda la vigente.
      if (contexto.modulo === modulo) indices.value = cargados;
    },
    { immediate: true },
  );

  const chips = computed<ChipExplicame[]>(() => {
    const lista: ChipExplicame[] = [];
    const cargados = indices.value;
    const estructura = contexto.estructuraSeleccionada;
    if (estructura) {
      const nombre =
        (cargados && etiquetaDeEstructura(cargados, estructura, contexto.actividadActual?.id)) ??
        nombreDesdeId(estructura);
      lista.push({
        clave: `estructura:${estructura}`,
        tipo: 'estructura',
        nombre,
        pregunta: preguntaExplicame(nombre),
      });
    }
    const molecula = contexto.moleculaSeleccionada;
    if (molecula) {
      const nombre = cargados?.moleculas.get(molecula)?.etiqueta ?? nombreDesdeId(molecula);
      lista.push({
        clave: `molecula:${molecula}`,
        tipo: 'molecula',
        nombre,
        pregunta: preguntaExplicame(nombre),
      });
    }
    // Si el estudiante está en una actividad de moléculas, la molécula va primero.
    if (contexto.actividadActual?.tipo === 'arrastre-molecular') lista.reverse();
    return lista;
  });

  return { chips };
}
