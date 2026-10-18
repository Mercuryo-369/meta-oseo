/**
 * Icono de cada paso (sección) en la cabecera del módulo, elegido por palabras clave del título.
 *
 * Así el contenido no necesita un campo nuevo: el título ya dice de qué trata la sección. Las reglas
 * van de la más específica a la más general y la primera que coincide gana; si ninguna coincide se
 * usa un libro abierto. Los iconos son decorativos (el título del paso va siempre escrito al lado).
 */
import type { Component } from 'vue';
import {
  Bandage,
  BookOpen,
  ClipboardCheck,
  CircleDot,
  Dumbbell,
  FlaskConical,
  Gem,
  Hourglass,
  Layers,
  Microscope,
  MoveHorizontal,
  Radar,
  RefreshCw,
  Route,
  Scale,
  ShieldCheck,
  Smile,
  Target,
  TrendingDown,
  TriangleAlert,
  Waves,
} from '@lucide/vue';

const REGLAS: readonly (readonly [RegExp, Component])[] = [
  [/evaluacion|cierre/, ClipboardCheck],
  [/fractura|reparacion/, Bandage],
  [/falla|patolog|alteracion/, TriangleAlert],
  [/ortodont|ligamento/, MoveHorizontal],
  [/vesicula/, CircleDot],
  [/hidroxiapatita|cristal|mineraliz/, Gem],
  [/colageno|fibrilla/, Waves],
  [/osteocito|sensor|mecanostato/, Radar],
  [/remodelado|bmu|acoplamiento/, RefreshCw],
  [/rank|wnt|pth|hormona|calcio|fosfato|mensajero|proteina/, FlaskConical],
  [/osteoporosis|envejec|anos\b/, Hourglass],
  [/curva|masa osea/, TrendingDown],
  [/equilibrio/, Scale],
  [/prevenir|intervenir/, ShieldCheck],
  [/mandibula/, Smile],
  [/osteoblasto|osteoclasto|celula|ectomesenquima/, Microscope],
  [/osteona|organiza|corte/, Target],
  [/ruta|condensacion|construir/, Route],
  [/matriz|tejido|osteoide/, Layers],
  [/sirve|funcion/, Dumbbell],
];

/** Título en minúsculas y sin tildes, para comparar con las reglas. */
function normalizar(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function iconoDeSeccion(titulo: string): Component {
  const t = normalizar(titulo);
  for (const [regla, icono] of REGLAS) if (regla.test(t)) return icono;
  return BookOpen;
}
