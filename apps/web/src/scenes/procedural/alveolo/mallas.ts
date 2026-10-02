/**
 * Las piezas de la escena del alvéolo tras la extracción, como objetos de three con `actualizar(estado)` y
 * `liberar()`:
 *
 *  - `Reborde`: la mitad del cuerpo mandibular que queda (x < 0): la cortical como una cinta extruida que se
 *    MORFA con la pérdida del reborde, la cara de la médula al fondo del hueco, las trabéculas instanciadas (las
 *    del antiguo alvéolo aparecen al cicatrizar; las que quedan fuera del hueso que se pierde se ocultan) y el
 *    foramen mentoniano sobre la cara vestibular.
 *  - `Encia`: dos cintas (vestibular y lingual) sobre la cresta que cierran el alvéolo y siguen al reborde.
 *  - `Diente`: la media corona, la cara de corte de la raíz y la pulpa; sube y se desvanece al extraerse.
 *  - `Alveolo`: el hueso alveolar propio y el ligamento (placas fijas), el fondo oscuro de la cavidad y los
 *    rellenos que se morfan (coágulo, granulación, hueso nuevo, tapa cortical), el sangrado, los vasos y los
 *    osteoclastos instanciados.
 *  - `Conducto`: el conducto mandibular cortado, sobre la cara de la médula, con el nervio, la arteria y la vena.
 *
 * No calculan nada de la biología: reciben `EstadoAlveolo` (puro) y escriben, mueven, aclaran o tiñen piezas.
 * La cara de corte está en x = 0 mirando a +X; las capas planas van a profundidades distintas (una centésima
 * entre capas) para no pelearse por el mismo píxel. Materiales compartidos por capa; al liberar se libera todo.
 */
import type { Material, BufferGeometry } from 'three';
import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from 'three';
import {
  DESPLAZAMIENTO_LAMINA,
  bandaAlrededorDeRaiz,
  perforacionesLamina,
  siluetaCorona,
  siluetaPulpa,
  siluetaRaiz,
} from '../alveolar/disposicion';
import { CONDUCTO, GROSOR_LIGAMENTO, LARGO_SEGMENTO, Z_ALVEOLO } from '../alveolar/estado';
import { mediaCorona, placa } from '../alveolar/geometria';
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
import { HEX } from './paleta';

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
  pulpa: 0.08,
  discos: 0.09,
  tapa: 0.09,
} as const;

/** Material estándar de doble cara (las placas se ven por ambos lados). */
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

/** Aplica una opacidad a un grupo de materiales (transparentes solo mientras hace falta). */
function poner(materiales: readonly Material[], opacidad: number): void {
  const o = Math.max(0, Math.min(1, opacidad));
  for (const m of materiales) {
    m.opacity = o;
    m.transparent = o < 0.995;
    m.depthWrite = o > 0.5;
  }
}

/** Disco plano que mira a +X (la cara de corte). */
function disco(radio: number, segmentos: number): CircleGeometry {
  const g = new CircleGeometry(radio, segmentos);
  g.rotateY(Math.PI / 2);
  return g;
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
    for (const m of this.materiales) m.dispose();
    for (const i of this.instanciados) i.dispose();
  }
}

const matriz = new Matrix4();
const cuaternion = new Quaternion();
const posicion = new Vector3();
const escala = new Vector3();

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

/* -------------------------------------------------------------------------------------------
 * Reborde: cortical, médula, trabéculas y foramen
 * ----------------------------------------------------------------------------------------- */

export class Reborde extends Pieza {
  private readonly cortical: BufferGeometry;
  private readonly medula: BufferGeometry;
  private readonly trabeculas: InstancedMesh;
  private readonly lista = trabeculasReborde();
  private readonly foramen = new Group();
  private ultimoReborde = -1;
  private ultimasTrabeculas = -1;

  constructor() {
    super();
    this.grupo.name = 'reborde';
    const matCorte = material(HEX.corteCortical, { roughness: 0.7 });
    const matCortical = material(HEX.cortical);
    const matMedula = material(HEX.medula, { roughness: 0.55 });
    const matTrabecula = material(HEX.trabecula, { roughness: 0.7 });
    const matForamen = material(HEX.foramen, { roughness: 0.9 });
    const matNervio = material(HEX.nervio, { roughness: 0.5 });
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

    // Trabéculas: barras instanciadas dentro del hueco.
    const barra = new CylinderGeometry(0.028, 0.028, 1, 5, 1, true);
    this.trabeculas = this.instancias(barra, matTrabecula, this.lista.length, 'trabeculas');

    // Foramen mentoniano: un óvalo oscuro sobre la cara vestibular con el nervio mentoniano asomando.
    this.foramen.name = 'foramen_mentoniano';
    const agujero = new CircleGeometry(FORAMEN.radio, 20);
    agujero.scale(1, 0.8, 1);
    this.malla(agujero, matForamen, 'foramen', this.foramen);
    const nervio = new CircleGeometry(FORAMEN.radio * 0.5, 14);
    nervio.scale(1, 0.8, 1);
    nervio.translate(0, 0, 0.004);
    this.malla(nervio, matNervio, 'nervio_mentoniano', this.foramen);
    this.grupo.add(this.foramen);
  }

  private escribirTrabeculas(reborde: number, aparicion: number): void {
    this.lista.forEach((t, i) => {
      let s = t.enAlveolo ? aparicion : 1;
      if (!dentroDelTrabecular(t.z, t.y, reborde, 0.1)) s = 0;
      const k = Math.max(1e-4, s);
      // El eje Y de la barra se gira sobre X hasta la dirección (0, sen a, cos a) del plano de corte.
      cuaternion.setFromAxisAngle(EJE_X, Math.PI / 2 - t.angulo);
      matriz.compose(posicion.set(t.x, t.y, t.z), cuaternion, escala.set(k, t.largo * k, k));
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
    const mat = material(HEX.encia, { roughness: 0.5 });
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
      escribirCinta(this.cintas[lado], c.exterior, c.interior, MITAD);
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
    const esmalte = material(HEX.esmalte, { roughness: 0.35 });
    const dentina = material(HEX.dentina, { roughness: 0.6 });
    const pulpa = material(HEX.pulpa, { roughness: 0.5 });
    this.materiales.push(esmalte, dentina, pulpa);
    this.malla(mediaCorona(-1), esmalte, 'corona');
    this.malla(placa(siluetaCorona(), [], CAPA.diente), esmalte, 'corte_corona');
    this.malla(placa(siluetaRaiz(0), [], CAPA.diente), dentina, 'corte_raiz');
    this.malla(placa(siluetaPulpa(), [], CAPA.pulpa), pulpa, 'pulpa');
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
  material: MeshStandardMaterial;
}

export class Alveolo extends Pieza {
  private readonly matLamina: MeshStandardMaterial;
  private readonly matLigamento: MeshStandardMaterial;
  private readonly cavidad: Relleno;
  private readonly coagulo: Relleno;
  private readonly granulacion: Relleno;
  private readonly huesoNuevo: Relleno;
  private readonly tapa: Relleno;
  private readonly sangrado: InstancedMesh;
  private readonly vasos: InstancedMesh;
  private readonly osteoclastos: InstancedMesh;
  private readonly puntosSangrado = puntosSangrado();
  private readonly puntosVasos = puntosVasos();
  private readonly puntosLamina = perforacionesLamina();
  private readonly colorEntretejido = new Color(HEX.huesoEntretejido);
  private readonly colorLaminar = new Color(HEX.huesoLaminar);

  constructor() {
    super();
    this.grupo.name = 'alveolo';
    this.matLamina = material(HEX.laminaCribiforme, { roughness: 0.65 });
    this.matLigamento = material(HEX.ligamento, { roughness: 0.75 });
    this.materiales.push(this.matLamina, this.matLigamento);

    // Hueso alveolar propio (fasciculado) y ligamento periodontal: dos bandas fijas alrededor de la raíz.
    this.malla(
      placa(bandaAlrededorDeRaiz(GROSOR_LIGAMENTO, DESPLAZAMIENTO_LAMINA), [], CAPA.lamina),
      this.matLamina,
      'hueso_alveolar_propio',
    );
    this.malla(
      placa(bandaAlrededorDeRaiz(0, GROSOR_LIGAMENTO), [], CAPA.ligamento),
      this.matLigamento,
      'ligamento_periodontal',
    );

    this.cavidad = this.relleno('cavidad', HEX.cavidad, { roughness: 0.95 });
    this.huesoNuevo = this.relleno('hueso_nuevo', HEX.huesoEntretejido, { roughness: 0.7 });
    this.granulacion = this.relleno('tejido_granulacion', HEX.granulacion, { roughness: 0.6 });
    this.coagulo = this.relleno('coagulo', HEX.coagulo, { roughness: 0.45 });
    this.tapa = this.relleno('tapa_cortical', HEX.corteCortical, { roughness: 0.7 });

    const matSangre = material(HEX.sangre, { roughness: 0.4 });
    const matVaso = material(HEX.vaso, { roughness: 0.4 });
    const matOsteoclasto = material(HEX.osteoclasto, { roughness: 0.5 });
    this.materiales.push(matSangre, matVaso, matOsteoclasto);
    this.sangrado = this.instancias(
      disco(0.05, 10),
      matSangre,
      this.puntosSangrado.length,
      'sangrado',
    );
    this.vasos = this.instancias(disco(0.055, 12), matVaso, this.puntosVasos.length, 'vasos');
    this.osteoclastos = this.instancias(
      new IcosahedronGeometry(0.085, 1),
      matOsteoclasto,
      this.puntosLamina.length + osteoclastosReborde(0, MITAD).length,
      'osteoclastos',
    );
  }

  private relleno(
    nombre: string,
    color: string,
    extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]>,
  ): Relleno {
    const mat = material(color, extra);
    this.materiales.push(mat);
    const geometria = abanico(PUNTOS_RELLENO);
    const malla = this.malla(geometria, mat, nombre);
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
      this.puntosLamina.forEach(([z, y], i) => {
        instanciaPunto(this.osteoclastos, i, CAPA.discos, y, z, a * (z > Z_ALVEOLO ? 1.15 : 0.8));
      });
      const base = this.puntosLamina.length;
      osteoclastosReborde(estado.reborde, MITAD).forEach((p, i) => {
        instanciaPunto(this.osteoclastos, base + i, p.x, p.y, p.z, b);
      });
      this.osteoclastos.instanceMatrix.needsUpdate = true;
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
    const luz = material(HEX.conducto, { roughness: 0.8 });
    const borde = material(HEX.bordeConducto, { roughness: 0.6 });
    const nervio = material(HEX.nervio, { roughness: 0.5 });
    const arteria = material(HEX.arteria, { roughness: 0.4 });
    const vena = material(HEX.vena, { roughness: 0.4 });
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
