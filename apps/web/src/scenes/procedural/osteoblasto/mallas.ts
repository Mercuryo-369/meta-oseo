/**
 * Las dos piezas de la escena del osteoblasto, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `SuperficieOsea`: el bloque de hueso mineralizado viejo visto en corte (cara de corte hacia la cámara), con
 *    sus laminillas; encima, el hueso nuevo y el osteoide, que crecen con el estado; el frente de mineralización;
 *    el capilar; y, en la cara de corte, la laguna del osteocito con sus canalículos.
 *  - `FilaCelular`: las cinco células de la fila (cuerpos translúcidos con núcleo), los orgánulos de la célula
 *    protagonista (retículo, Golgi, mitocondrias, nucléolo), las vesículas de secreción y los fragmentos de la
 *    célula apoptótica.
 *
 * No calculan nada de la biología: reciben `EstadoOsteoblasto` (puro) y solo mueven, escalan, colorean y aclaran
 * piezas. Materiales compartidos por tipo de pieza; `InstancedMesh` para lo repetido; al liberar se libera todo.
 */
import type { Material } from 'three';
import {
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
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
import { caja, cuerpoCelular, disco, esfera, tubo } from './geometria';
import { HEX } from './paleta';

const EJE_Z = new Vector3(0, 0, 1);

/** Material estándar. */
function material(
  color: string,
  extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {},
) {
  return new MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...extra });
}

/** Aplica una opacidad a un grupo de materiales (transparentes solo mientras hace falta). */
function poner(materiales: readonly Material[], opacidad: number, base = 1): void {
  const o = Math.max(0, Math.min(1, opacidad * base));
  for (const m of materiales) {
    m.opacity = o;
    m.transparent = o < 0.995;
    m.depthWrite = o > 0.5;
  }
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

export class SuperficieOsea implements PiezaOsteoblasto {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly osteoide: Mesh;
  private readonly huesoNuevo: Mesh;
  private readonly frente: Mesh;
  private readonly matFrente: MeshStandardMaterial;
  private readonly capilar: Mesh;
  private readonly matCapilar: MeshStandardMaterial;
  private readonly matLaguna: MeshBasicMaterial;
  private readonly matOsteocito: MeshBasicMaterial;
  private readonly matCanaliculos: LineBasicMaterial;
  private readonly matLaminillas: LineBasicMaterial;
  private readonly corteLaguna: Group;

  constructor() {
    this.grupo.name = 'superficie_osea';
    const geoCaja = caja();
    this.geometrias.push(geoCaja);

    // Hueso viejo: bloque macizo bajo y = 0.
    const matHueso = material(HEX.hueso);
    const hueso = new Mesh(geoCaja, matHueso);
    hueso.name = 'hueso_mineralizado';
    hueso.scale.set(BLOQUE.ancho, BLOQUE.alto, BLOQUE.fondo);
    hueso.position.y = -BLOQUE.alto / 2;
    this.grupo.add(hueso);

    // Laminillas en la cara de corte.
    this.matLaminillas = new LineBasicMaterial({
      color: HEX.laminilla,
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

    // Hueso nuevo (de y = 0 al frente) y osteoide (del frente a la superficie de apoyo).
    const matNuevo = material(HEX.huesoNuevo);
    this.huesoNuevo = new Mesh(geoCaja, matNuevo);
    this.huesoNuevo.name = 'hueso_nuevo';
    const matOsteoide = material(HEX.osteoide, { roughness: 0.5 });
    this.osteoide = new Mesh(geoCaja, matOsteoide);
    this.osteoide.name = 'osteoide';
    this.grupo.add(this.huesoNuevo, this.osteoide);

    // Frente de mineralización: una lámina finísima que se destaca en su fase.
    this.matFrente = material(HEX.frente, {
      emissive: HEX.frente,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0,
    });
    this.frente = new Mesh(geoCaja, this.matFrente);
    this.frente.name = 'frente_mineralizacion';
    this.frente.scale.set(BLOQUE.ancho + 0.03, 0.04, BLOQUE.fondo + 0.03);
    this.grupo.add(this.frente);

    // Capilar paralelo a la superficie, detrás de la fila.
    const geoCapilar = tubo(CAPILAR.radio, BLOQUE.ancho + 0.6);
    this.geometrias.push(geoCapilar);
    this.matCapilar = material(HEX.capilar, {
      roughness: 0.4,
      emissive: '#7a2a24',
      emissiveIntensity: 0.35,
    });
    this.capilar = new Mesh(geoCapilar, this.matCapilar);
    this.capilar.name = 'capilar';
    this.capilar.position.z = CAPILAR.z;
    this.grupo.add(this.capilar);

    this.materiales.push(matHueso, matNuevo, matOsteoide, this.matFrente, this.matCapilar);

    // Laguna del osteocito cortada en la cara: halo claro, célula azul y canalículos.
    this.corteLaguna = new Group();
    this.corteLaguna.name = 'corte_laguna';
    const geoDisco = disco();
    this.geometrias.push(geoDisco);
    this.matLaguna = new MeshBasicMaterial({ color: HEX.laguna, transparent: true, opacity: 0 });
    this.matOsteocito = new MeshBasicMaterial({
      color: HEX.osteocito,
      transparent: true,
      opacity: 0,
    });
    this.materiales.push(this.matLaguna, this.matOsteocito);
    const halo = new Mesh(geoDisco, this.matLaguna);
    halo.name = 'laguna';
    halo.scale.set(LAGUNA.rx, LAGUNA.ry, 1);
    halo.position.set(LAGUNA.x, LAGUNA.y, Z_CARA + 0.006);
    const cuerpo = new Mesh(geoDisco, this.matOsteocito);
    cuerpo.name = 'osteocito_corte';
    cuerpo.scale.set(LAGUNA.rx * 0.6, LAGUNA.ry * 0.6, 1);
    cuerpo.position.set(LAGUNA.x, LAGUNA.y, Z_CARA + 0.008);
    this.matCanaliculos = new LineBasicMaterial({
      color: HEX.canaliculo,
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
    this.matFrente.opacity = estado.frente;
    this.matFrente.emissiveIntensity = 0.5 * estado.frente;
    // El capilar acompaña a la superficie que sube y se desvanece mientras la protagonista está transparente
    // (si no, se vería a través de ella entre los orgánulos).
    this.capilar.position.y = deposito + CAPILAR.sobreSuperficie + CAPILAR.radio;
    const capilar = 1 - estado.transparencia;
    this.capilar.visible = capilar > 0.004;
    poner([this.matCapilar], capilar);
    // Laguna en la cara de corte.
    this.corteLaguna.visible = estado.laguna > 0.004;
    this.matLaguna.opacity = estado.laguna;
    this.matOsteocito.opacity = estado.laguna;
    this.matCanaliculos.opacity = estado.laguna * 0.9;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
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

export class FilaCelular implements PiezaOsteoblasto {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly cuerpos: Mesh[] = [];
  private readonly matCuerpos: MeshStandardMaterial[] = [];
  private readonly nucleos: InstancedMesh;
  private readonly coloresNucleos: Float32Array;
  private readonly laminas: InstancedMesh;
  private readonly globulos: InstancedMesh;
  private readonly fragmentos: InstancedMesh;
  private readonly matNucleo: MeshStandardMaterial;
  private readonly matLaminas: MeshStandardMaterial;
  private readonly matGlobulos: MeshStandardMaterial;
  private readonly matFragmentos: MeshStandardMaterial;
  private readonly piezasLaminas: readonly Pieza[];
  private readonly piezasMito: readonly Pieza[];
  private readonly vesiculas: readonly Vesicula[];
  private readonly listaFragmentos: readonly Fragmento[];
  private readonly coloresGlobulos: Float32Array;
  private readonly coloresLaminas: Float32Array;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();
  private readonly colores = {
    precursor: new Color(HEX.precursor),
    osteoblasto: new Color(HEX.osteoblasto),
    revestimiento: new Color(HEX.revestimiento),
    osteocito: new Color(HEX.osteocito),
    apoptosis: new Color(HEX.apoptosis),
  };

  constructor() {
    this.grupo.name = 'fila_celular';
    const geoCuerpo = cuerpoCelular();
    const geoEsfera = esfera();
    const geoCaja = caja();
    this.geometrias.push(geoCuerpo, geoEsfera, geoCaja);

    // Cuerpos: una malla por célula (cada una con su color y su opacidad).
    for (let k = 0; k < N_CELULAS; k++) {
      const mat = material(HEX.precursor, {
        transparent: true,
        opacity: OPACIDAD_CUERPO,
        roughness: 0.5,
      });
      const malla = new Mesh(geoCuerpo, mat);
      malla.name = `celula_${k}`;
      this.matCuerpos.push(mat);
      this.cuerpos.push(malla);
      this.grupo.add(malla);
    }

    // Núcleos (uno por célula) y el nucléolo de la protagonista, en un InstancedMesh con color por instancia.
    // El color por instancia MULTIPLICA al del material: los InstancedMesh con colores propios van en blanco.
    this.matNucleo = material('#ffffff', { roughness: 0.45 });
    this.nucleos = new InstancedMesh(geoEsfera, this.matNucleo, N_CELULAS + 1);
    this.nucleos.name = 'nucleos';
    this.coloresNucleos = new Float32Array((N_CELULAS + 1) * 3);
    this.nucleos.instanceColor = new InstancedBufferAttribute(this.coloresNucleos, 3);
    this.nucleos.instanceMatrix.setUsage(DynamicDrawUsage);
    this.nucleos.frustumCulled = false;
    const nucleo = new Color(HEX.nucleo);
    const nucleolo = new Color(HEX.nucleolo);
    for (let i = 0; i <= N_CELULAS; i++) {
      (i < N_CELULAS ? nucleo : nucleolo).toArray(this.coloresNucleos, i * 3);
    }
    this.grupo.add(this.nucleos);

    // Orgánulos laminares (retículo y Golgi) de la célula protagonista.
    this.piezasLaminas = [...cisternasDelReticulo(), ...saculosDelGolgi()];
    this.matLaminas = material('#ffffff', { transparent: true, opacity: 0, side: DoubleSide });
    this.laminas = new InstancedMesh(geoCaja, this.matLaminas, this.piezasLaminas.length);
    this.laminas.name = 'reticulo_y_golgi';
    this.coloresLaminas = new Float32Array(this.piezasLaminas.length * 3);
    this.laminas.instanceColor = new InstancedBufferAttribute(this.coloresLaminas, 3);
    this.laminas.instanceMatrix.setUsage(DynamicDrawUsage);
    this.laminas.frustumCulled = false;
    const reticulo = new Color(HEX.reticulo);
    const golgi = new Color(HEX.golgi);
    const nReticulo = cisternasDelReticulo().length;
    this.piezasLaminas.forEach((_, i) =>
      (i < nReticulo ? reticulo : golgi).toArray(this.coloresLaminas, i * 3),
    );
    this.grupo.add(this.laminas);

    // Glóbulos: mitocondrias y vesículas de secreción.
    this.piezasMito = mitocondrias();
    this.vesiculas = vesiculasDeSecrecion();
    const nGlobulos = this.piezasMito.length + this.vesiculas.length;
    this.matGlobulos = material('#ffffff', { transparent: true, opacity: 0, roughness: 0.4 });
    this.globulos = new InstancedMesh(geoEsfera, this.matGlobulos, nGlobulos);
    this.globulos.name = 'mitocondrias_y_vesiculas';
    this.coloresGlobulos = new Float32Array(nGlobulos * 3);
    this.globulos.instanceColor = new InstancedBufferAttribute(this.coloresGlobulos, 3);
    this.globulos.instanceMatrix.setUsage(DynamicDrawUsage);
    this.globulos.frustumCulled = false;
    const mito = new Color(HEX.mitocondria);
    const vesicula = new Color(HEX.vesicula);
    for (let i = 0; i < nGlobulos; i++) {
      (i < this.piezasMito.length ? mito : vesicula).toArray(this.coloresGlobulos, i * 3);
    }
    this.grupo.add(this.globulos);

    // Fragmentos de la célula apoptótica.
    this.listaFragmentos = fragmentosApoptoticos();
    this.matFragmentos = material(HEX.apoptosis, { roughness: 0.55 });
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

    // Orgánulos laminares (retículo y Golgi), locales a la célula protagonista.
    const organulos = estado.organulos;
    const hayOrganulos = organulos > 0.004;
    this.laminas.visible = hayOrganulos;
    this.globulos.visible = hayOrganulos || estado.secrecion > 0.004;
    poner([this.matLaminas], organulos);
    this.matLaminas.depthWrite = false;
    if (hayOrganulos) {
      this.piezasLaminas.forEach((pieza, i) =>
        this.ponerPieza(this.laminas, i, pieza, centroFoco, 1),
      );
      this.laminas.instanceMatrix.needsUpdate = true;
    }

    // Glóbulos: mitocondrias (con los orgánulos) y vesículas (con la secreción).
    if (this.globulos.visible) {
      poner([this.matGlobulos], Math.max(organulos, estado.secrecion));
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
    for (const m of this.matCuerpos) m.dispose();
    this.matNucleo.dispose();
    this.matLaminas.dispose();
    this.matGlobulos.dispose();
    this.matFragmentos.dispose();
    this.nucleos.dispose();
    this.laminas.dispose();
    this.globulos.dispose();
    this.fragmentos.dispose();
  }
}
