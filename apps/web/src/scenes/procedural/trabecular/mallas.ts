/**
 * Las piezas de la escena del hueso trabecular, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `RedTrabecular`: todas las placas (cuatro tiras instanciadas por placa, que se separan para abrir el agujero
 *    de la perforación) y todas las barras (cilindros instanciados que se acortan hasta un muñón al cortarse).
 *  - `CorticalSuperior`: la lámina de cortical que tapa el cubo y sus poros.
 *  - `Medula`: el relleno translúcido entre las trabéculas, que se vuelve graso con los años.
 *  - `BmuTrabeculares`: dos o tres unidades de remodelado sobre placas de la cara frontal (hoyo con osteoclastos,
 *    hoyo que los osteoblastos rellenan con osteoide).
 *  - `FlechaCarga`: la flecha que comprime desde arriba.
 *  - `CuboTrabecular`: une las anteriores; con `fantasma: true` es el cubo joven translúcido de la comparación.
 *
 * No calculan nada de la biología: reciben `EstadoTrabecular` (puro) y las reglas por trabécula de
 * `disposicion.ts`, y solo colocan, escalan, colorean y aclaran instancias. Materiales compartidos por pieza; al
 * liberar se libera todo lo creado. Cada `actualizar` recoloca ~1 000 instancias solo si cambió algún factor.
 */
import type { Material, BufferGeometry } from 'three';
import {
  BackSide,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import {
  AGUJERO_MAXIMO,
  agujeroDePlaca,
  grosorDePlaca,
  porosDeCortical,
  presenciaDeBarra,
  radioDeBarra,
  redTrabecular,
} from './disposicion';
import type { Barra, Placa, RedTrabecularDatos } from './disposicion';
import { APLASTAMIENTO, GROSOR_CORTICAL, LADO, N_BMU, RED_JOVEN } from './estado';
import type { EstadoTrabecular, FactoresRed } from './estado';
import { cajaUnidad, cilindroUnidad, discoUnidad, esferaUnidad, flecha } from './geometria';
import { HEX } from './paleta';

const MITAD = LADO / 2;
const EJE_X = new Vector3(1, 0, 0);
const EJE_Y = new Vector3(0, 1, 0);
const EJE_Z = new Vector3(0, 0, 1);
/** Escala de una instancia que no debe verse (una matriz de escala 0 daría normales inválidas). */
const OCULTA = 1e-4;
/** Radio del hoyo de una BMU trabecular. */
const R_HOYO = 0.135;

function material(
  color: string,
  extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {},
): MeshStandardMaterial {
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

/** Interfaz común de las piezas. */
export interface PiezaTrabecular {
  readonly grupo: Group;
  actualizar: (estado: EstadoTrabecular) => void;
  liberar: () => void;
}

export interface OpcionesCubo {
  /** El cubo joven translúcido que se muestra al lado para comparar. */
  fantasma: boolean;
}

/* -------------------------------------------------------------------------------------------
 * Colocación de instancias (auxiliares reutilizados, sin reservar memoria por fotograma)
 * ----------------------------------------------------------------------------------------- */

const m4 = new Matrix4();
const qA = new Quaternion();
const qC = new Quaternion();
const vA = new Vector3();
const vB = new Vector3();
const colorA = new Color();
const colorB = new Color();

/**
 * Escribe en la instancia `i` una pieza con centro `centro`, orientación `q`, un giro extra `qExtra` (o null)
 * alrededor del centro, desplazada `desplazamiento` en el marco de la pieza y con `escala`.
 */
function colocar(
  malla: InstancedMesh,
  i: number,
  centro: Vector3,
  q: Quaternion,
  qExtra: Quaternion | null,
  desplazamiento: Vector3,
  escala: Vector3,
): void {
  qC.copy(q);
  if (qExtra) qC.multiply(qExtra);
  vB.copy(desplazamiento).applyQuaternion(qC).add(centro);
  m4.compose(vB, qC, escala);
  malla.setMatrixAt(i, m4);
}

/* -------------------------------------------------------------------------------------------
 * Red de placas y barras
 * ----------------------------------------------------------------------------------------- */

const TIRAS_POR_PLACA = 4;

export class RedTrabecular {
  readonly grupo = new Group();
  readonly placas: InstancedMesh;
  readonly barras: InstancedMesh;
  readonly datos: RedTrabecularDatos;
  private readonly geometrias: BufferGeometry[] = [];
  readonly materiales: MeshStandardMaterial[] = [];
  private readonly fantasma: boolean;
  private readonly orientaciones: Quaternion[];
  private readonly orientacionesBarras: Quaternion[];
  private ultimo: [number, number, number, number] | null = null;

  constructor(fantasma: boolean, datos: RedTrabecularDatos = redTrabecular()) {
    this.fantasma = fantasma;
    this.datos = datos;
    this.grupo.name = fantasma ? 'red_trabecular_joven' : 'red_trabecular';

    const geoCaja = cajaUnidad();
    const geoBarra = cilindroUnidad(7);
    this.geometrias.push(geoCaja, geoBarra);

    const matPlacas = fantasma
      ? material(HEX.fantasma, { roughness: 0.5, transparent: true, depthWrite: false })
      : material('#ffffff', { roughness: 0.68 });
    const matBarras = fantasma ? matPlacas : material(HEX.barra, { roughness: 0.7 });
    this.materiales.push(matPlacas);
    if (matBarras !== matPlacas) this.materiales.push(matBarras);

    this.placas = new InstancedMesh(geoCaja, matPlacas, datos.placas.length * TIRAS_POR_PLACA);
    this.placas.name = 'placas';
    this.placas.frustumCulled = false;
    this.barras = new InstancedMesh(geoBarra, matBarras, datos.barras.length);
    this.barras.name = 'barras';
    this.barras.frustumCulled = false;

    // Orientación fija de cada placa: normal en Z o en X, más su giro y su cabeceo pequeños.
    this.orientaciones = datos.placas.map((p) => {
      const q = new Quaternion().setFromAxisAngle(EJE_Y, p.giro);
      if (p.normal === 'x') q.multiply(qA.setFromAxisAngle(EJE_Y, Math.PI / 2));
      return q.multiply(qA.setFromAxisAngle(EJE_X, p.cabeceo));
    });
    // Orientación fija de cada barra: el eje Y del cilindro se tumba en X o en Z y se inclina un poco.
    this.orientacionesBarras = datos.barras.map((b) => {
      const q =
        b.eje === 'x'
          ? new Quaternion().setFromAxisAngle(EJE_Z, b.inclinacion - Math.PI / 2)
          : new Quaternion().setFromAxisAngle(EJE_X, Math.PI / 2 + b.inclinacion);
      return q;
    });

    // Colores base por placa (solo el cubo que envejece: el fantasma es de un solo color translúcido).
    if (!fantasma) {
      colorA.set(HEX.placa);
      colorB.set(HEX.barra);
      datos.placas.forEach((p, i) => {
        const c = colorA.clone().lerp(colorB, 0.45 * (1 - p.vida));
        for (let k = 0; k < TIRAS_POR_PLACA; k++)
          this.placas.setColorAt(i * TIRAS_POR_PLACA + k, c);
      });
    }

    this.grupo.add(this.placas, this.barras);
    this.actualizar(RED_JOVEN, 0);
  }

  /** Recoloca todas las tiras y barras según los factores globales y la rotura (0 a 1) de las microfracturas. */
  actualizar(red: FactoresRed, rotura: number): void {
    const clave: [number, number, number, number] = [
      red.grosor,
      red.barras,
      red.perforacion,
      rotura,
    ];
    if (this.ultimo && clave.every((v, i) => Math.abs(v - this.ultimo![i]!) < 1e-6)) return;
    this.ultimo = clave;
    this.datos.placas.forEach((p, i) => this.colocarPlaca(p, i, red, rotura));
    this.datos.barras.forEach((b, i) => this.colocarBarra(b, i, red));
    this.placas.instanceMatrix.needsUpdate = true;
    this.barras.instanceMatrix.needsUpdate = true;
    if (this.placas.instanceColor) this.placas.instanceColor.needsUpdate = true;
  }

  private colocarPlaca(p: Placa, i: number, red: FactoresRed, rotura: number): void {
    const q = this.orientaciones[i]!;
    const g = grosorDePlaca(p, red);
    const h = agujeroDePlaca(p, red);
    const anchoAgujero = h * AGUJERO_MAXIMO * p.ancho;
    const altoAgujero = h * AGUJERO_MAXIMO * p.alto;
    const rota = p.microfractura && rotura > 1e-4;
    const angulo = rota ? 0.5 * rotura : 0;
    const base = i * TIRAS_POR_PLACA;
    vA.set(p.x, p.y, p.z);

    // Tiras superior e inferior: enteras cuando no hay agujero; al romperse se quiebran hacia fuera del plano.
    for (const signo of [1, -1] as const) {
      const qExtra = rota ? qA.setFromAxisAngle(EJE_X, signo * angulo) : null;
      colocar(
        this.placas,
        base + (signo === 1 ? 0 : 1),
        vA,
        q,
        qExtra,
        vB.set(0, (signo * (p.alto + altoAgujero)) / 4, rota ? signo * 0.05 * rotura : 0),
        new Vector3(p.ancho, (p.alto - altoAgujero) / 2, g),
      );
    }
    // Tiras laterales: solo existen cuando hay agujero (antes quedan escondidas dentro de la placa).
    const altoLateral = Math.max(altoAgujero, OCULTA);
    for (const signo of [1, -1] as const) {
      colocar(
        this.placas,
        base + (signo === 1 ? 2 : 3),
        vA,
        q,
        null,
        vB.set((signo * (p.ancho + anchoAgujero)) / 4, 0, 0),
        new Vector3((p.ancho - anchoAgujero) / 2, altoLateral, g * 0.98),
      );
    }
    if (!this.fantasma && p.microfractura) {
      // La placa rota se enciende en rojo a medida que se rompe.
      colorA.set(HEX.placa).lerp(colorB.set(HEX.barra), 0.45 * (1 - p.vida));
      colorA.lerp(colorB.set(HEX.microfractura), rotura);
      for (let k = 0; k < TIRAS_POR_PLACA; k++) this.placas.setColorAt(base + k, colorA);
    }
  }

  private colocarBarra(b: Barra, i: number, red: FactoresRed): void {
    const k = presenciaDeBarra(b, red);
    const r = radioDeBarra(b, red);
    vA.set(b.x, b.y, b.z);
    if (k < 0.02) {
      m4.compose(vA, this.orientacionesBarras[i]!, vB.set(OCULTA, OCULTA, OCULTA));
      this.barras.setMatrixAt(i, m4);
      return;
    }
    // El muñón se conserva por el extremo `extremo`: el centro se corre hacia él.
    const corrimiento = (b.extremo * b.largo * (1 - k)) / 2;
    if (b.eje === 'x') vA.x += corrimiento;
    else vA.z += corrimiento;
    m4.compose(vA, this.orientacionesBarras[i]!, vB.set(r, b.largo * k, r));
    this.barras.setMatrixAt(i, m4);
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    this.placas.dispose();
    this.barras.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Cortical superior
 * ----------------------------------------------------------------------------------------- */

export class CorticalSuperior {
  readonly grupo = new Group();
  readonly materiales: MeshStandardMaterial[] = [];
  private readonly geometrias: BufferGeometry[] = [];
  private readonly lamina: Mesh;
  private readonly poros: InstancedMesh;
  private readonly datosPoros = porosDeCortical();
  /** Grosor actual (unidades de escena), para que la flecha se apoye encima. */
  grosorActual = GROSOR_CORTICAL;

  constructor(fantasma: boolean) {
    this.grupo.name = fantasma ? 'cortical_joven' : 'cortical_superior';
    const geoCaja = cajaUnidad();
    const geoPoro = cilindroUnidad(8);
    this.geometrias.push(geoCaja, geoPoro);
    const mat = fantasma
      ? material(HEX.fantasma, { roughness: 0.5, transparent: true, depthWrite: false })
      : material(HEX.cortical, { roughness: 0.6 });
    const matPoro = material(HEX.poro, { roughness: 0.9 });
    this.materiales.push(mat, matPoro);
    this.lamina = new Mesh(geoCaja, mat);
    this.lamina.name = 'lamina_cortical';
    this.poros = new InstancedMesh(geoPoro, matPoro, this.datosPoros.length);
    this.poros.name = 'poros_corticales';
    this.poros.frustumCulled = false;
    this.grupo.add(this.lamina, this.poros);
    this.actualizar({ grosor: 1, porosidad: 0 });
  }

  actualizar(cortical: EstadoTrabecular['cortical']): void {
    const g = GROSOR_CORTICAL * Math.max(0.2, cortical.grosor);
    this.grosorActual = g;
    const y = MITAD + g / 2;
    this.lamina.position.set(0, y, 0);
    this.lamina.scale.set(LADO + 0.02, g, LADO + 0.02);
    this.poros.visible = cortical.porosidad > 0.01;
    qA.identity();
    this.datosPoros.forEach((p, i) => {
      const r = p.radio * cortical.porosidad;
      m4.compose(vA.set(p.x, y, p.z), qA, vB.set(r, g * 1.04, r));
      this.poros.setMatrixAt(i, m4);
    });
    this.poros.instanceMatrix.needsUpdate = true;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    this.poros.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Médula
 * ----------------------------------------------------------------------------------------- */

export class Medula {
  readonly grupo = new Group();
  readonly materiales: MeshStandardMaterial[] = [];
  private readonly geometria: BufferGeometry;
  private readonly joven = new Color(HEX.medula);
  private readonly grasa = new Color(HEX.medulaGrasa);

  constructor() {
    this.grupo.name = 'medula';
    this.geometria = cajaUnidad();
    // Solo las caras de atrás: la médula se ve como el fondo de la biopsia, sin velar las trabéculas de delante.
    const mat = material(HEX.medula, {
      roughness: 0.95,
      side: BackSide,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.materiales.push(mat);
    const caja = new Mesh(this.geometria, mat);
    caja.name = 'medula_osea';
    caja.scale.setScalar(LADO - 0.01);
    caja.renderOrder = -1;
    this.grupo.add(caja);
  }

  actualizar(medula: EstadoTrabecular['medula']): void {
    this.materiales[0]!.color.copy(this.joven).lerp(this.grasa, medula.adiposidad);
  }

  liberar(): void {
    this.geometria.dispose();
    for (const m of this.materiales) m.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * BMU trabeculares
 * ----------------------------------------------------------------------------------------- */

const OSTEOCLASTOS_POR_HOYO = 2;
const NUCLEOS_POR_OSTEOCLASTO = 3;
const OSTEOBLASTOS_POR_HOYO = 5;

export class BmuTrabeculares {
  readonly grupo = new Group();
  readonly materiales: MeshStandardMaterial[] = [];
  private readonly geometrias: BufferGeometry[] = [];
  private readonly hoyos: InstancedMesh;
  private readonly osteoide: InstancedMesh;
  private readonly celulas: InstancedMesh;
  private readonly sitios: Placa[];

  constructor(datos: RedTrabecularDatos) {
    this.grupo.name = 'bmu_trabeculares';
    this.sitios = datos.placas.filter((p) => p.bmu !== null).slice(0, N_BMU);
    const enResorcion = this.sitios.filter((p) => p.bmu === 'resorcion').length;
    const enFormacion = this.sitios.length - enResorcion;

    const geoDisco = discoUnidad();
    const geoEsfera = esferaUnidad();
    this.geometrias.push(geoDisco, geoEsfera);
    const matHoyo = material(HEX.hoyo, { roughness: 0.85 });
    const matOsteoide = material(HEX.osteoide, { roughness: 0.5 });
    const matCelulas = material('#ffffff', { roughness: 0.45 });
    this.materiales.push(matHoyo, matOsteoide, matCelulas);

    this.hoyos = new InstancedMesh(geoDisco, matHoyo, Math.max(1, this.sitios.length));
    this.hoyos.name = 'hoyos_resorcion';
    this.osteoide = new InstancedMesh(geoDisco, matOsteoide, Math.max(1, enFormacion));
    this.osteoide.name = 'osteoide';
    const nCelulas =
      enResorcion * OSTEOCLASTOS_POR_HOYO * (1 + NUCLEOS_POR_OSTEOCLASTO) +
      enFormacion * OSTEOBLASTOS_POR_HOYO;
    this.celulas = new InstancedMesh(geoEsfera, matCelulas, Math.max(1, nCelulas));
    this.celulas.name = 'celulas_bmu';
    for (const m of [this.hoyos, this.osteoide, this.celulas]) m.frustumCulled = false;
    this.grupo.add(this.hoyos, this.osteoide, this.celulas);
  }

  actualizar(estado: EstadoTrabecular): void {
    this.grupo.visible = estado.bmu.opacidad > 0.004;
    poner(this.materiales, estado.bmu.opacidad);
    qA.identity();
    let iOsteoide = 0;
    let iCelula = 0;
    this.sitios.forEach((p, i) => {
      // La BMU se apoya en la cara frontal de su placa, que se adelgaza con los años.
      const cara = p.z + grosorDePlaca(p, estado.red) / 2;
      const r = p.bmu === 'resorcion' ? R_HOYO * estado.bmu.excavacion : R_HOYO;
      m4.compose(vA.set(p.x, p.y, cara + 0.003), qA, vB.set(r, r, 1));
      this.hoyos.setMatrixAt(i, m4);
      if (p.bmu === 'resorcion') {
        for (let k = 0; k < OSTEOCLASTOS_POR_HOYO; k++) {
          const cx = p.x + (k - 0.5) * r * 0.95;
          const cy = p.y + (k === 0 ? -0.02 : 0.03);
          m4.compose(vA.set(cx, cy, cara + 0.035), qA, vB.set(r * 0.5, r * 0.36, 0.04));
          this.celulas.setColorAt(iCelula, colorA.set(HEX.osteoclasto));
          this.celulas.setMatrixAt(iCelula++, m4);
          for (let n = 0; n < NUCLEOS_POR_OSTEOCLASTO; n++) {
            const a = (n / NUCLEOS_POR_OSTEOCLASTO) * Math.PI * 2 + k;
            m4.compose(
              vA.set(cx + Math.cos(a) * r * 0.22, cy + Math.sin(a) * r * 0.14, cara + 0.07),
              qA,
              vB.set(0.014, 0.014, 0.012),
            );
            this.celulas.setColorAt(iCelula, colorA.set(HEX.nucleo));
            this.celulas.setMatrixAt(iCelula++, m4);
          }
        }
      } else {
        // El osteoide rellena el hoyo desde el fondo; los osteoblastos se alinean en el borde.
        const relleno = Math.max(OCULTA, r * 0.94 * estado.bmu.relleno);
        m4.compose(vA.set(p.x, p.y, cara + 0.006), qA, vB.set(relleno, relleno, 1));
        this.osteoide.setMatrixAt(iOsteoide++, m4);
        for (let k = 0; k < OSTEOBLASTOS_POR_HOYO; k++) {
          const a = Math.PI * (0.15 + (0.7 * k) / (OSTEOBLASTOS_POR_HOYO - 1)) + (i % 2) * Math.PI;
          m4.compose(
            vA.set(p.x + Math.cos(a) * r * 1.05, p.y + Math.sin(a) * r * 1.05, cara + 0.03),
            qA,
            vB.set(0.04, 0.032, 0.03),
          );
          this.celulas.setColorAt(iCelula, colorA.set(HEX.osteoblasto));
          this.celulas.setMatrixAt(iCelula++, m4);
        }
      }
    });
    this.hoyos.instanceMatrix.needsUpdate = true;
    this.osteoide.instanceMatrix.needsUpdate = true;
    this.celulas.instanceMatrix.needsUpdate = true;
    if (this.celulas.instanceColor) this.celulas.instanceColor.needsUpdate = true;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    this.hoyos.dispose();
    this.osteoide.dispose();
    this.celulas.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Flecha de carga
 * ----------------------------------------------------------------------------------------- */

const LARGO_FLECHA = 1.3;

export class FlechaCarga {
  readonly grupo = new Group();
  readonly materiales: MeshStandardMaterial[] = [];
  private readonly geometria: BufferGeometry;

  constructor() {
    this.grupo.name = 'flecha_carga';
    this.geometria = flecha(LARGO_FLECHA, 0.075);
    const mat = material(HEX.flecha, {
      roughness: 0.4,
      emissive: HEX.flecha,
      emissiveIntensity: 0.25,
    });
    this.materiales.push(mat);
    const malla = new Mesh(this.geometria, mat);
    malla.name = 'flecha';
    this.grupo.add(malla);
  }

  /** `flecha` de 0 (no está) a 1 (apoyada en `techo`, la altura de la cortical). */
  actualizar(flecha: number, techo: number): void {
    this.grupo.visible = flecha > 0.004;
    this.grupo.position.set(0, techo + 0.03 + (1 - flecha) * 0.8, 0);
    poner(this.materiales, flecha);
  }

  liberar(): void {
    this.geometria.dispose();
    for (const m of this.materiales) m.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * El cubo completo
 * ----------------------------------------------------------------------------------------- */

export class CuboTrabecular implements PiezaTrabecular {
  readonly grupo = new Group();
  /** Lo que se aplasta bajo la carga (todo menos la flecha). */
  private readonly cuerpo = new Group();
  private readonly red: RedTrabecular;
  private readonly cortical: CorticalSuperior;
  private readonly medula: Medula | null;
  private readonly bmu: BmuTrabeculares | null;
  private readonly flecha = new FlechaCarga();
  private readonly fantasma: boolean;
  private readonly translucidos: Material[];

  constructor(opciones: OpcionesCubo) {
    this.fantasma = opciones.fantasma;
    this.grupo.name = opciones.fantasma ? 'cubo_joven_fantasma' : 'cubo_trabecular';
    const datos = redTrabecular();
    this.red = new RedTrabecular(opciones.fantasma, datos);
    this.cortical = new CorticalSuperior(opciones.fantasma);
    this.medula = opciones.fantasma ? null : new Medula();
    this.bmu = opciones.fantasma ? null : new BmuTrabeculares(datos);
    this.translucidos = opciones.fantasma
      ? [...this.red.materiales, ...this.cortical.materiales]
      : [];
    this.cuerpo.add(this.red.grupo, this.cortical.grupo);
    if (this.medula) this.cuerpo.add(this.medula.grupo);
    if (this.bmu) this.cuerpo.add(this.bmu.grupo);
    this.grupo.add(this.cuerpo, this.flecha.grupo);
  }

  actualizar(estado: EstadoTrabecular): void {
    let compresion: number;
    if (this.fantasma) {
      this.grupo.visible = estado.fantasma.opacidad > 0.004;
      this.red.actualizar(RED_JOVEN, 0);
      this.cortical.actualizar({ grosor: 1, porosidad: 0 });
      poner(this.translucidos, estado.fantasma.opacidad);
      for (const m of this.translucidos) m.depthWrite = false;
      compresion = APLASTAMIENTO.joven * estado.carga.compresion;
    } else {
      this.grupo.visible = true;
      this.red.actualizar(estado.red, estado.carga.rotura);
      this.cortical.actualizar(estado.cortical);
      this.medula?.actualizar(estado.medula);
      this.bmu?.actualizar(estado);
      compresion = APLASTAMIENTO.envejecido * estado.carga.compresion;
    }
    // Se aplasta desde arriba: la base no se mueve y los lados abomban un poco.
    this.cuerpo.scale.set(1 + 0.3 * compresion, 1 - compresion, 1 + 0.3 * compresion);
    this.cuerpo.position.y = -MITAD * compresion;
    const techo = (MITAD + this.cortical.grosorActual) * (1 - compresion) - MITAD * compresion;
    this.flecha.actualizar(estado.carga.flecha, techo);
  }

  liberar(): void {
    this.red.liberar();
    this.cortical.liberar();
    this.medula?.liberar();
    this.bmu?.liberar();
    this.flecha.liberar();
  }
}
