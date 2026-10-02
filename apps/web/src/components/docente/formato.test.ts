import { describe, expect, it } from 'vitest';
import { nombreDeDescarga } from '@/lib/docenteApi';
import {
  SIN_DATO,
  conPuntoFinal,
  formatoDia,
  formatoDiaCorto,
  formatoDuracion,
  formatoNumero,
  formatoPorcentaje,
  formatoUsd,
} from './formato';

describe('formatos del panel del docente', () => {
  it('formatea duraciones', () => {
    expect(formatoDuracion(0)).toBe('0 s');
    expect(formatoDuracion(45)).toBe('45 s');
    expect(formatoDuracion(367)).toBe('6 min 7 s');
    expect(formatoDuracion(600)).toBe('10 min');
    expect(formatoDuracion(3900)).toBe('1 h 5 min');
    expect(formatoDuracion(7200)).toBe('2 h');
    expect(formatoDuracion(null)).toBe(SIN_DATO);
  });

  it('formatea costos en dólares con más decimales bajo 1 USD', () => {
    expect(formatoUsd(0.0175)).toBe('US$ 0,0175');
    expect(formatoUsd(12.5)).toBe('US$ 12,50');
    expect(formatoUsd(null)).toBe(SIN_DATO);
  });

  it('formatea números y porcentajes, y tolera null', () => {
    expect(formatoNumero(7500)).toBe('7.500');
    expect(formatoNumero(1.5, 1)).toBe('1,5');
    expect(formatoNumero(null)).toBe(SIN_DATO);
    expect(formatoPorcentaje(0.6667)).toBe('67 %');
    expect(formatoPorcentaje(null)).toBe(SIN_DATO);
  });

  it('formatea días UTC sin desfase de zona horaria', () => {
    expect(formatoDia('2026-09-24')).toBe('24 sep 2026');
    expect(formatoDiaCorto('2026-09-01')).toBe('1 sep');
    expect(formatoDia('no-fecha')).toBe('no-fecha');
  });
});

describe('nombreDeDescarga', () => {
  it('lee el nombre del Content-Disposition', () => {
    expect(nombreDeDescarga('attachment; filename="progreso_ova_2026-09-24.csv"')).toBe(
      'progreso_ova_2026-09-24.csv',
    );
    expect(nombreDeDescarga('attachment; filename=datos.csv')).toBe('datos.csv');
    expect(nombreDeDescarga(null)).toBeNull();
    expect(nombreDeDescarga('attachment')).toBeNull();
  });
});

describe('conPuntoFinal', () => {
  it('deja un solo punto aunque el texto ya termine en punto (fechas «a. m.» y «p. m.»)', () => {
    expect(conPuntoFinal('Datos al 25 sept 2026, 12:01 a. m.')).toBe(
      'Datos al 25 sept 2026, 12:01 a. m.',
    );
    expect(conPuntoFinal('Datos al 25 sept 2026, 3:15 p. m.')).toBe(
      'Datos al 25 sept 2026, 3:15 p. m.',
    );
    expect(conPuntoFinal('Datos al 25 sept 2026, 15:00')).toBe('Datos al 25 sept 2026, 15:00.');
    expect(conPuntoFinal('fin..')).toBe('fin.');
  });
});
