/**
 * Consultas puras sobre un módulo ya validado (o sobre uno que zod está validando): recorridos
 * de ids, recursos y textos, y búsquedas de actividades. Las usan el esquema (schema.ts), el
 * puntaje y el bloqueo (scoring.ts), la auditoría de recursos (svg.ts) y, más adelante, el
 * mentor (índice de estructuras y moléculas para "Explícame esto").
 *
 * Solo importa TIPOS de schema.ts (los tipos se borran al compilar), así que no hay ciclo real
 * aunque schema.ts importe funciones de este archivo.
 */
import type { Actividad, Bloque, BloqueActividad, Seccion, TipoActividad } from './schema';

export type RutaJson = (string | number)[];

/** Cualquier cosa que tenga secciones: el módulo completo o un trozo (útil en pruebas). */
export interface ConSecciones {
  secciones: readonly Seccion[];
}

/**
 * ¿Se muestra el bloque a un estudiante de ese nivel? Un bloque sin `nivel` es para todos; el
 * de `nivel: 'posgrado'` (profundización) solo se muestra a quien es de posgrado. Las actividades
 * siempre se muestran: la profundización va en bloques de lectura.
 */
export function visibleParaNivel(bloque: Bloque, nivel: 'pregrado' | 'posgrado'): boolean {
  if (bloque.tipo === 'actividad') return true;
  return bloque.nivel === undefined || nivel === 'posgrado';
}

export function esBloqueActividad(bloque: Bloque): bloque is BloqueActividad {
  return bloque.tipo === 'actividad';
}

/** Id de cualquier bloque: el suyo o, si es una actividad, el de la actividad (`v-for :key`, anclas). */
export function idDeBloque(bloque: Bloque): string {
  return bloque.tipo === 'actividad' ? bloque.actividad.id : bloque.id;
}

export interface ActividadUbicada {
  actividad: Actividad;
  seccion: Seccion;
  indiceSeccion: number;
  indiceBloque: number;
}

/** Todas las actividades del módulo en el orden en que aparecen. */
export function listarActividades(modulo: ConSecciones): ActividadUbicada[] {
  const resultado: ActividadUbicada[] = [];
  modulo.secciones.forEach((seccion, indiceSeccion) => {
    seccion.bloques.forEach((bloque, indiceBloque) => {
      if (bloque.tipo === 'actividad') {
        resultado.push({ actividad: bloque.actividad, seccion, indiceSeccion, indiceBloque });
      }
    });
  });
  return resultado;
}

export function listarActividadesObligatorias(modulo: ConSecciones): ActividadUbicada[] {
  return listarActividades(modulo).filter((u) => u.actividad.obligatoria);
}

export function buscarActividad(modulo: ConSecciones, id: string): ActividadUbicada | undefined {
  return listarActividades(modulo).find((u) => u.actividad.id === id);
}

export function contarActividadesPorTipo(modulo: ConSecciones): Record<TipoActividad, number> {
  const cuenta: Record<TipoActividad, number> = {
    multicapa: 0,
    'arrastre-molecular': 0,
    'relacion-columnas': 0,
    quiz: 0,
    'video-texto': 0,
    'exploracion-3d': 0,
  };
  for (const { actividad } of listarActividades(modulo)) cuenta[actividad.tipo]++;
  return cuenta;
}

/* -------------------------------------------------------------------------------------------
 * Ids
 * ----------------------------------------------------------------------------------------- */

export type TipoId =
  | 'seccion'
  | 'bloque'
  | 'actividad'
  | 'capa'
  | 'nodo'
  | 'opcion'
  | 'par'
  | 'pregunta'
  | 'molecula'
  | 'receptor'
  | 'elemento'
  | 'paso';

/**
 * Alcance de unicidad de un id (docs/content-schema.md, sección 3):
 *  - `modulo`: sección, bloque, actividad, capa, molécula y pregunta. No se repiten en el módulo,
 *    porque llegan tal cual al mentor (`estructuraSeleccionada`, `moleculaSeleccionada`,
 *    `interaccionesRecientes`) y deben decir a qué se refieren.
 *  - `actividad`: nodo 3D, opción, par, receptor, elemento de columna y paso. Solo deben ser
 *    únicos dentro de su actividad; dos actividades pueden usar el mismo (`cuerpo`, `par_1`...).
 */
export type AlcanceId = 'modulo' | 'actividad';

const ALCANCE_POR_TIPO: Readonly<Record<TipoId, AlcanceId>> = {
  seccion: 'modulo',
  bloque: 'modulo',
  actividad: 'modulo',
  capa: 'modulo',
  molecula: 'modulo',
  pregunta: 'modulo',
  nodo: 'actividad',
  opcion: 'actividad',
  par: 'actividad',
  receptor: 'actividad',
  elemento: 'actividad',
  paso: 'actividad',
};

export function alcanceDeId(tipo: TipoId): AlcanceId {
  return ALCANCE_POR_TIPO[tipo];
}

export interface EntradaId {
  id: string;
  tipo: TipoId;
  /** Ruta JSON del campo `id` (para que los errores de zod apunten al lugar exacto). */
  ruta: RutaJson;
  /** Id de la actividad que contiene el elemento (`undefined` en secciones y bloques). */
  actividadId?: string;
}

/**
 * Todos los ids del módulo con su tipo y su actividad. El esquema exige unicidad según
 * `alcanceDeId`: en el módulo entero para sección, bloque, actividad, capa, molécula y pregunta,
 * y solo dentro de la actividad para nodo, opción, par, receptor, elemento y paso. Quedan fuera
 * los ids del glosario y de las referencias, que tienen su propio espacio (un término del
 * glosario puede llamarse igual que la capa que lo ilustra).
 */
export function recolectarIds(modulo: ConSecciones): EntradaId[] {
  const ids: EntradaId[] = [];
  let actividadActual: string | undefined;
  const agregar = (id: string, tipo: TipoId, base: RutaJson): void => {
    ids.push({ id, tipo, ruta: [...base, 'id'], actividadId: actividadActual });
  };

  modulo.secciones.forEach((seccion, s) => {
    const rutaSeccion: RutaJson = ['secciones', s];
    actividadActual = undefined;
    agregar(seccion.id, 'seccion', rutaSeccion);
    seccion.bloques.forEach((bloque, b) => {
      const rutaBloque: RutaJson = [...rutaSeccion, 'bloques', b];
      actividadActual = undefined;
      if (bloque.tipo !== 'actividad') {
        agregar(bloque.id, 'bloque', rutaBloque);
        return;
      }
      const a = bloque.actividad;
      const rutaActividad: RutaJson = [...rutaBloque, 'actividad'];
      const rutaConfig: RutaJson = [...rutaActividad, 'config'];
      actividadActual = a.id;
      agregar(a.id, 'actividad', rutaActividad);
      switch (a.tipo) {
        case 'multicapa':
          a.config.capas.forEach((x, i) => agregar(x.id, 'capa', [...rutaConfig, 'capas', i]));
          break;
        case 'arrastre-molecular':
          a.config.moleculas.forEach((x, i) =>
            agregar(x.id, 'molecula', [...rutaConfig, 'moleculas', i]),
          );
          a.config.receptores.forEach((x, i) =>
            agregar(x.id, 'receptor', [...rutaConfig, 'receptores', i]),
          );
          a.config.pares.forEach((x, i) => agregar(x.id, 'par', [...rutaConfig, 'pares', i]));
          break;
        case 'relacion-columnas':
          a.config.columna_a.elementos.forEach((x, i) =>
            agregar(x.id, 'elemento', [...rutaConfig, 'columna_a', 'elementos', i]),
          );
          a.config.columna_b.elementos.forEach((x, i) =>
            agregar(x.id, 'elemento', [...rutaConfig, 'columna_b', 'elementos', i]),
          );
          a.config.pares.forEach((x, i) => agregar(x.id, 'par', [...rutaConfig, 'pares', i]));
          break;
        case 'quiz':
          a.config.preguntas.forEach((p, i) => {
            const rutaPregunta: RutaJson = [...rutaConfig, 'preguntas', i];
            agregar(p.id, 'pregunta', rutaPregunta);
            if (p.formato === 'opcion_multiple') {
              p.opciones.forEach((o, j) =>
                agregar(o.id, 'opcion', [...rutaPregunta, 'opciones', j]),
              );
            } else if (p.formato === 'ordenar') {
              p.pasos.forEach((o, j) => agregar(o.id, 'paso', [...rutaPregunta, 'pasos', j]));
            }
          });
          break;
        case 'video-texto':
          if (a.config.medio === 'animacion') {
            a.config.pasos.forEach((x, i) => agregar(x.id, 'paso', [...rutaConfig, 'pasos', i]));
          }
          break;
        case 'exploracion-3d':
          a.config.nodos.forEach((x, i) => agregar(x.id, 'nodo', [...rutaConfig, 'nodos', i]));
          // Escena procedural: sus partes son los pasos de la línea de tiempo.
          a.config.linea_de_tiempo?.pasos.forEach((x, i) =>
            agregar(x.id, 'paso', [...rutaConfig, 'linea_de_tiempo', 'pasos', i]),
          );
          break;
      }
    });
  });
  return ids;
}

/* -------------------------------------------------------------------------------------------
 * Recursos (SVG, imágenes, video y subtítulos)
 * ----------------------------------------------------------------------------------------- */

/**
 *  - `svg_inline`: SVG que la actividad inyecta en la página y manipula por id.
 *  - `imagen`: se muestra con `<img>` (puede ser SVG, pero aislado: sus ids no tocan la página).
 *  - `video` y `subtitulo`: archivos del video del docente.
 */
export type TipoRecurso = 'svg_inline' | 'imagen' | 'video' | 'subtitulo';

export interface RecursoReferenciado {
  /** Ruta pública, como aparece en content.json (`/images/m1/hueso_capas.svg`). */
  ruta: string;
  tipo: TipoRecurso;
  /** Ruta JSON del campo que contiene la ruta. */
  jsonPath: RutaJson;
  /** Id de la actividad o del bloque que lo usa. */
  usadoPor: string;
}

/** Todos los archivos de `public/` que el módulo referencia. */
export function recolectarRecursos(modulo: ConSecciones): RecursoReferenciado[] {
  const recursos: RecursoReferenciado[] = [];
  const agregar = (ruta: string, tipo: TipoRecurso, jsonPath: RutaJson, usadoPor: string): void => {
    recursos.push({ ruta, tipo, jsonPath, usadoPor });
  };
  modulo.secciones.forEach((seccion, s) => {
    seccion.bloques.forEach((bloque, b) => {
      const rutaBloque: RutaJson = ['secciones', s, 'bloques', b];
      if (bloque.tipo === 'imagen') {
        agregar(bloque.src, 'imagen', [...rutaBloque, 'src'], bloque.id);
        return;
      }
      if (bloque.tipo !== 'actividad') return;
      const a = bloque.actividad;
      const rutaConfig: RutaJson = [...rutaBloque, 'actividad', 'config'];
      if (a.tipo === 'multicapa') {
        agregar(a.config.svg, 'svg_inline', [...rutaConfig, 'svg'], a.id);
      } else if (a.tipo === 'arrastre-molecular' && a.config.escena.fondo_svg) {
        agregar(
          a.config.escena.fondo_svg,
          'svg_inline',
          [...rutaConfig, 'escena', 'fondo_svg'],
          a.id,
        );
      } else if (a.tipo === 'video-texto') {
        if (a.config.medio === 'animacion') {
          agregar(a.config.svg, 'svg_inline', [...rutaConfig, 'svg'], a.id);
        } else {
          agregar(a.config.src, 'video', [...rutaConfig, 'src'], a.id);
          if (a.config.poster) agregar(a.config.poster, 'imagen', [...rutaConfig, 'poster'], a.id);
          a.config.subtitulos.forEach((t, i) =>
            agregar(t.src, 'subtitulo', [...rutaConfig, 'subtitulos', i, 'src'], a.id),
          );
        }
      }
    });
  });
  return recursos;
}

/* -------------------------------------------------------------------------------------------
 * Recorridos genéricos
 * ----------------------------------------------------------------------------------------- */

/** Llama a `visitar` con cada cadena del valor (a cualquier profundidad) y su ruta JSON. */
export function recorrerCadenas(
  valor: unknown,
  ruta: RutaJson,
  visitar: (texto: string, ruta: RutaJson) => void,
): void {
  if (typeof valor === 'string') {
    visitar(valor, ruta);
  } else if (Array.isArray(valor)) {
    valor.forEach((elemento, i) => recorrerCadenas(elemento, [...ruta, i], visitar));
  } else if (typeof valor === 'object' && valor !== null) {
    for (const [clave, elemento] of Object.entries(valor)) {
      recorrerCadenas(elemento, [...ruta, clave], visitar);
    }
  }
}

/** `secciones[0].bloques[2].actividad.config` a partir de la ruta de zod. */
export function rutaLegible(ruta: readonly PropertyKey[]): string {
  let texto = '';
  for (const paso of ruta) {
    if (typeof paso === 'number') texto += `[${paso}]`;
    else texto += texto === '' ? String(paso) : `.${String(paso)}`;
  }
  return texto === '' ? '(raíz del módulo)' : texto;
}

/* -------------------------------------------------------------------------------------------
 * Índices para el mentor ("Explícame esto")
 * ----------------------------------------------------------------------------------------- */

export interface EstructuraIndexada {
  id: string;
  etiqueta: string;
  descripcion: string;
  /** `capa` de un SVG multicapa o `nodo` de una escena 3D. */
  origen: 'capa' | 'nodo';
  actividadId: string;
  seccionId: string;
}

/** Clave del índice de estructuras: el id de una capa o de un nodo solo es único en su actividad. */
export function claveEstructura(actividadId: string, id: string): string {
  return `${actividadId}:${id}`;
}

/**
 * Estructuras seleccionables (`ContextoPedagogico.estructuraSeleccionada`) por
 * `claveEstructura(actividadId, id)`. Los nodos 3D pueden repetirse entre actividades del módulo
 * (`cuerpo` en dos escenas), así que la clave lleva la actividad: `ContextoPedagogico` ya envía
 * `actividadActual.id` junto con la estructura, y con eso se resuelve sin ambigüedad. Para
 * buscar una estructura conociendo ambos datos, `buscarEstructura`.
 */
export function indiceEstructuras(modulo: ConSecciones): Map<string, EstructuraIndexada> {
  const indice = new Map<string, EstructuraIndexada>();
  for (const { actividad, seccion } of listarActividades(modulo)) {
    if (actividad.tipo === 'multicapa') {
      for (const capa of actividad.config.capas) {
        indice.set(claveEstructura(actividad.id, capa.id), {
          id: capa.id,
          etiqueta: capa.etiqueta,
          descripcion: capa.descripcion,
          origen: 'capa',
          actividadId: actividad.id,
          seccionId: seccion.id,
        });
      }
    } else if (actividad.tipo === 'exploracion-3d') {
      for (const nodo of actividad.config.nodos) {
        indice.set(claveEstructura(actividad.id, nodo.id), {
          id: nodo.id,
          etiqueta: nodo.etiqueta,
          descripcion: nodo.descripcion,
          origen: 'nodo',
          actividadId: actividad.id,
          seccionId: seccion.id,
        });
      }
      // Escena procedural: cada paso de la línea de tiempo se puede pedir al mentor como un nodo.
      for (const paso of actividad.config.linea_de_tiempo?.pasos ?? []) {
        indice.set(claveEstructura(actividad.id, paso.id), {
          id: paso.id,
          etiqueta: paso.titulo,
          descripcion: paso.texto,
          origen: 'nodo',
          actividadId: actividad.id,
          seccionId: seccion.id,
        });
      }
    }
  }
  return indice;
}

/** La estructura `id` de la actividad `actividadId`, o `undefined` si no existe. */
export function buscarEstructura(
  indice: ReadonlyMap<string, EstructuraIndexada>,
  actividadId: string,
  id: string,
): EstructuraIndexada | undefined {
  return indice.get(claveEstructura(actividadId, id));
}

export interface MoleculaIndexada {
  id: string;
  etiqueta: string;
  descripcion: string;
  actividadId: string;
  seccionId: string;
}

/** Moléculas arrastrables (`ContextoPedagogico.moleculaSeleccionada`) por id. */
export function indiceMoleculas(modulo: ConSecciones): Map<string, MoleculaIndexada> {
  const indice = new Map<string, MoleculaIndexada>();
  for (const { actividad, seccion } of listarActividades(modulo)) {
    if (actividad.tipo !== 'arrastre-molecular') continue;
    for (const molecula of actividad.config.moleculas) {
      indice.set(molecula.id, {
        id: molecula.id,
        etiqueta: molecula.etiqueta,
        descripcion: molecula.descripcion,
        actividadId: actividad.id,
        seccionId: seccion.id,
      });
    }
  }
  return indice;
}
