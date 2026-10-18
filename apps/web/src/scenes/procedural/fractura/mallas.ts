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
 *
 * Realismo (2026-10-14): cada material es el de su tejido (`realismo.ts`) con la paleta natural (`NATURAL`); los
 * bordes de la fractura y del periostio desgarrado son dentados; el hematoma y el callo, algo irregulares (no
 * husos perfectos); el callo cambia de acabado con su tejido (liso y húmedo de cartílago, mate de tejido fibroso,
 * poroso de hueso reticular, el de la cortical al final) y el hueso muerto se vuelve más mate; células de 12 × 8
 * (antes 8 × 6).
 *
 * Revisión de diseño (2026-10-17): relieve con la repetición POR UNIDAD (las formas traen UV en unidades); las
 * células se apoyan en la superficie que se dibuja del hematoma y del callo (sin el desplazamiento del fragmento
 * distal, con su irregularidad y su escala; las del callo, aplanadas contra él); el periostio es opaco mientras está
 * engrosado (una sola pasada); la sangre no emite luz; las instancias ocultas tienen escala 0 (no matriz nula).
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
  MeshPhysicalMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { acotar, suave } from '../interpolacion';
import type { TipoTejido } from '../realismo';
import { liberarMaterialOrganico, materialOrganico, ponerOpacidad } from '../realismo';
import {
  IRREGULAR,
  celulasInflamatorias,
  celulasMadre,
  enCuna,
  gotasDeSangre,
  normalSobreCallo,
  osteoblastosDelCallo,
  osteoclastosDelCallo,
  perfilSolido,
  puntoSobreCallo,
  puntoSobreHematoma,
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
import {
  abollar,
  anillo,
  arcoDeCuerpo,
  arcoDeCuna,
  esfera,
  fracturar,
  fusiforme,
  tramo,
  unir,
} from './geometria';
import { NATURAL as COLOR } from './paleta';

const EJE_Y = new Vector3(0, 1, 0);
/**
 * Matriz de una instancia oculta: escala 0 con la componente homogénea a 1 (con las 16 a 0, three divide entre 0
 * al calcular la esfera envolvente de la malla y la deja en NaN: sin orden de transparencias ni raycast).
 */
const MATRIZ_CERO = new Matrix4().makeScale(0, 0, 0);

/**
 * Material de un tejido (`realismo.ts`): físico, con relieve de superficie hecho por código y de doble cara (las
 * caras de corte y los sólidos abiertos se ven por dentro).
 */
function material(
  color: string,
  tipo: TipoTejido = 'hueso',
  extra: ConstructorParameters<typeof MeshPhysicalMaterial>[0] = {},
): MeshPhysicalMaterial {
  return materialOrganico(color, tipo, { side: DoubleSide, ...extra });
}

/**
 * Repetición del relieve POR UNIDAD de la geometría (las formas traen UV en unidades) y filtrado anisótropo (los
 * cantos y las paredes que se ven de lado no se emborronan). Devuelve el material.
 */
function relieve(m: MeshPhysicalMaterial, u: number, v = u): MeshPhysicalMaterial {
  if (m.bumpMap) {
    m.bumpMap.repeat.set(u, v);
    m.bumpMap.anisotropy = 4;
  }
  return m;
}

/** Repetición del relieve por unidad de cada tejido (la de la escena del hueso; el callo y el coágulo, 1,5). */
const REPETIR = { hueso: 1.4, medula: 1.2, membrana: 0.6, blando: 1.5 } as const;

/** Libera materiales: los orgánicos con su clon de textura de relieve. */
function liberarMateriales(lista: readonly Material[]): void {
  for (const m of lista) {
    if (m instanceof MeshPhysicalMaterial) liberarMaterialOrganico(m);
    else m.dispose();
  }
}

/**
 * Acabado de superficie (rugosidad, barniz húmedo y relieve) de los tejidos por los que pasa una parte del callo,
 * con los números de `realismo.ts`. Cada parte del callo es UNA malla cuyo tejido cambia con el tiempo
 * (cartílago o tejido fibroso → hueso reticular → hueso laminar): además del color se mezcla el acabado. El
 * barniz nunca llega a 0 (pasar de 0 a más obligaría a recompilar el sombreador).
 */
interface Acabado {
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  relieve: number;
}

const ACABADO = {
  /** Fibrocartílago del callo blando: liso, húmedo y algo brillante. */
  cartilago: { roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25, relieve: 0.15 },
  /** Cartílago calcificado: más mate y granuloso. */
  calcificado: { roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.5, relieve: 0.6 },
  /** Tejido fibroso del callo periférico: mate, apenas húmedo. */
  fibroso: { roughness: 0.7, clearcoat: 0.1, clearcoatRoughness: 0.5, relieve: 0.5 },
  /** Hueso reticular (callo duro): poroso y vascular. */
  reticular: { roughness: 0.72, clearcoat: 0.12, clearcoatRoughness: 0.6, relieve: 1.3 },
  /** Hueso laminar: el de la cortical. */
  laminar: { roughness: 0.78, clearcoat: 0.08, clearcoatRoughness: 0.7, relieve: 0.9 },
} as const satisfies Record<string, Acabado>;

/**
 * Aplica a `m` el acabado que resulta de partir de `desde` y mezclarlo, en orden, con cada `[acabado, k]` (como
 * los colores del callo). Determinista: solo depende de los `k` del estado.
 */
function aplicarAcabado(
  m: MeshPhysicalMaterial,
  desde: Acabado,
  tramos: readonly (readonly [Acabado, number])[],
): void {
  let { roughness, clearcoat, clearcoatRoughness, relieve } = desde;
  for (const [hasta, k] of tramos) {
    roughness += (hasta.roughness - roughness) * k;
    clearcoat += (hasta.clearcoat - clearcoat) * k;
    clearcoatRoughness += (hasta.clearcoatRoughness - clearcoatRoughness) * k;
    relieve += (hasta.relieve - relieve) * k;
  }
  m.roughness = roughness;
  m.clearcoat = clearcoat;
  m.clearcoatRoughness = clearcoatRoughness;
  m.bumpScale = relieve;
}

/** Borde roto de un anillo (ver `fracturar`): amplitud del dentado y su dibujo. */
interface BordeRoto {
  amplitud: number;
  fase: number;
}

/** Superficie de fractura de la cortical (el tramo necrótico) y borde desgarrado del periostio. */
const BORDE_FRACTURA: BordeRoto = { amplitud: 0.06, fase: 0 };
const BORDE_PERIOSTIO: BordeRoto = { amplitud: 0.1, fase: 1.3 };

/**
 * Los vasos rotos nacen en el plano de fractura (o en el extremo del periostio) de `disposicion.ts`; con el borde
 * dentado, ese plano puede quedar delante o detrás de la superficie real. Se alargan hacia dentro del fragmento
 * lo que el dentado puede hundirse: así siempre salen del hueso (o de debajo del periostio) y nunca flotan
 * delante de un diente del borde. El tramo nuevo queda dentro del hueso, oculto.
 */
function hundirEnFragmento(v: Tramo): Tramo {
  const signo = v.a[1] < 0 ? -1 : 1;
  const delPeriostio = Math.abs(v.a[1]) > BRECHA / 2 + 1e-6;
  const fondo = delPeriostio ? BORDE_PERIOSTIO.amplitud : BORDE_FRACTURA.amplitud;
  return { ...v, a: [v.a[0], v.a[1] + signo * fondo, v.a[2]] };
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

/**
 * Escribe en `malla` la instancia `i`: una esfera unitaria en `p` de radio `r` aplanada a lo largo de la normal `n`
 * de la superficie en la que se apoya (1,15 r de ancho y 0,6 r de grosor), como una célula adherida.
 */
function ponerAplanada(malla: InstancedMesh, i: number, p: Punto3, n: Punto3, r: number): void {
  if (r < 0.002) {
    malla.setMatrixAt(i, MATRIZ_CERO);
    return;
  }
  auxPos.set(p[0], p[1], p[2]);
  auxDir.set(n[0], n[1], n[2]);
  auxQ.setFromUnitVectors(EJE_Y, auxDir);
  auxEsc.set(1.15 * r, 0.6 * r, 1.15 * r);
  auxM.compose(auxPos, auxQ, auxEsc);
  malla.setMatrixAt(i, auxM);
}

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
    liberarMateriales(this.materiales);
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

/**
 * Un anillo con grosor repetido en los dos fragmentos, de largo `largo`, que empieza a `desde` del extremo. Con
 * `borde`, el extremo que mira a la brecha queda dentado (`fracturar`), con el mismo dibujo en los dos fragmentos.
 */
function anilloEnFragmentos(
  interior: number,
  exterior: number,
  desde: number,
  largo: number,
  theta0: number,
  arco: number,
  borde?: BordeRoto,
): BufferGeometry {
  const yCentro = BRECHA / 2 + desde + largo / 2;
  const fragmento = (signo: 1 | -1): BufferGeometry => {
    // V = la altura a la que queda la pieza: el tramo sano y el necrótico siguen el mismo dibujo en su unión.
    const g = anillo(interior, exterior, largo, theta0, arco, undefined, {
      desplazamientoV: signo * yCentro,
    });
    // El extremo que mira a la brecha: abajo en el distal (+1) y arriba en el proximal (−1).
    if (borde) fracturar(g, (-signo * largo) / 2, borde.amplitud, borde.fase);
    return alFragmento(g, signo, yCentro);
  };
  return unir([fragmento(-1), fragmento(1)]);
}

/** Acabado del hueso cortical sano (el del tejido `hueso`) y cuánto se apaga el muerto: seco, mate y sin brillo. */
const CORTICAL_VIVA = { roughness: 0.78, clearcoat: 0.08 } as const;
const CORTICAL_MUERTA = { roughness: 0.9, clearcoat: 0.02 } as const;

export class HuesoFracturado extends PiezaConTapa {
  private readonly matNecrosis: MeshPhysicalMaterial;
  private readonly matPeriostio: MeshPhysicalMaterial;
  private readonly periostio: Mesh[];
  private readonly medulaCentral: Mesh[];
  private readonly colores = {
    cortical: new Color(COLOR.cortical),
    necrotico: new Color(COLOR.huesoNecrotico),
  };

  constructor() {
    super('hueso_fracturado');
    // Todo se construye con el eje del hueso en Y; se tumba para que quede a lo largo de X.
    this.grupo.rotation.z = -Math.PI / 2;

    const cuerpo = arcoDeCuerpo();
    const cuna = arcoDeCuna();
    const cortical = relieve(material(COLOR.cortical, 'hueso'), REPETIR.hueso);
    this.matNecrosis = relieve(material(COLOR.cortical, 'hueso'), REPETIR.hueso);
    const medula = relieve(material(COLOR.medula, 'medula'), REPETIR.medula);
    // Translúcido (0,7) mientras es fino; opaco (y de una sola pasada) mientras está engrosado: `actualizar`.
    this.matPeriostio = relieve(material(COLOR.periostio, 'membrana'), REPETIR.membrana);
    this.materiales.push(cortical, this.matNecrosis, medula, this.matPeriostio);

    const par = (
      interior: number,
      exterior: number,
      desde: number,
      largo: number,
      mat: Material,
      nombre: string,
      borde?: BordeRoto,
    ): [Mesh, Mesh] =>
      this.partida(
        anilloEnFragmentos(interior, exterior, desde, largo, cuerpo.theta0, cuerpo.arco, borde),
        anilloEnFragmentos(interior, exterior, desde, largo, cuna.theta0, cuna.arco, borde),
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
    // La superficie de fractura es dentada (no un corte de sierra) y encaja con la del otro fragmento.
    par(
      R_MEDULAR,
      R_CORTICAL,
      0,
      LARGO_NECROSIS,
      this.matNecrosis,
      'hueso_necrotico',
      BORDE_FRACTURA,
    );
    // Médula amarilla, retirada del extremo (ahí habrá sangre, hematoma y callo interno).
    par(
      0,
      R_MEDULAR - 0.012,
      RETIRO_MEDULA,
      LARGO_FRAGMENTO - RETIRO_MEDULA,
      medula,
      'medula_osea',
    );
    // Periostio roto: no llega al extremo y su borde está desgarrado.
    this.periostio = par(
      PERIOSTIO.interior,
      PERIOSTIO.exterior,
      RETIRO_PERIOSTIO,
      LARGO_FRAGMENTO - RETIRO_PERIOSTIO,
      this.matPeriostio,
      'periostio',
      BORDE_PERIOSTIO,
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
    // El hueso de los bordes se oscurece al morir (y queda seco y mate) y recupera el color al ser sustituido.
    this.matNecrosis.color
      .copy(this.colores.cortical)
      .lerp(this.colores.necrotico, estado.necrosis);
    this.matNecrosis.roughness =
      CORTICAL_VIVA.roughness +
      (CORTICAL_MUERTA.roughness - CORTICAL_VIVA.roughness) * estado.necrosis;
    this.matNecrosis.clearcoat =
      CORTICAL_VIVA.clearcoat +
      (CORTICAL_MUERTA.clearcoat - CORTICAL_VIVA.clearcoat) * estado.necrosis;
    // El periostio se engruesa (y se vuelve más denso) con la respuesta perióstica.
    const engrosado = 1 + 0.06 * estado.periostio;
    for (const m of this.periostio) m.scale.set(engrosado, 1, engrosado);
    ponerOpacidad([this.matPeriostio], 0.7 + 0.3 * estado.periostio);
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
  private readonly matHematoma: MeshPhysicalMaterial;
  private readonly callo: Group;
  private readonly matCalloCentro: MeshPhysicalMaterial;
  private readonly matCalloPeriferia: MeshPhysicalMaterial;
  private readonly vasosRotos: InstancedMesh;
  private readonly gotas: InstancedMesh;
  private readonly neutrofilos: InstancedMesh;
  private readonly macrofagos: InstancedMesh;
  private readonly celulasMadre: InstancedMesh;
  private readonly vasosNuevos: InstancedMesh;
  private readonly osteoclastos: InstancedMesh;
  private readonly osteoblastos: InstancedMesh;
  private readonly datos = {
    vasosRotos: vasosRotos().map(hundirEnFragmento),
    gotas: gotasDeSangre(),
    ...celulasInflamatorias(),
    celulasMadre: celulasMadre(),
    vasosNuevos: vasosNuevos(),
    osteoclastos: osteoclastosDelCallo(),
    osteoblastos: osteoblastosDelCallo(),
  };
  private readonly colores = {
    coagulo: new Color(COLOR.coagulo),
    granulacion: new Color(COLOR.granulacion),
    fibroso: new Color(COLOR.fibroso),
    cartilago: new Color(COLOR.cartilago),
    calcificado: new Color(COLOR.cartilagoCalcificado),
    huesoNuevo: new Color(COLOR.huesoNuevo),
    cortical: new Color(COLOR.cortical),
  };

  constructor() {
    super('reparacion');
    this.grupo.rotation.z = -Math.PI / 2;

    // Hematoma: fusiforme sólido centrado en la brecha, cortado con la cuña más retirada.
    const cuerpoH = arcoDeCuerpo(RETIRO_CUNA.hematoma);
    const cunaH = arcoDeCuna(RETIRO_CUNA.hematoma);
    // Coágulo y, después, tejido de granulación: grumosos y muy húmedos los dos.
    this.matHematoma = relieve(material(COLOR.coagulo, 'coagulo'), REPETIR.blando);
    this.materiales.push(this.matHematoma);
    this.hematoma = new Group();
    this.hematoma.name = 'hematoma';
    const tapaHematoma = new Group();
    tapaHematoma.name = 'hematoma_tapa';
    const perfilH = perfilSolido(radioHematoma, -HEMATOMA.medioLargo, HEMATOMA.medioLargo, 20);
    const abollarHematoma = (g: BufferGeometry): BufferGeometry =>
      abollar(g, IRREGULAR.hematoma.amplitud, IRREGULAR.hematoma.semilla);
    // Un coágulo no es un huso perfecto: superficie algo irregular (la misma en el cuerpo y en la tapa).
    this.partida(
      abollarHematoma(fusiforme(perfilH, cuerpoH.theta0, cuerpoH.arco)),
      abollarHematoma(fusiforme(perfilH, cunaH.theta0, cunaH.arco)),
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
    // Relieve de poros del hueso inmaduro: casi liso con el acabado del cartílago o del tejido fibroso, y poroso
    // cuando el callo ya es hueso (`aplicarAcabado` en `actualizar`).
    this.matCalloCentro = relieve(material(COLOR.cartilago, 'hueso_inmaduro'), REPETIR.blando);
    this.matCalloPeriferia = relieve(material(COLOR.fibroso, 'hueso_inmaduro'), REPETIR.blando);
    aplicarAcabado(this.matCalloCentro, ACABADO.cartilago, []);
    aplicarAcabado(this.matCalloPeriferia, ACABADO.fibroso, []);
    this.materiales.push(this.matCalloCentro, this.matCalloPeriferia);
    this.callo = new Group();
    this.callo.name = 'callo';
    const tapaCallo = new Group();
    tapaCallo.name = 'callo_tapa';
    const c = CALLO.medioLargoCentro;
    const perfilCentro = perfilSolido(radioCallo, -c, c, 16);
    // Superficie algo irregular, con el mismo dibujo en las tres piezas (siguen encajando entre sí).
    const irregular = (g: BufferGeometry): BufferGeometry =>
      abollar(g, IRREGULAR.callo.amplitud, IRREGULAR.callo.semilla);
    this.partida(
      irregular(fusiforme(perfilCentro, cuerpoC.theta0, cuerpoC.arco)),
      irregular(fusiforme(perfilCentro, cunaC.theta0, cunaC.arco)),
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
      irregular(unir(perfiles.map((p) => fusiforme(p, cuerpoC.theta0, cuerpoC.arco)))),
      irregular(unir(perfiles.map((p) => fusiforme(p, cunaC.theta0, cunaC.arco)))),
      this.matCalloPeriferia,
      'callo_periferico',
      this.callo,
      tapaCallo,
    );
    this.callo.add(tapaCallo);
    this.cuerpo.add(this.callo);
    this.tapaCallo = tapaCallo;

    // Piezas repetidas: células de 12 × 8 (se ven de cerca); gotas de 8 × 6 (pequeñas).
    const geoTramo = tramo(8);
    const geoCelula = esfera(12, 8);
    const geoGota = esfera(8, 6);
    this.geometrias.push(geoTramo, geoCelula, geoGota);
    // Sangre de los vasos rotos y gotas, y pared de los vasos nuevos: lisas y húmedas, sin emisivo (la sangre no
    // emite luz: con la luz de la base, el emisivo la aclaraba por dentro).
    const matSangre = material(COLOR.sangre, 'vaso');
    const matVaso = material(COLOR.vaso, 'vaso');
    const matNeutrofilo = material(COLOR.neutrofilo, 'celula');
    const matMacrofago = material(COLOR.macrofago, 'celula');
    const matCelulaMadre = material(COLOR.celulaMadre, 'celula');
    const matOsteoclasto = material(COLOR.osteoclasto, 'celula');
    const matOsteoblasto = material(COLOR.osteoblasto, 'celula');
    this.materiales.push(
      matSangre,
      matVaso,
      matNeutrofilo,
      matMacrofago,
      matCelulaMadre,
      matOsteoclasto,
      matOsteoblasto,
    );
    const d = this.datos;
    this.vasosRotos = instanciar(geoTramo, matSangre, d.vasosRotos.length, 'vasos_rotos');
    this.gotas = instanciar(geoGota, matSangre, d.gotas.length, 'gotas_de_sangre');
    this.neutrofilos = instanciar(geoCelula, matNeutrofilo, d.neutrofilos.length, 'neutrofilos');
    this.macrofagos = instanciar(geoCelula, matMacrofago, d.macrofagos.length, 'macrofagos');
    this.celulasMadre = instanciar(
      geoCelula,
      matCelulaMadre,
      d.celulasMadre.length,
      'celulas_madre',
    );
    this.vasosNuevos = instanciar(geoTramo, matVaso, d.vasosNuevos.length, 'vasos_nuevos');
    this.osteoclastos = instanciar(
      geoCelula,
      matOsteoclasto,
      d.osteoclastos.length,
      'osteoclastos',
    );
    this.osteoblastos = instanciar(
      geoCelula,
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

  /**
   * Coloca una lista de células (esferas) con presencia global `p`; con la cuña abierta oculta las del sector. Las
   * que se apoyan en el hematoma van sobre su superficie a su escala `hematoma` (la que se dibuja) y desaparecen con
   * él (`soporte`): antes tenían una posición fija y quedaban en el aire cuando el hematoma encogía.
   */
  private ponerCelulas(
    malla: InstancedMesh,
    lista: readonly Celula[],
    p: number,
    abierta: boolean,
    hematoma = 1,
    soporte = 1,
  ) {
    let alguna = false;
    lista.forEach((c, i) => {
      let k = abierta && enCuna(c.theta) ? 0 : presenciaCon(p, c.retraso);
      if (c.superficie) k *= soporte;
      if (k > 0.004) alguna = true;
      ponerEsfera(malla, i, c.superficie ? puntoSobreHematoma(c, hematoma, k) : c.p, c.radio * k);
    });
    malla.visible = alguna;
    malla.instanceMatrix.needsUpdate = true;
  }

  /** Coloca células sobre la superficie del callo a su escala actual, aplanadas contra ella. */
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
      ponerAplanada(malla, i, puntoSobreCallo(c, escala, k), normalSobreCallo(c), c.radio * k);
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
    const escalaHematoma = Math.max(0.001, hematoma);
    this.hematoma.visible = hematoma > 0.004;
    this.hematoma.scale.setScalar(escalaHematoma);
    this.matHematoma.color
      .copy(this.colores.coagulo)
      .lerp(this.colores.granulacion, suave(estado.granulacion));

    // Inflamación y células madre.
    // Las de la superficie del hematoma desaparecen con él.
    const soporte = suave(estado.hematoma / 0.3);
    for (const [malla, lista] of [
      [this.neutrofilos, this.datos.neutrofilos],
      [this.macrofagos, this.datos.macrofagos],
    ] as const) {
      this.ponerCelulas(malla, lista, estado.inflamacion, abierta, escalaHematoma, soporte);
    }
    this.ponerCelulas(this.celulasMadre, this.datos.celulasMadre, estado.celulasMadre, abierta);

    // Vasos nuevos.
    this.ponerTramos(
      this.vasosNuevos,
      this.datos.vasosNuevos,
      suave(estado.vasosNuevos),
      0.035,
      abierta,
    );

    // Callo: escala, colores y acabado de sus dos partes (el acabado sigue al tejido, como el color).
    const escala = estado.callo;
    this.callo.visible = escala >= ESCALA_CALLO_OCULTO;
    this.callo.scale.setScalar(escala);
    const laminar = suave(estado.laminar);
    const calcificacion = suave(estado.calcificacion);
    const huesoCentral = suave(estado.huesoCentral);
    const huesoPeriferico = suave(estado.huesoPeriferico);
    this.matCalloCentro.color
      .copy(this.colores.cartilago)
      .lerp(this.colores.calcificado, calcificacion)
      .lerp(this.colores.huesoNuevo, huesoCentral)
      .lerp(this.colores.cortical, laminar);
    aplicarAcabado(this.matCalloCentro, ACABADO.cartilago, [
      [ACABADO.calcificado, calcificacion],
      [ACABADO.reticular, huesoCentral],
      [ACABADO.laminar, laminar],
    ]);
    this.matCalloPeriferia.color
      .copy(this.colores.fibroso)
      .lerp(this.colores.huesoNuevo, huesoPeriferico)
      .lerp(this.colores.cortical, laminar);
    aplicarAcabado(this.matCalloPeriferia, ACABADO.fibroso, [
      [ACABADO.reticular, huesoPeriferico],
      [ACABADO.laminar, laminar],
    ]);

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
