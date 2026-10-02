/** Pruebas de la preparación del SVG (interpretar, sanear, marcar capas, zonas táctiles, ids). */
import { describe, expect, it } from 'vitest';
import { TAMANO_TACTIL_MIN_PX } from '@/activities/types';
import {
  ErrorSvg,
  actualizarEscala,
  anchoTactil,
  construirZonasTactiles,
  interpretarSvg,
  marcarCapas,
  medidasDeViewBox,
  prefijarIdsReferenciados,
  prefijoDeIds,
  prepararSvg,
  sanearSvg,
} from './svgCapas';
import { SVG_HUESO } from './utilesPrueba';

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const svg = (interior: string, atributos = 'viewBox="0 0 800 600"') =>
  `<svg ${NS} ${atributos}>${interior}</svg>`;

function codigoDe(texto: string): string | undefined {
  try {
    interpretarSvg(texto);
  } catch (e) {
    return e instanceof ErrorSvg ? e.codigo : 'otro';
  }
  return undefined;
}

describe('interpretarSvg', () => {
  it('acepta un SVG bien formado (también con BOM)', () => {
    expect(interpretarSvg(svg('<g id="a"/>')).localName).toBe('svg');
    expect(interpretarSvg(`\uFEFF${svg('<g id="a"/>')}`).localName).toBe('svg');
  });

  it('rechaza vacío, HTML, XML mal formado, otro espacio de nombres y DOCTYPE/ENTITY', () => {
    expect(codigoDe('')).toBe('invalido');
    expect(codigoDe('<html><body/></html>')).toBe('invalido');
    expect(codigoDe('<svg xmlns="http://www.w3.org/2000/svg"><g></svg>')).toBe('invalido');
    expect(codigoDe('<svg><g/></svg>')).toBe('invalido');
    expect(codigoDe('<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>')).toBe('peligroso');
    expect(codigoDe('<!ENTITY x "y">')).toBe('peligroso');
  });

  it('rechaza un archivo enorme', () => {
    expect(codigoDe(svg(`<!--${'x'.repeat(500 * 1024)}-->`))).toBe('demasiado_grande');
  });
});

describe('sanearSvg', () => {
  it('quita elementos prohibidos, atributos on*, href externos y url() externas', () => {
    const raiz = interpretarSvg(
      svg(
        `<script>1</script><style>a{}</style><foreignObject/><animate attributeName="x"/>
         <g id="a" onclick="x()" ONLOAD="y()"><rect fill="url(http://x.example/a)" width="1" height="1"/>
         <use href="https://x.example/a.svg#b"/><use href="#ok"/></g>`,
      ),
    );
    const quitado = sanearSvg(raiz);
    expect(quitado.elementos).toBe(4);
    expect(raiz.querySelector('script, style, foreignObject, animate')).toBeNull();
    const g = raiz.querySelector('g')!;
    expect(g.hasAttribute('onclick')).toBe(false);
    expect(Array.from(g.attributes).some((a) => a.name.toLowerCase() === 'onload')).toBe(false);
    expect(raiz.querySelector('rect')!.hasAttribute('fill')).toBe(false);
    const usos = raiz.querySelectorAll('use');
    expect(usos[0]!.hasAttribute('href')).toBe(false);
    expect(usos[1]!.getAttribute('href')).toBe('#ok');
  });

  it('es idempotente', () => {
    const raiz = interpretarSvg(svg('<g id="a" onclick="x()"/><script/>'));
    sanearSvg(raiz);
    expect(sanearSvg(raiz)).toEqual({ elementos: 0, atributos: 0 });
  });

  it('no deja que el archivo traiga las marcas propias del componente', () => {
    const raiz = interpretarSvg(
      svg('<g id="a" data-capa="falsa"><rect data-zona-auto="" width="1" height="1"/></g>'),
    );
    sanearSvg(raiz);
    expect(raiz.querySelector('[data-capa], [data-zona-auto]')).toBeNull();
  });
});

describe('marcarCapas', () => {
  it('busca dentro del SVG y no construye selectores con el id', () => {
    const raiz = interpretarSvg(
      svg('<g id="a&quot;b"/><g id="x y"/><g id="骨"/><g id="dup"/><g id="dup"/>'),
    );
    const capas = marcarCapas(raiz, ['a"b', 'x y', '骨', 'dup', 'falta']);
    expect([...capas.keys()]).toEqual(['a"b', 'x y', '骨', 'dup']);
    expect(raiz.querySelectorAll('[data-capa]')).toHaveLength(4);
    expect(capas.get('dup')).toBe(raiz.querySelectorAll('[id="dup"]')[0]);
  });
});

describe('zonas táctiles', () => {
  it('con relleno: clon transparente con pointer-events all, justo detrás de la forma', () => {
    const raiz = interpretarSvg(
      svg(
        '<g id="a"><circle cx="5" cy="5" r="4" fill="red" stroke="blue" stroke-width="3" opacity="0.5"/></g>',
      ),
    );
    const capas = marcarCapas(raiz, ['a']);
    expect(construirZonasTactiles(capas, 0.4)).toEqual({ propias: 0, clones: 1 });
    const [original, zona] = Array.from(raiz.querySelector('g')!.children);
    expect(original!.getAttribute('fill')).toBe('red');
    expect(zona!.getAttribute('data-zona-auto')).toBe('');
    expect(zona!.getAttribute('fill')).toBe('transparent');
    expect(zona!.getAttribute('pointer-events')).toBe('all');
    expect(zona!.hasAttribute('opacity')).toBe(false);
    expect(zona!.getAttribute('aria-hidden')).toBe('true');
  });

  it('solo contorno: pointer-events stroke y grosor mínimo de 44 / escala', () => {
    const raiz = interpretarSvg(
      svg(
        '<g id="a"><ellipse cx="5" cy="5" rx="4" ry="3" fill="none" stroke="#000" stroke-width="16"/></g>',
      ),
    );
    construirZonasTactiles(marcarCapas(raiz, ['a']), 0.4);
    const zona = raiz.querySelector('[data-zona-auto]')!;
    expect(zona.getAttribute('pointer-events')).toBe('stroke');
    expect(Number(zona.getAttribute('stroke-width'))).toBeCloseTo(TAMANO_TACTIL_MIN_PX / 0.4, 2);
    actualizarEscala(raiz, 1);
    expect(Number(zona.getAttribute('stroke-width'))).toBe(TAMANO_TACTIL_MIN_PX);
    actualizarEscala(raiz, 100); // dibujo enorme: nunca menos que el trazo original
    expect(Number(zona.getAttribute('stroke-width'))).toBe(16);
  });

  it('la zona propia (data-zona-toque o id {capa}_toque) sustituye a los clones', () => {
    for (const zonaXml of [
      '<g data-zona-toque=""><rect width="90" height="90" fill="red"/></g>',
      '<path id="a_toque" d="M0 0h9v9z" fill="red" stroke="red"/>',
    ]) {
      const raiz = interpretarSvg(svg(`<g id="a"><circle r="3" fill="red"/>${zonaXml}</g>`));
      expect(construirZonasTactiles(marcarCapas(raiz, ['a']), 0.4)).toEqual({
        propias: 1,
        clones: 0,
      });
      const forma = raiz.querySelector('rect, path')!;
      expect(forma.getAttribute('fill')).toBe('transparent');
      expect(forma.getAttribute('pointer-events')).toBe('all');
    }
  });

  it('ignora formas ocultas, invisibles, dentro de defs y de capas anidadas (las clona la anidada)', () => {
    const raiz = interpretarSvg(
      svg(`<g id="a">
        <defs><circle r="1" fill="red"/></defs>
        <rect width="1" height="1" fill="none"/>
        <rect width="1" height="1" fill="red" display="none"/>
        <rect width="1" height="1" fill="red" fill-opacity="0"/>
        <g id="b"><circle r="2" fill="red"/></g>
        <line x1="0" y1="0" x2="5" y2="5" stroke="red"/>
      </g>`),
    );
    const capas = marcarCapas(raiz, ['a', 'b']);
    const { clones } = construirZonasTactiles(capas, 0.4);
    expect(clones).toBe(2); // el círculo de b y la línea de a
    expect(raiz.querySelector('g[id="b"] [data-zona-auto]')).not.toBeNull();
    expect(raiz.querySelector('line + [data-zona-auto]')!.getAttribute('pointer-events')).toBe(
      'stroke',
    );
  });

  it('anchoTactil tolera escalas inválidas', () => {
    for (const e of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(Number.isFinite(anchoTactil(4, e))).toBe(true);
      expect(anchoTactil(4, e)).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('prefijarIdsReferenciados', () => {
  it('reescribe ids y referencias url(#) y href="#", y deja las capas sin tocar', () => {
    const raiz = interpretarSvg(
      svg(`<defs><linearGradient id="g"/><path id="p" d="M0 0"/></defs>
        <g id="capa_x"><rect fill="url('#g')" width="1" height="1"/><use href="#p"/></g>`),
    );
    const nuevos = prefijarIdsReferenciados(raiz, 'act__');
    expect([...nuevos.entries()].sort()).toEqual([
      ['g', 'act__g'],
      ['p', 'act__p'],
    ]);
    expect(raiz.querySelector('rect')!.getAttribute('fill')).toBe("url('#act__g')");
    expect(raiz.querySelector('use')!.getAttribute('href')).toBe('#act__p');
    expect(raiz.querySelector('g')!.getAttribute('id')).toBe('capa_x');
  });

  it('una referencia a un id que no existe no se reescribe', () => {
    const raiz = interpretarSvg(svg('<rect fill="url(#nadie)" width="1" height="1"/>'));
    expect(prefijarIdsReferenciados(raiz, 'a__').size).toBe(0);
    expect(raiz.querySelector('rect')!.getAttribute('fill')).toBe('url(#nadie)');
  });

  it('prefijoDeIds sustituye caracteres raros', () => {
    expect(prefijoDeIds('m1_capas')).toBe('m1_capas__');
    expect(prefijoDeIds('a b"c')).toBe('a_b_c__');
  });
});

describe('ids únicos por actividad', () => {
  const dibujo = svg(`<defs><linearGradient id="g"/></defs>
    <g id="fondo_escena" aria-labelledby="t"><title id="t">Escena</title><rect fill="url(#g)" width="4" height="4"/></g>
    <g id="capa_x"><rect width="2" height="2"/></g>`);
  const opciones = { idsCapas: ['capa_x', 'fondo_escena'], viewBox: '0 0 800 600' };

  it('prefija TODOS los ids (también los que nadie referencia) y reescribe aria-labelledby', () => {
    const r = prepararSvg(dibujo, { ...opciones, prefijoId: 'm5_a__' });
    const ids = Array.from(r.raiz.querySelectorAll('[id]'), (e) => e.id).sort();
    expect(ids).toEqual(['m5_a__capa_x', 'm5_a__fondo_escena', 'm5_a__g', 'm5_a__t']);
    expect(r.raiz.querySelector('g')!.getAttribute('aria-labelledby')).toBe('m5_a__t');
  });

  it('las capas se siguen buscando por su id original: el mapa y data-capa lo conservan', () => {
    const r = prepararSvg(dibujo, { ...opciones, prefijoId: 'm5_a__' });
    expect([...r.capas.keys()].sort()).toEqual(['capa_x', 'fondo_escena']);
    expect(r.capas.get('capa_x')!.id).toBe('m5_a__capa_x');
    expect(r.raiz.querySelector('[data-capa="capa_x"]')).toBe(r.capas.get('capa_x'));
  });

  it('dos dibujos iguales de actividades distintas, en el mismo documento, no repiten ids', () => {
    const a = prepararSvg(dibujo, { ...opciones, prefijoId: prefijoDeIds('m5_a') });
    const b = prepararSvg(dibujo, { ...opciones, prefijoId: prefijoDeIds('m5_b') });
    const contenedor = document.createElement('div');
    contenedor.append(a.raiz, b.raiz);
    const ids = Array.from(contenedor.querySelectorAll('[id]'), (e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(8);
  });

  it('las zonas táctiles clonadas no arrastran ids repetidos', () => {
    const r = prepararSvg(dibujo, { ...opciones, prefijoId: 'm5_a__' });
    const ids = Array.from(r.raiz.querySelectorAll('[id]'), (e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('prepararSvg', () => {
  it('con el SVG de muestra: viewBox, capas, atributos de accesibilidad y sin medidas fijas', () => {
    const r = prepararSvg(
      SVG_HUESO.replace('<svg ', '<svg width="9999" height="9999" style="position:fixed" '),
      {
        idsCapas: [
          'capa_periostio',
          'capa_hueso_compacto',
          'capa_hueso_esponjoso',
          'capa_medula_osea',
        ],
        prefijoId: 'm1__',
        viewBox: '0 0 800 600',
      },
    );
    expect(r.medidas).toEqual([800, 600]);
    expect(r.capas.size).toBe(4);
    expect(r.raiz.getAttribute('aria-hidden')).toBe('true');
    expect(r.raiz.getAttribute('class')).toBe('multicapa-svg');
    for (const a of ['width', 'height', 'style']) expect(r.raiz.hasAttribute(a)).toBe(false);
  });

  it('sin viewBox propio usa el de la configuración; con uno inválido, 800 x 600', () => {
    const base = { idsCapas: [], prefijoId: 'a__' };
    expect(prepararSvg(`<svg ${NS}/>`, { ...base, viewBox: '0 0 400 300' }).medidas).toEqual([
      400, 300,
    ]);
    expect(prepararSvg(`<svg ${NS}/>`, { ...base, viewBox: 'basura' }).medidas).toEqual([800, 600]);
  });

  it('medidasDeViewBox', () => {
    expect(medidasDeViewBox('0 0 800 600')).toEqual([800, 600]);
    expect(medidasDeViewBox('0,0,10.5,20')).toEqual([10.5, 20]);
    expect(medidasDeViewBox('0 0 0 5')).toBeNull();
    expect(medidasDeViewBox(null)).toBeNull();
    expect(medidasDeViewBox('a b c d')).toBeNull();
  });
});
