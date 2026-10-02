/**
 * Utilidades de las pruebas de certificado, verificación y logros: datos con la forma del contrato
 * (docs/api-contract.md) y una API simulada por rutas. Solo se importa desde archivos .test.ts.
 */
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import type { CertificadoEstado, CertificadoResumen, CertificadoVerificado } from '@/types/api';

export function resumenDePrueba(
  sobrescribir: Partial<CertificadoResumen> = {},
): CertificadoResumen {
  return {
    codigo: 'OVA-7K3M-9QXA',
    emitido_en: '2026-09-24T15:00:00Z',
    puntaje_total: 231,
    puntaje_obligatorias: 380,
    puntaje_maximo: 480,
    porcentaje: 79.1,
    ...sobrescribir,
  };
}

/** Faltan módulos y puntaje: el ejemplo de `docs/api-contract.md`. */
export function estadoNoElegible(sobrescribir: Partial<CertificadoEstado> = {}): CertificadoEstado {
  return {
    elegible: false,
    emitido: false,
    modulos_completados: [1, 2, 3],
    modulos_pendientes: [4, 5, 6],
    puntaje_total: 210,
    puntaje_obligatorias: 190,
    puntaje_maximo: 480,
    porcentaje: 39.5,
    umbral: 70,
    puntos_faltantes: 146,
    motivos: [
      'Faltan por completar los módulos 4, 5 y 6.',
      'Tu puntaje en las actividades obligatorias es 39,5 % y se necesita al menos 70 %: te faltan 146 puntos.',
    ],
    certificado: null,
    ...sobrescribir,
  };
}

export function estadoElegible(sobrescribir: Partial<CertificadoEstado> = {}): CertificadoEstado {
  return estadoNoElegible({
    elegible: true,
    modulos_completados: [1, 2, 3, 4, 5, 6],
    modulos_pendientes: [],
    puntaje_total: 431,
    puntaje_obligatorias: 380,
    porcentaje: 79.1,
    puntos_faltantes: 0,
    motivos: [],
    ...sobrescribir,
  });
}

export function estadoEmitido(sobrescribir: Partial<CertificadoEstado> = {}): CertificadoEstado {
  return estadoElegible({ emitido: true, certificado: resumenDePrueba(), ...sobrescribir });
}

export function verificadoDePrueba(
  sobrescribir: Partial<CertificadoVerificado> = {},
): CertificadoVerificado {
  return {
    valido: true,
    codigo: 'OVA-7K3M-9QXA',
    nombre: 'Ana',
    apellido: 'Pérez',
    tipo_identificacion: 'CC',
    identificacion_enmascarada: '*******789',
    emitido_en: '2026-09-24T15:00:00Z',
    puntaje_total: 231,
    porcentaje: 79.1,
    ...sobrescribir,
  };
}

export interface LlamadaSimulada {
  metodo: string;
  /** Ruta sin el prefijo `/api`. */
  ruta: string;
  headers: Headers;
}

/**
 * Instala un `fetch` global que responde por `"METODO /ruta"` (sin `/api`). Una ruta sin
 * respuesta configurada falla la prueba en vez de contestar algo inventado.
 */
export function simularRutas(
  rutas: Record<string, (llamada: LlamadaSimulada) => Response | Promise<Response>>,
): { fetch: Mock<typeof fetch>; llamadas: LlamadaSimulada[] } {
  const llamadas: LlamadaSimulada[] = [];
  const mock = vi.fn<typeof fetch>(async (entrada, init) => {
    const ruta = String(entrada).replace(/^\/api/, '');
    const metodo = (init?.method ?? 'GET').toUpperCase();
    const llamada = { metodo, ruta, headers: new Headers(init?.headers) };
    llamadas.push(llamada);
    const manejador = rutas[`${metodo} ${ruta}`];
    if (!manejador) throw new Error(`Ruta sin simular: ${metodo} ${ruta}`);
    return manejador(llamada);
  });
  vi.stubGlobal('fetch', mock);
  return { fetch: mock, llamadas };
}
