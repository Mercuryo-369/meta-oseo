/**
 * Las piezas de la escena del hueso trabecular, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `RedTrabecular`: todas las placas (cuatro tiras instanciadas por placa, que se separan para abrir el agujero
 *    de la perforación) y todas las barras (instanciadas, que se acortan hasta un muñón al cortarse).
 *  - `CorticalSuperior`: la lámina de cortical que tapa el cubo y sus poros.
 *  - `Medula`: el relleno translúcido entre las trabéculas, que se vuelve graso con los años.
 *  - `BmuTrabeculares`: dos o tres unidades de remodelado sobre placas de la cara frontal (hoyo con osteoclastos,
 *    hoyo que los osteoblastos rellenan con osteoide).
 *  - `FlechaCarga`: la flecha que comprime desde arriba.
 *  - `CuboTrabecular`: une las anteriores; con `fantasma: true` es el cubo joven translúcido de la comparación.
 *
 * No calculan nada de la biología: reciben `EstadoTrabecular` (puro) y las reglas por trabécula de
 * `disposicion.ts`, y solo colocan, escalan, colorean y aclaran instancias. Materiales compartidos por pieza; al
 * liberar se libera todo lo creado. Cada `actualizar` recoloca ~1 000 instancias solo si cambió algún factor.
 *
 * Realismo (2026-10-14): materiales orgánicos por tejido (`realismo.ts`) con la paleta natural de una pieza de hueso
 * esponjoso (`NATURAL`: marfil, médula roja que se vuelve amarilla), tiras de canto biselado y barras con cintura
 * (`geometria.ts`) y un tono algo distinto en cada trabécula.
 *
 * Revisión de diseño (2026-10-17): oclusión ambiental por instancia en las placas y las barras (las del centro del
 * cubo reciben menos luz indirecta que las de las caras); la lámina cortical no proyecta sombra sobre la red (es la
 * tapa del cubo) y lleva UV en unidades de escena (el mismo grano arriba y en los cantos).
 */
import type { BufferGeometry, Material } from 'three';
import {
  BackSide,
  Color,
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
import { suave } from '../interpolacion';
import {
  AGUJERO_MAXIMO,
  agujeroDePlaca,
  grosorDePlaca,
  porosDeCortical,
  presenciaDeBarra,
  radioDeBarra,
  redTrabecular,
} from './disposicion';
import type { Barra, Placa, RedTrabecularDatos } from './disposicion';
import { APLASTAMIENTO, GROSOR_CORTICAL, LADO, N_BMU, RED_JOVEN } from './estado';
import type { EstadoTrabecular, FactoresRed } from './estado';
import {
  barraUnidad,
  cajaBiselada,
  cajaUnidad,
  cilindroUnidad,
  discoUnidad,
  esferaUnidad,
  flecha,
  losa,
} from './geometria';
import { NATURAL as COLOR } from './paleta';
import type { TipoTejido } from '../realismo';
import {
  liberarMaterialOrganico,
  materialOrganico,
  oclusionPorVertice,
  ponerOpacidad,
} from '../realismo';

const MITAD = LADO / 2;
const EJE_X = new Vector3(1, 0, 0);
const EJE_Y = new Vector3(0, 1, 0);
const EJE_Z = new Vector3(0, 0, 1);
/** Escala de una instancia que no debe verse (una matriz de escala 0 daría normales inválidas). */
const OCULTA = 1e-4;
/** Radio del hoyo de una BMU trabecular. */
const R_HOYO = 0.135;

/**
 * Material de un tejido (`realismo.ts`): físico y con relieve de superficie hecho por código. De UNA cara, como
 * antes (a diferencia del hueso largo, que tiene cáscaras abiertas): aquí todas las piezas son sólidos cerrados y el
 * cubo joven translúcido se vería con doble capa si también se dibujaran sus caras de dentro.
 */
function material(
  color: string,
  tipo: TipoTejido = 'hueso',
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
 * Cuántas veces se repite el relieve sobre las UV de una pieza (el mismo mapa da el relieve y la rugosidad). Las
 * tiras miden la mitad de alto que de ancho: así el grano sale del mismo tamaño en los dos sentidos.
 */
function repetirRelieve(m: MeshPhysicalMaterial, x: number, y: number): void {
  m.bumpMap?.repeat.set(x, y);
}

/** Aplica una opacidad a un grupo de materiales (transparentes solo mientras hace falta). */
function poner(materiales: readonly Material[], opacidad: number, base = 1): void {
  ponerOpacidad(materiales, opacidad * base);
}

/** Oclusión ambiental en el centro del cubo (1 al aire libre). */
const OCLUSION_CENTRO = 0.4;

/**
 * Oclusión ambiental de una trabécula según su sitio en el cubo (realismo-06): 1 en las caras abiertas (los cuatro
 * lados y la base; arriba está la cortical) y `OCLUSION_CENTRO` en el centro, donde la red que la rodea tapa casi
 * toda la luz que llega de fuera. Solo apaga la luz indirecta (entorno y hemisferio, que three no ocluye): la directa
 * ya la ocultan las sombras. Antes las trabéculas del centro salían tan claras como las de las caras.
 */
export function oclusionTrabecula(x: number, y: number, z: number): number {
  const hondura = Math.max(0, Math.min(MITAD - Math.abs(x), MITAD - Math.abs(z), MITAD + y));
  return 1 - (1 - OCLUSION_CENTRO) * suave(hondura / (0.3 * LADO));
}

/** Interfaz común de las piezas. */
export interface PiezaTrabecular {
  readonly grupo: Group;
  actualizar: (estado: EstadoTrabecular) => void;
  liberar: () => void;
}

export interface OpcionesCubo {
  /** El cubo joven translúcido que se muestra al lado para comparar. */
  fantasma: boolean;
}

/* -------------------------------------------------------------------------------------------
 * Colocación de instancias (auxiliares reutilizados, sin reservar memoria por fotograma)
 * ----------------------------------------------------------------------------------------- */

const m4 = new Matrix4();
const qA = new Quaternion();
const qC = new Quaternion();
const vA = new Vector3();
const vB = new Vector3();
const vE = new Vector3();
const colorA = new Color();
const colorB = new Color();

/**
 * Escribe en la instancia `i` una pieza con centro `centro`, orientación `q`, un giro extra `qExtra` (o null)
 * alrededor del centro, desplazada `desplazamiento` en el marco de la pieza y con `escala`.
 */
function colocar(
  malla: InstancedMesh,
  i: number,
  centro: Vector3,
  q: Quaternion,
  qExtra: Quaternion | null,
  desplazamiento: Vector3,
  escala: Vector3,
): void {
  qC.copy(q);
  if (qExtra) qC.multiply(qExtra);
  vB.copy(desplazamiento).applyQuaternion(qC).add(centro);
  m4.compose(vB, qC, escala);
  malla.setMatrixAt(i, m4);
}

/* -------------------------------------------------------------------------------------------
 * Red de placas y barras
 * ----------------------------------------------------------------------------------------- */

const TIRAS_POR_PLACA = 4;
/** Bisel del canto de las tiras (fracción de su ancho y de su alto). */
const BISEL_TIRA = { x: 0.06, y: 0.08 } as const;
/**
 * Cuánto se meten las tiras superior e inferior una en la otra cuando la placa está entera (unidades de escena):
 * más que la profundidad del bisel, para que no quede un surco a media placa. Se anula al abrirse el agujero, y las
 * tiras laterales se alargan lo mismo hacia arriba y hacia abajo para esconder sus extremos en las otras dos.
 */
const SOLAPE = 0.035;

export class RedTrabecular {
  readonly grupo = new Group();
  readonly placas: InstancedMesh;
  readonly barras: InstancedMesh;
  readonly datos: RedTrabecularDatos;
  private readonly geometrias: BufferGeometry[] = [];
  readonly materiales: MeshPhysicalMaterial[] = [];
  private readonly fantasma: boolean;
  private readonly orientaciones: Quaternion[];
  private readonly orientacionesBarras: Quaternion[];
  private ultimo: [number, number, number, number] | null = null;

  constructor(fantasma: boolean, datos: RedTrabecularDatos = redTrabecular()) {
    this.fantasma = fantasma;
    this.datos = datos;
    this.grupo.name = fantasma ? 'red_trabecular_joven' : 'red_trabecular';

    const geoTira = losa(BISEL_TIRA.x, BISEL_TIRA.y);
    const geoBarra = barraUnidad(10);
    this.geometrias.push(geoTira, geoBarra);

    // Hueso esponjoso: mate y granuloso. El color va por instancia en el cubo que envejece (material blanco).
    const matPlacas = fantasma
      ? material(COLOR.fantasma, 'hueso_esponjoso', { transparent: true, depthWrite: false })
      : material('#ffffff', 'hueso_esponjoso');
    const matBarras = fantasma ? matPlacas : material('#ffffff', 'hueso_esponjoso');
    repetirRelieve(matPlacas, 1.2, 0.6);
    this.materiales.push(matPlacas);
    if (matBarras !== matPlacas) {
      repetirRelieve(matBarras, 0.6, 1.2);
      this.materiales.push(matBarras);
    }

    this.placas = new InstancedMesh(geoTira, matPlacas, datos.placas.length * TIRAS_POR_PLACA);
    this.placas.name = 'placas';
    this.placas.frustumCulled = false;
    this.barras = new InstancedMesh(geoBarra, matBarras, datos.barras.length);
    this.barras.name = 'barras';
    this.barras.frustumCulled = false;

    // Orientación fija de cada placa: normal en Z o en X, más su giro y su cabeceo pequeños.
    this.orientaciones = datos.placas.map((p) => {
      const q = new Quaternion().setFromAxisAngle(EJE_Y, p.giro);
      if (p.normal === 'x') q.multiply(qA.setFromAxisAngle(EJE_Y, Math.PI / 2));
      return q.multiply(qA.setFromAxisAngle(EJE_X, p.cabeceo));
    });
    // Orientación fija de cada barra: el eje Y del cilindro se tumba en X o en Z y se inclina un poco.
    this.orientacionesBarras = datos.barras.map((b) => {
      const q =
        b.eje === 'x'
          ? new Quaternion().setFromAxisAngle(EJE_Z, b.inclinacion - Math.PI / 2)
          : new Quaternion().setFromAxisAngle(EJE_X, Math.PI / 2 + b.inclinacion);
      return q;
    });

    // Colores base por trabécula (solo el cubo que envejece: el fantasma es de un solo color translúcido). Una
    // pieza real no es de un marfil uniforme: las de menos vida, algo más amarillentas. Y oclusión ambiental por
    // instancia (un atributo `ao` por instancia: las posiciones de la red no cambian, se escribe una vez).
    if (!fantasma) {
      const aoPlacas = new Float32Array(datos.placas.length * TIRAS_POR_PLACA);
      datos.placas.forEach((p, i) => {
        aoPlacas.fill(
          oclusionTrabecula(p.x, p.y, p.z),
          i * TIRAS_POR_PLACA,
          (i + 1) * TIRAS_POR_PLACA,
        );
      });
      geoTira.setAttribute('ao', new InstancedBufferAttribute(aoPlacas, 1));
      geoBarra.setAttribute(
        'ao',
        new InstancedBufferAttribute(
          Float32Array.from(datos.barras, (b) => oclusionTrabecula(b.x, b.y, b.z)),
          1,
        ),
      );
      oclusionPorVertice(matPlacas);
      oclusionPorVertice(matBarras);
      colorA.set(COLOR.placa);
      colorB.set(COLOR.barra);
      datos.placas.forEach((p, i) => {
        const c = colorA.clone().lerp(colorB, 0.45 * (1 - p.vida));
        for (let k = 0; k < TIRAS_POR_PLACA; k++)
          this.placas.setColorAt(i * TIRAS_POR_PLACA + k, c);
      });
      datos.barras.forEach((b, i) => {
        this.barras.setColorAt(i, colorB.clone().lerp(colorA, 0.6 * b.vida));
      });
    }

    this.grupo.add(this.placas, this.barras);
    this.actualizar(RED_JOVEN, 0);
  }

  /** Recoloca todas las tiras y barras según los factores globales y la rotura (0 a 1) de las microfracturas. */
  actualizar(red: FactoresRed, rotura: number): void {
    const clave: [number, number, number, number] = [
      red.grosor,
      red.barras,
      red.perforacion,
      rotura,
    ];
    if (this.ultimo && clave.every((v, i) => Math.abs(v - this.ultimo![i]!) < 1e-6)) return;
    this.ultimo = clave;
    this.datos.placas.forEach((p, i) => this.colocarPlaca(p, i, red, rotura));
    this.datos.barras.forEach((b, i) => this.colocarBarra(b, i, red));
    this.placas.instanceMatrix.needsUpdate = true;
    this.barras.instanceMatrix.needsUpdate = true;
    if (this.placas.instanceColor) this.placas.instanceColor.needsUpdate = true;
  }

  private colocarPlaca(p: Placa, i: number, red: FactoresRed, rotura: number): void {
    const q = this.orientaciones[i]!;
    const g = grosorDePlaca(p, red);
    const h = agujeroDePlaca(p, red);
    const anchoAgujero = h * AGUJERO_MAXIMO * p.ancho;
    const altoAgujero = h * AGUJERO_MAXIMO * p.alto;
    const rota = p.microfractura && rotura > 1e-4;
    const angulo = rota ? 0.5 * rotura : 0;
    const base = i * TIRAS_POR_PLACA;
    vA.set(p.x, p.y, p.z);

    // Tiras superior e inferior: enteras cuando no hay agujero (y solapadas en el centro); al romperse se quiebran
    // hacia fuera del plano. La inferior es un 2 % más fina y las laterales, un 4 %: así sus caras no coinciden
    // donde se solapan.
    const borde = altoAgujero / 2 - SOLAPE * (1 - h);
    const altoTira = p.alto / 2 - borde;
    const centroTira = (p.alto / 2 + borde) / 2;
    for (const signo of [1, -1] as const) {
      const qExtra = rota ? qA.setFromAxisAngle(EJE_X, signo * angulo) : null;
      colocar(
        this.placas,
        base + (signo === 1 ? 0 : 1),
        vA,
        q,
        qExtra,
        vB.set(0, signo * centroTira, rota ? signo * 0.05 * rotura : 0),
        vE.set(p.ancho, altoTira, signo === 1 ? g : g * 0.98),
      );
    }
    // Tiras laterales: solo existen cuando hay agujero (antes quedan escondidas dentro de la placa); sus extremos
    // se meten en las tiras superior e inferior.
    const extension = SOLAPE * Math.min(1, h * 20);
    const altoLateral = Math.max(altoAgujero + 2 * extension, OCULTA);
    for (const signo of [1, -1] as const) {
      colocar(
        this.placas,
        base + (signo === 1 ? 2 : 3),
        vA,
        q,
        null,
        vB.set((signo * (p.ancho + anchoAgujero)) / 4, 0, 0),
        vE.set((p.ancho - anchoAgujero) / 2, altoLateral, g * 0.96),
      );
    }
    if (!this.fantasma && p.microfractura) {
      // La placa rota se enciende en rojo a medida que se rompe.
      colorA.set(COLOR.placa).lerp(colorB.set(COLOR.barra), 0.45 * (1 - p.vida));
      colorA.lerp(colorB.set(COLOR.microfractura), rotura);
      for (let k = 0; k < TIRAS_POR_PLACA; k++) this.placas.setColorAt(base + k, colorA);
    }
  }

  private colocarBarra(b: Barra, i: number, red: FactoresRed): void {
    const k = presenciaDeBarra(b, red);
    const r = radioDeBarra(b, red);
    vA.set(b.x, b.y, b.z);
    if (k < 0.02) {
      m4.compose(vA, this.orientacionesBarras[i]!, vB.set(OCULTA, OCULTA, OCULTA));
      this.barras.setMatrixAt(i, m4);
      return;
    }
    // El muñón se conserva por el extremo `extremo`: el centro se corre hacia él.
    const corrimiento = (b.extremo * b.largo * (1 - k)) / 2;
    if (b.eje === 'x') vA.x += corrimiento;
    else vA.z += corrimiento;
    m4.compose(vA, this.orientacionesBarras[i]!, vB.set(r, b.largo * k, r));
    this.barras.setMatrixAt(i, m4);
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    this.placas.dispose();
    this.barras.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Cortical superior
 * ----------------------------------------------------------------------------------------- */

export class CorticalSuperior {
  readonly grupo = new Group();
  readonly materiales: MeshPhysicalMaterial[] = [];
  private readonly geometrias: BufferGeometry[] = [];
  private readonly lamina: Mesh;
  private readonly poros: InstancedMesh;
  private readonly datosPoros = porosDeCortical();
  /** Grosor actual (unidades de escena), para que la flecha se apoye encima. */
  grosorActual = GROSOR_CORTICAL;

  constructor(fantasma: boolean) {
    this.grupo.name = fantasma ? 'cortical_joven' : 'cortical_superior';
    // Lámina de hueso compacto con el borde redondeado (bisel de unos 0,05 en el plano y de un 30 % del grosor), con
    // UV en unidades a su tamaño: con UV de 0 a 1 por cara, el grano salía 25 veces más fino en los cantos.
    const geoLamina = cajaBiselada(0.016, 0.3, 0.016, [LADO + 0.02, GROSOR_CORTICAL, LADO + 0.02]);
    const geoPoro = cilindroUnidad(12);
    this.geometrias.push(geoLamina, geoPoro);
    const mat = fantasma
      ? material(COLOR.fantasma, 'hueso', { transparent: true, depthWrite: false })
      : material(COLOR.cortical, 'hueso');
    repetirRelieve(mat, 1.4, 1.4);
    // Poro: la boca oscura de un conducto vascular.
    const matPoro = material(COLOR.poro, 'cavidad');
    this.materiales.push(mat, matPoro);
    this.lamina = new Mesh(geoLamina, mat);
    this.lamina.name = 'lamina_cortical';
    // Es la tapa del cubo: su sombra caía sobre el 7-12 % de las placas de dentro (render-05).
    this.lamina.userData.sinSombra = true;
    this.poros = new InstancedMesh(geoPoro, matPoro, this.datosPoros.length);
    this.poros.name = 'poros_corticales';
    this.poros.frustumCulled = false;
    this.grupo.add(this.lamina, this.poros);
    this.actualizar({ grosor: 1, porosidad: 0 });
  }

  actualizar(cortical: EstadoTrabecular['cortical']): void {
    const g = GROSOR_CORTICAL * Math.max(0.2, cortical.grosor);
    this.grosorActual = g;
    const y = MITAD + g / 2;
    this.lamina.position.set(0, y, 0);
    this.lamina.scale.set(LADO + 0.02, g, LADO + 0.02);
    this.poros.visible = cortical.porosidad > 0.01;
    qA.identity();
    this.datosPoros.forEach((p, i) => {
      const r = p.radio * cortical.porosidad;
      m4.compose(vA.set(p.x, y, p.z), qA, vB.set(r, g * 1.04, r));
      this.poros.setMatrixAt(i, m4);
    });
    this.poros.instanceMatrix.needsUpdate = true;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    this.poros.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Médula
 * ----------------------------------------------------------------------------------------- */

export class Medula {
  readonly grupo = new Group();
  readonly materiales: MeshPhysicalMaterial[] = [];
  private readonly geometria: BufferGeometry;
  private readonly joven = new Color(COLOR.medula);
  private readonly grasa = new Color(COLOR.medulaGrasa);

  constructor() {
    this.grupo.name = 'medula';
    this.geometria = cajaUnidad();
    // Solo las caras de atrás: la médula se ve como el fondo de la biopsia, sin velar las trabéculas de delante.
    const mat = material(COLOR.medula, 'medula', {
      side: BackSide,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.materiales.push(mat);
    const caja = new Mesh(this.geometria, mat);
    caja.name = 'medula_osea';
    caja.scale.setScalar(LADO - 0.01);
    caja.renderOrder = -1;
    this.grupo.add(caja);
  }

  actualizar(medula: EstadoTrabecular['medula']): void {
    this.materiales[0]!.color.copy(this.joven).lerp(this.grasa, medula.adiposidad);
  }

  liberar(): void {
    this.geometria.dispose();
    liberarMateriales(this.materiales);
  }
}

/* -------------------------------------------------------------------------------------------
 * BMU trabeculares
 * ----------------------------------------------------------------------------------------- */

const OSTEOCLASTOS_POR_HOYO = 2;
const NUCLEOS_POR_OSTEOCLASTO = 3;
const OSTEOBLASTOS_POR_HOYO = 5;

export class BmuTrabeculares {
  readonly grupo = new Group();
  readonly materiales: MeshPhysicalMaterial[] = [];
  private readonly geometrias: BufferGeometry[] = [];
  private readonly hoyos: InstancedMesh;
  private readonly osteoide: InstancedMesh;
  private readonly celulas: InstancedMesh;
  private readonly sitios: Placa[];

  constructor(datos: RedTrabecularDatos) {
    this.grupo.name = 'bmu_trabeculares';
    this.sitios = datos.placas.filter((p) => p.bmu !== null).slice(0, N_BMU);
    const enResorcion = this.sitios.filter((p) => p.bmu === 'resorcion').length;
    const enFormacion = this.sitios.length - enResorcion;

    const geoDisco = discoUnidad();
    const geoEsfera = esferaUnidad();
    this.geometrias.push(geoDisco, geoEsfera);
    // Hoyo de resorción: hueso excavado, más oscuro y picado. Osteoide: colágeno sin mineralizar, con estrías.
    const matHoyo = material(COLOR.hoyo, 'hueso');
    const matOsteoide = material(COLOR.osteoide, 'fibra');
    const matCelulas = material('#ffffff', 'celula');
    this.materiales.push(matHoyo, matOsteoide, matCelulas);

    this.hoyos = new InstancedMesh(geoDisco, matHoyo, Math.max(1, this.sitios.length));
    this.hoyos.name = 'hoyos_resorcion';
    this.osteoide = new InstancedMesh(geoDisco, matOsteoide, Math.max(1, enFormacion));
    this.osteoide.name = 'osteoide';
    const nCelulas =
      enResorcion * OSTEOCLASTOS_POR_HOYO * (1 + NUCLEOS_POR_OSTEOCLASTO) +
      enFormacion * OSTEOBLASTOS_POR_HOYO;
    this.celulas = new InstancedMesh(geoEsfera, matCelulas, Math.max(1, nCelulas));
    this.celulas.name = 'celulas_bmu';
    for (const m of [this.hoyos, this.osteoide, this.celulas]) m.frustumCulled = false;
    this.grupo.add(this.hoyos, this.osteoide, this.celulas);
  }

  actualizar(estado: EstadoTrabecular): void {
    this.grupo.visible = estado.bmu.opacidad > 0.004;
    poner(this.materiales, estado.bmu.opacidad);
    qA.identity();
    let iOsteoide = 0;
    let iCelula = 0;
    this.sitios.forEach((p, i) => {
      // La BMU se apoya en la cara frontal de su placa, que se adelgaza con los años.
      const cara = p.z + grosorDePlaca(p, estado.red) / 2;
      const r = p.bmu === 'resorcion' ? R_HOYO * estado.bmu.excavacion : R_HOYO;
      m4.compose(vA.set(p.x, p.y, cara + 0.003), qA, vB.set(r, r, 1));
      this.hoyos.setMatrixAt(i, m4);
      if (p.bmu === 'resorcion') {
        for (let k = 0; k < OSTEOCLASTOS_POR_HOYO; k++) {
          const cx = p.x + (k - 0.5) * r * 0.95;
          const cy = p.y + (k === 0 ? -0.02 : 0.03);
          m4.compose(vA.set(cx, cy, cara + 0.035), qA, vB.set(r * 0.5, r * 0.36, 0.04));
          this.celulas.setColorAt(iCelula, colorA.set(COLOR.osteoclasto));
          this.celulas.setMatrixAt(iCelula++, m4);
          for (let n = 0; n < NUCLEOS_POR_OSTEOCLASTO; n++) {
            const a = (n / NUCLEOS_POR_OSTEOCLASTO) * Math.PI * 2 + k;
            m4.compose(
              vA.set(cx + Math.cos(a) * r * 0.22, cy + Math.sin(a) * r * 0.14, cara + 0.07),
              qA,
              vB.set(0.014, 0.014, 0.012),
            );
            this.celulas.setColorAt(iCelula, colorA.set(COLOR.nucleo));
            this.celulas.setMatrixAt(iCelula++, m4);
          }
        }
      } else {
        // El osteoide rellena el hoyo desde el fondo; los osteoblastos se alinean en el borde.
        const relleno = Math.max(OCULTA, r * 0.94 * estado.bmu.relleno);
        m4.compose(vA.set(p.x, p.y, cara + 0.006), qA, vB.set(relleno, relleno, 1));
        this.osteoide.setMatrixAt(iOsteoide++, m4);
        for (let k = 0; k < OSTEOBLASTOS_POR_HOYO; k++) {
          const a = Math.PI * (0.15 + (0.7 * k) / (OSTEOBLASTOS_POR_HOYO - 1)) + (i % 2) * Math.PI;
          m4.compose(
            vA.set(p.x + Math.cos(a) * r * 1.05, p.y + Math.sin(a) * r * 1.05, cara + 0.03),
            qA,
            vB.set(0.04, 0.032, 0.03),
          );
          this.celulas.setColorAt(iCelula, colorA.set(COLOR.osteoblasto));
          this.celulas.setMatrixAt(iCelula++, m4);
        }
      }
    });
    this.hoyos.instanceMatrix.needsUpdate = true;
    this.osteoide.instanceMatrix.needsUpdate = true;
    this.celulas.instanceMatrix.needsUpdate = true;
    if (this.celulas.instanceColor) this.celulas.instanceColor.needsUpdate = true;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    this.hoyos.dispose();
    this.osteoide.dispose();
    this.celulas.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Flecha de carga
 * ----------------------------------------------------------------------------------------- */

const LARGO_FLECHA = 1.3;

export class FlechaCarga {
  readonly grupo = new Group();
  readonly materiales: MeshPhysicalMaterial[] = [];
  private readonly geometria: BufferGeometry;

  constructor() {
    this.grupo.name = 'flecha_carga';
    this.geometria = flecha(LARGO_FLECHA, 0.075);
    // Flecha didáctica (no es tejido): lisa y satinada, con un poco de brillo propio para que destaque.
    const mat = material(COLOR.flecha, 'molecula', {
      emissive: COLOR.flecha,
      emissiveIntensity: 0.25,
    });
    this.materiales.push(mat);
    const malla = new Mesh(this.geometria, mat);
    malla.name = 'flecha';
    this.grupo.add(malla);
  }

  /** `flecha` de 0 (no está) a 1 (apoyada en `techo`, la altura de la cortical). */
  actualizar(flecha: number, techo: number): void {
    this.grupo.visible = flecha > 0.004;
    this.grupo.position.set(0, techo + 0.03 + (1 - flecha) * 0.8, 0);
    poner(this.materiales, flecha);
  }

  liberar(): void {
    this.geometria.dispose();
    liberarMateriales(this.materiales);
  }
}

/* -------------------------------------------------------------------------------------------
 * El cubo completo
 * ----------------------------------------------------------------------------------------- */

export class CuboTrabecular implements PiezaTrabecular {
  readonly grupo = new Group();
  /** Lo que se aplasta bajo la carga (todo menos la flecha). */
  private readonly cuerpo = new Group();
  private readonly red: RedTrabecular;
  private readonly cortical: CorticalSuperior;
  private readonly medula: Medula | null;
  private readonly bmu: BmuTrabeculares | null;
  private readonly flecha = new FlechaCarga();
  private readonly fantasma: boolean;
  private readonly translucidos: Material[];

  constructor(opciones: OpcionesCubo) {
    this.fantasma = opciones.fantasma;
    this.grupo.name = opciones.fantasma ? 'cubo_joven_fantasma' : 'cubo_trabecular';
    const datos = redTrabecular();
    this.red = new RedTrabecular(opciones.fantasma, datos);
    this.cortical = new CorticalSuperior(opciones.fantasma);
    this.medula = opciones.fantasma ? null : new Medula();
    this.bmu = opciones.fantasma ? null : new BmuTrabeculares(datos);
    this.translucidos = opciones.fantasma
      ? [...this.red.materiales, ...this.cortical.materiales]
      : [];
    this.cuerpo.add(this.red.grupo, this.cortical.grupo);
    if (this.medula) this.cuerpo.add(this.medula.grupo);
    if (this.bmu) this.cuerpo.add(this.bmu.grupo);
    this.grupo.add(this.cuerpo, this.flecha.grupo);
  }

  actualizar(estado: EstadoTrabecular): void {
    let compresion: number;
    if (this.fantasma) {
      this.grupo.visible = estado.fantasma.opacidad > 0.004;
      this.red.actualizar(RED_JOVEN, 0);
      this.cortical.actualizar({ grosor: 1, porosidad: 0 });
      poner(this.translucidos, estado.fantasma.opacidad);
      for (const m of this.translucidos) m.depthWrite = false;
      compresion = APLASTAMIENTO.joven * estado.carga.compresion;
    } else {
      this.grupo.visible = true;
      this.red.actualizar(estado.red, estado.carga.rotura);
      this.cortical.actualizar(estado.cortical);
      this.medula?.actualizar(estado.medula);
      this.bmu?.actualizar(estado);
      compresion = APLASTAMIENTO.envejecido * estado.carga.compresion;
    }
    // Se aplasta desde arriba: la base no se mueve y los lados abomban un poco.
    this.cuerpo.scale.set(1 + 0.3 * compresion, 1 - compresion, 1 + 0.3 * compresion);
    this.cuerpo.position.y = -MITAD * compresion;
    const techo = (MITAD + this.cortical.grosorActual) * (1 - compresion) - MITAD * compresion;
    this.flecha.actualizar(estado.carga.flecha, techo);
  }

  liberar(): void {
    this.red.liberar();
    this.cortical.liberar();
    this.medula?.liberar();
    this.bmu?.liberar();
    this.flecha.liberar();
  }
}
