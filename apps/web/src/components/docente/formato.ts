/**
 * Formatos de presentación del panel del docente (es-CO). Todos toleran `null` porque la API
 * devuelve `null` cuando no hay datos (por ejemplo, el promedio de un módulo sin estudiantes).
 */

export const SIN_DATO = '—';

const LOCALE = 'es-CO';

export function formatoNumero(valor: number | null | undefined, decimales = 0): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return SIN_DATO;
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

/** Segundos a texto corto: "45 s", "6 min 7 s", "1 h 5 min". */
export function formatoDuracion(segundos: number | null | undefined): string {
  if (segundos === null || segundos === undefined || Number.isNaN(segundos)) return SIN_DATO;
  const total = Math.max(0, Math.round(segundos));
  if (total < 60) return `${total} s`;
  if (total < 3600) {
    const min = Math.floor(total / 60);
    const seg = total % 60;
    return seg === 0 ? `${min} min` : `${min} min ${seg} s`;
  }
  const horas = Math.floor(total / 3600);
  const min = Math.floor((total % 3600) / 60);
  return min === 0 ? `${horas} h` : `${horas} h ${min} min`;
}

/** Costo estimado en dólares: 4 decimales bajo 1 USD (las consultas cuestan centavos). */
export function formatoUsd(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return SIN_DATO;
  const decimales = Math.abs(valor) >= 1 ? 2 : 4;
  return `US$ ${formatoNumero(valor, decimales)}`;
}

/** Proporción de 0 a 1 a porcentaje entero: 0.6667 -> "67 %". */
export function formatoPorcentaje(proporcion: number | null | undefined): string {
  if (proporcion === null || proporcion === undefined || Number.isNaN(proporcion)) return SIN_DATO;
  return `${formatoNumero(proporcion * 100, 0)} %`;
}

export function formatoFechaHora(iso: string | null | undefined, vacio = SIN_DATO): string {
  if (!iso) return vacio;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return vacio;
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(fecha);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function partesDeDia(fecha: string): { dia: number; mes: string; anio: string } | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const mes = partes ? MESES[Number(partes[2]) - 1] : undefined;
  if (!partes || !mes) return null;
  return { dia: Number(partes[3]), mes, anio: partes[1]! };
}

/** "2026-09-24" (día UTC, sin desfase de zona horaria) a "24 sep 2026". */
export function formatoDia(fecha: string): string {
  const p = partesDeDia(fecha);
  return p ? `${p.dia} ${p.mes} ${p.anio}` : fecha;
}

/** "2026-09-24" a "24 sep" (para el eje de los gráficos). */
export function formatoDiaCorto(fecha: string): string {
  const p = partesDeDia(fecha);
  return p ? `${p.dia} ${p.mes}` : fecha;
}

export function nombreCompleto(e: { nombre: string; apellido: string }): string {
  return `${e.nombre} ${e.apellido}`.trim();
}

/**
 * Deja `texto` terminado en UN solo punto. Las fechas es-CO acaban en «a. m.» / «p. m.», y añadir
 * otro punto después dejaba «a. m..» en pantalla.
 */
export function conPuntoFinal(texto: string): string {
  return `${texto.replace(/\.+$/, '')}.`;
}
