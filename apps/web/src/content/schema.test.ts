import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ActividadActual } from '@/stores/contextoPedagogico';
import { PATRON_ACTIVITY_ID_API, PATRON_ID } from './constantes';
import { listarActividades } from './consultas';
import {
  ActividadSchema,
  BloqueSchema,
  ConfigExploracion3dSchema,
  IdActividadSchema,
  IdSchema,
  TIPOS_ACTIVIDAD,
} from './schema';
import type { Actividad, ActividadDe, Bloque, TipoActividad } from './schema';
import {
  agregarA,
  borrar,
  fijar,
  leer,
  muestra,
  rutaActividad,
  rutaBloque,
  validar,
  validarCon,
} from './__fixtures__/utiles';
import type { ResultadoValidacion } from './__fixtures__/utiles';

/** ¿Algún error de zod contiene TODOS los fragmentos? (`ruta.con.puntos: mensaje`) */
function hay(resultado: ResultadoValidacion, ...fragmentos: string[]): boolean {
  return resultado.issues.some((i) => fragmentos.every((f) => i.includes(f)));
}

function esperarError(resultado: ResultadoValidacion, ...fragmentos: string[]): void {
  expect(resultado.ok).toBe(false);
  expect(
    hay(resultado, ...fragmentos),
    `se esperaba un error con ${JSON.stringify(fragmentos)}; hay:\n${resultado.issues.join('\n')}`,
  ).toBe(true);
}

/** Aplica `cambio` a la actividad `id` de una copia de la muestra y valida. */
function conActividad(id: string, cambio: (actividad: Record<string, unknown>) => void) {
  return validarCon((datos) =>
    cambio(leer(datos, rutaActividad(datos, id)) as Record<string, unknown>),
  );
}

function conConfig(id: string, cambio: (config: Record<string, unknown>) => void) {
  return conActividad(id, (a) => cambio(a.config as Record<string, unknown>));
}

describe('módulo de muestra', () => {
  it('es válido y usa TODOS los tipos de bloque y de actividad', () => {
    const r = validar(muestra());
    expect(r.errores).toEqual([]);
    expect(r.ok).toBe(true);
    const modulo = r.modulo!;
    const tiposBloque = new Set(modulo.secciones.flatMap((s) => s.bloques.map((b) => b.tipo)));
    expect([...tiposBloque].sort()).toEqual(['actividad', 'callout', 'imagen', 'tabla', 'texto']);
    const tiposActividad = new Set(listarActividades(modulo).map((u) => u.actividad.tipo));
    expect([...tiposActividad].sort()).toEqual([...TIPOS_ACTIVIDAD].sort());
  });

  it('cubre las dos variantes de multicapa, de video-texto, de 3D y los tres formatos de pregunta', () => {
    const modulo = validar(muestra()).modulo!;
    const actividades = listarActividades(modulo).map((u) => u.actividad);
    const modos = actividades.flatMap((a) => (a.tipo === 'multicapa' ? [a.config.modo] : []));
    expect(modos.sort()).toEqual(['explorar', 'identificar']);
    const medios = actividades.flatMap((a) => (a.tipo === 'video-texto' ? [a.config.medio] : []));
    expect(medios.sort()).toEqual(['animacion', 'video']);
    const modelos = actividades.flatMap((a) =>
      a.tipo === 'exploracion-3d' ? [a.config.modelo] : [],
    );
    expect(modelos.sort()).toEqual(['celulas', 'mandibula']);
    const quiz = actividades.find((a) => a.tipo === 'quiz');
    const formatos = quiz?.tipo === 'quiz' ? quiz.config.preguntas.map((p) => p.formato) : [];
    expect(new Set(formatos)).toEqual(new Set(['opcion_multiple', 'verdadero_falso', 'ordenar']));
    const variantes = modulo.secciones.flatMap((s) =>
      s.bloques.flatMap((b) => (b.tipo === 'callout' ? [b.variante] : [])),
    );
    expect(new Set(variantes)).toEqual(new Set(['clinico', 'dato', 'atencion', 'recuerda']));
  });

  it('aplica los valores por defecto (obligatoria, penalización, barajar, forma...)', () => {
    const datos = muestra();
    borrar(datos, [...rutaActividad(datos, 'm1_celulas_funciones'), 'obligatoria']);
    const modulo = validar(datos).modulo!;
    const relacion = listarActividades(modulo).find(
      (u) => u.actividad.id === 'm1_celulas_funciones',
    )!;
    expect(relacion.actividad.obligatoria).toBe(true);
    expect(relacion.actividad.penalizacion).toEqual({ por_intento: 0.1, piso: 0.4 });
    const arrastre = listarActividades(modulo).find(
      (u) => u.actividad.id === 'm1_senales_remodelado',
    )!;
    // La muestra solo indica por_intento: el piso toma el valor por defecto.
    expect(arrastre.actividad.penalizacion).toEqual({ por_intento: 0.15, piso: 0.4 });
    expect(modulo.referencias[0]?.verificada).toBe(false);
  });

  it('el resultado del parseo vuelve a validar (idempotente)', () => {
    const primero = validar(muestra()).modulo!;
    const segundo = validar(structuredClone(primero));
    expect(segundo.errores).toEqual([]);
    expect(segundo.modulo).toEqual(primero);
  });

  it('los objetos son estrictos: un campo desconocido es un error', () => {
    esperarError(
      validarCon((d) => fijar(d, ['titulo_corto'], 'x')),
      'Unrecognized key',
    );
    esperarError(
      conActividad('m1_quiz_repaso', (a) => {
        a.puntaje_maximo = 50;
      }),
      'Unrecognized key',
    );
  });
});

describe('tipos', () => {
  it('los 6 tipos de actividad son EXACTAMENTE los del contexto pedagógico', () => {
    expectTypeOf<TipoActividad>().toEqualTypeOf<ActividadActual['tipo']>();
    expect([...TIPOS_ACTIVIDAD]).toEqual([
      'multicapa',
      'arrastre-molecular',
      'relacion-columnas',
      'quiz',
      'video-texto',
      'exploracion-3d',
    ]);
  });

  it('cada tipo de actividad tiene su variante en la unión', () => {
    expectTypeOf<ActividadDe<'quiz'>['config']['preguntas']>().toBeArray();
    expectTypeOf<Actividad['tipo']>().toEqualTypeOf<TipoActividad>();
    expectTypeOf<Bloque['tipo']>().toEqualTypeOf<
      'texto' | 'imagen' | 'callout' | 'tabla' | 'actividad' | 'escenarios' | 'pregunta'
    >();
  });
});

describe('ids', () => {
  it.each(['a', 'capa_periostio', 'm1_capas_hueso', 'x9', 'a'.repeat(64)])(
    'acepta "%s" y encaja también en el patrón de activity_id de la API',
    (id) => {
      expect(IdSchema.safeParse(id).success).toBe(true);
      expect(IdActividadSchema.safeParse(id).success).toBe(true);
      expect(PATRON_ID.test(id)).toBe(true);
      expect(PATRON_ACTIVITY_ID_API.test(id)).toBe(true);
    },
  );

  it.each(['', 'Capa', '1capa', 'capa-x', 'capá', 'capa x', '_capa', 'a'.repeat(65), 'capa.x'])(
    'rechaza "%s"',
    (id) => {
      expect(IdSchema.safeParse(id).success).toBe(false);
      expect(IdActividadSchema.safeParse(id).success).toBe(false);
    },
  );

  it('todo id válido de actividad cumple el patrón de la API', () => {
    // PATRON_ID (letra minúscula + [a-z0-9_]) es un subconjunto de ^[a-z0-9_-]{1,64}$.
    const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789_';
    for (let i = 0; i < 500; i++) {
      const largo = 1 + Math.floor(Math.random() * 64);
      let id = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]!;
      while (id.length < largo) id += alfabeto[Math.floor(Math.random() * alfabeto.length)]!;
      expect(PATRON_ID.test(id)).toBe(true);
      expect(PATRON_ACTIVITY_ID_API.test(id), id).toBe(true);
    }
  });

  it('un id de actividad debe empezar por el id del módulo (m1_)', () => {
    esperarError(
      conActividad('m1_quiz_repaso', (a) => {
        a.id = 'quiz_repaso';
      }),
      'debe empezar por "m1_"',
    );
    // "m2_" tampoco vale en el módulo 1.
    esperarError(
      conActividad('m1_quiz_repaso', (a) => {
        a.id = 'm2_quiz_repaso';
      }),
      'debe empezar por "m1_"',
    );
  });

  it('un id con mayúsculas o guion es un error en cualquier nivel', () => {
    esperarError(
      conActividad('m1_quiz_repaso', (a) => {
        a.id = 'm1-Quiz';
      }),
      'Id inválido',
    );
    esperarError(
      validarCon((d) => fijar(d, ['secciones', 0, 'id'], 'Sección Uno')),
      'secciones.0.id',
      'Id inválido',
    );
  });
});

describe('ids únicos: alcance de módulo y alcance de actividad', () => {
  it('una sección no puede llamarse igual que una capa', () => {
    const r = validarCon((d) => fijar(d, ['secciones', 1, 'id'], 'capa_periostio'));
    esperarError(r, 'secciones.1.id', 'Id duplicado "capa_periostio"');
    expect(r.errores.join('\n')).toContain('ya se usó como capa en secciones[0]');
  });

  it('las opciones de dos preguntas no pueden compartir id', () => {
    const r = conConfig('m1_quiz_repaso', (config) => {
      const preguntas = config.preguntas as { opciones?: { id: string }[] }[];
      preguntas[1]!.opciones![0]!.id = 'qr_p1_a';
    });
    esperarError(r, 'Id duplicado "qr_p1_a"', '(opcion)');
  });

  it('los ids de par, opción, receptor, elemento, paso y nodo pueden repetirse ENTRE actividades', () => {
    // Un par de moléculas y un par de columnas de actividades distintas pueden llamarse igual.
    const r = conConfig('m1_senales_remodelado', (config) => {
      (config.pares as { id: string }[])[0]!.id = 'par_osteoblasto';
    });
    expect(r.ok, r.errores.join('\n')).toBe(true);

    // Una segunda escena 3D de la mandíbula, con los mismos nodos que la primera (`cuerpo`...).
    const dosEscenas = validarCon((d) => {
      const original = leer(d, rutaActividad(d, 'm1_explora_mandibula')) as Record<string, unknown>;
      const copia = structuredClone(original);
      copia.id = 'm1_explora_mandibula_otra';
      agregarA(d, ['secciones', 2, 'bloques'], { tipo: 'actividad', actividad: copia });
    });
    expect(dosEscenas.ok, dosEscenas.errores.join('\n')).toBe(true);

    // Las opciones de dos quizzes distintos tampoco chocan.
    const dosQuizzes = validarCon((d) => {
      const original = leer(d, rutaActividad(d, 'm1_quiz_repaso')) as Record<string, unknown>;
      const copia = structuredClone(original) as {
        id: string;
        config: { preguntas: { id: string }[] };
      };
      copia.id = 'm1_quiz_repaso_otro';
      // Las preguntas sí son de alcance módulo: se renombran; las opciones se quedan iguales.
      copia.config.preguntas.forEach((p, i) => {
        p.id = `otro_p${i + 1}`;
      });
      agregarA(d, ['secciones', 3, 'bloques'], { tipo: 'actividad', actividad: copia });
    });
    expect(dosQuizzes.ok, dosQuizzes.errores.join('\n')).toBe(true);
  });

  it('dentro de una actividad los ids no se repiten, sea cual sea su tipo', () => {
    esperarError(
      conConfig('m1_senales_remodelado', (config) => {
        (config.pares as { id: string }[])[1]!.id = 'par_rankl_rank';
      }),
      'Id duplicado "par_rankl_rank"',
      'dentro de la actividad "m1_senales_remodelado"',
    );
    // Una opción con el mismo id que otra pregunta de su quiz también choca.
    esperarError(
      conConfig('m1_quiz_repaso', (config) => {
        const preguntas = config.preguntas as { id: string; opciones?: { id: string }[] }[];
        preguntas[0]!.opciones![0]!.id = 'qr_p2';
      }),
      'Id duplicado "qr_p2"',
    );
  });

  it('capa, molécula y pregunta siguen siendo únicas en todo el módulo', () => {
    esperarError(
      conConfig('m1_identifica_celulas', (config) => {
        const capas = config.capas as { id: string }[];
        capas[0]!.id = 'capa_periostio';
        config.requeridas = ['capa_periostio', 'histo_osteocito', 'histo_osteoclasto'];
      }),
      'Id duplicado "capa_periostio"',
      'no se repiten en un módulo',
    );
    esperarError(
      conConfig('m1_quiz_repaso', (config) => {
        (config.preguntas as { id: string }[])[1]!.id = 'qr_p1';
      }),
      'Id duplicado "qr_p1"',
      '(pregunta)',
    );
  });

  it('un bloque y una actividad no pueden compartir id', () => {
    const r = validarCon((d) => fijar(d, [...rutaBloque(d, 'c_calcio'), 'id'], 'm1_capas_hueso'));
    esperarError(r, 'Id duplicado "m1_capas_hueso"', 'ya se usó como bloque');
  });

  it('un nodo 3D puede llamarse como una capa de otra actividad (el índice del mentor lleva la actividad)', () => {
    const r = conConfig('m1_identifica_celulas', (config) => {
      const capas = config.capas as { id: string }[];
      capas[0]!.id = 'osteocito';
      config.requeridas = ['osteocito', 'histo_osteocito', 'histo_osteoclasto'];
    });
    expect(r.ok, r.errores.join('\n')).toBe(true);
  });

  it('el glosario y las referencias tienen su propio espacio: un término puede llamarse como un nodo', () => {
    // La muestra ya lo hace: el término "osteoblasto" y el nodo 3D "osteoblasto" conviven.
    const modulo = validar(muestra()).modulo!;
    expect(modulo.glosario.map((t) => t.id)).toContain('osteoblasto');
    const nodos = listarActividades(modulo).flatMap((u) =>
      u.actividad.tipo === 'exploracion-3d' ? u.actividad.config.nodos.map((n) => n.id) : [],
    );
    expect(nodos).toContain('osteoblasto');
  });

  it('el glosario y las referencias no repiten ids internamente', () => {
    esperarError(
      validarCon((d) => fijar(d, ['glosario', 1, 'id'], 'osteoblasto')),
      'Id duplicado "osteoblasto" en "glosario"',
    );
    esperarError(
      validarCon((d) =>
        agregarA(d, ['referencias'], {
          id: 'ref_junqueira',
          cita: 'Otra edición del mismo libro de texto de histología.',
        }),
      ),
      'Id duplicado "ref_junqueira" en "referencias"',
    );
  });

  it('el id "inicio" está reservado para la sección', () => {
    esperarError(
      validarCon((d) => fijar(d, ['secciones', 0, 'id'], 'inicio')),
      'secciones.0.id',
      'reservado',
    );
  });
});

describe('actividad multicapa', () => {
  const ID = 'm1_capas_hueso';

  it('una capa requerida debe existir', () => {
    esperarError(
      conConfig(ID, (c) => {
        c.requeridas = ['capa_periostio', 'capa_fantasma'];
      }),
      'config.requeridas.1',
      'no existe en "capas"',
    );
  });

  it('las capas requeridas no se repiten', () => {
    esperarError(
      conConfig(ID, (c) => {
        c.requeridas = ['capa_periostio', 'capa_periostio'];
      }),
      'está repetida',
    );
  });

  it('hacen falta al menos 2 capas y 1 requerida', () => {
    esperarError(
      conConfig(ID, (c) => {
        c.capas = (c.capas as unknown[]).slice(0, 1);
        c.requeridas = ['capa_periostio'];
      }),
      'config.capas',
      'Too small',
    );
    esperarError(
      conConfig(ID, (c) => {
        c.requeridas = [];
      }),
      'config.requeridas',
      'Too small',
    );
  });

  it('en modo identificar cada capa requerida necesita pista; en explorar no', () => {
    const conPista = conConfig('m1_identifica_celulas', () => undefined);
    expect(conPista.ok).toBe(true);
    esperarError(
      conConfig('m1_identifica_celulas', (c) => {
        delete (c.capas as Record<string, unknown>[])[1]!.pista;
      }),
      'config.capas.1.pista',
      'necesita "pista"',
    );
    // Una capa que NO es requerida puede no tener pista.
    const sinPistaEnOpcional = conConfig('m1_identifica_celulas', (c) => {
      delete (c.capas as Record<string, unknown>[])[2]!.pista;
      delete (c.capas as Record<string, unknown>[])[2]!.pistas_extra;
      c.requeridas = ['histo_osteoblasto', 'histo_osteocito'];
    });
    expect(sinPistaEnOpcional.ok).toBe(true);
  });

  it('en modo identificar se exige retroalimentacion.incorrecta; en explorar no', () => {
    esperarError(
      conActividad('m1_identifica_celulas', (a) => {
        delete (a.retroalimentacion as Record<string, unknown>).incorrecta;
      }),
      'retroalimentacion.incorrecta',
    );
    expect(
      conActividad('m1_capas_hueso', (a) => {
        a.retroalimentacion = { correcta: 'Muy bien: completaste la exploración.' };
      }).ok,
    ).toBe(true);
  });

  it.each([
    ['con mayúsculas', '/images/m1/HuesoCapas.svg'],
    ['con espacios', '/images/m1/hueso capas.svg'],
    ['sin carpeta de módulo', '/images/hueso_capas.svg'],
    ['con otra extensión', '/images/m1/hueso_capas.png'],
    ['con URL externa', 'https://ejemplo.org/hueso.svg'],
    ['relativa', 'images/m1/hueso_capas.svg'],
  ])('rechaza una ruta de SVG %s', (_nombre, ruta) => {
    esperarError(
      conConfig(ID, (c) => {
        c.svg = ruta;
      }),
      'config.svg',
      'Ruta de SVG inválida',
    );
  });

  it.each(['0 0 800', '0 0 800 600 1', '10 10 800 600', '0 0 0 600', '0 0 800.5 600', '800 600'])(
    'rechaza el viewBox "%s"',
    (viewBox) => {
      esperarError(
        conConfig(ID, (c) => {
          c.viewBox = viewBox;
        }),
        'config.viewBox',
        'viewBox inválido',
      );
    },
  );

  it('el texto alternativo de la imagen completa es obligatorio', () => {
    esperarError(
      conConfig(ID, (c) => {
        delete c.alt;
      }),
      'config.alt',
    );
    esperarError(
      conConfig(ID, (c) => {
        c.alt = 'corto';
      }),
      'config.alt',
      'Mínimo 10',
    );
  });
});

describe('actividad arrastre-molecular', () => {
  const ID = 'm1_senales_remodelado';
  type Lista = Record<string, unknown>[];

  it('un par debe apuntar a una molécula y a un receptor que existan', () => {
    esperarError(
      conConfig(ID, (c) => {
        (c.pares as Lista)[0]!.molecula = 'mol_fantasma';
      }),
      'config.pares.0.molecula',
      'no existe en "moleculas"',
    );
    esperarError(
      conConfig(ID, (c) => {
        (c.pares as Lista)[1]!.receptor = 'rec_fantasma';
      }),
      'config.pares.1.receptor',
      'no existe en "receptores"',
    );
  });

  it('una molécula encaja en un solo receptor, pero un receptor puede aceptar varias moléculas', () => {
    esperarError(
      conConfig(ID, (c) => {
        (c.pares as Lista)[1]!.molecula = 'mol_rankl';
      }),
      'config.pares.1.molecula',
      'más de un par',
    );
    // Competencia: dos moléculas distintas en el mismo receptor (Wnt y esclerostina en LRP5/6).
    const compartido = conConfig(ID, (c) => {
      (c.moleculas as Lista)[2] = {
        id: 'mol_opg',
        etiqueta: 'Esclerostina',
        descripcion: 'Antagonista que bloquea al receptor y frena la vía.',
      };
      c.distractores = [];
      (c.pares as Lista).push({
        id: 'par_esclerostina_rank',
        molecula: 'mol_opg',
        receptor: 'rec_rank',
        efecto: {
          titulo: 'El receptor se bloquea',
          descripcion: 'La señal se frena y baja la formación de osteoclastos.',
          animacion: 'inhibicion',
        },
      });
    });
    expect(compartido.ok, compartido.errores.join('\n')).toBe(true);
  });

  it('un distractor necesita "rechazo": es el único texto que recibe el estudiante', () => {
    esperarError(
      conConfig(ID, (c) => {
        delete (c.moleculas as Lista)[2]!.rechazo;
      }),
      'config.moleculas.2.rechazo',
      'es distractor: escribe "rechazo"',
    );
  });

  it('todo receptor debe tener par', () => {
    esperarError(
      conConfig(ID, (c) => {
        (c.receptores as Lista).push({
          id: 'rec_extra',
          etiqueta: 'Extra',
          descripcion: 'Un receptor que nadie usa en la actividad.',
          posicion: { x: 50, y: 20 },
        });
      }),
      'config.receptores.2',
      'no tiene par',
    );
  });

  it('un distractor no puede formar un par, y toda molécula es de un par o distractor', () => {
    esperarError(
      conConfig(ID, (c) => {
        c.distractores = ['mol_opg', 'mol_rankl'];
      }),
      'config.distractores.1',
      'también forma un par',
    );
    esperarError(
      conConfig(ID, (c) => {
        c.distractores = [];
      }),
      'config.moleculas.2',
      'no forma ningún par',
    );
    esperarError(
      conConfig(ID, (c) => {
        c.distractores = ['mol_opg', 'mol_inexistente'];
      }),
      'config.distractores.1',
      'no existe en "moleculas"',
    );
  });

  it('los receptores no pueden solaparse: mínimo 52 px en un teléfono de 320 px de ancho', () => {
    // viewBox 800x600 a 320 px: 1 % del ancho = 3,2 px.
    esperarError(
      conConfig(ID, (c) => {
        (c.receptores as Lista)[1]!.posicion = { x: 35, y: 55 };
      }),
      'config.receptores.1.posicion',
      'deben separarse al menos 52 px',
    );
    expect(
      conConfig(ID, (c) => {
        (c.receptores as Lista)[1]!.posicion = { x: 42, y: 55 };
      }).ok,
    ).toBe(true);
  });

  it('la distancia se mide en píxeles: el mismo porcentaje en vertical vale distinto según el viewBox', () => {
    const cerca = (viewBox: string) =>
      conConfig(ID, (c) => {
        (c.escena as { viewBox: string }).viewBox = viewBox;
        (c.receptores as Lista)[0]!.posicion = { x: 50, y: 20 };
        (c.receptores as Lista)[1]!.posicion = { x: 50, y: 38 };
      });
    // 18 puntos de alto en un viewBox 800x600 son 43 px; en 1000x400, 23 px.
    esperarError(cerca('0 0 800 600'), 'quedan a 43 px');
    esperarError(cerca('0 0 1000 400'), 'quedan a 23 px');
    // En un viewBox alto (800x1200) los mismos 18 puntos son 86 px.
    expect(cerca('0 0 800 1200').ok).toBe(true);
  });

  it('un receptor no puede quedar tan al borde que su zona táctil de 44 px se salga de la escena', () => {
    // 800x600 a 320 px: 5 % del ancho = 16 px < 22 px.
    esperarError(
      conConfig(ID, (c) => {
        (c.receptores as Lista)[0]!.posicion = { x: 5, y: 55 };
      }),
      'config.receptores.0.posicion',
      'a menos de 22 px de un borde',
    );
    // El alto es 240 px: y = 8 % son 19 px.
    esperarError(
      conConfig(ID, (c) => {
        (c.receptores as Lista)[0]!.posicion = { x: 25, y: 8 };
      }),
      'a menos de 22 px de un borde',
    );
    expect(
      conConfig(ID, (c) => {
        (c.receptores as Lista)[0]!.posicion = { x: 8, y: 10 };
      }).ok,
    ).toBe(true);
  });

  it('la posición está entre 5 y 95', () => {
    esperarError(
      conConfig(ID, (c) => {
        (c.receptores as Lista)[0]!.posicion = { x: 2, y: 55 };
      }),
      'posicion.x',
    );
    esperarError(
      conConfig(ID, (c) => {
        (c.receptores as Lista)[0]!.posicion = { x: 50, y: 99 };
      }),
      'posicion.y',
    );
  });

  it('el efecto pide animación del vocabulario cerrado y hasta 3 indicadores', () => {
    esperarError(
      conConfig(ID, (c) => {
        ((c.pares as Lista)[0]!.efecto as Record<string, unknown>).animacion = 'explosion';
      }),
      'efecto.animacion',
    );
    esperarError(
      conConfig(ID, (c) => {
        ((c.pares as Lista)[0]!.efecto as Record<string, unknown>).indicadores = Array.from(
          { length: 4 },
          () => ({ etiqueta: 'Indicador', direccion: 'aumenta' }),
        );
      }),
      'efecto.indicadores',
      'Too big',
    );
  });

  it('exige retroalimentacion.incorrecta', () => {
    esperarError(
      conActividad(ID, (a) => {
        delete (a.retroalimentacion as Record<string, unknown>).incorrecta;
      }),
      'retroalimentacion.incorrecta',
    );
  });
});

describe('actividad relacion-columnas', () => {
  const ID = 'm1_celulas_funciones';
  type Lista = Record<string, unknown>[];

  it('los pares apuntan a elementos existentes de cada columna', () => {
    esperarError(
      conConfig(ID, (c) => {
        (c.pares as Lista)[0]!.a = 'ea_fantasma';
      }),
      'config.pares.0.a',
      'no existe en "columna_a"',
    );
    esperarError(
      conConfig(ID, (c) => {
        (c.pares as Lista)[0]!.b = 'eb_fantasma';
      }),
      'config.pares.0.b',
      'no existe en "columna_b"',
    );
  });

  it('todo elemento de A tiene par; un elemento no se empareja dos veces', () => {
    esperarError(
      conConfig(ID, (c) => {
        (c.pares as Lista).pop();
      }),
      'columna_a.elementos.3',
      'no tiene par',
    );
    esperarError(
      conConfig(ID, (c) => {
        (c.pares as Lista)[1]!.b = 'eb_forma';
      }),
      'config.pares.1.b',
      'ya tiene pareja',
    );
    esperarError(
      conConfig(ID, (c) => {
        (c.pares as Lista)[1]!.a = 'ea_osteoblasto';
      }),
      'config.pares.1.a',
      'ya tiene pareja',
    );
  });

  it('la columna B admite hasta 3 distractores', () => {
    const extra = (n: number) => (c: Record<string, unknown>) => {
      const elementos = (c.columna_b as { elementos: Record<string, unknown>[] }).elementos;
      for (let i = 0; i < n; i++) {
        elementos.push({ id: `eb_extra_${i}`, texto: `Función que no corresponde ${i}` });
      }
    };
    // La muestra ya tiene 1 distractor; con 2 más son 3.
    expect(conConfig(ID, extra(2)).ok).toBe(true);
    esperarError(conConfig(ID, extra(3)), 'columna_b.elementos', '4 elementos sin pareja');
  });

  it('cada par trae explicación (retroalimentación inmediata)', () => {
    esperarError(
      conConfig(ID, (c) => {
        delete (c.pares as Lista)[0]!.explicacion;
      }),
      'config.pares.0.explicacion',
    );
  });

  it('cada columna tiene de 3 a 8 elementos y hay al menos 3 pares', () => {
    esperarError(
      conConfig(ID, (c) => {
        (c.columna_a as { elementos: unknown[] }).elementos.splice(2);
        (c.pares as Lista).splice(2);
      }),
      'columna_a.elementos',
      'Too small',
    );
  });
});

describe('actividad quiz', () => {
  const ID = 'm1_quiz_repaso';
  type Lista = Record<string, unknown>[];
  const pregunta = (c: Record<string, unknown>, i: number) => (c.preguntas as Lista)[i]!;

  it('las respuestas correctas deben ser opciones de la pregunta', () => {
    esperarError(
      conConfig(ID, (c) => {
        pregunta(c, 0).correctas = ['qr_p1_z'];
      }),
      'preguntas.0.correctas.0',
      'no existe en "opciones"',
    );
  });

  it('no se repiten las correctas y debe quedar al menos una incorrecta', () => {
    esperarError(
      conConfig(ID, (c) => {
        pregunta(c, 1).correctas = ['qr_p2_a', 'qr_p2_a'];
      }),
      'preguntas.1.correctas',
      'repetida',
    );
    esperarError(
      conConfig(ID, (c) => {
        pregunta(c, 1).correctas = ['qr_p2_a', 'qr_p2_b', 'qr_p2_c', 'qr_p2_d'];
      }),
      'preguntas.1.correctas',
      'al menos una opción incorrecta',
    );
    esperarError(
      conConfig(ID, (c) => {
        pregunta(c, 1).correctas = [];
      }),
      'preguntas.1.correctas',
      'Too small',
    );
  });

  it('opcion_multiple pide de 3 a 6 opciones', () => {
    esperarError(
      conConfig(ID, (c) => {
        pregunta(c, 0).opciones = (pregunta(c, 0).opciones as unknown[]).slice(0, 2);
      }),
      'preguntas.0.opciones',
      'Too small',
    );
  });

  it('verdadero_falso pide un booleano', () => {
    esperarError(
      conConfig(ID, (c) => {
        pregunta(c, 2).correcta = 'falso';
      }),
      'preguntas.2.correcta',
      'expected boolean',
    );
    expect(
      conConfig(ID, (c) => {
        pregunta(c, 2).correcta = true;
      }).ok,
    ).toBe(true);
  });

  it('ordenar pide de 3 a 7 pasos', () => {
    esperarError(
      conConfig(ID, (c) => {
        pregunta(c, 3).pasos = (pregunta(c, 3).pasos as unknown[]).slice(0, 2);
      }),
      'preguntas.3.pasos',
      'Too small',
    );
  });

  it('cada pregunta trae explicación y el formato debe existir', () => {
    esperarError(
      conConfig(ID, (c) => {
        delete pregunta(c, 4).explicacion;
      }),
      'preguntas.4.explicacion',
    );
    esperarError(
      conConfig(ID, (c) => {
        pregunta(c, 4).formato = 'completar';
      }),
      'preguntas.4.formato',
    );
  });

  it('las preguntas de IA pedidas van de 1 a 5 y son opcionales', () => {
    esperarError(
      conConfig(ID, (c) => {
        c.preguntas_ia = { cantidad: 0 };
      }),
      'preguntas_ia.cantidad',
    );
    esperarError(
      conConfig(ID, (c) => {
        c.preguntas_ia = { cantidad: 6 };
      }),
      'preguntas_ia.cantidad',
    );
    expect(
      conConfig(ID, (c) => {
        delete c.preguntas_ia;
      }).ok,
    ).toBe(true);
  });

  it('exige retroalimentacion.incorrecta', () => {
    esperarError(
      conActividad(ID, (a) => {
        delete (a.retroalimentacion as Record<string, unknown>).incorrecta;
      }),
      'retroalimentacion.incorrecta',
    );
  });
});

describe('actividad video-texto', () => {
  const ANIMACION = 'm1_animacion_remodelado';
  const VIDEO = 'm1_video_docente';
  type Lista = Record<string, unknown>[];

  it('una capa resaltada debe estar entre las visibles del paso', () => {
    esperarError(
      conConfig(ANIMACION, (c) => {
        (c.pasos as Lista)[1]!.resaltadas = ['matriz_nueva'];
      }),
      'pasos.1.resaltadas.0',
      'no está en "visibles"',
    );
  });

  it('la animación pide de 2 a 10 pasos, cada uno con al menos una capa visible', () => {
    esperarError(
      conConfig(ANIMACION, (c) => {
        c.pasos = (c.pasos as unknown[]).slice(0, 1);
      }),
      'config.pasos',
      'Too small',
    );
    esperarError(
      conConfig(ANIMACION, (c) => {
        (c.pasos as Lista)[0]!.visibles = [];
      }),
      'pasos.0.visibles',
      'Too small',
    );
  });

  it('el medio debe ser "animacion" o "video"', () => {
    esperarError(
      conConfig(ANIMACION, (c) => {
        c.medio = 'audio';
      }),
      'config.medio',
    );
  });

  it('un video real exige subtítulos y transcripción', () => {
    esperarError(
      conConfig(VIDEO, (c) => {
        c.subtitulos = [];
      }),
      'config.subtitulos',
      'Too small',
    );
    esperarError(
      conConfig(VIDEO, (c) => {
        delete c.transcripcion;
      }),
      'config.transcripcion',
    );
    esperarError(
      conConfig(VIDEO, (c) => {
        c.transcripcion = 'Muy corta.';
      }),
      'config.transcripcion',
      'Mínimo 50',
    );
  });

  it('no puede haber dos pistas de subtítulos en el mismo idioma', () => {
    esperarError(
      conConfig(VIDEO, (c) => {
        (c.subtitulos as Lista).push({
          idioma: 'es',
          etiqueta: 'Español (SDH)',
          src: '/videos/m1/introduccion_hueso.sdh.vtt',
        });
      }),
      'config.subtitulos',
      'idioma "es"',
    );
  });

  it('los hitos van en orden y dentro de la duración', () => {
    esperarError(
      conConfig(VIDEO, (c) => {
        c.hitos = [
          { t_seg: 45, titulo: 'Capas del hueso' },
          { t_seg: 10, titulo: 'Introducción' },
        ];
      }),
      'hitos.1.t_seg',
      'orden cronológico',
    );
    esperarError(
      conConfig(VIDEO, (c) => {
        c.hitos = [{ t_seg: 120, titulo: 'Al final' }];
      }),
      'hitos.0.t_seg',
      'final',
    );
  });

  it.each([
    '/videos/m1/Video.mp4',
    '/videos/m1/video.mov',
    'https://x.org/v.mp4',
    '/images/m1/v.mp4',
  ])('rechaza la ruta de video "%s"', (src) => {
    esperarError(
      conConfig(VIDEO, (c) => {
        c.src = src;
      }),
      'config.src',
      'Ruta de video inválida',
    );
  });

  it('los subtítulos deben ser .vtt de la carpeta del video', () => {
    esperarError(
      conConfig(VIDEO, (c) => {
        (c.subtitulos as Lista)[0]!.src = '/videos/m1/introduccion_hueso.srt';
      }),
      'subtitulos.0.src',
    );
  });
});

describe('actividad exploracion-3d', () => {
  const MANDIBULA = 'm1_explora_mandibula';
  const CELULAS = 'm1_explora_celulas';
  type Lista = Record<string, unknown>[];

  it('un nodo debe existir en el catálogo del modelo', () => {
    esperarError(
      conConfig(MANDIBULA, (c) => {
        (c.nodos as Lista)[0]!.id = 'femur';
        c.requeridos = ['femur', 'angulo', 'cuerpo'];
      }),
      'config.nodos.0.id',
      '"femur" no es un nodo del modelo "mandibula"',
    );
  });

  it('los nodos de células no valen para la mandíbula y al revés', () => {
    esperarError(
      conConfig(CELULAS, (c) => {
        (c.nodos as Lista)[0]!.id = 'condilo';
        c.requeridos = ['condilo', 'osteoclasto'];
      }),
      'config.nodos.0.id',
      'modelo "celulas"',
    );
    esperarError(
      conConfig(MANDIBULA, (c) => {
        (c.nodos as Lista)[0]!.id = 'osteoblasto';
        c.requeridos = ['osteoblasto', 'angulo'];
      }),
      'config.nodos.0.id',
      'modelo "mandibula"',
    );
  });

  it('el modelo es "mandibula" o "celulas" (el 3D se reserva para esos dos)', () => {
    esperarError(
      conConfig(MANDIBULA, (c) => {
        c.modelo = 'corazon';
      }),
      'config.modelo',
    );
  });

  it('los nodos requeridos deben existir entre los nodos de la actividad y no repetirse', () => {
    esperarError(
      conConfig(MANDIBULA, (c) => {
        c.requeridos = ['condilo', 'sinfisis'];
      }),
      'config.requeridos.1',
      'no existe en "nodos"',
    );
    esperarError(
      conConfig(MANDIBULA, (c) => {
        c.requeridos = ['condilo', 'condilo'];
      }),
      'config.requeridos',
      'repetido',
    );
  });

  it('la cámara por nodo usa una vista con nombre y un zoom entre 0,5 y 3', () => {
    esperarError(
      conConfig(MANDIBULA, (c) => {
        (c.nodos as Lista)[0]!.camara = { vista: 'desde_marte' };
      }),
      'camara.vista',
    );
    esperarError(
      conConfig(MANDIBULA, (c) => {
        (c.nodos as Lista)[0]!.camara = { vista: 'frontal', zoom: 5 };
      }),
      'camara.zoom',
    );
    const ok = validarCon((d) => {
      const nodo = leer(d, [...rutaActividad(d, MANDIBULA), 'config', 'nodos', 1]) as Record<
        string,
        unknown
      >;
      nodo.camara = {};
    });
    expect(ok.modulo).toBeDefined();
    const camara = (
      listarActividades(ok.modulo!).find((u) => u.actividad.id === MANDIBULA)!.actividad as Extract<
        Actividad,
        { tipo: 'exploracion-3d' }
      >
    ).config.nodos[1]!.camara;
    expect(camara).toEqual({ vista: 'frontal', zoom: 1 });
  });

  it('el esquema de config valida por separado con el catálogo real', () => {
    const base = {
      modelo: 'mandibula',
      alt: 'Modelo 3D de la mandíbula.',
      nodos: [
        { id: 'condilo', etiqueta: 'Cóndilo', descripcion: 'Extremo superior de la rama.' },
        { id: 'sinfisis', etiqueta: 'Sínfisis', descripcion: 'Unión de las dos mitades.' },
      ],
      requeridos: ['condilo'],
    };
    expect(ConfigExploracion3dSchema.safeParse(base).success).toBe(true);
    expect(
      ConfigExploracion3dSchema.safeParse({
        ...base,
        nodos: [base.nodos[0], { ...base.nodos[1], id: 'x' }],
      }).success,
    ).toBe(false);
  });
});

describe('campos comunes de la actividad', () => {
  const ID = 'm1_quiz_repaso';

  it.each([0, 1.5, -3, 1001, '50'])('rechaza puntaje_max = %j', (valor) => {
    esperarError(
      conActividad(ID, (a) => {
        a.puntaje_max = valor;
      }),
      'puntaje_max',
    );
  });

  it('acepta puntaje_max = 1 y 1000 como enteros (1000 es el tope de la API)', () => {
    for (const valor of [1, 1000]) {
      const r = conActividad(ID, (a) => {
        a.puntaje_max = valor;
      });
      // Con 1000 el módulo se pasa de rango: solo debe quejarse del total, no del campo.
      expect(r.issues.filter((i) => i.includes('puntaje_max'))).toEqual([]);
    }
  });

  it('la penalización tiene rangos: por_intento 0..0,5 y piso 0..1', () => {
    esperarError(
      conActividad(ID, (a) => {
        a.penalizacion = { por_intento: 0.9 };
      }),
      'penalizacion.por_intento',
    );
    esperarError(
      conActividad(ID, (a) => {
        a.penalizacion = { por_intento: -0.1 };
      }),
      'penalizacion.por_intento',
    );
    esperarError(
      conActividad(ID, (a) => {
        a.penalizacion = { piso: 1.2 };
      }),
      'penalizacion.piso',
    );
    expect(
      conActividad(ID, (a) => {
        a.penalizacion = { por_intento: 0, piso: 1 };
      }).ok,
    ).toBe(true);
  });

  it('los campos obligatorios de una actividad no pueden faltar', () => {
    for (const campo of [
      'titulo',
      'instrucciones',
      'puntaje_max',
      'retroalimentacion',
      'concepto',
      'config',
    ]) {
      esperarError(
        conActividad(ID, (a) => {
          delete a[campo];
        }),
        `actividad.${campo}`,
      );
    }
  });

  it('el tipo de actividad debe ser uno de los 6 del contrato', () => {
    esperarError(
      conActividad(ID, (a) => {
        a.tipo = 'ordenar';
      }),
      'actividad.tipo',
    );
  });

  it('el texto de retroalimentación tiene límites de longitud', () => {
    esperarError(
      conActividad(ID, (a) => {
        (a.retroalimentacion as Record<string, unknown>).correcta = 'Bien';
      }),
      'retroalimentacion.correcta',
      'Mínimo 10',
    );
  });

  it('una actividad se valida también por separado (ActividadSchema)', () => {
    const datos = muestra();
    const actividad = leer(datos, rutaActividad(datos, 'm1_quiz_repaso'));
    expect(ActividadSchema.safeParse(actividad).success).toBe(true);
  });
});

describe('bloques', () => {
  it('imagen: el texto alternativo es obligatorio y descriptivo', () => {
    esperarError(
      validarCon(
        (d) => delete (leer(d, rutaBloque(d, 'i_capas_hueso')) as Record<string, unknown>).alt,
      ),
      'alt',
    );
    esperarError(
      validarCon((d) => fijar(d, [...rutaBloque(d, 'i_capas_hueso'), 'alt'], 'foto')),
      'bloques.2.alt',
      'Mínimo 10',
    );
    esperarError(
      validarCon((d) => fijar(d, [...rutaBloque(d, 'i_capas_hueso'), 'alt'], '')),
      'bloques.2.alt',
    );
  });

  it('imagen: exige pie y una ruta pública válida', () => {
    esperarError(
      validarCon(
        (d) => delete (leer(d, rutaBloque(d, 'i_capas_hueso')) as Record<string, unknown>).pie,
      ),
      'pie',
    );
    for (const src of [
      '/images/m1/foto.gif',
      'https://x.org/a.png',
      '/images/foto.png',
      '../foto.png',
    ]) {
      esperarError(
        validarCon((d) => fijar(d, [...rutaBloque(d, 'i_capas_hueso'), 'src'], src)),
        'bloques.2.src',
        'Ruta de imagen inválida',
      );
    }
  });

  it('imagen: ancho y alto van juntos', () => {
    esperarError(
      validarCon(
        (d) => delete (leer(d, rutaBloque(d, 'i_capas_hueso')) as Record<string, unknown>).alto,
      ),
      '"alto"',
    );
    expect(
      validarCon((d) => {
        const b = leer(d, rutaBloque(d, 'i_capas_hueso')) as Record<string, unknown>;
        delete b.ancho;
        delete b.alto;
      }).ok,
    ).toBe(true);
  });

  it('callout: la variante es una de las cuatro', () => {
    esperarError(
      validarCon((d) => fijar(d, [...rutaBloque(d, 'c_calcio'), 'variante'], 'peligro')),
      'variante',
    );
    for (const variante of ['clinico', 'dato', 'atencion', 'recuerda']) {
      expect(
        validarCon((d) => fijar(d, [...rutaBloque(d, 'c_calcio'), 'variante'], variante)).ok,
        variante,
      ).toBe(true);
    }
  });

  it('callout: no admite títulos Markdown; texto sí admite ### y ####', () => {
    esperarError(
      validarCon((d) =>
        fijar(d, [...rutaBloque(d, 'c_calcio'), 'markdown'], '### Un título\n\nTexto del aviso.'),
      ),
      'No se admiten títulos',
    );
    expect(
      validarCon((d) =>
        fijar(
          d,
          [...rutaBloque(d, 't_funciones'), 'markdown'],
          '### Un título\n\nTexto del bloque de lectura.',
        ),
      ).ok,
    ).toBe(true);
  });

  it('tabla: cada fila trae una celda por columna', () => {
    esperarError(
      validarCon((d) => {
        const tabla = leer(d, rutaBloque(d, 'tb_compacto_esponjoso')) as {
          filas: { celdas: string[] }[];
        };
        tabla.filas[1]!.celdas.pop();
      }),
      'filas.1.celdas',
      '1 celdas y la tabla 2 columnas',
    );
  });

  it('tabla: pide título y de 2 a 6 columnas', () => {
    esperarError(
      validarCon(
        (d) =>
          delete (leer(d, rutaBloque(d, 'tb_compacto_esponjoso')) as Record<string, unknown>)
            .titulo,
      ),
      'titulo',
    );
    esperarError(
      validarCon((d) =>
        fijar(d, [...rutaBloque(d, 'tb_compacto_esponjoso'), 'columnas'], ['Una sola']),
      ),
      'columnas',
      'Too small',
    );
  });

  it('texto: rechaza HTML y Markdown no permitido', () => {
    esperarError(
      validarCon((d) =>
        fijar(
          d,
          [...rutaBloque(d, 't_funciones'), 'markdown'],
          'Un párrafo con <b>negrita</b> en HTML.',
        ),
      ),
      'No se permite HTML',
    );
    esperarError(
      validarCon((d) =>
        fijar(
          d,
          [...rutaBloque(d, 't_funciones'), 'markdown'],
          'Una tabla:\n\n| a | b |\n|---|---|\n| 1 | 2 |',
        ),
      ),
      'No se admiten tablas',
    );
  });

  it('el bloque actividad no lleva id propio (es el de la actividad)', () => {
    esperarError(
      validarCon((d) => fijar(d, ['secciones', 0, 'bloques', 3, 'id'], 'm1_capas_hueso_bloque')),
      'Unrecognized key',
    );
  });

  it('un tipo de bloque desconocido es un error', () => {
    esperarError(
      validarCon((d) => fijar(d, ['secciones', 0, 'bloques', 0, 'tipo'], 'video')),
      'secciones.0.bloques.0.tipo',
    );
    expect(BloqueSchema.safeParse({ tipo: 'video' }).success).toBe(false);
  });

  it('los textos planos no admiten Markdown y los de una línea no admiten saltos', () => {
    esperarError(
      conActividad('m1_quiz_repaso', (a) => {
        a.titulo = 'Quiz **de repaso**';
      }),
      'actividad.titulo',
      'Markdown',
    );
    esperarError(
      conActividad('m1_quiz_repaso', (a) => {
        a.instrucciones = 'Primera línea.\nSegunda línea del texto.';
      }),
      'actividad.instrucciones',
      'una sola línea',
    );
  });
});

describe('módulo', () => {
  it('el slug y el título son los de src/data/modulos.ts', () => {
    esperarError(
      validarCon((d) => fijar(d, ['slug'], 'otro_slug')),
      'slug',
    );
    esperarError(
      validarCon((d) => fijar(d, ['titulo'], 'Conociendo los huesos')),
      'titulo',
      'debe ser "Conociendo el hueso"',
    );
  });

  it('el id es m{numero} y el número va de 1 a 6', () => {
    esperarError(
      validarCon((d) => fijar(d, ['id'], 'modulo1')),
      'debe ser "m1"',
    );
    for (const numero of [0, 7, 1.5, '1']) {
      esperarError(
        validarCon((d) => fijar(d, ['numero'], numero)),
        'numero',
      );
    }
  });

  it('un enlace al glosario debe apuntar a un término que exista', () => {
    esperarError(
      validarCon((d) =>
        fijar(
          d,
          [...rutaBloque(d, 'c_calcio'), 'markdown'],
          'Un dato con el término [hueso](glosario:hueso_fantasma).',
        ),
      ),
      'bloques.1.markdown',
      'glosario:hueso_fantasma',
    );
  });

  it('el enlace al glosario se valida en cualquier campo de texto (opciones, pistas, notas...)', () => {
    esperarError(
      conConfig('m1_quiz_repaso', (c) => {
        (
          (c.preguntas as Record<string, unknown>[])[0]!.opciones as Record<string, unknown>[]
        )[0]!.texto = '[Osteoclasto](glosario:no_existe)';
      }),
      'opciones.0.texto',
      'glosario:no_existe',
    );
  });

  it('los recursos del módulo n viven en la carpeta m{n}', () => {
    esperarError(
      conConfig('m1_capas_hueso', (c) => {
        c.svg = '/images/m2/hueso_capas.svg';
      }),
      'config.svg',
      'es del módulo 2',
    );
    esperarError(
      validarCon((d) =>
        fijar(d, [...rutaBloque(d, 'i_capas_hueso'), 'src'], '/images/m3/hueso.webp'),
      ),
      'bloques.2.src',
      'módulo 3',
    );
    esperarError(
      conConfig('m1_video_docente', (c) => {
        c.src = '/videos/m4/introduccion.mp4';
      }),
      'config.src',
      'módulo 4',
    );
  });

  it('necesita al menos una actividad obligatoria', () => {
    esperarError(
      validarCon((d) => {
        for (const id of [
          'm1_capas_hueso',
          'm1_celulas_funciones',
          'm1_animacion_remodelado',
          'm1_senales_remodelado',
          'm1_explora_mandibula',
          'm1_identifica_celulas',
          'm1_quiz_repaso',
        ]) {
          fijar(d, [...rutaActividad(d, id), 'obligatoria'], false);
        }
      }),
      'al menos una actividad obligatoria',
    );
  });

  it('las actividades suman entre 100 y 1000 puntos', () => {
    // Reparte `total` puntos entre las actividades de la muestra (la suma queda exacta).
    const conTotal = (total: number) => (d: Record<string, unknown>) => {
      const ids = listarActividades(validar(muestra()).modulo!).map((u) => u.actividad.id);
      const base = Math.floor(total / ids.length);
      ids.forEach((id, i) => {
        const extra = i < total - base * ids.length ? 1 : 0;
        fijar(d, [...rutaActividad(d, id), 'puntaje_max'], base + extra);
      });
    };
    expect(validarCon().ok).toBe(true); // 280 en la muestra
    esperarError(validarCon(conTotal(99)), 'suman 99 puntos');
    esperarError(validarCon(conTotal(1001)), 'suman 1001 puntos');
    expect(validarCon(conTotal(100)).ok).toBe(true);
    // Los guiones de los módulos densos llegan a 810.
    expect(validarCon(conTotal(810)).ok).toBe(true);
    expect(validarCon(conTotal(1000)).ok).toBe(true);
  });

  it('respeta los mínimos de secciones, objetivos y glosario', () => {
    esperarError(
      validarCon((d) => fijar(d, ['secciones'], [(leer(d, ['secciones']) as unknown[])[0]])),
      'secciones',
      'Too small',
    );
    esperarError(
      validarCon((d) => fijar(d, ['objetivos'], ['Un solo objetivo de aprendizaje.'])),
      'objetivos',
      'Too small',
    );
    esperarError(
      validarCon((d) => fijar(d, ['glosario'], (leer(d, ['glosario']) as unknown[]).slice(0, 2))),
      'glosario',
      'Too small',
    );
  });

  it('duración estimada: entero de 5 a 240 minutos', () => {
    for (const valor of [0, 4, 241, 30.5, '40']) {
      esperarError(
        validarCon((d) => fijar(d, ['duracion_estimada_min'], valor)),
        'duracion_estimada_min',
      );
    }
  });

  it('las referencias solo admiten URL https y marcan si están verificadas', () => {
    esperarError(
      validarCon((d) => fijar(d, ['referencias', 0, 'url'], 'http://ejemplo.org/libro')),
      'referencias.0.url',
      'https://',
    );
    const ok = validarCon((d) => fijar(d, ['referencias', 0, 'verificada'], true));
    expect(ok.modulo?.referencias[0]?.verificada).toBe(true);
  });
});

describe('estado de revisión', () => {
  it('borrador no exige nada más', () => {
    expect(validarCon((d) => fijar(d, ['estado_revision'], { estado: 'borrador' })).ok).toBe(true);
  });

  it.each(['revisado_docente', 'aprobado'])('"%s" exige quién, cuándo y qué versión', (estado) => {
    const r = validarCon((d) => fijar(d, ['estado_revision'], { estado }));
    esperarError(r, 'estado_revision.revisado_por');
    esperarError(r, 'estado_revision.fecha');
    esperarError(r, 'estado_revision.version');
    expect(
      validarCon((d) =>
        fijar(d, ['estado_revision'], {
          estado,
          revisado_por: 'Docente responsable',
          fecha: '2026-10-05',
          version: '1.0',
          notas: 'Aprobado con dos ajustes menores.',
        }),
      ).ok,
    ).toBe(true);
  });

  it.each(['2026-02-30', '05/10/2026', '2026-13-01', '2026-1-5', 'ayer'])(
    'rechaza la fecha "%s"',
    (fecha) => {
      esperarError(
        validarCon((d) =>
          fijar(d, ['estado_revision'], {
            estado: 'aprobado',
            revisado_por: 'Docente',
            fecha,
            version: '1',
          }),
        ),
        'estado_revision.fecha',
      );
    },
  );

  it('el estado debe ser uno de los tres', () => {
    esperarError(
      validarCon((d) => fijar(d, ['estado_revision'], { estado: 'publicado' })),
      'estado_revision.estado',
    );
  });
});

describe('robustez: ningún JSON malformado hace lanzar al esquema ni al formateador de errores', () => {
  /** Rutas de TODOS los nodos (objetos, listas y valores) del módulo, sin la raíz. */
  function todasLasRutas(
    valor: unknown,
    ruta: (string | number)[] = [],
    salida: (string | number)[][] = [],
  ) {
    if (typeof valor === 'object' && valor !== null) {
      for (const [clave, hijo] of Object.entries(valor)) {
        const siguiente = [...ruta, Array.isArray(valor) ? Number(clave) : clave];
        salida.push(siguiente);
        todasLasRutas(hijo, siguiente, salida);
      }
    }
    return salida;
  }

  const MUTACIONES: [string, () => unknown][] = [
    ['null', () => null],
    ['un número', () => 12345],
    ['un texto vacío', () => ''],
    ['un texto larguísimo', () => 'x'.repeat(5000)],
    ['una lista vacía', () => []],
    ['un objeto vacío', () => ({})],
    ['verdadero', () => true],
    ['texto con HTML', () => '<script>alert(1)</script>'],
  ];

  it('borrar o corromper cualquier campo, en cualquier nivel, da errores y no excepciones', () => {
    const rutas = todasLasRutas(muestra());
    expect(rutas.length).toBeGreaterThan(500);
    let casos = 0;
    let conError = 0;
    for (const ruta of rutas) {
      const cambios: [string, (d: unknown) => void][] = [
        ['borrar', (d) => borrar(d, ruta)],
        ...MUTACIONES.map(([nombre, valor]): [string, (d: unknown) => void] => [
          nombre,
          (d) => fijar(d, ruta, valor()),
        ]),
      ];
      for (const [nombre, aplicar] of cambios) {
        const datos = muestra();
        aplicar(datos);
        casos++;
        let resultado: ResultadoValidacion;
        try {
          resultado = validar(datos);
        } catch (error) {
          throw new Error(`Lanzó al aplicar "${nombre}" en ${ruta.join('.')}: ${String(error)}`, {
            cause: error,
          });
        }
        if (!resultado.ok) {
          conError++;
          expect(resultado.errores.length, `${nombre} en ${ruta.join('.')}`).toBeGreaterThan(0);
        }
      }
    }
    // La gran mayoría de las mutaciones son inválidas: es un indicio de que el esquema muerde.
    expect(casos).toBeGreaterThan(5000);
    expect(conError / casos).toBeGreaterThan(0.85);
  }, 120_000);

  it('una raíz que no es un objeto tampoco lanza', () => {
    for (const basura of [null, undefined, 0, 'texto', [], [muestra()], true, () => 1]) {
      expect(() => validar(basura)).not.toThrow();
      expect(validar(basura).ok).toBe(false);
    }
  });
});
