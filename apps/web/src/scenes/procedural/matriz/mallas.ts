/**
 * Las tres "escalas" de la escena de la matriz ósea, como objetos de three con `actualizar(estado)` y
 * `liberar()`:
 *
 *  - `FragmentoLaminar`: un bloque de hueso laminar, laminillas apiladas de dos tonos con rayas que insinúan
 *    la dirección alterna de sus fibras.
 *  - `LaminillasAmpliadas`: tres laminillas hechas de fibras de colágeno paralelas; de una a la siguiente las
 *    fibras cambian de dirección. La fibra central de la del medio se destaca: es la que se abre después.
 *  - `FibrillaAbierta`: una fibrilla cortada por la mitad, con sus moléculas de tropocolágeno escalonadas
 *    (modelo de Hodge-Petruska), los huecos, los cristales de hidroxiapatita, las proteínas no colágenas, las
 *    fibrillas vecinas de la fibra abierta y las flechas de tracción y de compresión.
 *
 * No calculan nada de la biología: reciben `EstadoMatriz` (puro) y solo mueven, escalan y aclaran piezas.
 * Materiales compartidos por tipo de pieza; `InstancedMesh` para todo lo repetido; al liberar se libera todo.
 */
import type { Material } from 'three';
import {
  BufferGeometry,
  Color,
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
  Vector3,
} from 'three';
import {
  PLACA,
  cristalesDeFibrilla,
  fibrasDeLaminillas,
  fibrillasVecinas,
  flechasDeCarga,
  grados,
  huecosDeFibrilla,
  moleculasDeFibrilla,
  proteinasDeFibrilla,
} from './disposicion';
import type { Flecha } from './disposicion';
import {
  ESTIRAMIENTO_MAXIMO,
  FRAGMENTO,
  GROSOR_LAMINILLA,
  LARGO_FIBRILLA,
  LARGO_HUECO,
  N_LAMINILLAS_AMPLIADAS,
  N_LAMINILLAS_FRAGMENTO,
  R_FIBRA,
  R_FIBRILLA_VECINA,
  R_MOLECULA,
  SEPARACION_LAMINILLAS,
} from './estado';
import type { EstadoMatriz } from './estado';
import { baston, flecha, globulo, placa } from './geometria';
import { HEX } from './paleta';

const EJE_X = new Vector3(1, 0, 0);
const EJE_Y = new Vector3(0, 1, 0);

/** Material estándar de doble cara. */
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

/** Aplica una opacidad a un grupo de materiales (transparentes solo mientras hace falta). */
function poner(materiales: readonly Material[], opacidad: number, base = 1): void {
  const o = Math.max(0, Math.min(1, opacidad * base));
  for (const m of materiales) {
    m.opacity = o;
    m.transparent = o < 0.995;
    m.depthWrite = o > 0.5;
  }
}

/** Interfaz común de las tres escalas. */
export interface EscalaMatriz {
  readonly grupo: Group;
  actualizar: (estado: EstadoMatriz) => void;
  liberar: () => void;
}

/** Escribe en `malla` la instancia `i`: un bastón de largo 1 en X, colocado, girado y estirado. */
function ponerBaston(
  malla: InstancedMesh,
  i: number,
  m: Matrix4,
  posicion: Vector3,
  giro: Quaternion,
  largo: number,
  grosor = 1,
): void {
  m.compose(posicion, giro, new Vector3(largo, grosor, grosor));
  malla.setMatrixAt(i, m);
}

/* -------------------------------------------------------------------------------------------
 * Fragmento de hueso laminar
 * ----------------------------------------------------------------------------------------- */

export class FragmentoLaminar implements EscalaMatriz {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matRayas: LineBasicMaterial;
  private readonly instanciados: InstancedMesh[] = [];

  constructor() {
    this.grupo.name = 'fragmento_laminar';
    const clara = material(HEX.laminillaClara);
    const oscura = material(HEX.laminillaOscura);
    this.materiales.push(clara, oscura);

    // Laminillas: cajas apiladas en Y, alternando el tono (dos InstancedMesh, uno por tono).
    const geo = placa(FRAGMENTO.ancho, GROSOR_LAMINILLA * 0.985, FRAGMENTO.fondo);
    this.geometrias.push(geo);
    const porTono: [InstancedMesh, InstancedMesh] = [
      new InstancedMesh(geo, clara, Math.ceil(N_LAMINILLAS_FRAGMENTO / 2)),
      new InstancedMesh(geo, oscura, Math.floor(N_LAMINILLAS_FRAGMENTO / 2)),
    ];
    porTono[0].name = 'laminillas_claras';
    porTono[1].name = 'laminillas_oscuras';
    const m = new Matrix4();
    const cuenta = [0, 0];
    for (let i = 0; i < N_LAMINILLAS_FRAGMENTO; i++) {
      const tono = i % 2;
      m.makeTranslation(0, this.alturaDeLaminilla(i), 0);
      porTono[tono]!.setMatrixAt(cuenta[tono]!, m);
      cuenta[tono]!++;
    }
    for (const malla of porTono) {
      malla.instanceMatrix.needsUpdate = true;
      malla.frustumCulled = false;
      this.instanciados.push(malla);
      this.grupo.add(malla);
    }

    // Rayas en la cara frontal y en la de arriba: la dirección de las fibras alterna de una laminilla a otra.
    this.matRayas = new LineBasicMaterial({ color: HEX.contornoHueso, transparent: true });
    const geoRayas = this.rayas();
    this.geometrias.push(geoRayas);
    const rayas = new LineSegments(geoRayas, this.matRayas);
    rayas.name = 'direccion_fibras';
    rayas.frustumCulled = false;
    this.grupo.add(rayas);
  }

  private alturaDeLaminilla(i: number): number {
    return -FRAGMENTO.alto / 2 + GROSOR_LAMINILLA * (i + 0.5);
  }

  /** Rayas oblicuas cortas en la cara frontal (+Z) de cada laminilla, inclinadas a un lado u otro según la laminilla. */
  private rayas(): BufferGeometry {
    const puntos: number[] = [];
    const z = FRAGMENTO.fondo / 2 + 0.004;
    const paso = 0.34;
    const medioAlto = GROSOR_LAMINILLA * 0.36;
    for (let i = 0; i < N_LAMINILLAS_FRAGMENTO; i++) {
      const y = this.alturaDeLaminilla(i);
      const inclinacion = Math.tan(grados(i % 2 === 0 ? 34 : -34)) * medioAlto;
      for (let x = -FRAGMENTO.ancho / 2 + 0.25; x < FRAGMENTO.ancho / 2 - 0.2; x += paso) {
        puntos.push(x - inclinacion, y - medioAlto, z, x + inclinacion, y + medioAlto, z);
      }
    }
    // En la cara de arriba, la última laminilla: fibras paralelas en una sola dirección.
    const yArriba = FRAGMENTO.alto / 2 + 0.004;
    const oblicua = grados(24);
    for (let x = -FRAGMENTO.ancho / 2 + 0.3; x < FRAGMENTO.ancho / 2 + 0.6; x += paso) {
      const dz = FRAGMENTO.fondo / 2;
      const dx = Math.tan(oblicua) * dz;
      const x0 = x - dx;
      const x1 = x + dx;
      if (x0 < -FRAGMENTO.ancho / 2 || x1 > FRAGMENTO.ancho / 2) continue;
      puntos.push(x0, yArriba, -dz, x1, yArriba, dz);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(puntos, 3));
    return geo;
  }

  actualizar(estado: EstadoMatriz): void {
    const visible = estado.fragmento.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    this.grupo.scale.setScalar(estado.fragmento.escala);
    poner(this.materiales, estado.fragmento.opacidad);
    this.matRayas.opacity = estado.fragmento.opacidad * 0.75;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    this.matRayas.dispose();
    for (const i of this.instanciados) i.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Laminillas ampliadas: fibras de colágeno que alternan de dirección
 * ----------------------------------------------------------------------------------------- */

export class LaminillasAmpliadas implements EscalaMatriz {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly fibras: InstancedMesh;
  private readonly matResalte: MeshStandardMaterial;
  private readonly resalte = new Color(HEX.resalte);

  constructor() {
    this.grupo.name = 'laminillas_ampliadas';
    const matFibra = material('#ffffff', { roughness: 0.55 });
    this.matResalte = material(HEX.fibraOscura, {
      roughness: 0.4,
      emissive: HEX.resalte,
      emissiveIntensity: 0,
    });
    this.materiales.push(matFibra, this.matResalte);

    const lista = fibrasDeLaminillas();
    // La fibra central de la laminilla del medio se dibuja aparte, para poder destacarla.
    const central = Math.floor(N_LAMINILLAS_AMPLIADAS / 2);
    const esCentral = (f: (typeof lista)[number]) =>
      f.laminilla === central && Math.abs(f.desvio) < 1e-9;
    const comunes = lista.filter((f) => !esCentral(f));
    const destacada = lista.find(esCentral);

    const geo = baston(R_FIBRA, 10);
    this.geometrias.push(geo);
    this.fibras = new InstancedMesh(geo, matFibra, comunes.length);
    this.fibras.name = 'fibras_colageno';
    this.fibras.frustumCulled = false;
    const m = new Matrix4();
    const q = new Quaternion();
    const pos = new Vector3();
    const clara = new Color(HEX.fibraClara);
    const oscura = new Color(HEX.fibraOscura);
    comunes.forEach((f, i) => {
      pos.set(f.x, this.alturaDeLaminilla(f.laminilla), f.z);
      // Giro alrededor de Y: el ángulo se mide de X hacia Z, y girar +θ alrededor de Y lleva X hacia -Z.
      q.setFromAxisAngle(EJE_Y, -f.angulo);
      ponerBaston(this.fibras, i, m, pos, q, f.largo);
      this.fibras.setColorAt(i, f.laminilla % 2 === 0 ? clara : oscura);
    });
    this.fibras.instanceMatrix.needsUpdate = true;
    if (this.fibras.instanceColor) this.fibras.instanceColor.needsUpdate = true;
    this.grupo.add(this.fibras);

    if (destacada) {
      const geoDestacada = baston(R_FIBRA * 1.08, 12);
      this.geometrias.push(geoDestacada);
      const malla = new Mesh(geoDestacada, this.matResalte);
      malla.name = 'fibra_destacada';
      malla.position.set(destacada.x, this.alturaDeLaminilla(destacada.laminilla), destacada.z);
      malla.scale.set(destacada.largo, 1, 1);
      this.grupo.add(malla);
    }
  }

  private alturaDeLaminilla(i: number): number {
    return (i - (N_LAMINILLAS_AMPLIADAS - 1) / 2) * SEPARACION_LAMINILLAS;
  }

  actualizar(estado: EstadoMatriz): void {
    const visible = estado.laminillas.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    this.grupo.scale.setScalar(estado.laminillas.escala);
    poner(this.materiales, estado.laminillas.opacidad);
    this.matResalte.emissive.copy(this.resalte);
    this.matResalte.emissiveIntensity = 0.9 * estado.resalteFibra;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    this.fibras.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Fibrilla abierta: moléculas, huecos, mineral, proteínas, vecinas y flechas
 * ----------------------------------------------------------------------------------------- */

export class FibrillaAbierta implements EscalaMatriz {
  readonly grupo = new Group();
  /** Lo que se estira con la tracción: moléculas, huecos, cristales y proteínas. */
  private readonly cuerpo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matVecinas: MeshStandardMaterial;
  private readonly matHuecos: MeshStandardMaterial;
  private readonly matCristales: MeshStandardMaterial;
  private readonly matProteinas: MeshStandardMaterial;
  private readonly matFlechas: MeshStandardMaterial;
  private readonly moleculas: InstancedMesh;
  private readonly vecinas: InstancedMesh;
  private readonly huecos: InstancedMesh;
  private readonly cristales: InstancedMesh;
  private readonly proteinas: InstancedMesh;
  private readonly flechas: InstancedMesh;
  private readonly datosHuecos = huecosDeFibrilla();
  private readonly datosCristales = cristalesDeFibrilla();
  private readonly datosProteinas = proteinasDeFibrilla(this.datosCristales);
  private ultimoHuecos = -1;
  private ultimoMineral = -1;
  private ultimoProteinas = -1;
  private ultimasFlechas = -1;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly pos = new Vector3();
  private readonly esc = new Vector3();

  constructor() {
    this.grupo.name = 'fibrilla_abierta';
    this.cuerpo.name = 'fibrilla_cuerpo';

    const matMoleculas = material('#ffffff', { roughness: 0.5 });
    this.matVecinas = material(HEX.fibrillaVecina, { roughness: 0.7 });
    this.matHuecos = material(HEX.hueco, {
      roughness: 0.4,
      emissive: HEX.hueco,
      emissiveIntensity: 0.35,
    });
    this.matCristales = material(HEX.cristal, { roughness: 0.25 });
    this.matProteinas = material('#ffffff', { roughness: 0.45 });
    this.matFlechas = material('#ffffff', { roughness: 0.5 });
    this.materiales.push(
      matMoleculas,
      this.matVecinas,
      this.matHuecos,
      this.matCristales,
      this.matProteinas,
      this.matFlechas,
    );

    // Moléculas de tropocolágeno: bastones escalonados; las filas alternan dos tonos para leer el escalonado.
    const moleculas = moleculasDeFibrilla();
    const geoMolecula = baston(R_MOLECULA, 6);
    this.geometrias.push(geoMolecula);
    this.moleculas = new InstancedMesh(geoMolecula, matMoleculas, moleculas.length);
    this.moleculas.name = 'moleculas_tropocolageno';
    const tonoA = new Color(HEX.molecula);
    const tonoB = new Color(HEX.moleculaClara);
    moleculas.forEach((mol, i) => {
      this.pos.set(mol.x, mol.y, mol.z);
      this.q.identity();
      ponerBaston(this.moleculas, i, this.m, this.pos, this.q, mol.largo);
      this.moleculas.setColorAt(i, ((mol.fila % 2) + 2) % 2 === 0 ? tonoA : tonoB);
    });
    this.terminar(this.moleculas);
    this.cuerpo.add(this.moleculas);

    // Fibrillas vecinas: cilindros lisos detrás y a los lados de la abierta.
    const vecinas = fibrillasVecinas();
    const geoVecina = baston(R_FIBRILLA_VECINA, 18);
    this.geometrias.push(geoVecina);
    this.vecinas = new InstancedMesh(geoVecina, this.matVecinas, vecinas.length);
    this.vecinas.name = 'fibrillas_vecinas';
    vecinas.forEach((v, i) => {
      this.pos.set(0, v.y, v.z);
      this.q.identity();
      ponerBaston(this.vecinas, i, this.m, this.pos, this.q, LARGO_FIBRILLA * 1.04);
    });
    this.terminar(this.vecinas);
    this.grupo.add(this.vecinas);

    // Huecos: cajitas celestes en el plano de corte, entre el final de una molécula y el principio de la siguiente.
    const geoHueco = placa(LARGO_HUECO * 0.92, R_MOLECULA * 2.6, R_MOLECULA * 2.2);
    this.geometrias.push(geoHueco);
    this.huecos = new InstancedMesh(geoHueco, this.matHuecos, this.datosHuecos.length);
    this.huecos.name = 'zonas_hueco';
    this.cuerpo.add(this.huecos);

    // Cristales de hidroxiapatita: placas finas.
    const geoCristal = placa(PLACA.largo, PLACA.alto, PLACA.grosor);
    this.geometrias.push(geoCristal);
    this.cristales = new InstancedMesh(geoCristal, this.matCristales, this.datosCristales.length);
    this.cristales.name = 'cristales_hidroxiapatita';
    this.cuerpo.add(this.cristales);

    // Proteínas no colágenas: glóbulos de tres colores pegados a los cristales.
    const geoProteina = globulo();
    this.geometrias.push(geoProteina);
    this.proteinas = new InstancedMesh(geoProteina, this.matProteinas, this.datosProteinas.length);
    this.proteinas.name = 'proteinas_no_colagenas';
    const colores = HEX.proteinas.map((h) => new Color(h));
    this.datosProteinas.forEach((p, i) => this.proteinas.setColorAt(i, colores[p.tipo]!));
    if (this.proteinas.instanceColor) this.proteinas.instanceColor.needsUpdate = true;
    this.cuerpo.add(this.proteinas);

    // Flechas de tracción (naranja) y de compresión (azul).
    const flechas = flechasDeCarga();
    const geoFlecha = flecha();
    this.geometrias.push(geoFlecha);
    this.flechas = new InstancedMesh(geoFlecha, this.matFlechas, flechas.length);
    this.flechas.name = 'flechas_carga';
    const traccion = new Color(HEX.traccion);
    const compresion = new Color(HEX.compresion);
    flechas.forEach((f, i) =>
      this.flechas.setColorAt(i, f.tipo === 'traccion' ? traccion : compresion),
    );
    if (this.flechas.instanceColor) this.flechas.instanceColor.needsUpdate = true;
    this.grupo.add(this.flechas);

    for (const malla of [this.huecos, this.cristales, this.proteinas, this.flechas]) {
      malla.frustumCulled = false;
    }
    this.grupo.add(this.cuerpo);
    this.ponerHuecos(0);
    this.ponerCristales(0);
    this.ponerProteinas(0);
    this.ponerFlechas(0, 0);
  }

  private terminar(malla: InstancedMesh): void {
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    malla.frustumCulled = false;
  }

  private ponerHuecos(enfasis: number): void {
    if (Math.abs(enfasis - this.ultimoHuecos) < 1e-4) return;
    this.ultimoHuecos = enfasis;
    const k = 0.2 + 0.8 * enfasis;
    this.q.identity();
    this.datosHuecos.forEach((h, i) => {
      this.pos.set(h.x, h.y, h.z);
      this.esc.set(1, k, k);
      this.m.compose(this.pos, this.q, this.esc);
      this.huecos.setMatrixAt(i, this.m);
    });
    this.huecos.instanceMatrix.needsUpdate = true;
  }

  private ponerCristales(crecimiento: number): void {
    if (Math.abs(crecimiento - this.ultimoMineral) < 1e-4) return;
    this.ultimoMineral = crecimiento;
    const k = Math.max(1e-3, crecimiento);
    this.datosCristales.forEach((c, i) => {
      this.pos.set(c.x, c.y, c.z);
      this.q.setFromAxisAngle(EJE_X, c.giro);
      // Las placas de los huecos crecen desde el hueco; las de la superficie, un poco después.
      const propio = c.enHueco ? k : Math.max(1e-3, (crecimiento - 0.25) / 0.75);
      this.esc.setScalar(c.escala * propio);
      this.m.compose(this.pos, this.q, this.esc);
      this.cristales.setMatrixAt(i, this.m);
    });
    this.cristales.instanceMatrix.needsUpdate = true;
  }

  private ponerProteinas(aparicion: number): void {
    if (Math.abs(aparicion - this.ultimoProteinas) < 1e-4) return;
    this.ultimoProteinas = aparicion;
    const k = Math.max(1e-3, aparicion);
    this.q.identity();
    this.datosProteinas.forEach((p, i) => {
      this.pos.set(p.x, p.y, p.z);
      this.esc.setScalar(p.radio * k);
      this.m.compose(this.pos, this.q, this.esc);
      this.proteinas.setMatrixAt(i, this.m);
    });
    this.proteinas.instanceMatrix.needsUpdate = true;
  }

  private ponerFlechas(aparicion: number, estiramiento: number): void {
    const clave = aparicion * 8 + estiramiento;
    if (Math.abs(clave - this.ultimasFlechas) < 1e-4) return;
    this.ultimasFlechas = clave;
    const k = Math.max(1e-3, aparicion);
    const lista: Flecha[] = flechasDeCarga(estiramiento);
    const dir = new Vector3();
    lista.forEach((f, i) => {
      this.pos.set(f.x, f.y, f.z);
      dir.set(f.dx, f.dy, f.dz);
      this.q.setFromUnitVectors(EJE_X, dir);
      this.esc.set(f.largo * k, k, k);
      this.m.compose(this.pos, this.q, this.esc);
      this.flechas.setMatrixAt(i, this.m);
    });
    this.flechas.instanceMatrix.needsUpdate = true;
  }

  actualizar(estado: EstadoMatriz): void {
    const visible = estado.fibrilla.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    this.grupo.scale.setScalar(estado.fibrilla.escala);
    // La tracción estira ligeramente el cuerpo de la fibrilla (no las vecinas ni las flechas).
    this.cuerpo.scale.set(1 + ESTIRAMIENTO_MAXIMO * estado.estiramiento, 1, 1);
    poner(this.materiales, estado.fibrilla.opacidad);
    poner([this.matVecinas], estado.fibrilla.opacidad, estado.vecinas);
    poner([this.matHuecos], estado.fibrilla.opacidad, estado.huecos);
    this.matHuecos.emissiveIntensity = 0.15 + 0.45 * estado.huecos;
    poner([this.matCristales], estado.fibrilla.opacidad, Math.min(1, estado.mineral * 3));
    poner([this.matProteinas], estado.fibrilla.opacidad, Math.min(1, estado.proteinas * 3));
    poner([this.matFlechas], estado.fibrilla.opacidad, Math.min(1, estado.flechas * 3));
    this.huecos.visible = estado.huecos > 0.004;
    this.cristales.visible = estado.mineral > 0.004;
    this.proteinas.visible = estado.proteinas > 0.004;
    this.flechas.visible = estado.flechas > 0.004;
    this.vecinas.visible = estado.vecinas > 0.004;
    this.ponerHuecos(estado.huecos);
    this.ponerCristales(estado.mineral);
    this.ponerProteinas(estado.proteinas);
    this.ponerFlechas(estado.flechas, estado.estiramiento);
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    for (const i of [
      this.moleculas,
      this.vecinas,
      this.huecos,
      this.cristales,
      this.proteinas,
      this.flechas,
    ]) {
      i.dispose();
    }
  }
}
