/**
 * Las piezas de la escena del hueso alveolar, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `MitadMovil`: la mitad anterior del cuerpo (x > 0) con su media corona; se aparta y se desvanece al cortar.
 *  - `CuerpoSeccionado`: la mitad que queda (x < 0): la cortical como un cascarón extruido con el hueco del
 *    hueso trabecular, la cara de corte de las tablas, la cara de la médula al fondo del hueco y las trabéculas
 *    instanciadas entre ambas.
 *  - `Alveolo`: la media corona fija, la cara de corte del diente (esmalte, dentina, pulpa), el hueso alveolar
 *    propio con sus perforaciones y el ligamento periodontal con sus fibras.
 *  - `ConductoMandibular`: el túnel bajo el ápice con el nervio, la arteria y la vena alveolares inferiores.
 *
 * No calculan nada de la anatomía: reciben `EstadoAlveolar` (puro) y solo mueven, aclaran o destacan piezas.
 * La cara de corte está en x = 0 mirando a +X; las capas planas van a profundidades distintas (unas centésimas)
 * para no pelearse por el mismo píxel. Materiales compartidos por capa; al liberar se libera todo lo creado.
 */
import type { Material } from 'three';
import {
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
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
  fibrasLigamento,
  perfilCuerpo,
  perforacionesLamina,
  regionTrabecular,
  siluetaCorona,
  siluetaPulpa,
  siluetaRaiz,
  trabeculasAlveolares,
} from './disposicion';
import type { Punto2 } from './disposicion';
import {
  CONDUCTO,
  DESPLAZAMIENTO_MITAD,
  GROSOR_LIGAMENTO,
  LARGO_SEGMENTO,
  PROFUNDIDAD_TRABECULAR,
} from './estado';
import type { EstadoAlveolar } from './estado';
import { DOS_PI, bloque, mediaCorona, placa } from './geometria';
import { HEX } from './paleta';

const EJE_X = new Vector3(1, 0, 0);
const MITAD = LARGO_SEGMENTO / 2;

/** Profundidad (x) de cada capa plana de la cara de corte: de atrás hacia delante. */
const CAPA = {
  corteCortical: 0.01,
  lamina: 0.025,
  ligamento: 0.04,
  perforaciones: 0.04,
  diente: 0.055,
  fibras: 0.055,
  pulpa: 0.07,
} as const;

/**
 * Material estándar de doble cara con un emisivo apagado que se enciende por fase (`resaltar`). El color del
 * resalte es una versión más viva del propio color de la estructura (`HEX.resalte*`), no un amarillo común:
 * sobre la médula amarilla un destello amarillo borraría las trabéculas.
 */
function material(
  color: string,
  emisivo: string,
  extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {},
): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0,
    side: DoubleSide,
    emissive: emisivo,
    emissiveIntensity: 0,
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

/** Enciende el resalte de unos materiales (0 apagado, 1 pleno). */
function resaltar(materiales: readonly MeshStandardMaterial[], k: number, maximo = 0.55): void {
  for (const m of materiales) m.emissiveIntensity = maximo * Math.max(0, Math.min(1, k));
}

/** Polígono circular en el plano de corte. */
function circulo(z: number, y: number, radio: number, n = 36): Punto2[] {
  const puntos: Punto2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (DOS_PI * i) / n;
    puntos.push([z + radio * Math.cos(a), y + radio * Math.sin(a)]);
  }
  return puntos;
}

/** Interfaz común de las piezas. */
export interface PiezaAlveolar {
  readonly grupo: Group;
  actualizar: (estado: EstadoAlveolar) => void;
  liberar: () => void;
}

/** Base con el registro de recursos y la liberación común. */
abstract class Pieza implements PiezaAlveolar {
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
    this.geometrias.push(geometria);
    padre.add(m);
    return m;
  }

  abstract actualizar(estado: EstadoAlveolar): void;

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    for (const i of this.instanciados) i.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Mitad anterior (se aparta)
 * ----------------------------------------------------------------------------------------- */

export class MitadMovil extends Pieza {
  private readonly matCortical: MeshStandardMaterial;
  private readonly matEsmalte: MeshStandardMaterial;

  constructor() {
    super();
    this.grupo.name = 'mitad_anterior';
    this.matCortical = material(HEX.cortical, HEX.resalteCortical);
    this.matEsmalte = material(HEX.esmalte, HEX.esmalte, { roughness: 0.35 });
    this.materiales.push(this.matCortical, this.matEsmalte);

    // El bloque se extruye hacia −X; se corre media longitud para que ocupe x de 0 a +MITAD.
    const cuerpo = bloque(perfilCuerpo(), [], MITAD);
    cuerpo.translate(MITAD, 0, 0);
    this.malla(cuerpo, this.matCortical, 'cuerpo_mitad_anterior');
    this.malla(mediaCorona(1), this.matEsmalte, 'corona_mitad_anterior');
  }

  actualizar(estado: EstadoAlveolar): void {
    const visible = estado.mitad.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    this.grupo.position.x = estado.mitad.desplazamiento * DESPLAZAMIENTO_MITAD;
    poner(this.materiales, estado.mitad.opacidad);
  }
}

/* -------------------------------------------------------------------------------------------
 * Mitad que queda: cortical, cara de corte, médula y trabéculas
 * ----------------------------------------------------------------------------------------- */

export class CuerpoSeccionado extends Pieza {
  private readonly matCortical: MeshStandardMaterial;
  private readonly matCorte: MeshStandardMaterial;
  private readonly matMedula: MeshStandardMaterial;
  private readonly matTrabecula: MeshStandardMaterial;

  constructor() {
    super();
    this.grupo.name = 'cuerpo_seccionado';
    this.matCortical = material(HEX.cortical, HEX.resalteCortical);
    this.matCorte = material(HEX.corteCortical, HEX.resalteCortical, { roughness: 0.7 });
    this.matMedula = material(HEX.medula, HEX.resalteMedula, { roughness: 0.55 });
    this.matTrabecula = material(HEX.trabecula, HEX.resalteTrabecula, { roughness: 0.7 });
    this.materiales.push(this.matCortical, this.matCorte, this.matMedula, this.matTrabecula);

    const contorno = perfilCuerpo();
    const trabecular = regionTrabecular();
    const agujeroConducto = circulo(CONDUCTO.z, CONDUCTO.y, CONDUCTO.radio);

    // Cascarón cortical con el hueco del hueso trabecular como túnel; su tapa en x = 0 es la sección.
    this.malla(bloque(contorno, [trabecular], MITAD), this.matCortical, 'cortical');
    // Cara de corte de las tablas (un punto más clara que la superficie) sobre la tapa.
    this.malla(placa(contorno, [trabecular], CAPA.corteCortical), this.matCorte, 'corte_tablas');
    // Médula al fondo del hueco, con el agujero del conducto, y una placa que cierra el extremo lejano.
    this.malla(
      placa(trabecular, [agujeroConducto], -PROFUNDIDAD_TRABECULAR),
      this.matMedula,
      'medula',
    );
    this.malla(placa(trabecular, [], -MITAD + 0.01), this.matMedula, 'fondo_medula');

    // Trabéculas: barras instanciadas dentro del hueco.
    const lista = trabeculasAlveolares();
    const geo = new CylinderGeometry(0.028, 0.028, 1, 5, 1, true);
    this.geometrias.push(geo);
    const barras = new InstancedMesh(geo, this.matTrabecula, lista.length);
    barras.name = 'trabeculas';
    const m = new Matrix4();
    const q = new Quaternion();
    lista.forEach((t, i) => {
      // El eje Y de la barra se gira sobre X hasta la dirección (0, sen a, cos a) del plano de corte.
      q.setFromAxisAngle(EJE_X, Math.PI / 2 - t.angulo);
      m.compose(new Vector3(t.x, t.y, t.z), q, new Vector3(1, t.largo, 1));
      barras.setMatrixAt(i, m);
    });
    barras.instanceMatrix.needsUpdate = true;
    barras.frustumCulled = false;
    this.instanciados.push(barras);
    this.grupo.add(barras);
  }

  actualizar(estado: EstadoAlveolar): void {
    resaltar([this.matCorte], estado.resalte.tablas, 0.7);
    resaltar([this.matCortical], estado.resalte.tablas, 0.18);
    resaltar([this.matMedula], estado.resalte.trabecular, 0.12);
    resaltar([this.matTrabecula], estado.resalte.trabecular, 0.7);
  }
}

/* -------------------------------------------------------------------------------------------
 * Alvéolo: diente, hueso alveolar propio y ligamento periodontal
 * ----------------------------------------------------------------------------------------- */

export class Alveolo extends Pieza {
  private readonly matLamina: MeshStandardMaterial;
  private readonly matLigamento: MeshStandardMaterial;
  private readonly matPerforacion: MeshStandardMaterial;
  private readonly matFibras: LineBasicMaterial;
  private readonly perforaciones: InstancedMesh;
  private readonly centrosPerforaciones: Punto2[];
  private ultimaEscala = -1;

  constructor() {
    super();
    this.grupo.name = 'alveolo';
    const esmalte = material(HEX.esmalte, HEX.esmalte, { roughness: 0.35 });
    const dentina = material(HEX.dentina, HEX.dentina, { roughness: 0.6 });
    const pulpa = material(HEX.pulpa, HEX.pulpa, { roughness: 0.5 });
    this.matLamina = material(HEX.laminaCribiforme, HEX.resalteLamina, { roughness: 0.65 });
    this.matLigamento = material(HEX.ligamento, HEX.resalteLigamento, { roughness: 0.75 });
    this.matPerforacion = material(HEX.perforacion, HEX.perforacion, { roughness: 0.8 });
    this.materiales.push(
      esmalte,
      dentina,
      pulpa,
      this.matLamina,
      this.matLigamento,
      this.matPerforacion,
    );

    // Diente: media corona en relieve y su cara de corte plana (esmalte y dentina), con la pulpa encima.
    this.malla(mediaCorona(-1), esmalte, 'corona');
    this.malla(placa(siluetaCorona(), [], CAPA.diente), esmalte, 'corte_corona');
    this.malla(placa(siluetaRaiz(0), [], CAPA.diente), dentina, 'corte_raiz');
    this.malla(placa(siluetaPulpa(), [], CAPA.pulpa), pulpa, 'pulpa');

    // Hueso alveolar propio (lámina cribiforme) y ligamento periodontal: dos bandas alrededor de la raíz.
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

    // Perforaciones de la lámina: discos pequeños instanciados que crecen con su fase.
    this.centrosPerforaciones = perforacionesLamina();
    const geoDisco = new CircleGeometry(0.03, 10);
    geoDisco.rotateY(-Math.PI / 2);
    this.geometrias.push(geoDisco);
    this.perforaciones = new InstancedMesh(
      geoDisco,
      this.matPerforacion,
      this.centrosPerforaciones.length,
    );
    this.perforaciones.name = 'perforaciones';
    this.perforaciones.frustumCulled = false;
    this.instanciados.push(this.perforaciones);
    this.grupo.add(this.perforaciones);

    // Fibras del ligamento: segmentos oblicuos del hueso al cemento.
    const puntos: number[] = [];
    for (const [a, b] of fibrasLigamento()) {
      puntos.push(CAPA.fibras, a[1], a[0], CAPA.fibras, b[1], b[0]);
    }
    const geoFibras = new BufferGeometry();
    geoFibras.setAttribute('position', new Float32BufferAttribute(puntos, 3));
    this.geometrias.push(geoFibras);
    this.matFibras = new LineBasicMaterial({ color: HEX.fibra, transparent: true, opacity: 0 });
    this.materiales.push(this.matFibras);
    const fibras = new LineSegments(geoFibras, this.matFibras);
    fibras.name = 'fibras_ligamento';
    fibras.frustumCulled = false;
    this.grupo.add(fibras);

    this.ponerPerforaciones(0);
  }

  private ponerPerforaciones(escala: number): void {
    if (Math.abs(escala - this.ultimaEscala) < 1e-4) return;
    this.ultimaEscala = escala;
    const m = new Matrix4();
    const q = new Quaternion();
    const s = Math.max(1e-4, escala);
    this.centrosPerforaciones.forEach(([z, y], i) => {
      m.compose(new Vector3(CAPA.perforaciones, y, z), q, new Vector3(1, s, s));
      this.perforaciones.setMatrixAt(i, m);
    });
    this.perforaciones.instanceMatrix.needsUpdate = true;
  }

  actualizar(estado: EstadoAlveolar): void {
    resaltar([this.matLamina], estado.resalte.alveolar, 0.6);
    resaltar([this.matPerforacion], estado.resalte.alveolar, 0.2);
    resaltar([this.matLigamento], estado.resalte.ligamento, 0.6);
    this.perforaciones.visible = estado.perforaciones > 0.004;
    this.ponerPerforaciones(estado.perforaciones);
    this.matFibras.opacity = estado.fibras;
  }
}

/* -------------------------------------------------------------------------------------------
 * Conducto mandibular
 * ----------------------------------------------------------------------------------------- */

export class ConductoMandibular extends Pieza {
  private readonly matBorde: MeshStandardMaterial;
  private readonly matNervio: MeshStandardMaterial;
  private readonly matVasos: MeshStandardMaterial[];

  constructor() {
    super();
    this.grupo.name = 'conducto_mandibular';
    const pared = material(HEX.conducto, HEX.conducto, { roughness: 0.8 });
    this.matBorde = material(HEX.bordeConducto, HEX.resalteConducto, { roughness: 0.6 });
    this.matNervio = material(HEX.nervio, HEX.nervio, { roughness: 0.5 });
    const arteria = material(HEX.arteria, HEX.arteria, { roughness: 0.4 });
    const vena = material(HEX.vena, HEX.vena, { roughness: 0.4 });
    this.matVasos = [arteria, vena];
    this.materiales.push(pared, this.matBorde, this.matNervio, arteria, vena);

    // El túnel: un cilindro abierto a lo largo de X desde la cara de la médula hasta el extremo lejano.
    const largoTunel = MITAD - PROFUNDIDAD_TRABECULAR;
    const tunel = new CylinderGeometry(CONDUCTO.radio, CONDUCTO.radio, largoTunel, 28, 1, true);
    this.aLoLargo(tunel, -PROFUNDIDAD_TRABECULAR - largoTunel / 2, CONDUCTO.y, CONDUCTO.z);
    this.malla(tunel, pared, 'tunel');

    // Borde del conducto sobre la cara de la médula (la línea densa que rodea el conducto en la radiografía).
    const borde = new RingGeometry(CONDUCTO.radio, CONDUCTO.radio + 0.045, 36);
    borde.rotateY(-Math.PI / 2);
    borde.translate(-PROFUNDIDAD_TRABECULAR + 0.008, CONDUCTO.y, CONDUCTO.z);
    this.malla(borde, this.matBorde, 'borde_conducto');

    // Nervio, arteria y vena alveolares inferiores: cilindros con tapa que terminan algo dentro del túnel.
    const largoVasos = largoTunel - 0.1;
    const xCentro = -PROFUNDIDAD_TRABECULAR - 0.05 - largoVasos / 2;
    const r = CONDUCTO.radio;
    const nervio = new CylinderGeometry(r * 0.43, r * 0.43, largoVasos, 18);
    this.aLoLargo(nervio, xCentro, CONDUCTO.y - r * 0.05, CONDUCTO.z - r * 0.22);
    this.malla(nervio, this.matNervio, 'nervio_alveolar_inferior');
    const geoArteria = new CylinderGeometry(r * 0.24, r * 0.24, largoVasos, 14);
    this.aLoLargo(geoArteria, xCentro, CONDUCTO.y + r * 0.34, CONDUCTO.z + r * 0.48);
    this.malla(geoArteria, arteria, 'arteria_alveolar_inferior');
    const geoVena = new CylinderGeometry(r * 0.27, r * 0.27, largoVasos, 14);
    this.aLoLargo(geoVena, xCentro, CONDUCTO.y - r * 0.4, CONDUCTO.z + r * 0.46);
    this.malla(geoVena, vena, 'vena_alveolar_inferior');
  }

  /** Tumba un cilindro (eje Y) a lo largo de X y lo centra en (x, y, z). */
  private aLoLargo(g: BufferGeometry, x: number, y: number, z: number): void {
    g.rotateZ(-Math.PI / 2);
    g.translate(x, y, z);
  }

  actualizar(estado: EstadoAlveolar): void {
    resaltar([this.matBorde], estado.resalte.conducto, 0.8);
    resaltar([this.matNervio], estado.resalte.conducto, 0.45);
    resaltar(this.matVasos, estado.resalte.conducto, 0.3);
  }
}
