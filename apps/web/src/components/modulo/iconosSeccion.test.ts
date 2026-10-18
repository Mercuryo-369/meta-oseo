import { describe, expect, it } from 'vitest';
import { BookOpen, ClipboardCheck, Gem, Radar, Smile } from '@lucide/vue';
import { iconoDeSeccion } from './iconosSeccion';

describe('iconoDeSeccion', () => {
  it('elige por palabras clave sin importar tildes ni mayúsculas', () => {
    expect(iconoDeSeccion('El osteocito, sensor del hueso')).toBe(Radar);
    expect(iconoDeSeccion('Hidroxiapatita, del cristal a la fibrilla')).toBe(Gem);
    expect(iconoDeSeccion('La mandíbula con los años')).not.toBe(BookOpen);
    expect(iconoDeSeccion('La MANDÍBULA, un hueso bajo carga')).toBe(Smile);
  });

  it('la regla más específica gana (evaluación antes que mandíbula)', () => {
    expect(iconoDeSeccion('Cierre y evaluación final')).toBe(ClipboardCheck);
  });

  it('sin coincidencias usa el libro abierto', () => {
    expect(iconoDeSeccion('Introducción')).toBe(BookOpen);
  });
});
