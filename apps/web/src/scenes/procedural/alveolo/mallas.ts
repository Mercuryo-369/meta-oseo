/**
 * Las piezas de la escena del alvéolo tras la extracción, como objetos de three con `actualizar(estado)` y
 * `liberar()`:
 *
 *  - `Reborde`: la mitad del cuerpo mandibular que queda (x < 0): la cortical como una cinta extruida que se
 *    MORFA con la pérdida del reborde, la cara de la médula al fondo del hueco, las trabéculas instanciadas (las
 *    del antiguo alvéolo aparecen al cicatrizar; las que quedan fuera del hueso que se pierde se ocultan) y el
 *    foramen mentoniano sobre la cara vestibular.
 *  - `Encia`: dos cintas (vestibular y lingual) sobre la cresta que cierran el alvéolo y siguen al reborde.
 *  - `Diente`: la media corona con la cara de corte del diente (esmalte, dentina, cemento y pulpa); sube y se
 *    desvanece al extraerse.
 *  - `Alveolo`: el hueso alveolar propio y el ligamento (placas fijas), el fondo oscuro de la cavidad y los
 *    rellenos que se morfan (coágulo, granulación, hueso nuevo, tapa cortical), el sangrado, los vasos y los
 *    osteoclastos instanciados.
 *  - `Conducto`: el conducto mandibular cortado, sobre la cara de la médula, con el nervio, la arteria y la vena.
 *
 * No calculan nada de la biología: reciben `EstadoAlveolo` (puro) y escriben, mueven, aclaran o tiñen piezas.
 * La cara de corte está en x = 0 mirando a +X; las capas planas van a profundidades distintas (una centésima
 * entre capas) para no pelearse por el mismo píxel. Materiales compartidos por capa; al liberar se libera todo.
 *
 * Realismo (2026-10-14): materiales físicos por tejido (`realismo.ts`, con relieve de superficie hecho por
 * código) y la paleta natural (`NATURAL` de `paleta.ts`, aquí `COLOR`).
 *
 * Revisión de diseño (2026-10-17): las placas importadas de `hueso_alveolar` miran a +X de verdad (render-02); la
 * cinta de la encía vestibular tenía las normales hacia dentro y se escribe con los carriles al revés (render-07); el
 * diente es el de `hueso_alveolar` (esmalte con degradado, cresta 0,2 por debajo del cuello con la raíz cervical en
 * relieve, cemento sin poros, conducto hasta el foramen apical); los osteoclastos son células aplanadas contra la
 * superficie que reabsorben (realismo-21). Las placas planas del alvéolo y del corte del diente no proyectan sombra
 * (flotan sobre el hueco de la médula: su sombra parecía la de una lámina despegada) y las que se desvanecen se
 * dibujan en una sola pasada (`forceSinglePass`: una placa plana no tiene cara interior que ordenar).
 */
import type { Material, BufferGeometry } from 'three';
import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  DESPLAZAMIENTO_LAMINA,
  bandaAlrededorDeRaiz,
  bandaCemento,
  perforacionesLamina,
  siluetaCorona,
  siluetaDentina,
  siluetaPulpa,
} from '../alveolar/disposicion';
import { CONDUCTO, GROSOR_LIGAMENTO, LARGO_SEGMENTO, Z_ALVEOLO } from '../alveolar/estado';
import { mediaCorona, mediaRaizCervical, pintarUniforme, placa } from '../alveolar/geometria';
import {
  CENTRO_MEDULA,
  PASOS_CONTORNO,
  PASOS_RELLENO,
  PUNTOS_ENCIA,
  Y_FONDO_CAVIDAD,
  carrilesEncia,
  contornoExterior,
  contornoInterior,
  dentroDelTrabecular,
  osteoclastosReborde,
  poligonoCavidad,
  poligonoRelleno,
  poligonoTapa,
  posicionForamen,
  puntosSangrado,
  puntosVasos,
  techoAlveolo,
  trabeculasReborde,
} from './disposicion';
import type { Lado, Punto2 } from './disposicion';
import { ELEVACION_DIENTE, FORAMEN, PROFUNDIDAD_MEDULA } from './estado';
import type { EstadoAlveolo } from './estado';
import { abanico, cinta, escribirAbanico, escribirCinta } from './geometria';
import { NATURAL as COLOR } from './paleta';
import type { TipoTejido } from '../realismo';
import { liberarMaterialOrganico, materialOrganico, ponerOpacidad } from '../realismo';

const EJE_X = new Vector3(1, 0, 0);
const MITAD = LARGO_SEGMENTO / 2;
const PUNTOS_CONTORNO = 2 * (PASOS_CONTORNO + 1);
const PUNTOS_RELLENO = 2 * (PASOS_RELLENO + 1);

/** Profundidad (x) de cada capa plana de la cara de corte: de atrás hacia delante. */
const CAPA = {
  lamina: 0.01,
  cavidad: 0.02,
  huesoNuevo: 0.03,
  granulacion: 0.04,
  coagulo: 0.05,
  ligamento: 0.06,
  diente: 0.07,
  dentina: 0.074,
  cemento: 0.077,
  pulpa: 0.08,
  discos: 0.09,
  tapa: 0.09,
} as const;

/**
 * Repeticiones del relieve de superficie por unidad de escena en las piezas con UV en unidades (placas, cintas
 * y abanicos): las primitivas de three traen UV de 0 a 1 y para ellas vale la repetición de `realismo.ts`.
 */
const RELIEVE = { hueso: 1.3, medula: 1.2, membrana: 0.6, dentina: 1, blando: 1.5 } as const;

/** Radio de las trabéculas (el de abajo; arriba se afinan un poco). */
const RADIO_TRABECULA = 0.031;

/**
 * Material de un tejido (`realismo.ts`): físico, con relieve de superficie hecho por código y de doble cara
 * (las placas se ven por ambos lados).
 */
function material(
  color: string,
  tipo: TipoTejido = 'hueso',
  extra: ConstructorParameters<typeof MeshPhysicalMaterial>[0] = {},
): MeshPhysicalMaterial {
  return materialOrganico(color, tipo, { side: DoubleSide, ...extra });
}

/**
 * Fija las repeticiones del relieve (y su giro) de un material. El mapa de relieve y el de rugosidad son la
 * misma textura (un clon propio de cada material), así que basta con tocarla una vez.
 */
function relieve(
  m: MeshPhysicalMaterial,
  repeticiones: number,
  alto = repeticiones,
  giro = 0,
): MeshPhysicalMaterial {
  const textura = m.bumpMap;
  if (textura) {
    textura.repeat.set(repeticiones, alto);
    textura.rotation = giro;
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
function poner(materiales: readonly Material[], opacidad: number): void {
  ponerOpacidad(materiales, opacidad);
}

/** Material de una placa plana de la cara de corte que se desvanece: una sola pasada basta (sin cara interior). */
function plano(
  color: string,
  tipo: TipoTejido,
  repeticiones: number = RELIEVE.blando,
): MeshPhysicalMaterial {
  return relieve(material(color, tipo, { forceSinglePass: true }), repeticiones);
}

/** Marca una malla para que no proyecte sombra (`EntornoRealista`): placas planas del corte. */
function sinSombra<T extends Mesh>(m: T): T {
  m.userData.sinSombra = true;
  return m;
}

/** Disco plano que mira a +X (la cara de corte). */
function disco(radio: number, segmentos: number): CircleGeometry {
  const g = new CircleGeometry(radio, segmentos);
  g.rotateY(Math.PI / 2);
  return g;
}

/** Une geometrías con los mismos atributos en una (una sola llamada de dibujo) y libera las partes. */
function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías del diente.');
  return unida;
}

/** Interfaz común de las piezas. */
export interface PiezaAlveolo {
  readonly grupo: Group;
  actualizar: (estado: EstadoAlveolo) => void;
  liberar: () => void;
}

/** Base con el registro de recursos y la liberación común. */
abstract class Pieza implements PiezaAlveolo {
  readonly grupo = new Group();
  protected readonly geometrias: BufferGeometry[] = [];
  protected readonly materiales: Material[] = [];
  protected readonly instanciados: InstancedMesh[] = [];

  protected malla(
    geometria: BufferGeometry,
    mat: Material | Material[],
    nombre: string,
    padre: Group = this.grupo,
  ): Mesh {
    const m = new Mesh(geometria, mat);
    m.name = nombre;
    this.geometrias.push(geometria);
    padre.add(m);
    return m;
  }

  protected instancias(
    geometria: BufferGeometry,
    mat: Material,
    cantidad: number,
    nombre: string,
  ): InstancedMesh {
    const im = new InstancedMesh(geometria, mat, cantidad);
    im.name = nombre;
    im.frustumCulled = false;
    this.geometrias.push(geometria);
    this.instanciados.push(im);
    this.grupo.add(im);
    return im;
  }

  abstract actualizar(estado: EstadoAlveolo): void;

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    for (const i of this.instanciados) i.dispose();
  }
}

const matriz = new Matrix4();
const cuaternion = new Quaternion();
const posicion = new Vector3();
const escala = new Vector3();
const normal = new Vector3();
const EJE_Y = new Vector3(0, 1, 0);

/** Escribe una instancia como un punto escalado uniformemente (escala mínima en vez de cero: sin matrices singulares). */
function instanciaPunto(
  im: InstancedMesh,
  i: number,
  x: number,
  y: number,
  z: number,
  s: number,
): void {
  const k = Math.max(1e-4, s);
  matriz.compose(posicion.set(x, y, z), cuaternion.identity(), escala.set(k, k, k));
  im.setMatrixAt(i, matriz);
}

/**
 * Forma de un osteoclasto activo (realismo-21): una célula grande y aplanada, pegada a la superficie que reabsorbe,
 * no una bola. Semiejes relativos al radio de la esfera: a lo largo de la superficie (`ancho`, `largo`) y a lo largo
 * de la normal (`alto`).
 */
const OSTEOCLASTO = { ancho: 1.3, alto: 0.5, largo: 1.0 } as const;

/* -------------------------------------------------------------------------------------------
 * Reborde: cortical, médula, trabéculas y foramen
 * ----------------------------------------------------------------------------------------- */

export class Reborde extends Pieza {
  private readonly cortical: BufferGeometry;
  private readonly medula: BufferGeometry;
  private readonly trabeculas: InstancedMesh;
  private readonly lista = trabeculasReborde();
  /** Grosor de cada trabécula (determinista, sin asomar por delante de la cara de corte). */
  private readonly grosores: number[];
  private readonly foramen = new Group();
  private ultimoReborde = -1;
  private ultimasTrabeculas = -1;

  constructor() {
    super();
    this.grupo.name = 'reborde';
    // Cara de corte del hueso compacto (más clara) y superficie del hueso, mates y porosas; médula grasa y
    // húmeda; trabéculas de hueso esponjoso; el foramen, un agujero en sombra; el nervio, con sus fascículos.
    const matCorte = relieve(material(COLOR.corteCortical, 'hueso'), RELIEVE.hueso);
    const matCortical = relieve(material(COLOR.cortical, 'hueso'), RELIEVE.hueso);
    const matMedula = relieve(material(COLOR.medula, 'medula'), RELIEVE.medula);
    const matTrabecula = material(COLOR.trabecula, 'hueso_esponjoso');
    const matForamen = material(COLOR.foramen, 'cavidad');
    const matNervio = material(COLOR.nervio, 'nervio');
    this.materiales.push(matCorte, matCortical, matMedula, matTrabecula, matForamen, matNervio);

    // Cortical: cinta cerrada entre el contorno exterior y el interior; tapas (grupo 0) más claras que las paredes.
    this.cortical = cinta(PUNTOS_CONTORNO, true);
    const cortical = this.malla(this.cortical, [matCorte, matCortical], 'cortical');
    cortical.frustumCulled = false;

    // Médula: abanico del contorno interior al fondo del hueco y otro que cierra el extremo lejano.
    this.medula = abanico(PUNTOS_CONTORNO);
    const medula = this.malla(this.medula, matMedula, 'medula');
    medula.frustumCulled = false;
    const fondo = new Mesh(this.medula, matMedula);
    fondo.name = 'fondo_medula';
    fondo.position.x = -MITAD + 0.01 + PROFUNDIDAD_MEDULA;
    fondo.frustumCulled = false;
    this.grupo.add(fondo);

    // Trabéculas: barras instanciadas dentro del hueco, de seis caras, abiertas por los extremos (quedan dentro
    // de la red o de la médula), algo más finas por un extremo y de grosor algo distinto cada una.
    const barra = new CylinderGeometry(RADIO_TRABECULA * 0.84, RADIO_TRABECULA, 1, 6, 1, true);
    this.trabeculas = this.instancias(barra, matTrabecula, this.lista.length, 'trabeculas');
    this.grosores = this.lista.map((t, i) =>
      Math.min(
        0.75 + 0.6 * Math.abs(Math.sin(i * 12.9898 + t.z * 78.233)),
        (-t.x - 0.004) / RADIO_TRABECULA,
      ),
    );

    // Foramen mentoniano: un óvalo oscuro sobre la cara vestibular con el nervio mentoniano asomando (un cabo
    // corto que sale del agujero; los tejidos blandos donde se ramifica no se dibujan).
    this.foramen.name = 'foramen_mentoniano';
    const agujero = new CircleGeometry(FORAMEN.radio, 20);
    agujero.scale(1, 0.8, 1);
    this.malla(agujero, matForamen, 'foramen', this.foramen);
    const nervio = new CylinderGeometry(FORAMEN.radio * 0.46, FORAMEN.radio * 0.52, 0.06, 12);
    nervio.rotateX(Math.PI / 2);
    nervio.scale(1, 0.8, 1);
    nervio.translate(0, 0, 0.03);
    this.malla(nervio, matNervio, 'nervio_mentoniano', this.foramen);
    this.grupo.add(this.foramen);
  }

  private escribirTrabeculas(reborde: number, aparicion: number): void {
    this.lista.forEach((t, i) => {
      let s = t.enAlveolo ? aparicion : 1;
      if (!dentroDelTrabecular(t.z, t.y, reborde, 0.1)) s = 0;
      const k = Math.max(1e-4, s);
      const grosor = this.grosores[i]! * k;
      // El eje Y de la barra se gira sobre X hasta la dirección (0, sen a, cos a) del plano de corte.
      cuaternion.setFromAxisAngle(EJE_X, Math.PI / 2 - t.angulo);
      matriz.compose(
        posicion.set(t.x, t.y, t.z),
        cuaternion,
        escala.set(grosor, t.largo * k, grosor),
      );
      this.trabeculas.setMatrixAt(i, matriz);
    });
    this.trabeculas.instanceMatrix.needsUpdate = true;
  }

  actualizar(estado: EstadoAlveolo): void {
    const r = estado.reborde;
    const cambioReborde = Math.abs(r - this.ultimoReborde) > 1e-6;
    if (cambioReborde) {
      this.ultimoReborde = r;
      escribirCinta(this.cortical, contornoExterior(r), contornoInterior(r), MITAD);
      escribirAbanico(this.medula, contornoInterior(r), -PROFUNDIDAD_MEDULA, CENTRO_MEDULA);
      const f = posicionForamen(r);
      this.foramen.position.set(f.x, f.y, f.z);
    }
    if (cambioReborde || Math.abs(estado.trabeculasAlveolo - this.ultimasTrabeculas) > 1e-6) {
      this.ultimasTrabeculas = estado.trabeculasAlveolo;
      this.escribirTrabeculas(r, estado.trabeculasAlveolo);
    }
  }
}

/* -------------------------------------------------------------------------------------------
 * Encía
 * ----------------------------------------------------------------------------------------- */

export class Encia extends Pieza {
  private readonly cintas: Record<Lado, BufferGeometry>;
  private ultimoCierre = -1;
  private ultimoReborde = -1;

  constructor() {
    super();
    this.grupo.name = 'encia';
    // Mucosa blanda y húmeda, con el punteado fino de la encía insertada.
    const mat = relieve(material(COLOR.encia, 'encia'), RELIEVE.blando);
    this.materiales.push(mat);
    this.cintas = {
      vestibular: cinta(PUNTOS_ENCIA, false),
      lingual: cinta(PUNTOS_ENCIA, false),
    };
    for (const lado of ['vestibular', 'lingual'] as const) {
      const m = this.malla(this.cintas[lado], [mat, mat], `encia_${lado}`);
      m.frustumCulled = false;
    }
  }

  actualizar(estado: EstadoAlveolo): void {
    if (
      Math.abs(estado.cierreEncia - this.ultimoCierre) < 1e-6 &&
      Math.abs(estado.reborde - this.ultimoReborde) < 1e-6
    ) {
      return;
    }
    this.ultimoCierre = estado.cierreEncia;
    this.ultimoReborde = estado.reborde;
    for (const lado of ['vestibular', 'lingual'] as const) {
      const c = carrilesEncia(lado, estado.cierreEncia, estado.reborde);
      // render-07: los carriles de la vestibular corren en el sentido opuesto a los de la lingual (la cara del
      // cuerpo se refleja), así que con el mismo orden su cinta quedaba con las normales hacia dentro.
      if (lado === 'vestibular') escribirCinta(this.cintas[lado], c.interior, c.exterior, MITAD);
      else escribirCinta(this.cintas[lado], c.exterior, c.interior, MITAD);
    }
  }
}

/* -------------------------------------------------------------------------------------------
 * Diente
 * ----------------------------------------------------------------------------------------- */

export class Diente extends Pieza {
  constructor() {
    super();
    this.grupo.name = 'diente';
    // El diente de `hueso_alveolar`: esmalte liso y satinado (color por vértice, el material es blanco); dentina
    // lisa; cemento liso y mate (avascular: sin los poros del hueso); pulpa blanda y húmeda. La dentina y la pulpa
    // son placas planas: una sola pasada al desvanecerse. El cemento lleva la raíz cervical en relieve (entre la
    // cresta y el cuello), así que no es plano y conserva las dos pasadas.
    const esmalte = material('#ffffff', 'esmalte', { vertexColors: true });
    const dentina = plano(COLOR.dentina, 'dentina', RELIEVE.dentina);
    const cemento = relieve(material(COLOR.cemento, 'dentina'), RELIEVE.dentina);
    const pulpa = plano(COLOR.pulpa, 'encia');
    this.materiales.push(esmalte, dentina, cemento, pulpa);
    // La media corona en relieve y la cara de corte del esmalte en una sola malla; encima, la dentina (corona
    // y raíz), el cemento que reviste la raíz y la pulpa, cuyo conducto llega al foramen apical.
    const caraEsmalte = pintarUniforme(placa(siluetaCorona(), [], CAPA.diente), COLOR.esmalte);
    this.malla(unir([mediaCorona(-1), caraEsmalte]), esmalte, 'corona');
    sinSombra(this.malla(placa(siluetaDentina(), [], CAPA.dentina), dentina, 'corte_raiz'));
    this.malla(
      unir([placa(bandaCemento(), [], CAPA.cemento), mediaRaizCervical(-1)]),
      cemento,
      'cemento',
    );
    sinSombra(this.malla(placa(siluetaPulpa(), [], CAPA.pulpa), pulpa, 'pulpa'));
  }

  actualizar(estado: EstadoAlveolo): void {
    const visible = estado.diente.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    this.grupo.position.y = estado.diente.elevacion * ELEVACION_DIENTE;
    poner(this.materiales, estado.diente.opacidad);
  }
}

/* -------------------------------------------------------------------------------------------
 * Alvéolo: paredes, cavidad, rellenos, sangrado, vasos y osteoclastos
 * ----------------------------------------------------------------------------------------- */

/** Placa en abanico que se morfa: guarda su malla y su material para escribirla en cada instante. */
interface Relleno {
  geometria: BufferGeometry;
  malla: Mesh;
  material: MeshPhysicalMaterial;
}

export class Alveolo extends Pieza {
  private readonly matLamina: MeshPhysicalMaterial;
  private readonly matLigamento: MeshPhysicalMaterial;
  private readonly cavidad: Relleno;
  private readonly coagulo: Relleno;
  private readonly granulacion: Relleno;
  private readonly huesoNuevo: Relleno;
  private readonly tapa: Relleno;
  private readonly sangrado: InstancedMesh;
  private readonly vasos: InstancedMesh;
  /** Los osteoclastos: los de las paredes del alvéolo y los del reborde nunca están a la vez. */
  private readonly osteoclastos = new Group();
  private readonly osteoclastosAlveolo: InstancedMesh;
  private readonly osteoclastosReborde: InstancedMesh;
  private readonly puntosSangrado = puntosSangrado();
  private readonly puntosVasos = puntosVasos();
  private readonly puntosLamina = perforacionesLamina();
  private readonly colorEntretejido = new Color(COLOR.huesoEntretejido);
  private readonly colorLaminar = new Color(COLOR.huesoLaminar);

  constructor() {
    super();
    this.grupo.name = 'alveolo';
    // Hueso alveolar propio: hueso denso. Ligamento: tejido fibroso, con las vetas del relieve atravesando la
    // banda (giradas un cuarto de vuelta), como sus fibras principales. Placas planas que se desvanecen.
    this.matLamina = plano(COLOR.laminaCribiforme, 'hueso', RELIEVE.hueso);
    this.matLigamento = relieve(
      material(COLOR.ligamento, 'membrana', { forceSinglePass: true }),
      RELIEVE.membrana,
      RELIEVE.membrana,
      Math.PI / 2,
    );
    this.materiales.push(this.matLamina, this.matLigamento);

    // Hueso alveolar propio (fasciculado) y ligamento periodontal: dos bandas fijas alrededor de la raíz.
    sinSombra(
      this.malla(
        placa(bandaAlrededorDeRaiz(GROSOR_LIGAMENTO, DESPLAZAMIENTO_LAMINA), [], CAPA.lamina),
        this.matLamina,
        'hueso_alveolar_propio',
      ),
    );
    sinSombra(
      this.malla(
        placa(bandaAlrededorDeRaiz(0, GROSOR_LIGAMENTO), [], CAPA.ligamento),
        this.matLigamento,
        'ligamento_periodontal',
      ),
    );

    // Rellenos: el fondo del alvéolo vacío en sombra; el hueso nuevo, entretejido y poroso; el tejido de
    // granulación y el coágulo, grumosos y muy húmedos; la tapa cortical, hueso compacto.
    this.cavidad = this.relleno('cavidad', COLOR.cavidad, 'cavidad');
    this.huesoNuevo = this.relleno('hueso_nuevo', COLOR.huesoEntretejido, 'hueso_inmaduro');
    this.granulacion = this.relleno('tejido_granulacion', COLOR.granulacion, 'coagulo');
    this.coagulo = this.relleno('coagulo', COLOR.coagulo, 'coagulo');
    this.tapa = this.relleno('tapa_cortical', COLOR.corteCortical, 'hueso', RELIEVE.hueso);

    // Sangre líquida y brillante; vasos lisos y húmedos; osteoclastos con superficie de célula.
    const matSangre = material(COLOR.sangre, 'liquido');
    const matVaso = material(COLOR.vaso, 'vaso');
    const matOsteoclasto = material(COLOR.osteoclasto, 'celula');
    this.materiales.push(matSangre, matVaso, matOsteoclasto);
    this.sangrado = this.instancias(
      disco(0.05, 12),
      matSangre,
      this.puntosSangrado.length,
      'sangrado',
    );
    this.vasos = this.instancias(disco(0.055, 12), matVaso, this.puntosVasos.length, 'vasos');
    sinSombra(this.sangrado);
    sinSombra(this.vasos);

    // Osteoclastos: células grandes y aplanadas contra la superficie que reabsorben (realismo-21), sin facetas al
    // acercarse (la resolución de una esfera de 12 × 8 caras). Dos grupos de instancias, uno por fase, para que
    // solo se dibuje el que trabaja. Los de las paredes del alvéolo están sobre la cara de corte: de ellos solo se
    // ve la mitad de delante (las placas tapan la otra), así que son cúpulas bajas que miran a +X. Los del reborde,
    // sobre la superficie del hueso, esferas aplastadas a lo largo de la normal de la superficie.
    this.osteoclastos.name = 'osteoclastos';
    const cupula = new SphereGeometry(0.085, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    cupula.rotateZ(-Math.PI / 2);
    const esfera = new SphereGeometry(0.085, 12, 8);
    this.geometrias.push(cupula, esfera);
    const grupoDe = (geo: BufferGeometry, cantidad: number, nombre: string): InstancedMesh => {
      const im = new InstancedMesh(geo, matOsteoclasto, cantidad);
      im.name = nombre;
      im.frustumCulled = false;
      this.instanciados.push(im);
      this.osteoclastos.add(im);
      return im;
    };
    this.osteoclastosAlveolo = grupoDe(cupula, this.puntosLamina.length, 'osteoclastos_alveolo');
    this.osteoclastosReborde = grupoDe(
      esfera,
      osteoclastosReborde(0, MITAD).length,
      'osteoclastos_reborde',
    );
    this.grupo.add(this.osteoclastos);
  }

  private relleno(
    nombre: string,
    color: string,
    tipo: TipoTejido,
    repeticiones: number = RELIEVE.blando,
  ): Relleno {
    const mat = plano(color, tipo, repeticiones);
    this.materiales.push(mat);
    const geometria = abanico(PUNTOS_RELLENO);
    const malla = sinSombra(this.malla(geometria, mat, nombre));
    malla.frustumCulled = false;
    return { geometria, malla, material: mat };
  }

  /** Escribe una placa de relleno; la oculta si no tiene área o es transparente del todo. */
  private escribir(r: Relleno, puntos: Punto2[], x: number, opacidad: number): void {
    const area = puntos[0]![1] - puntos[puntos.length / 2 - 1]![1] > 1e-4;
    const visible = area && opacidad > 0.004;
    r.malla.visible = visible;
    if (!visible) return;
    escribirAbanico(r.geometria, puntos, x);
    poner([r.material], opacidad);
  }

  private escribirDiscos(im: InstancedMesh, puntos: readonly Punto2[], s: number): void {
    im.visible = s > 0.004;
    if (!im.visible) return;
    puntos.forEach(([z, y], i) => instanciaPunto(im, i, CAPA.discos, y, z, s));
    im.instanceMatrix.needsUpdate = true;
  }

  actualizar(estado: EstadoAlveolo): void {
    const techo = techoAlveolo(estado.reborde);
    const fundido = 1 - estado.huesoNuevo.fundido;

    poner([this.matLamina], 1 - estado.laminaResorbida);
    poner([this.matLigamento], estado.ligamento);
    this.grupo.getObjectByName('hueso_alveolar_propio')!.visible = estado.laminaResorbida < 0.996;
    this.grupo.getObjectByName('ligamento_periodontal')!.visible = estado.ligamento > 0.004;

    this.escribir(this.cavidad, poligonoCavidad(Y_FONDO_CAVIDAD, techo, 1), CAPA.cavidad, fundido);
    this.huesoNuevo.material.color
      .copy(this.colorEntretejido)
      .lerp(this.colorLaminar, estado.huesoNuevo.maduracion);
    this.escribir(
      this.huesoNuevo,
      poligonoRelleno(0, 1, techo),
      CAPA.huesoNuevo,
      estado.huesoNuevo.presencia * fundido,
    );
    this.escribir(
      this.granulacion,
      poligonoRelleno(estado.granulacion.encogido, 1, techo),
      CAPA.granulacion,
      estado.granulacion.presencia,
    );
    this.escribir(
      this.coagulo,
      poligonoRelleno(estado.coagulo.encogido, estado.coagulo.nivel, techo),
      CAPA.coagulo,
      1,
    );
    this.escribir(this.tapa, poligonoTapa(estado.tapaCortical, techo), CAPA.tapa, 1);

    this.escribirDiscos(this.sangrado, this.puntosSangrado, estado.sangrado);
    this.escribirDiscos(this.vasos, this.puntosVasos, estado.vasos);

    // Osteoclastos: primero sobre el hueso alveolar propio (más en la tabla vestibular), luego sobre el reborde.
    const a = estado.osteoclastos.alveolo;
    const b = estado.osteoclastos.reborde;
    this.osteoclastos.visible = a > 0.004 || b > 0.004;
    if (this.osteoclastos.visible) {
      // Solo se dibuja el grupo que trabaja, pero se escriben los dos (como cuando eran una sola malla).
      this.osteoclastosAlveolo.visible = a > 0.004;
      this.osteoclastosReborde.visible = b > 0.004;
      // En la cara de corte: X es el eje de la cúpula (bajo, 0,038), Y la pared (a lo largo) y Z a través.
      this.puntosLamina.forEach(([z, y], i) => {
        const k = Math.max(1e-4, a * (z > Z_ALVEOLO ? 1.15 : 0.8));
        matriz.compose(
          posicion.set(CAPA.discos, y, z),
          cuaternion.identity(),
          escala.set(0.45 * k, OSTEOCLASTO.ancho * k, OSTEOCLASTO.largo * k),
        );
        this.osteoclastosAlveolo.setMatrixAt(i, matriz);
      });
      // En el reborde: el eje Y de la esfera, a lo largo de la normal de la superficie (aplastada contra ella).
      const k = Math.max(1e-4, b);
      for (const [i, p] of osteoclastosReborde(estado.reborde, MITAD).entries()) {
        cuaternion.setFromUnitVectors(EJE_Y, normal.set(0, p.normal[1], p.normal[0]));
        matriz.compose(
          posicion.set(p.x, p.y, p.z),
          cuaternion,
          escala.set(OSTEOCLASTO.ancho * k, OSTEOCLASTO.alto * k, OSTEOCLASTO.largo * k),
        );
        this.osteoclastosReborde.setMatrixAt(i, matriz);
      }
      this.osteoclastosAlveolo.instanceMatrix.needsUpdate = true;
      this.osteoclastosReborde.instanceMatrix.needsUpdate = true;
    }
  }
}

/* -------------------------------------------------------------------------------------------
 * Conducto mandibular
 * ----------------------------------------------------------------------------------------- */

export class Conducto extends Pieza {
  constructor() {
    super();
    this.grupo.name = 'conducto_mandibular';
    // La luz del conducto: tejido conjuntivo laxo y grasa alrededor del paquete; su borde, hueso denso; el
    // nervio, con sus fascículos; los vasos, lisos y húmedos. Los discos traen UV de 0 a 1.
    const luz = relieve(material(COLOR.conducto, 'medula'), 1);
    const borde = material(COLOR.bordeConducto, 'hueso');
    const nervio = relieve(material(COLOR.nervio, 'nervio'), 2);
    const arteria = material(COLOR.arteria, 'vaso');
    const vena = material(COLOR.vena, 'vaso');
    this.materiales.push(luz, borde, nervio, arteria, vena);

    // Todo sobre la cara de la médula, mirando a +X: la luz del conducto, su borde denso y los tres cortes.
    const x0 = -PROFUNDIDAD_MEDULA + 0.008;
    const r = CONDUCTO.radio;
    const geoLuz = disco(r, 28);
    geoLuz.translate(x0, CONDUCTO.y, CONDUCTO.z);
    this.malla(geoLuz, luz, 'luz_conducto');
    const geoBorde = new RingGeometry(r, r + 0.045, 36);
    geoBorde.rotateY(Math.PI / 2);
    geoBorde.translate(x0 + 0.002, CONDUCTO.y, CONDUCTO.z);
    this.malla(geoBorde, borde, 'borde_conducto');
    const geoNervio = disco(r * 0.43, 18);
    geoNervio.translate(x0 + 0.004, CONDUCTO.y - r * 0.05, CONDUCTO.z - r * 0.22);
    this.malla(geoNervio, nervio, 'nervio_alveolar_inferior');
    const geoArteria = disco(r * 0.24, 14);
    geoArteria.translate(x0 + 0.004, CONDUCTO.y + r * 0.34, CONDUCTO.z + r * 0.48);
    this.malla(geoArteria, arteria, 'arteria_alveolar_inferior');
    const geoVena = disco(r * 0.27, 14);
    geoVena.translate(x0 + 0.004, CONDUCTO.y - r * 0.4, CONDUCTO.z + r * 0.46);
    this.malla(geoVena, vena, 'vena_alveolar_inferior');
  }

  /** El conducto no cambia: es el reborde el que baja hacia él. */
  actualizar(): void {}
}
