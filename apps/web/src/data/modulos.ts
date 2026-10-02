/**
 * Los seis módulos del OVA. Fuente: docs/briefing-pedagogico.md, "Estructura modular".
 * Si el docente cambia títulos o focos, se cambian aquí (no hay copia en otro lugar).
 * El contenido de cada módulo (secciones, actividades) vive en su `content.json` (F2-01).
 */
import { TOTAL_MODULOS } from '@/config';

export type NumeroModulo = 1 | 2 | 3 | 4 | 5 | 6;

export interface Modulo {
  numero: NumeroModulo;
  /** Identificador estable en snake_case, útil para carpetas de contenido y analítica. */
  slug: string;
  titulo: string;
  /** Foco temático, tal cual el briefing. */
  foco: string;
  /** Densidad de contenido según el briefing (los módulos 3, 4 y 5 son los más robustos). */
  densidad: 'media' | 'alta';
  /** Código del logro que se otorga al completar el módulo (docs/api-contract.md, "Logros"). */
  logro: string;
  /** Identidad visual del módulo: rótulo, frase corta, icono e ilustración de portada. */
  identidad: IdentidadModulo;
}

/** Nombre de icono de `components/modulo/IconoModulo.vue` (un icono de Lucide por módulo). */
export type IconoModulo = 'hueso' | 'celula' | 'construccion' | 'mineral' | 'renovacion' | 'tiempo';

export interface IdentidadModulo {
  /** Rótulo temático de una o dos palabras (la «píldora» de la tarjeta y de la cabecera). */
  rotulo: string;
  /** Frase corta que acompaña al rótulo. */
  frase: string;
  icono: IconoModulo;
  portada: {
    /** SVG ya producido para el módulo, en `public/images/m{n}/` (ruta pública). */
    src: string;
    /** Cómo encaja en el recuadro: `cubrir` recorta a los bordes, `contener` muestra todo. */
    ajuste: 'cubrir' | 'contener';
    /** `object-position` cuando se recorta (por ejemplo `center top`). */
    posicion: string;
    /**
     * `papel`: fondo claro (el de los dibujos, `#f1edfa`) detrás de un SVG sin fondo propio, cuyos rótulos son
     * oscuros y en el tema oscuro no se leerían sobre el acento del módulo.
     */
    fondo?: 'papel';
  };
}

export const MODULOS: readonly Modulo[] = [
  {
    numero: 1,
    slug: 'conociendo_el_hueso',
    titulo: 'Conociendo el hueso',
    foco: 'Generalidades, funciones biomecánicas y metabólicas esenciales',
    densidad: 'media',
    logro: 'primer_hueso',
    identidad: {
      rotulo: 'Un tejido vivo',
      frase: 'El hueso, órgano y tejido a la vez',
      icono: 'hueso',
      portada: { src: '/images/m1/m1_osteona_detalle.svg', ajuste: 'cubrir', posicion: 'center' },
    },
  },
  {
    numero: 2,
    slug: 'descubriendo_sus_celulas',
    titulo: 'Descubriendo sus células',
    foco: 'Origen y procesos de diferenciación celular',
    densidad: 'media',
    logro: 'celula_por_celula',
    identidad: {
      rotulo: 'Las células',
      frase: 'De la célula madre al osteoclasto',
      icono: 'celula',
      // El árbol de linajes (viewBox 1000 x 1540) es una figura vertical: en un marco apaisado queda diminuto y
      // recortarlo parte sus rótulos. La osteoclasto (sin rótulos) llena el marco y es la meta de la frase.
      portada: {
        src: '/images/m2/m2_osteoclasto_resorcion.svg',
        ajuste: 'cubrir',
        posicion: 'center',
      },
    },
  },
  {
    numero: 3,
    slug: 'construyendo_hueso',
    titulo: 'Construyendo hueso',
    foco: 'Mecanotransducción y formación ósea',
    densidad: 'alta',
    logro: 'constructor',
    identidad: {
      rotulo: 'Formación',
      frase: 'Cuando la fuerza se vuelve señal',
      icono: 'construccion',
      // Con rótulos (nota del recuadro en la parte baja): se muestra entera, sobre fondo claro.
      portada: {
        src: '/images/m3/m3_sensores_mecanicos.svg',
        ajuste: 'contener',
        posicion: 'center',
        fondo: 'papel',
      },
    },
  },
  {
    numero: 4,
    slug: 'transformando_la_matriz',
    titulo: 'Transformando la matriz',
    foco: 'Mineralización del tejido óseo',
    densidad: 'alta',
    logro: 'mineralizador',
    identidad: {
      rotulo: 'Mineralización',
      frase: 'Del osteoide al mineral',
      icono: 'mineral',
      // Lleva «Eje c» y «Esquema: no está a escala» al pie: se muestra entera (su fondo oscuro es propio).
      portada: {
        src: '/images/m4/m4_fibrilla_mineralizada.svg',
        ajuste: 'contener',
        posicion: 'center',
      },
    },
  },
  {
    numero: 5,
    slug: 'renovando_el_hueso',
    titulo: 'Renovando el hueso',
    foco: 'Remodelado, reparación y equilibrio óseo',
    densidad: 'alta',
    logro: 'remodelador',
    identidad: {
      rotulo: 'Remodelado',
      frase: 'Un ciclo que nunca se detiene',
      icono: 'renovacion',
      // Rótulos arriba y abajo (Inversión, Cono de corte...): entera y sobre fondo claro.
      portada: {
        src: '/images/m5/m5_bmu_cortical_longitudinal.svg',
        ajuste: 'contener',
        posicion: 'center',
        fondo: 'papel',
      },
    },
  },
  {
    numero: 6,
    slug: 'el_paso_del_tiempo',
    titulo: 'El paso del tiempo',
    foco: 'Envejecimiento y cambios degenerativos',
    densidad: 'media',
    logro: 'cronista',
    identidad: {
      rotulo: 'Envejecimiento',
      frase: 'Lo que cambia con los años',
      icono: 'tiempo',
      // Gráfico con rótulos en todos los bordes («Pico de masa ósea», «Edad (años)»): entero.
      portada: {
        src: '/images/m6/m6_curva_masa_osea.svg',
        ajuste: 'contener',
        posicion: 'center',
        fondo: 'papel',
      },
    },
  },
];

if (MODULOS.length !== TOTAL_MODULOS) {
  throw new Error(`MODULOS debe tener ${TOTAL_MODULOS} elementos.`);
}

/** Devuelve el módulo o `undefined` si `n` no está entre 1 y 6. */
export function moduloPorNumero(n: number): Modulo | undefined {
  return MODULOS.find((m) => m.numero === n);
}

export function esNumeroModulo(n: unknown): n is NumeroModulo {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= TOTAL_MODULOS;
}
