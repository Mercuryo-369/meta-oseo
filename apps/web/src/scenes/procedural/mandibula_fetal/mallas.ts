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
 *
 * Revisión de diseño (2026-10-17): todos los barridos con las normales hacia fuera en las dos mitades (`invertir`
 * en la mitad +1); las células translúcidas escriben profundidad cuando ya se ven (no las vela la pared del fondo
 * de la masa) y se dibujan en una sola pasada; germen dentario en campana (órgano del esmalte en torno con la
 * papila dentro); grano del relieve a escala en la rama, la cara de corte y el Meckel; dos nódulos sinfisarios y
 * cartílago condilar en cono al aparecer.
 */
import type { BufferGeometry, Material, MeshStandardMaterial } from 'three';
import {
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { mezclar, suave } from '../interpolacion';
import {
  CONDENSACION,
  CONDILO,
  CONO_CONDILAR,
  CORONOIDES,
  GROSOR_RAMA,
  NERVIO,
  NODULO_SINFISARIO,
  U_MESENQUIMA,
  U_OIDO,
  celulasCondensacion,
  celulasMesenquima,
  centroCondensacion,
  centroCuerpo,
  centrosSinfisarios,
  escalaCuerpoEn,
  normalLateral,
  osiculos,
  perfilCuerpo,
  posicionEnArco,
  posicionGermen,
  puntoArco,
  puntoNervio,
  puntosMentoniano,
  radioGermen,
  radioMeckel,
  siluetaRama,
  tramosCuerpo,
} from './disposicion';
import type { Lado, Punto2, Vec3 } from './disposicion';
import { MESENQUIMA, N_CUERPO, N_GERMENES, R_NERVIO, U_RAMA } from './estado';
import type { EstadoMandibulaFetal } from './estado';
import {
  Barrido,
  campanaEsmalte,
  esferaUnitaria,
  perfilCirculo,
  placaExtruida,
  suavizarContorno,
} from './geometria';
import type { Anillo } from './geometria';
import { NATURAL as COLOR } from './paleta';
import type { TipoTejido } from '../realismo';
import { liberarMaterialOrganico, materialOrganico } from '../realismo';

const LADOS = [1, -1] as const;
const SIN_GIRO = new Quaternion();
const UMBRAL = 0.004;

/**
 * Material de un tejido (`realismo.ts`): físico, con relieve de superficie hecho por código y de doble cara (lo pone
 * `materialOrganico`: las cáscaras abiertas se ven por dentro).
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

/** Aplica una opacidad a un material translúcido (que no escribe profundidad: lo de dentro se ve). */
function translucido(m: Material, opacidad: number): void {
  m.opacity = Math.max(0, Math.min(1, opacidad));
  m.transparent = true;
  m.depthWrite = false;
}

/**
 * Opacidad de las células translúcidas (esferas pequeñas DENTRO de una masa translúcida): escriben profundidad en
 * cuanto se ven (por encima de 0,5, la regla de `ponerOpacidad`). La masa se dibuja después que ellas, y sin su
 * profundidad la pared del FONDO de la masa se mezclaba ENCIMA de las células: en la condensación se veía un 3 % de
 * cada célula en vez del 16 %. Mientras aparecen (casi invisibles) no la escriben, para no abrir huecos en la masa.
 */
function celulasTranslucidas(m: Material, opacidad: number): void {
  translucido(m, opacidad);
  m.depthWrite = m.opacity > 0.5;
}

const _pos = new Vector3();
const _esc = new Vector3();
/** Matriz de trabajo de los `actualizar` (no se crea ninguna por fotograma). */
const _matriz = new Matrix4();

/** Matriz de una esfera unitaria colocada en `centro` con semiejes `escala` (sin crear objetos por fotograma). */
function matrizEsfera(m: Matrix4, centro: Vec3, escala: Vec3): Matrix4 {
  return m.compose(
    _pos.set(centro[0], centro[1], centro[2]),
    SIN_GIRO,
    _esc.set(Math.max(0, escala[0]), Math.max(0, escala[1]), Math.max(0, escala[2])),
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
  /** Público para las pruebas de orientación. */
  readonly barrido: Barrido;
  private readonly geoCelula: BufferGeometry;
  private readonly matMasa: MeshStandardMaterial;
  private readonly matCelulas: MeshStandardMaterial;
  private readonly celulas: InstancedMesh;

  constructor() {
    this.grupo.name = 'ectomesenquima';
    // La masa es una elipse desplazada hacia lateral (donde va a formarse el hueso) que recorre las dos mitades.
    const perfil: Punto2[] = perfilCirculo(MESENQUIMA.ancho, 18, MESENQUIMA.alto).map(
      ([n, y]) => [n + 0.15, y] as const,
    );
    // Un solo tramo que recorre la mitad +X del oído a la línea media y sigue por la mitad -X hasta el otro
    // oído: como la normal lateral de las dos mitades coincide en la línea media, la masa es continua ahí y no
    // hay dos tapas cruzadas en el mentón. Su marco es diestro en las dos mitades: va invertido.
    this.barrido = new Barrido(
      perfil.length,
      [{ segmentos: 2 * SEGMENTOS_MESENQUIMA, tapas: true, invertir: true }],
      perfil,
    );
    this.barrido.escribirTramo(0, (i, n) => {
      const s = i / (n - 1);
      const lado: Lado = s <= 0.5 ? 1 : -1;
      const u = mezclar(U_MESENQUIMA.inicio, U_MESENQUIMA.fin, lado === 1 ? s * 2 : 2 - s * 2);
      return { centro: puntoArco(lado, u), n: normalLateral(lado, u), perfil };
    });
    this.barrido.terminar();
    this.matMasa = material(COLOR.mesenquima, 'mesenquima');
    translucido(this.matMasa, 0.4);
    const masa = new Mesh(this.barrido.geometria, this.matMasa);
    masa.name = 'masa_mesenquima';
    masa.renderOrder = 2;
    this.grupo.add(masa);

    // Esferas diminutas y cerradas: una sola pasada (sin la doble pasada de los transparentes de doble cara).
    this.matCelulas = material(COLOR.celulaMesenquimal, 'celula', { forceSinglePass: true });
    celulasTranslucidas(this.matCelulas, 0.8);
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
    celulasTranslucidas(this.matCelulas, Math.min(0.9, estado.mesenquima * 2.1));
  }

  liberar(): void {
    this.barrido.liberar();
    this.geoCelula.dispose();
    liberarMateriales([this.matMasa, this.matCelulas]);
    this.celulas.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Cartílago de Meckel, ligamento esfenomandibular, martillo y yunque
 * ----------------------------------------------------------------------------------------- */

const SEGMENTOS_MECKEL = 44;
const PERFIL_MECKEL = 14;
const U_FIN_MECKEL = 0.985;

export class CartilagoMeckel implements PiezaMandibulaFetal {
  readonly grupo = new Group();
  /** Público para las pruebas de orientación. */
  readonly barrido: Barrido;
  private readonly geoOsiculo: BufferGeometry;
  private readonly matCartilago: MeshStandardMaterial;
  private readonly matOsiculos: MeshStandardMaterial;
  private readonly osiculos: InstancedMesh;
  private readonly colorCartilago = new Color(COLOR.cartilago);
  private readonly colorLigamento = new Color(COLOR.ligamento);
  private ultimaRegresion = -1;

  constructor() {
    this.grupo.name = 'cartilago_meckel';
    this.barrido = new Barrido(
      PERFIL_MECKEL,
      LADOS.map((lado) => ({ segmentos: SEGMENTOS_MECKEL, tapas: false, invertir: lado === 1 })),
    );
    this.matCartilago = material(COLOR.cartilago, 'cartilago');
    // Grano a escala: alrededor del perfil las UV recorren una varilla de 0,11 de radio y a lo largo, 12 anillos;
    // con la repetición por defecto (3 × 3) salían 8,8 × 1,2 repeticiones por unidad: vetas en un cartílago hialino.
    this.matCartilago.bumpMap!.repeat.set(0.4, 3.6);
    const varilla = new Mesh(this.barrido.geometria, this.matCartilago);
    varilla.name = 'varilla_meckel';
    varilla.frustumCulled = false;
    this.grupo.add(varilla);

    this.matOsiculos = material(COLOR.cartilagoOscuro, 'cartilago');
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
    const m = _matriz;
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
    liberarMateriales([this.matCartilago, this.matOsiculos]);
    this.osiculos.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Nervio alveolar inferior
 * ----------------------------------------------------------------------------------------- */

const PERFIL_NERVIO = 10;
const R_RAMA_NERVIO = 0.03;

export class NervioAlveolar implements PiezaMandibulaFetal {
  readonly grupo = new Group();
  /** Público para las pruebas de orientación. */
  readonly barrido: Barrido;
  private readonly mat: MeshStandardMaterial;

  constructor() {
    this.grupo.name = 'nervio_alveolar_inferior';
    // Por cada lado: tronco, rama incisiva y rama mentoniana. La bifurcación está bajo el primer molar temporal
    // (u = 0,54): el tronco y la rama incisiva se reparten los anillos según su largo.
    this.barrido = new Barrido(
      PERFIL_NERVIO,
      LADOS.flatMap((lado) => [
        { segmentos: 28, tapas: false, invertir: lado === 1 },
        { segmentos: 18, tapas: false, invertir: lado === 1 },
        { segmentos: 10, tapas: false, invertir: lado === 1 },
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
    this.mat = material(COLOR.nervio, 'nervio', {
      emissive: COLOR.nervio,
      emissiveIntensity: 0.1,
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
    liberarMateriales([this.mat]);
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
    this.matMancha = material(COLOR.condensacion, 'mesenquima');
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
    this.matCelulas = material(COLOR.condensacion, 'celula', { forceSinglePass: true });
    celulasTranslucidas(this.matCelulas, 0);
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
    celulasTranslucidas(this.matCelulas, estado.condensacion);
  }

  liberar(): void {
    this.geoMancha.dispose();
    this.geoCelula.dispose();
    liberarMateriales([this.matMancha, this.matCelulas]);
    this.manchas.dispose();
    this.celulas.dispose();
  }
}

/* -------------------------------------------------------------------------------------------
 * Hueso: cuerpo, gérmenes, rama y cartílagos secundarios
 * ----------------------------------------------------------------------------------------- */

/** Segmentos del barrido del cuerpo por unidad de `u`. */
const DENSIDAD_CUERPO = 36;
/**
 * Grano del hueso fetal (repeticiones del relieve por unidad de escena), el mismo en el cuerpo y en la rama, que
 * comparten material. `REPETIR_CUERPO` lo da en el barrido del cuerpo al nacer (UV alrededor por longitud de arco y
 * a lo largo, una cada 12 anillos: ~1,8 en los dos sentidos, medido en las pruebas); la rama, una extrusión, trae
 * UV en unidades y se escala a lo mismo. Antes la rama salía con un grano 2-3 veces más fino que el cuerpo.
 */
const GRANO_HUESO = 1.8;
const REPETIR_CUERPO = [4.5, 4.1] as const;

interface TramoCuerpo {
  lado: Lado;
  u0: number;
  u1: number;
}

export class HuesoMandibular implements PiezaMandibulaFetal {
  readonly grupo = new Group();
  private readonly tramos: TramoCuerpo[] = [];
  /** Público para las pruebas de orientación. */
  readonly barrido: Barrido;
  private readonly cuerpo: Mesh;
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matHueso: MeshStandardMaterial;
  private readonly germenes: InstancedMesh;
  private readonly campanas: InstancedMesh;
  private readonly ramas: Group[] = [];
  private readonly anclasRama: Vec3[] = [];
  private readonly cartilagos: InstancedMesh;
  private readonly resalte = new Color(COLOR.centroOsificacion);
  private ultimaClave = '';

  constructor() {
    this.grupo.name = 'hueso_mandibular';
    for (const lado of LADOS) {
      for (const t of tramosCuerpo(lado)) this.tramos.push({ lado, ...t });
    }
    // Perfil suavizado (sin aristas de polígono): la misma topología en cada escritura.
    const perfilTipo = suavizarContorno(perfilCuerpo(1));
    this.barrido = new Barrido(
      perfilTipo.length,
      this.tramos.map((t) => ({
        segmentos: Math.max(4, Math.round((t.u1 - t.u0) * DENSIDAD_CUERPO)),
        tapas: true,
        invertir: t.lado === 1,
      })),
      perfilTipo,
    );
    // Hueso fetal: entretejido, poroso y muy vascular. La cara de corte (tapas del barrido) muestra el
    // interior esponjoso con sus espacios vasculares.
    this.matHueso = material(COLOR.hueso, 'hueso_inmaduro', {
      emissive: COLOR.centroOsificacion,
      emissiveIntensity: 0,
    });
    this.matHueso.bumpMap!.repeat.set(REPETIR_CUERPO[0], REPETIR_CUERPO[1]);
    const matCorte = material(COLOR.corteHueso, 'hueso_esponjoso');
    // La cara de corte lleva UV con la misma escala en los dos ejes (el lado mayor del perfil, 1,03 a tamaño 1, mide
    // 1): con 2 × 6 sobre UV normalizadas por eje, los espacios vasculares salían aplastados (2,2:1). Ahora son
    // redondos, a unas 4 repeticiones por unidad.
    matCorte.bumpMap!.repeat.set(4, 4);
    this.materiales.push(this.matHueso, matCorte);
    this.cuerpo = new Mesh(this.barrido.geometria, [this.matHueso, matCorte]);
    this.cuerpo.name = 'cuerpo_oseo';
    this.cuerpo.frustumCulled = false;
    this.grupo.add(this.cuerpo);

    // Gérmenes dentarios en estadio de campana: el órgano del esmalte (convexo por fuera, cóncavo por dentro y
    // abierto abajo, en el asa cervical) envuelve la papila dental (la esfera crema, más baja y aplastada).
    const geoGermen = esferaUnitaria(16, 12);
    const geoCampana = campanaEsmalte(16);
    this.geometrias.push(geoGermen, geoCampana);
    const matGermen = material(COLOR.germen, 'celula');
    const matCampana = material(COLOR.campana, 'celula');
    this.materiales.push(matGermen, matCampana);
    this.germenes = new InstancedMesh(geoGermen, matGermen, 2 * N_GERMENES);
    this.germenes.name = 'germenes_dentarios';
    this.campanas = new InstancedMesh(geoCampana, matCampana, 2 * N_GERMENES);
    this.campanas.name = 'campanas_esmalte';
    this.germenes.frustumCulled = false;
    this.campanas.frustumCulled = false;
    this.grupo.add(this.germenes, this.campanas);

    // Rama: una placa con la coronoides y el cóndilo, anclada donde el cuerpo termina atrás.
    // Silueta suavizada y cantos redondeados: un hueso no tiene aristas vivas.
    const geoRama = placaExtruida(suavizarContorno(siluetaRama(), 2), GROSOR_RAMA, {
      bisel: 0.045,
      escalaUv: [GRANO_HUESO / REPETIR_CUERPO[0], GRANO_HUESO / REPETIR_CUERPO[1]],
    });
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

    // Cartílagos secundarios: condilar y coronoideo de cada lado, y los dos nódulos sinfisarios en la línea media.
    const geoCartilago = esferaUnitaria(18, 12);
    this.geometrias.push(geoCartilago);
    const matCartilago = material(COLOR.cartilago, 'cartilago');
    this.materiales.push(matCartilago);
    this.cartilagos = new InstancedMesh(geoCartilago, matCartilago, 6);
    this.cartilagos.name = 'cartilagos_secundarios';
    this.cartilagos.frustumCulled = false;
    this.grupo.add(this.cartilagos);
  }

  /** Escribe el barrido del cuerpo para un alcance, un tamaño y una altura alveolar (si cambiaron). */
  private escribirCuerpo(alcance: number, tamano: number, alveolar: number): void {
    const clave = `${alcance.toFixed(4)}|${tamano.toFixed(4)}|${alveolar.toFixed(4)}`;
    if (clave === this.ultimaClave) return;
    this.ultimaClave = clave;
    const base = suavizarContorno(perfilCuerpo(alveolar));
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

    const m = _matriz;
    const conGermenes = estado.germenes > UMBRAL;
    this.germenes.visible = conGermenes;
    this.campanas.visible = conGermenes;
    if (conGermenes) {
      LADOS.forEach((lado, k) => {
        for (let i = 0; i < N_GERMENES; i++) {
          const p = posicionGermen(lado, i);
          const r = radioGermen(i) * estado.germenes;
          // Papila dental: dentro de la campana, más baja; asoma por el asa cervical.
          this.germenes.setMatrixAt(
            k * N_GERMENES + i,
            matrizEsfera(m, [p[0], p[1] - 0.15 * r, p[2]], [0.78 * r, 0.62 * r, 0.78 * r]),
          );
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
      // Al aparecer, el cartílago condilar es un cono que baja por la rama; al osificarse queda como una capa
      // fina sobre la cabeza.
      const cono = 1 - osif;
      const [cx, cy, cz] = CONDILO.semiejes;
      const [kx, ky, kz] = CONO_CONDILAR.semiejes;
      LADOS.forEach((_, k) => {
        const [ax, ay, az] = this.anclasRama[k]!;
        const kc = cartilagos.condilar * (1 - 0.45 * osif);
        this.cartilagos.setMatrixAt(
          k * 2,
          matrizEsfera(
            m,
            [
              ax,
              ay + (CONDILO.y - CONO_CONDILAR.bajada * cono + 0.1 * osif) * r,
              az + CONDILO.z * r,
            ],
            [
              mezclar(cx, kx, cono) * kc,
              mezclar(cy, ky * r, cono) * kc,
              mezclar(cz, kz, cono) * kc,
            ],
          ),
        );
        const kk = CORONOIDES.radio * cartilagos.coronoideo;
        this.cartilagos.setMatrixAt(
          k * 2 + 1,
          matrizEsfera(m, [ax, ay + CORONOIDES.y * r, az + CORONOIDES.z * r], [kk, kk, kk]),
        );
      });
      const ks = cartilagos.sinfisario;
      const [sx, sy, sz] = NODULO_SINFISARIO.semiejes;
      centrosSinfisarios().forEach((c, j) => {
        this.cartilagos.setMatrixAt(4 + j, matrizEsfera(m, c, [sx * ks, sy * ks, sz * ks]));
      });
      this.cartilagos.instanceMatrix.needsUpdate = true;
    }

    this.grupo.visible = conCuerpo || conGermenes || conRama || conCartilagos;
  }

  liberar(): void {
    this.barrido.liberar();
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    this.germenes.dispose();
    this.campanas.dispose();
    this.cartilagos.dispose();
  }
}
