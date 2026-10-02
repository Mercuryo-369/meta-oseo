import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resumenDePrueba,
  simularRutas,
  verificadoDePrueba,
} from '@/components/certificado/utilesPrueba';
import { useAuthStore } from '@/stores/auth';
import { respuestaError, respuestaJson } from '@/test/utils';
import { ApiError } from './api';
import {
  codigoBienFormado,
  descargarCertificadoPdf,
  emitirCertificado,
  guardarArchivo,
  nombreDeCabecera,
  normalizarCodigo,
  obtenerEstadoCertificado,
  obtenerLogros,
  urlVerificacion,
  verificarCertificado,
} from './certificado';
import { formatearFecha, formatearPorcentaje, formatearPuntos } from './formato';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  useAuthStore().token = 'jwt-de-prueba';
});

describe('normalizarCodigo', () => {
  it('pasa a mayúsculas y quita espacios', () => {
    expect(normalizarCodigo('  ova-7k3m-9qxa ')).toBe('OVA-7K3M-9QXA');
    expect(normalizarCodigo('ova 7k3m 9qxa')).toBe('OVA-7K3M-9QXA');
  });

  it('acepta el código sin guiones o con guiones tipográficos', () => {
    expect(normalizarCodigo('OVA7K3M9QXA')).toBe('OVA-7K3M-9QXA');
    expect(normalizarCodigo('OVA\u20137K3M\u20139QXA')).toBe('OVA-7K3M-9QXA');
    expect(normalizarCodigo('ova_7k3m_9qxa')).toBe('OVA-7K3M-9QXA');
  });

  it('deja el resto tal cual (en mayúsculas) para que el servidor diga que no existe', () => {
    expect(normalizarCodigo('hola mundo')).toBe('HOLAMUNDO');
    expect(normalizarCodigo('   ')).toBe('');
  });

  it('codigoBienFormado reconoce solo la forma OVA-XXXX-XXXX', () => {
    expect(codigoBienFormado('OVA-7K3M-9QXA')).toBe(true);
    expect(codigoBienFormado('OVA-7K3M')).toBe(false);
    expect(codigoBienFormado('ova-7k3m-9qxa')).toBe(false);
    expect(codigoBienFormado('')).toBe(false);
  });

  it('urlVerificacion apunta a /verify/{codigo} en el mismo origen', () => {
    expect(urlVerificacion('OVA-7K3M-9QXA')).toBe(`${window.location.origin}/verify/OVA-7K3M-9QXA`);
  });
});

describe('nombreDeCabecera', () => {
  it('lee el filename de Content-Disposition', () => {
    expect(nombreDeCabecera('attachment; filename="certificado_OVA-7K3M-9QXA.pdf"')).toBe(
      'certificado_OVA-7K3M-9QXA.pdf',
    );
    expect(nombreDeCabecera('attachment; filename=cert.pdf')).toBe('cert.pdf');
  });

  it('descarta cabeceras ausentes, sin .pdf o con rutas', () => {
    expect(nombreDeCabecera(null)).toBeNull();
    expect(nombreDeCabecera('inline')).toBeNull();
    expect(nombreDeCabecera('attachment; filename="script.exe"')).toBeNull();
    // Se queda solo con el último tramo: nunca una ruta.
    expect(nombreDeCabecera('attachment; filename="../../etc/cert.pdf"')).toBe('cert.pdf');
  });
});

describe('estado, emisión y logros', () => {
  it('obtenerEstadoCertificado envía el token', async () => {
    const { llamadas } = simularRutas({
      'GET /certificate/status': () => respuestaJson(200, { elegible: false }),
    });
    await obtenerEstadoCertificado();
    expect(llamadas[0]!.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
  });

  it('emitirCertificado hace POST sin cuerpo y acepta 201 y el 200 idempotente', async () => {
    let n = 0;
    const { fetch } = simularRutas({
      'POST /certificate': () =>
        n++ === 0
          ? respuestaJson(201, { certificado: resumenDePrueba(), nuevo: true })
          : respuestaJson(200, { certificado: resumenDePrueba(), nuevo: false }),
    });
    expect((await emitirCertificado()).nuevo).toBe(true);
    expect((await emitirCertificado()).nuevo).toBe(false);
    expect(fetch.mock.calls[0]![1]?.body).toBeUndefined();
  });

  it('emitirCertificado propaga el 409 con los motivos', async () => {
    simularRutas({
      'POST /certificate': () =>
        respuestaJson(409, {
          detail: {
            code: 'certificado_no_elegible',
            message: 'No',
            motivos: ['Falta el módulo 4'],
          },
        }),
    });
    const error = await emitirCertificado().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('certificado_no_elegible');
    expect((error as ApiError).detalle.motivos).toEqual(['Falta el módulo 4']);
  });

  it('obtenerLogros rechaza una respuesta sin lista', async () => {
    simularRutas({ 'GET /achievements': () => respuestaJson(200, { otra: 1 }) });
    await expect(obtenerLogros()).rejects.toMatchObject({ code: 'respuesta_invalida' });
  });
});

describe('descargarCertificadoPdf y guardarArchivo', () => {
  function pdf(cabecera?: string, contenido = '%PDF-1.4 prueba'): Response {
    return new Response(new Blob([contenido], { type: 'application/pdf' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        ...(cabecera ? { 'Content-Disposition': cabecera } : {}),
      },
    });
  }

  it('pide el PDF con Authorization y devuelve el blob y el nombre del servidor', async () => {
    const { llamadas } = simularRutas({
      'GET /certificate/pdf': () => pdf('attachment; filename="certificado_OVA-7K3M-9QXA.pdf"'),
    });
    const { blob, nombre } = await descargarCertificadoPdf('OVA-7K3M-9QXA');
    expect(llamadas[0]!.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    expect(llamadas[0]!.headers.get('Accept')).toBe('application/pdf');
    expect(nombre).toBe('certificado_OVA-7K3M-9QXA.pdf');
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/pdf');
  });

  it('sin cabecera usa un nombre sensato con el código', async () => {
    simularRutas({ 'GET /certificate/pdf': () => pdf() });
    expect((await descargarCertificadoPdf('OVA-7K3M-9QXA')).nombre).toBe(
      'certificado_OVA-7K3M-9QXA.pdf',
    );
  });

  it('un archivo vacío es un error', async () => {
    simularRutas({ 'GET /certificate/pdf': () => pdf(undefined, '') });
    await expect(descargarCertificadoPdf()).rejects.toMatchObject({ code: 'respuesta_invalida' });
  });

  it('404 certificado_no_emitido y 429 llegan como ApiError con el mensaje del servidor', async () => {
    simularRutas({
      'GET /certificate/pdf': () =>
        respuestaError(404, 'certificado_no_emitido', 'Aún no has emitido tu certificado.'),
    });
    await expect(descargarCertificadoPdf()).rejects.toMatchObject({
      status: 404,
      code: 'certificado_no_emitido',
      message: 'Aún no has emitido tu certificado.',
    });
    simularRutas({
      'GET /certificate/pdf': () => respuestaError(429, 'demasiados_intentos', 'Espera.'),
    });
    await expect(descargarCertificadoPdf()).rejects.toMatchObject({ status: 429 });
  });

  it('un fallo de red es un ApiError "red"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('sin red')));
    await expect(descargarCertificadoPdf()).rejects.toMatchObject({ code: 'red', status: 0 });
  });

  it('guardarArchivo crea un enlace temporal con el nombre y lo libera después', () => {
    vi.useFakeTimers();
    const crear = vi.fn(() => 'blob:prueba');
    const liberar = vi.fn();
    const originales = { c: URL.createObjectURL, r: URL.revokeObjectURL };
    URL.createObjectURL = crear;
    URL.revokeObjectURL = liberar;
    let descarga = '';
    let href = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      descarga = this.download;
      href = this.href;
    });

    guardarArchivo(new Blob(['x'], { type: 'application/pdf' }), 'certificado_OVA-7K3M-9QXA.pdf');

    expect(descarga).toBe('certificado_OVA-7K3M-9QXA.pdf');
    expect(href).toBe('blob:prueba');
    expect(document.querySelector('a[download]')).toBeNull();
    expect(liberar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(liberar).toHaveBeenCalledWith('blob:prueba');
    vi.useRealTimers();
    URL.createObjectURL = originales.c;
    URL.revokeObjectURL = originales.r;
  });
});

describe('verificarCertificado (público)', () => {
  it('no envía Authorization aunque haya sesión y codifica el código', async () => {
    const { llamadas } = simularRutas({
      'GET /verify/OVA-7K3M-9QXA': () => respuestaJson(200, verificadoDePrueba()),
    });
    const datos = await verificarCertificado('OVA-7K3M-9QXA');
    expect(datos.nombre).toBe('Ana');
    expect(llamadas[0]!.headers.has('Authorization')).toBe(false);
  });

  it('404 llega como certificado_no_encontrado', async () => {
    simularRutas({
      'GET /verify/OVA-AAAA-BBBB': () =>
        respuestaError(404, 'certificado_no_encontrado', 'No existe'),
    });
    await expect(verificarCertificado('OVA-AAAA-BBBB')).rejects.toMatchObject({
      status: 404,
      code: 'certificado_no_encontrado',
    });
  });

  it('429 trae los segundos de Retry-After en el detalle y no cierra la sesión', async () => {
    simularRutas({
      'GET /verify/OVA-AAAA-BBBB': () =>
        new Response(
          JSON.stringify({ detail: { code: 'demasiados_intentos', message: 'Calma' } }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Retry-After': '42' },
          },
        ),
    });
    const error = await verificarCertificado('OVA-AAAA-BBBB').catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 429, code: 'demasiados_intentos', message: 'Calma' });
    expect((error as ApiError).detalle.retry_after).toBe(42);
    expect(useAuthStore().token).toBe('jwt-de-prueba');
  });

  it('429 sin Retry-After usa una espera por defecto', async () => {
    simularRutas({ 'GET /verify/OVA-AAAA-BBBB': () => respuestaError(429, 'demasiados_intentos') });
    const error = await verificarCertificado('OVA-AAAA-BBBB').catch((e: unknown) => e);
    expect((error as ApiError).detalle.retry_after).toBe(30);
  });
});

describe('formato', () => {
  it('formatearFecha usa la zona de Colombia', () => {
    expect(formatearFecha('2026-09-24T15:00:00Z')).toBe('24 de septiembre de 2026');
    // 02:00 UTC del 25 son las 21:00 del 24 en Bogotá.
    expect(formatearFecha('2026-09-25T02:00:00Z')).toBe('24 de septiembre de 2026');
    expect(formatearFecha(null)).toBe('');
    expect(formatearFecha('no es una fecha')).toBe('');
  });

  it('formatearPorcentaje usa coma decimal y no redondea hacia arriba', () => {
    expect(formatearPorcentaje(79.1)).toBe('79,1 %');
    expect(formatearPorcentaje(70)).toBe('70 %');
    expect(formatearPorcentaje(69.7)).toBe('69,7 %');
    expect(formatearPorcentaje(69.96)).toBe('69,9 %');
  });

  it('formatearPuntos concuerda en número', () => {
    expect(formatearPuntos(1)).toBe('1 punto');
    expect(formatearPuntos(146)).toBe('146 puntos');
    expect(formatearPuntos(0)).toBe('0 puntos');
  });
});
