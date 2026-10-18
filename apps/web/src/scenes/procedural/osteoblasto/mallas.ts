/**
 * Las dos piezas de la escena del osteoblasto, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `SuperficieOsea`: el bloque de hueso mineralizado viejo visto en corte (cara de corte hacia la cámara), con
 *    sus laminillas; encima, el hueso nuevo y el osteoide, que crecen con el estado; el frente de mineralización;
 *    el capilar; y, en la cara de corte, la laguna del osteocito con sus canalículos.
 *  - `FilaCelular`: las cinco células de la fila (cuerpos translúcidos con núcleo), los orgánulos de la célula
 *    protagonista (retículo con sus ribosomas, Golgi, mitocondrias, nucléolo), las vesículas de secreción y los
 *    fragmentos de la célula apoptótica.
 *
 * No calculan nada de la biología: reciben `EstadoOsteoblasto` (puro) y solo mueven, escalan, colorean y aclaran
 * piezas. Materiales compartidos por tipo de pieza; `InstancedMesh` para lo repetido; al liberar se libera todo.
 *
 * Realismo (2026-10-14): materiales físicos por tejido (`realismo.ts`) y paleta natural (`NATURAL`): hueso mate y
 * poroso, osteoide de colágeno con brillo sedoso, células blandas y húmedas, núcleos de cromatina granulosa,
 * orgánulos lisos y húmedos, capilar húmedo y laguna oscura (una cavidad).
 *
 * Revisión de diseño (2026-10-17): nada emite luz propia (el capilar y el frente de mineralización brillaban por
 * dentro y aclaraban «la línea oscura»); las piezas cerradas que se desvanecen (frente, capilar, laguna cortada,
 * orgánulos) son de una cara, así que three las dibuja en una sola pasada, y pasan a opacas al terminar de
 * aparecer (proyectan sombra).
 */
import type { Material } from 'three';
import {
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  FrontSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { mezclar, suave } from '../interpolacion';
import {
  NUCLEO,
  canaliculosDeLaguna,
  cisternasDelReticulo,
  fragmentosApoptoticos,
  laminillasDelHueso,
  mitocondrias,
  puntoDeVesicula,
  ribosomasDelReticulo,
  saculosDelGolgi,
  vesiculasDeSecrecion,
} from './disposicion';
import type { Fragmento, Pieza, Segmento2d, Vesicula } from './disposicion';
import {
  BLOQUE,
  CAPILAR,
  CELULA_FOCO,
  DESTINOS,
  FORMA,
  LAGUNA,
  N_CELULAS,
  N_FRAGMENTOS,
  Z_CARA,
  Z_CELULAS,
} from './estado';
import type { EstadoCelula, EstadoOsteoblasto } from './estado';
import {
  R_CISTERNA,
  cajaEnEscala,
  cisterna,
  cuerpoCelular,
  disco,
  esfera,
  ribosoma,
  tubo,
} from './geometria';
import { NATURAL as COLOR } from './paleta';
import type { TipoTejido } from '../realismo';
import { liberarMaterialOrganico, materialOrganico, ponerOpacidad } from '../realismo';

const EJE_Z = new Vector3(0, 0, 1);

/**
 * Material de un tejido (`realismo.ts`): físico, con relieve de superficie hecho por código y de doble cara salvo
 * que `extra` diga otra cosa (`materialOrganico` ya la pone por defecto).
 */
function material(
  color: string,
  tipo: TipoTejido = 'hueso',
  extra: ConstructorParameters<typeof MeshPhysicalMaterial>[0] = {},
): MeshPhysicalMaterial {
  return materialOrganico(color, tipo, extra);
}

/** Libera materiales: los orgánicos con su clon de textura de relieve. */
function liberarMateriales(lista: readonly Material[]): void {
  for (const m of lista) {
    if (m instanceof MeshPhysicalMaterial) liberarMaterialOrganico(m);
    else m.dispose();
  }
}

/**
 * Repeticiones del relieve de un material orgánico por unidad de UV (el mapa de relieve y el de rugosidad son la
 * misma textura). Para las cajas con UV en unidades de escena, en lugar de la repetición propia del tejido.
 */
function repetirRelieve(mat: MeshPhysicalMaterial, ru: number, rv: number): void {
  mat.bumpMap?.repeat.set(ru, rv);
}

/** Segmentos 2D sobre la cara de corte (plano z = `z`) como geometría de líneas. */
function lineasEnCara(segmentos: readonly Segmento2d[], z: number): BufferGeometry {
  const puntos: number[] = [];
  for (const [x0, y0, x1, y1] of segmentos) puntos.push(x0, y0, z, x1, y1, z);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(puntos, 3));
  return geo;
}

/** Interfaz común de las piezas. */
export interface PiezaOsteoblasto {
  readonly grupo: Group;
  actualizar: (estado: EstadoOsteoblasto) => void;
  liberar: () => void;
}

/** Escribe una instancia oculta (matriz nula). */
function ocultar(malla: InstancedMesh, i: number, m: Matrix4): void {
  m.makeScale(0, 0, 0);
  malla.setMatrixAt(i, m);
}

/* -------------------------------------------------------------------------------------------
 * Superficie ósea
 * ----------------------------------------------------------------------------------------- */

/**
 * Alto con el que se calculan las UV de las capas que crecen (hueso nuevo y osteoide, cajas que se escalan en Y):
 * su relieve se ve sin deformar hacia la mitad del depósito.
 */
const ALTO_NOMINAL_CAPA = 0.5;
/** Repeticiones del relieve por unidad de escena en las cajas de hueso: una repetición mide 2 unidades. */
const RELIEVE_POR_UNIDAD = 0.5;

export class SuperficieOsea implements PiezaOsteoblasto {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly osteoide: Mesh;
  private readonly huesoNuevo: Mesh;
  private readonly frente: Mesh;
  private readonly matFrente: MeshPhysicalMaterial;
  private readonly capilar: Mesh;
  private readonly matCapilar: MeshPhysicalMaterial;
  private readonly matLaguna: MeshPhysicalMaterial;
  private readonly matOsteocito: MeshPhysicalMaterial;
  private readonly matCanaliculos: LineBasicMaterial;
  private readonly matLaminillas: LineBasicMaterial;
  private readonly corteLaguna: Group;

  constructor() {
    this.grupo.name = 'superficie_osea';
    // Una caja por capa, con UV en unidades de escena: el relieve no se estira en las caras alargadas.
    const geoHueso = cajaEnEscala([BLOQUE.ancho, BLOQUE.alto, BLOQUE.fondo]);
    const geoCapa = cajaEnEscala([BLOQUE.ancho, ALTO_NOMINAL_CAPA, BLOQUE.fondo]);
    // En el osteoide las vetas del colágeno corren a lo largo de la superficie (X), como en una lámina.
    const geoOsteoide = cajaEnEscala([BLOQUE.ancho, ALTO_NOMINAL_CAPA, BLOQUE.fondo], true);
    this.geometrias.push(geoHueso, geoCapa, geoOsteoide);

    // Hueso viejo: bloque macizo bajo y = 0, mate y poroso.
    const matHueso = material(COLOR.hueso, 'hueso');
    repetirRelieve(matHueso, RELIEVE_POR_UNIDAD, RELIEVE_POR_UNIDAD);
    const hueso = new Mesh(geoHueso, matHueso);
    hueso.name = 'hueso_mineralizado';
    hueso.scale.set(BLOQUE.ancho, BLOQUE.alto, BLOQUE.fondo);
    hueso.position.y = -BLOQUE.alto / 2;
    this.grupo.add(hueso);

    // Laminillas en la cara de corte: hilos algo más oscuros que el hueso.
    this.matLaminillas = new LineBasicMaterial({
      color: COLOR.laminilla,
      transparent: true,
      opacity: 0.7,
    });
    const geoLaminillas = lineasEnCara(
      laminillasDelHueso(BLOQUE.ancho, BLOQUE.alto),
      Z_CARA + 0.004,
    );
    this.geometrias.push(geoLaminillas);
    const laminillas = new LineSegments(geoLaminillas, this.matLaminillas);
    laminillas.name = 'laminillas';
    this.grupo.add(laminillas);

    // Hueso nuevo (de y = 0 al frente): recién mineralizado, más claro y más poroso que el viejo.
    const matNuevo = material(COLOR.huesoNuevo, 'hueso_inmaduro');
    repetirRelieve(matNuevo, RELIEVE_POR_UNIDAD, RELIEVE_POR_UNIDAD);
    this.huesoNuevo = new Mesh(geoCapa, matNuevo);
    this.huesoNuevo.name = 'hueso_nuevo';
    // Osteoide (del frente a la superficie de apoyo): colágeno sin mineral, con fibrillas y brillo sedoso.
    // Vetas finas a lo ancho (32 por unidad) y largas a lo largo de X (una repetición cada 2 unidades).
    const matOsteoide = material(COLOR.osteoide, 'fibra');
    repetirRelieve(matOsteoide, 1, RELIEVE_POR_UNIDAD);
    this.osteoide = new Mesh(geoOsteoide, matOsteoide);
    this.osteoide.name = 'osteoide';
    this.grupo.add(this.huesoNuevo, this.osteoide);

    // Frente de mineralización: una lámina finísima y oscura que se destaca en su fase. Sin brillo propio (con él
    // se aclaraba «la línea oscura» que nombra el texto). Es una caja cerrada: basta su cara de fuera.
    this.matFrente = material(COLOR.frente, 'hueso', {
      side: FrontSide,
      transparent: true,
      opacity: 0,
    });
    repetirRelieve(this.matFrente, RELIEVE_POR_UNIDAD, RELIEVE_POR_UNIDAD);
    this.frente = new Mesh(geoCapa, this.matFrente);
    this.frente.name = 'frente_mineralizacion';
    this.frente.scale.set(BLOQUE.ancho + 0.03, 0.04, BLOQUE.fondo + 0.03);
    this.grupo.add(this.frente);

    // Capilar paralelo a la superficie, detrás de la fila: pared lisa y húmeda. Sin brillo propio (la sangre no
    // emite luz). Tubo cerrado: basta su cara de fuera.
    const geoCapilar = tubo(CAPILAR.radio, BLOQUE.ancho + 0.6);
    this.geometrias.push(geoCapilar);
    this.matCapilar = material(COLOR.capilar, 'vaso', { side: FrontSide });
    this.capilar = new Mesh(geoCapilar, this.matCapilar);
    this.capilar.name = 'capilar';
    this.capilar.position.z = CAPILAR.z;
    this.grupo.add(this.capilar);

    this.materiales.push(matHueso, matNuevo, matOsteoide, this.matFrente, this.matCapilar);

    // Laguna del osteocito cortada en la cara: cavidad oscura, cuerpo de la célula y canalículos.
    this.corteLaguna = new Group();
    this.corteLaguna.name = 'corte_laguna';
    const geoDisco = disco();
    const geoCuerpo = esfera();
    this.geometrias.push(geoDisco, geoCuerpo);
    // El disco mira a la cámara y el cuerpo es un elipsoide cerrado: los dos, de una cara.
    this.matLaguna = material(COLOR.laguna, 'cavidad', {
      side: FrontSide,
      transparent: true,
      opacity: 0,
    });
    this.matOsteocito = material(COLOR.osteocito, 'celula', {
      side: FrontSide,
      transparent: true,
      opacity: 0,
    });
    this.materiales.push(this.matLaguna, this.matOsteocito);
    const halo = new Mesh(geoDisco, this.matLaguna);
    halo.name = 'laguna';
    halo.scale.set(LAGUNA.rx, LAGUNA.ry, 1);
    halo.position.set(LAGUNA.x, LAGUNA.y, Z_CARA + 0.006);
    // El cuerpo cortado es medio elipsoide que asoma de la cara (con volumen y luz propios, no un disco plano);
    // la otra mitad queda dentro del hueso, oculta.
    const cuerpo = new Mesh(geoCuerpo, this.matOsteocito);
    cuerpo.name = 'osteocito_corte';
    cuerpo.scale.set(LAGUNA.rx * 0.6, LAGUNA.ry * 0.6, 0.05);
    cuerpo.position.set(LAGUNA.x, LAGUNA.y, Z_CARA + 0.008);
    this.matCanaliculos = new LineBasicMaterial({
      color: COLOR.canaliculo,
      transparent: true,
      opacity: 0,
    });
    const geoCanaliculos = lineasEnCara(canaliculosDeLaguna(), Z_CARA + 0.008);
    this.geometrias.push(geoCanaliculos);
    const canaliculos = new LineSegments(geoCanaliculos, this.matCanaliculos);
    canaliculos.name = 'canaliculos';
    this.corteLaguna.add(halo, cuerpo, canaliculos);
    this.grupo.add(this.corteLaguna);
  }

  actualizar(estado: EstadoOsteoblasto): void {
    const { deposito, mineral } = estado;
    // Hueso nuevo: de 0 a `mineral`.
    const nuevoVisible = mineral > 0.003;
    this.huesoNuevo.visible = nuevoVisible;
    if (nuevoVisible) {
      this.huesoNuevo.scale.set(BLOQUE.ancho, mineral, BLOQUE.fondo);
      this.huesoNuevo.position.y = mineral / 2;
    }
    // Osteoide: de `mineral` a `deposito`.
    const grosor = deposito - mineral;
    const osteoideVisible = grosor > 0.003;
    this.osteoide.visible = osteoideVisible;
    if (osteoideVisible) {
      this.osteoide.scale.set(BLOQUE.ancho, grosor, BLOQUE.fondo);
      this.osteoide.position.y = mineral + grosor / 2;
    }
    // Frente de mineralización.
    this.frente.visible = estado.frente > 0.004 && nuevoVisible;
    this.frente.position.y = mineral;
    ponerOpacidad([this.matFrente], estado.frente);
    // El capilar acompaña a la superficie que sube y se desvanece mientras la protagonista está transparente
    // (si no, se vería a través de ella entre los orgánulos).
    this.capilar.position.y = deposito + CAPILAR.sobreSuperficie + CAPILAR.radio;
    const capilar = 1 - estado.transparencia;
    this.capilar.visible = capilar > 0.004;
    ponerOpacidad([this.matCapilar], capilar);
    // Laguna en la cara de corte.
    this.corteLaguna.visible = estado.laguna > 0.004;
    ponerOpacidad([this.matLaguna, this.matOsteocito], estado.laguna);
    this.matCanaliculos.opacity = estado.laguna * 0.9;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    this.matCanaliculos.dispose();
    this.matLaminillas.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Fila celular
 * ----------------------------------------------------------------------------------------- */

type V3 = readonly [number, number, number];

/** Opacidad de los cuerpos celulares: translúcidos, para que el núcleo se vea siempre. */
const OPACIDAD_CUERPO = 0.8;
/** Radio de un ribosoma (exagerado como todo lo de la célula: se lee como un grano sobre la cisterna). */
const R_RIBOSOMA = 0.0105;
/** Semiejes del núcleo según la forma de la célula (X, Y, Z) y su altura local. */
const NUCLEOS = {
  fusiforme: { y: 0, semiejes: [0.5, 0.085, 0.2] as V3 },
  cubico: { y: NUCLEO.y, semiejes: NUCLEO.semiejes as V3 },
  revestimiento: { y: 0, semiejes: [0.42, 0.042, 0.2] as V3 },
  osteocito: { y: 0, semiejes: [0.15, 0.1, 0.12] as V3 },
} as const;

function mezclarV3(a: V3, b: V3, k: number): [number, number, number] {
  return [mezclar(a[0], b[0], k), mezclar(a[1], b[1], k), mezclar(a[2], b[2], k)];
}

/** Forma (semiejes) y altura del núcleo de una célula según su estado. */
export function formaDeCelula(c: EstadoCelula): {
  semiejes: [number, number, number];
  nucleo: { y: number; semiejes: [number, number, number] };
} {
  let semiejes = mezclarV3(FORMA.fusiforme, FORMA.cubico, suave(c.cubico));
  let nSemi = mezclarV3(NUCLEOS.fusiforme.semiejes, NUCLEOS.cubico.semiejes, suave(c.cubico));
  let nY = mezclar(NUCLEOS.fusiforme.y, NUCLEOS.cubico.y, suave(c.cubico));
  const plano = suave(c.aplanado);
  semiejes = mezclarV3(semiejes, FORMA.revestimiento, plano);
  nSemi = mezclarV3(nSemi, NUCLEOS.revestimiento.semiejes, plano);
  nY = mezclar(nY, NUCLEOS.revestimiento.y, plano);
  const hundido = suave(c.hundido);
  semiejes = mezclarV3(semiejes, FORMA.osteocito, hundido);
  nSemi = mezclarV3(nSemi, NUCLEOS.osteocito.semiejes, hundido);
  nY = mezclar(nY, NUCLEOS.osteocito.y, hundido);
  // Apoptosis: la célula se encoge y el núcleo se condensa (picnosis).
  const encogido = suave(c.encogido);
  const factor = 1 - 0.88 * encogido;
  semiejes = [semiejes[0] * factor * c.ancho, semiejes[1] * factor, semiejes[2] * factor];
  nSemi = [
    nSemi[0] * (1 - 0.7 * encogido),
    nSemi[1] * (1 - 0.7 * encogido),
    nSemi[2] * (1 - 0.7 * encogido),
  ];
  nY = nY * (1 - encogido);
  return { semiejes, nucleo: { y: nY, semiejes: nSemi } };
}

/**
 * Posición de cada ribosoma relativa al centro de la célula protagonista: pegado a la cara de su cisterna (un
 * elipsoide aplastado de radio `R_CISTERNA` por los semiejes de la pieza), con el grano casi entero fuera, y con
 * el mismo giro que la cisterna. Las cisternas tumbadas son finas en Y; las de pie, en X.
 */
function posicionesDeRibosomas(): Vector3[] {
  const cisternas = cisternasDelReticulo();
  return ribosomasDelReticulo().map((r) => {
    const c = cisternas[r.cisterna]!;
    const tumbada = c.sy <= c.sx;
    const borde = Math.sqrt(Math.max(0, 1 - r.u * r.u - r.v * r.v));
    const fuera = r.cara * (R_CISTERNA * (tumbada ? c.sy : c.sx) * borde + R_RIBOSOMA * 0.7);
    const local = tumbada
      ? new Vector3(r.u * R_CISTERNA * c.sx, fuera, r.v * R_CISTERNA * c.sz)
      : new Vector3(fuera, r.u * R_CISTERNA * c.sy, r.v * R_CISTERNA * c.sz);
    return local.applyAxisAngle(EJE_Z, c.giro).add(new Vector3(c.x, c.y, c.z));
  });
}

export class FilaCelular implements PiezaOsteoblasto {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly cuerpos: Mesh[] = [];
  private readonly matCuerpos: MeshPhysicalMaterial[] = [];
  private readonly nucleos: InstancedMesh;
  private readonly coloresNucleos: Float32Array;
  private readonly laminas: InstancedMesh;
  private readonly ribosomas: InstancedMesh;
  private readonly globulos: InstancedMesh;
  private readonly fragmentos: InstancedMesh;
  private readonly matNucleo: MeshPhysicalMaterial;
  private readonly matLaminas: MeshPhysicalMaterial;
  private readonly matGlobulos: MeshPhysicalMaterial;
  private readonly matFragmentos: MeshPhysicalMaterial;
  private readonly piezasLaminas: readonly Pieza[];
  private readonly piezasMito: readonly Pieza[];
  private readonly vesiculas: readonly Vesicula[];
  private readonly listaFragmentos: readonly Fragmento[];
  private readonly posRibosomas: readonly Vector3[];
  private readonly coloresGlobulos: Float32Array;
  private readonly coloresLaminas: Float32Array;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();
  private readonly colores = {
    precursor: new Color(COLOR.precursor),
    osteoblasto: new Color(COLOR.osteoblasto),
    revestimiento: new Color(COLOR.revestimiento),
    osteocito: new Color(COLOR.osteocito),
    apoptosis: new Color(COLOR.apoptosis),
  };

  constructor() {
    this.grupo.name = 'fila_celular';
    const geoCuerpo = cuerpoCelular();
    const geoEsfera = esfera();
    const geoCisterna = cisterna();
    const geoRibosoma = ribosoma();
    this.geometrias.push(geoCuerpo, geoEsfera, geoCisterna, geoRibosoma);

    // Cuerpos: una malla por célula (cada una con su color y su opacidad). Membrana blanda y húmeda; solo la
    // cara de fuera, para que la pared de atrás no tape los orgánulos de la protagonista transparente.
    for (let k = 0; k < N_CELULAS; k++) {
      const mat = material(COLOR.precursor, 'celula', {
        side: FrontSide,
        transparent: true,
        opacity: OPACIDAD_CUERPO,
      });
      const malla = new Mesh(geoCuerpo, mat);
      malla.name = `celula_${k}`;
      this.matCuerpos.push(mat);
      this.cuerpos.push(malla);
      this.grupo.add(malla);
    }

    // Núcleos (uno por célula) y el nucléolo de la protagonista, en un InstancedMesh con color por instancia:
    // cromatina granulosa. El color por instancia MULTIPLICA al del material: los InstancedMesh con colores
    // propios van en blanco.
    this.matNucleo = material('#ffffff', 'nucleo');
    this.nucleos = new InstancedMesh(geoEsfera, this.matNucleo, N_CELULAS + 1);
    this.nucleos.name = 'nucleos';
    this.coloresNucleos = new Float32Array((N_CELULAS + 1) * 3);
    this.nucleos.instanceColor = new InstancedBufferAttribute(this.coloresNucleos, 3);
    this.nucleos.instanceMatrix.setUsage(DynamicDrawUsage);
    this.nucleos.frustumCulled = false;
    const nucleo = new Color(COLOR.nucleo);
    const nucleolo = new Color(COLOR.nucleolo);
    for (let i = 0; i <= N_CELULAS; i++) {
      (i < N_CELULAS ? nucleo : nucleolo).toArray(this.coloresNucleos, i * 3);
    }
    this.grupo.add(this.nucleos);

    // Orgánulos laminares (retículo y Golgi) de la célula protagonista: sacos membranosos aplastados. Cerrados,
    // como los ribosomas que comparten su material: de una cara (una sola pasada mientras se desvanecen).
    this.piezasLaminas = [...cisternasDelReticulo(), ...saculosDelGolgi()];
    this.matLaminas = material('#ffffff', 'organulo', {
      side: FrontSide,
      transparent: true,
      opacity: 0,
    });
    this.laminas = new InstancedMesh(geoCisterna, this.matLaminas, this.piezasLaminas.length);
    this.laminas.name = 'reticulo_y_golgi';
    this.coloresLaminas = new Float32Array(this.piezasLaminas.length * 3);
    this.laminas.instanceColor = new InstancedBufferAttribute(this.coloresLaminas, 3);
    this.laminas.instanceMatrix.setUsage(DynamicDrawUsage);
    this.laminas.frustumCulled = false;
    const reticulo = new Color(COLOR.reticulo);
    const golgi = new Color(COLOR.golgi);
    const nReticulo = cisternasDelReticulo().length;
    this.piezasLaminas.forEach((_, i) =>
      (i < nReticulo ? reticulo : golgi).toArray(this.coloresLaminas, i * 3),
    );
    this.grupo.add(this.laminas);

    // Ribosomas: granos oscuros en las dos caras de cada cisterna del retículo (lo que lo hace «rugoso»; el
    // Golgi es liso). Mismo material que las láminas: aparecen y se aclaran con ellas.
    this.posRibosomas = posicionesDeRibosomas();
    this.ribosomas = new InstancedMesh(geoRibosoma, this.matLaminas, this.posRibosomas.length);
    this.ribosomas.name = 'ribosomas';
    this.ribosomas.instanceMatrix.setUsage(DynamicDrawUsage);
    this.ribosomas.frustumCulled = false;
    const colorRibosoma = new Color(COLOR.reticulo).multiplyScalar(0.5);
    for (let i = 0; i < this.posRibosomas.length; i++) {
      this.ribosomas.setColorAt(i, colorRibosoma);
      ocultar(this.ribosomas, i, this.m);
    }
    if (this.ribosomas.instanceColor) this.ribosomas.instanceColor.needsUpdate = true;
    this.grupo.add(this.ribosomas);

    // Glóbulos: mitocondrias y vesículas de secreción, lisos y húmedos; esferas cerradas, de una cara.
    this.piezasMito = mitocondrias();
    this.vesiculas = vesiculasDeSecrecion();
    const nGlobulos = this.piezasMito.length + this.vesiculas.length;
    this.matGlobulos = material('#ffffff', 'organulo', {
      side: FrontSide,
      transparent: true,
      opacity: 0,
    });
    this.globulos = new InstancedMesh(geoEsfera, this.matGlobulos, nGlobulos);
    this.globulos.name = 'mitocondrias_y_vesiculas';
    this.coloresGlobulos = new Float32Array(nGlobulos * 3);
    this.globulos.instanceColor = new InstancedBufferAttribute(this.coloresGlobulos, 3);
    this.globulos.instanceMatrix.setUsage(DynamicDrawUsage);
    this.globulos.frustumCulled = false;
    const mito = new Color(COLOR.mitocondria);
    const vesicula = new Color(COLOR.vesicula);
    for (let i = 0; i < nGlobulos; i++) {
      (i < this.piezasMito.length ? mito : vesicula).toArray(this.coloresGlobulos, i * 3);
    }
    this.grupo.add(this.globulos);

    // Fragmentos de la célula apoptótica: vesículas de membrana (cuerpos apoptóticos).
    this.listaFragmentos = fragmentosApoptoticos();
    this.matFragmentos = material(COLOR.apoptosis, 'celula');
    this.fragmentos = new InstancedMesh(geoEsfera, this.matFragmentos, N_FRAGMENTOS);
    this.fragmentos.name = 'cuerpos_apoptoticos';
    this.fragmentos.instanceMatrix.setUsage(DynamicDrawUsage);
    this.fragmentos.frustumCulled = false;
    this.grupo.add(this.fragmentos);
  }

  /** Color del cuerpo de una célula según su estado. */
  private colorDeCelula(c: EstadoCelula, salida: Color): Color {
    salida.copy(this.colores.precursor).lerp(this.colores.osteoblasto, suave(c.cubico));
    salida.lerp(this.colores.revestimiento, suave(c.aplanado));
    salida.lerp(this.colores.osteocito, suave(c.hundido));
    salida.lerp(this.colores.apoptosis, suave(c.encogido));
    return salida;
  }

  /** Centro de una célula: apoyada sobre la superficie de depósito; el osteocito se hunde hasta su laguna. */
  private centroDeCelula(
    c: EstadoCelula,
    semiY: number,
    deposito: number,
  ): [number, number, number] {
    const hundido = suave(c.hundido);
    return [
      c.x,
      mezclar(deposito + semiY, LAGUNA.y, hundido),
      mezclar(Z_CELULAS, Z_CELULAS - 0.14, hundido),
    ];
  }

  actualizar(estado: EstadoOsteoblasto): void {
    const { m, q, p, s } = this;
    q.identity();
    let centroFoco: [number, number, number] = [0, 0, Z_CELULAS];
    let centroApoptosis: [number, number, number] = [0, 0, Z_CELULAS];

    estado.celulas.forEach((c, k) => {
      const cuerpo = this.cuerpos[k]!;
      const visible = c.presencia > 0.02 && c.encogido < 0.96;
      cuerpo.visible = visible;
      if (!visible) {
        ocultar(this.nucleos, k, m);
        return;
      }
      const { semiejes, nucleo } = formaDeCelula(c);
      const presencia = suave(c.presencia);
      const centro = this.centroDeCelula(c, semiejes[1] * presencia, estado.deposito);
      if (k === CELULA_FOCO) centroFoco = centro;
      if (k === DESTINOS.apoptosis) centroApoptosis = centro;
      cuerpo.position.set(centro[0], centro[1], centro[2]);
      cuerpo.scale.set(semiejes[0] * presencia, semiejes[1] * presencia, semiejes[2] * presencia);
      const mat = this.matCuerpos[k]!;
      this.colorDeCelula(c, mat.color);
      // El brillo aterciopelado de la membrana sigue al color de la célula.
      mat.sheenColor.copy(mat.color);
      const opacidad =
        k === CELULA_FOCO ? mezclar(OPACIDAD_CUERPO, 0.28, estado.transparencia) : OPACIDAD_CUERPO;
      mat.opacity = opacidad;
      mat.depthWrite = opacidad > 0.5;

      // Núcleo: dentro del cuerpo, excéntrico hacia el polo opuesto al hueso.
      p.set(centro[0], centro[1] + nucleo.y * presencia, centro[2]);
      s.set(
        nucleo.semiejes[0] * presencia,
        nucleo.semiejes[1] * presencia,
        nucleo.semiejes[2] * presencia,
      );
      m.compose(p, q, s);
      this.nucleos.setMatrixAt(k, m);
    });

    // Nucléolo de la protagonista: solo cuando la célula está transparente.
    const nucleolo = 0.07 * estado.transparencia;
    if (nucleolo > 0.004) {
      p.set(centroFoco[0] + 0.07, centroFoco[1] + NUCLEO.y + 0.04, centroFoco[2] + 0.19);
      s.setScalar(nucleolo);
      m.compose(p, q, s);
      this.nucleos.setMatrixAt(N_CELULAS, m);
    } else {
      ocultar(this.nucleos, N_CELULAS, m);
    }
    this.nucleos.instanceMatrix.needsUpdate = true;

    // Orgánulos laminares (retículo y Golgi) y ribosomas, locales a la célula protagonista.
    const organulos = estado.organulos;
    const hayOrganulos = organulos > 0.004;
    this.laminas.visible = hayOrganulos;
    this.ribosomas.visible = hayOrganulos;
    this.globulos.visible = hayOrganulos || estado.secrecion > 0.004;
    ponerOpacidad([this.matLaminas], organulos);
    this.matLaminas.depthWrite = false;
    if (hayOrganulos) {
      this.piezasLaminas.forEach((pieza, i) =>
        this.ponerPieza(this.laminas, i, pieza, centroFoco, 1),
      );
      this.laminas.instanceMatrix.needsUpdate = true;
      s.setScalar(R_RIBOSOMA);
      this.posRibosomas.forEach((local, i) => {
        p.set(centroFoco[0], centroFoco[1], centroFoco[2]).add(local);
        m.compose(p, q, s);
        this.ribosomas.setMatrixAt(i, m);
      });
      this.ribosomas.instanceMatrix.needsUpdate = true;
    }

    // Glóbulos: mitocondrias (con los orgánulos) y vesículas (con la secreción).
    if (this.globulos.visible) {
      ponerOpacidad([this.matGlobulos], Math.max(organulos, estado.secrecion));
      this.matGlobulos.depthWrite = false;
      this.piezasMito.forEach((pieza, i) =>
        this.ponerPieza(this.globulos, i, pieza, centroFoco, organulos),
      );
      const fase = estado.cicloVesiculas;
      this.vesiculas.forEach((v, j) => {
        const i = this.piezasMito.length + j;
        const u = (fase + v.desfase) % 1;
        const { y, radio } = puntoDeVesicula(u);
        const r = radio * suave(estado.secrecion);
        if (r < 0.004) {
          ocultar(this.globulos, i, m);
          return;
        }
        p.set(centroFoco[0] + v.x, centroFoco[1] + y, centroFoco[2] + v.z);
        s.setScalar(r);
        m.compose(p, q, s);
        this.globulos.setMatrixAt(i, m);
      });
      this.globulos.instanceMatrix.needsUpdate = true;
    }

    // Fragmentos apoptóticos: se alejan del centro de la célula 3 y se disuelven.
    const hayFragmentos = estado.fragmentos > 0.004;
    this.fragmentos.visible = hayFragmentos;
    if (hayFragmentos) {
      const c = estado.celulas[DESTINOS.apoptosis]!;
      const viaje = suave(c.encogido);
      this.listaFragmentos.forEach((f, i) => {
        p.set(
          centroApoptosis[0] + f.dx * f.alcance * viaje,
          Math.max(estado.deposito + 0.05, centroApoptosis[1] + f.dy * f.alcance * viaje),
          centroApoptosis[2] + f.dz * f.alcance * viaje,
        );
        s.setScalar(f.radio * estado.fragmentos);
        m.compose(p, q, s);
        this.fragmentos.setMatrixAt(i, m);
      });
      this.fragmentos.instanceMatrix.needsUpdate = true;
    }
  }

  /** Coloca la instancia `i` de `malla` con una pieza local a la célula protagonista, escalada por `k`. */
  private ponerPieza(
    malla: InstancedMesh,
    i: number,
    pieza: Pieza,
    centro: readonly [number, number, number],
    k: number,
  ): void {
    if (k < 0.004) {
      ocultar(malla, i, this.m);
      return;
    }
    this.p.set(centro[0] + pieza.x, centro[1] + pieza.y, centro[2] + pieza.z);
    this.q.setFromAxisAngle(EJE_Z, pieza.giro);
    this.s.set(pieza.sx * k, pieza.sy * k, pieza.sz * k);
    this.m.compose(this.p, this.q, this.s);
    malla.setMatrixAt(i, this.m);
    this.q.identity();
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales([
      ...this.matCuerpos,
      this.matNucleo,
      this.matLaminas,
      this.matGlobulos,
      this.matFragmentos,
    ]);
    this.nucleos.dispose();
    this.laminas.dispose();
    this.ribosomas.dispose();
    this.globulos.dispose();
    this.fragmentos.dispose();
  }
}
