/**
 * Las piezas de la escena de la mandíbula fetal, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `Mesenquima`: la masa translúcida de ectomesénquima del primer arco (un barrido elíptico por las dos
 *    mitades) y sus células (esferas instanciadas).
 *  - `CartilagoMeckel`: la varilla de cartílago de cada lado, del oído a la línea media; con la regresión se
 *    adelgaza hasta quedar el ligamento esfenomandibular, y en el oído aparecen el martillo y el yunque.
 *  - `NervioAlveolar`: el nervio alveolar inferior, lateral y paralelo al Meckel, con su bifurcación en
 *    mentoniano e incisivo.
 *  - `Condensacion`: la mancha de mesénquima condensado donde va a aparecer el hueso, con sus células apretadas.
 *  - `HuesoMandibular`: el cuerpo óseo (un canal en U que crece desde el centro de osificación hacia delante y
 *    hacia atrás y sube en dos láminas), los gérmenes dentarios, la rama con el cóndilo y la coronoides, y los
 *    tres cartílagos secundarios. En la mitad +X al cuerpo le falta un tramo: la ventana de corte.
 *
 * No calculan nada de la embriología: reciben `EstadoMandibulaFetal` (puro) y solo escriben posiciones, escalan
 * y aclaran piezas. Materiales compartidos; al liberar se libera todo lo creado.
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
  SphereGeometry,
  Vector3,
} from 'three';
import { mezclar, suave } from '../interpolacion';
import {
  CONDENSACION,
  CONDILO,
  CORONOIDES,
  GERMEN,
  GROSOR_RAMA,
  NERVIO,
  U_MESENQUIMA,
  U_OIDO,
  celulasCondensacion,
  celulasMesenquima,
  centroCondensacion,
  centroCuerpo,
  centroSinfisis,
  escalaCuerpoEn,
  normalLateral,
  osiculos,
  perfilCuerpo,
  posicionEnArco,
  posicionGermen,
  puntoArco,
  puntoNervio,
  puntosMentoniano,
  radioMeckel,
  siluetaRama,
  tramosCuerpo,
} from './disposicion';
import type { Lado, Punto2, Vec3 } from './disposicion';
import { MESENQUIMA, N_CUERPO, N_GERMENES, R_NERVIO, U_CUERPO, U_RAMA } from './estado';
import type { EstadoMandibulaFetal } from './estado';
import { Barrido, esferaUnitaria, perfilCirculo, placaExtruida } from './geometria';
import type { Anillo } from './geometria';
import { HEX } from './paleta';

const LADOS = [1, -1] as const;
const SIN_GIRO = new Quaternion();
const UMBRAL = 0.004;

/** Material estándar de doble cara: los barridos abiertos y las tapas se ven por los dos lados. */
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

/** Aplica una opacidad a un material translúcido (que no escribe profundidad: lo de dentro se ve). */
function translucido(m: Material, opacidad: number): void {
  m.opacity = Math.max(0, Math.min(1, opacidad));
  m.transparent = true;
  m.depthWrite = false;
}

/** Matriz de una esfera unitaria colocada en `centro` con semiejes `escala`. */
function matrizEsfera(m: Matrix4, centro: Vec3, escala: Vec3): Matrix4 {
  return m.compose(
    new Vector3(...centro),
    SIN_GIRO,
    new Vector3(Math.max(0, escala[0]), Math.max(0, escala[1]), Math.max(0, escala[2])),
  );
}

/** Interfaz común de las piezas. */
export interface PiezaMandibulaFetal {
  readonly grupo: Group;
  actualizar: (estado: EstadoMandibulaFetal) => void;
  liberar: () => void;
}

/* -------------------------------------------------------------------------------------------
 * Mesénquima
 * ----------------------------------------------------------------------------------------- */

const N_CELULAS_MESENQUIMA = 150;
/** Anillos del barrido del mesénquima por mitad. */
const SEGMENTOS_MESENQUIMA = 34;
const RADIO_CELULA = 0.045;

export class Mesenquima implements PiezaMandibulaFetal {
  readonly grupo = new Group();
  private readonly barrido: Barrido;
  private readonly geoCelula: BufferGeometry;
  private readonly matMasa: MeshStandardMaterial;
  private readonly matCelulas: MeshStandardMaterial;
  private readonly celulas: InstancedMesh;

  constructor() {
    this.grupo.name = 'ectomesenquima';
    // La masa es una elipse desplazada hacia lateral (donde va a formarse el hueso) que recorre las dos mitades.
    const perfil: Punto2[] = perfilCirculo(MESENQUIMA.ancho, 14, MESENQUIMA.alto).map(
      ([n, y]) => [n + 0.15, y] as const,
    );
    // Un solo tramo que recorre la mitad +X del oído a la línea media y sigue por la mitad -X hasta el otro
    // oído: como la normal lateral de las dos mitades coincide en la línea media, la masa es continua ahí y no
    // hay dos tapas cruzadas en el mentón.
    this.barrido = new Barrido(
      perfil.length,
      [{ segmentos: 2 * SEGMENTOS_MESENQUIMA, tapas: true }],
      perfil,
    );
    this.barrido.escribirTramo(0, (i, n) => {
      const s = i / (n - 1);
      const lado: Lado = s <= 0.5 ? 1 : -1;
      const u = mezclar(U_MESENQUIMA.inicio, U_MESENQUIMA.fin, lado === 1 ? s * 2 : 2 - s * 2);
      return { centro: puntoArco(lado, u), n: normalLateral(lado, u), perfil };
    });
    this.barrido.terminar();
    this.matMasa = material(HEX.mesenquima, { roughness: 0.95 });
    translucido(this.matMasa, 0.4);
    const masa = new Mesh(this.barrido.geometria, this.matMasa);
    masa.name = 'masa_mesenquima';
    masa.renderOrder = 2;
    this.grupo.add(masa);

    this.matCelulas = material(HEX.celulaMesenquimal, { roughness: 0.7 });
    translucido(this.matCelulas, 0.8);
    this.geoCelula = esferaUnitaria(6, 4);
    const lista = celulasMesenquima(N_CELULAS_MESENQUIMA, 77);
    this.celulas = new InstancedMesh(this.geoCelula, this.matCelulas, lista.length);
    this.celulas.name = 'celulas_mesenquima';
    this.celulas.frustumCulled = false;
    const m = new Matrix4();
    lista.forEach((c, i) => {
      const r = RADIO_CELULA * c.escala;
      this.celulas.setMatrixAt(i, matrizEsfera(m, c.posicion, [r, r, r]));
    });
    this.celulas.instanceMatrix.needsUpdate = true;
    this.grupo.add(this.celulas);
  }

  actualizar(estado: EstadoMandibulaFetal): void {
    const visible = estado.mesenquima > UMBRAL;
    this.grupo.visible = visible;
    if (!visible) return;
    translucido(this.matMasa, estado.mesenquima);
    translucido(this.matCelulas, Math.min(0.9, estado.mesenquima * 2.1));
  }

  liberar(): void {
    this.barrido.liberar();
    this.geoCelula.dispose();
    this.matMasa.dispose();
    this.matCelulas.dispose();
    this.celulas.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Cartílago de Meckel, ligamento esfenomandibular, martillo y yunque
 * ----------------------------------------------------------------------------------------- */

const SEGMENTOS_MECKEL = 44;
const PERFIL_MECKEL = 10;
const U_FIN_MECKEL = 0.985;

export class CartilagoMeckel implements PiezaMandibulaFetal {
  readonly grupo = new Group();
  private readonly barrido: Barrido;
  private readonly geoOsiculo: BufferGeometry;
  private readonly matCartilago: MeshStandardMaterial;
  private readonly matOsiculos: MeshStandardMaterial;
  private readonly osiculos: InstancedMesh;
  private readonly colorCartilago = new Color(HEX.cartilago);
  private readonly colorLigamento = new Color(HEX.ligamento);
  private ultimaRegresion = -1;

  constructor() {
    this.grupo.name = 'cartilago_meckel';
    this.barrido = new Barrido(
      PERFIL_MECKEL,
      LADOS.map(() => ({ segmentos: SEGMENTOS_MECKEL, tapas: false })),
    );
    this.matCartilago = material(HEX.cartilago, { roughness: 0.35 });
    const varilla = new Mesh(this.barrido.geometria, this.matCartilago);
    varilla.name = 'varilla_meckel';
    varilla.frustumCulled = false;
    this.grupo.add(varilla);

    this.matOsiculos = material(HEX.cartilagoOscuro, { roughness: 0.4 });
    this.geoOsiculo = esferaUnitaria(12, 8);
    this.osiculos = new InstancedMesh(this.geoOsiculo, this.matOsiculos, 4);
    this.osiculos.name = 'martillo_y_yunque';
    this.osiculos.frustumCulled = false;
    this.grupo.add(this.osiculos);
    this.escribir(0);
  }

  private escribir(regresion: number): void {
    if (Math.abs(regresion - this.ultimaRegresion) < 1e-4) return;
    this.ultimaRegresion = regresion;
    LADOS.forEach((lado, k) => {
      this.barrido.escribirTramo(k, (i, n): Anillo => {
        const u = mezclar(U_OIDO, U_FIN_MECKEL, i / (n - 1));
        return {
          centro: puntoArco(lado, u),
          n: normalLateral(lado, u),
          perfil: perfilCirculo(radioMeckel(u, regresion), PERFIL_MECKEL),
        };
      });
    });
    this.barrido.terminar();
    this.matCartilago.color.lerpColors(this.colorCartilago, this.colorLigamento, suave(regresion));
  }

  actualizar(estado: EstadoMandibulaFetal): void {
    this.escribir(estado.meckel.regresion);
    // Las matrices se escriben siempre (también con tamaño 0): así el estado de la pieza depende solo de `t`.
    const s = estado.meckel.osiculos;
    this.osiculos.visible = s > UMBRAL;
    const m = new Matrix4();
    LADOS.forEach((lado, k) => {
      osiculos(lado).forEach((o, j) => {
        this.osiculos.setMatrixAt(
          k * 2 + j,
          matrizEsfera(m, o.centro, [o.semiejes[0] * s, o.semiejes[1] * s, o.semiejes[2] * s]),
        );
      });
    });
    this.osiculos.instanceMatrix.needsUpdate = true;
  }

  liberar(): void {
    this.barrido.liberar();
    this.geoOsiculo.dispose();
    this.matCartilago.dispose();
    this.matOsiculos.dispose();
    this.osiculos.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Nervio alveolar inferior
 * ----------------------------------------------------------------------------------------- */

const PERFIL_NERVIO = 8;
const R_RAMA_NERVIO = 0.03;

export class NervioAlveolar implements PiezaMandibulaFetal {
  readonly grupo = new Group();
  private readonly barrido: Barrido;
  private readonly mat: MeshStandardMaterial;

  constructor() {
    this.grupo.name = 'nervio_alveolar_inferior';
    // Por cada lado: tronco, rama incisiva y rama mentoniana.
    this.barrido = new Barrido(
      PERFIL_NERVIO,
      LADOS.flatMap(() => [
        { segmentos: 34, tapas: false },
        { segmentos: 12, tapas: false },
        { segmentos: 10, tapas: false },
      ]),
    );
    const tronco = perfilCirculo(R_NERVIO, PERFIL_NERVIO);
    const rama = perfilCirculo(R_RAMA_NERVIO, PERFIL_NERVIO);
    LADOS.forEach((lado, k) => {
      this.barrido.escribirTramo(k * 3, (i, n) => {
        const u = mezclar(NERVIO.uInicio, NERVIO.uBifurcacion, i / (n - 1));
        return { centro: puntoNervio(lado, u), n: normalLateral(lado, u), perfil: tronco };
      });
      this.barrido.escribirTramo(k * 3 + 1, (i, n) => {
        const u = mezclar(NERVIO.uBifurcacion, NERVIO.uFinIncisivo, i / (n - 1));
        return { centro: puntoNervio(lado, u), n: normalLateral(lado, u), perfil: rama };
      });
      const mentoniano = puntosMentoniano(lado, 11);
      const nl = normalLateral(lado, NERVIO.uBifurcacion);
      this.barrido.escribirTramo(k * 3 + 2, (i) => ({
        centro: mentoniano[i] ?? mentoniano[mentoniano.length - 1]!,
        // La normal lateral del tronco vale como referencia: la rama es corta y el perfil, redondo.
        n: [nl[2] * lado, 0, -nl[0] * lado],
        perfil: rama,
      }));
    });
    this.barrido.terminar();
    this.mat = material(HEX.nervio, {
      roughness: 0.5,
      emissive: HEX.nervio,
      emissiveIntensity: 0.18,
    });
    const malla = new Mesh(this.barrido.geometria, this.mat);
    malla.name = 'nervio';
    malla.frustumCulled = false;
    this.grupo.add(malla);
  }

  actualizar(): void {
    // El nervio está desde el principio y no cambia: cuando el hueso lo envuelve, deja de verse por fuera.
  }

  liberar(): void {
    this.barrido.liberar();
    this.mat.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Condensación del mesénquima
 * ----------------------------------------------------------------------------------------- */

const N_CELULAS_CONDENSACION = 40;

export class Condensacion implements PiezaMandibulaFetal {
  readonly grupo = new Group();
  private readonly geoMancha: BufferGeometry;
  private readonly geoCelula: BufferGeometry;
  private readonly matMancha: MeshStandardMaterial;
  private readonly matCelulas: MeshStandardMaterial;
  private readonly manchas: InstancedMesh;
  private readonly celulas: InstancedMesh;

  constructor() {
    this.grupo.name = 'condensacion';
    this.geoMancha = esferaUnitaria(16, 12);
    this.matMancha = material(HEX.condensacion, { roughness: 0.9 });
    translucido(this.matMancha, 0);
    this.manchas = new InstancedMesh(this.geoMancha, this.matMancha, 2);
    this.manchas.name = 'mancha_condensacion';
    this.manchas.frustumCulled = false;
    this.manchas.renderOrder = 1;
    const m = new Matrix4();
    LADOS.forEach((lado, k) => {
      this.manchas.setMatrixAt(k, matrizEsfera(m, centroCondensacion(lado), CONDENSACION.semiejes));
    });
    this.manchas.instanceMatrix.needsUpdate = true;
    this.grupo.add(this.manchas);

    this.geoCelula = esferaUnitaria(6, 4);
    this.matCelulas = material(HEX.condensacion, { roughness: 0.6 });
    translucido(this.matCelulas, 0);
    const lista = celulasCondensacion(N_CELULAS_CONDENSACION, 313);
    this.celulas = new InstancedMesh(this.geoCelula, this.matCelulas, lista.length);
    this.celulas.name = 'celulas_condensacion';
    this.celulas.frustumCulled = false;
    lista.forEach((c, i) => {
      const r = RADIO_CELULA * 0.9 * c.escala;
      this.celulas.setMatrixAt(i, matrizEsfera(m, c.posicion, [r, r, r]));
    });
    this.celulas.instanceMatrix.needsUpdate = true;
    this.grupo.add(this.celulas);
  }

  actualizar(estado: EstadoMandibulaFetal): void {
    const visible = estado.condensacion > UMBRAL;
    this.grupo.visible = visible;
    if (!visible) return;
    translucido(this.matMancha, 0.72 * estado.condensacion);
    translucido(this.matCelulas, estado.condensacion);
  }

  liberar(): void {
    this.geoMancha.dispose();
    this.geoCelula.dispose();
    this.matMancha.dispose();
    this.matCelulas.dispose();
    this.manchas.dispose();
    this.celulas.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Hueso: cuerpo, gérmenes, rama y cartílagos secundarios
 * ----------------------------------------------------------------------------------------- */

/** Segmentos del barrido del cuerpo por unidad de `u`. */
const DENSIDAD_CUERPO = 36;
/** Semiejes del cartílago sinfisario a tamaño 1. */
const SINFISIS: Vec3 = [0.2, 0.46, 0.3];

interface TramoCuerpo {
  lado: Lado;
  u0: number;
  u1: number;
}

export class HuesoMandibular implements PiezaMandibulaFetal {
  readonly grupo = new Group();
  private readonly tramos: TramoCuerpo[] = [];
  private readonly barrido: Barrido;
  private readonly cuerpo: Mesh;
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matHueso: MeshStandardMaterial;
  private readonly germenes: InstancedMesh;
  private readonly campanas: InstancedMesh;
  private readonly ramas: Group[] = [];
  private readonly anclasRama: Vec3[] = [];
  private readonly cartilagos: InstancedMesh;
  private readonly resalte = new Color(HEX.centroOsificacion);
  private ultimaClave = '';

  constructor() {
    this.grupo.name = 'hueso_mandibular';
    for (const lado of LADOS) {
      for (const t of tramosCuerpo(lado)) this.tramos.push({ lado, ...t });
    }
    const perfilTipo = perfilCuerpo(1);
    this.barrido = new Barrido(
      perfilTipo.length,
      this.tramos.map((t) => ({
        segmentos: Math.max(4, Math.round((t.u1 - t.u0) * DENSIDAD_CUERPO)),
        tapas: true,
      })),
      perfilTipo,
    );
    this.matHueso = material(HEX.hueso, {
      emissive: HEX.centroOsificacion,
      emissiveIntensity: 0,
    });
    this.materiales.push(this.matHueso);
    this.cuerpo = new Mesh(this.barrido.geometria, this.matHueso);
    this.cuerpo.name = 'cuerpo_oseo';
    this.cuerpo.frustumCulled = false;
    this.grupo.add(this.cuerpo);

    // Gérmenes dentarios: el germen y, encima, la campana del órgano del esmalte.
    const geoGermen = esferaUnitaria(12, 9);
    const geoCampana = new SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    this.geometrias.push(geoGermen, geoCampana);
    const matGermen = material(HEX.germen, { roughness: 0.5 });
    const matCampana = material(HEX.campana, { roughness: 0.4 });
    this.materiales.push(matGermen, matCampana);
    this.germenes = new InstancedMesh(geoGermen, matGermen, 2 * N_GERMENES);
    this.germenes.name = 'germenes_dentarios';
    this.campanas = new InstancedMesh(geoCampana, matCampana, 2 * N_GERMENES);
    this.campanas.name = 'campanas_esmalte';
    this.germenes.frustumCulled = false;
    this.campanas.frustumCulled = false;
    this.grupo.add(this.germenes, this.campanas);

    // Rama: una placa con la coronoides y el cóndilo, anclada donde el cuerpo termina atrás.
    const geoRama = placaExtruida(siluetaRama(), GROSOR_RAMA);
    this.geometrias.push(geoRama);
    for (const lado of LADOS) {
      const ancla = posicionEnArco(lado, U_RAMA, N_CUERPO, 0);
      const rama = new Group();
      rama.name = 'rama';
      rama.position.set(...ancla);
      const placa = new Mesh(geoRama, this.matHueso);
      placa.name = 'placa_rama';
      rama.add(placa);
      this.ramas.push(rama);
      this.anclasRama.push(ancla);
      this.grupo.add(rama);
    }

    // Cartílagos secundarios: condilar y coronoideo de cada lado, y el sinfisario en la línea media.
    const geoCartilago = esferaUnitaria(14, 10);
    this.geometrias.push(geoCartilago);
    const matCartilago = material(HEX.cartilago, { roughness: 0.35 });
    this.materiales.push(matCartilago);
    this.cartilagos = new InstancedMesh(geoCartilago, matCartilago, 5);
    this.cartilagos.name = 'cartilagos_secundarios';
    this.cartilagos.frustumCulled = false;
    this.grupo.add(this.cartilagos);
  }

  /** Escribe el barrido del cuerpo para un alcance, un tamaño y una altura alveolar (si cambiaron). */
  private escribirCuerpo(alcance: number, tamano: number, alveolar: number): void {
    const clave = `${alcance.toFixed(4)}|${tamano.toFixed(4)}|${alveolar.toFixed(4)}`;
    if (clave === this.ultimaClave) return;
    this.ultimaClave = clave;
    const base = perfilCuerpo(alveolar);
    this.tramos.forEach((t, k) => {
      this.barrido.escribirTramo(k, (i, n): Anillo => {
        const u = mezclar(t.u0, t.u1, i / (n - 1));
        const s = escalaCuerpoEn(u, alcance, tamano);
        return {
          centro: centroCuerpo(t.lado, u),
          n: normalLateral(t.lado, u),
          perfil: base.map(([a, b]) => [a * s, b * s] as const),
        };
      });
    });
    this.barrido.terminar();
  }

  actualizar(estado: EstadoMandibulaFetal): void {
    const { hueso, cartilagos } = estado;
    const conCuerpo = hueso.alcance > 0.001;
    this.cuerpo.visible = conCuerpo;
    if (conCuerpo) this.escribirCuerpo(hueso.alcance, hueso.tamano, hueso.alveolar);
    this.matHueso.emissiveIntensity = 0.9 * hueso.resalteCentro;
    this.matHueso.emissive.copy(this.resalte);

    const m = new Matrix4();
    const conGermenes = estado.germenes > UMBRAL;
    this.germenes.visible = conGermenes;
    this.campanas.visible = conGermenes;
    if (conGermenes) {
      LADOS.forEach((lado, k) => {
        for (let i = 0; i < N_GERMENES; i++) {
          const p = posicionGermen(lado, i);
          const r = GERMEN.radio * estado.germenes;
          this.germenes.setMatrixAt(k * N_GERMENES + i, matrizEsfera(m, p, [r, r, r]));
          this.campanas.setMatrixAt(
            k * N_GERMENES + i,
            matrizEsfera(m, [p[0], p[1] + 0.02, p[2]], [r * 1.14, r * 1.1, r * 1.14]),
          );
        }
      });
      this.germenes.instanceMatrix.needsUpdate = true;
      this.campanas.instanceMatrix.needsUpdate = true;
    }

    const conRama = hueso.rama > UMBRAL;
    for (const rama of this.ramas) {
      rama.visible = conRama;
      rama.scale.set(1, Math.max(hueso.rama, 0.001), Math.max(hueso.rama, 0.001));
    }

    const conCartilagos =
      Math.max(cartilagos.condilar, cartilagos.coronoideo, cartilagos.sinfisario) > UMBRAL;
    this.cartilagos.visible = conCartilagos;
    if (conCartilagos) {
      const r = hueso.rama;
      const osif = cartilagos.osificacionCondilo;
      LADOS.forEach((_, k) => {
        const [ax, ay, az] = this.anclasRama[k]!;
        // El cartílago condilar envuelve la cabeza; al osificarse queda como una capa fina encima.
        const kc = cartilagos.condilar * (1 - 0.45 * osif);
        this.cartilagos.setMatrixAt(
          k * 2,
          matrizEsfera(
            m,
            [ax, ay + CONDILO.y * r + 0.1 * osif * r, az + CONDILO.z * r],
            [CONDILO.semiejes[0] * kc, CONDILO.semiejes[1] * kc, CONDILO.semiejes[2] * kc],
          ),
        );
        const kk = CORONOIDES.radio * cartilagos.coronoideo;
        this.cartilagos.setMatrixAt(
          k * 2 + 1,
          matrizEsfera(m, [ax, ay + CORONOIDES.y * r, az + CORONOIDES.z * r], [kk, kk, kk]),
        );
      });
      const ks = cartilagos.sinfisario;
      this.cartilagos.setMatrixAt(
        4,
        matrizEsfera(m, centroSinfisis(), [SINFISIS[0] * ks, SINFISIS[1] * ks, SINFISIS[2] * ks]),
      );
      this.cartilagos.instanceMatrix.needsUpdate = true;
    }

    this.grupo.visible = conCuerpo || conGermenes || conRama || conCartilagos;
  }

  liberar(): void {
    this.barrido.liberar();
    for (const g of this.geometrias) g.dispose();
    for (const mat of this.materiales) mat.dispose();
    this.germenes.dispose();
    this.campanas.dispose();
    this.cartilagos.dispose();
  }
}

/** Reexportado para las pruebas: extremos del cuerpo óseo en `u`. */
export const LIMITES_CUERPO = U_CUERPO;
