import { describe, expect, it } from 'vitest';
import { moduloPorNumero } from '@/data/modulos';
import { estadoDelModulo } from '@/components/menu/estados';
import { decidirAccesoModulo } from './acceso';
import { aperturaDelResumen, estadoDeTarjeta, estiloAcento, textoEstadoTarjeta } from './identidad';
import { bloqueoEfectivo } from './useAccesoModulos';

const contenidos = import.meta.glob<{
  default: { numero: number; subtitulo: string; resumen: string };
}>('../../modules/*/content.json', { eager: true });

describe('estiloAcento', () => {
  it('apunta a los tokens del módulo y al texto sobre el acento', () => {
    expect(estiloAcento(3)).toEqual({
      '--acento': 'var(--acento-m3)',
      '--acento-suave': 'var(--acento-m3-suave)',
      '--acento-sobre': 'var(--acento-sobre-m)',
    });
  });

  it('cada módulo del 1 al 6 tiene un estilo distinto', () => {
    const estilos = [1, 2, 3, 4, 5, 6].map((n) => JSON.stringify(estiloAcento(n)));
    expect(new Set(estilos).size).toBe(6);
  });

  it('un número fuera de rango deja el acento por defecto', () => {
    expect(estiloAcento(0)).toEqual({});
    expect(estiloAcento(7)).toEqual({});
    expect(estiloAcento(1.5)).toEqual({});
  });
});

describe('aperturaDelResumen', () => {
  it('quita el subtítulo repetido y deja la frase de gancho', () => {
    expect(
      aperturaDelResumen(
        'Generalidades y funciones del hueso. La mandíbula es el hilo conductor del módulo.',
        'Generalidades y funciones del hueso',
      ),
    ).toBe('La mandíbula es el hilo conductor del módulo.');
  });

  it('si el resumen solo repite el subtítulo no hay apertura', () => {
    expect(
      aperturaDelResumen('Origen y diferenciación celular.', 'Origen y diferenciación celular'),
    ).toBe('');
  });

  it('un resumen propio (que no empieza por el subtítulo) se conserva entero', () => {
    expect(aperturaDelResumen('Un recorrido distinto.', 'Otro subtítulo')).toBe(
      'Un recorrido distinto.',
    );
  });

  it('ignora mayúsculas, tildes y signos al comparar y el marcado Markdown', () => {
    expect(
      aperturaDelResumen(
        '**Mineralización**, del osteoide al hueso. Gancho.',
        'mineralizacion del osteoide al hueso',
      ),
    ).toBe('Gancho.');
  });

  it('con el contenido real de los módulos nunca repite el subtítulo y es parte del resumen', () => {
    const modulos = Object.values(contenidos).map((m) => m.default);
    expect(modulos.length).toBeGreaterThanOrEqual(1);
    for (const m of modulos) {
      const apertura = aperturaDelResumen(m.resumen, m.subtitulo);
      expect(m.resumen, `módulo ${m.numero}`).toContain(apertura);
      expect(apertura, `módulo ${m.numero}`).not.toBe(m.subtitulo);
    }
  });
});

describe('estadoDeTarjeta', () => {
  const con = (completados: number[], enCurso: number[] = [], bloqueoSecuencial = true) => ({
    completados,
    enCurso,
    bloqueoSecuencial,
  });

  it('cuenta nueva: el 1 está disponible y del 2 al 6 bloqueados', () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => estadoDeTarjeta(n, con([])))).toEqual([
      'disponible',
      'bloqueado',
      'bloqueado',
      'bloqueado',
      'bloqueado',
      'bloqueado',
    ]);
  });

  it('completado, en curso y disponible', () => {
    const o = con([1], [2]);
    expect(estadoDeTarjeta(1, o)).toBe('completado');
    expect(estadoDeTarjeta(2, o)).toBe('en_curso');
    expect(estadoDeTarjeta(3, o)).toBe('bloqueado');
    expect(estadoDeTarjeta(3, con([1, 2]))).toBe('disponible');
  });

  it('sin bloqueo (demos o docente) nada está bloqueado', () => {
    for (let n = 1; n <= 6; n++) {
      expect(estadoDeTarjeta(n, con([], [], false))).not.toBe('bloqueado');
    }
  });

  it('un módulo completado nunca aparece bloqueado, aunque falte el anterior', () => {
    expect(estadoDeTarjeta(4, con([4]))).toBe('completado');
  });

  it('coincide con la página y con el menú circular en las 64 combinaciones de completados', () => {
    for (let mascara = 0; mascara < 64; mascara++) {
      const completados = [1, 2, 3, 4, 5, 6].filter((n) => (mascara >> (n - 1)) & 1);
      for (const bloqueoSecuencial of [true, false]) {
        for (let n = 1; n <= 6; n++) {
          const nombre = `módulo ${n}, completados [${completados}], bloqueo ${bloqueoSecuencial}`;
          const tarjeta =
            estadoDeTarjeta(n, con(completados, [], bloqueoSecuencial)) === 'bloqueado';
          const menu = estadoDelModulo(n, {
            moduloActual: null,
            completados,
            bloqueoSecuencial,
          }).bloqueado;
          const pagina = !decidirAccesoModulo(n, completados, {
            bloqueoSecuencial,
            progresoConocido: true,
          }).permitido;
          expect(tarjeta, nombre).toBe(pagina);
          expect(menu, nombre).toBe(pagina);
        }
      }
    }
  });
});

describe('textoEstadoTarjeta', () => {
  it('el bloqueo dice qué módulo falta, con palabras', () => {
    expect(textoEstadoTarjeta('bloqueado', 2)).toBe('Completa el módulo 1 para abrirlo');
    expect(textoEstadoTarjeta('bloqueado', 6)).toBe('Completa el módulo 5 para abrirlo');
  });

  it('cada estado tiene un texto propio (no depende solo del color)', () => {
    const textos = (['bloqueado', 'completado', 'en_curso', 'disponible'] as const).map((e) =>
      textoEstadoTarjeta(e, 3),
    );
    expect(new Set(textos).size).toBe(4);
    expect(textoEstadoTarjeta('completado', 3)).toBe('Completado');
    expect(textoEstadoTarjeta('en_curso', 3)).toBe('En curso');
  });
});

describe('bloqueoEfectivo', () => {
  it('el docente nunca queda bloqueado; el estudiante y la sesión sin rol, según la configuración', () => {
    expect(bloqueoEfectivo(true, 'docente')).toBe(false);
    expect(bloqueoEfectivo(true, 'estudiante')).toBe(true);
    expect(bloqueoEfectivo(true, undefined)).toBe(true);
    expect(bloqueoEfectivo(false, 'estudiante')).toBe(false);
    expect(bloqueoEfectivo(false, 'docente')).toBe(false);
  });
});

describe('identidad de cada módulo (data/modulos.ts)', () => {
  it('sanity: los seis módulos existen', () => {
    for (let n = 1; n <= 6; n++) expect(moduloPorNumero(n)).toBeDefined();
  });
});
