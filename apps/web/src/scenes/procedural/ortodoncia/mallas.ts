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
 */
import type { Material, BufferGeometry } from 'three';
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineDashedMaterial,
  LineLoop,
  LineSegments,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mezclar } from '../interpolacion';
import {
  INDICE_APICE,
  N_MUESTRAS_RAIZ,
  TRAMO_HIALINIZADO,
  contornoDiente,
  fibrasLigamento,
  indicesOsteoblastos,
  indicesOsteoclastos,
  indicesVasos,
  paredInicial,
  perfilBloque,
  perfilEncia,
  perfilesAlveolo,
  poseDiente,
  puntoDiente,
  puntosFibra,
  regionTrabecular,
  siluetaCorona,
  siluetaDienteInicial,
  siluetaPulpa,
  siluetaRaiz,
  trabeculasOrtodoncia,
} from './disposicion';
import type { PerfilesAlveolo, Punto2 } from './disposicion';
import { PROFUNDIDAD_BLOQUE, PROFUNDIDAD_TRABECULAR, Y_APICE, Y_CRESTA } from './estado';
import type { EstadoOrtodoncia } from './estado';
import { Abanico, Banda, Polilineas, bloque, lineaCerrada, mediaCorona, placa } from './geometria';
import { HEX } from './paleta';

const EJE_Z = new Vector3(0, 0, 1);

/** Profundidad (z) de cada capa plana de la cara de corte: de atrás hacia delante. */
const CAPA = {
  corteCortical: 0.005,
  huesoNuevo: 0.012,
  lamina: 0.02,
  ligamento: 0.03,
  osteoide: 0.034,
  hialinizado: 0.036,
  vasos: 0.04,
  raiz: 0.04,
  corona: 0.042,
  cemento: 0.045,
  fibras: 0.048,
  pulpa: 0.05,
  celulas: 0.07,
  referencia: 0.09,
  fuerza: 0.32,
} as const;

/** Material estándar de doble cara (las placas se ven también desde atrás al girar). */
function material(
  color: string,
  extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {},
): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0,
    side: DoubleSide,
    ...extra,
  });
}

/** Aplica una opacidad a unos materiales (transparentes solo mientras hace falta). */
function poner(materiales: readonly Material[], opacidad: number): void {
  const o = Math.max(0, Math.min(1, opacidad));
  for (const m of materiales) {
    m.opacity = o;
    m.transparent = o < 0.995;
    m.depthWrite = o > 0.5;
  }
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
    for (const m of this.materiales) m.dispose();
    for (const i of this.instanciados) i.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Bloque de proceso alveolar y encía (estáticos)
 * ----------------------------------------------------------------------------------------- */

export class BloqueAlveolar extends Pieza {
  constructor() {
    super();
    this.grupo.name = 'bloque_alveolar';
    const cortical = material(HEX.cortical);
    const corte = material(HEX.corteCortical, { roughness: 0.7 });
    const medula = material(HEX.medula, { roughness: 0.55 });
    const trabecula = material(HEX.trabecula, { roughness: 0.7 });
    const encia = material(HEX.encia, { roughness: 0.5 });
    this.materiales.push(cortical, corte, medula, trabecula, encia);

    const contorno = perfilBloque();
    const trabecular = regionTrabecular();
    // Cascarón cortical con el hueco del trabecular como túnel; su tapa en z = 0 es la sección.
    this.malla(bloque(contorno, [trabecular], PROFUNDIDAD_BLOQUE), cortical, 'cortical');
    this.malla(placa(contorno, [trabecular], CAPA.corteCortical), corte, 'corte_cortical');
    // Médula al fondo del hueco (el alvéolo y el hueso nuevo se pintan encima, en z > 0).
    this.malla(placa(trabecular, [], -PROFUNDIDAD_TRABECULAR), medula, 'medula');
    // Encía: una banda extruida sobre la cresta, de la que asoma la corona.
    this.malla(bloque(perfilEncia(), [], PROFUNDIDAD_BLOQUE), encia, 'encia');

    // Trabéculas: barras instanciadas dentro del hueco, fuera de la huella que barre el diente.
    const lista = trabeculasOrtodoncia();
    const geo = new CylinderGeometry(0.028, 0.028, 1, 5, 1, true);
    const barras = this.instanciado(geo, trabecula, lista.length, 'trabeculas');
    const m = new Matrix4();
    const q = new Quaternion();
    lista.forEach((t, i) => {
      // El eje Y de la barra se gira sobre Z hasta la dirección (cos a, sen a) del plano de corte.
      q.setFromAxisAngle(EJE_Z, t.angulo - Math.PI / 2);
      m.compose(new Vector3(t.x, t.y, t.z), q, new Vector3(1, t.largo, 1));
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

/** Semiancho del ribete de cemento sobre la raíz. */
const GROSOR_CEMENTO = 0.025;

export class Diente extends Pieza {
  private readonly corona = new Group();
  private readonly abanicoRaiz: Abanico;
  private readonly abanicoCorona: Abanico;
  private readonly abanicoPulpa: Abanico;
  private readonly cemento: Banda;
  private readonly matReferencia: LineDashedMaterial;
  private readonly siluetaCorona = siluetaCorona();
  private readonly siluetaPulpa = siluetaPulpa();
  private readonly siluetaRaiz = siluetaRaiz();

  constructor() {
    super();
    this.grupo.name = 'diente';
    const esmalte = material(HEX.esmalte, { roughness: 0.35 });
    const dentina = material(HEX.dentina, { roughness: 0.6 });
    const cemento = material(HEX.cemento, { roughness: 0.7 });
    const pulpa = material(HEX.pulpa, { roughness: 0.5 });
    this.materiales.push(esmalte, dentina, cemento, pulpa);

    // Media corona en relieve (mitad trasera, z < 0), en un grupo que sigue la pose del diente.
    this.corona.name = 'corona_relieve';
    this.malla(mediaCorona(), esmalte, 'corona', this.corona);
    this.grupo.add(this.corona);

    // Cara de corte del diente: abanicos que se recolocan con el diente.
    this.abanicoRaiz = new Abanico(N_MUESTRAS_RAIZ);
    this.malla(this.abanicoRaiz.geometria, dentina, 'corte_raiz');
    this.abanicoCorona = new Abanico(this.siluetaCorona.length);
    this.malla(this.abanicoCorona.geometria, esmalte, 'corte_corona');
    this.abanicoPulpa = new Abanico(this.siluetaPulpa.length);
    this.malla(this.abanicoPulpa.geometria, pulpa, 'pulpa');
    this.cemento = new Banda(N_MUESTRAS_RAIZ);
    this.malla(this.cemento.geometria, cemento, 'cemento');

    // Marca punteada de la posición inicial del diente (aparece con el desplazamiento).
    this.matReferencia = new LineDashedMaterial({
      color: HEX.referencia,
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

    const raiz = contornoDiente(this.siluetaRaiz, estado);
    this.abanicoRaiz.poner(raiz, puntoDiente([0, (Y_CRESTA + Y_APICE) / 2], estado), CAPA.raiz);
    this.abanicoCorona.poner(
      contornoDiente(this.siluetaCorona, estado),
      puntoDiente([0, Y_CRESTA + 0.45], estado),
      CAPA.corona,
    );
    this.abanicoPulpa.poner(
      contornoDiente(this.siluetaPulpa, estado),
      puntoDiente([0, 0.3], estado),
      CAPA.pulpa,
    );
    // Cemento: un ribete por dentro del contorno de la raíz.
    const perfiles = perfilesAlveolo(estado);
    const dentro: Punto2[] = raiz.map((p, i) => {
      const n = perfiles.normales[i]!;
      return [p[0] - n[0] * GROSOR_CEMENTO, p[1] - n[1] * GROSOR_CEMENTO];
    });
    this.cemento.poner(dentro, raiz, CAPA.cemento);

    this.matReferencia.opacity = estado.referencia;
    this.matReferencia.visible = estado.referencia > 0.004;
  }
}

/* -------------------------------------------------------------------------------------------
 * Alvéolo: ligamento, hueso alveolar propio, hueso nuevo, osteoide
 * ----------------------------------------------------------------------------------------- */

const COLOR = {
  lamina: new Color(HEX.laminaCribiforme),
  huesoResorbido: new Color(HEX.huesoResorbido),
  huesoNuevo: new Color(HEX.huesoNuevo),
  huesoMaduro: new Color(HEX.huesoMaduro),
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
  private readonly matLaminaIzquierda: MeshStandardMaterial;
  private readonly matLaminaDerecha: MeshStandardMaterial;
  private readonly matHuesoNuevo: MeshStandardMaterial;
  private readonly matHialinizado: MeshStandardMaterial;
  private readonly matFibras: LineBasicMaterial;
  private readonly paredInicial = paredInicial();
  private readonly listaFibras = fibrasLigamento();
  private readonly listaVasos = indicesVasos();

  constructor() {
    super();
    this.grupo.name = 'alveolo';
    const ligamento = material(HEX.ligamento, { roughness: 0.75 });
    this.matLaminaIzquierda = material(HEX.laminaCribiforme, { roughness: 0.65 });
    this.matLaminaDerecha = material(HEX.laminaCribiforme, { roughness: 0.65 });
    this.matHuesoNuevo = material(HEX.huesoNuevo, { roughness: 0.65 });
    const osteoide = material(HEX.osteoide, { roughness: 0.5 });
    this.matHialinizado = material(HEX.hialinizado, { roughness: 0.4, transparent: true });
    const vaso = material(HEX.vaso, { roughness: 0.4 });
    this.materiales.push(
      ligamento,
      this.matLaminaIzquierda,
      this.matLaminaDerecha,
      this.matHuesoNuevo,
      osteoide,
      this.matHialinizado,
      vaso,
    );

    this.malla(this.huesoNuevo.geometria, this.matHuesoNuevo, 'hueso_nuevo');
    this.malla(
      this.laminaIzquierda.geometria,
      this.matLaminaIzquierda,
      'hueso_alveolar_propio_mesial',
    );
    this.malla(this.laminaDerecha.geometria, this.matLaminaDerecha, 'hueso_alveolar_propio_distal');
    this.malla(this.ligamento.geometria, ligamento, 'ligamento_periodontal');
    this.malla(this.osteoide.geometria, osteoide, 'osteoide');
    this.malla(this.hialinizado.geometria, this.matHialinizado, 'zona_hialinizada');

    // Fibras del ligamento: polilíneas de cuatro puntos, rectas o arrugadas según el lado.
    this.fibras = new Polilineas(this.listaFibras.length, 4);
    this.matFibras = new LineBasicMaterial({ color: HEX.fibra });
    this.materiales.push(this.matFibras);
    const fibras = new LineSegments(this.fibras.geometria, this.matFibras);
    fibras.name = 'fibras_ligamento';
    fibras.frustumCulled = false;
    this.geometrias.push(this.fibras.geometria);
    this.grupo.add(fibras);

    // Vasos del ligamento: discos instanciados que se aplastan con el ligamento.
    const geoVaso = new SphereGeometry(1, 10, 6);
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
    this.matLaminaDerecha.color.lerpColors(COLOR.lamina, COLOR.huesoResorbido, resorcion);
    this.matLaminaIzquierda.color
      .lerpColors(COLOR.lamina, COLOR.huesoNuevo, osteoide)
      .lerp(COLOR.lamina, maduracion);
    this.matHuesoNuevo.color.lerpColors(COLOR.huesoNuevo, COLOR.huesoMaduro, maduracion);
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
    const m = new Matrix4();
    const q = new Quaternion();
    this.listaVasos.forEach((i, k) => {
      const r = perfiles.raiz[i]!;
      const w = perfiles.osteoide[i]!;
      const n = perfiles.normales[i]!;
      const ancho = Math.hypot(w[0] - r[0], w[1] - r[1]);
      q.setFromAxisAngle(EJE_Z, Math.atan2(n[1], n[0]));
      m.compose(
        new Vector3((r[0] + w[0]) / 2, (r[1] + w[1]) / 2, CAPA.vasos),
        q,
        new Vector3(Math.max(0.004, ancho * 0.36), 0.055, 0.03),
      );
      this.vasos.setMatrixAt(k, m);
    });
    this.vasos.instanceMatrix.needsUpdate = true;
  }
}

/* -------------------------------------------------------------------------------------------
 * Células: osteoclastos (compresión) y osteoblastos (tensión)
 * ----------------------------------------------------------------------------------------- */

/** Semiejes de un osteoclasto (a lo largo de la normal, de la pared y en profundidad) y de sus núcleos. */
const OSTEOCLASTO = { normal: 0.1, pared: 0.17, fondo: 0.09, nucleo: 0.03 } as const;
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
  private readonly indicesOc = indicesOsteoclastos();
  private readonly indicesOb = indicesOsteoblastos();

  constructor() {
    super();
    this.grupo.name = 'celulas';
    const osteoclasto = material(HEX.osteoclasto, { roughness: 0.45 });
    const osteoblasto = material(HEX.osteoblasto, { roughness: 0.5 });
    const nucleo = material(HEX.nucleo, { roughness: 0.4 });
    this.materiales.push(osteoclasto, osteoblasto, nucleo);

    this.osteoclastos = this.instanciado(
      new SphereGeometry(1, 14, 10),
      osteoclasto,
      this.indicesOc.length,
      'osteoclastos',
    );
    this.nucleosOsteoclastos = this.instanciado(
      new SphereGeometry(1, 8, 6),
      nucleo,
      this.indicesOc.length * NUCLEOS_POR_OSTEOCLASTO,
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

    const m = new Matrix4();
    const q = new Quaternion();
    const s = Math.max(1e-4, oc);
    this.indicesOc.forEach((i, k) => {
      const [x, y] = perfiles.pared[i]!;
      const [nx, ny] = perfiles.normales[i]!;
      const angulo = Math.atan2(ny, nx);
      q.setFromAxisAngle(EJE_Z, angulo);
      // La célula se posa sobre la pared, dentro del ligamento (hacia −normal).
      const cx = x - nx * OSTEOCLASTO.normal * s;
      const cy = y - ny * OSTEOCLASTO.normal * s;
      m.compose(
        new Vector3(cx, cy, CAPA.celulas),
        q,
        new Vector3(OSTEOCLASTO.normal * s, OSTEOCLASTO.pared * s, OSTEOCLASTO.fondo * s),
      );
      this.osteoclastos.setMatrixAt(k, m);
      for (let j = 0; j < NUCLEOS_POR_OSTEOCLASTO; j++) {
        const a = (j - 1) * 0.075 * s;
        const r = OSTEOCLASTO.nucleo * s;
        m.compose(
          new Vector3(cx - ny * a - nx * 0.01, cy + nx * a - ny * 0.01, CAPA.celulas + 0.06 * s),
          q,
          new Vector3(r, r, r),
        );
        this.nucleosOsteoclastos.setMatrixAt(k * NUCLEOS_POR_OSTEOCLASTO + j, m);
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
      q.setFromAxisAngle(EJE_Z, Math.atan2(ny, nx));
      const cx = x - nx * forma.normal * sb;
      const cy = y - ny * forma.normal * sb;
      m.compose(
        new Vector3(cx, cy, CAPA.celulas),
        q,
        new Vector3(forma.normal * sb, forma.pared * sb, forma.fondo * sb),
      );
      this.osteoblastos.setMatrixAt(k, m);
      const r = forma.nucleo * sb;
      m.compose(new Vector3(cx, cy, CAPA.celulas + forma.fondo * sb), q, new Vector3(r, r, r));
      this.nucleosOsteoblastos.setMatrixAt(k, m);
    });
    this.osteoblastos.instanceMatrix.needsUpdate = true;
    this.nucleosOsteoblastos.instanceMatrix.needsUpdate = true;
  }
}

/* -------------------------------------------------------------------------------------------
 * Fuerza ortodóntica: bracket y flecha
 * ----------------------------------------------------------------------------------------- */

/** Altura sobre la cresta a la que va el bracket (el tercio medio de la corona). */
const Y_BRACKET = Y_CRESTA + 0.55;

export class Fuerza extends Pieza {
  constructor() {
    super();
    this.grupo.name = 'fuerza_ortodontica';
    const bracket = material(HEX.bracket, { roughness: 0.35, metalness: 0.4 });
    const fuerza = material(HEX.fuerza, { roughness: 0.5 });
    this.materiales.push(bracket, fuerza);

    this.malla(new BoxGeometry(0.26, 0.24, 0.12), bracket, 'bracket');
    const vastago = new CylinderGeometry(0.05, 0.05, 0.8, 12);
    vastago.rotateZ(-Math.PI / 2);
    vastago.translate(0.5, 0, 0);
    this.malla(vastago, fuerza, 'vastago_flecha');
    const punta = new ConeGeometry(0.15, 0.34, 16);
    punta.rotateZ(-Math.PI / 2);
    punta.translate(1.05, 0, 0);
    this.malla(punta, fuerza, 'punta_flecha');
  }

  actualizar(estado: EstadoOrtodoncia): void {
    const visible = estado.fuerza > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    const [x, y] = puntoDiente([0, Y_BRACKET], estado);
    this.grupo.position.set(x, y, CAPA.fuerza);
    this.grupo.rotation.z = -poseDiente(estado).angulo;
    poner(this.materiales, estado.fuerza);
  }
}
