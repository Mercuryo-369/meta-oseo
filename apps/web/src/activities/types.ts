/**
 * Contrato de los componentes de actividad (motor de actividades, PLAN §4).
 *
 * TODO componente de `src/activities/` lo implementa: `ActivityLayers`, `ActivityDrag`,
 * `ActivityMatch`, `ActivityQuiz`, `ActivityMedia` y `ActivityScene3D`. La página de módulo
 * (F2-08) los usa a todos igual, sin saber cuál es cuál.
 *
 * ── Qué recibe ──────────────────────────────────────────────────────────────────────────────
 *  Props (`PropsActividad<T>`): `actividad` (su configuración, ya validada y tipada; solo se lee),
 *  `modulo` (para la API y para las rutas de recursos), `estadoPrevio` (lo guardado del intento
 *  anterior) y `modo` (`jugar` por defecto, o `revisar`).
 *
 * ── Qué emite ───────────────────────────────────────────────────────────────────────────────
 *  - `progreso(ProgresoActividad)`: cada vez que el estado cambia de forma que valga la pena
 *    guardar (no más de una vez cada 300 ms). La página lo guarda en el navegador y lo devuelve
 *    en `estadoPrevio.progreso` si el estudiante recarga a medias. Al completar, la página lo borra.
 *  - `interaccion(InteraccionActividad)`: cada acción del estudiante (tocar una capa, soltar una
 *    molécula, responder una pregunta...). La página la convierte en texto con `describirInteraccion`
 *    para `ContextoPedagogico.interaccionesRecientes` y, con `seleccionDeInteraccion`, actualiza
 *    `estructuraSeleccionada` y `moleculaSeleccionada`.
 *  - `completada(ResultadoActividad)`: UNA vez por ejecución, cuando el estudiante termina la parte
 *    puntuable de la actividad. La página lo envía a la API con `aPeticionResultadoApi` y marca la
 *    actividad como completada. En modo `revisar` no se emite nada.
 *
 * ── Orden de los eventos (NORMA: el `progreso` nunca llega después de `completada`) ──────────
 *  Un limitador de `progreso` que solo retrasa saca el último valor DESPUÉS de `completada`; la
 *  página lo guardaría y al recargar se restauraría un intento ya terminado. Por eso:
 *   1. El componente usa `crearEmisorProgreso` (`@/content/progreso`): emite a la primera y agrupa
 *      el resto; al emitir `completada` llama a `emisor.cerrar()` (cancela el pendiente y no emite
 *      más `progreso`), al empezar otro intento llama a `emisor.reabrir()` y al desmontar,
 *      a `emisor.vaciar()`.
 *   2. Defensa en la página: descarta un `progreso` cuyo `intentos` sea menor o igual al de la
 *      última `completada` de esa actividad (`esProgresoTardio`).
 *  La batería de conformidad lo comprueba con temporizadores simulados.
 *
 * ── Estado previo (`estadoPrevio`) ──────────────────────────────────────────────────────────
 *  `estadoPrevio.servidor` sale de `GET /api/activities/results`, que es asíncrono. La página NO
 *  monta la actividad hasta que esa respuesta llegue o falle (espera como máximo
 *  `ESPERA_ESTADO_PREVIO_MAX_MS`; pasado ese tiempo o si falla, monta con `servidor: undefined`).
 *  Aun así, el componente hace `watch` de `estadoPrevio` mientras el estudiante no haya hecho
 *  nada y recalcula `intentos` con `intentoInicial`: una respuesta tardía no debe puntuarse con la
 *  penalización equivocada. La batería lo comprueba con `setProps` tras el montaje.
 *
 * ── Cómo se calcula el resultado ────────────────────────────────────────────────────────────
 *  El componente calcula `precision` (0 a 1) y `intentos` y deja que el motor calcule el puntaje:
 *
 *      const precision = precisionPorConteo(aciertos, fallos);      // o precisionQuiz(...) / 1
 *      const puntaje = calcularPuntaje(props.actividad, { precision, intentos });
 *      emit('completada', { puntaje, intentos, precision, detalle });
 *
 *  Nunca inventa su propia fórmula (`@/content/scoring`, docs/content-schema.md "Puntaje").
 *  `intentos` es el número de esta ejecución: `intentoInicial(props.estadoPrevio)` al empezar y
 *  +1 cada vez que el estudiante repite la actividad completa.
 *
 *  `completada` significa "terminó una ejecución", no "aprobó". Si la actividad tiene
 *  `aprobacion_min`, el componente lo dice en su mensaje final ("necesitas 70 % de acierto para
 *  seguir; inténtalo de nuevo") y ofrece repetir; quien decide si la actividad cuenta como hecha
 *  para secciones y módulos es la página, con `idsSuperadas` (scoring.ts).
 *
 * ── Casos límite (deben comportarse igual en los seis componentes) ──────────────────────────
 *  - `identificar` (multicapa): las consignas se piden en el orden de `requeridas` (una por
 *    `pista` y `pistas_extra`). Cada toque sobre una capa de `capas` que NO es la pedida cuenta
 *    un fallo, y ese toque abre la ficha de la capa tocada (se aprende del error). Volver a tocar
 *    una capa ya acertada no cuenta. Tocar fuera de toda capa no cuenta. Por cada toque
 *    equivocado se emite `identifica_capa` (objeto = la capa PEDIDA, `incorrecta`) y además
 *    `selecciona_capa` con la tocada, para que el mentor sepa qué confundió con qué.
 *  - `relacion-columnas`: `relaciona_par` con objeto = el elemento de A que se intentaba unir
 *    (el elemento de B equivocado no llega al contexto, que solo lleva un objeto por interacción).
 *  - Barajado (`ordenar`, `barajar`, `barajar_opciones`): aleatorio pero estable en la ejecución, y
 *    NUNCA deja el orden correcto en una pregunta `ordenar`: si el azar lo produce, se vuelve a
 *    barajar. Con 3 pasos, 1 de cada 6 barajados regalaría la respuesta.
 *  - `arrastre-molecular`: ver "Arrastre" abajo.
 *  - Modo `revisar` (solo lectura): muestra las fichas y las RESPUESTAS CORRECTAS (nunca las
 *    respuestas del estudiante: la instantánea se borra al completar y el servidor no guarda el
 *    detalle). No puntúa ni emite eventos.
 *  - Preguntas de IA del quiz (`preguntas_ia`): son posteriores a la parte puntuable. `completada`
 *    se emite al terminar las preguntas del docente, y la práctica de IA no emite ni puntúa.
 *  - `aPeticionResultadoApi(..., { completada: false })` está reservado (hoy ningún evento del
 *    contrato lo genera): un intento abandonado no se envía.
 *
 * ── Arrastre (arrastre-molecular) ───────────────────────────────────────────────────────────
 *  - El receptor se elige por cercanía dentro de un radio de captura de al menos
 *    `RADIO_CAPTURA_MIN_PX` (56 px), no por intersección exacta con el dibujo.
 *  - Soltar fuera de todo radio devuelve la molécula a la bandeja SIN fallo ni `acopla_molecula`.
 *    Soltar sobre un receptor donde esa molécula ya está acoplada tampoco cuenta. Solo es un
 *    fallo acoplar una molécula sobre un receptor que no es el suyo (o un distractor sobre
 *    cualquiera).
 *  - `arrastra_molecula` se emite al empezar a arrastrar; `acopla_molecula` solo si hay un
 *    receptor candidato dentro del radio.
 *  - Un receptor puede aceptar varias moléculas (competencia, p. ej. Wnt frente a esclerostina
 *    en LRP5/6): muestra el efecto de la ÚLTIMA acoplada, y cada par cuenta como acierto una
 *    sola vez. El orden de las sueltas no cambia el resultado. Se completa cuando cada par se
 *    acopló al menos una vez.
 *  - Un distractor solo tiene su texto de `rechazo`; el componente nunca lo trata como error
 *    "silencioso".
 *
 * ── Multicapa: zonas táctiles (R2) ──────────────────────────────────────────────────────────
 *  La zona táctil de una capa NO es un rectángulo sobre su caja (taparía las capas interiores
 *  cuando son concéntricas). El componente, al inyectar el SVG, hace esto con cada capa, en la
 *  misma posición del orden de dibujo:
 *   a. Si la capa contiene un hijo `<g data-zona-toque>` (o un `<path>` con id `{capa}_toque`),
 *      ese es el objetivo táctil (relleno transparente) y sustituye a lo siguiente.
 *   b. Si no, clona cada forma visible como transparente: con relleno, `pointer-events="all"`;
 *      sin relleno (solo contorno), `stroke="transparent"`, `pointer-events="stroke"` y un
 *      `stroke-width` de `max(original, 44 / escala)`, donde `escala` = px por unidad de viewBox.
 *  Sin esto, un contorno de 16 unidades en un viewBox de 800 mide 7 px en el teléfono y no se toca.
 *  Antes de inyectar, el componente elimina cualquier atributo `on*` y reescribe con un prefijo
 *  `{actividad.id}__` los ids que aparecen en `url(#..)` y `href="#.."` (y esas referencias):
 *  así el mismo dibujo puede estar dos veces en la página sin colisiones. Las capas se buscan
 *  dentro del propio SVG, antes de reescribir. `resaltadas` se marca con un contorno más grueso,
 *  no solo con color.
 *
 * ── video-texto ─────────────────────────────────────────────────────────────────────────────
 *  - Animación: `visibles` y `resaltadas` controlan exclusivamente los `<g id>` HIJOS DIRECTOS de la
 *    raíz `<svg>` (lo comprueba la auditoría); cada paso muestra únicamente los grupos listados.
 *  - Video: `visto` es la suma de las duraciones de `video.played` dividida por la duración REAL
 *    del elemento (`video.duration`, no `config.duracion_seg`), no la posición máxima: saltar con la
 *    barra no suma. Se completa al llegar a `UMBRAL_VIDEO_VISTO` o con el botón "Ya leí la
 *    transcripción" (`detalle.via = 'transcripcion'`), para quien no puede o no quiere ver el
 *    video. `preload="none"`, `playsinline`, sin autoplay y pista de subtítulos por defecto en `es`.
 *
 * ── exploracion-3d ──────────────────────────────────────────────────────────────────────────
 *  - La lista de nodos (botones) funciona SIEMPRE, marca visitado y permite completar la
 *    actividad aunque el lienzo esté en estado de error (sin WebGL 2, GLB con 404, contexto
 *    perdido). Una exploración puede ser obligatoria y un fallo del 3D no puede bloquear el módulo.
 *  - Un nodo con `ancla` se coloca en ese punto de la caja envolvente del modelo (`AnclaNodo`); uno
 *    sin `ancla` se busca por nombre en el GLB. Si falta en el GLB, la ficha se muestra y la cámara
 *    vuelve al encuadre general, sin bloquear.
 *  - Encuadre por nodo: la cámara se acerca al nodo (o al ancla) con la vista y el zoom del
 *    contenido; para ello la escena necesita un objetivo animable y una distancia mínima relativa
 *    al tamaño del nodo, no al del modelo entero (F2-05/F2-06).
 *
 * ── Instantánea (`progreso.instantanea`) ────────────────────────────────────────────────────
 *  Máximo `INSTANTANEA_MAX_BYTES`. Recomendación para que quepa siempre: guardar una `semilla`
 *  numérica y derivar de ella el barajado de forma determinista, y las respuestas como índices y
 *  no como ids. Si aun así se pasa del tope, se recortan las respuestas más antiguas: nunca se
 *  descarta el evento entero.
 *
 * ── Reglas de accesibilidad (obligatorias, las revisa F6-01) ─────────────────────────────────
 *  R1. Todo lo que se hace arrastrando o tocando tiene alternativa de TECLADO y de LECTOR DE
 *      PANTALLA: arrastrar una molécula = elegirla (Enter o Espacio) y elegir el receptor con las
 *      flechas o Tab; tocar una capa del SVG o un nodo 3D = una lista de botones con el mismo
 *      resultado. La alternativa no es un modo aparte: es la misma actividad, siempre disponible.
 *  R2. Objetivos táctiles de al menos 44 x 44 px CSS (`TAMANO_TACTIL_MIN_PX`), también en SVG
 *      (ver "Multicapa: zonas táctiles"). Separados al menos 8 px.
 *  R3. `prefers-reduced-motion: reduce`: sin giro automático, sin rebotes ni partículas; las
 *      transiciones pasan a ser instantáneas o de opacidad. La información nunca depende de una
 *      animación: cada efecto animado tiene su texto (`efecto.descripcion`, `paso.texto`...).
 *  R4. Los resultados y los avisos (acierto, error, actividad completada) se anuncian en una
 *      región `aria-live="polite"` y no dependen solo del color: llevan icono y texto.
 *  R5. Contraste mínimo de 4,5:1 en texto y de 3:1 en bordes y estados, en claro y en oscuro
 *      (usar los tokens de `src/style.css`, no colores fijos).
 *  R6. Gestión del foco: tras un error el foco se queda donde estaba; al completar pasa al
 *      encabezado del resultado. Nada roba el foco al cargar. El foco siempre es visible.
 *  R7. Cada zona interactiva tiene nombre accesible tomado del contenido (`etiqueta`, `alt`,
 *      `titulo`). Las imágenes decorativas llevan `aria-hidden`. El SVG multicapa se expone como
 *      `role="group"` con `aria-label = config.alt`.
 *  R8. `touch-action: none` solo en la pieza que se arrastra, nunca en toda la pantalla: el
 *      estudiante debe poder desplazar la página con el dedo.
 *  R9. Sin límites de tiempo. Estados de carga y de error visibles (SVG, GLB, video).
 *  R10. Todo el texto de la interfaz, en español, y el contenido tal cual viene del JSON (sin
 *      HTML). Los textos con Markdown restringido (`descripcion`, `explicacion`, `instrucciones`,
 *      opciones, pistas...) se muestran SIEMPRE con `renderizarLinea` o `renderizarBloque` de
 *      `@/content/markdown` (markdown-it `html: false` más lista blanca de etiquetas), nunca con
 *      `v-html` sobre el texto crudo. Para `aria-label` y anuncios: `textoPlanoDeMarkdown`.
 *      Los enlaces `data-glosario` se interceptan para abrir la definición del glosario.
 *
 * ── Otras reglas del contrato ───────────────────────────────────────────────────────────────
 *  - Cada componente pasa la batería de conformidad `pruebasDeContratoActividad` de
 *    `@/content/__fixtures__/contrato` en su propio archivo de pruebas (ver su cabecera): eventos
 *    con la forma correcta, puntaje de la fórmula común, intentos (también con un estado previo
 *    tardío), instantánea corrupta, orden de eventos y `revisar`.
 *  - En `defineProps` y `defineEmits` se usan los interfaces concretos de cada tipo
 *    (`PropsActividadQuiz`, `EmitsActividadQuiz`...), no el genérico `PropsActividad<T>`.
 *  - La configuración se trata como solo lectura; el estado del estudiante es local al componente.
 *  - `estadoPrevio.progreso.instantanea` puede estar corrupta o ser de una versión anterior del
 *    contenido (ids que ya no existen): se valida contra `actividad` y lo inválido se ignora.
 *  - Al desmontar: cancelar tweens de GSAP, escuchas y, en 3D, liberar geometrías y el contexto WebGL.
 *  - Los recursos pesados (GSAP, TresJS) se cargan de forma perezosa dentro del componente.
 */
import type { NumeroModulo } from '@/data/modulos';
import {
  API_DETALLE_MAX_BYTES,
  API_PUNTAJE_MAX,
  PROGRESO_INTERVALO_MIN_MS,
} from '@/content/constantes';
import { intentosParaApi } from '@/content/scoring';
import type {
  Actividad,
  ActividadArrastreMolecular,
  ActividadExploracion3d,
  ActividadMulticapa,
  ActividadQuiz,
  ActividadRelacionColumnas,
  ActividadVideoTexto,
  TipoActividad,
} from '@/content/schema';

export type { TipoActividad };
export { PROGRESO_INTERVALO_MIN_MS };

/** Tamaño mínimo de un objetivo táctil, en píxeles CSS (regla R2). */
export const TAMANO_TACTIL_MIN_PX = 44;

/** Fracción del video que hay que ver para darlo por visto (video-texto, medio "video"). */
export const UMBRAL_VIDEO_VISTO = 0.9;

/** Tamaño máximo de la instantánea de un intento a medias, en bytes serializados. */
export const INSTANTANEA_MAX_BYTES = 8 * 1024;

/** Radio de captura mínimo de un receptor al soltar una molécula, en píxeles CSS. */
export const RADIO_CAPTURA_MIN_PX = 56;

/** Espera máxima de la página por el estado del servidor antes de montar una actividad, en ms. */
export const ESPERA_ESTADO_PREVIO_MAX_MS = 3000;

/* -------------------------------------------------------------------------------------------
 * JSON
 * ----------------------------------------------------------------------------------------- */

export type JsonPrimitivo = string | number | boolean | null;
export type JsonValor = JsonPrimitivo | JsonValor[] | { [clave: string]: JsonValor };
export type JsonObjeto = { [clave: string]: JsonValor };

/* -------------------------------------------------------------------------------------------
 * Entradas
 * ----------------------------------------------------------------------------------------- */

/** `jugar`: la actividad se resuelve y puntúa. `revisar`: solo lectura, sin eventos. */
export type ModoActividad = 'jugar' | 'revisar';

/**
 * Estado de un intento a medias. `instantanea` es opaca para la página y cada componente define
 * su forma (por ejemplo, capas visitadas, preguntas respondidas, orden barajado). Máximo
 * `INSTANTANEA_MAX_BYTES`.
 */
export interface ProgresoActividad {
  /** Fracción del recorrido de esta ejecución (0 a 1), para barras de avance. */
  avance: number;
  /** Número de esta ejecución (1 el primer intento). */
  intentos: number;
  instantanea: JsonObjeto;
}

/** Mejor resultado guardado en el servidor para esta actividad (GET /api/activities/results). */
export interface ResultadoGuardadoActividad {
  /** Mejor puntaje entre los intentos completados. */
  puntaje: number;
  /** Mayor número de intento reportado hasta ahora (no la cuenta de filas). */
  intentos: number;
  completada: boolean;
  /**
   * Mejor precisión (0 a 1) entre los intentos completados, para `aprobacion_min`. Opcional
   * mientras el servidor no la devuelva (docs/content-schema.md, sección 14).
   */
  precision?: number;
}

export interface EstadoPrevioActividad {
  servidor?: ResultadoGuardadoActividad;
  /** Última instantánea emitida por `progreso` y que la página guardó en el navegador. */
  progreso?: ProgresoActividad;
}

/** Props comunes a los seis componentes. */
export interface PropsActividadBase {
  /** Número del módulo al que pertenece (1 a 6). */
  modulo: NumeroModulo;
  /** Por defecto `jugar`. */
  modo?: ModoActividad;
  estadoPrevio?: EstadoPrevioActividad;
}

/*
 * Un interface concreto por tipo (y no un genérico) porque el compilador de `<script setup>`
 * de Vue resuelve `defineProps<...>()` y `defineEmits<...>()` de forma estática y no expande
 * genéricos. Ver la prueba contrato-actividades.test.ts, que lo comprueba con un componente real.
 */
export interface PropsActividadMulticapa extends PropsActividadBase {
  actividad: ActividadMulticapa;
}
export interface PropsActividadArrastreMolecular extends PropsActividadBase {
  actividad: ActividadArrastreMolecular;
}
export interface PropsActividadRelacionColumnas extends PropsActividadBase {
  actividad: ActividadRelacionColumnas;
}
export interface PropsActividadQuiz extends PropsActividadBase {
  actividad: ActividadQuiz;
}
export interface PropsActividadVideoTexto extends PropsActividadBase {
  actividad: ActividadVideoTexto;
}
export interface PropsActividadExploracion3d extends PropsActividadBase {
  actividad: ActividadExploracion3d;
}

export interface PropsPorTipo {
  multicapa: PropsActividadMulticapa;
  'arrastre-molecular': PropsActividadArrastreMolecular;
  'relacion-columnas': PropsActividadRelacionColumnas;
  quiz: PropsActividadQuiz;
  'video-texto': PropsActividadVideoTexto;
  'exploracion-3d': PropsActividadExploracion3d;
}

export type PropsActividad<T extends TipoActividad> = PropsPorTipo[T];

/**
 * Número de la ejecución con la que empieza el componente. Es el mayor entre el intento a medias
 * (`progreso.intentos`, que puede venir de una instantánea local vieja) y el siguiente a los que
 * el servidor ya registró (0 registrados = intento 1): una instantánea local no puede esquivar la
 * penalización si el servidor ya tiene más intentos, y si el intento a medias es posterior a lo
 * que sabe el servidor, se conserva.
 */
export function intentoInicial(estadoPrevio: EstadoPrevioActividad | undefined): number {
  const enCurso = estadoPrevio?.progreso?.intentos;
  const delProgreso = enCurso !== undefined && Number.isFinite(enCurso) ? Math.floor(enCurso) : 0;
  const registrados = estadoPrevio?.servidor?.intentos ?? 0;
  const delServidor = (Number.isFinite(registrados) ? Math.max(0, Math.floor(registrados)) : 0) + 1;
  return Math.max(1, delProgreso, delServidor);
}

/**
 * ¿Debe la página descartar este `progreso`? Sí si es de un intento que ya se completó (llegó
 * tarde: `intentos` menor o igual al de la última `completada` de esa actividad). Es la defensa de
 * la página frente a un componente que no cierre bien su emisor (ver "Orden de los eventos").
 */
export function esProgresoTardio(
  progreso: Pick<ProgresoActividad, 'intentos'>,
  intentosUltimaCompletada: number | undefined,
): boolean {
  return intentosUltimaCompletada !== undefined && progreso.intentos <= intentosUltimaCompletada;
}

/* -------------------------------------------------------------------------------------------
 * Interacciones (alimentan ContextoPedagogico.interaccionesRecientes)
 * ----------------------------------------------------------------------------------------- */

/**
 * Vocabulario cerrado de acciones. Cada una tiene un `objeto` (el id del elemento) y,
 * si tiene sentido, un `resultado`:
 *  - `selecciona_capa`, `identifica_capa` (multicapa; `identifica` lleva resultado; en un error,
 *    `identifica_capa` lleva la capa PEDIDA y va seguida de `selecciona_capa` con la tocada)
 *  - `selecciona_nodo`, `identifica_nodo` (exploracion-3d; `identifica_nodo` solo en modo identificar, con
 *    resultado y la misma regla que `identifica_capa` en un error)
 *  - `arrastra_molecula` (objeto = molécula), `acopla_molecula` (objeto = molécula, con resultado)
 *  - `relaciona_par` (relacion-columnas; objeto = id del elemento de A, con resultado)
 *  - `responde_pregunta` (quiz; objeto = id de la pregunta, con resultado)
 *  - `avanza_paso` (video-texto animación; objeto = id del paso)
 *  - `reproduce_video` (video-texto video)
 *  - `reinicia_actividad` (el estudiante empieza otro intento)
 */
export const ACCIONES_INTERACCION = [
  'selecciona_capa',
  'identifica_capa',
  'selecciona_nodo',
  'identifica_nodo',
  'arrastra_molecula',
  'acopla_molecula',
  'relaciona_par',
  'responde_pregunta',
  'avanza_paso',
  'reproduce_video',
  'reinicia_actividad',
] as const;
export type AccionInteraccion = (typeof ACCIONES_INTERACCION)[number];

export interface InteraccionActividad {
  accion: AccionInteraccion;
  /** Id del elemento sobre el que se actuó (capa, nodo, molécula, pregunta, paso...). */
  objeto?: string;
  resultado?: 'correcta' | 'incorrecta';
}

/** Longitud máxima de una interacción como texto (el contrato limita las cadenas a 64). */
const MAX_LONGITUD_INTERACCION = 64;

/**
 * Texto de la interacción para `interaccionesRecientes`: `accion[:objeto][:resultado]`, por
 * ejemplo `responde_pregunta:m1_p3:incorrecta`. Nunca pasa de 64 caracteres: si hace falta se
 * recorta el objeto, no la acción ni el resultado.
 */
export function describirInteraccion(interaccion: InteraccionActividad): string {
  const sufijo = interaccion.resultado ? `:${interaccion.resultado}` : '';
  const presupuesto = MAX_LONGITUD_INTERACCION - interaccion.accion.length - sufijo.length - 1;
  // `String()` por si un componente escrito sin tipos manda un número: nunca debe romper el chat.
  const objeto =
    interaccion.objeto !== undefined && presupuesto > 0
      ? `:${[...String(interaccion.objeto)].slice(0, presupuesto).join('')}`
      : '';
  return `${interaccion.accion}${objeto}${sufijo}`;
}

/**
 * Qué selecciona una interacción en el contexto pedagógico, o `null` si no cambia la selección:
 * tocar una capa o un nodo fija `estructuraSeleccionada`; arrastrar o acoplar una molécula fija
 * `moleculaSeleccionada`. Es lo que el mentor usa para "Explícame esto".
 */
export function seleccionDeInteraccion(
  interaccion: InteraccionActividad,
): { estructura?: string; molecula?: string } | null {
  if (interaccion.objeto === undefined) return null;
  switch (interaccion.accion) {
    case 'selecciona_capa':
    case 'identifica_capa':
    case 'selecciona_nodo':
    case 'identifica_nodo':
      return { estructura: interaccion.objeto };
    case 'arrastra_molecula':
    case 'acopla_molecula':
      return { molecula: interaccion.objeto };
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------------------------
 * Resultado
 * ----------------------------------------------------------------------------------------- */

/*
 * Forma recomendada del `detalle` por tipo. Son alias (`type`), no interfaces, para que encajen
 * en `JsonObjeto`. Alimentan las estadísticas del docente ("actividades más falladas", F6-03),
 * así que las claves son las mismas en los seis módulos. Los conteos son enteros y las listas
 * de ids no repiten elementos; con 12 capas o 20 preguntas caben de sobra en 4 KB.
 */
export type DetalleMulticapa = {
  modo: 'explorar' | 'identificar';
  /** Ids de las capas visitadas (modo explorar). */
  visitadas?: string[];
  /** Toques correctos e incorrectos, uno por consigna (modo identificar). */
  aciertos?: number;
  errores?: number;
  /** Errores por id de la capa que se pedía encontrar (modo identificar). */
  errores_por_capa?: Record<string, number>;
};
export type DetalleArrastreMolecular = {
  acoples_correctos: number;
  errores: number;
  /** Errores por id de molécula (solo acoples contra un receptor libre equivocado). */
  errores_por_molecula: Record<string, number>;
};
export type DetalleRelacionColumnas = {
  aciertos: number;
  errores: number;
  /** Errores por id del par correcto que se intentaba formar. */
  errores_por_par: Record<string, number>;
};
export type DetalleQuiz = {
  /** Precisión (0 a 1, con dos decimales) por id de pregunta. */
  preguntas: Record<string, number>;
};
export type DetalleVideoTexto = {
  medio: 'animacion' | 'video';
  /** Pasos vistos (animación). */
  pasos_vistos?: number;
  /** Fracción vista del video, 0 a 1 con dos decimales (video): suma de `played`, no posición. */
  visto?: number;
  /** Cómo se completó (video): viéndolo o con el botón "Ya leí la transcripción". */
  via?: 'video' | 'transcripcion';
};
export type DetalleExploracion3d = {
  /** Ids de los nodos visitados (con `ancla` o por pieza); en modo identificar, los identificados. */
  visitados: string[];
  /** Solo en modo identificar (`config.modo`). */
  modo?: 'identificar';
  /** Consignas resueltas (todas, al completar). */
  aciertos?: number;
  /** Fallos totales. */
  errores?: number;
  /** Fallos por id del nodo que se pedía. */
  errores_por_nodo?: Record<string, number>;
};

export interface DetallePorTipo {
  multicapa: DetalleMulticapa;
  'arrastre-molecular': DetalleArrastreMolecular;
  'relacion-columnas': DetalleRelacionColumnas;
  quiz: DetalleQuiz;
  'video-texto': DetalleVideoTexto;
  'exploracion-3d': DetalleExploracion3d;
}

/** Lo que emite `completada`. El puntaje se calcula con `calcularPuntaje` (scoring.ts). */
export interface ResultadoActividad<T extends TipoActividad = TipoActividad> {
  /** Entero entre 0 y `puntaje_max`. */
  puntaje: number;
  /** Número de esta ejecución (>= 1). */
  intentos: number;
  /** Fracción de acierto de la ejecución que completó la actividad (0 a 1). */
  precision: number;
  detalle: DetallePorTipo[T];
}

/** Un interface de eventos por tipo, por la misma razón que las props (ver arriba). */
export interface EmitsActividadMulticapa {
  (e: 'progreso', progreso: ProgresoActividad): void;
  (e: 'interaccion', interaccion: InteraccionActividad): void;
  (e: 'completada', resultado: ResultadoActividad<'multicapa'>): void;
}
export interface EmitsActividadArrastreMolecular {
  (e: 'progreso', progreso: ProgresoActividad): void;
  (e: 'interaccion', interaccion: InteraccionActividad): void;
  (e: 'completada', resultado: ResultadoActividad<'arrastre-molecular'>): void;
}
export interface EmitsActividadRelacionColumnas {
  (e: 'progreso', progreso: ProgresoActividad): void;
  (e: 'interaccion', interaccion: InteraccionActividad): void;
  (e: 'completada', resultado: ResultadoActividad<'relacion-columnas'>): void;
}
export interface EmitsActividadQuiz {
  (e: 'progreso', progreso: ProgresoActividad): void;
  (e: 'interaccion', interaccion: InteraccionActividad): void;
  (e: 'completada', resultado: ResultadoActividad<'quiz'>): void;
}
export interface EmitsActividadVideoTexto {
  (e: 'progreso', progreso: ProgresoActividad): void;
  (e: 'interaccion', interaccion: InteraccionActividad): void;
  (e: 'completada', resultado: ResultadoActividad<'video-texto'>): void;
}
export interface EmitsActividadExploracion3d {
  (e: 'progreso', progreso: ProgresoActividad): void;
  (e: 'interaccion', interaccion: InteraccionActividad): void;
  (e: 'completada', resultado: ResultadoActividad<'exploracion-3d'>): void;
}

/* -------------------------------------------------------------------------------------------
 * Mapeo exacto de ResultadoActividad al cuerpo de POST /api/activities/{id}/result
 * ----------------------------------------------------------------------------------------- */

/** Cuerpo de `POST /api/activities/{activity_id}/result` (docs/api-contract.md). */
export interface CuerpoResultadoApi {
  /** 1 a 6. */
  modulo: number;
  tipo: TipoActividad;
  /** Entero 0..1000. */
  puntaje: number;
  /** Entero 1..100. */
  intentos: number;
  completada: boolean;
  /** Objeto de hasta 4 KB serializado. */
  detalle?: JsonObjeto;
}

export interface PeticionResultadoApi {
  /** Ruta relativa a `API_BASE` (lo que se pasa a `apiFetch`): `/activities/{id}/result`. */
  ruta: string;
  cuerpo: CuerpoResultadoApi;
}

function acotarEntero(valor: number, min: number, max: number): number {
  if (Number.isNaN(valor)) return min;
  return Math.min(max, Math.max(min, Math.round(valor)));
}

function bytesDe(valor: unknown): number {
  return new TextEncoder().encode(JSON.stringify(valor)).length;
}

/**
 * `detalle` que viaja a la API: el del componente más `precision` (con cuatro decimales, que
 * la API no tiene como campo propio). Se pasa por JSON para quitar `undefined` y funciones. Si
 * supera 4 KB, que la API rechazaría con 422 y perdería el puntaje, se sustituye por
 * `{ precision, truncado: true }`.
 */
export function detalleParaApi(precision: number, detalle: JsonObjeto | undefined): JsonObjeto {
  const p = Number.isNaN(precision)
    ? 0
    : Math.round(Math.min(1, Math.max(0, precision)) * 1e4) / 1e4;
  const reducido: JsonObjeto = { precision: p, truncado: true };
  try {
    const limpio = JSON.parse(JSON.stringify(detalle ?? {})) as JsonObjeto;
    const completo: JsonObjeto = { ...limpio, precision: p };
    return bytesDe(completo) > API_DETALLE_MAX_BYTES ? reducido : completo;
  } catch {
    return reducido;
  }
}

/**
 * Convierte el resultado de una actividad en la petición a la API:
 *  - `ruta`: `/activities/{actividad.id}/result`.
 *  - `modulo`: el número del módulo; `tipo`: `actividad.tipo`.
 *  - `puntaje`: entero entre 0 y `min(puntaje_max, 1000)`.
 *  - `intentos`: entero entre 1 y 100.
 *  - `completada`: `true` salvo que se indique otra cosa (un resultado a medias no puntúa en el
 *    servidor: `puntaje_total` solo suma intentos completados).
 *  - `detalle`: ver `detalleParaApi`.
 */
export function aPeticionResultadoApi(
  actividad: Pick<Actividad, 'id' | 'tipo' | 'puntaje_max'>,
  modulo: NumeroModulo,
  resultado: ResultadoActividad,
  opciones: { completada?: boolean } = {},
): PeticionResultadoApi {
  const tope = Math.min(API_PUNTAJE_MAX, Math.max(0, actividad.puntaje_max));
  return {
    ruta: `/activities/${encodeURIComponent(actividad.id)}/result`,
    cuerpo: {
      modulo,
      tipo: actividad.tipo,
      puntaje: acotarEntero(resultado.puntaje, 0, tope),
      intentos: intentosParaApi(resultado.intentos),
      completada: opciones.completada ?? true,
      detalle: detalleParaApi(resultado.precision, resultado.detalle as JsonObjeto),
    },
  };
}
