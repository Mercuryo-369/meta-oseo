/**
 * Las piezas de la escena del hueso alveolar, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `MitadMovil`: la mitad anterior del cuerpo (x > 0) con su media corona; se aparta y se desvanece al cortar.
 *  - `CuerpoSeccionado`: la mitad que queda (x < 0): la cortical como un cascarón extruido con el hueco del
 *    hueso trabecular, la cara de corte de las tablas, la cara de la médula al fondo del hueco y las trabéculas
 *    instanciadas entre ambas.
 *  - `Alveolo`: la media corona fija con la cara de corte del diente (esmalte, dentina, cemento y pulpa), el
 *    hueso alveolar propio con sus perforaciones y el ligamento periodontal con sus fibras.
 *  - `ConductoMandibular`: el túnel bajo el ápice con el nervio, la arteria y la vena alveolares inferiores.
 *
 * No calculan nada de la anatomía: reciben `EstadoAlveolar` (puro) y solo mueven, aclaran o destacan piezas.
 * La cara de corte está en x = 0 mirando a +X; las capas planas van a profundidades distintas (unas centésimas)
 * para no pelearse por el mismo píxel. Materiales compartidos por capa; al liberar se libera todo lo creado.
 *
 * Realismo (2026-10-14): materiales físicos por tejido (`realismo.ts`, con relieve de superficie hecho por
 * código) y la paleta natural (`NATURAL` de `paleta.ts`, aquí `COLOR`).
 *
 * Revisión de diseño (2026-10-17): las capas de la cara de corte miran a +X de verdad (`placa`, render-02); el
 * esmalte lleva un degradado por vértice y un brillo satinado (realismo-10); la cresta queda 0,2 unidades por debajo
 * del cuello y la raíz cervical se dibuja en relieve entre ambos (fidelidad-02); el cemento es tejido `dentina`, sin
 * los poros vasculares del hueso (fidelidad-13). Las capas interiores del corte (ligamento, raíz, cemento, pulpa,
 * perforaciones) no proyectan sombra (`userData.sinSombra`): son un dibujo plano sobre las de detrás y su sombra solo
 * dejaría un reborde oscuro desplazado.
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
  MeshPhysicalMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  DESPLAZAMIENTO_LAMINA,
  bandaAlrededorDeRaiz,
  bandaCemento,
  fibrasLigamento,
  perfilCuerpo,
  perforacionesLamina,
  regionTrabecular,
  siluetaCorona,
  siluetaDentina,
  siluetaPulpa,
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
import { DOS_PI, bloque, mediaCorona, mediaRaizCervical, pintarUniforme, placa } from './geometria';
import { NATURAL as COLOR } from './paleta';
import type { TipoTejido } from '../realismo';
import { liberarMaterialOrganico, materialOrganico, ponerOpacidad } from '../realismo';

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
  dentina: 0.06,
  cemento: 0.064,
  pulpa: 0.07,
} as const;

/**
 * Repeticiones del relieve de superficie por unidad de escena en las piezas con UV en unidades (placas y
 * bloques, ver `geometria.ts`): las primitivas de three traen UV de 0 a 1 y para ellas vale la repetición de
 * `realismo.ts`; con UV en unidades, el grano saldría seis o diez veces más fino y el relieve, más duro.
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
 * Material con un emisivo apagado que se enciende por fase (`resaltar`). El color del resalte es una versión más
 * viva del propio color de la estructura (`COLOR.resalte*`), no un amarillo común: sobre la médula un destello
 * amarillo borraría las trabéculas.
 */
function resaltable(color: string, tipo: TipoTejido, emisivo: string): MeshPhysicalMaterial {
  return material(color, tipo, { emissive: emisivo, emissiveIntensity: 0 });
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

/**
 * Esmalte de la corona: el color va por vértice (el degradado de `mediaCorona` y el blanco uniforme de la cara de
 * corte), así que el material es blanco. Liso y satinado (`realismo.ts`).
 */
function esmalte(): MeshPhysicalMaterial {
  return material('#ffffff', 'esmalte', { vertexColors: true });
}

/** Cemento radicular: liso y mate, sin los poros vasculares del hueso (el cemento es avascular). */
function cemento(): MeshPhysicalMaterial {
  return relieve(material(COLOR.cemento, 'dentina'), RELIEVE.dentina);
}

/** Marca una malla para que no proyecte sombra (`EntornoRealista`): capas planas interiores del corte. */
function sinSombra(m: Mesh): Mesh {
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

/** Aplica una opacidad a un grupo de materiales (transparentes solo mientras hace falta). */
function poner(materiales: readonly Material[], opacidad: number): void {
  ponerOpacidad(materiales, opacidad);
}

/** Enciende el resalte de unos materiales (0 apagado, 1 pleno). */
function resaltar(materiales: readonly MeshPhysicalMaterial[], k: number, maximo = 0.55): void {
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

/** Une geometrías con los mismos atributos en una (una sola llamada de dibujo) y libera las partes. */
function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías del diente.');
  return unida;
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
    liberarMateriales(this.materiales);
    for (const i of this.instanciados) i.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Mitad anterior (se aparta)
 * ----------------------------------------------------------------------------------------- */

export class MitadMovil extends Pieza {
  constructor() {
    super();
    this.grupo.name = 'mitad_anterior';
    const cortical = relieve(material(COLOR.cortical, 'hueso'), RELIEVE.hueso);
    const matEsmalte = esmalte();
    const matCemento = cemento();
    this.materiales.push(cortical, matEsmalte, matCemento);

    // El bloque se extruye hacia −X; se corre media longitud para que ocupe x de 0 a +MITAD.
    const cuerpo = bloque(perfilCuerpo(), [], MITAD);
    cuerpo.translate(MITAD, 0, 0);
    this.malla(cuerpo, cortical, 'cuerpo_mitad_anterior');
    this.malla(mediaCorona(1), matEsmalte, 'corona_mitad_anterior');
    // La raíz entre la cresta y el cuello (cubierta de cemento): la corona no flota sobre el hueso.
    this.malla(mediaRaizCervical(1), matCemento, 'raiz_mitad_anterior');
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
  private readonly matCortical: MeshPhysicalMaterial;
  private readonly matCorte: MeshPhysicalMaterial;
  private readonly matMedula: MeshPhysicalMaterial;
  private readonly matTrabecula: MeshPhysicalMaterial;

  constructor() {
    super();
    this.grupo.name = 'cuerpo_seccionado';
    // Superficie del hueso y cara de corte del hueso compacto (más clara y densa), mates y porosas; médula
    // grasa y húmeda; trabéculas de hueso esponjoso.
    this.matCortical = relieve(
      resaltable(COLOR.cortical, 'hueso', COLOR.resalteCortical),
      RELIEVE.hueso,
    );
    this.matCorte = relieve(
      resaltable(COLOR.corteCortical, 'hueso', COLOR.resalteCortical),
      RELIEVE.hueso,
    );
    this.matMedula = relieve(
      resaltable(COLOR.medula, 'medula', COLOR.resalteMedula),
      RELIEVE.medula,
    );
    this.matTrabecula = resaltable(COLOR.trabecula, 'hueso_esponjoso', COLOR.resalteTrabecula);
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

    // Trabéculas: barras instanciadas dentro del hueco, de seis caras, abiertas por los extremos (quedan dentro
    // de la red o de la médula) y algo más finas por un extremo.
    const lista = trabeculasAlveolares();
    const geo = new CylinderGeometry(RADIO_TRABECULA * 0.84, RADIO_TRABECULA, 1, 6, 1, true);
    this.geometrias.push(geo);
    const barras = new InstancedMesh(geo, this.matTrabecula, lista.length);
    barras.name = 'trabeculas';
    const m = new Matrix4();
    const q = new Quaternion();
    lista.forEach((t, i) => {
      // El eje Y de la barra se gira sobre X hasta la dirección (0, sen a, cos a) del plano de corte.
      q.setFromAxisAngle(EJE_X, Math.PI / 2 - t.angulo);
      // Grosor algo distinto en cada trabécula (determinista): una red real no es de barras iguales. Sin
      // asomar por delante de la cara de corte (x = 0).
      const variado = 0.75 + 0.6 * Math.abs(Math.sin(i * 12.9898 + t.z * 78.233));
      const grosor = Math.min(variado, (-t.x - 0.004) / RADIO_TRABECULA);
      m.compose(new Vector3(t.x, t.y, t.z), q, new Vector3(grosor, t.largo, grosor));
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
  private readonly matLamina: MeshPhysicalMaterial;
  private readonly matLigamento: MeshPhysicalMaterial;
  private readonly matPerforacion: MeshPhysicalMaterial;
  private readonly matFibras: LineBasicMaterial;
  private readonly perforaciones: InstancedMesh;
  private readonly centrosPerforaciones: Punto2[];
  private ultimaEscala = -1;

  constructor() {
    super();
    this.grupo.name = 'alveolo';
    // Esmalte liso y satinado (color por vértice); dentina lisa; cemento liso y mate; pulpa blanda y húmeda.
    const matEsmalte = esmalte();
    const dentina = relieve(material(COLOR.dentina, 'dentina'), RELIEVE.dentina);
    const matCemento = cemento();
    const pulpa = relieve(material(COLOR.pulpa, 'encia'), RELIEVE.blando);
    // Hueso alveolar propio: hueso denso. Ligamento: tejido fibroso, con las vetas del relieve atravesando la
    // banda (giradas un cuarto de vuelta), como sus fibras principales.
    this.matLamina = relieve(
      resaltable(COLOR.laminaCribiforme, 'hueso', COLOR.resalteLamina),
      RELIEVE.hueso,
    );
    this.matLigamento = relieve(
      resaltable(COLOR.ligamento, 'membrana', COLOR.resalteLigamento),
      RELIEVE.membrana,
      RELIEVE.membrana,
      Math.PI / 2,
    );
    this.matPerforacion = resaltable(COLOR.perforacion, 'cavidad', COLOR.perforacion);
    this.materiales.push(
      matEsmalte,
      dentina,
      matCemento,
      pulpa,
      this.matLamina,
      this.matLigamento,
      this.matPerforacion,
    );

    // Diente: la media corona en relieve y la cara de corte del esmalte en una sola malla; encima, la dentina
    // (corona y raíz), el cemento que reviste la raíz (con la raíz cervical en relieve, entre la cresta y el
    // cuello, en la misma malla) y la pulpa, cuyo conducto llega al foramen apical.
    const caraEsmalte = pintarUniforme(placa(siluetaCorona(), [], CAPA.diente), COLOR.esmalte);
    this.malla(unir([mediaCorona(-1), caraEsmalte]), matEsmalte, 'corona');
    sinSombra(this.malla(placa(siluetaDentina(), [], CAPA.dentina), dentina, 'corte_raiz'));
    this.malla(
      unir([placa(bandaCemento(), [], CAPA.cemento), mediaRaizCervical(-1)]),
      matCemento,
      'cemento',
    );
    sinSombra(this.malla(placa(siluetaPulpa(), [], CAPA.pulpa), pulpa, 'pulpa'));

    // Hueso alveolar propio (lámina cribiforme) y ligamento periodontal: dos bandas alrededor de la raíz.
    this.malla(
      placa(bandaAlrededorDeRaiz(GROSOR_LIGAMENTO, DESPLAZAMIENTO_LAMINA), [], CAPA.lamina),
      this.matLamina,
      'hueso_alveolar_propio',
    );
    sinSombra(
      this.malla(
        placa(bandaAlrededorDeRaiz(0, GROSOR_LIGAMENTO), [], CAPA.ligamento),
        this.matLigamento,
        'ligamento_periodontal',
      ),
    );

    // Perforaciones de la lámina: discos pequeños instanciados que crecen con su fase, mirando a +X.
    this.centrosPerforaciones = perforacionesLamina();
    const geoDisco = new CircleGeometry(0.03, 12);
    geoDisco.rotateY(Math.PI / 2);
    this.geometrias.push(geoDisco);
    this.perforaciones = new InstancedMesh(
      geoDisco,
      this.matPerforacion,
      this.centrosPerforaciones.length,
    );
    this.perforaciones.name = 'perforaciones';
    this.perforaciones.frustumCulled = false;
    this.perforaciones.userData.sinSombra = true;
    this.instanciados.push(this.perforaciones);
    this.grupo.add(this.perforaciones);

    // Fibras del ligamento: segmentos oblicuos del hueso al cemento, blanquecinas como el colágeno.
    const puntos: number[] = [];
    for (const [a, b] of fibrasLigamento()) {
      puntos.push(CAPA.fibras, a[1], a[0], CAPA.fibras, b[1], b[0]);
    }
    const geoFibras = new BufferGeometry();
    geoFibras.setAttribute('position', new Float32BufferAttribute(puntos, 3));
    this.geometrias.push(geoFibras);
    this.matFibras = new LineBasicMaterial({ color: COLOR.fibra, transparent: true, opacity: 0 });
    this.materiales.push(this.matFibras);
    const fibras = new LineSegments(geoFibras, this.matFibras);
    fibras.name = 'fibras_ligamento';
    fibras.frustumCulled = false;
    this.grupo.add(fibras);

    this.ponerPerforaciones(0);
  }

  /** Objetos reutilizables para escribir las instancias (sin crear nada en cada fotograma, rendimiento-15). */
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly pos = new Vector3();
  private readonly esc = new Vector3();

  private ponerPerforaciones(escala: number): void {
    if (Math.abs(escala - this.ultimaEscala) < 1e-4) return;
    this.ultimaEscala = escala;
    const s = Math.max(1e-4, escala);
    this.centrosPerforaciones.forEach(([z, y], i) => {
      this.m.compose(this.pos.set(CAPA.perforaciones, y, z), this.q, this.esc.set(1, s, s));
      this.perforaciones.setMatrixAt(i, this.m);
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
  private readonly matBorde: MeshPhysicalMaterial;
  private readonly matNervio: MeshPhysicalMaterial;
  private readonly matVasos: MeshPhysicalMaterial[];

  constructor() {
    super();
    this.grupo.name = 'conducto_mandibular';
    // Pared y borde del conducto: hueso (el borde, la línea densa que lo rodea en la radiografía). Nervio con
    // sus fascículos a lo largo; vasos lisos y húmedos.
    const pared = relieve(material(COLOR.conducto, 'hueso'), 2, 4);
    this.matBorde = resaltable(COLOR.bordeConducto, 'hueso', COLOR.resalteConducto);
    this.matNervio = resaltable(COLOR.nervio, 'nervio', COLOR.nervio);
    const arteria = resaltable(COLOR.arteria, 'vaso', COLOR.arteria);
    const vena = resaltable(COLOR.vena, 'vaso', COLOR.vena);
    this.matVasos = [arteria, vena];
    this.materiales.push(pared, this.matBorde, this.matNervio, arteria, vena);

    // El túnel: un cilindro abierto a lo largo de X desde la cara de la médula hasta el extremo lejano.
    const largoTunel = MITAD - PROFUNDIDAD_TRABECULAR;
    const tunel = new CylinderGeometry(CONDUCTO.radio, CONDUCTO.radio, largoTunel, 28, 1, true);
    this.aLoLargo(tunel, -PROFUNDIDAD_TRABECULAR - largoTunel / 2, CONDUCTO.y, CONDUCTO.z);
    this.malla(tunel, pared, 'tunel');

    // Borde del conducto sobre la cara de la médula (la línea densa que rodea el conducto en la radiografía).
    const borde = new RingGeometry(CONDUCTO.radio, CONDUCTO.radio + 0.045, 36);
    borde.rotateY(Math.PI / 2);
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
