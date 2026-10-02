/**
 * Contraste WCAG AA de los seis acentos de módulo (tokens `--acento-mN` de style.css), en tema
 * claro y oscuro, calculado con la fórmula de WCAG 2.x sobre los valores reales del CSS.
 *
 * Además de exigir >= 4.5:1 (texto normal) en cada par que se usa, se comparan con valores de
 * referencia calculados a mano: si alguien cambia un color sin querer, la prueba avisa aunque el
 * nuevo valor siga pasando.
 */
import { describe, expect, it } from 'vitest';

// Se lee style.css como texto. Vitest sustituye por vacío el CSS que se importa (incluso con `?raw`) y
// el proyecto no incluye los tipos de Node, así que se usa `fs` mediante `process.getBuiltinModule`.
const nodo = (
  globalThis as unknown as {
    process: {
      cwd(): string;
      getBuiltinModule(nombre: string): {
        readFileSync(ruta: string, codificacion: string): string;
      };
    };
  }
).process;
// Vitest corre desde la carpeta del paquete (apps/web).
const css = nodo.getBuiltinModule('node:fs').readFileSync(`${nodo.cwd()}/src/style.css`, 'utf-8');

/* ----- Fórmula WCAG 2.x ----- */

function canal(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro! + 0.05) / (oscuro! + 0.05);
}

/* ----- Lectura de los tokens del CSS ----- */

function tokens(bloques: readonly string[]): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const bloque of bloques) {
    for (const m of bloque.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
      mapa.set(m[1]!, m[2]!.toLowerCase());
    }
  }
  return mapa;
}

function bloquesDe(selector: RegExp): string[] {
  return [...css.matchAll(selector)].map((m) => m[1]!);
}

const CLARO = tokens(bloquesDe(/:root\s*\{([^}]*)\}/g));
const OSCURO = tokens(bloquesDe(/\.dark\s*\{([^}]*)\}/g));

const TEMAS = [
  { nombre: 'claro', t: CLARO },
  { nombre: 'oscuro', t: OSCURO },
] as const;

/** Contrastes de referencia (calculados con la misma fórmula) por módulo, en este orden:
 *  acento sobre tarjeta, sobre lámina (fondo), sobre su fondo suave y texto sobre el acento. */
const REFERENCIA: Record<
  'claro' | 'oscuro',
  readonly (readonly [number, number, number, number])[]
> = {
  claro: [
    [10.84, 10.02, 8.92, 10.84],
    [6.4, 5.91, 5.37, 6.4],
    [6.15, 5.69, 5.31, 6.15],
    [5.93, 5.48, 5.09, 5.93],
    [6.2, 5.73, 5.23, 6.2],
    [7.12, 6.58, 5.8, 7.12],
  ],
  oscuro: [
    [8.64, 9.29, 7.33, 8.81],
    [7.49, 8.05, 6.58, 7.63],
    [10.37, 11.15, 8.36, 10.57],
    [10.48, 11.27, 8.44, 10.69],
    [9.95, 10.7, 7.91, 10.14],
    [9.22, 9.92, 7.78, 9.4],
  ],
};

describe('fórmula de contraste (valores de referencia conocidos)', () => {
  it('coincide con los ejemplos canónicos de WCAG', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // #767676 sobre blanco: el gris más claro que aún cumple AA (4.54:1).
    expect(contraste('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    // #777777 sobre blanco: 4.48:1, no llega a AA.
    expect(contraste('#777777', '#ffffff')).toBeLessThan(4.5);
  });

  it('encuentra los tokens base de cada tema en style.css', () => {
    expect(CLARO.get('background')).toBe('#f7f5fb');
    expect(CLARO.get('card')).toBe('#ffffff');
    expect(OSCURO.get('background')).toBe('#131025');
    expect(OSCURO.get('card')).toBe('#1b1731');
  });
});

describe.each(TEMAS)('acentos de módulo en tema $nombre', ({ nombre, t }) => {
  const sobre = t.get('acento-sobre-m')!;

  it('define seis acentos, seis fondos suaves y el color del texto sobre el acento', () => {
    for (let n = 1; n <= 6; n++) {
      expect(t.get(`acento-m${n}`), `acento-m${n}`).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.get(`acento-m${n}-suave`), `acento-m${n}-suave`).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(sobre).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('los seis acentos son distintos entre sí', () => {
    const acentos = [1, 2, 3, 4, 5, 6].map((n) => t.get(`acento-m${n}`));
    expect(new Set(acentos).size).toBe(6);
  });

  for (let n = 1; n <= 6; n++) {
    it(`módulo ${n}: cumple AA (4.5:1) en tarjeta, lámina, fondo suave y con texto encima`, () => {
      const acento = t.get(`acento-m${n}`)!;
      const suave = t.get(`acento-m${n}-suave`)!;
      const card = t.get('card')!;
      const fondo = t.get('background')!;
      const texto = t.get('foreground')!;
      const apagado = t.get('muted-foreground')!;

      const medidos = [
        contraste(acento, card),
        contraste(acento, fondo),
        contraste(acento, suave),
        contraste(sobre, acento),
      ];
      for (const [i, c] of medidos.entries()) {
        expect(c, `par ${i} del módulo ${n} (${nombre})`).toBeGreaterThanOrEqual(4.5);
      }
      // El texto normal y el atenuado también se leen sobre el fondo suave.
      expect(contraste(texto, suave)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(apagado, suave)).toBeGreaterThanOrEqual(4.5);

      // Valores de referencia (tolerancia de redondeo).
      const referencia = REFERENCIA[nombre][n - 1]!;
      medidos.forEach((c, i) => expect(c).toBeCloseTo(referencia[i]!, 1));
    });
  }
});

describe('el acento por defecto (fuera de un módulo) es el color primario', () => {
  it('--acento, --acento-suave y --acento-sobre apuntan a los tokens existentes', () => {
    expect(css).toMatch(/--acento:\s*var\(--primary\)/);
    expect(css).toMatch(/--acento-suave:\s*var\(--secondary\)/);
    expect(css).toMatch(/--acento-sobre:\s*var\(--primary-foreground\)/);
  });

  it('los tokens existentes no cambiaron (paleta H&E)', () => {
    expect(CLARO.get('primary')).toBe('#3b2f86');
    expect(CLARO.get('eosina')).toBe('#b23a5f');
    expect(OSCURO.get('primary')).toBe('#b9adff');
    expect(OSCURO.get('eosina')).toBe('#f58aa8');
  });
});
