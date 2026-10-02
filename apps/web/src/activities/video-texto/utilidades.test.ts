/**
 * Pruebas de las funciones puras de video-texto: medición del video, formato de tiempo,
 * instantáneas y preparación del SVG. Las del componente completo están en
 * ActividadVideoTexto.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { UMBRAL_VIDEO_VISTO } from '@/activities/types';
import { leerInstantaneaAnimacion, leerInstantaneaVideo } from './instantanea';
import { aplicarPaso, ErrorSvg, prepararSvg, sanearSvg } from './svgAnimacion';
import {
  alcanzaUmbral,
  duracionDePasoMs,
  formatearTiempo,
  fraccionVista,
  indicePistaPorDefecto,
  limitarFraccion,
  redondear2,
} from './video';

function rangos(...tramos: [number, number][]) {
  return {
    length: tramos.length,
    start: (i: number) => tramos[i]![0],
    end: (i: number) => tramos[i]![1],
  };
}

describe('video.ts', () => {
  it('fraccionVista suma los tramos reproducidos y divide entre la duración real', () => {
    expect(fraccionVista(rangos([0, 10], [20, 30]), 100)).toBeCloseTo(0.2, 10);
    expect(fraccionVista(rangos([0, 100]), 100)).toBe(1);
    expect(fraccionVista(rangos([0, 500]), 100)).toBe(1); // nunca pasa de 1
    expect(fraccionVista(rangos(), 100)).toBe(0);
  });

  it('saltar no suma: un tramo al final vale lo que dura, no su posición', () => {
    expect(fraccionVista(rangos([95, 100]), 100)).toBeCloseTo(0.05, 10);
  });

  it.each([[null], [undefined]])('sin rangos (%s) vale 0', (r) => {
    expect(fraccionVista(r, 100)).toBe(0);
  });

  it.each([[0], [-1], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'duración %s vale 0',
    (duracion) => {
      expect(fraccionVista(rangos([0, 10]), duracion)).toBe(0);
    },
  );

  it('ignora tramos invertidos o no finitos', () => {
    expect(
      fraccionVista(rangos([10, 5], [Number.NaN, 3], [0, Number.POSITIVE_INFINITY]), 100),
    ).toBe(0);
  });

  it('alcanzaUmbral: exactamente el umbral cuenta y justo por debajo no', () => {
    expect(alcanzaUmbral(UMBRAL_VIDEO_VISTO)).toBe(true);
    expect(alcanzaUmbral(0.9 - 1e-6)).toBe(false);
    expect(alcanzaUmbral(1)).toBe(true);
    expect(alcanzaUmbral(0)).toBe(false);
    expect(alcanzaUmbral(0.3 * 3)).toBe(true); // 0,8999999999999999 por coma flotante
  });

  it('limitarFraccion y redondear2', () => {
    expect(limitarFraccion(-1)).toBe(0);
    expect(limitarFraccion(2)).toBe(1);
    expect(limitarFraccion(Number.NaN)).toBe(0);
    expect(redondear2(0.666)).toBe(0.67);
    expect(redondear2(0.004)).toBe(0);
    expect(redondear2(3)).toBe(1);
  });

  it('formatearTiempo: m:ss y h:mm:ss; lo inválido es 0:00', () => {
    expect(formatearTiempo(0)).toBe('0:00');
    expect(formatearTiempo(5)).toBe('0:05');
    expect(formatearTiempo(65.9)).toBe('1:05');
    expect(formatearTiempo(600)).toBe('10:00');
    expect(formatearTiempo(3600)).toBe('1:00:00');
    expect(formatearTiempo(3725)).toBe('1:02:05');
    expect(formatearTiempo(-4)).toBe('0:00');
    expect(formatearTiempo(Number.NaN)).toBe('0:00');
    expect(formatearTiempo(Number.POSITIVE_INFINITY)).toBe('0:00');
  });

  it('indicePistaPorDefecto: español si hay; si no, la primera; sin pistas -1', () => {
    expect(indicePistaPorDefecto([])).toBe(-1);
    expect(indicePistaPorDefecto([{ idioma: 'en' }])).toBe(0);
    expect(indicePistaPorDefecto([{ idioma: 'en' }, { idioma: 'es' }])).toBe(1);
    expect(indicePistaPorDefecto([{ idioma: 'es' }, { idioma: 'en' }])).toBe(0);
  });

  it('duracionDePasoMs: entre 5 y 40 s, proporcional al texto y sin partir emojis', () => {
    expect(duracionDePasoMs('')).toBe(5000);
    expect(duracionDePasoMs('a'.repeat(100))).toBe(7000);
    expect(duracionDePasoMs('a'.repeat(5000))).toBe(40_000);
    expect(duracionDePasoMs('\u{1F9B4}'.repeat(100))).toBe(7000); // 100 caracteres, no 200 unidades
  });
});

describe('instantanea.ts', () => {
  it('animación: devuelve índices válidos y nunca el último paso', () => {
    expect(leerInstantaneaAnimacion({ paso: 1, maximo: 2 }, 4)).toEqual({ paso: 1, maximo: 2 });
    expect(leerInstantaneaAnimacion({ paso: 3, maximo: 3 }, 4)).toEqual({ paso: 2, maximo: 2 });
    expect(leerInstantaneaAnimacion({ paso: 0, maximo: 0 }, 2)).toEqual({ paso: 0, maximo: 0 });
    expect(leerInstantaneaAnimacion({ paso: 1, maximo: 1 }, 2)).toEqual({ paso: 0, maximo: 0 });
  });

  it.each([
    [undefined, 4],
    [{}, 4],
    [{ paso: 1, maximo: 2 }, 1],
    [{ paso: 1, maximo: 2 }, 0],
    [{ paso: 4, maximo: 4 }, 4],
    [{ paso: -1, maximo: 0 }, 4],
    [{ paso: 2, maximo: 1 }, 4],
    [{ paso: 1.2, maximo: 2 }, 4],
    [{ paso: '1', maximo: 2 }, 4],
    [{ paso: 1, maximo: null }, 4],
    [{ paso: Number.NaN, maximo: 2 }, 4],
  ])('animación: %j con %s pasos es inválida', (instantanea, total) => {
    expect(leerInstantaneaAnimacion(instantanea as never, total)).toBeNull();
  });

  it('video: acepta 0..1 y limita bajo el umbral; lo demás es null', () => {
    expect(leerInstantaneaVideo({ visto: 0 })).toBe(0);
    expect(leerInstantaneaVideo({ visto: 0.5 })).toBe(0.5);
    expect(leerInstantaneaVideo({ visto: 1 })).toBeCloseTo(UMBRAL_VIDEO_VISTO - 0.01, 10);
    for (const visto of [-0.1, 1.1, Number.NaN, '0.5', null, undefined, {}]) {
      expect(leerInstantaneaVideo({ visto } as never)).toBeNull();
    }
    expect(leerInstantaneaVideo(undefined)).toBeNull();
  });
});

const CABECERA = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400"';

describe('svgAnimacion.ts', () => {
  it('prepararSvg encuentra solo los <g id> hijos directos de la raíz, por su id original', () => {
    const { grupos, raiz } = prepararSvg(
      `${CABECERA} width="10" height="10">
        <title>t</title>
        <rect id="suelta" width="1" height="1"/>
        <g id="a"><g id="anidado"/></g>
        <g id="b"/>
        <g/>
      </svg>`,
      'p__',
      '0 0 800 400',
    );
    expect([...grupos.keys()]).toEqual(['a', 'b']);
    expect(raiz.getAttribute('width')).toBeNull();
    expect(raiz.getAttribute('viewBox')).toBe('0 0 800 400');
  });

  it('un id duplicado en la raíz conserva el primero', () => {
    const { grupos } = prepararSvg(
      `${CABECERA}><g id="a" data-n="1"/><g id="a" data-n="2"/></svg>`,
      'p__',
      '0 0 8 4',
    );
    expect(grupos.get('a')!.getAttribute('data-n')).toBe('1');
  });

  it('un grupo con id referenciado se sigue encontrando por su id original', () => {
    const { grupos, raiz } = prepararSvg(
      `${CABECERA}><g id="a"/><use href="#a"/></svg>`,
      'p__',
      '0 0 8 4',
    );
    expect(grupos.has('a')).toBe(true);
    expect(raiz.querySelector('use')!.getAttribute('href')).toBe('#p__a');
  });

  it.each([
    ['no es SVG', '<div/>', 'formato'],
    ['XML roto', `${CABECERA}><g>`, 'formato'],
    ['DOCTYPE', `<!DOCTYPE svg [<!ENTITY x "y">]>${CABECERA}/>`, 'formato'],
    ['ENTITY', `<!ENTITY x "y">${CABECERA}/>`, 'formato'],
    ['demasiado grande', `${CABECERA}>${' '.repeat(210 * 1024)}</svg>`, 'tamano'],
    ['vacío', '', 'formato'],
  ])('prepararSvg rechaza: %s', (_n, texto, motivo) => {
    try {
      prepararSvg(texto, 'p__', '0 0 8 4');
      expect.unreachable('debía lanzar');
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorSvg);
      expect((e as ErrorSvg).motivo).toBe(motivo);
    }
  });

  it('sanearSvg quita tabindex, xlink:href externo, javascript: y elementos activos', () => {
    const documento = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g id="a" tabindex="0" onmouseover="x()">
          <use xlink:href="http://e.com/x#y"/>
          <a href=" javascript:alert(1)"/>
          <set attributeName="x" to="1"/><style>g{}</style><script/>
        </g>
      </svg>`,
      'image/svg+xml',
    );
    const raiz = documento.documentElement;
    sanearSvg(raiz, 'p__');
    const texto = new XMLSerializer().serializeToString(raiz);
    expect(texto).not.toMatch(/tabindex|onmouseover|e\.com|javascript|<set|<style|<script/i);
  });

  it('aplicarPaso: muestra los visibles, oculta el resto y resalta con contorno más grueso', () => {
    const { raiz, grupos } = prepararSvg(
      `${CABECERA}>
        <g id="a"><rect width="1" height="1" stroke="#000" stroke-width="2"/></g>
        <g id="b"><rect width="1" height="1"/></g>
        <g id="c"/>
      </svg>`,
      'p__',
      '0 0 8 4',
    );
    aplicarPaso(grupos, { visibles: ['a', 'b'], resaltadas: ['a', 'b', 'c'] }, false);
    const [a, b, c] = ['a', 'b', 'c'].map((id) => raiz.querySelector(`#p__${id}`) as SVGElement);
    expect(a!.style.visibility).toBe('visible');
    expect(c!.style.visibility).toBe('hidden');
    expect(c!.getAttribute('data-estado')).toBe('oculta');
    expect(a!.querySelector('rect')!.getAttribute('stroke-width')).toBe('5'); // max(2*2, 2+3)
    // Sin contorno propio: se le da uno visible y grueso.
    expect(b!.querySelector('rect')!.getAttribute('stroke')).toBe('currentColor');
    expect(b!.querySelector('rect')!.getAttribute('stroke-width')).toBe('4'); // base 1 -> max(2, 4)
    // Un grupo oculto no se resalta aunque esté en `resaltadas`.
    expect(c!.hasAttribute('data-resaltada')).toBe(false);
    aplicarPaso(grupos, { visibles: ['a'], resaltadas: [] }, false);
    expect(a!.querySelector('rect')!.getAttribute('stroke-width')).toBe('2');
    expect(b!.querySelector('rect')!.hasAttribute('stroke')).toBe(false);
    expect(b!.querySelector('rect')!.hasAttribute('stroke-width')).toBe(false);
  });

  it('aplicarPaso con animar: transición de opacidad; sin animar: ninguna', () => {
    const { raiz, grupos } = prepararSvg(`${CABECERA}><g id="a"/></svg>`, 'p__', '0 0 8 4');
    const a = raiz.querySelector('#p__a') as SVGElement;
    aplicarPaso(grupos, { visibles: ['a'], resaltadas: [] }, true);
    expect(a.style.transition).toContain('opacity');
    aplicarPaso(grupos, { visibles: ['a'], resaltadas: [] }, false);
    expect(a.style.transition).toBe('none');
  });
});
