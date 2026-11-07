/**
 * Manifiesto de actividades: lo que el servidor sabe del contenido (equivale a
 * app/services/manifest.py). El archivo lo genera `python -m app.scripts.build_manifest` en
 * services/api y aquí se empaqueta con el Worker (import JSON): siempre hay manifiesto.
 */
import datos from '../../../api/app/data/actividades_manifest.json';
import { MODULE_COUNT, type TipoActividad } from '../core/constantes';

export interface ActivitySpec {
  modulo: number;
  tipo: TipoActividad;
  puntaje_max: number;
  obligatoria: boolean;
  seccion: string;
  seccion_titulo: string;
  concepto: string;
}

export class Manifiesto {
  readonly actividades: Map<string, ActivitySpec>;
  readonly slugs: Map<number, string>;

  constructor(actividades: Map<string, ActivitySpec>, slugs: Map<number, string>) {
    this.actividades = actividades;
    this.slugs = slugs;
  }

  /** Números de módulo con al menos una actividad, en orden. */
  get modulos(): number[] {
    return [...new Set([...this.actividades.values()].map((s) => s.modulo))].sort((a, b) => a - b);
  }

  /** Ids de las actividades obligatorias del módulo, en el orden del contenido. */
  requiredIds(modulo: number): string[] {
    return [...this.actividades]
      .filter(([, s]) => s.modulo === modulo && s.obligatoria)
      .map(([id]) => id);
  }

  /** Suma de `puntaje_max` de todas las actividades obligatorias del OVA. */
  maxRequiredScore(): number {
    let total = 0;
    for (const s of this.actividades.values()) if (s.obligatoria) total += s.puntaje_max;
    return total;
  }
}

interface ArchivoManifiesto {
  version: number;
  actividades: Record<string, Partial<ActivitySpec>>;
  modulos?: Record<string, { slug?: string }>;
}

function cargar(archivo: ArchivoManifiesto): Manifiesto {
  if (archivo.version !== 1) throw new Error(`Versión de manifiesto no soportada: ${archivo.version}`);
  const actividades = new Map<string, ActivitySpec>();
  for (const [id, spec] of Object.entries(archivo.actividades)) {
    const modulo = Number(spec.modulo);
    if (!Number.isInteger(modulo) || modulo < 1 || modulo > MODULE_COUNT || !spec.tipo) {
      throw new Error(`La actividad ${id} del manifiesto no es válida.`);
    }
    actividades.set(id, {
      modulo,
      tipo: spec.tipo,
      puntaje_max: Number(spec.puntaje_max),
      obligatoria: spec.obligatoria !== false,
      seccion: String(spec.seccion ?? ''),
      seccion_titulo: String(spec.seccion_titulo ?? ''),
      concepto: String(spec.concepto ?? ''),
    });
  }
  const slugs = new Map<number, string>();
  for (const [numero, entrada] of Object.entries(archivo.modulos ?? {})) {
    if (entrada.slug) slugs.set(Number(numero), entrada.slug);
  }
  return new Manifiesto(actividades, slugs);
}

/** Manifiesto cargado una vez por instancia del Worker. */
export const manifiesto: Manifiesto = cargar(datos as unknown as ArchivoManifiesto);
