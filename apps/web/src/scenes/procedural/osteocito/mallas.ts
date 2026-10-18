/**
 * Las piezas de la escena del osteocito, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `BloqueMatriz`: el bloque de matriz mineralizada (semitransparente por delante, con pared de fondo y
 *    laminillas), el conducto de Havers con su capilar a la izquierda, el borde de osteoide de la superficie
 *    arriba y las dos flechas de la carga.
 *  - `RedCelular`: los osteocitos (laguna, cuerpo, núcleo), sus dendritas dentro de los canalículos (tramos
 *    instanciados: un cilindro fino dentro de un tubo translúcido de líquido) y las uniones comunicantes.
 *  - `Dinamica`: lo que se mueve al cargar el hueso: las partículas del líquido, los sensores de la célula
 *    central (cilio primario, integrinas), las moléculas de esclerostina y los pulsos de la señal.
 *  - `Superficie`: las células de la superficie, que pasan de aplanadas (revestimiento) a cúbicas
 *    (osteoblastos activos) cuando llega la señal.
 *
 * No calculan nada de la biología: reciben `EstadoOsteocito` (puro) y solo colocan, escalan y aclaran piezas.
 * Materiales compartidos por tipo; `InstancedMesh` para todo lo repetido (una instancia oculta tiene matriz
 * cero); al liberar se libera todo lo creado.
 *
 * Realismo (2026-10-14): materiales físicos por tejido (`realismo.ts`) y paleta natural (`NATURAL`): matriz
 * marfil mate y porosa, laguna oscura (cavidad), conducto revestido de endostio, capilar húmedo, células blandas
 * y húmedas con núcleo de cromatina granulosa, canalículos como vainas de líquido y moléculas lisas.
 *
 * Revisión de diseño (2026-10-17): el borde de osteoide ya no deja en sombra el interior del bloque; los
 * canalículos son un velo (`veloFresnel`: casi transparentes de frente, más densos de canto) y no tubos de cristal;
 * el capilar y las uniones no emiten luz (solo las señales: líquido, sensores y pulsos); el líquido y los pulsos se
 * dibujan de verdad después de los canalículos; y una pieza sin ninguna instancia a la vista no se dibuja.
 */
import type { Material } from 'three';
import {
  BackSide,
  BufferGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  FrontSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { acotar } from '../interpolacion';
import { lineal, mezclarRgb } from '../bmu/paleta';
import type { Rgb } from '../bmu/paleta';
import {
  celulasDeSuperficie,
  integrinasDeLaCentral,
  moleculasDeEsclerostina,
  particulasDeFlujo,
  puntoDeSalida,
  puntoEn,
  redLacunoCanalicular,
  rutasDeMensaje,
} from './disposicion';
import type { Punto3, RedLacunoCanalicular } from './disposicion';
import {
  BLOQUE,
  CONDUCTO,
  CUERPO,
  LAGUNA,
  R_CANALICULO,
  R_CAPILAR,
  R_DENDRITA,
  SEGMENTOS_DENDRITA,
  Y_SUPERFICIE,
} from './estado';
import type { EstadoOsteocito } from './estado';
import {
  cajaEnEscala,
  celulaDesdeBase,
  esfera,
  flecha,
  tramo,
  tuboEnZ,
  uvPorCaras,
} from './geometria';
import { NATURAL as COLOR } from './paleta';
import type { TipoTejido } from '../realismo';
import { liberarMaterialOrganico, materialOrganico, veloFresnel } from '../realismo';

const EJE_Y = new Vector3(0, 1, 0);
const EJE_Z = new Vector3(0, 0, 1);
/**
 * Matriz de una instancia oculta: escala nula, pero con la última fila de una matriz afín (0, 0, 0, 1). Con las
 * 16 componentes a cero, `applyMatrix4` divide entre cero y la esfera envolvente de la malla sale NaN (three la
 * usa para ordenar los transparentes y para el raycast).
 */
const MATRIZ_CERO = new Matrix4().makeScale(0, 0, 0);

/**
 * Material de un tejido (`realismo.ts`): físico, con relieve de superficie hecho por código y de doble cara salvo
 * que `extra` diga otra cosa (los tramos abiertos de las dendritas y los canalículos se ven por dentro;
 * `materialOrganico` ya la pone por defecto).
 */
function material(
  color: string,
  tipo: TipoTejido = 'hueso',
  extra: ConstructorParameters<typeof MeshPhysicalMaterial>[0] = {},
): MeshPhysicalMaterial {
  return materialOrganico(color, tipo, extra);
}

/** Libera materiales: los orgánicos con su clon de textura de relieve. */
function liberarMateriales(lista: readonly Material[]): void {
  for (const m of lista) {
    if (m instanceof MeshPhysicalMaterial) liberarMaterialOrganico(m);
    else m.dispose();
  }
}

/**
 * Repeticiones del relieve de un material orgánico por unidad de UV (el mapa de relieve y el de rugosidad son la
 * misma textura). Para las superficies con UV en unidades de escena, en lugar de la repetición propia del tejido.
 */
function repetirRelieve(mat: MeshPhysicalMaterial, ru: number, rv: number): void {
  mat.bumpMap?.repeat.set(ru, rv);
}

/** Repeticiones del relieve por unidad de escena en la matriz: una repetición mide 2 unidades. */
const RELIEVE_POR_UNIDAD = 0.5;

/** Interfaz común de las piezas. */
export interface PiezaOsteocito {
  readonly grupo: Group;
  actualizar: (estado: EstadoOsteocito) => void;
  liberar: () => void;
}

/** Instancia lista para colocar: `frustumCulled` apagado (las matrices cambian con `t`). */
function instanciar(
  geometria: BufferGeometry,
  mat: Material,
  n: number,
  nombre: string,
): InstancedMesh {
  const malla = new InstancedMesh(geometria, mat, Math.max(1, n));
  malla.name = nombre;
  malla.frustumCulled = false;
  malla.instanceMatrix.setUsage(DynamicDrawUsage);
  for (let i = 0; i < malla.count; i++) malla.setMatrixAt(i, MATRIZ_CERO);
  return malla;
}

/** Escribe en `malla` la instancia `i`: una esfera unitaria colocada en `p` con semiejes `s` (y giro opcional). */
const auxPos = new Vector3();
const auxEsc = new Vector3();
const auxQ = new Quaternion();
const auxM = new Matrix4();
function ponerEsfera(
  malla: InstancedMesh,
  i: number,
  p: Punto3,
  sx: number,
  sy: number,
  sz: number,
  giroZ = 0,
): void {
  auxPos.set(p[0], p[1], p[2]);
  auxEsc.set(sx, sy, sz);
  auxQ.setFromAxisAngle(EJE_Z, giroZ);
  auxM.compose(auxPos, auxQ, auxEsc);
  malla.setMatrixAt(i, auxM);
}

/** Escribe en `malla` la instancia `i`: un tramo (cilindro unitario que crece en +Y) de `a` a `b`, de radio `r`. */
const auxDir = new Vector3();
function ponerTramo(malla: InstancedMesh, i: number, a: Punto3, b: Punto3, r: number): void {
  auxDir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const largo = auxDir.length();
  if (largo < 1e-5) {
    malla.setMatrixAt(i, MATRIZ_CERO);
    return;
  }
  auxDir.divideScalar(largo);
  auxQ.setFromUnitVectors(EJE_Y, auxDir);
  auxPos.set(a[0], a[1], a[2]);
  auxEsc.set(r, largo, r);
  auxM.compose(auxPos, auxQ, auxEsc);
  malla.setMatrixAt(i, auxM);
}

function fraccion(x: number): number {
  return x - Math.floor(x);
}

/* -------------------------------------------------------------------------------------------
 * Bloque de matriz
 * ----------------------------------------------------------------------------------------- */

/** Grosor del borde de osteoide sobre la superficie del hueso. */
export const GROSOR_OSTEOIDE = 0.07;

export class BloqueMatriz implements PiezaOsteocito {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matLineas: LineBasicMaterial;
  private readonly flechas: InstancedMesh;

  constructor() {
    this.grupo.name = 'bloque_matriz';
    const [cx, cy, cz] = BLOQUE.centro;

    // Paredes del bloque (fondo, lados y base): la cara interior de una caja, opaca, con laminillas en la
    // pared del fondo. La cara frontal es un velo translúcido aparte que se dibuja DESPUÉS de lo de dentro
    // (así lo tiñe) y sin escribir profundidad (así no tapa nada).
    // Sombras: solo proyectan las caras que la luz ve por detrás (las del fondo). Si no, la cara de delante y
    // la de arriba de la caja, que la luz ve de frente, dejarían todo el interior en sombra.
    const matFondo = material(COLOR.matrizFondo, 'hueso', { side: BackSide, shadowSide: BackSide });
    repetirRelieve(matFondo, RELIEVE_POR_UNIDAD, RELIEVE_POR_UNIDAD);
    const geoFondo = cajaEnEscala(BLOQUE.ancho, BLOQUE.alto, BLOQUE.fondo);
    const fondo = new Mesh(geoFondo, matFondo);
    fondo.name = 'matriz_paredes';
    fondo.position.set(cx, cy, cz);
    this.grupo.add(fondo);
    this.matLineas = new LineBasicMaterial({
      color: COLOR.laminilla,
      transparent: true,
      opacity: 0.55,
    });
    const geoLaminillas = this.laminillas(cz - BLOQUE.fondo / 2 + 0.01);
    const laminillas = new LineSegments(geoLaminillas, this.matLineas);
    laminillas.name = 'laminillas';
    this.grupo.add(laminillas);
    // Velo: la cara de corte de la matriz, marfil y mate, que deja ver la red de dentro.
    const matVelo = material(COLOR.matriz, 'hueso', {
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: FrontSide,
    });
    repetirRelieve(matVelo, RELIEVE_POR_UNIDAD, RELIEVE_POR_UNIDAD);
    const geoVelo = uvPorCaras(new PlaneGeometry(BLOQUE.ancho, BLOQUE.alto));
    const velo = new Mesh(geoVelo, matVelo);
    velo.name = 'matriz_velo';
    velo.position.set(cx, cy, cz + BLOQUE.fondo / 2);
    velo.renderOrder = 20;
    this.grupo.add(velo);

    // Conducto de Havers a la izquierda, a lo largo de Z, con su capilar dentro.
    // Solo la cara interior: a través del velo se ve la pared del fondo del túnel, no un tubo macizo. Revestida
    // de endostio (fibrosa, con brillo de terciopelo) y más oscura que la matriz: se lee como un túnel.
    const matPared = material(COLOR.paredConducto, 'membrana', { side: BackSide });
    const geoConducto = tuboEnZ(CONDUCTO.radio, BLOQUE.fondo + 0.02);
    const conducto = new Mesh(geoConducto, matPared);
    conducto.name = 'conducto_havers';
    conducto.position.set(CONDUCTO.x, CONDUCTO.y, cz);
    // Sin brillo propio: la sangre no emite luz.
    const matCapilar = material(COLOR.capilar, 'vaso');
    const geoCapilar = tuboEnZ(R_CAPILAR, BLOQUE.fondo + 0.5, 20, false);
    const capilar = new Mesh(geoCapilar, matCapilar);
    capilar.name = 'capilar';
    capilar.position.set(CONDUCTO.x, CONDUCTO.y, cz);
    this.grupo.add(conducto, capilar);

    // Superficie del hueso: un borde de osteoide (colágeno sin mineral, vetas a lo largo de X) sobre el que se
    // sientan las células. No proyecta sombra: es una tapa sobre toda la cara de arriba del bloque y dejaba en
    // sombra la parte alta del interior (los pulsos de la señal, enteros, en el paso «superficie»).
    const matOsteoide = material(COLOR.osteoide, 'fibra');
    repetirRelieve(matOsteoide, 1, RELIEVE_POR_UNIDAD);
    const geoOsteoide = cajaEnEscala(BLOQUE.ancho, GROSOR_OSTEOIDE, BLOQUE.fondo, true);
    const osteoide = new Mesh(geoOsteoide, matOsteoide);
    osteoide.name = 'osteoide_superficie';
    osteoide.position.set(cx, Y_SUPERFICIE + GROSOR_OSTEOIDE / 2, cz);
    osteoide.userData.sinSombra = true;
    this.grupo.add(osteoide);

    // Flechas de la carga: una baja sobre la superficie y otra sube desde la base del bloque.
    const matFlecha = material(COLOR.compresion, 'molecula');
    const geoFlecha = flecha();
    this.flechas = instanciar(geoFlecha, matFlecha, 2, 'flechas_carga');
    this.grupo.add(this.flechas);

    this.geometrias.push(
      geoVelo,
      geoFondo,
      geoLaminillas,
      geoConducto,
      geoCapilar,
      geoOsteoide,
      geoFlecha,
    );
    this.materiales.push(matVelo, matFondo, matPared, matCapilar, matOsteoide, matFlecha);
  }

  /** Laminillas de la pared de fondo: líneas onduladas casi horizontales, como en el SVG del módulo. */
  private laminillas(z: number): BufferGeometry {
    const puntos: number[] = [];
    const [cx, cy] = BLOQUE.centro;
    const x0 = cx - BLOQUE.ancho / 2 + 0.1;
    const x1 = cx + BLOQUE.ancho / 2 - 0.1;
    const paso = 0.2;
    for (let y = cy - BLOQUE.alto / 2 + 0.35; y < Y_SUPERFICIE - 0.2; y += 0.42) {
      for (let x = x0; x < x1 - paso; x += paso) {
        const ya = y + 0.05 * Math.sin(x * 1.3 + y);
        const yb = y + 0.05 * Math.sin((x + paso) * 1.3 + y);
        puntos.push(x, ya, z, x + paso, yb, z);
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(puntos, 3));
    return geo;
  }

  actualizar(estado: EstadoOsteocito): void {
    const c = estado.compresion;
    this.flechas.visible = c >= 0.01;
    if (c < 0.01) {
      this.flechas.setMatrixAt(0, MATRIZ_CERO);
      this.flechas.setMatrixAt(1, MATRIZ_CERO);
    } else {
      const largo = 0.9 + 0.5 * c;
      const [cx, cy] = BLOQUE.centro;
      // Arriba: la punta toca justo por encima de las células de la superficie.
      ponerEsfera(this.flechas, 0, [cx + 0.6, Y_SUPERFICIE + 0.62, 0.3], c, largo, c);
      // Abajo: la punta toca la base del bloque; la flecha se gira 180° para apuntar hacia arriba.
      ponerEsfera(
        this.flechas,
        1,
        [cx + 0.6, cy - BLOQUE.alto / 2 - 0.1, 0.3],
        c,
        largo,
        c,
        Math.PI,
      );
    }
    this.flechas.instanceMatrix.needsUpdate = true;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    this.matLineas.dispose();
    this.flechas.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Red celular: osteocitos, dendritas, canalículos y uniones
 * ----------------------------------------------------------------------------------------- */

/** Desvío (en −X) que la corriente del líquido imprime a mitad de cada dendrita con la carga máxima. */
const ARRASTRE = 0.03;

/**
 * Grosor relativo del tramo `k` de una dendrita: más gruesa junto al cuerpo (×1,2) y más fina hacia la punta
 * (×0,84), como una prolongación celular real. El canalículo, un túnel en la matriz, no cambia.
 */
function grosorDeTramo(k: number): number {
  return 1.2 - (0.36 * k) / Math.max(1, SEGMENTOS_DENDRITA - 1);
}

export class RedCelular implements PiezaOsteocito {
  readonly grupo = new Group();
  readonly red: RedLacunoCanalicular;
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly lagunas: InstancedMesh;
  private readonly cuerpos: InstancedMesh;
  private readonly nucleos: InstancedMesh;
  private readonly dendritas: InstancedMesh;
  private readonly canaliculos: InstancedMesh;
  private readonly uniones: InstancedMesh;
  private readonly matUniones: MeshPhysicalMaterial;
  private ultimaClave = '';

  constructor(red: RedLacunoCanalicular = redLacunoCanalicular()) {
    this.grupo.name = 'red_celular';
    this.red = red;

    // Los cuerpos, las lagunas y los núcleos se ven de cerca (vista `laguna`): esferas lisas. Las uniones son
    // puntos pequeños.
    const geoCuerpo = esfera(20, 14);
    const geoLaguna = esfera(16, 12);
    const geoNucleo = esfera(14, 10);
    const geoEsferaChica = esfera(8, 6);
    const geoTramo = tramo(6);
    this.geometrias.push(geoCuerpo, geoLaguna, geoNucleo, geoEsferaChica, geoTramo);

    // La laguna es una cavidad: oscura y sin brillo. La célula y sus dendritas, blandas y húmedas; el núcleo,
    // de cromatina granulosa. El canalículo es la vaina de líquido que rodea la dendrita: un velo liso, casi
    // transparente de frente y más denso de canto (con opacidad constante y barniz parecía una pajita de
    // cristal). Una sola pasada aunque sea de doble cara: es un tubo fino que no escribe profundidad, y sus dos
    // paredes son del mismo color, así que el orden en que se mezclan no se nota.
    const matLaguna = material(COLOR.laguna, 'cavidad');
    const matCuerpo = material(COLOR.osteocito, 'celula');
    const matNucleo = material(COLOR.nucleo, 'nucleo');
    const matDendrita = material(COLOR.dendrita, 'celula');
    const matCanaliculo = material(COLOR.canaliculo, 'liquido', {
      roughness: 0.35,
      clearcoat: 0.3,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      forceSinglePass: true,
    });
    veloFresnel(matCanaliculo, 0.4, 2);
    // Sin brillo propio: son puntos verdes que se leen por su color.
    this.matUniones = material(COLOR.union, 'molecula');
    this.materiales.push(
      matLaguna,
      matCuerpo,
      matNucleo,
      matDendrita,
      matCanaliculo,
      this.matUniones,
    );

    const n = red.celulas.length;
    this.lagunas = instanciar(geoLaguna, matLaguna, n, 'lagunas');
    this.cuerpos = instanciar(geoCuerpo, matCuerpo, n, 'osteocitos');
    this.nucleos = instanciar(geoNucleo, matNucleo, n, 'nucleos');
    const tramos = red.dendritas.length * SEGMENTOS_DENDRITA;
    this.dendritas = instanciar(geoTramo, matDendrita, tramos, 'dendritas');
    this.canaliculos = instanciar(geoTramo, matCanaliculo, tramos, 'canaliculos');
    this.canaliculos.renderOrder = 10;
    this.uniones = instanciar(
      geoEsferaChica,
      this.matUniones,
      red.uniones.length,
      'uniones_comunicantes',
    );
    this.grupo.add(
      this.lagunas,
      this.cuerpos,
      this.nucleos,
      this.dendritas,
      this.canaliculos,
      this.uniones,
    );
  }

  actualizar(estado: EstadoOsteocito): void {
    // Solo se recolocan las instancias cuando cambia algo que las mueve.
    const clave = [
      estado.dendritas,
      estado.vecinos.aparicion,
      estado.vecinos.dendritas,
      estado.uniones,
      estado.compresion,
    ]
      .map((v) => v.toFixed(4))
      .join('|');
    if (clave === this.ultimaClave) return;
    this.ultimaClave = clave;

    const { celulas, dendritas, uniones } = this.red;
    for (const c of celulas) {
      const k = c.indice === 0 ? 1 : estado.vecinos.aparicion;
      if (k < 0.01) {
        this.lagunas.setMatrixAt(c.indice, MATRIZ_CERO);
        this.cuerpos.setMatrixAt(c.indice, MATRIZ_CERO);
        this.nucleos.setMatrixAt(c.indice, MATRIZ_CERO);
        continue;
      }
      const e = c.escala * k;
      const [x, y, z] = c.centro;
      // La laguna es la cavidad: un poco más grande, detrás; el cuerpo asoma hacia la cámara.
      ponerEsfera(
        this.lagunas,
        c.indice,
        [x, y, z - 0.08],
        LAGUNA.x * e,
        LAGUNA.y * e,
        LAGUNA.z * e,
        c.giro,
      );
      ponerEsfera(
        this.cuerpos,
        c.indice,
        [x, y, z + 0.04],
        CUERPO.x * e,
        CUERPO.y * e,
        CUERPO.z * e,
        c.giro,
      );
      ponerEsfera(
        this.nucleos,
        c.indice,
        [x + 0.04 * e, y, z + 0.2 * e],
        0.2 * e,
        0.15 * e,
        0.14 * e,
        c.giro,
      );
    }

    const arrastre = ARRASTRE * estado.compresion;
    let i = 0;
    let hayTramos = false;
    for (const d of dendritas) {
      const progreso = d.celula === 0 ? estado.dendritas : estado.vecinos.dendritas;
      for (let k = 0; k < SEGMENTOS_DENDRITA; k++, i++) {
        const frac = acotar(progreso * SEGMENTOS_DENDRITA - k);
        if (frac <= 0.001) {
          this.dendritas.setMatrixAt(i, MATRIZ_CERO);
          this.canaliculos.setMatrixAt(i, MATRIZ_CERO);
          continue;
        }
        hayTramos = true;
        const a = d.puntos[k]!;
        const b0 = d.puntos[k + 1]!;
        const b: Punto3 = [
          a[0] + (b0[0] - a[0]) * frac,
          a[1] + (b0[1] - a[1]) * frac,
          a[2] + (b0[2] - a[2]) * frac,
        ];
        // El canalículo (túnel en la matriz) no se mueve; la dendrita, dentro, se desvía con la corriente.
        ponerTramo(this.canaliculos, i, a, b, R_CANALICULO);
        const radio = R_DENDRITA * grosorDeTramo(k);
        if (arrastre > 0) {
          const sa = Math.sin((Math.PI * k) / SEGMENTOS_DENDRITA) * arrastre;
          const sb = Math.sin((Math.PI * (k + frac)) / SEGMENTOS_DENDRITA) * arrastre;
          ponerTramo(this.dendritas, i, [a[0] - sa, a[1], a[2]], [b[0] - sb, b[1], b[2]], radio);
        } else {
          ponerTramo(this.dendritas, i, a, b, radio);
        }
      }
    }
    this.dendritas.visible = hayTramos;
    this.canaliculos.visible = hayTramos;

    const u = estado.uniones;
    this.uniones.visible = u >= 0.01;
    uniones.forEach((union, j) => {
      if (u < 0.01) {
        this.uniones.setMatrixAt(j, MATRIZ_CERO);
        return;
      }
      const r = 0.075 * u;
      ponerEsfera(this.uniones, j, union.punto, r, r, r);
    });

    for (const m of [
      this.lagunas,
      this.cuerpos,
      this.nucleos,
      this.dendritas,
      this.canaliculos,
      this.uniones,
    ]) {
      m.instanceMatrix.needsUpdate = true;
    }
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    for (const i of [
      this.lagunas,
      this.cuerpos,
      this.nucleos,
      this.dendritas,
      this.canaliculos,
      this.uniones,
    ]) {
      i.dispose();
    }
  }
}

/* -------------------------------------------------------------------------------------------
 * Dinámica: líquido, sensores, esclerostina y señal
 * ----------------------------------------------------------------------------------------- */

/** Dirección del cilio primario (sale del cuerpo de la célula central hacia arriba y a la derecha). */
const DIRECCION_CILIO: Punto3 = [0.55, 0.8, 0.25];

export class Dinamica implements PiezaOsteocito {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly particulas: InstancedMesh;
  private readonly integrinas: InstancedMesh;
  private readonly esclerostina: InstancedMesh;
  private readonly pulsos: InstancedMesh;
  private readonly cilio: InstancedMesh;
  private readonly matSensor: MeshPhysicalMaterial;
  private readonly matPulso: MeshPhysicalMaterial;
  private readonly datosParticulas;
  private readonly datosIntegrinas: readonly Punto3[];
  private readonly datosEsclerostina;
  private readonly rutas: readonly (readonly Punto3[])[];
  private readonly salidasEsclerostina: readonly Punto3[];
  private readonly baseCilio: Punto3;
  private readonly red: RedLacunoCanalicular;
  /** Pulsos por ruta de la señal. */
  private static readonly PULSOS_POR_RUTA = 2;

  constructor(red: RedLacunoCanalicular) {
    this.grupo.name = 'dinamica';
    this.red = red;
    this.datosParticulas = particulasDeFlujo(red);
    this.datosIntegrinas = integrinasDeLaCentral(red);
    this.datosEsclerostina = moleculasDeEsclerostina();
    this.rutas = rutasDeMensaje(red);
    const central = red.celulas[0]!;
    this.salidasEsclerostina = this.datosEsclerostina.map((m) =>
      puntoDeSalida(central, m.direccion),
    );
    this.baseCilio = puntoDeSalida(central, DIRECCION_CILIO);

    // Puntos de unos pocos píxeles: 8 × 5 basta y deja margen en el presupuesto para alisar las células.
    const geoEsfera = esfera(8, 5);
    const geoTramo = tramo(8);
    this.geometrias.push(geoEsfera, geoTramo);

    // Las partículas brillan por sí mismas: dentro del canalículo translúcido y bajo el velo una esfera sin
    // emisión se confundía con el propio canalículo (comprobado en las capturas de la fase de carga). Son
    // gotas de líquido: lisas y brillantes. Sensores, esclerostina y pulsos son moléculas: lisas y satinadas.
    // Las partículas y los pulsos van por dentro de los canalículos y tienen que dibujarse DESPUÉS de ellos: three
    // dibuja todo lo opaco antes que lo transparente, sea cual sea su `renderOrder`, así que van en la lista de
    // transparentes (con opacidad 1: tapan del todo y escriben profundidad) y de una cara (esferas cerradas).
    const despuesDeLosCanaliculos = { transparent: true, opacity: 1, side: FrontSide } as const;
    const matLiquido = material(COLOR.liquido, 'liquido', {
      ...despuesDeLosCanaliculos,
      emissive: COLOR.liquido,
      emissiveIntensity: 0.9,
    });
    this.matSensor = material(COLOR.sensor, 'molecula', {
      emissive: COLOR.sensor,
      emissiveIntensity: 0,
    });
    const matEsclerostina = material(COLOR.esclerostina, 'molecula');
    this.matPulso = material(COLOR.senal, 'molecula', {
      ...despuesDeLosCanaliculos,
      emissive: COLOR.senal,
      emissiveIntensity: 0.9,
    });
    this.materiales.push(matLiquido, this.matSensor, matEsclerostina, this.matPulso);

    this.particulas = instanciar(
      geoEsfera,
      matLiquido,
      this.datosParticulas.length,
      'liquido_intersticial',
    );
    this.integrinas = instanciar(
      geoEsfera,
      this.matSensor,
      this.datosIntegrinas.length,
      'integrinas',
    );
    this.cilio = instanciar(geoTramo, this.matSensor, 1, 'cilio_primario');
    this.esclerostina = instanciar(
      geoEsfera,
      matEsclerostina,
      this.datosEsclerostina.length,
      'esclerostina',
    );
    this.pulsos = instanciar(
      geoEsfera,
      this.matPulso,
      this.rutas.length * Dinamica.PULSOS_POR_RUTA,
      'pulsos_senal',
    );
    // Después de los canalículos translúcidos (renderOrder 10) y antes del velo de la cara (20), para que el halo
    // de los canalículos no las apague.
    this.particulas.renderOrder = 11;
    this.pulsos.renderOrder = 11;
    this.grupo.add(this.particulas, this.integrinas, this.cilio, this.esclerostina, this.pulsos);
  }

  actualizar(estado: EstadoOsteocito): void {
    // Líquido intersticial: fluye por los canalículos hacia el conducto mientras dura la carga.
    const intensidad = estado.flujo.intensidad;
    this.particulas.visible = intensidad >= 0.01;
    this.datosParticulas.forEach((p, i) => {
      if (intensidad < 0.01) {
        this.particulas.setMatrixAt(i, MATRIZ_CERO);
        return;
      }
      let s = fraccion(p.desfase + estado.flujo.avance);
      if (p.sentido === -1) s = 1 - s;
      const punto = puntoEn(this.red.dendritas[p.dendrita]!.puntos, s);
      // Más gruesas que la dendrita (R_DENDRITA) y casi como el canalículo: son lo que hay que ver en la carga.
      const r = 0.085 * intensidad;
      ponerEsfera(this.particulas, i, punto, r, r, r);
    });
    this.particulas.instanceMatrix.needsUpdate = true;

    // Sensores: el cilio siempre está; las integrinas y el latido se destacan con la señal.
    const { enfasis, pulso } = estado.sensores;
    this.integrinas.visible = enfasis >= 0.01;
    const largoCilio = 0.3 + 0.2 * enfasis;
    const puntaCilio: Punto3 = [
      this.baseCilio[0] + DIRECCION_CILIO[0] * largoCilio,
      this.baseCilio[1] + DIRECCION_CILIO[1] * largoCilio,
      this.baseCilio[2] + DIRECCION_CILIO[2] * largoCilio,
    ];
    ponerTramo(this.cilio, 0, this.baseCilio, puntaCilio, 0.022 + 0.012 * enfasis);
    this.cilio.instanceMatrix.needsUpdate = true;
    this.datosIntegrinas.forEach((p, i) => {
      if (enfasis < 0.01) {
        this.integrinas.setMatrixAt(i, MATRIZ_CERO);
        return;
      }
      const r = (0.06 + 0.02 * pulso) * enfasis;
      ponerEsfera(this.integrinas, i, p, r, r, r);
    });
    this.integrinas.instanceMatrix.needsUpdate = true;
    this.matSensor.emissiveIntensity = 0.15 + 0.85 * pulso;

    // Esclerostina: moléculas que salen de la célula y se alejan hacia la superficie.
    const e = estado.esclerostina;
    this.esclerostina.visible = e >= 0.01;
    this.datosEsclerostina.forEach((m, i) => {
      if (e < 0.01) {
        this.esclerostina.setMatrixAt(i, MATRIZ_CERO);
        return;
      }
      const recorrido = fraccion(m.desfase + estado.flujo.avance * 0.11);
      const distancia = 0.12 + 1.15 * recorrido;
      const salida = this.salidasEsclerostina[i]!;
      const p: Punto3 = [
        salida[0] + m.direccion[0] * distancia,
        salida[1] + m.direccion[1] * distancia,
        salida[2] + m.direccion[2] * distancia,
      ];
      const r = 0.05 * e * (1 - 0.55 * recorrido);
      ponerEsfera(this.esclerostina, i, p, r, r, r);
    });
    this.esclerostina.instanceMatrix.needsUpdate = true;

    // Señal: pulsos que recorren las rutas de la célula central a la superficie.
    const { avance, opacidad } = estado.mensaje;
    let hayPulsos = false;
    this.rutas.forEach((ruta, j) => {
      for (let k = 0; k < Dinamica.PULSOS_POR_RUTA; k++) {
        const indice = j * Dinamica.PULSOS_POR_RUTA + k;
        const s = avance - k * 0.16;
        if (opacidad < 0.01 || s <= 0) {
          this.pulsos.setMatrixAt(indice, MATRIZ_CERO);
          continue;
        }
        hayPulsos = true;
        const r = (0.11 - 0.03 * k) * opacidad;
        ponerEsfera(this.pulsos, indice, puntoEn(ruta, s), r, r, r);
      }
    });
    this.pulsos.visible = hayPulsos;
    this.pulsos.instanceMatrix.needsUpdate = true;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    for (const i of [
      this.particulas,
      this.integrinas,
      this.cilio,
      this.esclerostina,
      this.pulsos,
    ]) {
      i.dispose();
    }
  }
}

/* -------------------------------------------------------------------------------------------
 * Superficie: células de revestimiento que se vuelven osteoblastos
 * ----------------------------------------------------------------------------------------- */

const COLOR_REVESTIMIENTO: Rgb = lineal(COLOR.revestimiento);
const COLOR_OSTEOBLASTO: Rgb = lineal(COLOR.osteoblasto);

export class Superficie implements PiezaOsteocito {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly celulas: InstancedMesh;
  private readonly nucleos: InstancedMesh;
  private readonly datos = celulasDeSuperficie();
  private ultimaActivacion = -1;

  constructor() {
    this.grupo.name = 'superficie';
    const geoCelula = celulaDesdeBase();
    const geoEsfera = esfera(12, 8);
    this.geometrias.push(geoCelula, geoEsfera);
    // Color por instancia (multiplica al del material, que va en blanco): de revestimiento a osteoblasto.
    const matCelula = material('#ffffff', 'celula');
    const matNucleo = material(COLOR.nucleo, 'nucleo');
    this.materiales.push(matCelula, matNucleo);
    this.celulas = instanciar(geoCelula, matCelula, this.datos.length, 'celulas_superficie');
    this.celulas.instanceColor = new InstancedBufferAttribute(
      new Float32Array(this.datos.length * 3),
      3,
    );
    this.nucleos = instanciar(geoEsfera, matNucleo, this.datos.length, 'nucleos_superficie');
    this.grupo.add(this.celulas, this.nucleos);
  }

  actualizar(estado: EstadoOsteocito): void {
    const a = estado.activacion;
    if (Math.abs(a - this.ultimaActivacion) < 1e-4) return;
    this.ultimaActivacion = a;
    const color = mezclarRgb(COLOR_REVESTIMIENTO, COLOR_OSTEOBLASTO, a);
    const colores = this.celulas.instanceColor!.array as Float32Array;
    const base = Y_SUPERFICIE + GROSOR_OSTEOIDE;
    this.datos.forEach((c, i) => {
      // Aplanada (revestimiento) → cúbica (osteoblasto activo): más alta y algo más estrecha.
      const alto = 0.14 + 0.42 * a;
      const ancho = c.ancho * (1 - 0.18 * a);
      const fondo = 0.5 * (1 - 0.12 * a);
      ponerEsfera(this.celulas, i, [c.x, base, c.z], ancho, alto, fondo);
      colores[3 * i] = color[0];
      colores[3 * i + 1] = color[1];
      colores[3 * i + 2] = color[2];
      const ry = 0.05 + 0.1 * a;
      ponerEsfera(
        this.nucleos,
        i,
        [c.x, base + alto * 0.5, c.z + fondo * 0.5 - 0.06],
        0.12,
        ry,
        0.08,
      );
    });
    this.celulas.instanceMatrix.needsUpdate = true;
    this.celulas.instanceColor!.needsUpdate = true;
    this.nucleos.instanceMatrix.needsUpdate = true;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    this.celulas.dispose();
    this.nucleos.dispose();
  }
}

/** Ayuda para pruebas y para la escena: todas las piezas juntas, con la misma red. */
export function crearPiezas(): PiezaOsteocito[] {
  const redCelular = new RedCelular();
  return [new BloqueMatriz(), redCelular, new Dinamica(redCelular.red), new Superficie()];
}
