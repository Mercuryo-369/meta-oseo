/**
 * Fuentes de las imágenes. El `credito` de una imagen («Fuente: autor, año… https://…») se separa en su texto y su
 * URL, para enlazar el artículo (pedido de la docente, 2026-11-05). En la página de un módulo las fuentes no van bajo
 * cada figura sino en el desplegable de Referencias (revisión del módulo 5, 2026-11-06: «meter las referencias de las
 * imágenes en la sección de referencias para que las imágenes abarquen más espacio»).
 */
import type { ModuloContenido } from '@/content/schema';

export interface FuenteImagen {
  texto: string;
  url?: string;
}

export function separarFuente(credito: string): FuenteImagen {
  const url = /https:\/\/\S+/.exec(credito)?.[0]?.replace(/[.,;)»”"]+$/, '');
  const texto = url
    ? credito
        .replace(url, '')
        .replace(/[\s,;“”"«»]+$/, '')
        .trim()
    : credito.trim();
  return url ? { texto, url } : { texto };
}

/**
 * Claves «apellido año» de una cita, con las dos primeras palabras en mayúscula como posibles apellidos: «Adaptado de
 * Tortora, G. J. … (2006)» da «tortora 2006» y «Tomado de Lei Qin et al. (2020)» da «lei 2020» y «qin 2020».
 */
function autorYAnio(cita: string): string[] {
  const limpia = cita.replace(/^\s*(?:adaptad|tomad)[oa]s?\s+de\s+/i, '');
  const anio = /\b(?:19|20)\d{2}\b/.exec(limpia)?.[0];
  if (!anio) return [];
  const autores = [...limpia.matchAll(/\p{Lu}[\p{L}'’-]+/gu)].slice(0, 2).map((m) => m[0]);
  return autores.map((a) => `${a.toLocaleLowerCase('es')} ${anio}`);
}

/**
 * Fuentes distintas de las imágenes del módulo, en el orden en que aparecen. Se omiten las que ya están en la
 * bibliografía del módulo (mismo primer autor y año), para no listarlas dos veces.
 */
export function fuentesDeImagenes(modulo: ModuloContenido): FuenteImagen[] {
  // De la bibliografía solo cuenta el primer autor («Qin L, Liu W…» → «qin 2020»).
  const enBibliografia = new Set(modulo.referencias.flatMap((r) => autorYAnio(r.cita).slice(0, 1)));
  const vistas = new Set<string>();
  const salida: FuenteImagen[] = [];
  for (const s of modulo.secciones) {
    for (const b of s.bloques) {
      if (b.tipo !== 'imagen' || !b.credito) continue;
      const clave = b.credito.trim();
      if (vistas.has(clave) || autorYAnio(clave).some((k) => enBibliografia.has(k))) continue;
      vistas.add(clave);
      salida.push(separarFuente(clave));
    }
  }
  return salida;
}
