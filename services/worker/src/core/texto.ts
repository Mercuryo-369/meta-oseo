/** Utilidades de texto (equivalen a app/core/text.py y app/schemas/identidad.py). */

const SUSTITUTO_SUELTO = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/** Rechaza (con `Error`) el texto que la base no puede guardar: NUL y sustitutos Unicode sueltos. */
export function asegurarGuardable(valor: string): string {
  if (valor.includes('\u0000')) throw new Error('No puede contener el carácter nulo.');
  if (SUSTITUTO_SUELTO.test(valor)) throw new Error('Contiene caracteres Unicode no válidos.');
  return valor;
}

/** Copia apta para volver a escribirse como JSON (sustitutos sueltos -> U+FFFD). */
export function imprimibleUtf8(valor: string): string {
  return valor.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    '�',
  );
}

export const ID_NUMBER_PATTERN = /^[A-Z0-9]{4,20}$/;
export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 80;

/**
 * Quita espacios, puntos y guiones, pasa a mayúsculas (solo ASCII, como en el servidor Python) y
 * exige `^[A-Z0-9]{4,20}$`. `"1.023.456-789"` -> `"1023456789"`.
 */
export function normalizarNumeroIdentificacion(valor: string): string {
  let compacto = valor.replace(/[\s.\-]+/g, '');
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(compacto)) compacto = compacto.toUpperCase();
  if (!ID_NUMBER_PATTERN.test(compacto)) {
    throw new Error(
      'El número de identificación debe tener de 4 a 20 letras o dígitos (se ignoran espacios, puntos y guiones).',
    );
  }
  return compacto;
}

/** Recorta, colapsa espacios y valida 1..80 puntos de código sin caracteres de control. */
export function normalizarNombre(valor: string): string {
  if (/\p{Cc}/u.test(valor)) throw new Error('No puede contener caracteres de control.');
  asegurarGuardable(valor);
  const colapsado = valor.replace(/\s+/g, ' ').trim();
  const largo = [...colapsado].length;
  if (largo < NAME_MIN_LENGTH || largo > NAME_MAX_LENGTH) {
    throw new Error(`Debe tener entre ${NAME_MIN_LENGTH} y ${NAME_MAX_LENGTH} caracteres.`);
  }
  return colapsado;
}

/** Enmascara un número de identificación: solo se ven los últimos 3 caracteres. */
export function enmascararIdentificacion(numero: string): string {
  if (numero.length <= 3) return numero;
  return '*'.repeat(numero.length - 3) + numero.slice(-3);
}
