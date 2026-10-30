<script setup lang="ts">
/**
 * Página de módulo (F2-08, F2-10, F2-11): el anfitrión que orquesta secciones, bloques y
 * actividades a partir del `content.json` del módulo.
 *
 *  - Carga el contenido (`cargarModulo`), el progreso y los resultados guardados. NO monta nada
 *    hasta tener el estado previo de las actividades o hasta agotar `ESPERA_ESTADO_PREVIO_MAX_MS`
 *    (contrato de `activities/types.ts`).
 *  - Con `BLOQUEO_SECUENCIAL`, las actividades obligatorias condicionan el avance: la sección
 *    siguiente se abre al superarlas y el módulo siguiente al completar este. Un módulo o una
 *    sección ya completados nunca se vuelven a cerrar. Lo bloqueado se explica EN SU SITIO, sin
 *    redirigir: un módulo bloqueado muestra su presentación y lo que falta (`ModuloBloqueado`); una
 *    sección bloqueada, un panel con el botón a la sección pendiente.
 *  - Rol docente (`useAccesoModulos`): sin bloqueo de módulos ni de secciones y en SOLO LECTURA: no
 *    se envía progreso, tiempo, resultados ni la finalización del módulo, y las actividades se abren
 *    en modo `revisar` (ver `BloqueActividad`). Así el docente revisa los seis módulos completos
 *    sin ensuciar las estadísticas de los estudiantes.
 *  - Persistencia y envíos a la API: `stores/actividades.ts`. Tiempo y sección actual:
 *    `useTiempoModulo`. Contexto del mentor: `stores/contextoPedagogico.ts`.
 *  - La sección abierta vive en la URL (`?s=id_seccion`): el botón «atrás» funciona y se puede
 *    compartir el enlace.
 *  - MODO DIAPOSITIVA (pedido de la usuaria, 2026-10-25): sin `?s` se ve la PORTADA del módulo (su información
 *    general y la imagen de fondo); su flecha inicia el recorrido. Cada sección es una diapositiva con la misma
 *    portada (el panel lee la entrada de la sección) y, debajo, su contenido. La flecha del panel pasa a la
 *    sección siguiente y, en la última, al módulo siguiente. El cambio se anima deslizando en horizontal: hacia
 *    delante, la nueva entra por la derecha; hacia atrás, por la izquierda (sin animación con
 *    `prefers-reduced-motion`).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ChevronLeft, ChevronRight, CircleAlert, Info, LoaderCircle, Lock } from '@lucide/vue';
import { ESPERA_ESTADO_PREVIO_MAX_MS } from '@/activities/types';
import AvisosLogro from '@/components/modulo/AvisosLogro.vue';
import BloqueActividad from '@/components/modulo/BloqueActividad.vue';
import BloqueCallout from '@/components/modulo/BloqueCallout.vue';
import BloqueImagen from '@/components/modulo/BloqueImagen.vue';
import BloqueEscenarios from '@/components/modulo/BloqueEscenarios.vue';
import BloquePregunta from '@/components/modulo/BloquePregunta.vue';
import BloqueTabla from '@/components/modulo/BloqueTabla.vue';
import BloqueTexto from '@/components/modulo/BloqueTexto.vue';
import CabeceraModulo from '@/components/modulo/CabeceraModulo.vue';
import GlosarioHoja from '@/components/modulo/GlosarioHoja.vue';
// Glosario y referencias ocultos por ahora (2026-10-29); se recuperan quitando el comentario de la plantilla.
// import GlosarioYReferencias from '@/components/modulo/GlosarioYReferencias.vue';
import ModuloBloqueado from '@/components/modulo/ModuloBloqueado.vue';
import ModuloCompletado from '@/components/modulo/ModuloCompletado.vue';
import NavegacionPartes from '@/components/modulo/NavegacionPartes.vue';
import NavegacionSecciones from '@/components/modulo/NavegacionSecciones.vue';
import TextoRico from '@/components/modulo/TextoRico.vue';
import {
  decidirAccesoModulo,
  pendientesDeSeccion,
  textoPendientes,
  titulosDeActividades,
} from '@/components/modulo/acceso';
import { EVENTO_GLOSARIO } from '@/components/modulo/glosario';
import { aperturaDelResumen, estiloAcento } from '@/components/modulo/identidad';
import { useAccesoModulos } from '@/components/modulo/useAccesoModulos';
import { useTiempoModulo } from '@/components/modulo/useTiempoModulo';
import { Button } from '@/components/ui/button';
import { idDeBloque, visibleParaNivel } from '@/content/consultas';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import { cargarModulo } from '@/content/registry';
import type { ResultadoCarga } from '@/content/registry';
import {
  estadoDeSecciones,
  idsSuperadas,
  moduloCompletado,
  progresoDeModulo,
  puntajeObtenidoModulo,
} from '@/content/scoring';
import { ETIQUETA_VARIANTE_CALLOUT } from '@/content/schema';
import type {
  Bloque,
  BloqueCallout as TipoBloqueCallout,
  BloqueImagen as TipoBloqueImagen,
  BloqueTabla as TipoBloqueTabla,
  BloqueTexto as TipoBloqueTexto,
  ModuloContenido,
  TerminoGlosario,
} from '@/content/schema';
import { moduloPorNumero } from '@/data/modulos';
import type { NumeroModulo } from '@/data/modulos';
import { useActividadesStore } from '@/stores/actividades';
import { SECCION_INICIAL, useContextoStore } from '@/stores/contextoPedagogico';
import { useProgresoStore } from '@/stores/progreso';

// La ruta (/modulo/:n([1-6])) ya garantiza un número entre 1 y 6.
const props = defineProps<{ n: number }>();

const route = useRoute();
const router = useRouter();
const store = useActividadesStore();
const progreso = useProgresoStore();
const contexto = useContextoStore();
const { esDocente, bloqueoSecuencial } = useAccesoModulos();

/* -------------------------------------------------------------------------------------------
 * Carga
 * ----------------------------------------------------------------------------------------- */

type Fase = 'cargando' | 'listo' | 'error' | 'sin_contenido';

const fase = ref<Fase>('cargando');
const modulo = ref<ModuloContenido | null>(null);
const mensajeError = ref('');
/** Sección con la que se abrió el módulo cuando la URL no trae `?s=`. */
const indiceBase = ref<number | null>(null);
let cargaActual = 0;

const modulosData = computed(() => moduloPorNumero(props.n));

/** Espera `promesa` como máximo `ms`; nunca rechaza. */
async function esperarComoMaximo(promesa: Promise<unknown>, ms: number): Promise<void> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<void>((resolver) => {
    temporizador = setTimeout(resolver, ms);
  });
  try {
    await Promise.race([promesa.catch(() => undefined), limite]);
  } finally {
    clearTimeout(temporizador);
  }
}

async function cargar(): Promise<void> {
  const mia = ++cargaActual;
  const n = props.n;
  fase.value = 'cargando';
  modulo.value = null;
  indiceBase.value = null;
  mensajeError.value = '';
  contexto.setModulo(n as NumeroModulo);
  contexto.limpiarInteracciones();
  store.iniciar();

  const [resultado] = await Promise.all([
    cargarModulo(n).catch((): ResultadoCarga => ({
      ok: false,
      motivo: 'error_de_carga',
      mensaje:
        'No pudimos cargar el contenido de este módulo. Revisa tu conexión e inténtalo de nuevo.',
      errores: [],
    })),
    // Nunca rechazan: si la API falla se usa el respaldo local.
    progreso.load(),
  ]);
  if (mia !== cargaActual) return;

  if (!resultado.ok) {
    mensajeError.value = resultado.mensaje;
    fase.value = resultado.motivo === 'sin_contenido' ? 'sin_contenido' : 'error';
    return;
  }

  // El contrato de las actividades: no se montan sin el estado del servidor (o su espera máxima).
  await esperarComoMaximo(store.cargarResultados(n), ESPERA_ESTADO_PREVIO_MAX_MS);
  if (mia !== cargaActual) return;
  modulo.value = resultado.modulo;
  // La sección de arranque (la primera sin terminar) se fija ahora: completar una actividad no
  // debe llevar al estudiante a otra sección por su cuenta.
  indiceBase.value = indiceActual.value;
  fase.value = 'listo';
}

watch(
  () => props.n,
  () => void cargar(),
  { immediate: true },
);

/* -------------------------------------------------------------------------------------------
 * Acceso al módulo
 * ----------------------------------------------------------------------------------------- */

const acceso = computed(() =>
  decidirAccesoModulo(props.n, progreso.modulosCompletados, {
    bloqueoSecuencial: bloqueoSecuencial.value,
    progresoConocido: progreso.loaded,
  }),
);
const moduloAbierto = computed(() => acceso.value.permitido);
const moduloYaCompletado = computed(() => progreso.estaCompletado(props.n));
/** Módulo que falta completar y a dónde llevar al estudiante; solo con el módulo bloqueado. */
const bloqueo = computed(() => {
  const a = acceso.value;
  return a.permitido ? null : { requerido: a.requerido, destino: a.destino };
});

/* -------------------------------------------------------------------------------------------
 * Estado de secciones
 * ----------------------------------------------------------------------------------------- */

const superadas = computed(() =>
  modulo.value ? idsSuperadas(modulo.value, store.conocidos) : new Set<string>(),
);
/** Un módulo ya completado nunca se vuelve a cerrar. */
const bloqueoActivo = computed(() => bloqueoSecuencial.value && !moduloYaCompletado.value);

const estados = computed(() =>
  modulo.value
    ? estadoDeSecciones(modulo.value, superadas.value, { bloqueoSecuencial: bloqueoActivo.value })
    : [],
);
const avance = computed(() =>
  modulo.value ? progresoDeModulo(modulo.value, superadas.value) : null,
);
const puntajeObtenido = computed(() =>
  modulo.value ? puntajeObtenidoModulo(modulo.value, store.puntajes) : 0,
);
const completoLocal = computed(() =>
  modulo.value ? moduloCompletado(modulo.value, superadas.value) : false,
);
const secciones = computed(() => modulo.value?.secciones ?? []);

const indiceSolicitado = computed(() => {
  const q = route.query.s;
  const id = Array.isArray(q) ? q[0] : q;
  if (!id) return null;
  const i = secciones.value.findIndex((s) => s.id === id);
  return i >= 0 ? i : null;
});
const indiceActual = computed(() => {
  const i = estados.value.indexOf('actual');
  return i >= 0 ? i : 0;
});
const indice = computed(() => indiceSolicitado.value ?? indiceBase.value ?? indiceActual.value);
/** Portada del módulo (sin `?s`): solo la información general; la flecha inicia las diapositivas. */
// Copia de `?s` que se actualiza con la navegación (watch con flush 'pre'): al cerrar la app, vue-router vacía la
// ruta ANTES de desmontar la vista, y así la sección sigue contando como mostrada y su tiempo se envía.
const seccionEnUrl = ref(route.query.s);
watch(
  () => route.query.s,
  (s) => {
    seccionEnUrl.value = s;
  },
);
const enPortada = computed(() => !seccionEnUrl.value);
const seccion = computed(() => secciones.value[indice.value] ?? null);
const seccionBloqueada = computed(() => estados.value[indice.value] === 'bloqueada');
const mostrando = computed(
  () =>
    fase.value === 'listo' && moduloAbierto.value && !enPortada.value && !seccionBloqueada.value,
);
const idSeccionMostrada = computed(() => (mostrando.value ? (seccion.value?.id ?? null) : null));

const bloquesVisibles = computed(() =>
  (seccion.value?.bloques ?? []).filter((b) => visibleParaNivel(b, contexto.nivel)),
);

/**
 * Filas de la sección: una vista por pantalla (observaciones de la docente, 2026-10-27). Un texto junto a una
 * imagen (antes o después de ella) forman una fila: la imagen a la izquierda y el texto a la derecha, o debajo si la
 * imagen es muy apaisada (lo decide `BloqueImagen`). Un texto con `fondo` seguido de su imagen se lee sobre esa
 * ilustración, en un recuadro de cristal junto a la imagen. El resto ocupa la fila entera.
 */
type BloqueLectura = TipoBloqueTexto | TipoBloqueTabla;
type FilaSeccion =
  | {
      tipo: 'par';
      clave: string;
      texto: TipoBloqueTexto;
      imagen: TipoBloqueImagen;
      previo?: TipoBloqueTexto;
    }
  | { tipo: 'grupo'; clave: string; lectura: BloqueLectura[]; notas: TipoBloqueCallout[] }
  | { tipo: 'solo'; clave: string; bloque: Bloque; previo?: TipoBloqueTexto }
  | { tipo: 'cierre'; clave: string };
function imagenEmparejable(b: Bloque | undefined): b is TipoBloqueImagen {
  return b?.tipo === 'imagen' && !b.pareja;
}
function textoEmparejable(b: Bloque | undefined): b is TipoBloqueTexto {
  return b?.tipo === 'texto';
}
/*
 * Textos, tablas y recuadros seguidos se reúnen en una misma vista hasta llenar la pantalla (revisión de los
 * módulos 4 a 6, 2026-10-28): una vista por bloque dejaba pantallas con dos líneas y separaba un texto que termina
 * en «:» de la tabla o la lista que anuncia. Los recuadros van en una columna a la derecha del texto.
 */
// Caracteres equivalentes que caben en una vista a lo ancho de la pantalla (revisión visual, 2026-10-29): unas 20
// líneas de ~140 caracteres. Cada salto de línea (listas, subtítulos) cuenta como un trozo de línea vacía.
const CABIDA_LECTURA = 2600;
const CABIDA_NOTAS = 700;
const CABIDA_NOTAS_SOLAS = 2000;
/** Con más lectura que esta, los recuadros no van al lado (estrecharían el texto hasta desbordar). */
const LECTURA_CON_NOTAS = 1700;
function pesoDeBloque(b: BloqueLectura | TipoBloqueCallout): number {
  if (b.tipo === 'tabla') {
    return 300 + b.filas.reduce((t, f) => t + Math.max(250, f.celdas.join('').length), 0);
  }
  const saltos = b.markdown.split('\n').length - 1;
  return b.markdown.length + saltos * 70 + (b.tipo === 'callout' ? 80 : 0);
}
function anunciaElSiguiente(b: BloqueLectura | undefined): boolean {
  return b?.tipo === 'texto' && b.markdown.trimEnd().endsWith(':');
}
const filasSeccion = computed<FilaSeccion[]>(() => {
  const bloques = bloquesVisibles.value;
  const filas: FilaSeccion[] = [];
  let grupo: Extract<FilaSeccion, { tipo: 'grupo' }> | null = null;
  let pesoLectura = 0;
  let pesoNotas = 0;
  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i] as Bloque;
    const sig = bloques[i + 1];
    if (textoEmparejable(b) && imagenEmparejable(sig)) {
      filas.push({ tipo: 'par', clave: idDeBloque(b), texto: b, imagen: sig });
      grupo = null;
      i++;
    } else if (imagenEmparejable(b) && textoEmparejable(sig) && !sig.fondo) {
      filas.push({ tipo: 'par', clave: idDeBloque(b), texto: sig, imagen: b });
      grupo = null;
      i++;
    } else if (b.tipo === 'texto' || b.tipo === 'tabla' || b.tipo === 'callout') {
      const peso = pesoDeBloque(b);
      const forzado = grupo !== null && anunciaElSiguiente(grupo.lectura.at(-1));
      const cabe =
        grupo !== null &&
        (b.tipo === 'callout'
          ? // Solo recuadros: van en dos columnas y caben más que en la columna lateral.
            pesoNotas + peso <= (pesoLectura > 0 ? CABIDA_NOTAS : CABIDA_NOTAS_SOLAS) &&
            pesoLectura <= LECTURA_CON_NOTAS
          : pesoLectura + peso <= (pesoNotas > 0 ? LECTURA_CON_NOTAS : CABIDA_LECTURA) &&
            // Un subtítulo nuevo abre vista propia si la actual ya tiene lectura suficiente.
            !(b.tipo === 'texto' && b.titulo && pesoLectura >= 1400));
      if (!grupo || !(forzado || cabe)) {
        grupo = { tipo: 'grupo', clave: idDeBloque(b), lectura: [], notas: [] };
        pesoLectura = 0;
        pesoNotas = 0;
        filas.push(grupo);
      }
      if (b.tipo === 'callout') {
        grupo.notas.push(b);
        pesoNotas += peso;
      } else {
        grupo.lectura.push(b);
        pesoLectura += peso;
      }
    } else {
      filas.push({ tipo: 'solo', clave: idDeBloque(b), bloque: b });
      grupo = null;
    }
  }
  // Al completar el módulo, la última sección gana una parte final con la felicitación y el paso siguiente.
  if (mostrarCompletado.value) filas.push({ tipo: 'cierre', clave: 'cierre-modulo' });
  return unirIntroducciones(unirNotasSueltas(filas));
});
/*
 * Un texto corto suelto (una o dos líneas: «Las enfermedades de este apartado muestran…», «Recorre la curva paso a
 * paso…») no ocupa una pantalla vacía: acompaña a la parte siguiente si es una imagen, una imagen con su texto o una
 * actividad (revisión visual, 2026-10-29).
 */
const LARGO_INTRODUCCION = 450;
/*
 * Recuadros sueltos («Atención», «Dato clave»…) que no cupieron junto al texto anterior: van con la parte siguiente si
 * su lectura es corta (al lado) o, si no, debajo de la anterior cuando esta deja sitio. Así no ocupan solos una
 * pantalla casi vacía.
 */
function pesoLecturaDe(f: Extract<FilaSeccion, { tipo: 'grupo' }>): number {
  return f.lectura.reduce((t, b) => t + pesoDeBloque(b), 0);
}
function pesoNotasDe(f: Extract<FilaSeccion, { tipo: 'grupo' }>): number {
  return f.notas.reduce((t, b) => t + pesoDeBloque(b), 0);
}
function unirNotasSueltas(filas: FilaSeccion[]): FilaSeccion[] {
  const salida: FilaSeccion[] = [];
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i] as FilaSeccion;
    if (f.tipo !== 'grupo' || f.lectura.length > 0) {
      salida.push(f);
      continue;
    }
    const sig = filas[i + 1];
    const prev = salida.at(-1);
    if (
      sig?.tipo === 'grupo' &&
      sig.lectura.length > 0 &&
      sig.notas.length === 0 &&
      pesoLecturaDe(sig) <= LECTURA_CON_NOTAS
    ) {
      salida.push({ ...sig, clave: f.clave, notas: f.notas });
      i++;
    } else if (
      prev?.tipo === 'grupo' &&
      prev.lectura.length > 0 &&
      pesoLecturaDe(prev) + pesoNotasDe(prev) + pesoNotasDe(f) <= CABIDA_LECTURA + 200
    ) {
      salida[salida.length - 1] = { ...prev, notas: [...prev.notas, ...f.notas] };
    } else {
      salida.push(f);
    }
  }
  return salida;
}
function unirIntroducciones(filas: FilaSeccion[]): FilaSeccion[] {
  const salida: FilaSeccion[] = [];
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i] as FilaSeccion;
    const sig = filas[i + 1];
    const intro =
      f.tipo === 'grupo' &&
      f.notas.length === 0 &&
      f.lectura.length === 1 &&
      f.lectura[0]?.tipo === 'texto' &&
      f.lectura[0].markdown.length < LARGO_INTRODUCCION
        ? f.lectura[0]
        : null;
    if (intro && sig?.tipo === 'par' && !sig.previo && !sig.texto.fondo) {
      salida.push({ ...sig, clave: f.clave, previo: intro });
      i++;
    } else if (intro && sig?.tipo === 'solo' && !sig.previo && imagenEmparejable(sig.bloque)) {
      salida.push({ tipo: 'par', clave: f.clave, texto: intro, imagen: sig.bloque });
      i++;
    } else if (intro && sig?.tipo === 'solo' && !sig.previo && sig.bloque.tipo === 'actividad') {
      salida.push({ ...sig, clave: f.clave, previo: intro });
      i++;
    } else if (
      intro &&
      sig?.tipo === 'grupo' &&
      pesoDeBloque(intro) + pesoLecturaDe(sig) <= CABIDA_LECTURA + 300
    ) {
      salida.push({ ...sig, clave: f.clave, lectura: [intro, ...sig.lectura] });
      i++;
    } else {
      salida.push(f);
    }
  }
  return salida;
}
/*
 * Vistas de la sección (observación de la docente, 2026-10-27: «mi idea era que todo el contenido fuera
 * horizontal… el contenido de los submódulos es vertical y eso dificulta la lectura»): cada fila es una vista que
 * cabe en la pantalla y se pasa de una a otra hacia los lados, como diapositivas. La última vista lleva el paso a la
 * sección siguiente, que solo se abre al terminar las actividades obligatorias.
 */
const vista = ref(0);
const sentidoVista = ref<'diapo-adelante' | 'diapo-atras'>('diapo-adelante');
const carrusel = ref<HTMLElement | null>(null);
/*
 * Alto real del recuadro de la parte visible (en escritorio, donde la sección ocupa la pantalla): lo leen las imágenes
 * y los textos (`--alto-vista`) para caber sin desplazarse. En móvil la página se desplaza y no se fija.
 */
let observadorAlto: ResizeObserver | null = null;
watch(carrusel, (el) => {
  observadorAlto?.disconnect();
  observadorAlto = null;
  if (!el || typeof ResizeObserver === 'undefined') return;
  const escritorio = window.matchMedia?.('(min-width: 1024px)');
  observadorAlto = new ResizeObserver(() => {
    if (escritorio?.matches) el.style.setProperty('--alto-vista', `${el.clientHeight}px`);
    else el.style.removeProperty('--alto-vista');
  });
  observadorAlto.observe(el);
});
onBeforeUnmount(() => observadorAlto?.disconnect());
const totalVistas = computed(() => filasSeccion.value.length);
const filaActual = computed(() => filasSeccion.value[vista.value] ?? null);
const esUltimaVista = computed(() => vista.value >= totalVistas.value - 1);
/** Al volver desde la primera parte de una sección, la anterior se abre por su última parte. */
let entrarPorElFinal = false;
watch(
  () => seccion.value?.id,
  () => {
    vista.value = entrarPorElFinal ? Math.max(0, totalVistas.value - 1) : 0;
    entrarPorElFinal = false;
  },
);
function irAVista(i: number): void {
  if (i < 0 || i >= totalVistas.value || i === vista.value) return;
  sentidoVista.value = i > vista.value ? 'diapo-adelante' : 'diapo-atras';
  vista.value = i;
  void nextTick(() => {
    if (carrusel.value) carrusel.value.scrollTop = 0;
  });
}
/** Nombres de las partes (1.1.1, 1.1.2…) de la sección abierta, para la navegación. */
const nombresPartes = computed(() => filasSeccion.value.map((f, i) => etiquetaDeFila(f, i)));
function numeroParte(i: number): string {
  return `${props.n}.${indice.value + 1}.${i + 1}`;
}

/* ----- Pie: anterior / siguiente, cruzando de una sección a otra ----- */

const anterior = computed<{ texto: string; ir: () => void }>(() => {
  if (vista.value > 0) {
    const i = vista.value - 1;
    return { texto: `${numeroParte(i)} · ${nombresPartes.value[i]}`, ir: () => irAVista(i) };
  }
  const previa = secciones.value[indice.value - 1];
  if (previa) {
    return {
      texto: `${props.n}.${indice.value} · ${textoPlanoDeMarkdown(previa.titulo)}`,
      ir: () => {
        entrarPorElFinal = true;
        irA(indice.value - 1);
      },
    };
  }
  return { texto: 'Portada del módulo', ir: irAPortada };
});
const siguiente = computed<{ texto: string; ir: () => void; cerrada?: boolean } | null>(() => {
  if (!esUltimaVista.value) {
    const i = vista.value + 1;
    return { texto: `${numeroParte(i)} · ${nombresPartes.value[i]}`, ir: () => irAVista(i) };
  }
  const proxima = secciones.value[indice.value + 1];
  if (!proxima) return null;
  const texto = `${props.n}.${indice.value + 2} · ${textoPlanoDeMarkdown(proxima.titulo)}`;
  return siguienteAbierta.value
    ? { texto, ir: () => irA(indice.value + 1) }
    : { texto, ir: irAlPrimeroPendiente, cerrada: true };
});
/** Nombre de una vista para los puntos de navegación y el lector de pantalla. */
function etiquetaDeFila(f: FilaSeccion | undefined, i: number): string {
  if (!f) return `Vista ${i + 1}`;
  if (f.tipo === 'cierre') return 'Módulo completado';
  let titulo = '';
  if (f.tipo === 'par') titulo = f.texto.titulo ?? f.previo?.titulo ?? f.imagen.pie;
  else if (f.tipo === 'grupo') {
    const primero = [...f.lectura, ...f.notas].find((b) => b.titulo);
    titulo = primero?.titulo ?? (f.notas[0] ? ETIQUETA_VARIANTE_CALLOUT[f.notas[0].variante] : '');
  } else if (f.bloque.tipo === 'actividad') titulo = f.bloque.actividad.titulo;
  else if (f.bloque.tipo === 'imagen') titulo = f.bloque.pie;
  else if ('titulo' in f.bloque && f.bloque.titulo) titulo = f.bloque.titulo;
  if (titulo) return textoPlanoDeMarkdown(titulo);
  // Sin título: la primera parte es la introducción; las demás, el comienzo de su primer texto.
  if (i === 0) return 'Introducción';
  const texto =
    f.tipo === 'grupo'
      ? f.lectura.find((b) => b.tipo === 'texto')
      : f.tipo === 'solo' && f.bloque.tipo === 'texto'
        ? f.bloque
        : undefined;
  return texto?.tipo === 'texto' ? inicioDeTexto(texto.markdown) : `Parte ${i + 1}`;
}
function inicioDeTexto(markdown: string): string {
  const plano = textoPlanoDeMarkdown(markdown.split(/\n\s*\n/)[0] ?? '').trim();
  const frase = plano.split(/(?<=[.:;])\s/)[0] ?? plano;
  return frase.length <= 60 ? frase.replace(/[.:;]$/, '') : `${frase.slice(0, 57).trimEnd()}…`;
}
/** El título de un texto que ya da nombre a la parte (va en el encabezado 1.1.2 · …) no se repite dentro. */
function sinTituloRepetido(t: TipoBloqueTexto): TipoBloqueTexto {
  if (!t.titulo || textoPlanoDeMarkdown(t.titulo) !== nombresPartes.value[vista.value]) return t;
  const { titulo: _titulo, ...resto } = t;
  return resto;
}
/**
 * Los recuadros van a la derecha del texto, salvo que la vista lleve una tabla (necesita todo el ancho) o que el texto o
 * los recuadros sean largos: entonces van debajo, en dos columnas.
 */
function notasAlLado(f: Extract<FilaSeccion, { tipo: 'grupo' }>): boolean {
  return (
    f.lectura.length > 0 &&
    f.notas.length > 0 &&
    f.lectura.every((b) => b.tipo !== 'tabla') &&
    pesoLecturaDe(f) <= LECTURA_CON_NOTAS &&
    pesoNotasDe(f) <= CABIDA_NOTAS
  );
}
/** Flechas del teclado sobre la barra de vistas. */
function alTeclaVistas(e: KeyboardEvent): void {
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    irAVista(vista.value + 1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    irAVista(vista.value - 1);
  }
}

function sinFondo(t: TipoBloqueTexto): TipoBloqueTexto {
  const { fondo: _fondo, ...resto } = t;
  return resto;
}

/** Actividades obligatorias que faltan en la sección abierta, en orden. */
const pendientes = computed(() =>
  seccion.value ? pendientesDeSeccion(seccion.value, superadas.value, store.conocidos) : [],
);
/** Pendientes de la sección `actual` (la que hay que terminar para abrir las demás). */
const pendientesActual = computed(() => {
  const s = secciones.value[indiceActual.value];
  return s ? pendientesDeSeccion(s, superadas.value, store.conocidos) : [];
});
const siguienteAbierta = computed(() => {
  const e = estados.value[indice.value + 1];
  return e !== undefined && e !== 'bloqueada';
});

/* ----- Ir a una sección ----- */

function irA(i: number): void {
  const destino = secciones.value[i];
  if (!destino) return;
  avisoBloqueo.value = '';
  // La nueva diapositiva entra arriba, con su portada a la vista mientras se desliza.
  window.scrollTo?.({ top: 0, behavior: 'auto' });
  void router.push({ name: 'modulo', params: { n: props.n }, query: { s: destino.id } });
}

const avisoBloqueo = ref('');

function irAPortada(): void {
  avisoBloqueo.value = '';
  void router.push({ name: 'modulo', params: { n: props.n } });
}

function alIntentarSeccionBloqueada(i: number): void {
  const s = secciones.value[i];
  const primera = secciones.value[indiceActual.value];
  const falta = textoPendientes(pendientesActual.value);
  avisoBloqueo.value =
    `La sección «${textoPlanoDeMarkdown(s?.titulo ?? '')}» todavía está bloqueada.` +
    (primera
      ? ` Primero termina la sección «${textoPlanoDeMarkdown(primera.titulo)}». ${falta}`
      : '');
}

/**
 * Texto del panel en la portada del módulo cuando su `resumen` no trae una apertura propia (solo repite el
 * subtítulo, como en los módulos 2 y 3 del documento de la docente): el primer párrafo de su primera sección.
 */
const aperturaDePortada = computed(() => {
  const m = modulo.value;
  if (!m || aperturaDelResumen(m.resumen, m.subtitulo)) return undefined;
  const primero = m.secciones[0]?.bloques.find((b) => b.tipo === 'texto');
  return primero?.tipo === 'texto' ? primero.markdown.split(/\n\s*\n/)[0]?.trim() : undefined;
});

/** Texto de la flecha del panel: a qué diapositiva lleva. */
const textoContinuar = computed(() => {
  if (enPortada.value) {
    const s = secciones.value[indice.value];
    if (!s) return 'Empezar';
    const verbo = indice.value === 0 && estados.value[0] !== 'completada' ? 'Empezar' : 'Continuar';
    return `${verbo}: ${textoPlanoDeMarkdown(s.titulo)}`;
  }
  return `Leer la sección: ${textoPlanoDeMarkdown(seccion.value?.titulo ?? '')}`;
});

/**
 * Flecha del panel: en la portada inicia las diapositivas (la sección en curso); en una sección baja a su
 * contenido. No salta a la siguiente sección (observación de la docente, 2026-10-27: quien entra por primera
 * vez la pulsa creyendo que debe hacerlo y se salta el submódulo); avanzar se hace al final de la sección
 * («Siguiente» y, en la última, el paso al módulo siguiente).
 */
function alContinuar(): void {
  if (enPortada.value) {
    irA(indice.value);
    return;
  }
  const el = tituloSeccion.value;
  if (!el) return;
  el.focus({ preventScroll: true });
  desplazarA(el);
}

/* ----- Diapositivas: sentido del deslizamiento ----- */

/** Posición de la diapositiva visible: -1 la portada, 0… las secciones. */
const posicion = computed(() => (enPortada.value ? -1 : indice.value));
const claveDiapositiva = computed(() => `${props.n}:${posicion.value}`);
const sentido = ref<'diapo-adelante' | 'diapo-atras'>('diapo-adelante');
/**
 * Al pasar a otro módulo la vista recarga su contenido y el escenario se monta de nuevo: su portada entra
 * deslizándose (`appear`) hacia delante o hacia atrás. Mientras carga, la posición pasa por valores
 * intermedios que no deben cambiar el sentido.
 */
const deslizarAlCargar = ref(false);
let cambioDeModulo = false;
watch(
  () => props.n,
  (nuevo, previo) => {
    cambioDeModulo = true;
    deslizarAlCargar.value = true;
    sentido.value = nuevo > previo ? 'diapo-adelante' : 'diapo-atras';
  },
);
watch(posicion, (nueva, previa) => {
  if (cambioDeModulo) return;
  sentido.value = nueva >= previa ? 'diapo-adelante' : 'diapo-atras';
});
watch(fase, (f) => {
  if (f === 'listo' && cambioDeModulo) void nextTick(() => (cambioDeModulo = false));
});

function irAlPrimeroPendiente(): void {
  const primera = pendientes.value[0];
  if (!primera) return;
  const enVista = filasSeccion.value.findIndex(
    (f) =>
      f.tipo === 'solo' && f.bloque.tipo === 'actividad' && f.bloque.actividad.id === primera.id,
  );
  if (enVista >= 0) irAVista(enVista);
  // Tras la transición de la vista, el bloque ya está en la página.
  setTimeout(() => {
    const el = document.getElementById(`actividad-${primera.id}`);
    if (!el) return;
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }, 60);
}

function preferirMenosMovimiento(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

function desplazarA(el: HTMLElement): void {
  el.scrollIntoView?.({ block: 'start', behavior: preferirMenosMovimiento() ? 'auto' : 'smooth' });
}

/* ----- Foco al cambiar de sección ----- */

const tituloSeccion = ref<HTMLElement | null>(null);

// Cada diapositiva empieza arriba, con su portada a la vista (el foco, al título de la sección).
watch(posicion, (nueva, previa) => {
  if (nueva === previa || fase.value !== 'listo') return;
  // Tras el foco que el shell da a <main> al cambiar la ruta.
  setTimeout(() => {
    window.scrollTo?.({ top: 0, behavior: 'auto' });
    tituloSeccion.value?.focus({ preventScroll: true });
  }, 0);
});

/* -------------------------------------------------------------------------------------------
 * Contexto pedagógico
 * ----------------------------------------------------------------------------------------- */

watch(
  idSeccionMostrada,
  (id) => {
    if (id) contexto.setSeccion(id);
  },
  { immediate: true },
);

/* -------------------------------------------------------------------------------------------
 * Tiempo y sección actual (PUT /api/progress/{n})
 * ----------------------------------------------------------------------------------------- */

useTiempoModulo({
  modulo: computed(() => props.n),
  seccion: idSeccionMostrada,
  // El docente solo lee: no se cuenta ni se envía su tiempo.
  activo: computed(() => mostrando.value && !esDocente.value),
});

/* -------------------------------------------------------------------------------------------
 * Completar el módulo
 * ----------------------------------------------------------------------------------------- */

/**
 * Si el módulo está completo según los resultados y el servidor aún no lo sabe, pide el `PUT`
 * (el store lo envía cuando no queda ningún `POST` de este módulo pendiente). También reenvía al
 * abrir un módulo que se dejó completo sin que el `PUT` llegara. Tras un 409 se vuelve a pedir
 * cuando la cola de resultados se vacía otra vez (el estudiante repitió lo que faltaba).
 */
watch(
  () =>
    [
      fase.value === 'listo' &&
        !esDocente.value &&
        completoLocal.value &&
        !moduloYaCompletado.value,
      store.pendientes,
    ] as const,
  ([debeEnviar]) => {
    if (debeEnviar) void store.solicitarCompletar(props.n);
  },
  { immediate: true },
);

const titulosFaltantes = computed(() =>
  modulo.value
    ? titulosDeActividades(modulo.value.secciones, store.faltantesDeModulo(props.n))
    : [],
);
const mostrarCompletado = computed(
  () => mostrando.value && completoLocal.value && indice.value === secciones.value.length - 1,
);
const siguienteModuloAbierto = computed(() => !bloqueoSecuencial.value || moduloYaCompletado.value);

/* ----- Anuncios para lectores de pantalla (aria-live moderado) ----- */

const mensajeVivo = ref('');
watch(completoLocal, (ahora, antes) => {
  if (fase.value === 'listo' && ahora && !antes) {
    mensajeVivo.value = `Completaste el módulo ${props.n}.`;
  }
});
watch(
  () => estados.value.filter((e) => e === 'completada').length,
  (ahora, antes) => {
    if (fase.value !== 'listo' || ahora <= antes || completoLocal.value) return;
    mensajeVivo.value = bloqueoSecuencial.value
      ? 'Sección completada. Ya puedes abrir la siguiente.'
      : 'Sección completada.';
  },
);

/* -------------------------------------------------------------------------------------------
 * Glosario
 * ----------------------------------------------------------------------------------------- */

const terminoAbierto = ref<TerminoGlosario | null>(null);
const disparadorGlosario = ref<HTMLElement | null>(null);

function alPedirGlosario(evento: Event): void {
  const id = (evento as CustomEvent<{ id?: string }>).detail?.id;
  const termino = modulo.value?.glosario.find((t) => t.id === id);
  if (!termino) return;
  disparadorGlosario.value = evento.target instanceof HTMLElement ? evento.target : null;
  terminoAbierto.value = termino;
}

function cerrarGlosario(): void {
  terminoAbierto.value = null;
}

onMounted(() => document.addEventListener(EVENTO_GLOSARIO, alPedirGlosario));

/* -------------------------------------------------------------------------------------------
 * Desmontaje
 * ----------------------------------------------------------------------------------------- */

onBeforeUnmount(() => {
  cargaActual++;
  document.removeEventListener(EVENTO_GLOSARIO, alPedirGlosario);
  store.detener();
  // El mentor deja de ver una sección o actividad de un módulo que ya no está en pantalla.
  contexto.setSeccion(SECCION_INICIAL);
});
</script>

<template>
  <!-- El padding inferior deja el final del contenido por encima de los botones flotantes del menú
       circular y del mentor en móvil (el <main> del shell reserva otro tanto). -->
  <div
    class="w-full px-4 pb-[max(7rem,calc(var(--area-segura-abajo)+6rem))] md:px-8"
    :class="enPortada ? 'pt-6 md:pt-10 md:pb-10' : 'pt-3 md:pb-3'"
    :style="estiloAcento(n)"
    :aria-busy="fase === 'cargando' ? 'true' : undefined"
    :data-modulo="n"
    data-testid="modulo-view"
  >
    <!-- Cargando -->
    <div
      v-if="fase === 'cargando'"
      role="status"
      class="text-muted-foreground flex min-h-40 items-center justify-center gap-3"
      data-testid="modulo-cargando"
    >
      <LoaderCircle class="size-5 motion-safe:animate-spin" aria-hidden="true" />
      Cargando el módulo…
    </div>

    <!-- Error de carga -->
    <div
      v-else-if="fase === 'error'"
      role="alert"
      class="bg-card mx-auto flex max-w-3xl items-start gap-4 rounded-xl border p-5"
      data-testid="modulo-error"
    >
      <CircleAlert class="text-destructive mt-0.5 size-6 shrink-0" aria-hidden="true" />
      <div class="space-y-3">
        <h1 class="text-xl font-semibold">No pudimos abrir este módulo</h1>
        <p class="text-muted-foreground">{{ mensajeError }}</p>
        <div class="flex flex-wrap gap-3">
          <Button data-testid="reintentar-carga" @click="cargar">Intentar de nuevo</Button>
          <Button as-child variant="outline">
            <RouterLink :to="{ name: 'inicio' }">Volver al inicio</RouterLink>
          </Button>
        </div>
      </div>
    </div>

    <!-- Módulo sin contenido -->
    <div v-else-if="fase === 'sin_contenido'" class="mx-auto max-w-3xl" data-testid="modulo-vacio">
      <p class="text-muted-foreground text-sm">Módulo {{ n }} de 6</p>
      <h1 class="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
        {{ modulosData?.titulo }}
      </h1>
      <p v-if="modulosData" class="mt-3 max-w-prose text-lg leading-relaxed">
        {{ modulosData.foco }}
      </p>
      <div class="bg-card mt-8 flex items-start gap-4 rounded-xl border p-5">
        <Info class="text-primary mt-0.5 size-6 shrink-0" aria-hidden="true" />
        <div class="space-y-2">
          <h2 class="text-xl font-semibold">Este módulo aún no tiene contenido</h2>
          <p class="text-muted-foreground">
            Todavía lo estamos preparando. Mientras tanto puedes estudiar los otros módulos desde el
            menú.
          </p>
          <RouterLink
            :to="{ name: 'inicio' }"
            class="text-primary inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
          >
            Volver al inicio
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Módulo bloqueado: se explica en su sitio, con la identidad del módulo y sin secciones -->
    <ModuloBloqueado
      v-else-if="bloqueo && modulo"
      :modulo="modulo"
      :requerido="bloqueo.requerido"
      :destino="bloqueo.destino"
    />

    <!-- Módulo -->
    <!-- Escenario de las diapositivas: la que entra y la que sale se deslizan a la vez, como en una presentación. -->
    <div v-else-if="modulo && avance" class="escenario relative overflow-x-clip">
      <Transition
        :name="sentido"
        :appear="deslizarAlCargar"
        @after-appear="deslizarAlCargar = false"
      >
        <div
          :key="claveDiapositiva"
          class="diapositiva"
          data-testid="diapositiva"
          :data-posicion="posicion"
        >
          <CabeceraModulo
            v-if="enPortada"
            :modulo="modulo"
            :avance="avance"
            :puntaje-obtenido="puntajeObtenido"
            :revision="esDocente"
            :texto-continuar="textoContinuar"
            :continuar-abajo="!enPortada"
            :texto-seccion="enPortada ? aperturaDePortada : secciones[indice]?.resumen"
            :fondo-seccion="enPortada ? undefined : secciones[indice]?.fondo"
            :panel-abajo="!enPortada && secciones[indice]?.panel === 'abajo'"
            :encabezado-seccion="
              enPortada || !seccion
                ? undefined
                : `${n}.${indice + 1} · ${textoPlanoDeMarkdown(seccion.titulo)}`
            "
            @continuar="alContinuar"
          >
            <template #pasos>
              <NavegacionSecciones
                :secciones="secciones"
                :estados="estados"
                :indice="indice"
                :numero-modulo="n"
                encadenada
                @ir="irA"
                @bloqueada="alIntentarSeccionBloqueada"
              />
            </template>
          </CabeceraModulo>

          <!-- Sección: una sola pantalla, sin desplazar la página (indicación de la usuaria, 2026-10-29). Arriba la
               navegación con las partes de la sección (1.1.1, 1.1.2…); en medio la parte visible, que se ajusta al
               alto disponible; abajo el paso a la parte anterior o siguiente, que cruza de una sección a otra. -->
          <div v-else class="pantalla-seccion flex flex-col gap-3" data-testid="pantalla-seccion">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
              <RouterLink
                :to="{ name: 'modulo', params: { n } }"
                class="text-primary text-sm font-bold whitespace-nowrap hover:underline"
                data-testid="enlace-portada"
              >
                Módulo {{ n }} · {{ modulo.titulo }}
              </RouterLink>
              <details class="relative text-sm" data-testid="objetivos-desplegable">
                <summary
                  class="text-muted-foreground hover:text-foreground cursor-pointer select-none"
                >
                  Objetivos
                </summary>
                <ul
                  class="bg-card marker:text-primary absolute left-0 z-20 mt-2 w-[min(40rem,90vw)] list-disc space-y-1 rounded-xl border p-4 pl-8 leading-relaxed shadow-lg"
                >
                  <li v-for="objetivo in modulo.objetivos" :key="objetivo">
                    <TextoRico :texto="objetivo" modo="linea" />
                  </li>
                </ul>
              </details>
              <span
                class="text-muted-foreground ml-auto text-sm tabular-nums"
                data-testid="avance-obligatorias"
              >
                {{ avance.obligatoriasCompletadas }} de {{ avance.obligatoriasTotal }} obligatorias
                · {{ puntajeObtenido }} pts
              </span>
            </div>

            <NavegacionPartes
              :numero-modulo="n"
              :secciones="secciones"
              :estados="estados"
              :indice="indice"
              :partes="seccionBloqueada ? [] : nombresPartes"
              :parte="vista"
              @ir-seccion="irA"
              @ir-parte="irAVista"
              @bloqueada="alIntentarSeccionBloqueada"
            />

            <p
              v-if="store.errorEnvio"
              class="text-foreground bg-accent mt-4 flex items-start gap-2 rounded-md px-3 py-2 text-sm"
              role="status"
              data-testid="error-envio"
            >
              <CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{{ store.errorEnvio }}</span>
            </p>

            <p
              v-if="avisoBloqueo"
              class="bg-accent text-accent-foreground mt-4 flex items-start gap-2 rounded-md px-3 py-2 text-sm"
              role="status"
              data-testid="aviso-seccion-bloqueada"
            >
              <Lock class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{{ avisoBloqueo }}</span>
            </p>

            <!-- Sección bloqueada: se explica qué falta -->
            <section
              v-if="seccion && seccionBloqueada"
              class="bg-card space-y-3 rounded-xl border border-dashed p-5"
              aria-labelledby="titulo-seccion"
              data-testid="seccion-bloqueada"
            >
              <h2
                id="titulo-seccion"
                ref="tituloSeccion"
                tabindex="-1"
                class="flex items-center gap-2 font-serif text-2xl font-semibold outline-none"
              >
                <Lock class="text-acento size-5" aria-hidden="true" />
                Esta sección todavía está bloqueada
              </h2>
              <p>
                Las secciones se estudian en orden. Antes de abrir «{{
                  textoPlanoDeMarkdown(seccion.titulo)
                }}» termina la sección «{{
                  textoPlanoDeMarkdown(secciones[indiceActual]?.titulo ?? '')
                }}».
              </p>
              <p class="text-muted-foreground">{{ textoPendientes(pendientesActual) }}</p>
              <Button data-testid="ir-a-seccion-actual" @click="irA(indiceActual)">
                Ir a la sección «{{ textoPlanoDeMarkdown(secciones[indiceActual]?.titulo ?? '') }}»
              </Button>
            </section>

            <!-- Sección abierta -->
            <section
              v-else-if="seccion"
              :key="seccion.id"
              class="flex min-h-0 flex-1 flex-col gap-3"
              aria-labelledby="titulo-seccion"
              data-testid="seccion"
              :data-seccion="seccion.id"
            >
              <h2
                id="titulo-seccion"
                ref="tituloSeccion"
                tabindex="-1"
                class="border-l-acento border-l-4 pl-3 font-serif text-xl leading-tight font-semibold outline-none md:text-2xl"
                data-testid="titulo-parte"
              >
                <span class="sr-only">{{ textoPlanoDeMarkdown(seccion.titulo) }}. Parte </span>
                <span class="text-primary tabular-nums">{{ numeroParte(vista) }}</span>
                · {{ nombresPartes[vista] }}
              </h2>
              <p class="sr-only" aria-live="polite">
                Parte {{ vista + 1 }} de {{ totalVistas }}: {{ nombresPartes[vista] }}
              </p>

              <!-- La parte visible: cabe en el alto disponible; si algo no cabe, se desplaza solo este recuadro. -->
              <div
                ref="carrusel"
                class="vista-contenedor relative min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain"
                data-testid="carrusel-seccion"
                :data-vista="vista"
                @keydown="alTeclaVistas"
              >
                <Transition :name="sentidoVista">
                  <div
                    :key="`${seccion.id}:${vista}`"
                    class="vista-seccion"
                    data-testid="vista-seccion"
                  >
                    <template v-for="fila in filaActual ? [filaActual] : []" :key="fila.clave">
                      <div
                        v-if="fila.tipo === 'par'"
                        :class="
                          fila.texto.fondo
                            ? 'relative isolate overflow-hidden rounded-2xl border p-3 sm:p-6'
                            : ''
                        "
                        :style="
                          fila.texto.fondo
                            ? { '--alto-max': 'calc(var(--alto-vista, 100dvh - 6.5rem) - 7rem)' }
                            : undefined
                        "
                        data-testid="fila-texto-imagen"
                      >
                        <img
                          v-if="fila.texto.fondo"
                          :src="fila.texto.fondo"
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          class="absolute inset-0 -z-10 size-full object-cover"
                        />
                        <BloqueImagen
                          :bloque="fila.imagen"
                          :largo-lateral="fila.texto.markdown.length"
                          :lateral-cristal="Boolean(fila.texto.fondo)"
                        >
                          <template #lateral>
                            <BloqueTexto
                              v-if="fila.previo"
                              :bloque="sinTituloRepetido(fila.previo)"
                              incrustado
                              class="mb-4"
                            />
                            <BloqueTexto
                              :bloque="sinTituloRepetido(sinFondo(fila.texto))"
                              incrustado
                            />
                          </template>
                        </BloqueImagen>
                      </div>
                      <div
                        v-else-if="fila.tipo === 'grupo'"
                        class="grid items-start gap-5"
                        :class="
                          notasAlLado(fila)
                            ? 'lg:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]'
                            : ''
                        "
                        data-testid="grupo-lectura"
                      >
                        <div v-if="fila.lectura.length" class="min-w-0 space-y-5">
                          <template v-for="b in fila.lectura" :key="b.id">
                            <BloqueTexto
                              v-if="b.tipo === 'texto'"
                              :bloque="sinTituloRepetido(b)"
                              :columnas="!notasAlLado(fila) && b.markdown.length > 1200"
                            />
                            <BloqueTabla v-else :bloque="b" />
                          </template>
                        </div>
                        <aside
                          v-if="fila.notas.length"
                          class="grid min-w-0 items-start gap-4"
                          :class="
                            !notasAlLado(fila) && fila.notas.length > 1 ? 'md:grid-cols-2' : ''
                          "
                        >
                          <BloqueCallout v-for="c in fila.notas" :key="c.id" :bloque="c" />
                        </aside>
                      </div>
                      <ModuloCompletado
                        v-else-if="fila.tipo === 'cierre'"
                        :numero="n"
                        :puntaje-obtenido="puntajeObtenido"
                        :puntaje-maximo="avance.puntajeMaximo"
                        :guardado="moduloYaCompletado"
                        :faltantes="titulosFaltantes"
                        :siguiente-abierto="siguienteModuloAbierto"
                      />
                      <BloqueTexto
                        v-else-if="fila.bloque.tipo === 'texto'"
                        :bloque="sinTituloRepetido(fila.bloque)"
                        :columnas="fila.bloque.markdown.length > 1200"
                      />
                      <BloqueCallout
                        v-else-if="fila.bloque.tipo === 'callout'"
                        :bloque="fila.bloque"
                      />
                      <BloqueImagen
                        v-else-if="fila.bloque.tipo === 'imagen'"
                        :bloque="fila.bloque"
                      />
                      <BloqueTabla v-else-if="fila.bloque.tipo === 'tabla'" :bloque="fila.bloque" />
                      <BloqueEscenarios
                        v-else-if="fila.bloque.tipo === 'escenarios'"
                        :bloque="fila.bloque"
                      />
                      <BloquePregunta
                        v-else-if="fila.bloque.tipo === 'pregunta'"
                        :bloque="fila.bloque"
                      />
                      <template v-else-if="fila.bloque.tipo === 'actividad'">
                        <BloqueTexto v-if="fila.previo" :bloque="fila.previo" class="mb-3" />
                        <BloqueActividad
                          :actividad="fila.bloque.actividad"
                          :modulo="n as NumeroModulo"
                          :solo-lectura="esDocente"
                        />
                      </template>
                    </template>
                  </div>
                </Transition>
              </div>

              <!-- Pie: parte anterior y siguiente; al final de la sección, la sección siguiente (o lo que falta). -->
              <nav
                aria-label="Parte anterior y siguiente"
                class="flex items-center justify-between gap-3 border-t pt-3 lg:pr-20"
                data-testid="pie-partes"
              >
                <button
                  type="button"
                  class="hover:bg-accent focus-visible:ring-ring flex min-h-11 max-w-[45%] items-center gap-2 rounded-full border px-4 text-left text-sm font-medium outline-none focus-visible:ring-2"
                  data-testid="parte-anterior"
                  @click="anterior.ir()"
                >
                  <ChevronLeft class="size-5 shrink-0" aria-hidden="true" />
                  <span class="truncate">{{ anterior.texto }}</span>
                </button>
                <p
                  v-if="siguiente?.cerrada"
                  class="text-muted-foreground hidden min-w-0 flex-1 text-center text-sm md:block"
                  data-testid="motivo-bloqueo"
                >
                  {{ textoPendientes(pendientes) }}
                </p>
                <button
                  v-if="siguiente"
                  type="button"
                  class="focus-visible:ring-ring flex min-h-11 max-w-[45%] items-center gap-2 rounded-full px-5 text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  :class="
                    siguiente.cerrada
                      ? 'bg-muted text-foreground border border-dashed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  "
                  :title="siguiente.cerrada ? textoPendientes(pendientes) : undefined"
                  data-testid="parte-siguiente"
                  @click="siguiente.ir()"
                >
                  <Lock v-if="siguiente.cerrada" class="size-4 shrink-0" aria-hidden="true" />
                  <span class="truncate">
                    {{ siguiente.cerrada ? 'Ir a la actividad pendiente' : siguiente.texto }}
                  </span>
                  <ChevronRight class="size-5 shrink-0" aria-hidden="true" />
                </button>
              </nav>
            </section>
          </div>

          <!-- Glosario y referencias ocultos por ahora (indicación de la usuaria, 2026-10-29).
          <GlosarioYReferencias :modulo="modulo" />
          -->
        </div>
      </Transition>
    </div>
    <GlosarioHoja
      v-if="modulo && avance"
      :termino="terminoAbierto"
      :disparador="disparadorGlosario"
      @cerrar="cerrarGlosario"
    />

    <AvisosLogro />
    <p class="sr-only" role="status" aria-live="polite" data-testid="anuncio-vivo">
      {{ mensajeVivo }}
    </p>
  </div>
</template>

<style scoped>
/* Una sección ocupa exactamente la pantalla en escritorio: el alto de la ventana menos la barra superior de la
   aplicación y el relleno de la página. `--alto-vista` es el alto que queda para la parte visible (descontando la
   fila del módulo, la navegación, el título de la parte y el pie); las imágenes y los textos se ajustan a él. */
@media (min-width: 1024px) {
  .pantalla-seccion {
    height: calc(100dvh - 3.5rem - 1px - var(--area-segura-arriba, 0px) - 1.5rem);
  }
  .vista-contenedor {
    --alto-vista: calc(100dvh - 18rem - var(--area-segura-arriba, 0px));
  }
}
/* No se apaga con `prefers-reduced-motion`: el deslizamiento lo pidió la usuaria y es la pista de hacia dónde se
   avanza (Windows con «Efectos de animación» desactivado lo activa en Chrome y la navegación se veía como un salto).
   Es un único movimiento corto, sin rebotes ni parpadeos, iniciado por quien pulsa la flecha. */
/* Diapositivas: la nueva entra deslizándose desde un lado mientras la anterior sale por el otro, a la vez (la que
   sale queda superpuesta en su sitio, en absoluto, para que no empuje a la que entra). */
.diapo-adelante-enter-active,
.diapo-adelante-leave-active,
.diapo-atras-enter-active,
.diapo-atras-leave-active {
  transition: transform 0.5s cubic-bezier(0.22, 0.8, 0.25, 1);
  will-change: transform;
}
.diapo-adelante-leave-active,
.diapo-atras-leave-active {
  position: absolute;
  inset: 0 0 auto 0;
}
.diapo-adelante-enter-from,
.diapo-atras-leave-to {
  transform: translateX(100%);
}
.diapo-adelante-leave-to,
.diapo-atras-enter-from {
  transform: translateX(-100%);
}
</style>
