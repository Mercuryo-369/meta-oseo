/** Reloj UTC único (equivale a app/core/clock.py). */

/**
 * Instante actual en UTC como texto ISO 8601 truncado a segundos, con sufijo `Z`
 * (`2026-09-23T20:00:00Z`), tal como lo devuelve la API y lo guarda D1.
 */
export function ahora(): string {
  return aIso(new Date());
}

/** `Date` -> `2026-09-23T20:00:00Z` (sin milisegundos). */
export function aIso(fecha: Date): string {
  return fecha.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Fecha de hoy (AAAA-MM-DD) en un huso fijo expresado en horas respecto a UTC. */
export function fechaLocal(fecha: Date, offsetHoras: number): string {
  const desplazada = new Date(fecha.getTime() + offsetHoras * 3_600_000);
  return desplazada.toISOString().slice(0, 10);
}

/** Segundos que faltan para la medianoche siguiente en el huso dado (al menos 1). */
export function segundosHastaMedianoche(fecha: Date, offsetHoras: number): number {
  const desplazada = new Date(fecha.getTime() + offsetHoras * 3_600_000);
  const siguiente = Date.UTC(
    desplazada.getUTCFullYear(),
    desplazada.getUTCMonth(),
    desplazada.getUTCDate() + 1,
  );
  return Math.max(1, Math.ceil((siguiente - desplazada.getTime()) / 1000));
}
