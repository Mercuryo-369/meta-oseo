/**
 * Las cuatro piezas de la escena del osteoclasto, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `EntornoOseo`: el bloque de hueso mineralizado en dos mitades (la delantera se aparta y se desvanece al
 *    cortar la escena), con la superficie que se excava (la laguna de Howship) y el capilar.
 *  - `Osteoclasto`: la célula multinucleada (cúpula en dos mitades con tapa de sección), sus núcleos, el anillo de
 *    sellado, los pliegues del borde festoneado y los cuerpos apoptóticos.
 *  - `CelulasMononucleares`: los precursores que bajan del capilar y se fusionan, y las células de inversión que
 *    llegan al final; un solo InstancedMesh con color por instancia.
 *  - `Particulas`: protones, cloruro y enzimas que salen hacia el hueso, y calcio, fosfato y colágeno que
 *    atraviesan la célula hacia el capilar; su avance sale de `t`, sin relojes propios.
 *
 * No calculan nada de la biología: reciben `EstadoOsteoclasto` (puro) y solo mueven, escalan y aclaran piezas.
 * Materiales compartidos por tipo, físicos y con el relieve de su tejido (`realismo.ts`); `InstancedMesh` para
 * todo lo repetido; al liberar se libera todo.
 *
 * Revisión de diseño (2026-10-17): sin emisivos en el capilar, la zona clara, los núcleos y los pliegues
 * (realismo-03: se veían iluminados por dentro; la zona clara, como un aro de neón). Las partículas conservan un
 * emisivo tenue, pero teñido con el color de cada instancia (render-09): el blanco las desteñía hacia el pastel
 * (el Cl- verde salía verde menta, el H+ naranja, salmón). Colores de la paleta unificada (`paleta.ts`).
 */
import type { BufferGeometry, Material } from 'three';
import {
  DynamicDrawUsage,
  FrontSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { acotar, mezclar, suave } from '../interpolacion';
import { lineal, mezclarRgb } from '../bmu/paleta';
import type { Rgb } from '../bmu/paleta';
import type { TipoTejido } from '../realismo';
import { inyectar, liberarMaterialOrganico, materialOrganico, ponerOpacidad } from '../realismo';
import {
  celulasInversion,
  fragmentos,
  nucleos,
  particulasAcido,
  particulasProductos,
  pliegues,
  precursores,
} from './disposicion';
import type { Punto3, TipoAcido, TipoProducto } from './disposicion';
import {
  ALTURA_PLIEGUES,
  BASE_CUPULA,
  BLOQUE,
  CAPILAR,
  CELULA_APLANADA,
  DESPLAZAMIENTO_CORTE,
  N_FRAGMENTOS,
  N_INVERSION,
  N_NUCLEOS,
  N_PARTICULAS_ACIDO,
  N_PARTICULAS_PRODUCTOS,
  N_PLIEGUES,
  N_PRECURSORES,
  PROFUNDIDAD_LAGUNA,
  R_CELULA_REDONDA,
  R_SELLADO,
  dimensionesCelula,
  profundidadLaguna,
} from './estado';
import type { EstadoOsteoclasto } from './estado';
import {
  caraCorte,
  cupulaLobulada,
  esferaSencilla,
  ladosBloque,
  medioAnillo,
  superficieHueso,
  tapaLobulada,
  tubo,
  uvPlanar,
} from './geometria';
import type { Mitad } from './geometria';
import { NATURAL as COLOR } from './paleta';

/**
 * Material de un tejido (`realismo.ts`): físico y con relieve de superficie hecho por código. De una sola cara
 * en esta escena, como antes: las cúpulas translúcidas y la mitad del bloque que se desvanece se ven mejor sin
 * sus caras interiores.
 */
function material(
  color: string,
  tipo: TipoTejido,
  extra: ConstructorParameters<typeof MeshPhysicalMaterial>[0] = {},
): MeshPhysicalMaterial {
  return materialOrganico(color, tipo, { side: FrontSide, ...extra });
}

/** Libera materiales: los orgánicos con su clon de textura de relieve. */
function liberarMateriales(lista: readonly Material[]): void {
  for (const m of lista) {
    if (m instanceof MeshPhysicalMaterial) liberarMaterialOrganico(m);
    else m.dispose();
  }
}

/**
 * Cambia cuántas veces se repite el relieve del material en las UV de su pieza (el clon de la textura es propio
 * de cada material y hace también de mapa de rugosidad).
 */
function repetir(m: MeshPhysicalMaterial, u: number, v: number): MeshPhysicalMaterial {
  m.bumpMap?.repeat.set(u, v);
  return m;
}

/**
 * Multiplica el emisivo del material por el color de cada instancia (o de cada vértice): sin esto three lo suma
 * igual a todas, y un emisivo blanco las aclara hacia el blanco. `USE_COLOR` se define con `instanceColor`.
 */
function emisivoPorInstancia(m: MeshPhysicalMaterial): void {
  inyectar(m, 'emisivo_instancia', (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
#ifdef USE_COLOR
  totalEmissiveRadiance *= vColor.rgb;
#endif`,
    );
  });
}

/** Fracción decimal de `x` (0 a 1). */
function fraccionDecimal(x: number): number {
  return x - Math.floor(x);
}

/** Interfaz común de las piezas. */
export interface PiezaOsteoclasto {
  readonly grupo: Group;
  actualizar: (estado: EstadoOsteoclasto) => void;
  liberar: () => void;
}

const M = new Matrix4();
const Q = new Quaternion();
const P = new Vector3();
const S = new Vector3();
const OCULTA = new Matrix4().makeScale(0, 0, 0);

/** Escribe en la instancia `i` una esfera de semiejes (sx, sy, sz) centrada en (x, y, z). */
function esfera(
  malla: InstancedMesh,
  i: number,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
): void {
  M.compose(P.set(x, y, z), Q, S.set(sx, sy, sz));
  malla.setMatrixAt(i, M);
}

/* -------------------------------------------------------------------------------------------
 * Entorno óseo: bloque en dos mitades y capilar
 * ----------------------------------------------------------------------------------------- */

const NX = 72;
const NZ = 24;
const COLOR_HUESO = lineal(COLOR.hueso);
const COLOR_RESORBIDO = lineal(COLOR.huesoResorbido);
const AUX_RGB: Rgb = [0, 0, 0];
/**
 * Lado (en unidades de escena) de una repetición del relieve del hueso: a esta escala sus poros recuerdan las
 * bocas de los canalículos de una superficie ósea vista al microscopio electrónico.
 */
const GRANO_HUESO = 1.6;

/** Una mitad del bloque: superficie deformable, cara de corte que la sigue y lados fijos. */
class MitadBloque {
  readonly grupo = new Group();
  private readonly superficie: Mesh;
  private readonly cara: Mesh;
  private readonly materiales: Material[] = [];
  private readonly geometrias: BufferGeometry[] = [];
  private ultimaExcavacion = -1;

  constructor(private readonly mitad: Mitad) {
    const signo = mitad === 'trasera' ? -1 : 1;
    const x0 = -BLOQUE.ancho / 2;
    const x1 = BLOQUE.ancho / 2;
    const zLejano = (signo * BLOQUE.fondo) / 2;
    this.grupo.name = `hueso_${mitad}`;

    // Base blanca: el color lo dan los vértices (hueso intacto a hueso resorbido); con la base del color del
    // hueso, los dos se multiplicaban y el tono salía más oscuro de lo previsto.
    const matSuperficie = repetir(material('#ffffff', 'hueso', { vertexColors: true }), 1, 1);
    const matLados = repetir(material(COLOR.corteHueso, 'hueso'), 1, 1);
    this.materiales.push(matSuperficie, matLados);

    // UV en unidades de escena (`uvPlanar`): el grano del relieve mide lo mismo en todas las caras del bloque.
    const geoSuperficie = uvPlanar(
      superficieHueso(NX, NZ, x0, x1, Math.min(0, zLejano), Math.max(0, zLejano)),
      GRANO_HUESO,
    );
    this.superficie = new Mesh(geoSuperficie, matSuperficie);
    this.superficie.name = 'superficie_osea';
    const geoCara = uvPlanar(
      caraCorte(NX, x0, x1, -BLOQUE.alto, mitad === 'trasera' ? 1 : -1),
      GRANO_HUESO,
    );
    this.cara = new Mesh(geoCara, matLados);
    this.cara.name = 'cara_de_corte';
    const geoLados = uvPlanar(ladosBloque(x0, x1, zLejano, -BLOQUE.alto), GRANO_HUESO);
    const lados = new Mesh(geoLados, matLados);
    lados.name = 'lados_bloque';
    this.geometrias.push(geoSuperficie, geoCara, geoLados);
    this.grupo.add(this.superficie, this.cara, lados);
    this.excavar(0);
  }

  /** Escribe en su sitio las alturas y los colores de la superficie y la fila superior de la cara de corte. */
  private excavar(excavacion: number): void {
    if (Math.abs(excavacion - this.ultimaExcavacion) < 1e-4) return;
    this.ultimaExcavacion = excavacion;
    const pos = this.superficie.geometry.getAttribute('position');
    const col = this.superficie.geometry.getAttribute('color');
    for (let i = 0; i < pos.count; i++) {
      const p = profundidadLaguna(pos.getX(i), pos.getZ(i), excavacion);
      pos.setY(i, -p);
      mezclarRgb(COLOR_HUESO, COLOR_RESORBIDO, acotar(p / (PROFUNDIDAD_LAGUNA * 0.55)), AUX_RGB);
      col.setXYZ(i, AUX_RGB[0], AUX_RGB[1], AUX_RGB[2]);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.superficie.geometry.computeVertexNormals();
    // La fila superior de la cara de corte son los primeros NX + 1 vértices (PlaneGeometry va de arriba abajo).
    const posCara = this.cara.geometry.getAttribute('position');
    for (let i = 0; i <= NX; i++) {
      posCara.setY(i, -profundidadLaguna(posCara.getX(i), 0, excavacion));
    }
    posCara.needsUpdate = true;
  }

  actualizar(estado: EstadoOsteoclasto): void {
    if (this.mitad === 'delantera') {
      const opacidad = 1 - estado.corte;
      this.grupo.visible = opacidad > 0.004;
      if (!this.grupo.visible) return;
      this.grupo.position.z = estado.corte * DESPLAZAMIENTO_CORTE;
      ponerOpacidad(this.materiales, opacidad);
    }
    this.excavar(estado.excavacion);
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
  }
}

export class EntornoOseo implements PiezaOsteoclasto {
  readonly grupo = new Group();
  private readonly mitades: MitadBloque[];
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];

  constructor() {
    this.grupo.name = 'entorno_oseo';
    this.mitades = [new MitadBloque('trasera'), new MitadBloque('delantera')];
    for (const m of this.mitades) this.grupo.add(m.grupo);

    // Sin emisivo (antes #7a2a24 × 0,35): la sangre no da luz.
    const matCapilar = material(COLOR.capilar, 'vaso');
    // Más lados que antes (18): es largo y se ve de cerca en la vista de la célula.
    const geoCapilar = tubo(CAPILAR.radio, CAPILAR.largo, 28);
    const capilar = new Mesh(geoCapilar, matCapilar);
    capilar.position.set(0, CAPILAR.y, CAPILAR.z);
    capilar.name = 'capilar';
    this.geometrias.push(geoCapilar);
    this.materiales.push(matCapilar);
    this.grupo.add(capilar);
  }

  actualizar(estado: EstadoOsteoclasto): void {
    for (const m of this.mitades) m.actualizar(estado);
  }

  liberar(): void {
    for (const m of this.mitades) m.liberar();
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
  }
}

/* -------------------------------------------------------------------------------------------
 * Osteoclasto: cúpula, núcleos, anillo de sellado, pliegues y cuerpos apoptóticos
 * ----------------------------------------------------------------------------------------- */

/** Opacidad del citoplasma sano: translúcido para ver los núcleos y los pliegues. */
const OPACIDAD_CITOPLASMA = 0.8;
const GROSOR_SELLADO = 0.07;
/**
 * Núcleos ovalados y algo aplanados, como en los cortes (no esferas iguales): factor de cada semieje (x, y, z)
 * por núcleo, fijo.
 */
const FORMA_NUCLEOS: readonly (readonly [number, number, number])[] = [
  [1.16, 0.8, 0.98],
  [0.96, 0.84, 1.16],
  [1.12, 0.78, 1.06],
  [1.0, 0.86, 1.14],
  [1.18, 0.82, 0.94],
  [1.04, 0.8, 1.1],
];

export class Osteoclasto implements PiezaOsteoclasto {
  readonly grupo = new Group();
  /** Mitad trasera de la cúpula y su tapa de sección (escala y posición de la célula). */
  private readonly cuerpo = new Group();
  /** Mitad delantera: misma escala, se aparta con el corte. */
  private readonly frente = new Group();
  private readonly anilloTrasero: Mesh;
  private readonly anilloDelantero: Mesh;
  private readonly matCuerpo: MeshPhysicalMaterial;
  private readonly matFrente: MeshPhysicalMaterial;
  private readonly matAnilloTrasero: MeshPhysicalMaterial;
  private readonly matAnilloDelantero: MeshPhysicalMaterial;
  private readonly nucleos: InstancedMesh;
  private readonly pliegues: InstancedMesh;
  private readonly fragmentos: InstancedMesh;
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly datosNucleos = nucleos();
  private readonly datosPliegues = pliegues();
  private readonly datosFragmentos = fragmentos();

  constructor() {
    this.grupo.name = 'osteoclasto';
    // Citoplasma: superficie blanda y húmeda; el relieve, repetido para que su grano no salga estirado en la
    // cúpula aplanada (las UV de cada media cúpula abarcan media vuelta a lo ancho).
    const citoplasma = (): MeshPhysicalMaterial =>
      repetir(material(COLOR.osteoclasto, 'celula', { transparent: true }), 4, 1.5);
    this.matCuerpo = citoplasma();
    this.matFrente = citoplasma();
    // Zona clara: citoplasma sin orgánulos, rico en actina. Un material por mitad (antes, un clon). Sin emisivo
    // (antes, su propio color × 0,25: parecía un aro de neón); su claridad es la del color.
    const zonaClara = (): MeshPhysicalMaterial =>
      material(COLOR.zonaClara, 'celula', { transparent: true });
    this.matAnilloTrasero = zonaClara();
    this.matAnilloDelantero = zonaClara();
    this.materiales.push(
      this.matCuerpo,
      this.matFrente,
      this.matAnilloTrasero,
      this.matAnilloDelantero,
    );

    // Cúpula con lóbulos suaves (`lobulosCupula`): una célula real no es una esfera perfecta.
    const geoTrasera = cupulaLobulada('trasera');
    const geoDelantera = cupulaLobulada('delantera');
    const geoTapa = tapaLobulada();
    this.geometrias.push(geoTrasera, geoDelantera, geoTapa);
    const trasera = new Mesh(geoTrasera, this.matCuerpo);
    trasera.name = 'citoplasma_trasero';
    const tapa = new Mesh(geoTapa, this.matCuerpo);
    tapa.name = 'seccion_citoplasma';
    tapa.position.z = 0.004;
    const delantera = new Mesh(geoDelantera, this.matFrente);
    delantera.name = 'citoplasma_delantero';
    this.cuerpo.add(trasera, tapa);
    this.frente.add(delantera);

    const geoAnilloT = medioAnillo(R_SELLADO, GROSOR_SELLADO, 'trasera');
    const geoAnilloD = medioAnillo(R_SELLADO, GROSOR_SELLADO, 'delantera');
    this.geometrias.push(geoAnilloT, geoAnilloD);
    this.anilloTrasero = new Mesh(geoAnilloT, this.matAnilloTrasero);
    this.anilloTrasero.name = 'zona_clara_trasera';
    this.anilloDelantero = new Mesh(geoAnilloD, this.matAnilloDelantero);
    this.anilloDelantero.name = 'zona_clara_delantera';

    // Núcleos: cromatina granulosa. Pliegues del borde festoneado: membrana lisa y húmeda. Cuerpos apoptóticos:
    // trozos de célula. Sin emisivos (antes 0,3 y 0,2): con luz de verdad tienen volumen.
    const matNucleo = material(COLOR.nucleo, 'nucleo');
    const matPliegue = material(COLOR.bordeFestoneado, 'organulo');
    const matFragmento = material(COLOR.cuerpoApoptotico, 'celula');
    this.materiales.push(matNucleo, matPliegue, matFragmento);
    // Pliegues con 10 × 7 lados (antes 8 × 6): se ven de cerca en la vista del borde. Los cuerpos apoptóticos
    // tienen su propia esfera de 12 × 8 (antes compartían la de los pliegues).
    const geoNucleo = esferaSencilla(12, 8);
    const geoPliegue = esferaSencilla(10, 7);
    const geoFragmento = esferaSencilla(12, 8);
    this.geometrias.push(geoNucleo, geoPliegue, geoFragmento);
    this.nucleos = new InstancedMesh(geoNucleo, matNucleo, N_NUCLEOS);
    this.nucleos.name = 'nucleos';
    this.pliegues = new InstancedMesh(geoPliegue, matPliegue, N_PLIEGUES);
    this.pliegues.name = 'borde_festoneado';
    this.fragmentos = new InstancedMesh(geoFragmento, matFragmento, N_FRAGMENTOS);
    this.fragmentos.name = 'cuerpos_apoptoticos';
    for (const m of [this.nucleos, this.pliegues, this.fragmentos]) {
      m.instanceMatrix.setUsage(DynamicDrawUsage);
      m.frustumCulled = false;
    }

    this.grupo.add(
      this.cuerpo,
      this.frente,
      this.anilloTrasero,
      this.anilloDelantero,
      this.nucleos,
      this.pliegues,
      this.fragmentos,
    );
  }

  actualizar(estado: EstadoOsteoclasto): void {
    const { rx, ry, centroY } = dimensionesCelula(estado);
    const hayCelula = estado.celula.escala > 0.01 && estado.celula.opacidad > 0.004;
    const hundimiento = -BASE_CUPULA * ry - centroY;
    const avanceFrente = estado.corte * DESPLAZAMIENTO_CORTE * 0.6;

    // Cúpula.
    this.cuerpo.visible = hayCelula;
    this.frente.visible = hayCelula && estado.corte < 0.996;
    if (hayCelula) {
      this.cuerpo.position.set(0, centroY, 0);
      this.cuerpo.scale.set(rx, ry, rx);
      this.frente.position.set(0, centroY, avanceFrente);
      this.frente.scale.set(rx, ry, rx);
      ponerOpacidad([this.matCuerpo], OPACIDAD_CITOPLASMA * estado.celula.opacidad);
      ponerOpacidad(
        [this.matFrente],
        OPACIDAD_CITOPLASMA * estado.celula.opacidad * (1 - estado.corte),
      );
      // El citoplasma nunca escribe profundidad: los núcleos y los pliegues se ven a través.
      this.matCuerpo.depthWrite = false;
      this.matFrente.depthWrite = false;
    }

    // Anillo de sellado: sigue al borde de la célula y se aplasta al aparecer y al deshacerse.
    const haySellado = hayCelula && estado.sellado > 0.01;
    this.anilloTrasero.visible = haySellado;
    this.anilloDelantero.visible = haySellado && estado.corte < 0.996;
    if (haySellado) {
      const radial = rx / CELULA_APLANADA.rx;
      const y = GROSOR_SELLADO * 0.8 - hundimiento * 0.5;
      const aplastado = mezclar(0.25, 1, estado.sellado);
      this.anilloTrasero.position.set(0, y, 0);
      this.anilloTrasero.scale.set(radial, aplastado, radial);
      this.anilloDelantero.position.set(0, y, avanceFrente);
      this.anilloDelantero.scale.set(radial, aplastado, radial);
      ponerOpacidad([this.matAnilloTrasero], estado.sellado);
      ponerOpacidad([this.matAnilloDelantero], estado.sellado * (1 - estado.corte));
    }

    this.ponerNucleos(estado, rx, ry, centroY, hayCelula);
    this.ponerPliegues(estado, hayCelula);
    this.ponerFragmentos(estado, rx, centroY);
  }

  private ponerNucleos(
    estado: EstadoOsteoclasto,
    rx: number,
    ry: number,
    centroY: number,
    hayCelula: boolean,
  ): void {
    this.nucleos.visible = hayCelula;
    if (!hayCelula) return;
    const condensacion = mezclar(1, 0.65, estado.fragmentacion);
    this.datosNucleos.forEach((n, i) => {
      const delante = n.local[2] > 0;
      const k = condensacion * (delante ? 1 - estado.corte : 1);
      const radio = Math.min(n.radio * rx, 0.45 * ry) * k;
      if (radio < 0.004) {
        this.nucleos.setMatrixAt(i, OCULTA);
        return;
      }
      const [fx, fy, fz] = FORMA_NUCLEOS[i % FORMA_NUCLEOS.length]!;
      esfera(
        this.nucleos,
        i,
        n.local[0] * rx,
        centroY + n.local[1] * ry,
        n.local[2] * rx,
        radio * fx,
        radio * fy,
        radio * fz,
      );
    });
    this.nucleos.instanceMatrix.needsUpdate = true;
  }

  private ponerPliegues(estado: EstadoOsteoclasto, hayCelula: boolean): void {
    const hay = hayCelula && estado.pliegues > 0.01;
    this.pliegues.visible = hay;
    if (!hay) return;
    const grosor = Math.sqrt(estado.pliegues);
    this.datosPliegues.forEach((p, i) => {
      const suelo = -profundidadLaguna(p.x, p.z, estado.excavacion) + 0.015;
      const techo = ALTURA_PLIEGUES * p.altura * estado.pliegues;
      const alto = techo - suelo;
      const k = p.z > 0 ? 1 - estado.corte : 1;
      if (alto < 0.01 || k < 0.02) {
        this.pliegues.setMatrixAt(i, OCULTA);
        return;
      }
      esfera(
        this.pliegues,
        i,
        p.x,
        (techo + suelo) / 2,
        p.z,
        p.radio * grosor * k,
        alto / 2,
        p.radio * grosor * k,
      );
    });
    this.pliegues.instanceMatrix.needsUpdate = true;
  }

  private ponerFragmentos(estado: EstadoOsteoclasto, rx: number, centroY: number): void {
    const hay = estado.fragmentacion > 0.02;
    this.fragmentos.visible = hay;
    if (!hay) return;
    const f = suave(estado.fragmentacion);
    this.datosFragmentos.forEach((fr, i) => {
      // Se desprenden poco más allá de la célula encogida y caen al fondo de la laguna.
      const distancia = rx * 0.7 + 0.5 * f;
      const x = fr.direccion[0] * distancia;
      const z = fr.direccion[2] * distancia;
      const radio = fr.radio * (0.3 + 0.7 * estado.fragmentacion);
      const suelo = -profundidadLaguna(x, z, estado.excavacion) + radio * 0.85 + 0.01;
      const y = Math.max(suelo, centroY + fr.direccion[1] * distancia * 0.6 - 0.45 * f);
      esfera(this.fragmentos, i, x, y, z, radio, radio * 0.85, radio);
    });
    this.fragmentos.instanceMatrix.needsUpdate = true;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    this.nucleos.dispose();
    this.pliegues.dispose();
    this.fragmentos.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Células mononucleares: precursores y células de inversión
 * ----------------------------------------------------------------------------------------- */

const N_MONONUCLEARES = N_PRECURSORES + N_INVERSION;

export class CelulasMononucleares implements PiezaOsteoclasto {
  readonly grupo = new Group();
  private readonly malla: InstancedMesh;
  private readonly geometria: BufferGeometry;
  private readonly material: MeshPhysicalMaterial;
  private readonly datosPrecursores = precursores();
  private readonly datosInversion = celulasInversion();

  constructor() {
    this.grupo.name = 'celulas_mononucleares';
    // 12 × 8 lados (antes 10 × 7): son células a la vista desde el primer paso.
    this.geometria = esferaSencilla(12, 8);
    // Base blanca: el color de cada instancia (cuerpo o núcleo) es el que se ve; con la base del color del
    // precursor, los dos se multiplicaban. El brillo de terciopelo, del color de la célula y no blanco.
    this.material = material('#ffffff', 'celula', { sheenColor: COLOR.precursor });
    // Dos instancias por célula: cuerpo y núcleo (el núcleo asoma por arriba, como en la BMU).
    this.malla = new InstancedMesh(this.geometria, this.material, N_MONONUCLEARES * 2);
    this.malla.instanceMatrix.setUsage(DynamicDrawUsage);
    this.malla.frustumCulled = false;
    this.malla.name = 'mononucleares';
    const colores = new Float32Array(N_MONONUCLEARES * 2 * 3);
    const cuerpo = lineal(COLOR.precursor);
    const nucleo = lineal(COLOR.nucleo);
    for (let i = 0; i < N_MONONUCLEARES; i++) {
      colores.set(cuerpo, i * 6);
      colores.set(nucleo, i * 6 + 3);
    }
    this.malla.instanceColor = new InstancedBufferAttribute(colores, 3);
    this.grupo.add(this.malla);
  }

  /**
   * Célula `i` en `p` con radio `r`; con `r` casi nulo se oculta. Cada cuerpo es un poco ovalado en el plano
   * del hueso (fijo por célula): no son bolas idénticas. El alto no cambia, así que sigue apoyada igual.
   */
  private celula(i: number, p: Punto3, r: number): void {
    if (r < 0.01) {
      this.malla.setMatrixAt(i * 2, OCULTA);
      this.malla.setMatrixAt(i * 2 + 1, OCULTA);
      return;
    }
    const fx = 1 + 0.08 * Math.sin(i * 2.3 + 0.5);
    const fz = 1 + 0.08 * Math.cos(i * 1.7 + 1.1);
    esfera(this.malla, i * 2, p[0], p[1], p[2], r * fx, r, r * fz);
    const rn = r * 0.55;
    esfera(this.malla, i * 2 + 1, p[0], p[1] + r * 0.6, p[2], rn, rn, rn);
  }

  actualizar(estado: EstadoOsteoclasto): void {
    const { llegada, fusion } = estado.precursores;
    const f = suave(fusion);
    const centroFusion: Punto3 = [0, R_CELULA_REDONDA * 0.55, 0];
    this.datosPrecursores.forEach((pr, i) => {
      const marcha = suave(acotar(llegada * 1.5 - pr.orden * 0.5));
      const p: [number, number, number] = [
        mezclar(pr.origen[0], pr.destino[0], marcha),
        mezclar(pr.origen[1], pr.destino[1], marcha),
        mezclar(pr.origen[2], pr.destino[2], marcha),
      ];
      // Bajan en arco, separándose un poco del capilar antes de caer sobre el hueso.
      p[2] += 0.35 * Math.sin(Math.PI * marcha);
      if (f > 0) {
        p[0] = mezclar(p[0], centroFusion[0], f);
        p[1] = mezclar(p[1], centroFusion[1], f);
        p[2] = mezclar(p[2], centroFusion[2], f);
        // Mientras se fusionan quedan como bultos sobre la superficie de la célula que crece, no dentro de ella.
        const rCelula = R_CELULA_REDONDA * estado.celula.escala * 0.92;
        const dx = p[0] - centroFusion[0];
        const dy = p[1] - centroFusion[1];
        const dz = p[2] - centroFusion[2];
        const d = Math.hypot(dx, dy, dz);
        if (d > 1e-6 && d < rCelula) {
          const k = rCelula / d;
          p[0] = centroFusion[0] + dx * k;
          p[1] = centroFusion[1] + dy * k;
          p[2] = centroFusion[2] + dz * k;
        }
      }
      // El radio cae despacio al principio y de golpe al final, para que se vean absorberse.
      this.celula(i, p, pr.radio * (1 - f * f));
    });
    this.datosInversion.forEach((c, j) => {
      const marcha = suave(acotar(estado.inversion * 1.4 - c.orden * 0.4));
      const tamano = c.radio * suave(acotar(estado.inversion * 3));
      this.celula(
        N_PRECURSORES + j,
        [
          mezclar(c.origen[0], c.destino[0], marcha),
          mezclar(c.origen[1], c.destino[1], marcha),
          mezclar(c.origen[2], c.destino[2], marcha),
        ],
        tamano,
      );
    });
    this.malla.instanceMatrix.needsUpdate = true;
    // Sin precursores ni células de inversión a la vista no hace falta dibujar la malla.
    this.malla.visible = fusion < 0.999 || estado.inversion > 0.004;
  }

  liberar(): void {
    this.malla.dispose();
    this.geometria.dispose();
    liberarMaterialOrganico(this.material);
  }
}

/* -------------------------------------------------------------------------------------------
 * Partículas: salida ácida hacia el hueso y productos hacia el capilar
 * ----------------------------------------------------------------------------------------- */

/** Ciclos completos de cada partícula a lo largo de toda la línea de tiempo (su avance sale de `t`). */
const CICLOS_ACIDO = 16;
const CICLOS_PRODUCTOS = 10;
/** Altura (dentro del citoplasma, sobre los pliegues) de la que parten las vesículas ácidas. */
const Y_VESICULAS = 0.34;

const COLOR_ACIDO = {
  proton: lineal(COLOR.proton),
  cloruro: lineal(COLOR.cloruro),
  catepsina: lineal(COLOR.catepsina),
} as const;
const COLOR_PRODUCTO = {
  calcio: lineal(COLOR.calcio),
  fosfato: lineal(COLOR.fosfato),
  colageno: lineal(COLOR.colageno),
} as const;
/**
 * Tamaño relativo de cada partícula según lo que es (todas exageradas): el protón y el calcio, iones diminutos;
 * la catepsina K y los fragmentos de colágeno, proteínas mucho mayores.
 */
const TAMANO_ACIDO: Readonly<Record<TipoAcido, number>> = {
  proton: 0.8,
  cloruro: 1,
  catepsina: 1.3,
};
const TAMANO_PRODUCTO: Readonly<Record<TipoProducto, number>> = {
  calcio: 0.85,
  fosfato: 1,
  colageno: 1.3,
};

export class Particulas implements PiezaOsteoclasto {
  readonly grupo = new Group();
  private readonly acido: InstancedMesh;
  private readonly productos: InstancedMesh;
  private readonly geometria: BufferGeometry;
  private readonly material: MeshPhysicalMaterial;
  private readonly datosAcido = particulasAcido();
  private readonly datosProductos = particulasProductos();

  constructor() {
    this.grupo.name = 'particulas';
    this.geometria = esferaSencilla(8, 6);
    // Moléculas e iones: lisos y satinados; base blanca para que se vea el color de cada instancia. Un emisivo tenue
    // para que se lean dentro de la célula, teñido con el color de la instancia (three suma el emisivo igual a
    // todas: blanco, desteñía los colores que nombra el texto). El brillo de terciopelo ya es gris (`realismo.ts`).
    this.material = material('#ffffff', 'molecula', {
      emissive: '#ffffff',
      emissiveIntensity: 0.18,
    });
    emisivoPorInstancia(this.material);
    this.acido = this.crear(
      N_PARTICULAS_ACIDO,
      'salida_acida',
      this.datosAcido.map((p) => COLOR_ACIDO[p.tipo]),
    );
    this.productos = this.crear(
      N_PARTICULAS_PRODUCTOS,
      'productos_resorcion',
      this.datosProductos.map((p) => COLOR_PRODUCTO[p.tipo]),
    );
    this.grupo.add(this.acido, this.productos);
  }

  private crear(n: number, nombre: string, colores: readonly Rgb[]): InstancedMesh {
    const malla = new InstancedMesh(this.geometria, this.material, n);
    malla.instanceMatrix.setUsage(DynamicDrawUsage);
    malla.frustumCulled = false;
    malla.name = nombre;
    const datos = new Float32Array(n * 3);
    colores.forEach((c, i) => datos.set(c, i * 3));
    malla.instanceColor = new InstancedBufferAttribute(datos, 3);
    return malla;
  }

  actualizar(estado: EstadoOsteoclasto): void {
    this.acido.visible = estado.bombeo > 0.02;
    if (this.acido.visible) {
      this.datosAcido.forEach((p, i) => {
        const s = fraccionDecimal(estado.t * CICLOS_ACIDO + p.desfase);
        const suelo = -profundidadLaguna(p.x, p.z, estado.excavacion) - 0.02;
        const y = mezclar(Y_VESICULAS, suelo, s);
        const r = 0.048 * TAMANO_ACIDO[p.tipo] * estado.bombeo * Math.sqrt(Math.sin(Math.PI * s));
        esfera(this.acido, i, p.x, y, p.z, r, r, r);
      });
      this.acido.instanceMatrix.needsUpdate = true;
    }

    this.productos.visible = estado.liberacion > 0.02;
    if (this.productos.visible) {
      const { ry, centroY } = dimensionesCelula(estado);
      const cima = centroY + ry + 0.12;
      this.datosProductos.forEach((p, i) => {
        const s = fraccionDecimal(estado.t * CICLOS_PRODUCTOS + p.desfase);
        const y0 = -profundidadLaguna(p.x, p.z, estado.excavacion) + 0.04;
        // Curva de Bézier cuadrática: fondo de la laguna → cima de la célula → capilar (transcitosis).
        const a = (1 - s) * (1 - s);
        const b = 2 * (1 - s) * s;
        const c = s * s;
        const x = a * p.x + b * p.x * 0.2 + c * p.destino[0];
        const y = a * y0 + b * cima + c * p.destino[1];
        const z = a * p.z + b * p.z * 0.2 + c * p.destino[2];
        const r =
          0.052 * TAMANO_PRODUCTO[p.tipo] * estado.liberacion * Math.sqrt(Math.sin(Math.PI * s));
        esfera(this.productos, i, x, y, z, r, r, r);
      });
      this.productos.instanceMatrix.needsUpdate = true;
    }
  }

  liberar(): void {
    this.acido.dispose();
    this.productos.dispose();
    this.geometria.dispose();
    liberarMaterialOrganico(this.material);
  }
}
