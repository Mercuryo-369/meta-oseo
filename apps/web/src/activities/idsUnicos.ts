/**
 * Ids únicos por actividad en el DOM (lo usan `multicapa/svgCapas.ts` y `video-texto/svgAnimacion.ts`).
 *
 * Los SVG del proyecto se inyectan en línea, así que sus ids viven en el mismo documento que los de la
 * página. `prefijarIdsReferenciados` (multicapa) y `sanearSvg` (video-texto) ya prefijan los ids que
 * aparecen en `url(#..)` o `href="#.."`, que son los que se rompen al repetirse; los demás (`fondo_escena`,
 * las capas, los grupos) quedaban iguales en todas las instancias y, con dos dibujos en la página (varios
 * del módulo 5 comparten `<g id="fondo_escena">`), el DOM tenía ids repetidos. Esta pasada prefija TAMBIÉN el
 * resto. Quien busca capas por su id original lo hace ANTES (`marcarCapas`, el mapa de grupos) y guarda el
 * elemento, no el id, así que no se rompe.
 */

/** Prefijo válido para ids del DOM: `{id de la actividad}__` con los caracteres raros cambiados. */
export function prefijoDeIds(idActividad: string): string {
  return `${idActividad.replace(/[^A-Za-z0-9_-]/g, '_')}__`;
}

/** Atributos ARIA cuyo valor es una lista de ids separada por espacios. */
const ATRIBUTOS_LISTA_DE_IDS = [
  'aria-labelledby',
  'aria-describedby',
  'aria-controls',
  'aria-owns',
  'aria-details',
  'aria-flowto',
];

/**
 * Antepone `prefijo` a todos los ids de `raiz` que aún no lo tienen y reescribe las referencias por lista de
 * ids (`aria-labelledby`...). Idempotente. Devuelve los ids reescritos (viejo -> nuevo).
 */
export function prefijarIdsRestantes(raiz: Element, prefijo: string): Map<string, string> {
  const elementos = [raiz, ...Array.from(raiz.querySelectorAll('*'))];
  const existentes = new Set<string>();
  for (const el of elementos) {
    const id = el.getAttribute('id');
    if (id) existentes.add(id);
  }

  const nuevos = new Map<string, string>();
  for (const id of existentes) {
    if (id.startsWith(prefijo)) continue;
    const nuevo = `${prefijo}${id}`;
    // Si ese id ya existe (dibujo raro) se deja el original: mejor un duplicado que romper una referencia.
    if (!existentes.has(nuevo)) nuevos.set(id, nuevo);
  }
  if (nuevos.size === 0) return nuevos;

  for (const el of elementos) {
    const id = el.getAttribute('id');
    if (id !== null && nuevos.has(id)) el.setAttribute('id', nuevos.get(id) as string);
    for (const nombre of ATRIBUTOS_LISTA_DE_IDS) {
      const valor = el.getAttribute(nombre);
      if (valor === null) continue;
      el.setAttribute(
        nombre,
        valor
          .split(/\s+/)
          .filter(Boolean)
          .map((ref) => nuevos.get(ref) ?? ref)
          .join(' '),
      );
    }
  }
  return nuevos;
}
