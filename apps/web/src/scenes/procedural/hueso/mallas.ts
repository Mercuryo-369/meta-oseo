/**
 * Las tres "escalas" de la escena del hueso, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `HuesoLargo`: la diáfisis con su cortical, la médula, el periostio, las dos epífisis con hueso esponjoso y
 *    el cartílago articular; una cuña que se aparta para ver el interior.
 *  - `CorteTransversal`: un disco de la diáfisis con sus capas (periostio, cortical con osteonas, endostio,
 *    médula) que pueden separarse.
 *  - `OsteonaAmpliada`: una osteona con su conducto de Havers, sus láminas concéntricas cortadas "en
 *    escalera", las fibras de colágeno, los osteocitos y un conducto de Volkmann.
 *
 * No calculan nada de la biología: reciben `EstadoHueso` (puro) y solo mueven, escalan y aclaran piezas.
 * Materiales compartidos por capa; al liberar se libera todo lo creado.
 */
import type { Material } from 'three';
import {
  BufferGeometry,
  Color,
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
  SphereGeometry,
  Vector3,
} from 'three';
import {
  THETA_CUNA_CENTRO,
  THETA_RETIRO,
  arcoConservadoDeLamina,
  arcoRetiradoDeLamina,
  distanciaAngular,
  grados,
  lagunasDeOsteocitos,
  osteonasDelCorte,
  radiosDeLamina,
  trabeculasDeEpifisis,
} from './disposicion';
import type { Trabecula } from './disposicion';
import {
  CUNA,
  EPIFISIS_LARGO,
  EPIFISIS_RADIO,
  LARGO_DIAFISIS,
  LARGO_OSTEONA,
  N_LAMINAS,
  R_CORTICAL,
  R_HAVERS,
  R_MEDULAR,
  R_OSTEONA,
  R_PERIOSTIO,
  X_EPIFISIS,
} from './estado';
import type { EstadoHueso } from './estado';
import { DOS_PI, anillo, cascaraElipsoide } from './geometria';
import { HEX } from './paleta';

const EJE_Y = new Vector3(0, 1, 0);

/** Material estándar de doble cara: las cáscaras abiertas se ven por dentro. */
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
export interface EscalaHueso {
  readonly grupo: Group;
  actualizar: (estado: EstadoHueso) => void;
  liberar: () => void;
}

/* -------------------------------------------------------------------------------------------
 * Hueso largo
 * ----------------------------------------------------------------------------------------- */

export class HuesoLargo implements EscalaHueso {
  /** Raíz (el hueso tumbado a lo largo de X). */
  readonly grupo = new Group();
  private readonly cuerpo = new Group();
  private readonly cuna = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matPeriostio: MeshStandardMaterial;
  private readonly instanciados: InstancedMesh[] = [];
  private readonly direccionCuna: Vector3;

  constructor() {
    this.grupo.name = 'hueso_largo';
    // Todo se construye con el eje del hueso en Y; se tumba para que quede a lo largo de X.
    this.grupo.rotation.z = -Math.PI / 2;

    const theta0 = grados(CUNA.inicio);
    const arco = grados(CUNA.arco);
    const restoTheta0 = theta0 + arco;
    const restoArco = DOS_PI - arco;

    const cortical = material(HEX.cortical);
    const cartilago = material(HEX.cartilago, { roughness: 0.3 });
    const esponjoso = material(HEX.esponjoso, { roughness: 0.75 });
    const medula = material(HEX.medulaAmarilla, { roughness: 0.5 });
    this.matPeriostio = material(HEX.periostio, { roughness: 0.8 });
    this.materiales.push(cortical, cartilago, esponjoso, medula, this.matPeriostio);

    const pieza = (
      geometria: BufferGeometry,
      mat: Material,
      padre: Group,
      nombre: string,
    ): void => {
      const malla = new Mesh(geometria, mat);
      malla.name = nombre;
      this.geometrias.push(geometria);
      padre.add(malla);
    };

    // Diáfisis (cortical con grosor), cuerpo y cuña.
    pieza(
      anillo(R_MEDULAR, R_CORTICAL, LARGO_DIAFISIS, restoTheta0, restoArco),
      cortical,
      this.cuerpo,
      'diafisis_cortical',
    );
    pieza(
      anillo(R_MEDULAR, R_CORTICAL, LARGO_DIAFISIS, theta0, arco),
      cortical,
      this.cuna,
      'diafisis_cortical_cuna',
    );

    // Epífisis: cáscara fina de cortical y casquete de cartílago articular en el extremo.
    for (const signo of [1, -1] as const) {
      const y = signo * X_EPIFISIS;
      for (const [padre, t0, a] of [
        [this.cuerpo, restoTheta0, restoArco],
        [this.cuna, theta0, arco],
      ] as const) {
        pieza(
          cascaraElipsoide(EPIFISIS_RADIO, EPIFISIS_LARGO, y, t0, a),
          cortical,
          padre,
          'epifisis_cortical',
        );
        const desde = signo === 1 ? 0 : Math.PI - 0.95;
        pieza(
          cascaraElipsoide(EPIFISIS_RADIO * 1.035, EPIFISIS_LARGO * 1.035, y, t0, a, desde, 0.95),
          cartilago,
          padre,
          'cartilago_articular',
        );
      }
    }

    // Hueso esponjoso: trabéculas. Las que caen en el sector de la cuña viajan con ella.
    const todas: Trabecula[] = [
      ...trabeculasDeEpifisis(120, 11, 1, X_EPIFISIS),
      ...trabeculasDeEpifisis(120, 23, -1, -X_EPIFISIS),
    ];
    const mitadArco = arco / 2;
    const enCuna = todas.filter((t) => distanciaAngular(t.theta, THETA_CUNA_CENTRO) < mitadArco);
    const enCuerpo = todas.filter((t) => distanciaAngular(t.theta, THETA_CUNA_CENTRO) >= mitadArco);
    this.anadirTrabeculas(enCuerpo, esponjoso, this.cuerpo);
    this.anadirTrabeculas(enCuna, esponjoso, this.cuna);

    // Médula ósea amarilla llenando la cavidad medular (la cuña se aparta y la deja a la vista).
    const geoMedula = new CylinderGeometry(
      R_MEDULAR - 0.012,
      R_MEDULAR - 0.012,
      LARGO_DIAFISIS + 1.2,
      40,
    );
    this.geometrias.push(geoMedula);
    const mallaMedula = new Mesh(geoMedula, medula);
    mallaMedula.name = 'medula_osea';
    this.grupo.add(mallaMedula);

    // Periostio: vaina fibrosa que envuelve la diáfisis.
    const geoPeriostio = new CylinderGeometry(
      R_PERIOSTIO,
      R_PERIOSTIO,
      LARGO_DIAFISIS,
      48,
      1,
      true,
    );
    this.geometrias.push(geoPeriostio);
    const mallaPeriostio = new Mesh(geoPeriostio, this.matPeriostio);
    mallaPeriostio.name = 'periostio';
    this.grupo.add(mallaPeriostio);

    this.grupo.add(this.cuerpo, this.cuna);
    this.direccionCuna = new Vector3(Math.sin(THETA_CUNA_CENTRO), 0, Math.cos(THETA_CUNA_CENTRO));
  }

  private anadirTrabeculas(lista: readonly Trabecula[], mat: Material, padre: Group): void {
    if (lista.length === 0) return;
    const geo = new CylinderGeometry(0.03, 0.03, 1, 5, 1);
    this.geometrias.push(geo);
    const malla = new InstancedMesh(geo, mat, lista.length);
    malla.name = 'trabeculas';
    const m = new Matrix4();
    const q = new Quaternion();
    const dir = new Vector3();
    lista.forEach((t, i) => {
      dir.set(t.dx, t.dy, t.dz);
      q.setFromUnitVectors(EJE_Y, dir);
      m.compose(new Vector3(t.x, t.y, t.z), q, new Vector3(1, t.largo, 1));
      malla.setMatrixAt(i, m);
    });
    malla.instanceMatrix.needsUpdate = true;
    malla.frustumCulled = false;
    this.instanciados.push(malla);
    padre.add(malla);
  }

  actualizar(estado: EstadoHueso): void {
    const visible = estado.hueso.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    this.grupo.scale.setScalar(estado.hueso.escala);
    // La cuña se aparta hacia el lado por el que mira la cámara.
    this.cuna.position.copy(this.direccionCuna).multiplyScalar(estado.apertura * 2.8);
    poner(this.materiales, estado.hueso.opacidad);
    // El periostio tiene su propia opacidad, además de la del hueso.
    poner([this.matPeriostio], estado.hueso.opacidad, estado.periostio);
    this.matPeriostio.depthWrite = false;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    for (const i of this.instanciados) i.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Corte transversal
 * ----------------------------------------------------------------------------------------- */

const GROSOR_CORTE = 0.3;
/** Cuánto se ensancha el corte en la pantalla (la cortical de radio 1 mide esto en unidades de escena). */
export const TAMANO_CORTE = 2.4;
/** Separación (en el eje del corte) de cada capa cuando se separan. */
const SEPARACION = { periostio: 1.25, cortical: 0, endostio: -0.8, medula: -1.7 } as const;

export class CorteTransversal implements EscalaHueso {
  readonly grupo = new Group();
  private readonly capas: Record<keyof typeof SEPARACION, Group> = {
    periostio: new Group(),
    cortical: new Group(),
    endostio: new Group(),
    medula: new Group(),
  };
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matOsteonas: MeshStandardMaterial[] = [];
  private readonly instanciados: InstancedMesh[] = [];
  private readonly resalte = new Color(HEX.resalte);

  constructor() {
    this.grupo.name = 'corte_transversal';
    const tumbar = (g: BufferGeometry): BufferGeometry => {
      g.rotateX(Math.PI / 2);
      this.geometrias.push(g);
      return g;
    };
    const anadir = (capa: Group, g: BufferGeometry, mat: Material, nombre: string): void => {
      const malla = new Mesh(tumbar(g), mat);
      malla.name = nombre;
      capa.add(malla);
    };

    const periostio = material(HEX.periostio, { roughness: 0.8 });
    const cortical = material(HEX.intersticial);
    const lineas = material(HEX.laminaOscura);
    const endostio = material(HEX.endostio);
    const medula = material(HEX.medulaAmarilla, { roughness: 0.5 });
    const vaso = material(HEX.vaso, { emissive: '#7a2a24', emissiveIntensity: 0.4 });
    this.materiales.push(periostio, cortical, lineas, endostio, medula, vaso);

    anadir(
      this.capas.periostio,
      anillo(R_CORTICAL, R_PERIOSTIO, GROSOR_CORTE),
      periostio,
      'periostio',
    );
    anadir(
      this.capas.cortical,
      anillo(R_MEDULAR + 0.03, R_CORTICAL, GROSOR_CORTE),
      cortical,
      'cortical',
    );
    // Láminas circunferenciales externa e interna: dos hilos que rodean la cortical.
    anadir(
      this.capas.cortical,
      anillo(0.95, 0.968, GROSOR_CORTE + 0.006),
      lineas,
      'lamina_externa',
    );
    anadir(
      this.capas.cortical,
      anillo(0.66, 0.678, GROSOR_CORTE + 0.006),
      lineas,
      'lamina_interna',
    );
    anadir(
      this.capas.endostio,
      anillo(R_MEDULAR, R_MEDULAR + 0.03, GROSOR_CORTE),
      endostio,
      'endostio',
    );
    anadir(this.capas.medula, anillo(0, R_MEDULAR, GROSOR_CORTE), medula, 'medula_osea');

    // Un vaso de la médula (arteria nutricia, esquemática).
    const geoVaso = new SphereGeometry(0.075, 14, 10);
    this.geometrias.push(geoVaso);
    const vasoMalla = new Mesh(geoVaso, vaso);
    vasoMalla.position.set(0.16, -0.12, GROSOR_CORTE / 2 + 0.03);
    vasoMalla.name = 'vaso_medular';
    this.capas.medula.add(vasoMalla);

    // Osteonas: cuatro niveles concéntricos que se repiten en cada una (instancias).
    const osteonas = osteonasDelCorte();
    const alto = GROSOR_CORTE + 0.022;
    const nivel = (
      interior: number,
      exterior: number,
      color: string,
      nombre: string,
      resaltable = true,
    ): void => {
      const mat = material(color, { emissive: HEX.resalte, emissiveIntensity: 0 });
      // El conducto de Havers sigue rojo cuando se destacan las osteonas: es el «punto rojo» del texto.
      if (resaltable) this.matOsteonas.push(mat);
      this.materiales.push(mat);
      const geo = tumbar(anillo(interior, exterior, alto, 0, DOS_PI, 20));
      const malla = new InstancedMesh(geo, mat, osteonas.length);
      malla.name = nombre;
      const m = new Matrix4();
      const q = new Quaternion();
      osteonas.forEach((o, i) => {
        m.compose(new Vector3(o.x, o.y, 0), q, new Vector3(o.escala, o.escala, 1));
        malla.setMatrixAt(i, m);
      });
      malla.instanceMatrix.needsUpdate = true;
      malla.frustumCulled = false;
      this.instanciados.push(malla);
      this.capas.cortical.add(malla);
    };
    nivel(0.03, 0.055, HEX.laminaClara, 'osteona_lamina_1');
    nivel(0.055, 0.074, HEX.laminaOscura, 'osteona_lamina_2');
    nivel(0.074, 0.092, HEX.laminaClara, 'osteona_lamina_3');
    nivel(0, 0.03, HEX.vaso, 'osteona_conducto_havers', false);

    for (const capa of Object.values(this.capas)) this.grupo.add(capa);
  }

  actualizar(estado: EstadoHueso): void {
    const visible = estado.losa.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    this.grupo.position.set(estado.losa.x, estado.losa.y, 0);
    this.grupo.scale.setScalar(estado.losa.escala * TAMANO_CORTE);
    for (const [nombre, capa] of Object.entries(this.capas) as [keyof typeof SEPARACION, Group][]) {
      capa.position.z = SEPARACION[nombre] * estado.explosion;
    }
    poner(this.materiales, estado.losa.opacidad);
    for (const m of this.matOsteonas) {
      m.emissiveIntensity = 0.75 * estado.resalte;
      m.emissive.copy(this.resalte);
    }
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    for (const i of this.instanciados) i.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Osteona ampliada
 * ----------------------------------------------------------------------------------------- */

/** Ángulo de las fibras de colágeno respecto al eje de la osteona (grados; alterna de signo en cada lámina). */
const INCLINACION_FIBRAS = 38;

export class OsteonaAmpliada implements EscalaHueso {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matLineas: LineBasicMaterial[] = [];
  private readonly lagunas: InstancedMesh;
  private readonly cuerpos: InstancedMesh;
  private readonly posicionesLagunas: { pos: Vector3; q: Quaternion }[] = [];
  private readonly canaliculos: LineSegments;
  private readonly matCanaliculos: LineBasicMaterial;
  private ultimoEnfasis = -1;

  constructor() {
    this.grupo.name = 'osteona_ampliada';
    // Eje de la osteona en Y local; se tumba a lo largo de X como el hueso.
    this.grupo.rotation.z = -Math.PI / 2;

    const clara = material(HEX.laminaClara);
    const oscura = material(HEX.laminaOscura);
    const cemento = material(HEX.cemento, { roughness: 0.9 });
    const pared = material(HEX.endostio);
    const vaso = material(HEX.vaso, {
      roughness: 0.35,
      emissive: '#7a2a24',
      emissiveIntensity: 0.45,
    });
    const vena = material('#5b6fb5', { roughness: 0.35 });
    this.materiales.push(clara, oscura, cemento, pared, vaso, vena);

    // Láminas concéntricas, cada una cortada por un sector distinto (corte "en escalera").
    const geoClara: BufferGeometry[] = [];
    const geoOscura: BufferGeometry[] = [];
    for (let i = 0; i < N_LAMINAS; i++) {
      const { interior, exterior } = radiosDeLamina(i);
      const { theta0, arco } = arcoConservadoDeLamina(i);
      (i % 2 === 0 ? geoClara : geoOscura).push(
        anillo(interior, exterior, LARGO_OSTEONA, theta0, arco),
      );
    }
    this.anadir(geoClara, clara, 'laminas_claras');
    this.anadir(geoOscura, oscura, 'laminas_oscuras');
    const ultima = arcoConservadoDeLamina(N_LAMINAS - 1);
    this.anadir(
      [anillo(R_OSTEONA, R_OSTEONA + 0.05, LARGO_OSTEONA, ultima.theta0, ultima.arco)],
      cemento,
      'linea_de_cemento',
    );
    const primera = arcoConservadoDeLamina(0);
    this.anadir(
      [anillo(R_HAVERS, R_HAVERS + 0.07, LARGO_OSTEONA, primera.theta0, primera.arco)],
      pared,
      'pared_conducto_havers',
    );

    // Conducto de Havers: un capilar y una vénula.
    const geoCapilar = new CylinderGeometry(0.11, 0.11, LARGO_OSTEONA + 1.2, 18);
    geoCapilar.translate(0.06, 0, 0.02);
    const geoVenula = new CylinderGeometry(0.07, 0.07, LARGO_OSTEONA + 1.2, 14);
    geoVenula.translate(-0.1, 0, -0.05);
    this.geometrias.push(geoCapilar, geoVenula);
    const capilar = new Mesh(geoCapilar, vaso);
    capilar.name = 'capilar';
    const venula = new Mesh(geoVenula, vena);
    venula.name = 'venula';
    this.grupo.add(capilar, venula);

    // Conducto de Volkmann: sale de lado, perpendicular, y conecta este conducto con otros.
    const largoVolkmann = R_OSTEONA + 1.1;
    const geoVolkmann = new CylinderGeometry(0.075, 0.075, largoVolkmann, 12);
    geoVolkmann.translate(0, largoVolkmann / 2, 0);
    const thetaV = THETA_RETIRO + grados(125);
    const dirV = new Vector3(Math.sin(thetaV), 0, Math.cos(thetaV));
    geoVolkmann.applyQuaternion(new Quaternion().setFromUnitVectors(EJE_Y, dirV));
    geoVolkmann.translate(0, 0.7, 0);
    this.geometrias.push(geoVolkmann);
    const volkmann = new Mesh(geoVolkmann, vaso);
    volkmann.name = 'conducto_volkmann';
    this.grupo.add(volkmann);

    // Fibras de colágeno: rayas oblicuas que cambian de sentido de una lámina a la siguiente.
    const geoFibras = this.fibras();
    this.geometrias.push(geoFibras);
    const matFibras = new LineBasicMaterial({ color: '#8e4470', transparent: true });
    this.matLineas.push(matFibras);
    this.grupo.add(new LineSegments(geoFibras, matFibras));

    // Osteocitos: la laguna (halo claro) y la célula (azul) dentro de ella, a la vista en los peldaños.
    const lagunasDatos = lagunasDeOsteocitos();
    const geoEsfera = new SphereGeometry(1, 12, 9);
    this.geometrias.push(geoEsfera);
    const matLaguna = material(HEX.laguna, { roughness: 0.5 });
    const matCelula = material(HEX.osteocito, { roughness: 0.4 });
    this.materiales.push(matLaguna, matCelula);
    this.lagunas = new InstancedMesh(geoEsfera, matLaguna, lagunasDatos.length);
    this.cuerpos = new InstancedMesh(geoEsfera, matCelula, lagunasDatos.length);
    this.lagunas.name = 'lagunas_osteocitos';
    this.cuerpos.name = 'osteocitos';
    this.lagunas.frustumCulled = false;
    this.cuerpos.frustumCulled = false;
    const qY = new Quaternion();
    const qZ = new Quaternion();
    const eZ = new Vector3(0, 0, 1);
    for (const l of lagunasDatos) {
      const pos = new Vector3(l.radio * Math.sin(l.theta), l.y, l.radio * Math.cos(l.theta));
      qY.setFromAxisAngle(EJE_Y, l.theta);
      qZ.setFromAxisAngle(eZ, l.giro);
      this.posicionesLagunas.push({ pos, q: qY.clone().multiply(qZ) });
    }
    this.grupo.add(this.lagunas, this.cuerpos);

    // Canalículos: prolongaciones finas que salen de cada osteocito y lo comunican con sus vecinos.
    this.matCanaliculos = new LineBasicMaterial({
      color: HEX.canaliculo,
      transparent: true,
      opacity: 0,
    });
    this.matLineas.push(this.matCanaliculos);
    const geoCanaliculos = this.canaliculosGeometria();
    this.geometrias.push(geoCanaliculos);
    this.canaliculos = new LineSegments(geoCanaliculos, this.matCanaliculos);
    this.canaliculos.name = 'canaliculos';
    this.canaliculos.frustumCulled = false;
    this.grupo.add(this.canaliculos);

    this.ponerLagunas(0);
  }

  private anadir(geometrias: BufferGeometry[], mat: Material, nombre: string): void {
    for (const g of geometrias) {
      const malla = new Mesh(g, mat);
      malla.name = nombre;
      this.geometrias.push(g);
      this.grupo.add(malla);
    }
  }

  /**
   * Rayas de las fibras de colágeno sobre la parte a la vista de cada lámina (el "peldaño" entre su corte y el
   * de la lámina de fuera). Cada raya es una hélice corta: la inclinación alterna de una lámina a la siguiente.
   */
  private fibras(): BufferGeometry {
    const puntos: number[] = [];
    const paso = 0.07;
    for (let i = 0; i < N_LAMINAS; i++) {
      const { exterior } = radiosDeLamina(i);
      const desde = arcoRetiradoDeLamina(i) / 2;
      const hasta =
        i + 1 < N_LAMINAS
          ? arcoRetiradoDeLamina(i + 1) / 2
          : arcoRetiradoDeLamina(i) / 2 + grados(30);
      const inclinacion = Math.tan(grados(INCLINACION_FIBRAS)) * (i % 2 === 0 ? 1 : -1);
      const dTheta = (paso * inclinacion) / exterior;
      const separacion = 0.13 / exterior;
      const r = exterior + 0.006;
      for (let fase = 0; fase < DOS_PI; fase += separacion) {
        for (let y = -LARGO_OSTEONA / 2; y < LARGO_OSTEONA / 2 - paso; y += paso) {
          const k = (y + LARGO_OSTEONA / 2) / paso;
          const a = fase + k * dTheta;
          const b = a + dTheta;
          const da = distanciaAngular(a, THETA_RETIRO);
          const db = distanciaAngular(b, THETA_RETIRO);
          if (da < desde || da > hasta || db < desde || db > hasta) continue;
          puntos.push(
            r * Math.sin(a),
            y,
            r * Math.cos(a),
            r * Math.sin(b),
            y + paso,
            r * Math.cos(b),
          );
        }
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(puntos, 3));
    return geo;
  }

  /** Canalículos: cada osteocito emite unas ramas cortas y se une con los vecinos más cercanos. */
  private canaliculosGeometria(): BufferGeometry {
    const puntos: number[] = [];
    const lista = this.posicionesLagunas;
    lista.forEach((a, i) => {
      // Unión con los dos vecinos más cercanos (sin duplicar el par).
      const cercanos = lista
        .map((b, j) => ({ j, d: a.pos.distanceTo(b.pos) }))
        .filter((c) => c.j !== i && c.d < 1.5)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2);
      for (const c of cercanos) {
        if (c.j < i && lista[c.j]) continue;
        const b = lista[c.j]!;
        puntos.push(a.pos.x, a.pos.y, a.pos.z, b.pos.x, b.pos.y, b.pos.z);
      }
      // Ramas cortas alrededor de la célula, en el plano de su superficie.
      const tangente = new Vector3(1, 0, 0).applyQuaternion(a.q);
      const axial = new Vector3(0, 1, 0).applyQuaternion(a.q);
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * DOS_PI + i * 0.7;
        const dir = tangente
          .clone()
          .multiplyScalar(Math.cos(ang))
          .addScaledVector(axial, Math.sin(ang));
        const fin = a.pos.clone().addScaledVector(dir, 0.2 + 0.05 * (k % 3));
        puntos.push(a.pos.x, a.pos.y, a.pos.z, fin.x, fin.y, fin.z);
      }
    });
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(puntos, 3));
    return geo;
  }

  private ponerLagunas(enfasis: number): void {
    if (Math.abs(enfasis - this.ultimoEnfasis) < 1e-4) return;
    this.ultimoEnfasis = enfasis;
    const k = 1 + 0.9 * enfasis;
    const m = new Matrix4();
    const salida = new Vector3();
    this.posicionesLagunas.forEach(({ pos, q }, i) => {
      // La laguna es una cavidad aplanada; la célula asoma un poco de ella, hacia fuera.
      m.compose(pos, q, new Vector3(0.16 * k, 0.1 * k, 0.03 * k));
      this.lagunas.setMatrixAt(i, m);
      salida
        .set(0, 0, 0.02 * k)
        .applyQuaternion(q)
        .add(pos);
      m.compose(salida, q, new Vector3(0.11 * k, 0.068 * k, 0.05 * k));
      this.cuerpos.setMatrixAt(i, m);
    });
    this.lagunas.instanceMatrix.needsUpdate = true;
    this.cuerpos.instanceMatrix.needsUpdate = true;
  }

  actualizar(estado: EstadoHueso): void {
    const visible = estado.osteona.opacidad > 0.004;
    this.grupo.visible = visible;
    if (!visible) return;
    this.grupo.scale.setScalar(estado.osteona.escala);
    poner(this.materiales, estado.osteona.opacidad);
    for (const l of this.matLineas) {
      l.opacity = estado.osteona.opacidad * 0.85;
    }
    this.matCanaliculos.opacity = estado.osteona.opacidad * estado.osteocitos;
    this.ponerLagunas(estado.osteocitos);
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
    for (const l of this.matLineas) l.dispose();
    this.lagunas.dispose();
    this.cuerpos.dispose();
  }
}
