/**
 * Las piezas de la escena del movimiento ortodóntico, como objetos de three con `actualizar(estado)` y
 * `liberar()`:
 *
 *  - `BloqueAlveolar`: el bloque de proceso alveolar cortado (cortical extruida con el hueco del trabecular, cara
 *    de corte, médula al fondo del hueco, trabéculas instanciadas) y la encía encima. No cambia con el tiempo.
 *  - `Diente`: la media corona trasera en relieve, la cara de corte del diente (esmalte, dentina, cemento, pulpa)
 *    y la marca punteada de la posición inicial. Se mueve, se inclina y se corre dentro del alvéolo.
 *  - `Alveolo`: el ligamento con sus fibras y vasos, la zona hialinizada, el hueso alveolar propio de cada lado
 *    (el derecho se festonea y oscurece al reabsorberse; el izquierdo se vuelve hueso nuevo), el hueso nuevo
 *    entre la pared inicial y la actual, y el ribete de osteoide.
 *  - `Celulas`: los osteoclastos sobre la pared de compresión y la fila de osteoblastos sobre la de tensión.
 *  - `Fuerza`: el bracket y la flecha de la fuerza, pegados a la corona.
 *
 * No calculan nada de la anatomía: reciben `EstadoOrtodoncia` (puro) y los contornos de `disposicion.ts`, y solo
 * recolocan vértices, mueven, aclaran o cambian de color. La cara de corte está en z = 0 mirando a +Z; las capas
 * planas van a profundidades distintas (centésimas) para no pelearse por el mismo píxel. Materiales compartidos
 * por capa; al liberar se libera todo lo creado.
 *
 * Realismo (2026-10-14): cada material es el de su tejido (`realismo.ts`) con la paleta natural (`NATURAL` en
 * `paleta.ts`); la cortical y la encía con los cantos biselados; trabéculas de grosor variable; corona de perfil
 * suavizado y, en el corte del diente, la dentina también dentro de la corona (el esmalte queda como un
 * casquete, como en un corte real); bracket de acero.
 *
 * Revisión de diseño (2026-10-17): la paleta es la común de las escenas (`NATURAL`, aquí `COLOR`; el diente, el
 * ligamento y la lámina, los de `hueso_alveolar`); el esmalte lleva un degradado por vértice (realismo-10); la cresta
 * queda 0,2 unidades por debajo del cuello (fidelidad-02) y el cemento cubre también la raíz cervical; el conducto
 * llega al foramen apical (fidelidad-12); los osteoclastos se posan en lagunas, a los bordes de la zona hialinizada
 * (que no tiene células) y, detrás de ella, en la cara medular de la lámina (resorción socavante; fidelidad-04); el
 * bracket va pegado a la cara de corte de la corona y la flecha, delante (realismo-12). Las placas y bandas de la cara
 * de corte no proyectan sombra (`userData.sinSombra`): flotan sobre el hueco de la médula y su sombra hacía parecer
 * despegado el alvéolo entero. Nada crea objetos de three en cada fotograma (rendimiento-15).
 */
import type { Material, BufferGeometry } from 'three';
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  FrontSide,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineDashedMaterial,
  LineLoop,
  LineSegments,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mezclar } from '../interpolacion';
import type { TipoTejido } from '../realismo';
import { liberarMaterialOrganico, materialOrganico, ponerOpacidad } from '../realismo';
import { pintarUniforme } from '../alveolar/geometria';
import {
  INDICE_APICE,
  N_MUESTRAS_RAIZ,
  TRAMO_HIALINIZADO,
  Y_CUELLO,
  contornoDiente,
  contornoRaiz,
  fibrasLigamento,
  indicesOsteoblastos,
  indicesOsteoclastos,
  indicesOsteoclastosSocavantes,
  indicesVasos,
  paredInicial,
  perfilBloque,
  perfilEncia,
  perfilesAlveolo,
  poseDiente,
  puntoDiente,
  puntosFibra,
  regionTrabecular,
  siluetaDienteInicial,
  siluetaPulpa,
  trabeculasOrtodoncia,
} from './disposicion';
import type { PerfilesAlveolo, Punto2 } from './disposicion';
import { PROFUNDIDAD_BLOQUE, PROFUNDIDAD_TRABECULAR } from './estado';
import type { EstadoOrtodoncia } from './estado';
import {
  Abanico,
  Banda,
  CENTRO_DENTINA,
  Polilineas,
  bloque,
  bracket,
  lineaCerrada,
  mediaCorona,
  placa,
  siluetaCoronaSuave,
  siluetaDentina,
} from './geometria';
import { NATURAL as COLOR } from './paleta';

const EJE_Z = new Vector3(0, 0, 1);

/** Objetos reutilizables para escribir instancias: nada se crea en cada fotograma (rendimiento-15). */
const _m = new Matrix4();
const _q = new Quaternion();
const _pos = new Vector3();
const _esc = new Vector3();

/** Profundidad (z) de cada capa plana de la cara de corte: de atrás hacia delante. */
const CAPA = {
  corteCortical: 0.005,
  huesoNuevo: 0.012,
  lamina: 0.02,
  ligamento: 0.03,
  osteoide: 0.034,
  hialinizado: 0.036,
  vasos: 0.04,
  /** La corona (esmalte) y, DELANTE, la dentina de la raíz y de la corona: el esmalte queda como un casquete. */
  corona: 0.042,
  raiz: 0.043,
  cemento: 0.045,
  fibras: 0.048,
  pulpa: 0.05,
  celulas: 0.07,
  referencia: 0.09,
  fuerza: 0.32,
} as const;

/**
 * Material de un tejido (`realismo.ts`): físico, con relieve de superficie hecho por código y de doble cara (las
 * placas se ven también desde atrás al girar).
 */
function material(
  color: string,
  tipo: TipoTejido = 'hueso',
  extra: ConstructorParameters<typeof MeshPhysicalMaterial>[0] = {},
): MeshPhysicalMaterial {
  return materialOrganico(color, tipo, { side: DoubleSide, ...extra });
}

/**
 * Repeticiones de la textura de relieve por unidad de escena (y su giro), para las piezas con UV EN UNIDADES DE
 * ESCENA (placas, bloques extruidos, bandas y abanicos de la cara de corte). Las de `realismo.ts` suponen UV de 0 a
 * 1 a lo largo de toda la pieza (cilindros, esferas): aquí harían un grano tan fino que no se vería. La misma firma
 * que en las escenas `hueso_alveolar` y `alveolo_postextraccion`.
 */
function relieve(m: MeshPhysicalMaterial, rx: number, ry = rx, giro = 0): MeshPhysicalMaterial {
  if (m.bumpMap) {
    m.bumpMap.repeat.set(rx, ry);
    m.bumpMap.rotation = giro;
  }
  return m;
}

/** Marca una malla para que no proyecte sombra (`EntornoRealista`): las placas y bandas de la cara de corte. */
function sinSombra<T extends Mesh>(m: T): T {
  m.userData.sinSombra = true;
  return m;
}

/** Libera materiales: los orgánicos con su clon de textura de relieve. */
function liberarMateriales(lista: readonly Material[]): void {
  for (const m of lista) {
    if (m instanceof MeshPhysicalMaterial) liberarMaterialOrganico(m);
    else m.dispose();
  }
}

/** Aplica una opacidad a unos materiales (transparentes solo mientras hace falta). */
function poner(materiales: readonly Material[], opacidad: number): void {
  ponerOpacidad(materiales, opacidad);
}

/** Interfaz común de las piezas. */
export interface PiezaOrtodoncia {
  readonly grupo: Group;
  actualizar: (estado: EstadoOrtodoncia) => void;
  liberar: () => void;
}

/** Base con el registro de recursos y la liberación común. */
abstract class Pieza implements PiezaOrtodoncia {
  readonly grupo = new Group();
  protected readonly geometrias: BufferGeometry[] = [];
  protected readonly materiales: Material[] = [];
  protected readonly instanciados: InstancedMesh[] = [];

  protected malla(
    geometria: BufferGeometry,
    mat: Material,
    nombre: string,
    padre: Group = this.grupo,
  ): Mesh {
    const m = new Mesh(geometria, mat);
    m.name = nombre;
    m.frustumCulled = false;
    this.geometrias.push(geometria);
    padre.add(m);
    return m;
  }

  protected instanciado(
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

  abstract actualizar(estado: EstadoOrtodoncia): void;

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    for (const i of this.instanciados) i.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Bloque de proceso alveolar y encía (estáticos)
 * ----------------------------------------------------------------------------------------- */

/** Bisel de los cantos de la cortical y de la encía (unidades de escena). */
const BISEL = { cortical: 0.04, encia: 0.06 } as const;

export class BloqueAlveolar extends Pieza {
  constructor() {
    super();
    this.grupo.name = 'bloque_alveolar';
    // Placas y bloques con UV en unidades de escena: una repetición del relieve por unidad (o algo más).
    const cortical = relieve(material(COLOR.cortical, 'hueso'), 1);
    const corte = relieve(material(COLOR.corteCortical, 'hueso'), 1);
    const medula = relieve(material(COLOR.medula, 'medula'), 1.2);
    const trabecula = material(COLOR.trabecula, 'hueso_esponjoso');
    const encia = relieve(material(COLOR.encia, 'encia'), 1.5);
    this.materiales.push(cortical, corte, medula, trabecula, encia);

    const contorno = perfilBloque();
    const trabecular = regionTrabecular();
    // Cascarón cortical con el hueco del trabecular como túnel; su tapa en z = 0 es la sección.
    this.malla(
      bloque(contorno, [trabecular], PROFUNDIDAD_BLOQUE, BISEL.cortical),
      cortical,
      'cortical',
    );
    this.malla(placa(contorno, [trabecular], CAPA.corteCortical), corte, 'corte_cortical');
    // Médula al fondo del hueco (el alvéolo y el hueso nuevo se pintan encima, en z > 0).
    this.malla(placa(trabecular, [], -PROFUNDIDAD_TRABECULAR), medula, 'medula');
    // Encía: una banda extruida sobre la cresta, de la que asoma la corona.
    this.malla(bloque(perfilEncia(), [], PROFUNDIDAD_BLOQUE, BISEL.encia), encia, 'encia');

    // Trabéculas: barras instanciadas dentro del hueco, fuera de la huella que barre el diente. Algo más finas
    // en un extremo y sin tapas (los extremos quedan dentro de la red).
    const lista = trabeculasOrtodoncia();
    const geo = new CylinderGeometry(0.025, 0.031, 1, 6, 1, true);
    const barras = this.instanciado(geo, trabecula, lista.length, 'trabeculas');
    const m = new Matrix4();
    const q = new Quaternion();
    lista.forEach((t, i) => {
      // El eje Y de la barra se gira sobre Z hasta la dirección (cos a, sen a) del plano de corte.
      q.setFromAxisAngle(EJE_Z, t.angulo - Math.PI / 2);
      // Grosor algo distinto en cada trabécula (determinista): una red real no es de barras iguales.
      const grosor = 0.75 + 0.6 * Math.abs(Math.sin(i * 12.9898 + t.x * 78.233));
      m.compose(new Vector3(t.x, t.y, t.z), q, new Vector3(grosor, t.largo, grosor));
      barras.setMatrixAt(i, m);
    });
    barras.instanceMatrix.needsUpdate = true;
  }

  actualizar(): void {
    // El bloque no cambia con el tiempo.
  }
}

/* -------------------------------------------------------------------------------------------
 * Diente
 * ----------------------------------------------------------------------------------------- */

/**
 * Centros de los abanicos de la corona y de la pulpa, en el marco del diente: desde ellos las siluetas son
 * estrelladas (la corona, medio cuerpo por encima del cuello).
 */
const CENTRO_CORONA: Punto2 = [0, Y_CUELLO + 0.5];
const CENTRO_PULPA: Punto2 = [0, 0.3];

/** Semiancho del ribete de cemento sobre la raíz. */
const GROSOR_CEMENTO = 0.025;

/**
 * Contorno del cemento: el de la raíz (de la cresta izquierda, por el ápice, a la cresta derecha) prolongado por los
 * dos lados hasta el cuello, donde empieza el esmalte (fidelidad-02: entre la cresta y el cuello la raíz cervical
 * también está cubierta de cemento). En el marco del diente; con sus normales hacia fuera.
 */
function contornoCemento(raiz: readonly Punto2[]): Punto2[] {
  const izquierda = raiz[0]!;
  const derecha = raiz[raiz.length - 1]!;
  return [[izquierda[0], Y_CUELLO], ...raiz, [derecha[0], Y_CUELLO]];
}

export class Diente extends Pieza {
  private readonly corona = new Group();
  private readonly abanicoRaiz: Abanico;
  private readonly abanicoCorona: Abanico;
  private readonly abanicoPulpa: Abanico;
  private readonly cemento: Banda;
  private readonly matReferencia: LineDashedMaterial;
  private readonly siluetaCorona = siluetaCoronaSuave();
  private readonly siluetaDentina = siluetaDentina();
  private readonly siluetaPulpa = siluetaPulpa();
  /** Contorno del cemento en el marco del diente (la raíz más la raíz cervical) y su ribete interior. */
  private readonly siluetaCemento: Punto2[];
  private readonly interiorCemento: Punto2[];

  constructor() {
    super();
    this.grupo.name = 'diente';
    // Esmalte liso y satinado (color por vértice: el degradado de la corona en relieve y el blanco uniforme de su
    // cara de corte; el material es blanco); dentina y cemento lisos (el cemento, una franja fina sobre la raíz); la
    // pulpa, tejido blando y húmedo. Las caras de corte (abanicos y banda) llevan UV en unidades de escena.
    const esmalte = material('#ffffff', 'esmalte', { vertexColors: true });
    const dentina = relieve(material(COLOR.dentina, 'dentina'), 1.5);
    const cemento = relieve(material(COLOR.cemento, 'dentina'), 3);
    const pulpa = relieve(material(COLOR.pulpa, 'encia'), 3);
    this.materiales.push(esmalte, dentina, cemento, pulpa);

    // Media corona en relieve (mitad trasera, z < 0), en un grupo que sigue la pose del diente.
    this.corona.name = 'corona_relieve';
    this.malla(mediaCorona(), esmalte, 'corona', this.corona);
    this.grupo.add(this.corona);

    // Cara de corte del diente: abanicos que se recolocan con el diente. La dentina es una sola pieza (raíz y
    // corona) delante del esmalte: en el corte, el esmalte queda como el casquete que cubre la corona. Es un dibujo
    // plano: no proyecta sombra.
    this.abanicoRaiz = new Abanico(this.siluetaDentina.length);
    sinSombra(this.malla(this.abanicoRaiz.geometria, dentina, 'corte_raiz'));
    this.abanicoCorona = new Abanico(this.siluetaCorona.length);
    pintarUniforme(this.abanicoCorona.geometria, COLOR.esmalte);
    sinSombra(this.malla(this.abanicoCorona.geometria, esmalte, 'corte_corona'));
    this.abanicoPulpa = new Abanico(this.siluetaPulpa.length);
    sinSombra(this.malla(this.abanicoPulpa.geometria, pulpa, 'pulpa'));
    // Cemento: un ribete por dentro del contorno de la raíz, del cuello izquierdo al derecho.
    const base = contornoRaiz();
    this.siluetaCemento = contornoCemento(base.puntos);
    const normales = [base.normales[0]!, ...base.normales, base.normales[N_MUESTRAS_RAIZ - 1]!];
    this.interiorCemento = this.siluetaCemento.map((p, i) => [
      p[0] - normales[i]![0] * GROSOR_CEMENTO,
      p[1] - normales[i]![1] * GROSOR_CEMENTO,
    ]);
    this.cemento = new Banda(this.siluetaCemento.length);
    sinSombra(this.malla(this.cemento.geometria, cemento, 'cemento'));

    // Marca punteada de la posición inicial del diente (aparece con el desplazamiento).
    this.matReferencia = new LineDashedMaterial({
      color: COLOR.referencia,
      dashSize: 0.09,
      gapSize: 0.06,
      transparent: true,
      opacity: 0,
    });
    this.materiales.push(this.matReferencia);
    const geoReferencia = lineaCerrada(siluetaDienteInicial(), CAPA.referencia);
    this.geometrias.push(geoReferencia);
    const referencia = new LineLoop(geoReferencia, this.matReferencia);
    referencia.computeLineDistances();
    referencia.name = 'posicion_inicial';
    referencia.frustumCulled = false;
    this.grupo.add(referencia);
  }

  actualizar(estado: EstadoOrtodoncia): void {
    const pose = poseDiente(estado);
    const origen = puntoDiente([0, 0], estado);
    this.corona.position.set(origen[0], origen[1], 0);
    this.corona.rotation.z = -pose.angulo;

    this.abanicoRaiz.poner(
      contornoDiente(this.siluetaDentina, estado),
      puntoDiente(CENTRO_DENTINA, estado),
      CAPA.raiz,
    );
    this.abanicoCorona.poner(
      contornoDiente(this.siluetaCorona, estado),
      puntoDiente(CENTRO_CORONA, estado),
      CAPA.corona,
    );
    this.abanicoPulpa.poner(
      contornoDiente(this.siluetaPulpa, estado),
      puntoDiente(CENTRO_PULPA, estado),
      CAPA.pulpa,
    );
    // Cemento: el ribete (calculado una vez en el marco del diente) sigue al diente como el resto del corte.
    this.cemento.poner(
      contornoDiente(this.interiorCemento, estado),
      contornoDiente(this.siluetaCemento, estado),
      CAPA.cemento,
    );

    this.matReferencia.opacity = estado.referencia;
    this.matReferencia.visible = estado.referencia > 0.004;
  }
}

/* -------------------------------------------------------------------------------------------
 * Alvéolo: ligamento, hueso alveolar propio, hueso nuevo, osteoide
 * ----------------------------------------------------------------------------------------- */

const TONOS = {
  lamina: new Color(COLOR.laminaCribiforme),
  huesoResorbido: new Color(COLOR.huesoResorbido),
  huesoNuevo: new Color(COLOR.huesoNuevo),
  huesoMaduro: new Color(COLOR.huesoMaduro),
} as const;

/** Muestras de una mitad del contorno (lado izquierdo o derecho, con el fondo del ápice incluido). */
const N_MITAD = INDICE_APICE + 1;
const N_HIALINIZADO = TRAMO_HIALINIZADO.hasta - TRAMO_HIALINIZADO.desde + 1;

export class Alveolo extends Pieza {
  private readonly ligamento = new Banda(N_MUESTRAS_RAIZ);
  private readonly laminaIzquierda = new Banda(N_MITAD);
  private readonly laminaDerecha = new Banda(N_MITAD);
  private readonly huesoNuevo = new Banda(N_MITAD);
  private readonly osteoide = new Banda(N_MITAD);
  private readonly hialinizado = new Banda(N_HIALINIZADO);
  private readonly fibras: Polilineas;
  private readonly vasos: InstancedMesh;
  private readonly matLaminaIzquierda: MeshPhysicalMaterial;
  private readonly matLaminaDerecha: MeshPhysicalMaterial;
  private readonly matHuesoNuevo: MeshPhysicalMaterial;
  private readonly matHialinizado: MeshPhysicalMaterial;
  private readonly matFibras: LineBasicMaterial;
  private readonly paredInicial = paredInicial();
  private readonly listaFibras = fibrasLigamento();
  private readonly listaVasos = indicesVasos();

  constructor() {
    super();
    this.grupo.name = 'alveolo';
    // Bandas con UV en unidades de escena (a lo largo y a través). El ligamento, membrana fibrosa: con estas UV
    // sus vetas cruzan la banda del hueso al cemento, como las fibras principales.
    const ligamento = relieve(material(COLOR.ligamento, 'membrana'), 1, 2);
    this.matLaminaIzquierda = relieve(material(COLOR.laminaCribiforme, 'hueso'), 1.5);
    this.matLaminaDerecha = relieve(material(COLOR.laminaCribiforme, 'hueso'), 1.5);
    // Hueso nuevo, fascicular: más poroso que el maduro.
    this.matHuesoNuevo = relieve(material(COLOR.huesoNuevo, 'hueso_inmaduro'), 1.5);
    // Osteoide: matriz aún sin mineralizar, lisa y húmeda.
    const osteoide = relieve(material(COLOR.osteoide, 'cartilago'), 3);
    // Zona hialinizada: ligamento sin células, de aspecto vítreo. Siempre translúcida, pero plana: una sola pasada
    // basta (sin cara interior que ordenar; rendimiento-01).
    this.matHialinizado = relieve(
      material(COLOR.hialinizado, 'cartilago', { transparent: true, forceSinglePass: true }),
      3,
    );
    const vaso = material(COLOR.vaso, 'vaso');
    this.materiales.push(
      ligamento,
      this.matLaminaIzquierda,
      this.matLaminaDerecha,
      this.matHuesoNuevo,
      osteoide,
      this.matHialinizado,
      vaso,
    );

    // Bandas planas de la cara de corte: no proyectan sombra (flotan sobre el hueco de la médula).
    sinSombra(this.malla(this.huesoNuevo.geometria, this.matHuesoNuevo, 'hueso_nuevo'));
    sinSombra(
      this.malla(
        this.laminaIzquierda.geometria,
        this.matLaminaIzquierda,
        'hueso_alveolar_propio_mesial',
      ),
    );
    sinSombra(
      this.malla(
        this.laminaDerecha.geometria,
        this.matLaminaDerecha,
        'hueso_alveolar_propio_distal',
      ),
    );
    sinSombra(this.malla(this.ligamento.geometria, ligamento, 'ligamento_periodontal'));
    sinSombra(this.malla(this.osteoide.geometria, osteoide, 'osteoide'));
    sinSombra(this.malla(this.hialinizado.geometria, this.matHialinizado, 'zona_hialinizada'));

    // Fibras del ligamento: polilíneas de cuatro puntos, rectas o arrugadas según el lado.
    this.fibras = new Polilineas(this.listaFibras.length, 4);
    this.matFibras = new LineBasicMaterial({ color: COLOR.fibra });
    this.materiales.push(this.matFibras);
    const fibras = new LineSegments(this.fibras.geometria, this.matFibras);
    fibras.name = 'fibras_ligamento';
    fibras.frustumCulled = false;
    this.geometrias.push(this.fibras.geometria);
    this.grupo.add(fibras);

    // Vasos del ligamento: discos instanciados que se aplastan con el ligamento.
    const geoVaso = new SphereGeometry(1, 12, 8);
    this.vasos = this.instanciado(geoVaso, vaso, this.listaVasos.length, 'vasos_ligamento');
  }

  actualizar(estado: EstadoOrtodoncia): void {
    const perfiles = perfilesAlveolo(estado);
    this.ligamento.poner(perfiles.raiz, perfiles.pared, CAPA.ligamento);
    this.laminaIzquierda.poner(perfiles.pared, perfiles.lamina, CAPA.lamina, 0);
    this.laminaDerecha.poner(perfiles.pared, perfiles.lamina, CAPA.lamina, INDICE_APICE);
    this.huesoNuevo.poner(this.paredInicial, perfiles.pared, CAPA.huesoNuevo, 0);
    this.osteoide.poner(perfiles.osteoide, perfiles.pared, CAPA.osteoide, 0);
    this.hialinizado.poner(
      perfiles.raiz,
      perfiles.pared,
      CAPA.hialinizado,
      TRAMO_HIALINIZADO.desde,
    );

    // Colores: la pared derecha se oscurece al reabsorberse; la izquierda y el hueso nuevo maduran.
    const { resorcion } = estado.compresion;
    const { osteoide, maduracion } = estado.tension;
    this.matLaminaDerecha.color.lerpColors(TONOS.lamina, TONOS.huesoResorbido, resorcion);
    this.matLaminaIzquierda.color
      .lerpColors(TONOS.lamina, TONOS.huesoNuevo, osteoide)
      .lerp(TONOS.lamina, maduracion);
    this.matHuesoNuevo.color.lerpColors(TONOS.huesoNuevo, TONOS.huesoMaduro, maduracion);
    this.matHialinizado.opacity = estado.ligamento.hialinizacion;
    this.matHialinizado.visible = estado.ligamento.hialinizacion > 0.004;

    this.fibras.poner(
      this.listaFibras.map((f) => puntosFibra(perfiles, f, estado)),
      CAPA.fibras,
    );
    this.ponerVasos(perfiles);
  }

  /** Cada vaso va en medio del ligamento, alargado a lo largo de la pared y tan grueso como el ligamento deje. */
  private ponerVasos(perfiles: PerfilesAlveolo): void {
    this.listaVasos.forEach((i, k) => {
      const r = perfiles.raiz[i]!;
      const w = perfiles.osteoide[i]!;
      const n = perfiles.normales[i]!;
      const ancho = Math.hypot(w[0] - r[0], w[1] - r[1]);
      _q.setFromAxisAngle(EJE_Z, Math.atan2(n[1], n[0]));
      _m.compose(
        _pos.set((r[0] + w[0]) / 2, (r[1] + w[1]) / 2, CAPA.vasos),
        _q,
        _esc.set(Math.max(0.004, ancho * 0.36), 0.055, 0.03),
      );
      this.vasos.setMatrixAt(k, _m);
    });
    this.vasos.instanceMatrix.needsUpdate = true;
  }
}

/* -------------------------------------------------------------------------------------------
 * Células: osteoclastos (compresión) y osteoblastos (tensión)
 * ----------------------------------------------------------------------------------------- */

/**
 * Semiejes de un osteoclasto (a lo largo de la normal, de la pared y en profundidad) y de sus núcleos. Aplanado
 * contra el hueso que reabsorbe (antes, 0,1 a lo largo de la normal: en el ligamento comprimido, de 0,045 a 0,09,
 * la célula montaba sobre el cemento, que es lo que se vería en una resorción radicular). `hundido`: cuánto se mete
 * en su laguna de Howship (el centro queda a `normal − hundido` de la pared).
 */
const OSTEOCLASTO = {
  normal: 0.045,
  pared: 0.17,
  fondo: 0.09,
  nucleo: 0.03,
  hundido: 0.01,
} as const;
/** Semiejes del osteoblasto cúbico y de la célula de revestimiento en que se convierte. */
const OSTEOBLASTO = {
  cubico: { normal: 0.07, pared: 0.05, fondo: 0.05, nucleo: 0.028 },
  revestimiento: { normal: 0.022, pared: 0.075, fondo: 0.05, nucleo: 0.016 },
} as const;
const NUCLEOS_POR_OSTEOCLASTO = 3;

export class Celulas extends Pieza {
  private readonly osteoclastos: InstancedMesh;
  private readonly nucleosOsteoclastos: InstancedMesh;
  private readonly osteoblastos: InstancedMesh;
  private readonly nucleosOsteoblastos: InstancedMesh;
  /**
   * Los osteoclastos: los de la resorción frontal, sobre la pared (desde el ligamento vivo, a los bordes de la zona
   * hialinizada), y los de la socavante, sobre la cara medular de la lámina, detrás de ella (`medular`).
   */
  private readonly listaOc = [
    ...indicesOsteoclastos().map((i) => ({ i, medular: false })),
    ...indicesOsteoclastosSocavantes().map((i) => ({ i, medular: true })),
  ];
  private readonly indicesOb = indicesOsteoblastos();

  constructor() {
    super();
    this.grupo.name = 'celulas';
    const osteoclasto = material(COLOR.osteoclasto, 'celula');
    const osteoblasto = material(COLOR.osteoblasto, 'celula');
    const nucleo = material(COLOR.nucleo, 'nucleo');
    this.materiales.push(osteoclasto, osteoblasto, nucleo);

    this.osteoclastos = this.instanciado(
      new SphereGeometry(1, 14, 10),
      osteoclasto,
      this.listaOc.length,
      'osteoclastos',
    );
    this.nucleosOsteoclastos = this.instanciado(
      new SphereGeometry(1, 8, 6),
      nucleo,
      this.listaOc.length * NUCLEOS_POR_OSTEOCLASTO,
      'nucleos_osteoclastos',
    );
    this.osteoblastos = this.instanciado(
      new RoundedBoxGeometry(2, 2, 2, 2, 0.5),
      osteoblasto,
      this.indicesOb.length,
      'osteoblastos',
    );
    this.nucleosOsteoblastos = this.instanciado(
      new SphereGeometry(1, 8, 6),
      nucleo,
      this.indicesOb.length,
      'nucleos_osteoblastos',
    );
  }

  actualizar(estado: EstadoOrtodoncia): void {
    const perfiles = perfilesAlveolo(estado);
    const oc = estado.compresion.osteoclastos;
    const ob = estado.tension.osteoblastos;
    this.osteoclastos.visible = oc > 0.004;
    this.nucleosOsteoclastos.visible = oc > 0.004;
    this.osteoblastos.visible = ob > 0.004;
    this.nucleosOsteoblastos.visible = ob > 0.004;

    const s = Math.max(1e-4, oc);
    const separacion = (OSTEOCLASTO.normal - OSTEOCLASTO.hundido) * s;
    this.listaOc.forEach(({ i, medular }, k) => {
      const [nx, ny] = perfiles.normales[i]!;
      _q.setFromAxisAngle(EJE_Z, Math.atan2(ny, nx));
      // Frontal: sobre la pared, metida en su laguna, del lado del ligamento (hacia −normal). Socavante: sobre el
      // borde externo de la lámina, del lado de la médula (hacia +normal).
      const [x, y] = medular ? perfiles.lamina[i]! : perfiles.pared[i]!;
      const sentido = medular ? 1 : -1;
      const cx = x + sentido * nx * separacion;
      const cy = y + sentido * ny * separacion;
      _m.compose(
        _pos.set(cx, cy, CAPA.celulas),
        _q,
        _esc.set(OSTEOCLASTO.normal * s, OSTEOCLASTO.pared * s, OSTEOCLASTO.fondo * s),
      );
      this.osteoclastos.setMatrixAt(k, _m);
      const r = OSTEOCLASTO.nucleo * s;
      for (let j = 0; j < NUCLEOS_POR_OSTEOCLASTO; j++) {
        // Los núcleos, en fila a lo largo de la célula y algo apartados del hueso.
        const a = (j - 1) * 0.075 * s;
        _m.compose(
          _pos.set(
            cx - ny * a + sentido * nx * 0.01,
            cy + nx * a + sentido * ny * 0.01,
            CAPA.celulas + 0.06 * s,
          ),
          _q,
          _esc.set(r, r, r),
        );
        this.nucleosOsteoclastos.setMatrixAt(k * NUCLEOS_POR_OSTEOCLASTO + j, _m);
      }
    });
    this.osteoclastos.instanceMatrix.needsUpdate = true;
    this.nucleosOsteoclastos.instanceMatrix.needsUpdate = true;

    const plano = estado.tension.revestimiento;
    const forma = {
      normal: mezclar(OSTEOBLASTO.cubico.normal, OSTEOBLASTO.revestimiento.normal, plano),
      pared: mezclar(OSTEOBLASTO.cubico.pared, OSTEOBLASTO.revestimiento.pared, plano),
      fondo: mezclar(OSTEOBLASTO.cubico.fondo, OSTEOBLASTO.revestimiento.fondo, plano),
      nucleo: mezclar(OSTEOBLASTO.cubico.nucleo, OSTEOBLASTO.revestimiento.nucleo, plano),
    };
    const sb = Math.max(1e-4, ob);
    this.indicesOb.forEach((i, k) => {
      const [x, y] = perfiles.osteoide[i]!;
      const [nx, ny] = perfiles.normales[i]!;
      _q.setFromAxisAngle(EJE_Z, Math.atan2(ny, nx));
      const cx = x - nx * forma.normal * sb;
      const cy = y - ny * forma.normal * sb;
      _m.compose(
        _pos.set(cx, cy, CAPA.celulas),
        _q,
        _esc.set(forma.normal * sb, forma.pared * sb, forma.fondo * sb),
      );
      this.osteoblastos.setMatrixAt(k, _m);
      const r = forma.nucleo * sb;
      _m.compose(_pos.set(cx, cy, CAPA.celulas + forma.fondo * sb), _q, _esc.set(r, r, r));
      this.nucleosOsteoblastos.setMatrixAt(k, _m);
    });
    this.osteoblastos.instanceMatrix.needsUpdate = true;
    this.nucleosOsteoblastos.instanceMatrix.needsUpdate = true;
  }
}

/* -------------------------------------------------------------------------------------------
 * Fuerza ortodóntica: bracket y flecha
 * ----------------------------------------------------------------------------------------- */

/**
 * Altura a la que va el bracket: el tercio medio de la corona (el 46 % de su altura sobre el cuello, como antes de
 * subir el cuello sobre la cresta).
 */
const Y_BRACKET = Y_CUELLO + 0.6;

/**
 * Profundidad (z) del bracket: con su base (de −0,0625 a −0,0275 en `bracket()`) entre 0,035 y 0,07, atravesando la
 * cara de corte de la corona (0,042 a 0,05): pegado a ella (realismo-12; antes flotaba 0,21 delante del diente y su
 * sombra caía despegada). La flecha sigue delante de todo, en `CAPA.fuerza`.
 */
const Z_BRACKET = CAPA.corona + 0.055;

export class Fuerza extends Pieza {
  private readonly grupoBracket = new Group();
  private readonly grupoFlecha = new Group();

  constructor() {
    super();
    this.grupo.name = 'fuerza_ortodontica';
    // Bracket de acero: metálico de verdad (refleja la luz de entorno) sobre la base lisa del tejido `cristal`,
    // sin su barniz. La flecha es un objeto didáctico: lisa y satinada, como las flechas de la escena de la matriz.
    // Son sólidos cerrados: con la cara delantera basta (y al desvanecerse se dibujan en una sola pasada).
    const acero = material(COLOR.bracket, 'cristal', {
      metalness: 1,
      roughness: 0.28,
      clearcoat: 0,
      side: FrontSide,
    });
    const fuerza = material(COLOR.fuerza, 'molecula', { side: FrontSide });
    this.materiales.push(acero, fuerza);

    // Dos subgrupos: el bracket, pegado a la cara de corte de la corona, y la flecha, delante. El giro del diente
    // va en el grupo de la pieza.
    this.grupoBracket.name = 'bracket_pegado';
    this.grupoBracket.position.z = Z_BRACKET;
    this.grupoFlecha.name = 'flecha';
    this.grupoFlecha.position.z = CAPA.fuerza;
    this.grupo.add(this.grupoBracket, this.grupoFlecha);

    this.malla(bracket(), acero, 'bracket', this.grupoBracket);
    const vastago = new CylinderGeometry(0.05, 0.05, 0.8, 12);
    vastago.rotateZ(-Math.PI / 2);
    vastago.translate(0.5, 0, 0);
    this.malla(vastago, fuerza, 'vastago_flecha', this.grupoFlecha);
    const punta = new ConeGeometry(0.15, 0.34, 16);
    punta.rotateZ(-Math.PI / 2);
    punta.translate(1.05, 0, 0);
    this.malla(punta, fuerza, 'punta_flecha', this.grupoFlecha);
  }

  actualizar(estado: EstadoOrtodoncia): void {
    const visible = estado.fuerza > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    const [x, y] = puntoDiente([0, Y_BRACKET], estado);
    this.grupo.position.set(x, y, 0);
    this.grupo.rotation.z = -poseDiente(estado).angulo;
    poner(this.materiales, estado.fuerza);
  }
}
