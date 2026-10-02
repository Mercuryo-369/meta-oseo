/**
 * Identidad visual de cada módulo (acento, apertura y estado de la tarjeta), como funciones puras.
 * Los datos (rótulo, frase, icono, portada) viven en `data/modulos.ts`; los colores, en los tokens
 * `--acento-mN` de `style.css`.
 */
import { textoPlanoDeMarkdown } from '@/content/markdown';
import { TOTAL_MODULOS } from '@/config';
import { decidirAccesoModulo } from './acceso';

/**
 * Estilo en línea que fija el acento del módulo `n` para todo lo que haya dentro. Con él, las
 * clases `text-acento`, `bg-acento-suave`, `border-acento` y `text-acento-sobre` toman el color de
 * ese módulo (claro u oscuro según el tema). Un número fuera de rango deja el acento por defecto.
 */
export function estiloAcento(n: number): Record<string, string> {
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_MODULOS) return {};
  return {
    '--acento': `var(--acento-m${n})`,
    '--acento-suave': `var(--acento-m${n}-suave)`,
    '--acento-sobre': 'var(--acento-sobre-m)',
  };
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s.,;:]+/g, ' ')
    .trim();
}

/**
 * Frase de apertura del módulo tomada de su resumen, sin editar `content.json`. Los resúmenes
 * empiezan repitiendo el subtítulo y, en la mayoría, siguen con una frase de gancho («La mandíbula
 * es…»): esa es la apertura. Devuelve la parte del resumen que no repite el subtítulo, o `''` si
 * el resumen no dice nada más que el subtítulo.
 */
export function aperturaDelResumen(resumen: string, subtitulo: string): string {
  const plano = textoPlanoDeMarkdown(resumen).trim();
  const sub = normalizar(textoPlanoDeMarkdown(subtitulo));
  if (!plano) return '';
  if (!sub || !normalizar(plano).startsWith(sub)) return plano;
  // Prefijo más corto del resumen que equivale al subtítulo (con o sin punto final).
  for (let k = 1; k <= plano.length; k++) {
    if (normalizar(plano.slice(0, k)) === sub) return plano.slice(k).replace(/^[\s.!?]+/, '');
  }
  return plano;
}

export type EstadoTarjeta = 'bloqueado' | 'completado' | 'en_curso' | 'disponible';

export interface OpcionesEstadoTarjeta {
  completados: readonly number[];
  /** Módulos con avance guardado (sección actual o tiempo) que aún no están completados. */
  enCurso: readonly number[];
  bloqueoSecuencial: boolean;
}

/**
 * Estado que muestran la tarjeta de la portada y la cabecera de la página. Usa la misma regla que
 * la página (`decidirAccesoModulo`) y que el menú circular (`estadoDelModulo`).
 */
export function estadoDeTarjeta(n: number, o: OpcionesEstadoTarjeta): EstadoTarjeta {
  if (o.completados.includes(n)) return 'completado';
  const acceso = decidirAccesoModulo(n, o.completados, {
    bloqueoSecuencial: o.bloqueoSecuencial,
    progresoConocido: true,
  });
  if (!acceso.permitido) return 'bloqueado';
  return o.enCurso.includes(n) ? 'en_curso' : 'disponible';
}

/** Texto visible y accesible de cada estado (no depende solo del color). */
export function textoEstadoTarjeta(estado: EstadoTarjeta, n: number): string {
  switch (estado) {
    case 'bloqueado':
      return `Completa el módulo ${n - 1} para abrirlo`;
    case 'completado':
      return 'Completado';
    case 'en_curso':
      return 'En curso';
    default:
      return 'Listo para empezar';
  }
}
