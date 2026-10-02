/** Pruebas de los ids únicos por actividad (idsUnicos.ts). */
import { describe, expect, it } from 'vitest';
import { prefijarIdsRestantes, prefijoDeIds } from './idsUnicos';

function raizDe(interior: string): Element {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${interior}</svg>`,
    'image/svg+xml',
  );
  return doc.documentElement;
}

describe('prefijoDeIds', () => {
  it('cambia los caracteres raros por guion bajo y termina en doble guion bajo', () => {
    expect(prefijoDeIds('m1_capas')).toBe('m1_capas__');
    expect(prefijoDeIds('a b"c<d>')).toBe('a_b_c_d___');
  });
});

describe('prefijarIdsRestantes', () => {
  it('antepone el prefijo a todos los ids, incluido el de la raíz', () => {
    const raiz = raizDe('<g id="a"><rect id="b"/></g><g id="c"/>');
    raiz.setAttribute('id', 'raiz');
    const nuevos = prefijarIdsRestantes(raiz, 'p__');
    expect([...nuevos.entries()].sort()).toEqual([
      ['a', 'p__a'],
      ['b', 'p__b'],
      ['c', 'p__c'],
      ['raiz', 'p__raiz'],
    ]);
    expect(Array.from(raiz.querySelectorAll('[id]'), (e) => e.id)).toEqual([
      'p__a',
      'p__b',
      'p__c',
    ]);
  });

  it('es idempotente y no toca los ids que ya llevan el prefijo (los referenciados)', () => {
    const raiz = raizDe('<defs><linearGradient id="p__g"/></defs><g id="a"/>');
    prefijarIdsRestantes(raiz, 'p__');
    prefijarIdsRestantes(raiz, 'p__');
    expect(Array.from(raiz.querySelectorAll('[id]'), (e) => e.id)).toEqual(['p__g', 'p__a']);
  });

  it('reescribe las listas de ids de aria-labelledby y aria-describedby, y deja las que no existen', () => {
    const raiz = raizDe(
      '<title id="t"/><desc id="d"/><g aria-labelledby="t d fuera" aria-describedby="d"/>',
    );
    prefijarIdsRestantes(raiz, 'p__');
    const g = raiz.querySelector('g')!;
    expect(g.getAttribute('aria-labelledby')).toBe('p__t p__d fuera');
    expect(g.getAttribute('aria-describedby')).toBe('p__d');
  });

  it('dos dibujos con el mismo id, prefijados distinto, ya no chocan', () => {
    const uno = raizDe('<g id="fondo_escena"/>');
    const dos = raizDe('<g id="fondo_escena"/>');
    prefijarIdsRestantes(uno, 'm5_a__');
    prefijarIdsRestantes(dos, 'm5_b__');
    expect(uno.querySelector('g')!.id).not.toBe(dos.querySelector('g')!.id);
  });

  it('sin ids no cambia nada', () => {
    expect(prefijarIdsRestantes(raizDe('<g/>'), 'p__').size).toBe(0);
  });
});
