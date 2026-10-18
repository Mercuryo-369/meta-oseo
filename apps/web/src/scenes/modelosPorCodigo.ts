/**
 * Modelos de la exploración 3D que se construyen por código (sin GLB ni descarga): el hueso largo de m1_1 y los que
 * sustituyen a las ilustraciones de las multicapa (docs/realismo-3d.md). Las piezas comunes están en
 * `piezasPorCodigo.ts`, `corte2d.ts` y `histologia/piezas.ts`. Cada modelo es un grupo de three.js cuyas
 * regiones son grupos con el id de su nodo del catálogo (`content/nodos3d.ts`); la exploración los encuentra por
 * nombre, los resalta y pone la etiqueta en el punto que da `puntoDeRegion`.
 *
 * Para añadir un modelo: su carpeta en `scenes/` con `crear`, `esRegion` y `puntoDeRegion`, su id en `MODELOS_3D`,
 * sus nodos en `CATALOGO_NODOS` y una línea en `MODELOS_POR_CODIGO`. Se cargan bajo demanda (`import()`), así cada
 * modelo es su propio fragmento del build.
 */
import type { Object3D } from 'three';
import type { Modelo3d } from '@/content/nodos3d';

export type Vec3 = [number, number, number];

/** Punto de la etiqueta de una región, tamaño de la zona que encuadra la cámara y hacia dónde mira. */
export interface PuntoRegion {
  punto: Vec3;
  radio: number;
  normal: Vec3;
}

export interface ModeloPorCodigo {
  crear: () => Object3D;
  esRegion: (id: string) => boolean;
  puntoDeRegion: (id: string) => PuntoRegion;
}

type Cargador = () => Promise<ModeloPorCodigo>;

export const MODELOS_POR_CODIGO: Readonly<Partial<Record<Modelo3d, Cargador>>> = {
  hueso_largo: async () => {
    const m = await import('./hueso_largo/modeloHuesoLargo');
    return {
      crear: m.crearHuesoLargo,
      esRegion: m.esRegionHuesoLargo,
      puntoDeRegion: (id) => m.puntoDeRegion(id as Parameters<typeof m.puntoDeRegion>[0]),
    };
  },
  hueso_capas: async () => {
    const m = await import('./hueso_capas/modeloHuesoCapas');
    return {
      crear: m.crearHuesoCapas,
      esRegion: m.esRegionHuesoCapas,
      puntoDeRegion: (id) => m.puntoDeRegion(id as Parameters<typeof m.puntoDeRegion>[0]),
    };
  },
  osteona: async () => {
    const m = await import('./osteona/modeloOsteona');
    return {
      crear: m.crearOsteona,
      esRegion: m.esRegionOsteona,
      puntoDeRegion: (id) => m.puntoDeRegion(id as Parameters<typeof m.puntoDeRegion>[0]),
    };
  },
  hueso_entretejido_laminar: async () => {
    const m = await import('./hueso_entretejido_laminar/modeloEntretejidoLaminar');
    return {
      crear: m.crearEntretejidoLaminar,
      esRegion: m.esRegionEntretejidoLaminar,
      puntoDeRegion: (id) => m.puntoDeRegion(id as Parameters<typeof m.puntoDeRegion>[0]),
    };
  },
  frente_mineralizacion: async () => {
    const m = await import('./frente_mineralizacion/modeloFrenteMineralizacion');
    return {
      crear: m.crearFrenteMineralizacion,
      esRegion: m.esRegionFrente,
      puntoDeRegion: (id) => m.puntoDeRegion(id as Parameters<typeof m.puntoDeRegion>[0]),
    };
  },
  ligamento_periodontal: async () => {
    const m = await import('./ligamento_periodontal/modeloLigamentoPeriodontal');
    return {
      crear: m.crearLigamentoPeriodontal,
      esRegion: m.esRegionLigamento,
      puntoDeRegion: (id) => m.puntoDeRegion(id as Parameters<typeof m.puntoDeRegion>[0]),
    };
  },
  tejido_oseo_envejecido: async () => {
    const m = await import('./tejido_oseo_envejecido/modeloTejidoOseoEnvejecido');
    return {
      crear: m.crearTejidoOseoEnvejecido,
      esRegion: m.esRegionTejidoEnvejecido,
      puntoDeRegion: (id) => m.puntoDeRegion(id as Parameters<typeof m.puntoDeRegion>[0]),
    };
  },
  hueso_osteoporotico: async () => {
    const m = await import('./hueso_osteoporotico/modeloHuesoOsteoporotico');
    return {
      crear: m.crearHuesoOsteoporotico,
      esRegion: m.esRegionHuesoOsteoporotico,
      puntoDeRegion: (id) => m.puntoDeRegion(id as Parameters<typeof m.puntoDeRegion>[0]),
    };
  },
  osteoide: async () => {
    const m = await import('./osteoide/modeloOsteoide');
    return {
      crear: m.crearOsteoide,
      esRegion: m.esRegionOsteoide,
      puntoDeRegion: (id) => m.puntoDeRegion(id as Parameters<typeof m.puntoDeRegion>[0]),
    };
  },
  red_lacuno_canalicular: async () => {
    const m = await import('./red_lacuno_canalicular/modeloRedLacunoCanalicular');
    return {
      crear: m.crearRedLacunoCanalicular,
      esRegion: m.esRegionRedLacunoCanalicular,
      puntoDeRegion: (id) => m.puntoDeRegion(id as Parameters<typeof m.puntoDeRegion>[0]),
    };
  },
};

export function esModeloPorCodigo(modelo: Modelo3d): boolean {
  return modelo in MODELOS_POR_CODIGO;
}
