/** Formato de fechas y cifras para las pantallas del estudiante (español de Colombia). */

const ZONA = 'America/Bogota';

/** "24 de septiembre de 2026". Devuelve cadena vacía si la fecha no es válida. */
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: ZONA }).format(fecha);
}

/**
 * "79,1 %". El servidor ya trunca a un decimal (69,7 no se redondea a 70): aquí solo se
 * escribe con coma decimal, sin volver a redondear hacia arriba.
 */
export function formatearPorcentaje(valor: number): string {
  const truncado = Math.trunc(valor * 10 + 1e-9) / 10;
  return `${String(truncado).replace('.', ',')} %`;
}

/** "1 punto" / "146 puntos". */
export function formatearPuntos(n: number): string {
  return `${n} ${n === 1 ? 'punto' : 'puntos'}`;
}
