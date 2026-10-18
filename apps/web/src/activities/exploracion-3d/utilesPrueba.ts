/**
 * Utilidades de las pruebas de `exploracion-3d`. Solo las importan archivos .test.ts (no entran al
 * build).
 */
import type { ActividadExploracion3d } from '@/content/schema';
import { ActividadExploracion3dSchema } from '@/content/schema';

export interface OpcionesActividad {
  /** Id de la actividad (con prefijo de módulo). */
  actividadId?: string;
  modelo?: 'mandibula' | 'celulas';
  /** Cuántos nodos hay (el esquema admite de 2 a 12). */
  nodos?: number;
  /** Cuántos de los primeros nodos son requeridos (de 1 al total de nodos). */
  requeridos?: number;
  /** Id de un nodo: por defecto `zona_1`, `zona_2`... (con `ancla`, así que vale cualquier id). */
  id?: (indice: number) => string;
  etiqueta?: (indice: number) => string;
  descripcion?: (indice: number) => string;
  puntaje_max?: number;
  penalizacion?: { por_intento: number; piso: number };
  /** Modo identificar: cada nodo lleva `pista` («Pista de la zona N…»). */
  identificar?: boolean;
}

/**
 * Actividad sintética válida según el esquema (falla si las opciones lo violan: así las pruebas
 * adversariales no se apoyan en contenido que el validador rechazaría). Los nodos de la mandíbula llevan
 * `ancla`, lo que permite ids libres. Para probar contenido que el esquema no admite, se modifica el
 * resultado después de crearlo.
 */
export function crearActividad(opciones: OpcionesActividad = {}): ActividadExploracion3d {
  const {
    actividadId = 'm1_exploracion_prueba',
    modelo = 'mandibula',
    nodos = 4,
    requeridos = 3,
    id = (i) => `zona_${i + 1}`,
    etiqueta = (i) => `Zona ${i + 1}`,
    descripcion = (i) => `Descripción de la zona número ${i + 1} del modelo.`,
    puntaje_max = 30,
    penalizacion,
    identificar = false,
  } = opciones;
  const lista = Array.from({ length: nodos }, (_, i) => ({
    id: id(i),
    etiqueta: etiqueta(i),
    descripcion: descripcion(i),
    ...(modelo === 'mandibula' ? { ancla: { x: 0.5, y: 0.5, z: (i % 10) / 10 } } : {}),
    ...(identificar ? { pista: `Pista de la zona número ${i + 1}, sin decir su nombre.` } : {}),
  }));
  return ActividadExploracion3dSchema.parse({
    id: actividadId,
    tipo: 'exploracion-3d',
    titulo: 'Exploración de prueba',
    instrucciones: 'Toca cada parte del modelo para leer su ficha completa.',
    puntaje_max,
    ...(penalizacion ? { penalizacion } : {}),
    retroalimentacion: { correcta: 'Muy bien: exploraste todas las partes que se pedían.' },
    concepto: 'Concepto de prueba',
    config: {
      modelo,
      ...(identificar ? { modo: 'identificar' } : {}),
      alt: 'Modelo tridimensional de prueba que se puede girar.',
      nodos: lista,
      requeridos: lista.slice(0, requeridos).map((n) => n.id),
    },
  });
}
