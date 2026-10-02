/**
 * Las tres piezas de la escena de la vesícula de matriz, como objetos de three con `actualizar(estado)` y
 * `liberar()`:
 *
 *  - `Osteoblasto`: la membrana basal ondulada con parte del citoplasma encima, las enzimas ancladas a su cara
 *    externa (TNAP, ENPP1, ANK) y, al final, las PPi que la TNAP corta en dos Pi y las que ENPP1 acaba de formar.
 *  - `Osteoide`: las fibrillas de colágeno con su bandeo, las placas de mineral que se depositan en los huecos del
 *    bandeo, las vesículas vecinas con sus cristales y el pirofosfato pegado a las placas.
 *  - `VesiculaMatriz`: la vesícula (entera o cortada), el cuello de gemación, sus proteínas de membrana, los iones
 *    que entran, el núcleo amorfo, el racimo de cristales que la rompe y el PPi sobre ellos.
 *
 * No calculan nada de la biología: reciben `EstadoVesicula` (puro) y solo mueven, escalan, colorean y aclaran
 * piezas. Materiales compartidos por tipo de pieza; `InstancedMesh` para lo repetido; al liberar se libera todo.
 */
import type { BufferGeometry, Material } from 'three';
import {
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { fraccion, suave } from '../interpolacion';
import {
  N_HIDROLISIS,
  alturaMembrana,
  corteDePpi,
  crecimientoDePlaca,
  cristalesDeFibrillas,
  cristalesDeVecinas,
  cristalesDeVesicula,
  enzimasDeMembrana,
  fibrillasDelOsteoide,
  ionesDeVesicula,
  largoDeCristal,
  posicionDeIon,
  ppiJuntoAEnpp1,
  ppiSobreCristales,
  ppiSobreRacimo,
  proteinasDeVesicula,
  puntoDeGemacion,
  segmentosDeBandeo,
  sitiosDeHidrolisis,
  vesiculasVecinas,
} from './disposicion';
import type { TipoEnzima, TipoProteinaVesicula } from './disposicion';
import {
  DIRECCION_NUCLEACION,
  GROSOR_CITOPLASMA,
  MEMBRANA,
  PLACA,
  R_FIBRILLA,
  R_VESICULA,
  X_VESICULA,
  Z_VESICULA,
} from './estado';
import type { EstadoVesicula } from './estado';
import { R_NUCLEACION } from './disposicion';
import {
  caja,
  cilindro,
  cuello,
  esfera,
  hemisferio,
  laminaOndulada,
  losaOndulada,
  mancuerna,
  placa,
  placaDesdeOrigen,
  tubo,
} from './geometria';
import { HEX } from './paleta';

const EJE_X = new Vector3(1, 0, 0);
const EJE_Y = new Vector3(0, 1, 0);

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

/** Opacidad de una membrana translúcida: siempre transparente y sin escribir profundidad, para ver lo de dentro. */
function ponerVelo(m: Material, opacidad: number): void {
  m.opacity = Math.max(0, Math.min(1, opacidad));
  m.transparent = true;
  m.depthWrite = false;
}

function terminar(malla: InstancedMesh): void {
  malla.instanceMatrix.needsUpdate = true;
  if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
  malla.frustumCulled = false;
}

/** Interfaz común de las piezas. */
export interface PiezaVesicula {
  readonly grupo: Group;
  actualizar: (estado: EstadoVesicula) => void;
  liberar: () => void;
}

/* -------------------------------------------------------------------------------------------
 * Osteoblasto: membrana, citoplasma y enzimas
 * ----------------------------------------------------------------------------------------- */

export class Osteoblasto implements PiezaVesicula {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matPpi: MeshStandardMaterial;
  private readonly matHidrolisis: MeshStandardMaterial;
  private readonly enzimas: InstancedMesh;
  private readonly hidrolisis: InstancedMesh;
  private readonly ppiEnpp1: InstancedMesh;
  private readonly sitios = sitiosDeHidrolisis();
  private ultimaHidrolisis = -1;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly pos = new Vector3();
  private readonly esc = new Vector3();
  private readonly color = new Color();
  private readonly colorPpi = new Color(HEX.ppi);
  private readonly colorPi = new Color(HEX.fosfato);

  constructor() {
    this.grupo.name = 'osteoblasto';
    const relieve = (x: number, z: number) => alturaMembrana(x, z) - MEMBRANA.y;

    // Membrana basal: lámina ondulada, opaca, de doble cara.
    const matMembrana = material(HEX.membranaCelula, { roughness: 0.7, side: DoubleSide });
    const geoMembrana = laminaOndulada(MEMBRANA.ancho, MEMBRANA.fondo, 40, 22, relieve);
    this.geometrias.push(geoMembrana);
    const membrana = new Mesh(geoMembrana, matMembrana);
    membrana.name = 'membrana_osteoblasto';
    membrana.position.y = MEMBRANA.y;
    this.grupo.add(membrana);

    // Citoplasma: losa translúcida cuya cara inferior sigue la membrana (un poco por encima, sin z-fighting).
    const matCitoplasma = material(HEX.citoplasma, { roughness: 0.8 });
    ponerVelo(matCitoplasma, 0.5);
    const geoCitoplasma = losaOndulada(
      MEMBRANA.ancho,
      MEMBRANA.fondo,
      GROSOR_CITOPLASMA,
      40,
      22,
      (x, z) => relieve(x, z) + 0.035,
    );
    this.geometrias.push(geoCitoplasma);
    const citoplasma = new Mesh(geoCitoplasma, matCitoplasma);
    citoplasma.name = 'citoplasma';
    citoplasma.position.y = MEMBRANA.y;
    this.grupo.add(citoplasma);

    // Enzimas colgando de la cara externa: cajitas de tres colores.
    const matEnzimas = material('#ffffff', { roughness: 0.5 });
    const geoCaja = caja();
    this.geometrias.push(geoCaja);
    const lista = enzimasDeMembrana();
    this.enzimas = new InstancedMesh(geoCaja, matEnzimas, lista.length);
    this.enzimas.name = 'enzimas_membrana';
    const colores: Record<TipoEnzima, Color> = {
      tnap: new Color(HEX.tnap),
      enpp1: new Color(HEX.enpp1),
      ank: new Color(HEX.ank),
    };
    lista.forEach((e, i) => {
      this.pos.set(e.x, e.y, e.z);
      this.q.identity();
      this.esc.set(e.sx, e.sy, e.sz);
      this.m.compose(this.pos, this.q, this.esc);
      this.enzimas.setMatrixAt(i, this.m);
      this.enzimas.setColorAt(i, colores[e.tipo]);
    });
    terminar(this.enzimas);
    this.grupo.add(this.enzimas);

    // PPi que la TNAP corta: dos esferas por sitio, que se separan y cambian de color.
    this.matHidrolisis = material('#ffffff', { roughness: 0.45 });
    const geoEsfera = esfera(8, 6);
    this.geometrias.push(geoEsfera);
    this.hidrolisis = new InstancedMesh(geoEsfera, this.matHidrolisis, N_HIDROLISIS * 2);
    this.hidrolisis.name = 'hidrolisis_ppi';
    this.grupo.add(this.hidrolisis);

    // PPi recién formadas junto a ENPP1.
    this.matPpi = material(HEX.ppi, { roughness: 0.45 });
    const geoMancuerna = mancuerna();
    this.geometrias.push(geoMancuerna);
    const junto = ppiJuntoAEnpp1();
    this.ppiEnpp1 = new InstancedMesh(geoMancuerna, this.matPpi, junto.length);
    this.ppiEnpp1.name = 'ppi_enpp1';
    junto.forEach((p, i) => {
      this.pos.set(p.x, p.y, p.z);
      this.q.identity();
      this.esc.setScalar(0.2);
      this.m.compose(this.pos, this.q, this.esc);
      this.ppiEnpp1.setMatrixAt(i, this.m);
    });
    terminar(this.ppiEnpp1);
    this.grupo.add(this.ppiEnpp1);

    this.materiales.push(matMembrana, matCitoplasma, matEnzimas, this.matHidrolisis, this.matPpi);
    this.ponerHidrolisis(0);
  }

  private ponerHidrolisis(hidrolisis: number): void {
    if (Math.abs(hidrolisis - this.ultimaHidrolisis) < 1e-4) return;
    this.ultimaHidrolisis = hidrolisis;
    const { separacion, libre } = corteDePpi(hidrolisis);
    this.color.copy(this.colorPpi).lerp(this.colorPi, libre);
    this.q.identity();
    this.esc.setScalar(0.055);
    this.sitios.forEach((s, i) => {
      for (const lado of [-1, 1]) {
        const k = i * 2 + (lado + 1) / 2;
        // Al separarse los dos fosfatos también caen un poco: se sueltan de la enzima.
        this.pos.set(s.x + (lado * separacion) / 2, s.y - libre * 0.08, s.z);
        this.m.compose(this.pos, this.q, this.esc);
        this.hidrolisis.setMatrixAt(k, this.m);
        this.hidrolisis.setColorAt(k, this.color);
      }
    });
    terminar(this.hidrolisis);
  }

  actualizar(estado: EstadoVesicula): void {
    const ppi = estado.ppi;
    this.hidrolisis.visible = ppi > 0.004;
    this.ppiEnpp1.visible = ppi > 0.004;
    poner([this.matHidrolisis, this.matPpi], Math.min(1, ppi * 2));
    this.ponerHidrolisis(estado.hidrolisis);
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    this.enzimas.dispose();
    this.hidrolisis.dispose();
    this.ppiEnpp1.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Osteoide: fibrillas, mineral propagado, vesículas vecinas y pirofosfato
 * ----------------------------------------------------------------------------------------- */

export class Osteoide implements PiezaVesicula {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matCristal: MeshStandardMaterial;
  private readonly matVecinas: MeshStandardMaterial;
  private readonly matPpi: MeshStandardMaterial;
  private readonly huecos: InstancedMesh;
  private readonly solapamientos: InstancedMesh;
  private readonly cristales: InstancedMesh;
  private readonly vecinas: InstancedMesh;
  private readonly cristalesVecinas: InstancedMesh;
  private readonly ppi: InstancedMesh;
  private readonly datosCristales = cristalesDeFibrillas();
  private readonly datosVecinas = vesiculasVecinas();
  private readonly datosCristalesVecinas = cristalesDeVecinas(this.datosVecinas);
  private readonly datosPpi = ppiSobreCristales(this.datosCristales);
  private ultimaPropagacion = -1;
  private ultimasVecinas = -1;
  private ultimoPpi = -1;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly q2 = new Quaternion();
  private readonly pos = new Vector3();
  private readonly esc = new Vector3();
  private readonly dir = new Vector3();

  constructor() {
    this.grupo.name = 'osteoide';

    // Fibrillas con bandeo: segmentos de hueco (más oscuros y finos) y de solapamiento (más claros).
    const matHueco = material(HEX.fibrillaOscura, { roughness: 0.75 });
    const matSolapamiento = material(HEX.fibrillaClara, { roughness: 0.7 });
    const geoHueco = tubo(R_FIBRILLA * 0.93, 1);
    const geoSolapamiento = tubo(R_FIBRILLA, 1);
    this.geometrias.push(geoHueco, geoSolapamiento);
    const fibrillas = fibrillasDelOsteoide();
    const segmentos = segmentosDeBandeo();
    const nHuecos = segmentos.filter((s) => s.hueco).length;
    this.huecos = new InstancedMesh(geoHueco, matHueco, fibrillas.length * nHuecos);
    this.huecos.name = 'fibrillas_zona_hueco';
    this.solapamientos = new InstancedMesh(
      geoSolapamiento,
      matSolapamiento,
      fibrillas.length * (segmentos.length - nHuecos),
    );
    this.solapamientos.name = 'fibrillas_zona_solapamiento';
    const cuenta = { hueco: 0, solapamiento: 0 };
    for (const f of fibrillas) {
      this.q.setFromAxisAngle(EJE_Y, f.yaw);
      for (const seg of segmentos) {
        this.pos
          .set(seg.s, 0, 0)
          .applyQuaternion(this.q)
          .add(this.dir.set(f.x, f.y, f.z));
        this.esc.set(seg.largo * 1.02, 1, 1);
        this.m.compose(this.pos, this.q, this.esc);
        if (seg.hueco) this.huecos.setMatrixAt(cuenta.hueco++, this.m);
        else this.solapamientos.setMatrixAt(cuenta.solapamiento++, this.m);
      }
    }
    terminar(this.huecos);
    terminar(this.solapamientos);
    this.grupo.add(this.huecos, this.solapamientos);

    // Placas de mineral sobre los huecos del bandeo.
    this.matCristal = material(HEX.cristal, { roughness: 0.25 });
    const geoPlaca = placa(PLACA.largo, PLACA.alto, PLACA.grosor);
    this.geometrias.push(geoPlaca);
    this.cristales = new InstancedMesh(geoPlaca, this.matCristal, this.datosCristales.length);
    this.cristales.name = 'cristales_fibrillas';
    this.grupo.add(this.cristales);

    // Vesículas vecinas y sus cristales.
    this.matVecinas = material(HEX.membranaVesicula, {
      roughness: 0.5,
      side: DoubleSide,
      emissive: HEX.brilloMembrana,
      emissiveIntensity: 0.3,
    });
    ponerVelo(this.matVecinas, 0);
    const geoVecina = esfera(18, 12);
    this.geometrias.push(geoVecina);
    this.vecinas = new InstancedMesh(geoVecina, this.matVecinas, this.datosVecinas.length);
    this.vecinas.name = 'vesiculas_vecinas';
    this.grupo.add(this.vecinas);
    const geoPlacaOrigen = placaDesdeOrigen(0.13, 0.03);
    this.geometrias.push(geoPlacaOrigen);
    this.cristalesVecinas = new InstancedMesh(
      geoPlacaOrigen,
      this.matCristal,
      this.datosCristalesVecinas.length,
    );
    this.cristalesVecinas.name = 'cristales_vecinas';
    this.grupo.add(this.cristalesVecinas);

    // Pirofosfato adsorbido a las placas cercanas a la vesícula.
    this.matPpi = material(HEX.ppi, { roughness: 0.45 });
    const geoMancuerna = mancuerna();
    this.geometrias.push(geoMancuerna);
    this.ppi = new InstancedMesh(geoMancuerna, this.matPpi, this.datosPpi.length);
    this.ppi.name = 'ppi_cristales';
    this.grupo.add(this.ppi);

    for (const malla of [this.cristales, this.vecinas, this.cristalesVecinas, this.ppi]) {
      malla.frustumCulled = false;
    }
    this.materiales.push(matHueco, matSolapamiento, this.matCristal, this.matVecinas, this.matPpi);
    this.ponerCristales(0);
    this.ponerVecinas(0, 0);
    this.ponerPpi(0);
  }

  private ponerCristales(propagacion: number): void {
    if (Math.abs(propagacion - this.ultimaPropagacion) < 1e-4) return;
    this.ultimaPropagacion = propagacion;
    this.datosCristales.forEach((c, i) => {
      const k = Math.max(1e-3, c.escala * crecimientoDePlaca(c.distancia, propagacion));
      this.pos.set(c.x, c.y, c.z);
      // La placa nace con la cara ancha hacia +Z; girada theta - 90° alrededor de X mira en dirección radial, y
      // después gira con la fibrilla alrededor de Y.
      this.q.setFromAxisAngle(EJE_Y, c.yaw);
      this.q2.setFromAxisAngle(EJE_X, c.theta - Math.PI / 2);
      this.q.multiply(this.q2);
      this.esc.setScalar(k);
      this.m.compose(this.pos, this.q, this.esc);
      this.cristales.setMatrixAt(i, this.m);
    });
    terminar(this.cristales);
  }

  private ponerVecinas(vecinas: number, propagacion: number): void {
    const clave = vecinas * 8 + propagacion;
    if (Math.abs(clave - this.ultimasVecinas) < 1e-4) return;
    this.ultimasVecinas = clave;
    this.q.identity();
    this.datosVecinas.forEach((v, i) => {
      this.pos.set(v.x, v.y, v.z);
      this.esc.setScalar(Math.max(1e-3, v.radio * (0.3 + 0.7 * vecinas)));
      this.m.compose(this.pos, this.q, this.esc);
      this.vecinas.setMatrixAt(i, this.m);
    });
    terminar(this.vecinas);
    const crecimiento = suave(fraccion(propagacion, 0.35, 0.95));
    this.datosCristalesVecinas.forEach((c, i) => {
      this.pos.set(...c.anclaje);
      this.dir.set(...c.dir);
      this.q.setFromUnitVectors(EJE_X, this.dir);
      this.esc.set(Math.max(1e-3, c.largo * crecimiento), 1, 1);
      this.m.compose(this.pos, this.q, this.esc);
      this.cristalesVecinas.setMatrixAt(i, this.m);
    });
    terminar(this.cristalesVecinas);
  }

  private ponerPpi(ppi: number): void {
    if (Math.abs(ppi - this.ultimoPpi) < 1e-4) return;
    this.ultimoPpi = ppi;
    const k = Math.max(1e-3, 0.17 * ppi);
    this.datosPpi.forEach((p, i) => {
      this.pos.set(p.x, p.y, p.z);
      this.q.setFromAxisAngle(EJE_Y, p.yaw);
      this.esc.setScalar(k);
      this.m.compose(this.pos, this.q, this.esc);
      this.ppi.setMatrixAt(i, this.m);
    });
    terminar(this.ppi);
  }

  actualizar(estado: EstadoVesicula): void {
    this.cristales.visible = estado.propagacion > 0.004;
    this.vecinas.visible = estado.vecinas > 0.004;
    this.cristalesVecinas.visible = estado.vecinas > 0.004 && estado.propagacion > 0.35;
    this.ppi.visible = estado.ppi > 0.004;
    ponerVelo(this.matVecinas, 0.5 * estado.vecinas);
    poner([this.matPpi], Math.min(1, estado.ppi * 2));
    this.ponerCristales(estado.propagacion);
    this.ponerVecinas(estado.vecinas, estado.propagacion);
    this.ponerPpi(estado.ppi);
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    for (const i of [
      this.huecos,
      this.solapamientos,
      this.cristales,
      this.vecinas,
      this.cristalesVecinas,
      this.ppi,
    ]) {
      i.dispose();
    }
  }
}

/* -------------------------------------------------------------------------------------------
 * La vesícula de matriz
 * ----------------------------------------------------------------------------------------- */

export class VesiculaMatriz implements PiezaVesicula {
  readonly grupo = new Group();
  /** Lo que se mueve y se escala con la vesícula (coordenadas locales, radio 1). */
  private readonly cuerpo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matEntera: MeshStandardMaterial;
  private readonly matCortada: MeshStandardMaterial;
  private readonly matCuello: MeshStandardMaterial;
  private readonly matProteinasAtras: MeshStandardMaterial;
  private readonly matProteinasFrente: MeshStandardMaterial;
  private readonly matIones: MeshStandardMaterial;
  private readonly matNucleo: MeshStandardMaterial;
  private readonly matCristal: MeshStandardMaterial;
  private readonly matPpi: MeshStandardMaterial;
  private readonly entera: Mesh;
  private readonly cortada: Mesh;
  private readonly cuello: Mesh;
  private readonly proteinasAtras: InstancedMesh;
  private readonly proteinasFrente: InstancedMesh;
  private readonly iones: InstancedMesh;
  private readonly nucleo: Mesh;
  private readonly racimo: InstancedMesh;
  private readonly ppi: InstancedMesh;
  private readonly datosIones = ionesDeVesicula();
  private readonly datosRacimo = cristalesDeVesicula();
  private readonly datosPpi = ppiSobreRacimo(this.datosRacimo);
  private readonly gemacion = puntoDeGemacion();
  private ultimosIones = -1;
  private ultimoRacimo = -1;
  private ultimoPpi = -1;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly pos = new Vector3();
  private readonly esc = new Vector3();
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly c = new Vector3();
  private readonly punto: [number, number, number] = [0, 0, 0];

  constructor() {
    this.grupo.name = 'vesicula_matriz';
    this.cuerpo.name = 'vesicula_cuerpo';
    this.cuerpo.position.set(X_VESICULA, 0, Z_VESICULA);

    // Membrana de la vesícula: la esfera entera y la mitad trasera (para el corte) se turnan por opacidad.
    const geoEsfera = esfera(28, 18);
    const geoHemisferio = hemisferio(28, 18);
    this.geometrias.push(geoEsfera, geoHemisferio);
    const velo = {
      roughness: 0.45,
      side: DoubleSide,
      emissive: HEX.brilloMembrana,
      emissiveIntensity: 0.3,
    } as const;
    this.matEntera = material(HEX.membranaVesicula, velo);
    this.matCortada = material(HEX.membranaVesicula, velo);
    ponerVelo(this.matEntera, 0);
    ponerVelo(this.matCortada, 0);
    this.entera = new Mesh(geoEsfera, this.matEntera);
    this.entera.name = 'membrana_vesicula';
    this.cortada = new Mesh(geoHemisferio, this.matCortada);
    this.cortada.name = 'membrana_vesicula_cortada';
    this.cuerpo.add(this.entera, this.cortada);

    // Cuello de gemación, en coordenadas absolutas (une la vesícula con la membrana del osteoblasto).
    this.matCuello = material(HEX.cuello, { roughness: 0.5, side: DoubleSide });
    const geoCuello = cuello();
    this.geometrias.push(geoCuello);
    this.cuello = new Mesh(geoCuello, this.matCuello);
    this.cuello.name = 'cuello_gemacion';
    this.grupo.add(this.cuello);

    // Proteínas de la membrana: canales, transportadores, TNAP fuera y PHOSPHO1 dentro; las de delante se van con el corte.
    const geoCilindro = cilindro(10);
    this.geometrias.push(geoCilindro);
    this.matProteinasAtras = material('#ffffff', { roughness: 0.5 });
    this.matProteinasFrente = material('#ffffff', { roughness: 0.5 });
    const proteinas = proteinasDeVesicula();
    const atras = proteinas.filter((p) => !p.frente);
    const frente = proteinas.filter((p) => p.frente);
    this.proteinasAtras = new InstancedMesh(geoCilindro, this.matProteinasAtras, atras.length);
    this.proteinasAtras.name = 'proteinas_vesicula_atras';
    this.proteinasFrente = new InstancedMesh(geoCilindro, this.matProteinasFrente, frente.length);
    this.proteinasFrente.name = 'proteinas_vesicula_frente';
    const colores: Record<TipoProteinaVesicula, Color> = {
      anexina: new Color(HEX.anexina),
      pit: new Color(HEX.pit),
      tnap: new Color(HEX.tnap),
      phospho1: new Color(HEX.phospho1),
    };
    for (const [malla, lista] of [
      [this.proteinasAtras, atras],
      [this.proteinasFrente, frente],
    ] as const) {
      lista.forEach((p, i) => {
        this.a.set(...p.dir);
        this.pos.copy(this.a).multiplyScalar(p.radio);
        this.q.setFromUnitVectors(EJE_Y, this.a);
        this.esc.set(p.grosor, p.alto, p.grosor);
        this.m.compose(this.pos, this.q, this.esc);
        malla.setMatrixAt(i, this.m);
        malla.setColorAt(i, colores[p.tipo]);
      });
      terminar(malla);
      this.cuerpo.add(malla);
    }

    // Iones: esferas pequeñas de dos colores que viajan por su camino.
    this.matIones = material('#ffffff', { roughness: 0.4 });
    const geoIon = esfera(8, 6);
    this.geometrias.push(geoIon);
    this.iones = new InstancedMesh(geoIon, this.matIones, this.datosIones.length);
    this.iones.name = 'iones';
    const calcio = new Color(HEX.calcio);
    const fosfato = new Color(HEX.fosfato);
    this.datosIones.forEach((ion, i) =>
      this.iones.setColorAt(i, ion.tipo === 'calcio' ? calcio : fosfato),
    );
    this.cuerpo.add(this.iones);

    // Núcleo de fosfato de calcio amorfo: esfera tosca en el sitio de nucleación.
    this.matNucleo = material(HEX.acp, { roughness: 0.9, flatShading: true });
    const geoNucleo = esfera(9, 6);
    this.geometrias.push(geoNucleo);
    this.nucleo = new Mesh(geoNucleo, this.matNucleo);
    this.nucleo.name = 'nucleo_acp';
    this.nucleo.position.set(...DIRECCION_NUCLEACION).multiplyScalar(R_NUCLEACION);
    this.cuerpo.add(this.nucleo);

    // Racimo de cristales: placas que crecen desde el anclaje hacia fuera.
    this.matCristal = material(HEX.cristal, {
      roughness: 0.25,
      emissive: HEX.cristal,
      emissiveIntensity: 0.18,
    });
    const geoPlaca = placaDesdeOrigen(1, 1);
    this.geometrias.push(geoPlaca);
    this.racimo = new InstancedMesh(geoPlaca, this.matCristal, this.datosRacimo.length);
    this.racimo.name = 'racimo_cristales';
    this.cuerpo.add(this.racimo);

    // Pirofosfato sobre las placas del racimo.
    this.matPpi = material(HEX.ppi, { roughness: 0.45 });
    const geoMancuerna = mancuerna();
    this.geometrias.push(geoMancuerna);
    this.ppi = new InstancedMesh(geoMancuerna, this.matPpi, this.datosPpi.length);
    this.ppi.name = 'ppi_racimo';
    this.cuerpo.add(this.ppi);

    for (const malla of [this.iones, this.racimo, this.ppi]) malla.frustumCulled = false;
    this.materiales.push(
      this.matEntera,
      this.matCortada,
      this.matCuello,
      this.matProteinasAtras,
      this.matProteinasFrente,
      this.matIones,
      this.matNucleo,
      this.matCristal,
      this.matPpi,
    );
    this.grupo.add(this.cuerpo);
    this.ponerIones(0, 0);
    this.ponerRacimo(0, 0);
    this.ponerPpi(0);
  }

  private ponerIones(entrada: number, cumulo: number): void {
    const clave = entrada * 8 + cumulo;
    if (Math.abs(clave - this.ultimosIones) < 1e-4) return;
    this.ultimosIones = clave;
    this.q.identity();
    this.esc.setScalar(0.07);
    this.datosIones.forEach((ion, i) => {
      posicionDeIon(ion, entrada, cumulo, this.punto);
      this.pos.set(...this.punto);
      this.m.compose(this.pos, this.q, this.esc);
      this.iones.setMatrixAt(i, this.m);
    });
    terminar(this.iones);
  }

  private ponerRacimo(cristal: number, ruptura: number): void {
    const clave = cristal * 8 + ruptura;
    if (Math.abs(clave - this.ultimoRacimo) < 1e-4) return;
    this.ultimoRacimo = clave;
    this.datosRacimo.forEach((c, i) => {
      const largo = Math.max(1e-3, largoDeCristal(i, cristal, ruptura));
      this.pos.set(...c.anclaje);
      // Base ortonormal: X hacia donde crece, Z la normal de la cara ancha.
      this.a.set(...c.dir);
      this.c.set(...c.normal);
      this.b.crossVectors(this.c, this.a);
      this.m.makeBasis(this.a, this.b, this.c);
      this.q.setFromRotationMatrix(this.m);
      this.esc.set(largo, c.alto, c.grosor);
      this.m.compose(this.pos, this.q, this.esc);
      this.racimo.setMatrixAt(i, this.m);
    });
    terminar(this.racimo);
  }

  private ponerPpi(ppi: number): void {
    if (Math.abs(ppi - this.ultimoPpi) < 1e-4) return;
    this.ultimoPpi = ppi;
    const k = Math.max(1e-3, 0.24 * ppi);
    this.datosPpi.forEach((p, i) => {
      this.pos.set(p.x, p.y, p.z);
      this.a.set(...p.dir);
      this.q.setFromUnitVectors(EJE_X, this.a);
      this.esc.setScalar(k);
      this.m.compose(this.pos, this.q, this.esc);
      this.ppi.setMatrixAt(i, this.m);
    });
    terminar(this.ppi);
  }

  actualizar(estado: EstadoVesicula): void {
    const v = estado.vesicula;
    const visible = v.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;

    const radio = R_VESICULA * v.escala;
    this.cuerpo.position.y = v.y;
    // Al romperse la membrana la vesícula se hunde un poco.
    this.cuerpo.scale.set(radio, radio * (1 - 0.12 * v.rota), radio);

    const velo = 0.45 * v.opacidad * (1 - 0.55 * v.rota);
    ponerVelo(this.matEntera, velo * (1 - v.corte));
    ponerVelo(this.matCortada, velo * v.corte);
    this.entera.visible = v.corte < 0.996;
    this.cortada.visible = v.corte > 0.004;

    // Cuello: del punto de gemación de la membrana a la parte alta de la vesícula.
    const yArriba = v.y + radio * 0.8;
    const largo = this.gemacion[1] - yArriba;
    const hayCuello = v.cuello > 0.004 && largo > 0.02;
    this.cuello.visible = hayCuello;
    if (hayCuello) {
      const grosor = radio * 0.48 * (0.35 + 0.65 * v.cuello);
      this.cuello.position.set(this.gemacion[0], yArriba, this.gemacion[2]);
      this.cuello.scale.set(grosor, largo, grosor);
      poner([this.matCuello], v.opacidad);
    }

    const proteinas = v.opacidad * (1 - 0.7 * v.rota);
    poner([this.matProteinasAtras], proteinas);
    poner([this.matProteinasFrente], proteinas * (1 - v.corte));
    this.proteinasAtras.visible = proteinas > 0.004;
    this.proteinasFrente.visible = proteinas * (1 - v.corte) > 0.004;

    const iones = estado.iones;
    this.iones.visible = iones.opacidad > 0.004 && iones.entrada > 0.004;
    poner([this.matIones], iones.opacidad);
    this.ponerIones(iones.entrada, iones.cumulo);

    this.nucleo.visible = estado.nucleo > 0.004;
    this.nucleo.scale.setScalar(Math.max(1e-3, 0.2 * estado.nucleo));

    this.racimo.visible = estado.cristal > 0.004;
    this.ponerRacimo(estado.cristal, estado.ruptura);

    this.ppi.visible = estado.ppi > 0.004;
    poner([this.matPpi], Math.min(1, estado.ppi * 2));
    this.ponerPpi(estado.ppi);
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    for (const i of [
      this.proteinasAtras,
      this.proteinasFrente,
      this.iones,
      this.racimo,
      this.ppi,
    ]) {
      i.dispose();
    }
  }
}
