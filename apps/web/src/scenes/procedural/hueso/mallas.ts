/**
 * Las tres "escalas" de la escena del hueso, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `HuesoLargo`: la diáfisis con su cortical, la médula, el periostio, las dos epífisis con hueso esponjoso y
 *    el cartílago articular; una cuña que se aparta para ver el interior.
 *  - `CorteTransversal`: un disco de la diáfisis con sus capas (periostio, cortical con osteonas, endostio,
 *    médula) que pueden separarse.
 *  - `OsteonaAmpliada`: una osteona con su conducto de Havers, sus láminas concéntricas cortadas "en
 *    escalera", las fibras de colágeno, los osteocitos y un conducto de Volkmann.
 *
 * No calculan nada de la biología: reciben `EstadoHueso` (puro) y solo mueven, escalan y aclaran piezas.
 * Materiales compartidos por capa; al liberar se libera todo lo creado.
 *
 * Revisión de diseño (2026-10-17): relieve con la repetición POR UNIDAD (las formas traen UV en unidades,
 * `geometria.ts`); periostio que sigue la silueta del hueso; osteonas del corte ovaladas, giradas y con su línea de
 * cemento; piezas pequeñas repetidas de una sola pasada (`forceSinglePass`) y vasos cerrados de una cara; vasos sin
 * emisivo; cada material recibe su opacidad una sola vez por fotograma.
 */
import type { Material, MeshStandardMaterial } from 'three';
import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  FrontSide,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import {
  METAFISIS,
  POLAR_CARTILAGO,
  R_METAFISIS,
  THETA_CUNA_CENTRO,
  THETA_RETIRO,
  arcoConservadoDeLamina,
  arcoRetiradoDeLamina,
  distanciaAngular,
  grados,
  lagunasDeOsteocitos,
  osteonasDelCorte,
  perfilPeriostio,
  radiosDeLamina,
  trabeculasDeEpifisis,
} from './disposicion';
import type { Trabecula } from './disposicion';
import {
  CUNA,
  EPIFISIS_LARGO,
  EPIFISIS_RADIO,
  LARGO_DIAFISIS,
  LARGO_OSTEONA,
  N_LAMINAS,
  R_CORTICAL,
  R_HAVERS,
  R_MEDULAR,
  R_OSTEONA,
  R_PERIOSTIO,
  X_EPIFISIS,
} from './estado';
import type { EstadoHueso } from './estado';
import {
  DOS_PI,
  anillo,
  cascaraElipsoide,
  revolucion,
  tronco,
  unir,
  uvCilindro,
} from './geometria';
import { NATURAL as COLOR } from './paleta';
import type { TipoTejido } from '../realismo';
import { liberarMaterialOrganico, materialOrganico, ponerOpacidad, veloFresnel } from '../realismo';

const EJE_Y = new Vector3(0, 1, 0);
const EJE_Z = new Vector3(0, 0, 1);

/**
 * Material de un tejido (`realismo.ts`): físico, con relieve de superficie hecho por código y de doble cara
 * (las cáscaras abiertas se ven por dentro).
 */
function material(
  color: string,
  tipo: TipoTejido = 'hueso',
  extra: ConstructorParameters<typeof MeshPhysicalMaterial>[0] = {},
): MeshPhysicalMaterial {
  return materialOrganico(color, tipo, { side: DoubleSide, ...extra });
}

/**
 * Repetición del relieve POR UNIDAD de la geometría (las formas de `geometria.ts` traen UV en unidades) y filtrado
 * anisótropo (los cantos y las paredes que se ven de lado no se emborronan). Devuelve el material.
 */
function relieve(m: MeshPhysicalMaterial, u: number, v = u): MeshPhysicalMaterial {
  if (m.bumpMap) {
    m.bumpMap.repeat.set(u, v);
    m.bumpMap.anisotropy = 4;
  }
  return m;
}

/** Libera materiales: los orgánicos con su clon de textura de relieve. */
function liberarMateriales(lista: readonly Material[]): void {
  for (const m of lista) {
    if (m instanceof MeshPhysicalMaterial) liberarMaterialOrganico(m);
    else m.dispose();
  }
}

/** Aplica una opacidad a un grupo de materiales (transparentes solo mientras hace falta). */
function poner(materiales: readonly Material[], opacidad: number, base = 1): void {
  ponerOpacidad(materiales, opacidad * base);
}

/** Interfaz común de las tres escalas. */
export interface EscalaHueso {
  readonly grupo: Group;
  actualizar: (estado: EstadoHueso) => void;
  liberar: () => void;
}

/* -------------------------------------------------------------------------------------------
 * Hueso largo
 * ----------------------------------------------------------------------------------------- */

/** Repetición del relieve por unidad de cada tejido del hueso largo (y, multiplicada por el tamaño, del corte). */
const REPETIR = { hueso: 1.4, cartilago: 1.4, medula: 1.2, membrana: 0.6 } as const;

export class HuesoLargo implements EscalaHueso {
  /** Raíz (el hueso tumbado a lo largo de X). */
  readonly grupo = new Group();
  private readonly cuerpo = new Group();
  private readonly cuna = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  /** Los materiales que siguen la opacidad del hueso (el periostio va aparte: tiene la suya). */
  private readonly materiales: Material[] = [];
  private readonly matPeriostio: MeshPhysicalMaterial;
  private readonly periostio: Mesh;
  private readonly instanciados: InstancedMesh[] = [];
  private readonly direccionCuna: Vector3;

  constructor() {
    this.grupo.name = 'hueso_largo';
    // Todo se construye con el eje del hueso en Y; se tumba para que quede a lo largo de X.
    this.grupo.rotation.z = -Math.PI / 2;

    const theta0 = grados(CUNA.inicio);
    const arco = grados(CUNA.arco);
    const restoTheta0 = theta0 + arco;
    const restoArco = DOS_PI - arco;

    const cortical = relieve(material(COLOR.cortical), REPETIR.hueso);
    const cartilago = relieve(material(COLOR.cartilago, 'cartilago'), REPETIR.cartilago);
    // Trabéculas: barras finas instanciadas, de una sola pasada (su orden interno no se percibe).
    const esponjoso = material(COLOR.esponjoso, 'hueso_esponjoso', { forceSinglePass: true });
    const medula = relieve(material(COLOR.medulaAmarilla, 'medula'), REPETIR.medula);
    this.matPeriostio = relieve(material(COLOR.periostio, 'membrana'), REPETIR.membrana);
    // Lámina fina: casi transparente de frente y más densa de canto (con opacidad constante parecía vidrio).
    veloFresnel(this.matPeriostio, 0.7, 1.6);
    this.materiales.push(cortical, cartilago, esponjoso, medula);

    const pieza = (
      geometria: BufferGeometry,
      mat: Material,
      padre: Group,
      nombre: string,
    ): void => {
      const malla = new Mesh(geometria, mat);
      malla.name = nombre;
      this.geometrias.push(geometria);
      padre.add(malla);
    };

    // Diáfisis (cortical con grosor), cuerpo y cuña.
    pieza(
      anillo(R_MEDULAR, R_CORTICAL, LARGO_DIAFISIS, restoTheta0, restoArco),
      cortical,
      this.cuerpo,
      'diafisis_cortical',
    );
    pieza(
      anillo(R_MEDULAR, R_CORTICAL, LARGO_DIAFISIS, theta0, arco),
      cortical,
      this.cuna,
      'diafisis_cortical_cuna',
    );

    // Epífisis (cáscara fina de cortical y casquete de cartílago articular en el extremo) y metáfisis (la diáfisis se
    // ensancha hacia cada epífisis, sin escalón, y su cortical se adelgaza). Las dos de cada pieza (una por extremo)
    // van en una sola geometría: la mitad de llamadas de dibujo.
    for (const [padre, t0, a] of [
      [this.cuerpo, restoTheta0, restoArco],
      [this.cuna, theta0, arco],
    ] as const) {
      const extremos = (crear: (signo: 1 | -1) => BufferGeometry) => unir([crear(1), crear(-1)]);
      pieza(
        extremos((signo) =>
          cascaraElipsoide(EPIFISIS_RADIO, EPIFISIS_LARGO, signo * X_EPIFISIS, t0, a),
        ),
        cortical,
        padre,
        'epifisis_cortical',
      );
      pieza(
        extremos((signo) =>
          cascaraElipsoide(
            EPIFISIS_RADIO * 1.035,
            EPIFISIS_LARGO * 1.035,
            signo * X_EPIFISIS,
            t0,
            a,
            signo === 1 ? 0 : Math.PI - POLAR_CARTILAGO,
            POLAR_CARTILAGO,
          ),
        ),
        cartilago,
        padre,
        'cartilago_articular',
      );
      pieza(
        extremos((signo) =>
          tronco(
            R_MEDULAR,
            R_CORTICAL,
            1.24,
            R_METAFISIS,
            signo * METAFISIS.desde,
            signo * METAFISIS.hasta,
            t0,
            a,
          ),
        ),
        cortical,
        padre,
        'metafisis_cortical',
      );
    }

    // Hueso esponjoso: trabéculas. Las que caen en el sector de la cuña viajan con ella.
    const todas: Trabecula[] = [
      ...trabeculasDeEpifisis(170, 11, 1, X_EPIFISIS),
      ...trabeculasDeEpifisis(170, 23, -1, -X_EPIFISIS),
    ];
    const mitadArco = arco / 2;
    const enCuna = todas.filter((t) => distanciaAngular(t.theta, THETA_CUNA_CENTRO) < mitadArco);
    const enCuerpo = todas.filter((t) => distanciaAngular(t.theta, THETA_CUNA_CENTRO) >= mitadArco);
    this.anadirTrabeculas(enCuerpo, esponjoso, this.cuerpo);
    this.anadirTrabeculas(enCuna, esponjoso, this.cuna);

    // Médula ósea amarilla: llena la cavidad medular (la cuña se aparta y la deja a la vista) y, en cada epífisis,
    // los huecos entre las trabéculas (una cáscara por dentro de la cortical; las trabéculas, que caben en el 0,86 del
    // radio, quedan delante al abrir la cuña). En el adulto la médula de las epífisis es amarilla, como la de la
    // diáfisis. La de las epífisis va solo en el cuerpo (la cuña, apartada, se ve por fuera): así es la misma malla,
    // que no se mueve, y no cuesta otra llamada de dibujo. Costura de la vuelta del cilindro, detrás (θ = π).
    const polarMedula = 2.3;
    const geoMedula = unir([
      uvCilindro(
        new CylinderGeometry(
          R_MEDULAR - 0.012,
          R_MEDULAR - 0.012,
          LARGO_DIAFISIS + 1.2,
          40,
          1,
          false,
          Math.PI,
        ),
        Math.PI,
      ),
      ...([1, -1] as const).map((signo) =>
        cascaraElipsoide(
          EPIFISIS_RADIO * 0.9,
          EPIFISIS_LARGO * 0.9,
          signo * X_EPIFISIS,
          restoTheta0,
          restoArco,
          signo === 1 ? 0 : Math.PI - polarMedula,
          polarMedula,
        ),
      ),
    ]);
    this.geometrias.push(geoMedula);
    const mallaMedula = new Mesh(geoMedula, medula);
    mallaMedula.name = 'medula_osea';
    this.grupo.add(mallaMedula);

    // Periostio: vaina fibrosa que sigue la silueta del hueso (diáfisis, metáfisis y epífisis) hasta el borde del
    // cartílago articular. Costura detrás (θ = π).
    const geoPeriostio = revolucion(perfilPeriostio(), Math.PI, DOS_PI, 48);
    this.geometrias.push(geoPeriostio);
    this.periostio = new Mesh(geoPeriostio, this.matPeriostio);
    this.periostio.name = 'periostio';
    this.grupo.add(this.periostio);

    this.grupo.add(this.cuerpo, this.cuna);
    this.direccionCuna = new Vector3(Math.sin(THETA_CUNA_CENTRO), 0, Math.cos(THETA_CUNA_CENTRO));
  }

  private anadirTrabeculas(lista: readonly Trabecula[], mat: Material, padre: Group): void {
    if (lista.length === 0) return;
    // Sin tapas: los extremos quedan dentro de la red y así cabe el doble de trabéculas en el presupuesto.
    const geo = new CylinderGeometry(0.028, 0.034, 1, 6, 1, true);
    this.geometrias.push(geo);
    const malla = new InstancedMesh(geo, mat, lista.length);
    malla.name = 'trabeculas';
    const m = new Matrix4();
    const q = new Quaternion();
    const dir = new Vector3();
    const pos = new Vector3();
    const esc = new Vector3();
    lista.forEach((t, i) => {
      dir.set(t.dx, t.dy, t.dz);
      q.setFromUnitVectors(EJE_Y, dir);
      // Grosor algo distinto en cada trabécula (determinista): una red real no es de barras iguales.
      const grosor = 0.75 + 0.6 * Math.abs(Math.sin(i * 12.9898 + t.x * 78.233));
      m.compose(pos.set(t.x, t.y, t.z), q, esc.set(grosor, t.largo, grosor));
      malla.setMatrixAt(i, m);
    });
    malla.instanceMatrix.needsUpdate = true;
    malla.frustumCulled = false;
    this.instanciados.push(malla);
    padre.add(malla);
  }

  actualizar(estado: EstadoHueso): void {
    const visible = estado.hueso.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    this.grupo.scale.setScalar(estado.hueso.escala);
    // La cuña se aparta hacia el lado por el que mira la cámara.
    this.cuna.position.copy(this.direccionCuna).multiplyScalar(estado.apertura * 2.8);
    poner(this.materiales, estado.hueso.opacidad);
    // El periostio tiene su propia opacidad, además de la del hueso; apagado del todo, no se dibuja.
    poner([this.matPeriostio], estado.hueso.opacidad, estado.periostio);
    this.matPeriostio.depthWrite = false;
    this.periostio.visible = estado.hueso.opacidad * estado.periostio > 0.004;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    liberarMateriales([this.matPeriostio]);
    for (const i of this.instanciados) i.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Corte transversal
 * ----------------------------------------------------------------------------------------- */

const GROSOR_CORTE = 0.3;
/** Cuánto se ensancha el corte en la pantalla (la cortical de radio 1 mide esto en unidades de escena). */
export const TAMANO_CORTE = 2.4;
/** Separación (en el eje del corte) de cada capa cuando se separan. */
const SEPARACION = { periostio: 1.25, cortical: 0, endostio: -0.8, medula: -1.7 } as const;

/**
 * Niveles concéntricos de cada osteona del corte (radios con la osteona a escala 1): conducto, tres láminas y la
 * línea de cemento. El borde (0,085 × 1,08 de escala máxima × 1,08 de ovalización = 0,099) no pasa del radio que
 * `osteonasDelCorte` deja libre (0,1): no tocan el endostio ni la lámina circunferencial externa.
 */
export const NIVELES_OSTEONA = {
  conducto: [0, 0.026],
  laminas: [
    [0.026, 0.047],
    [0.047, 0.064],
    [0.064, 0.08],
  ],
  cemento: [0.08, 0.085],
} as const;
/** Ovalización de las osteonas del corte (fracción del radio). */
export const OVALIZACION_OSTEONA = 0.08;

export class CorteTransversal implements EscalaHueso {
  readonly grupo = new Group();
  private readonly capas: Record<keyof typeof SEPARACION, Group> = {
    periostio: new Group(),
    cortical: new Group(),
    endostio: new Group(),
    medula: new Group(),
  };
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matOsteonas: MeshStandardMaterial[] = [];
  private readonly instanciados: InstancedMesh[] = [];
  private readonly resalte = new Color(COLOR.resalte);

  constructor() {
    this.grupo.name = 'corte_transversal';
    const tumbar = (g: BufferGeometry): BufferGeometry => {
      g.rotateX(Math.PI / 2);
      this.geometrias.push(g);
      return g;
    };
    const anadir = (capa: Group, g: BufferGeometry, mat: Material, nombre: string): void => {
      const malla = new Mesh(tumbar(g), mat);
      malla.name = nombre;
      capa.add(malla);
    };

    // El corte se dibuja a TAMANO_CORTE: la repetición por unidad de la geometría se multiplica por él, así el grano
    // mide en la escena lo mismo que en el hueso largo (y queda más fino que las osteonas).
    const porUnidad = (r: number): number => r * TAMANO_CORTE;
    const periostio = relieve(material(COLOR.periostio, 'membrana'), porUnidad(REPETIR.membrana));
    const cortical = relieve(material(COLOR.intersticial), porUnidad(REPETIR.hueso));
    const lineas = relieve(material(COLOR.laminaOscura), porUnidad(REPETIR.hueso));
    const endostio = relieve(material(COLOR.endostio, 'membrana'), porUnidad(REPETIR.membrana));
    const medula = relieve(material(COLOR.medulaAmarilla, 'medula'), porUnidad(REPETIR.medula));
    // Esfera cerrada: de una cara (una sola pasada); sin emisivo (la sangre no emite luz).
    const vaso = material(COLOR.vaso, 'vaso', { side: FrontSide });
    this.materiales.push(periostio, cortical, lineas, endostio, medula, vaso);

    // Membranas: vetas que dan la vuelta al anillo en las caras del corte, sin corte en la costura.
    const polares = { tapasPolares: true, periodoTapas: 1 / porUnidad(REPETIR.membrana) };
    anadir(
      this.capas.periostio,
      anillo(R_CORTICAL, R_PERIOSTIO, GROSOR_CORTE, 0, DOS_PI, undefined, polares),
      periostio,
      'periostio',
    );
    anadir(
      this.capas.cortical,
      anillo(R_MEDULAR + 0.03, R_CORTICAL, GROSOR_CORTE),
      cortical,
      'cortical',
    );
    // Láminas circunferenciales externa e interna: dos hilos que rodean la cortical.
    anadir(
      this.capas.cortical,
      anillo(0.95, 0.968, GROSOR_CORTE + 0.006),
      lineas,
      'lamina_externa',
    );
    anadir(
      this.capas.cortical,
      anillo(0.66, 0.678, GROSOR_CORTE + 0.006),
      lineas,
      'lamina_interna',
    );
    anadir(
      this.capas.endostio,
      anillo(R_MEDULAR, R_MEDULAR + 0.03, GROSOR_CORTE, 0, DOS_PI, undefined, polares),
      endostio,
      'endostio',
    );
    anadir(this.capas.medula, anillo(0, R_MEDULAR, GROSOR_CORTE), medula, 'medula_osea');

    // Un vaso de la médula (arteria nutricia, esquemática).
    const geoVaso = new SphereGeometry(0.075, 14, 10);
    this.geometrias.push(geoVaso);
    const vasoMalla = new Mesh(geoVaso, vaso);
    vasoMalla.position.set(0.16, -0.12, GROSOR_CORTE / 2 + 0.03);
    vasoMalla.name = 'vaso_medular';
    this.capas.medula.add(vasoMalla);

    // Osteonas: niveles concéntricos que se repiten en cada una (instancias). Cada osteona va algo ovalada y girada
    // (las de un corte real no son círculos iguales), con su línea de cemento, que la separa del hueso intersticial.
    const osteonas = osteonasDelCorte();
    const alto = GROSOR_CORTE + 0.022;
    const nivel = (
      [interior, exterior]: readonly [number, number],
      color: string,
      nombre: string,
      resaltable = true,
      paredExterior = false,
    ): void => {
      // Anillos diminutos repetidos: de una sola pasada (su orden interno no se percibe).
      const mat = relieve(
        material(color, 'hueso', {
          emissive: COLOR.resalte,
          emissiveIntensity: 0,
          forceSinglePass: true,
        }),
        porUnidad(REPETIR.hueso),
      );
      // El conducto de Havers sigue rojo cuando se destacan las osteonas: es el «punto rojo» del texto.
      if (resaltable) this.matOsteonas.push(mat);
      this.materiales.push(mat);
      // Los niveles se tocan: sus paredes comunes quedan dentro de la osteona. Solo la de fuera de la línea de
      // cemento asoma (la osteona sobresale un poco de las caras de la cortical).
      const geo = tumbar(
        anillo(interior, exterior, alto, 0, DOS_PI, 20, {
          paredInterior: false,
          paredExterior,
        }),
      );
      const malla = new InstancedMesh(geo, mat, osteonas.length);
      malla.name = nombre;
      const m = new Matrix4();
      const q = new Quaternion();
      const pos = new Vector3();
      const esc = new Vector3();
      osteonas.forEach((o, i) => {
        const oval = OVALIZACION_OSTEONA * Math.sin(i * 2.1);
        q.setFromAxisAngle(EJE_Z, i * 0.9);
        m.compose(
          pos.set(o.x, o.y, 0),
          q,
          esc.set(o.escala * (1 + oval), o.escala * (1 - oval), 1),
        );
        malla.setMatrixAt(i, m);
      });
      malla.instanceMatrix.needsUpdate = true;
      malla.frustumCulled = false;
      this.instanciados.push(malla);
      this.capas.cortical.add(malla);
    };
    const [lamina1, lamina2, lamina3] = NIVELES_OSTEONA.laminas;
    nivel(lamina1, COLOR.laminaClara, 'osteona_lamina_1');
    nivel(lamina2, COLOR.laminaOscura, 'osteona_lamina_2');
    nivel(lamina3, COLOR.laminaClara, 'osteona_lamina_3');
    nivel(NIVELES_OSTEONA.conducto, COLOR.vaso, 'osteona_conducto_havers', false);
    nivel(NIVELES_OSTEONA.cemento, COLOR.cemento, 'osteona_linea_cemento', false, true);

    for (const capa of Object.values(this.capas)) this.grupo.add(capa);
  }

  actualizar(estado: EstadoHueso): void {
    const visible = estado.losa.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    this.grupo.position.set(estado.losa.x, estado.losa.y, 0);
    this.grupo.scale.setScalar(estado.losa.escala * TAMANO_CORTE);
    for (const [nombre, capa] of Object.entries(this.capas) as [keyof typeof SEPARACION, Group][]) {
      capa.position.z = SEPARACION[nombre] * estado.explosion;
    }
    poner(this.materiales, estado.losa.opacidad);
    for (const m of this.matOsteonas) {
      m.emissiveIntensity = 0.75 * estado.resalte;
      m.emissive.copy(this.resalte);
    }
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    for (const i of this.instanciados) i.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Osteona ampliada
 * ----------------------------------------------------------------------------------------- */

/** Ángulo de las fibras de colágeno respecto al eje de la osteona (grados; alterna de signo en cada lámina). */
const INCLINACION_FIBRAS = 38;

export class OsteonaAmpliada implements EscalaHueso {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matLineas: LineBasicMaterial[] = [];
  private readonly lagunas: InstancedMesh;
  private readonly cuerpos: InstancedMesh;
  private readonly posicionesLagunas: { pos: Vector3; q: Quaternion }[] = [];
  private readonly canaliculos: LineSegments;
  private readonly matCanaliculos: LineBasicMaterial;
  private ultimoEnfasis = -1;
  /** Auxiliares de `ponerLagunas` (sin objetos nuevos en cada fotograma). */
  private readonly m = new Matrix4();
  private readonly salida = new Vector3();
  private readonly esc = new Vector3();

  constructor() {
    this.grupo.name = 'osteona_ampliada';
    // Eje de la osteona en Y local; se tumba a lo largo de X como el hueso.
    this.grupo.rotation.z = -Math.PI / 2;

    const clara = relieve(material(COLOR.laminaClara), REPETIR.hueso);
    const oscura = relieve(material(COLOR.laminaOscura), REPETIR.hueso);
    const cemento = material(COLOR.cemento, 'cavidad');
    const pared = relieve(material(COLOR.endostio, 'membrana'), REPETIR.membrana);
    // Vasos: cilindros cerrados, de una cara (una sola pasada); sin emisivo (la sangre no emite luz).
    const vaso = material(COLOR.vaso, 'vaso', { side: FrontSide });
    const vena = material('#5b6fb5', 'vaso', { side: FrontSide });
    this.materiales.push(clara, oscura, cemento, pared, vaso, vena);

    // Láminas concéntricas, cada una cortada por un sector distinto (corte "en escalera").
    const geoClara: BufferGeometry[] = [];
    const geoOscura: BufferGeometry[] = [];
    for (let i = 0; i < N_LAMINAS; i++) {
      const { interior, exterior } = radiosDeLamina(i);
      const { theta0, arco } = arcoConservadoDeLamina(i);
      (i % 2 === 0 ? geoClara : geoOscura).push(
        anillo(interior, exterior, LARGO_OSTEONA, theta0, arco),
      );
    }
    this.anadir(geoClara, clara, 'laminas_claras');
    this.anadir(geoOscura, oscura, 'laminas_oscuras');
    const ultima = arcoConservadoDeLamina(N_LAMINAS - 1);
    this.anadir(
      [anillo(R_OSTEONA, R_OSTEONA + 0.05, LARGO_OSTEONA, ultima.theta0, ultima.arco)],
      cemento,
      'linea_de_cemento',
    );
    const primera = arcoConservadoDeLamina(0);
    this.anadir(
      [anillo(R_HAVERS, R_HAVERS + 0.07, LARGO_OSTEONA, primera.theta0, primera.arco)],
      pared,
      'pared_conducto_havers',
    );

    // Conducto de Havers: un capilar y una vénula.
    const geoCapilar = new CylinderGeometry(0.11, 0.11, LARGO_OSTEONA + 1.2, 18);
    geoCapilar.translate(0.06, 0, 0.02);
    const geoVenula = new CylinderGeometry(0.07, 0.07, LARGO_OSTEONA + 1.2, 14);
    geoVenula.translate(-0.1, 0, -0.05);
    this.geometrias.push(geoCapilar, geoVenula);
    const capilar = new Mesh(geoCapilar, vaso);
    capilar.name = 'capilar';
    const venula = new Mesh(geoVenula, vena);
    venula.name = 'venula';
    this.grupo.add(capilar, venula);

    // Conducto de Volkmann: sale de lado, perpendicular, y conecta este conducto con otros.
    const largoVolkmann = R_OSTEONA + 1.1;
    const geoVolkmann = new CylinderGeometry(0.075, 0.075, largoVolkmann, 12);
    geoVolkmann.translate(0, largoVolkmann / 2, 0);
    const thetaV = THETA_RETIRO + grados(125);
    const dirV = new Vector3(Math.sin(thetaV), 0, Math.cos(thetaV));
    geoVolkmann.applyQuaternion(new Quaternion().setFromUnitVectors(EJE_Y, dirV));
    geoVolkmann.translate(0, 0.7, 0);
    this.geometrias.push(geoVolkmann);
    const volkmann = new Mesh(geoVolkmann, vaso);
    volkmann.name = 'conducto_volkmann';
    this.grupo.add(volkmann);

    // Fibras de colágeno: rayas oblicuas que cambian de sentido de una lámina a la siguiente.
    const geoFibras = this.fibras();
    this.geometrias.push(geoFibras);
    const matFibras = new LineBasicMaterial({ color: '#b39468', transparent: true });
    this.matLineas.push(matFibras);
    this.grupo.add(new LineSegments(geoFibras, matFibras));

    // Osteocitos: la laguna (halo claro) y la célula (azul) dentro de ella, a la vista en los peldaños. Piezas
    // pequeñas repetidas: de una sola pasada.
    const lagunasDatos = lagunasDeOsteocitos();
    const geoEsfera = new SphereGeometry(1, 12, 9);
    this.geometrias.push(geoEsfera);
    const matLaguna = material(COLOR.laguna, 'cavidad', { forceSinglePass: true });
    const matCelula = material(COLOR.osteocito, 'celula', { forceSinglePass: true });
    this.materiales.push(matLaguna, matCelula);
    this.lagunas = new InstancedMesh(geoEsfera, matLaguna, lagunasDatos.length);
    this.cuerpos = new InstancedMesh(geoEsfera, matCelula, lagunasDatos.length);
    this.lagunas.name = 'lagunas_osteocitos';
    this.cuerpos.name = 'osteocitos';
    this.lagunas.frustumCulled = false;
    this.cuerpos.frustumCulled = false;
    const qY = new Quaternion();
    const qZ = new Quaternion();
    for (const l of lagunasDatos) {
      const pos = new Vector3(l.radio * Math.sin(l.theta), l.y, l.radio * Math.cos(l.theta));
      qY.setFromAxisAngle(EJE_Y, l.theta);
      qZ.setFromAxisAngle(EJE_Z, l.giro);
      this.posicionesLagunas.push({ pos, q: qY.clone().multiply(qZ) });
    }
    this.grupo.add(this.lagunas, this.cuerpos);

    // Canalículos: prolongaciones finas que salen de cada osteocito y lo comunican con sus vecinos.
    this.matCanaliculos = new LineBasicMaterial({
      color: COLOR.canaliculo,
      transparent: true,
      opacity: 0,
    });
    this.matLineas.push(this.matCanaliculos);
    const geoCanaliculos = this.canaliculosGeometria();
    this.geometrias.push(geoCanaliculos);
    this.canaliculos = new LineSegments(geoCanaliculos, this.matCanaliculos);
    this.canaliculos.name = 'canaliculos';
    this.canaliculos.frustumCulled = false;
    this.grupo.add(this.canaliculos);

    this.ponerLagunas(0);
  }

  private anadir(geometrias: BufferGeometry[], mat: Material, nombre: string): void {
    for (const g of geometrias) {
      const malla = new Mesh(g, mat);
      malla.name = nombre;
      this.geometrias.push(g);
      this.grupo.add(malla);
    }
  }

  /**
   * Rayas de las fibras de colágeno sobre la parte a la vista de cada lámina (el "peldaño" entre su corte y el
   * de la lámina de fuera). Cada raya es una hélice corta: la inclinación alterna de una lámina a la siguiente.
   */
  private fibras(): BufferGeometry {
    const puntos: number[] = [];
    const paso = 0.07;
    for (let i = 0; i < N_LAMINAS; i++) {
      const { exterior } = radiosDeLamina(i);
      const desde = arcoRetiradoDeLamina(i) / 2;
      const hasta =
        i + 1 < N_LAMINAS
          ? arcoRetiradoDeLamina(i + 1) / 2
          : arcoRetiradoDeLamina(i) / 2 + grados(30);
      const inclinacion = Math.tan(grados(INCLINACION_FIBRAS)) * (i % 2 === 0 ? 1 : -1);
      const dTheta = (paso * inclinacion) / exterior;
      const separacion = 0.13 / exterior;
      const r = exterior + 0.006;
      for (let fase = 0; fase < DOS_PI; fase += separacion) {
        for (let y = -LARGO_OSTEONA / 2; y < LARGO_OSTEONA / 2 - paso; y += paso) {
          const k = (y + LARGO_OSTEONA / 2) / paso;
          const a = fase + k * dTheta;
          const b = a + dTheta;
          const da = distanciaAngular(a, THETA_RETIRO);
          const db = distanciaAngular(b, THETA_RETIRO);
          if (da < desde || da > hasta || db < desde || db > hasta) continue;
          puntos.push(
            r * Math.sin(a),
            y,
            r * Math.cos(a),
            r * Math.sin(b),
            y + paso,
            r * Math.cos(b),
          );
        }
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(puntos, 3));
    return geo;
  }

  /** Canalículos: cada osteocito emite unas ramas cortas y se une con los vecinos más cercanos. */
  private canaliculosGeometria(): BufferGeometry {
    const puntos: number[] = [];
    const lista = this.posicionesLagunas;
    lista.forEach((a, i) => {
      // Unión con los dos vecinos más cercanos (sin duplicar el par).
      const cercanos = lista
        .map((b, j) => ({ j, d: a.pos.distanceTo(b.pos) }))
        .filter((c) => c.j !== i && c.d < 1.5)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2);
      for (const c of cercanos) {
        if (c.j < i && lista[c.j]) continue;
        const b = lista[c.j]!;
        puntos.push(a.pos.x, a.pos.y, a.pos.z, b.pos.x, b.pos.y, b.pos.z);
      }
      // Ramas cortas alrededor de la célula, en el plano de su superficie.
      const tangente = new Vector3(1, 0, 0).applyQuaternion(a.q);
      const axial = new Vector3(0, 1, 0).applyQuaternion(a.q);
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * DOS_PI + i * 0.7;
        const dir = tangente
          .clone()
          .multiplyScalar(Math.cos(ang))
          .addScaledVector(axial, Math.sin(ang));
        const fin = a.pos.clone().addScaledVector(dir, 0.2 + 0.05 * (k % 3));
        puntos.push(a.pos.x, a.pos.y, a.pos.z, fin.x, fin.y, fin.z);
      }
    });
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(puntos, 3));
    return geo;
  }

  private ponerLagunas(enfasis: number): void {
    if (Math.abs(enfasis - this.ultimoEnfasis) < 1e-4) return;
    this.ultimoEnfasis = enfasis;
    const k = 1 + 0.9 * enfasis;
    this.posicionesLagunas.forEach(({ pos, q }, i) => {
      // La laguna es una cavidad aplanada; la célula asoma un poco de ella, hacia fuera.
      this.m.compose(pos, q, this.esc.set(0.16 * k, 0.1 * k, 0.03 * k));
      this.lagunas.setMatrixAt(i, this.m);
      this.salida
        .set(0, 0, 0.02 * k)
        .applyQuaternion(q)
        .add(pos);
      this.m.compose(this.salida, q, this.esc.set(0.11 * k, 0.068 * k, 0.05 * k));
      this.cuerpos.setMatrixAt(i, this.m);
    });
    this.lagunas.instanceMatrix.needsUpdate = true;
    this.cuerpos.instanceMatrix.needsUpdate = true;
  }

  actualizar(estado: EstadoHueso): void {
    const visible = estado.osteona.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    this.grupo.scale.setScalar(estado.osteona.escala);
    poner(this.materiales, estado.osteona.opacidad);
    for (const l of this.matLineas) {
      l.opacity = estado.osteona.opacidad * 0.85;
    }
    this.matCanaliculos.opacity = estado.osteona.opacidad * estado.osteocitos;
    this.ponerLagunas(estado.osteocitos);
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    for (const l of this.matLineas) l.dispose();
    this.lagunas.dispose();
    this.cuerpos.dispose();
  }
}
