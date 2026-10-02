/**
 * Las dos partes de la escena de la fractura, como objetos de three con `actualizar(estado, abierta)` y
 * `liberar()`:
 *
 *  - `HuesoFracturado`: los dos fragmentos de la diáfisis (cortical con sus extremos necróticos, médula y
 *    periostio roto), el distal ligeramente desplazado, y la médula central que recanaliza la brecha al final.
 *  - `Reparacion`: lo que llena y rodea la brecha con el tiempo: sangrado (vasos rotos y gotas), hematoma,
 *    células inflamatorias, células madre del periostio, vasos nuevos, el manguito del callo (parte central
 *    endocondral y partes periféricas intramembranosas) y los osteoblastos y osteoclastos que lo remodelan.
 *
 * Cada pieza maciza está partida en un CUERPO y una TAPA (la cuña `CUNA`); con la vista abierta la tapa se
 * oculta y el interior queda a la vista. Los tejidos blandos se cortan con una cuña un poco mayor
 * (`RETIRO_CUNA`), de modo que sus caras de corte quedan detrás de las del hueso y no compiten con ellas.
 *
 * No calculan nada de la biología: reciben `EstadoFractura` (puro) y solo colocan, escalan y colorean piezas.
 * Materiales compartidos por tejido; `InstancedMesh` para todo lo repetido (una instancia oculta tiene matriz
 * cero); al liberar se libera todo lo creado.
 */
import type { Material, BufferGeometry } from 'three';
import {
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { acotar, suave } from '../interpolacion';
import {
  celulasInflamatorias,
  celulasMadre,
  enCuna,
  gotasDeSangre,
  osteoblastosDelCallo,
  osteoclastosDelCallo,
  perfilSolido,
  puntoSobreCallo,
  radioCallo,
  radioHematoma,
  vasosNuevos,
  vasosRotos,
} from './disposicion';
import type { Celula, CelulaEnCallo, Gota, Punto3, Tramo } from './disposicion';
import {
  BRECHA,
  CALLO,
  DESPLAZAMIENTO,
  ESCALA_CALLO_OCULTO,
  HEMATOMA,
  LARGO_FRAGMENTO,
  LARGO_NECROSIS,
  PERIOSTIO,
  RETIRO_CUNA,
  RETIRO_MEDULA,
  RETIRO_PERIOSTIO,
  R_CORTICAL,
  R_MEDULAR,
} from './estado';
import type { EstadoFractura } from './estado';
import { anillo, arcoDeCuerpo, arcoDeCuna, esfera, fusiforme, tramo, unir } from './geometria';
import { HEX } from './paleta';

const EJE_Y = new Vector3(0, 1, 0);
const MATRIZ_CERO = new Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

/** Material estándar de doble cara (las caras de corte y los sólidos abiertos se ven por dentro). */
function material(
  color: string,
  extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {},
) {
  return new MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0,
    side: DoubleSide,
    ...extra,
  });
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

/** Oculta todas las instancias (matriz cero), para que el estado no dependa de lo dibujado antes. */
function vaciar(malla: InstancedMesh): void {
  for (let i = 0; i < malla.count; i++) malla.setMatrixAt(i, MATRIZ_CERO);
  malla.instanceMatrix.needsUpdate = true;
}

const auxPos = new Vector3();
const auxEsc = new Vector3();
const auxQ = new Quaternion();
const auxM = new Matrix4();
const auxDir = new Vector3();

/** Escribe en `malla` la instancia `i`: una esfera unitaria en `p` de radio `r` (oculta si `r` es ínfimo). */
function ponerEsfera(malla: InstancedMesh, i: number, p: Punto3, r: number): void {
  if (r < 0.002) {
    malla.setMatrixAt(i, MATRIZ_CERO);
    return;
  }
  auxPos.set(p[0], p[1], p[2]);
  auxEsc.setScalar(r);
  auxQ.identity();
  auxM.compose(auxPos, auxQ, auxEsc);
  malla.setMatrixAt(i, auxM);
}

/** Escribe en `malla` la instancia `i`: un tramo (cilindro unitario que crece en +Y) de `a` a `b`, de radio `r`. */
function ponerTramo(malla: InstancedMesh, i: number, a: Punto3, b: Punto3, r: number): void {
  auxDir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const largo = auxDir.length();
  if (largo < 1e-4 || r < 0.002) {
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

/** Presencia (0 a 1) de una célula con `retraso` cuando la presencia global es `p`: las últimas llegan más tarde. */
export function presenciaCon(p: number, retraso: number): number {
  const inicio = 0.6 * retraso;
  return suave(acotar((p - inicio) / (1 - inicio)));
}

/** Interfaz común de las dos partes. */
export interface PiezaFractura {
  readonly grupo: Group;
  /** `abierta`: la cuña está abierta (vistas `corte` y `detalle`): se ocultan las tapas y lo que caería en la cuña. */
  actualizar: (estado: EstadoFractura, abierta: boolean) => void;
  liberar: () => void;
}

/** Base con dos subgrupos (cuerpo y tapa) y la contabilidad de recursos. */
abstract class PiezaConTapa implements PiezaFractura {
  readonly grupo = new Group();
  protected readonly cuerpo = new Group();
  protected readonly tapa = new Group();
  protected readonly geometrias: BufferGeometry[] = [];
  protected readonly materiales: Material[] = [];
  protected readonly instanciados: InstancedMesh[] = [];

  constructor(nombre: string) {
    this.grupo.name = nombre;
    this.cuerpo.name = `${nombre}_cuerpo`;
    this.tapa.name = `${nombre}_tapa`;
    this.grupo.add(this.cuerpo, this.tapa);
  }

  /** Añade una pieza maciza partida en cuerpo y tapa (dos geometrías, un material). */
  protected partida(
    geoCuerpo: BufferGeometry,
    geoTapa: BufferGeometry,
    mat: Material,
    nombre: string,
    padreCuerpo: Group = this.cuerpo,
    padreTapa: Group = this.tapa,
  ): [Mesh, Mesh] {
    const a = new Mesh(geoCuerpo, mat);
    a.name = nombre;
    const b = new Mesh(geoTapa, mat);
    b.name = `${nombre}_tapa`;
    this.geometrias.push(geoCuerpo, geoTapa);
    padreCuerpo.add(a);
    padreTapa.add(b);
    return [a, b];
  }

  abstract actualizar(estado: EstadoFractura, abierta: boolean): void;

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    for (const i of this.instanciados) i.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Hueso fracturado
 * ----------------------------------------------------------------------------------------- */

/** Traslada una geometría al fragmento `signo` (proximal -1, distal +1) centrada en la altura `yCentro`. */
function alFragmento(g: BufferGeometry, signo: 1 | -1, yCentro: number): BufferGeometry {
  g.translate(signo === 1 ? DESPLAZAMIENTO : 0, signo * yCentro, 0);
  return g;
}

/** Un anillo con grosor repetido en los dos fragmentos, de largo `largo`, que empieza a `desde` del extremo. */
function anilloEnFragmentos(
  interior: number,
  exterior: number,
  desde: number,
  largo: number,
  theta0: number,
  arco: number,
): BufferGeometry {
  const yCentro = BRECHA / 2 + desde + largo / 2;
  return unir([
    alFragmento(anillo(interior, exterior, largo, theta0, arco), -1, yCentro),
    alFragmento(anillo(interior, exterior, largo, theta0, arco), 1, yCentro),
  ]);
}

export class HuesoFracturado extends PiezaConTapa {
  private readonly matNecrosis: MeshStandardMaterial;
  private readonly matPeriostio: MeshStandardMaterial;
  private readonly periostio: Mesh[];
  private readonly medulaCentral: Mesh[];
  private readonly colores = {
    cortical: new Color(HEX.cortical),
    necrotico: new Color(HEX.huesoNecrotico),
  };

  constructor() {
    super('hueso_fracturado');
    // Todo se construye con el eje del hueso en Y; se tumba para que quede a lo largo de X.
    this.grupo.rotation.z = -Math.PI / 2;

    const cuerpo = arcoDeCuerpo();
    const cuna = arcoDeCuna();
    const cortical = material(HEX.cortical);
    this.matNecrosis = material(HEX.cortical);
    const medula = material(HEX.medula, { roughness: 0.5 });
    this.matPeriostio = material(HEX.periostio, { roughness: 0.85, transparent: true });
    this.materiales.push(cortical, this.matNecrosis, medula, this.matPeriostio);

    const par = (
      interior: number,
      exterior: number,
      desde: number,
      largo: number,
      mat: Material,
      nombre: string,
    ): [Mesh, Mesh] =>
      this.partida(
        anilloEnFragmentos(interior, exterior, desde, largo, cuerpo.theta0, cuerpo.arco),
        anilloEnFragmentos(interior, exterior, desde, largo, cuna.theta0, cuna.arco),
        mat,
        nombre,
      );

    // Cortical: el tramo sano y, pegado a la fractura, el tramo que muere por falta de riego.
    par(
      R_MEDULAR,
      R_CORTICAL,
      LARGO_NECROSIS,
      LARGO_FRAGMENTO - LARGO_NECROSIS,
      cortical,
      'cortical',
    );
    par(R_MEDULAR, R_CORTICAL, 0, LARGO_NECROSIS, this.matNecrosis, 'hueso_necrotico');
    // Médula amarilla, retirada del extremo (ahí habrá sangre, hematoma y callo interno).
    par(
      0,
      R_MEDULAR - 0.012,
      RETIRO_MEDULA,
      LARGO_FRAGMENTO - RETIRO_MEDULA,
      medula,
      'medula_osea',
    );
    // Periostio roto: no llega al extremo.
    this.periostio = par(
      PERIOSTIO.interior,
      PERIOSTIO.exterior,
      RETIRO_PERIOSTIO,
      LARGO_FRAGMENTO - RETIRO_PERIOSTIO,
      this.matPeriostio,
      'periostio',
    );

    // Médula central: recanaliza la brecha al remodelarse (crece a lo largo desde el centro).
    const largoCentral = BRECHA + 2 * RETIRO_MEDULA + 0.02;
    this.medulaCentral = this.partida(
      anillo(0, R_MEDULAR - 0.02, largoCentral, cuerpo.theta0, cuerpo.arco),
      anillo(0, R_MEDULAR - 0.02, largoCentral, cuna.theta0, cuna.arco),
      medula,
      'medula_central',
    );
  }

  actualizar(estado: EstadoFractura, abierta: boolean): void {
    this.tapa.visible = !abierta;
    // El hueso de los bordes se oscurece al morir y recupera el color al ser sustituido.
    this.matNecrosis.color
      .copy(this.colores.cortical)
      .lerp(this.colores.necrotico, estado.necrosis);
    // El periostio se engruesa (y se vuelve más denso) con la respuesta perióstica.
    const engrosado = 1 + 0.06 * estado.periostio;
    for (const m of this.periostio) m.scale.set(engrosado, 1, engrosado);
    this.matPeriostio.opacity = 0.7 + 0.3 * estado.periostio;
    // Médula central.
    const medula = suave(estado.medula);
    for (const m of this.medulaCentral) {
      m.visible = medula > 0.004;
      m.scale.set(1, Math.max(0.001, medula), 1);
    }
  }
}

/* -------------------------------------------------------------------------------------------
 * Reparación: hematoma, células, vasos y callo
 * ----------------------------------------------------------------------------------------- */

export class Reparacion extends PiezaConTapa {
  private readonly hematoma: Group;
  private readonly matHematoma: MeshStandardMaterial;
  private readonly callo: Group;
  private readonly matCalloCentro: MeshStandardMaterial;
  private readonly matCalloPeriferia: MeshStandardMaterial;
  private readonly vasosRotos: InstancedMesh;
  private readonly gotas: InstancedMesh;
  private readonly neutrofilos: InstancedMesh;
  private readonly macrofagos: InstancedMesh;
  private readonly celulasMadre: InstancedMesh;
  private readonly vasosNuevos: InstancedMesh;
  private readonly osteoclastos: InstancedMesh;
  private readonly osteoblastos: InstancedMesh;
  private readonly datos = {
    vasosRotos: vasosRotos(),
    gotas: gotasDeSangre(),
    ...celulasInflamatorias(),
    celulasMadre: celulasMadre(),
    vasosNuevos: vasosNuevos(),
    osteoclastos: osteoclastosDelCallo(),
    osteoblastos: osteoblastosDelCallo(),
  };
  private readonly colores = {
    coagulo: new Color(HEX.coagulo),
    granulacion: new Color(HEX.granulacion),
    fibroso: new Color(HEX.fibroso),
    cartilago: new Color(HEX.cartilago),
    calcificado: new Color(HEX.cartilagoCalcificado),
    huesoNuevo: new Color(HEX.huesoNuevo),
    cortical: new Color(HEX.cortical),
  };

  constructor() {
    super('reparacion');
    this.grupo.rotation.z = -Math.PI / 2;

    // Hematoma: fusiforme sólido centrado en la brecha, cortado con la cuña más retirada.
    const cuerpoH = arcoDeCuerpo(RETIRO_CUNA.hematoma);
    const cunaH = arcoDeCuna(RETIRO_CUNA.hematoma);
    this.matHematoma = material(HEX.coagulo, { roughness: 0.55 });
    this.materiales.push(this.matHematoma);
    this.hematoma = new Group();
    this.hematoma.name = 'hematoma';
    const tapaHematoma = new Group();
    tapaHematoma.name = 'hematoma_tapa';
    const perfilH = perfilSolido(radioHematoma, -HEMATOMA.medioLargo, HEMATOMA.medioLargo, 20);
    this.partida(
      fusiforme(perfilH, cuerpoH.theta0, cuerpoH.arco),
      fusiforme(perfilH, cunaH.theta0, cunaH.arco),
      this.matHematoma,
      'coagulo',
      this.hematoma,
      tapaHematoma,
    );
    this.hematoma.add(tapaHematoma);
    this.cuerpo.add(this.hematoma);
    // La tapa del hematoma vive dentro de su grupo (para escalar con él): se oculta aparte.
    this.tapaHematoma = tapaHematoma;

    // Callo: manguito fusiforme en tres piezas (centro endocondral y dos periferias intramembranosas).
    const cuerpoC = arcoDeCuerpo(RETIRO_CUNA.callo);
    const cunaC = arcoDeCuna(RETIRO_CUNA.callo);
    this.matCalloCentro = material(HEX.cartilago, { roughness: 0.45 });
    this.matCalloPeriferia = material(HEX.fibroso, { roughness: 0.7 });
    this.materiales.push(this.matCalloCentro, this.matCalloPeriferia);
    this.callo = new Group();
    this.callo.name = 'callo';
    const tapaCallo = new Group();
    tapaCallo.name = 'callo_tapa';
    const c = CALLO.medioLargoCentro;
    const perfilCentro = perfilSolido(radioCallo, -c, c, 16);
    this.partida(
      fusiforme(perfilCentro, cuerpoC.theta0, cuerpoC.arco),
      fusiforme(perfilCentro, cunaC.theta0, cunaC.arco),
      this.matCalloCentro,
      'callo_central',
      this.callo,
      tapaCallo,
    );
    const perfiles = [
      perfilSolido(radioCallo, c + 0.01, CALLO.medioLargo, 14),
      perfilSolido(radioCallo, -CALLO.medioLargo, -c - 0.01, 14),
    ];
    this.partida(
      unir(perfiles.map((p) => fusiforme(p, cuerpoC.theta0, cuerpoC.arco))),
      unir(perfiles.map((p) => fusiforme(p, cunaC.theta0, cunaC.arco))),
      this.matCalloPeriferia,
      'callo_periferico',
      this.callo,
      tapaCallo,
    );
    this.callo.add(tapaCallo);
    this.cuerpo.add(this.callo);
    this.tapaCallo = tapaCallo;

    // Piezas repetidas.
    const geoTramo = tramo(6);
    const geoEsfera = esfera(8, 6);
    this.geometrias.push(geoTramo, geoEsfera);
    const matSangre = material(HEX.sangre, {
      roughness: 0.4,
      emissive: '#7a2a24',
      emissiveIntensity: 0.35,
    });
    const matNeutrofilo = material(HEX.neutrofilo, { roughness: 0.5 });
    const matMacrofago = material(HEX.macrofago, { roughness: 0.5 });
    const matCelulaMadre = material(HEX.celulaMadre, { roughness: 0.5 });
    const matOsteoclasto = material(HEX.osteoclasto, { roughness: 0.5 });
    const matOsteoblasto = material(HEX.osteoblasto, { roughness: 0.5 });
    this.materiales.push(
      matSangre,
      matNeutrofilo,
      matMacrofago,
      matCelulaMadre,
      matOsteoclasto,
      matOsteoblasto,
    );
    const d = this.datos;
    this.vasosRotos = instanciar(geoTramo, matSangre, d.vasosRotos.length, 'vasos_rotos');
    this.gotas = instanciar(geoEsfera, matSangre, d.gotas.length, 'gotas_de_sangre');
    this.neutrofilos = instanciar(geoEsfera, matNeutrofilo, d.neutrofilos.length, 'neutrofilos');
    this.macrofagos = instanciar(geoEsfera, matMacrofago, d.macrofagos.length, 'macrofagos');
    this.celulasMadre = instanciar(
      geoEsfera,
      matCelulaMadre,
      d.celulasMadre.length,
      'celulas_madre',
    );
    this.vasosNuevos = instanciar(geoTramo, matSangre, d.vasosNuevos.length, 'vasos_nuevos');
    this.osteoclastos = instanciar(
      geoEsfera,
      matOsteoclasto,
      d.osteoclastos.length,
      'osteoclastos',
    );
    this.osteoblastos = instanciar(
      geoEsfera,
      matOsteoblasto,
      d.osteoblastos.length,
      'osteoblastos',
    );
    this.instanciados.push(
      this.vasosRotos,
      this.gotas,
      this.neutrofilos,
      this.macrofagos,
      this.celulasMadre,
      this.vasosNuevos,
      this.osteoclastos,
      this.osteoblastos,
    );
    this.cuerpo.add(...this.instanciados);
  }

  private readonly tapaHematoma: Group;
  private readonly tapaCallo: Group;

  /** Coloca una lista de células (esferas) con presencia global `p`; con la cuña abierta oculta las del sector. */
  private ponerCelulas(
    malla: InstancedMesh,
    lista: readonly Celula[],
    p: number,
    abierta: boolean,
  ) {
    let alguna = false;
    lista.forEach((c, i) => {
      const k = abierta && enCuna(c.theta) ? 0 : presenciaCon(p, c.retraso);
      if (k > 0.004) alguna = true;
      ponerEsfera(malla, i, c.p, c.radio * k);
    });
    malla.visible = alguna;
    malla.instanceMatrix.needsUpdate = true;
  }

  /** Coloca células sobre la superficie del callo a su escala actual. */
  private ponerSobreCallo(
    malla: InstancedMesh,
    lista: readonly CelulaEnCallo[],
    p: number,
    escala: number,
    abierta: boolean,
  ) {
    let alguna = false;
    lista.forEach((c, i) => {
      const k = abierta && enCuna(c.theta) ? 0 : presenciaCon(p, c.retraso);
      if (k > 0.004) alguna = true;
      ponerEsfera(malla, i, puntoSobreCallo(c, escala), c.radio * k);
    });
    malla.visible = alguna;
    malla.instanceMatrix.needsUpdate = true;
  }

  /** Coloca tramos que crecen de `a` hacia `b` con el progreso `p`, de radio `r`. */
  private ponerTramos(
    malla: InstancedMesh,
    lista: readonly Tramo[],
    p: number,
    r: number,
    abierta: boolean,
  ) {
    malla.visible = p > 0.004;
    if (!malla.visible) {
      vaciar(malla);
      return;
    }
    lista.forEach((v, i) => {
      if (abierta && enCuna(v.theta)) {
        malla.setMatrixAt(i, MATRIZ_CERO);
        return;
      }
      const b: Punto3 = [
        v.a[0] + (v.b[0] - v.a[0]) * p,
        v.a[1] + (v.b[1] - v.a[1]) * p,
        v.a[2] + (v.b[2] - v.a[2]) * p,
      ];
      ponerTramo(malla, i, v.a, b, r * Math.min(1, p * 4));
    });
    malla.instanceMatrix.needsUpdate = true;
  }

  private ponerGotas(lista: readonly Gota[], p: number, abierta: boolean): void {
    this.gotas.visible = p > 0.004;
    if (!this.gotas.visible) {
      vaciar(this.gotas);
      return;
    }
    lista.forEach((g, i) => {
      const k = abierta && enCuna(g.theta) ? 0 : p;
      ponerEsfera(this.gotas, i, g.p, g.radio * k);
    });
    this.gotas.instanceMatrix.needsUpdate = true;
  }

  actualizar(estado: EstadoFractura, abierta: boolean): void {
    this.tapaHematoma.visible = !abierta;
    this.tapaCallo.visible = !abierta;

    // Sangrado.
    const sangrado = suave(estado.sangrado);
    this.ponerTramos(this.vasosRotos, this.datos.vasosRotos, sangrado, 0.03, abierta);
    this.ponerGotas(this.datos.gotas, sangrado, abierta);

    // Hematoma: crece, se organiza (cambia de color) y desaparece bajo el callo.
    const hematoma = suave(estado.hematoma);
    this.hematoma.visible = hematoma > 0.004;
    this.hematoma.scale.setScalar(Math.max(0.001, hematoma));
    this.matHematoma.color
      .copy(this.colores.coagulo)
      .lerp(this.colores.granulacion, suave(estado.granulacion));

    // Inflamación y células madre.
    this.ponerCelulas(this.neutrofilos, this.datos.neutrofilos, estado.inflamacion, abierta);
    this.ponerCelulas(this.macrofagos, this.datos.macrofagos, estado.inflamacion, abierta);
    this.ponerCelulas(this.celulasMadre, this.datos.celulasMadre, estado.celulasMadre, abierta);

    // Vasos nuevos.
    this.ponerTramos(
      this.vasosNuevos,
      this.datos.vasosNuevos,
      suave(estado.vasosNuevos),
      0.035,
      abierta,
    );

    // Callo: escala y colores de sus dos partes.
    const escala = estado.callo;
    this.callo.visible = escala >= ESCALA_CALLO_OCULTO;
    this.callo.scale.setScalar(escala);
    const laminar = suave(estado.laminar);
    this.matCalloCentro.color
      .copy(this.colores.cartilago)
      .lerp(this.colores.calcificado, suave(estado.calcificacion))
      .lerp(this.colores.huesoNuevo, suave(estado.huesoCentral))
      .lerp(this.colores.cortical, laminar);
    this.matCalloPeriferia.color
      .copy(this.colores.fibroso)
      .lerp(this.colores.huesoNuevo, suave(estado.huesoPeriferico))
      .lerp(this.colores.cortical, laminar);

    // Células sobre el callo.
    this.ponerSobreCallo(
      this.osteoblastos,
      this.datos.osteoblastos,
      estado.osteoblastos,
      escala,
      abierta,
    );
    this.ponerSobreCallo(
      this.osteoclastos,
      this.datos.osteoclastos,
      estado.osteoclastos,
      escala,
      abierta,
    );
  }
}

/** Radio del callo a escala `escala` en la altura `y` (para pruebas y encuadres). */
export function radioCalloEscalado(y: number, escala: number): number {
  return radioCallo(y / escala) * escala;
}
