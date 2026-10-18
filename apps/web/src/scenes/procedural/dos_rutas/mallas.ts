/**
 * Los dos lados de la escena de las dos rutas, como objetos de three con `actualizar(estado)` y `liberar()`:
 *
 *  - `LadoIntramembranoso` (izquierda): el panel de mesénquima translúcido, sus células (dispersas, condensadas,
 *    osteoblastos al borde de las espículas, osteocitos dentro), el islote de osteoide, la red de espículas que se
 *    engruesan y cambian de color al mineralizarse, los vasos que entran, la médula, las dos tablas compactas y,
 *    al final, las osteonas y laminillas del hueso laminar.
 *  - `LadoEndocondral` (derecha): el panel, sus células (condrocitos en sus lagunas, hipertróficos en el centro),
 *    el molde cartilaginoso translúcido con pericondrio, la zona calcificada, el collar perióstico abierto hacia la
 *    cámara, la yema vascular, el vaso medular, las trabéculas del centro primario con osteoclastos y osteoblastos
 *    en el frente, los centros secundarios, la cavidad medular y la cortical madura.
 *
 * No calculan nada de la biología: reciben `EstadoDosRutas` (puro) y solo colocan, escalan, colorean y aclaran
 * piezas. Materiales compartidos por tipo; `InstancedMesh` para todo lo repetido (una instancia oculta tiene matriz
 * cero); al liberar se libera todo lo creado.
 *
 * Realismo (2026-10-14): materiales orgánicos por tejido (`realismo.ts`) con la paleta natural (`NATURAL`), células
 * de 12 × 8 segmentos, tamaño y grosor algo distintos (deterministas) en cada célula, espícula, vaso y trabécula,
 * tablas de borde biselado y osteonas con su conducto de Havers.
 *
 * Revisión de diseño (2026-10-17): grano del relieve en unidades de escena en las tablas, el collar, la cortical y el
 * pericondrio; el molde de cartílago con velo de Fresnel (más denso en el centro, como un sólido translúcido) y
 * menos barniz; osteoclastos aplanados contra el frente y osteoblastos cúbicos-altos; médula roja en la cavidad
 * medular del hueso en crecimiento; la tabla superior no proyecta sombra sobre el diploe; las instancias ocultas
 * con escala 0 (no matriz nula).
 */
import type { Material } from 'three';
import {
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  FrontSide,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { acotar, fraccion, generadorDeterminista, mezclar, suave } from '../interpolacion';
import {
  TRAMOS_VASO,
  celulasEndocondrales,
  celulasIntramembranosas,
  espiculasIntramembranosas,
  osteonasDePlaca,
  trabeculasDelCentro,
  vasosIntramembranosos,
} from './disposicion';
import type { CelulaEc, CelulaIm, Espicula, Punto3, TrabeculaCentro, Vaso } from './disposicion';
import {
  COLLAR,
  CORTICAL,
  MOLDE,
  N_OSTEOBLASTOS_CENTRO,
  N_OSTEOCLASTOS,
  PANEL,
  PLACA,
  R_ESPICULA,
  R_INTERIOR_DIAFISIS,
  SECUNDARIO,
  X_LADO,
  YEMA,
} from './estado';
import type { EstadoDosRutas } from './estado';
import { anilloAbierto, caja, cilindro, esfera, osteonaConCanal, tabla, tramo } from './geometria';
import { NATURAL as COLOR } from './paleta';
import type { TipoTejido } from '../realismo';
import { liberarMaterialOrganico, materialOrganico, veloFresnel } from '../realismo';

const EJE_Y = new Vector3(0, 1, 0);
const EJE_Z = new Vector3(0, 0, 1);
/**
 * Instancia oculta: escala 0 con el término homogéneo en 1. Con las 16 componentes a 0, `applyMatrix4` dividía
 * entre 0 y la esfera envolvente de la malla salía NaN (three la usa para ordenar los transparentes).
 */
const MATRIZ_CERO = new Matrix4().makeScale(0, 0, 0);

/**
 * Material de un tejido (`realismo.ts`): físico y con relieve de superficie hecho por código. De UNA cara por
 * defecto, como antes (a diferencia del hueso largo, que tiene cáscaras abiertas): aquí casi todo son sólidos
 * cerrados y varios translúcidos (células, cartílago, pericondrio) se verían con doble capa. Las piezas abiertas
 * (velos, collar y cortical) piden la doble cara.
 */
function material(
  color: string,
  tipo: TipoTejido = 'hueso',
  extra: ConstructorParameters<typeof MeshPhysicalMaterial>[0] = {},
): MeshPhysicalMaterial {
  return materialOrganico(color, tipo, { side: FrontSide, ...extra });
}

/** Libera materiales: los orgánicos con su clon de textura de relieve. */
function liberarMateriales(lista: readonly Material[]): void {
  for (const m of lista) {
    if (m instanceof MeshPhysicalMaterial) liberarMaterialOrganico(m);
    else m.dispose();
  }
}

/** Material translúcido que no escribe profundidad (tiñe lo que tiene detrás sin taparlo). */
function velo(
  color: string,
  tipo: TipoTejido,
  opacity: number,
  renderOrder: number,
  malla: Mesh,
): MeshPhysicalMaterial {
  const m = material(color, tipo, {
    transparent: true,
    opacity,
    depthWrite: false,
    side: DoubleSide,
  });
  malla.material = m;
  malla.renderOrder = renderOrder;
  return m;
}

/**
 * `n` factores deterministas entre `min` y `max`: en un tejido real ni las células ni las espículas miden todas lo
 * mismo. La misma semilla da siempre los mismos factores.
 */
function variacion(semilla: number, n: number, min: number, max: number): number[] {
  const azar = generadorDeterminista(semilla);
  return Array.from({ length: n }, () => mezclar(min, max, azar()));
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

const auxPos = new Vector3();
const auxEsc = new Vector3();
const auxQ = new Quaternion();
const auxQY = new Quaternion();
const auxM = new Matrix4();
const auxDir = new Vector3();
const auxColor = new Color();

/**
 * Escribe en `malla` la instancia `i`: una esfera unitaria en `p` con semiejes `s`, girada `giroZ` alrededor de Z y
 * después `giroY` alrededor de Y (para orientar una célula aplanada dentro de su plano sin inclinarla fuera de él).
 */
function ponerEsfera(
  malla: InstancedMesh,
  i: number,
  p: Punto3,
  sx: number,
  sy: number,
  sz: number,
  giroZ = 0,
  giroY = 0,
): void {
  if (sx < 0.002 || sy < 0.002 || sz < 0.002) {
    malla.setMatrixAt(i, MATRIZ_CERO);
    return;
  }
  auxPos.set(p[0], p[1], p[2]);
  auxEsc.set(sx, sy, sz);
  auxQ.setFromAxisAngle(EJE_Z, giroZ);
  if (giroY !== 0) auxQ.premultiply(auxQY.setFromAxisAngle(EJE_Y, giroY));
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

function mezclarP(a: Punto3, b: Punto3, k: number): Punto3 {
  return [mezclar(a[0], b[0], k), mezclar(a[1], b[1], k), mezclar(a[2], b[2], k)];
}

/** Punto a la fracción `f` del camino de `a` a `b`. */
function haciaP(a: Punto3, b: Punto3, f: number): Punto3 {
  return mezclarP(a, b, f);
}

/** Cuánto se ha condensado una célula con `retraso`: las últimas empiezan a moverse más tarde. */
export function llegada(condensacion: number, retraso: number): number {
  const inicio = 0.35 * retraso;
  return suave(acotar((condensacion - inicio) / (1 - inicio)));
}

/** Semiejes (X, Y, Z) de cada forma celular. */
export const FORMA = {
  fusiforme: [0.17, 0.05, 0.06] as const,
  osteoblasto: [0.085, 0.085, 0.08] as const,
  osteocito: [0.075, 0.05, 0.055] as const,
  revestimiento: [0.14, 0.03, 0.08] as const,
  condrocito: [0.085, 0.085, 0.085] as const,
} as const;

type V3 = readonly [number, number, number];
function mezclarV3(a: V3, b: V3, k: number): [number, number, number] {
  return [mezclar(a[0], b[0], k), mezclar(a[1], b[1], k), mezclar(a[2], b[2], k)];
}

/** Interfaz común de los dos lados. */
export interface LadoDosRutas {
  readonly grupo: Group;
  actualizar: (estado: EstadoDosRutas) => void;
  liberar: () => void;
}

/** El panel de mesénquima translúcido, común a los dos lados: tejido embrionario gelatinoso. */
function crearPanel(): { malla: Mesh; mat: MeshPhysicalMaterial; geo: BufferGeometry } {
  const geo = caja();
  const malla = new Mesh(geo);
  malla.name = 'mesenquima';
  const mat = velo(COLOR.mesenquima, 'mesenquima', 0.22, 10, malla);
  malla.scale.set(PANEL.ancho, PANEL.alto, PANEL.fondo);
  return { malla, mat, geo };
}

/** Opacidad máxima del panel de mesénquima. */
const OPACIDAD_PANEL = 0.22;
/** Opacidad de los cuerpos celulares: translúcidos, para que el núcleo se vea. */
const OPACIDAD_CELULA = 0.92;

/* -------------------------------------------------------------------------------------------
 * Lado intramembranoso (izquierda)
 * ----------------------------------------------------------------------------------------- */

export class LadoIntramembranoso implements LadoDosRutas {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matPanel: MeshPhysicalMaterial;
  private readonly panel: Mesh;
  private readonly celulas: InstancedMesh;
  private readonly nucleos: InstancedMesh;
  private readonly osteoide: Mesh;
  private readonly espiculas: InstancedMesh;
  private readonly vasos: InstancedMesh;
  private readonly medula: Mesh;
  private readonly matMedula: MeshPhysicalMaterial;
  private readonly placas: Mesh[] = [];
  private readonly matPlacas: MeshPhysicalMaterial;
  private readonly osteonas: InstancedMesh;
  private readonly matOsteonas: MeshPhysicalMaterial;
  private readonly laminillas: LineSegments;
  private readonly matLaminillas: LineBasicMaterial;
  private readonly datosCelulas: readonly CelulaIm[];
  private readonly datosEspiculas: readonly Espicula[];
  private readonly datosVasos: readonly Vaso[];
  /** Factores de tamaño de cada célula y de grosor de cada espícula y cada vaso (deterministas). */
  private readonly tamanoCelula: readonly number[];
  private readonly grosorEspicula: readonly number[];
  private readonly grosorVaso: readonly number[];
  private readonly colores = {
    precursor: new Color(COLOR.precursor),
    osteoblasto: new Color(COLOR.osteoblasto),
    osteocito: new Color(COLOR.osteocito),
    revestimiento: new Color(COLOR.revestimiento),
    osteoide: new Color(COLOR.osteoide),
    hueso: new Color(COLOR.hueso),
    laminar: new Color(COLOR.laminaClara),
  };

  constructor() {
    this.grupo.name = 'lado_intramembranoso';
    this.grupo.position.x = -X_LADO;
    this.datosEspiculas = espiculasIntramembranosas();
    this.datosCelulas = celulasIntramembranosas(this.datosEspiculas);
    this.datosVasos = vasosIntramembranosos();
    this.tamanoCelula = variacion(5101, this.datosCelulas.length, 0.92, 1.08);
    this.grosorEspicula = variacion(5103, this.datosEspiculas.length, 0.85, 1.1);
    this.grosorVaso = variacion(5107, this.datosVasos.length, 0.85, 1.2);

    const panel = crearPanel();
    this.panel = panel.malla;
    this.matPanel = panel.mat;
    this.geometrias.push(panel.geo);
    this.materiales.push(panel.mat);
    this.grupo.add(this.panel);

    // Células: cuerpos redondeados (12 × 8) con color por instancia (el color del material va en blanco) y
    // núcleos. El núcleo se ve poco a través del cuerpo (opacidad 0,92): basta una esfera de pocos polígonos.
    const geoCelula = esfera(12, 8);
    const geoNucleo = esfera(4, 3);
    this.geometrias.push(geoCelula, geoNucleo);
    const matCelula = material('#ffffff', 'celula', {
      transparent: true,
      opacity: OPACIDAD_CELULA,
    });
    const matNucleo = material(COLOR.nucleo, 'nucleo');
    this.materiales.push(matCelula, matNucleo);
    this.celulas = instanciar(geoCelula, matCelula, this.datosCelulas.length, 'celulas');
    this.nucleos = instanciar(geoNucleo, matNucleo, this.datosCelulas.length, 'nucleos');
    this.grupo.add(this.celulas, this.nucleos);

    // Islote de osteoide en el centro de la condensación: colágeno aún sin mineralizar (estrías y brillo sedoso).
    const geoOsteoide = esfera(20, 12);
    this.geometrias.push(geoOsteoide);
    const matOsteoide = material(COLOR.osteoide, 'fibra');
    this.materiales.push(matOsteoide);
    this.osteoide = new Mesh(geoOsteoide, matOsteoide);
    this.osteoide.name = 'osteoide';
    this.grupo.add(this.osteoide);

    // Espículas de hueso inmaduro (con color por instancia: osteoide → hueso entretejido → laminar) y vasos.
    const geoTramo = tramo(6);
    this.geometrias.push(geoTramo);
    const matEspicula = material('#ffffff', 'hueso_inmaduro');
    const matVaso = material(COLOR.vaso, 'vaso', {
      emissive: '#7a2a24',
      emissiveIntensity: 0.35,
    });
    this.materiales.push(matEspicula, matVaso);
    this.espiculas = instanciar(geoTramo, matEspicula, this.datosEspiculas.length, 'espiculas');
    this.vasos = instanciar(geoTramo, matVaso, this.datosVasos.length * TRAMOS_VASO, 'vasos');
    this.grupo.add(this.espiculas, this.vasos);

    // Médula entre las trabéculas: un velo rojo.
    const geoMedula = esfera(14, 10);
    this.geometrias.push(geoMedula);
    this.medula = new Mesh(geoMedula);
    this.medula.name = 'medula';
    this.matMedula = velo(COLOR.medulaRoja, 'medula', 0.3, 2, this.medula);
    this.materiales.push(this.matMedula);
    this.grupo.add(this.medula);

    // Tablas compactas arriba y abajo, de borde biselado. Sus UV van en unidades de escena: el relieve se repite
    // por unidad y el poro sale redondo en las caras grandes y en los cantos.
    const geoTabla = tabla();
    this.geometrias.push(geoTabla);
    this.matPlacas = material(COLOR.hueso, 'hueso');
    this.matPlacas.bumpMap?.repeat.set(1.5, 1.5);
    this.materiales.push(this.matPlacas);
    for (const signo of [1, -1] as const) {
      const placa = new Mesh(geoTabla, this.matPlacas);
      placa.name = signo === 1 ? 'tabla_superior' : 'tabla_inferior';
      placa.position.y = signo * PLACA.y;
      // Son las tapas del diploe: su sombra caía sobre el 14-25 % de las espículas y los vasos de dentro.
      placa.userData.sinSombra = true;
      this.placas.push(placa);
      this.grupo.add(placa);
    }

    // Osteonas (aro de laminillas y conducto de Havers) sobre la cara superior de la tabla de arriba y
    // laminillas en las caras frontales.
    const geoOsteona = osteonaConCanal();
    this.geometrias.push(geoOsteona);
    this.matOsteonas = material(COLOR.laminaOscura, 'hueso', {
      transparent: true,
      opacity: 0,
      vertexColors: true,
    });
    this.materiales.push(this.matOsteonas);
    const datosOsteonas = osteonasDePlaca();
    this.osteonas = instanciar(geoOsteona, this.matOsteonas, datosOsteonas.length, 'osteonas');
    const yCara = PLACA.y + PLACA.grosor / 2 + 0.008;
    datosOsteonas.forEach((o, i) =>
      ponerEsfera(this.osteonas, i, [o.x, yCara, o.z], o.escala, 1, o.escala),
    );
    this.osteonas.instanceMatrix.needsUpdate = true;
    this.grupo.add(this.osteonas);
    this.matLaminillas = new LineBasicMaterial({
      color: COLOR.laminaOscura,
      transparent: true,
      opacity: 0,
    });
    const geoLaminillas = this.geometriaLaminillas();
    this.geometrias.push(geoLaminillas);
    this.laminillas = new LineSegments(geoLaminillas, this.matLaminillas);
    this.laminillas.name = 'laminillas';
    this.laminillas.frustumCulled = false;
    this.grupo.add(this.laminillas);
  }

  /** Laminillas: tres líneas onduladas en la cara frontal de cada tabla. */
  private geometriaLaminillas(): BufferGeometry {
    const puntos: number[] = [];
    const z = PLACA.fondo / 2 + 0.006;
    const paso = PLACA.ancho / 20;
    for (const signo of [1, -1] as const) {
      for (const nivel of [-0.3, 0, 0.3]) {
        const y = signo * PLACA.y + nivel * PLACA.grosor;
        for (let x = -PLACA.ancho / 2 + 0.05; x < PLACA.ancho / 2 - 0.05 - paso; x += paso) {
          puntos.push(
            x,
            y + 0.01 * Math.sin(x * 4 + nivel),
            z,
            x + paso,
            y + 0.01 * Math.sin((x + paso) * 4 + nivel),
            z,
          );
        }
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(puntos, 3));
    return geo;
  }

  actualizar(estado: EstadoDosRutas): void {
    const im = estado.intramembranosa;
    const dif = suave(estado.diferenciacion);
    const enBorde = suave(im.enBorde);
    const atrapados = suave(im.atrapados);
    const revestimiento = suave(im.revestimiento);
    const placas = suave(im.placas);
    const laminar = suave(im.laminar);

    // Panel de mesénquima.
    const opacidadPanel = OPACIDAD_PANEL * estado.mesenquima;
    this.panel.visible = opacidadPanel > 0.004;
    this.matPanel.opacity = opacidadPanel;

    // Células.
    this.datosCelulas.forEach((c, i) => {
      const k = llegada(estado.condensacion, c.retraso);
      let pos = mezclarP(c.dispersa, c.condensada, k);
      let semi = mezclarV3(FORMA.fusiforme, FORMA.osteoblasto, dif);
      auxColor.copy(this.colores.precursor).lerp(this.colores.osteoblasto, dif);
      let presencia = 1;
      if (c.papel === 'osteocito') {
        pos = mezclarP(pos, c.destino, atrapados);
        semi = mezclarV3(semi, FORMA.osteocito, atrapados);
        auxColor.lerp(this.colores.osteocito, atrapados);
      } else {
        pos = mezclarP(pos, c.destino, enBorde);
        semi = mezclarV3(semi, FORMA.revestimiento, revestimiento);
        auxColor.lerp(this.colores.revestimiento, revestimiento);
        // Las que quedan donde se funden las tablas desaparecen dentro del hueso compacto.
        if (Math.abs(c.destino[1]) > PLACA.y - PLACA.grosor - 0.02) presencia = 1 - placas;
      }
      const tam = this.tamanoCelula[i]!;
      semi = [semi[0] * tam, semi[1] * tam, semi[2] * tam];
      const giro = c.giro * (1 - dif);
      ponerEsfera(
        this.celulas,
        i,
        pos,
        semi[0] * presencia,
        semi[1] * presencia,
        semi[2] * presencia,
        giro,
      );
      this.celulas.setColorAt(i, auxColor);
      ponerEsfera(
        this.nucleos,
        i,
        [pos[0], pos[1], pos[2] + semi[2] * 0.3],
        semi[0] * 0.5 * presencia,
        semi[1] * 0.5 * presencia,
        semi[2] * 0.5 * presencia,
        giro,
      );
    });
    this.celulas.instanceMatrix.needsUpdate = true;
    this.nucleos.instanceMatrix.needsUpdate = true;
    if (this.celulas.instanceColor) this.celulas.instanceColor.needsUpdate = true;

    // Islote de osteoide.
    const osteoide = suave(im.osteoide);
    this.osteoide.visible = osteoide > 0.004;
    this.osteoide.scale.set(0.55 * osteoide, 0.22 * osteoide, 0.28 * osteoide);

    // Espículas: aparecen por orden, se alargan, se engruesan, cambian de color al mineralizarse y las de la
    // periferia se funden con las tablas.
    let hayEspiculas = false;
    this.datosEspiculas.forEach((e, i) => {
      const f = suave(fraccion(im.espiculas, e.orden, e.orden + 0.15));
      let radio = R_ESPICULA * im.grosor * this.grosorEspicula[i]!;
      if (e.externa) radio *= 1 - placas;
      if (f < 0.004 || radio < 0.002) {
        this.espiculas.setMatrixAt(i, MATRIZ_CERO);
        return;
      }
      hayEspiculas = true;
      ponerTramo(this.espiculas, i, e.a, haciaP(e.a, e.b, f), radio);
      const edad = Math.max(fraccion(im.espiculas, e.orden + 0.15, e.orden + 0.45), placas);
      auxColor.copy(this.colores.osteoide).lerp(this.colores.hueso, edad);
      auxColor.lerp(this.colores.laminar, laminar);
      this.espiculas.setColorAt(i, auxColor);
    });
    this.espiculas.visible = hayEspiculas;
    this.espiculas.instanceMatrix.needsUpdate = true;
    if (this.espiculas.instanceColor) this.espiculas.instanceColor.needsUpdate = true;

    // Vasos: cada tramo se alarga cuando el progreso llega a él.
    const vasos = suave(im.vasos);
    this.vasos.visible = vasos > 0.004;
    if (this.vasos.visible) {
      this.datosVasos.forEach((v, j) => {
        for (let k = 0; k < TRAMOS_VASO; k++) {
          const f = acotar(vasos * TRAMOS_VASO - k);
          const a = v.puntos[k]!;
          const b = v.puntos[k + 1]!;
          ponerTramo(
            this.vasos,
            j * TRAMOS_VASO + k,
            a,
            haciaP(a, b, f),
            0.032 * Math.min(1, f * 4) * this.grosorVaso[j]!,
          );
        }
      });
      this.vasos.instanceMatrix.needsUpdate = true;
    }

    // Médula.
    const medula = suave(im.medula);
    this.medula.visible = medula > 0.004;
    this.medula.scale.set(1.3 * medula, 0.46 * medula, 0.42 * medula);
    this.matMedula.opacity = 0.3 * medula;

    // Tablas compactas y hueso laminar.
    for (const placa of this.placas) {
      placa.visible = placas > 0.004;
      placa.scale.set(PLACA.ancho, Math.max(0.001, PLACA.grosor * placas), PLACA.fondo);
    }
    this.matPlacas.color.copy(this.colores.hueso).lerp(this.colores.laminar, laminar);
    this.osteonas.visible = laminar > 0.004;
    this.matOsteonas.opacity = laminar;
    this.laminillas.visible = laminar > 0.004;
    this.matLaminillas.opacity = 0.8 * laminar;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    this.matLaminillas.dispose();
    for (const i of [this.celulas, this.nucleos, this.espiculas, this.vasos, this.osteonas]) {
      i.dispose();
    }
  }
}

/* -------------------------------------------------------------------------------------------
 * Lado endocondral (derecha)
 * ----------------------------------------------------------------------------------------- */

export class LadoEndocondral implements LadoDosRutas {
  readonly grupo = new Group();
  private readonly geometrias: BufferGeometry[] = [];
  private readonly materiales: Material[] = [];
  private readonly matPanel: MeshPhysicalMaterial;
  private readonly panel: Mesh;
  private readonly celulas: InstancedMesh;
  private readonly lagunas: InstancedMesh;
  private readonly nucleos: InstancedMesh;
  /** Cartílago de la diáfisis (arriba y abajo del frente) y zona calcificada (entre el frente y el cartílago). */
  private readonly cartilago: Mesh[] = [];
  private readonly calcificado: Mesh[] = [];
  private readonly epifisis: Mesh[] = [];
  private readonly matCartilago: MeshPhysicalMaterial;
  private readonly matCalcificado: MeshPhysicalMaterial;
  private readonly pericondrio: Mesh;
  private readonly matPericondrio: MeshPhysicalMaterial;
  private readonly collar: Mesh;
  private readonly matCollar: MeshPhysicalMaterial;
  private readonly cortical: Mesh;
  private readonly yema: Mesh;
  private readonly vasoMedular: Mesh;
  private readonly trabeculas: InstancedMesh;
  private readonly cavidad: Mesh;
  private readonly osteoclastos: InstancedMesh;
  private readonly osteoblastos: InstancedMesh;
  private readonly secundarios: Mesh[] = [];
  private readonly datosCelulas: readonly CelulaEc[];
  private readonly datosTrabeculas: readonly TrabeculaCentro[];
  /** Factores de tamaño de cada célula y de grosor de cada trabécula (deterministas). */
  private readonly tamanoCelula: readonly number[];
  private readonly grosorTrabecula: readonly number[];
  private readonly colores = {
    precursor: new Color(COLOR.precursor),
    condrocito: new Color(COLOR.condrocito),
    hipertrofico: new Color(COLOR.condrocitoHipertrofico),
    hueso: new Color(COLOR.hueso),
    laminar: new Color(COLOR.laminaClara),
  };

  constructor() {
    this.grupo.name = 'lado_endocondral';
    this.grupo.position.x = X_LADO;
    this.datosCelulas = celulasEndocondrales();
    this.datosTrabeculas = trabeculasDelCentro();
    this.tamanoCelula = variacion(5203, this.datosCelulas.length, 0.92, 1.08);
    this.grosorTrabecula = variacion(5209, this.datosTrabeculas.length, 0.8, 1.2);

    const panel = crearPanel();
    this.panel = panel.malla;
    this.matPanel = panel.mat;
    this.geometrias.push(panel.geo);
    this.materiales.push(panel.mat);
    this.grupo.add(this.panel);

    // Células: cuerpos redondos (12 × 8) con color por instancia, lagunas claras detrás y núcleos. Las lagunas y
    // los núcleos se ven siempre a través de otro tejido (el cartílago o el propio cuerpo celular): bastan
    // esferas de pocos polígonos.
    const geoCelula = esfera(12, 8);
    const geoLaguna = esfera(6, 5);
    const geoNucleo = esfera(4, 3);
    this.geometrias.push(geoCelula, geoLaguna, geoNucleo);
    const matCelula = material('#ffffff', 'celula', {
      transparent: true,
      opacity: OPACIDAD_CELULA,
    });
    const matLaguna = material(COLOR.lagunaCondrocito, 'cavidad');
    const matNucleo = material(COLOR.nucleo, 'nucleo');
    this.materiales.push(matCelula, matLaguna, matNucleo);
    const n = this.datosCelulas.length;
    this.celulas = instanciar(geoCelula, matCelula, n, 'celulas');
    this.lagunas = instanciar(geoLaguna, matLaguna, n, 'lagunas');
    this.nucleos = instanciar(geoNucleo, matNucleo, n, 'nucleos');
    this.grupo.add(this.celulas, this.lagunas, this.nucleos);

    // Molde de cartílago hialino (liso, húmedo y translúcido): dos cilindros (arriba y abajo del frente), dos
    // epífisis y la zona calcificada, más mate y gris.
    const geoCilindro = cilindro(24);
    const geoEpifisis = esfera(20, 14);
    this.geometrias.push(geoCilindro, geoEpifisis);
    this.matCartilago = material(COLOR.cartilago, 'cartilago', {
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      // Menos barniz: con 0,6 de clearcoat el molde se leía como un tubo de plástico.
      clearcoat: 0.25,
      clearcoatRoughness: 0.3,
    });
    // Velo de Fresnel al revés que en una membrana: el molde es un sólido macizo, más espeso (más opaco) en el centro
    // que en el contorno. Con opacidad constante se veía como vidrio tintado.
    veloFresnel(this.matCartilago, 1.15, 0.6);
    this.matCalcificado = material(COLOR.cartilagoCalcificado, 'cartilago', {
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      // Matriz calcificada: calcárea, sin el brillo húmedo del cartílago sano.
      roughness: 0.62,
      clearcoat: 0.15,
    });
    this.materiales.push(this.matCartilago, this.matCalcificado);
    for (const signo of [1, -1] as const) {
      const nombre = signo === 1 ? 'superior' : 'inferior';
      const cart = new Mesh(geoCilindro, this.matCartilago);
      cart.name = `cartilago_${nombre}`;
      cart.renderOrder = 5;
      const calc = new Mesh(geoCilindro, this.matCalcificado);
      calc.name = `cartilago_calcificado_${nombre}`;
      calc.renderOrder = 4;
      const epi = new Mesh(geoEpifisis, this.matCartilago);
      epi.name = `epifisis_${nombre}`;
      epi.renderOrder = 6;
      epi.position.y = signo * MOLDE.yEpifisis;
      this.cartilago.push(cart);
      this.calcificado.push(calc);
      this.epifisis.push(epi);
      this.grupo.add(cart, calc, epi);
    }

    // Pericondrio (luego periostio), collar perióstico y cortical madura: anillos abiertos hacia la cámara.
    // UV en unidades de escena a su tamaño final (el collar y la cortical crecen en alto; el pericondrio, también en
    // radio, de 1 a 1,45).
    const altoDiafisis = 2 * COLLAR.medioLargo;
    const geoPericondrio = anilloAbierto(0.44, 0.47, 40, {
      alto: 2 * MOLDE.medioLargo + 0.1,
      radial: 1.2,
    });
    const geoCollar = anilloAbierto(COLLAR.interior, COLLAR.exterior, 40, { alto: altoDiafisis });
    const geoCortical = anilloAbierto(CORTICAL.interior, CORTICAL.exterior, 40, {
      alto: altoDiafisis,
    });
    this.geometrias.push(geoPericondrio, geoCollar, geoCortical);
    // Solo la cara exterior: así no se ve su pared de fondo a través del cartílago translúcido (se leía como
    // una banda ocre que tapaba el molde) y queda como dos rebordes a los lados. Vaina fibrosa.
    this.matPericondrio = material(COLOR.pericondrio, 'membrana', {
      transparent: true,
      opacity: 0.6,
    });
    this.matPericondrio.bumpMap?.repeat.set(0.6, 0.6);
    // El collar nace como hueso inmaduro; la cortical que lo engruesa al final es hueso compacto.
    this.matCollar = material(COLOR.hueso, 'hueso_inmaduro', { side: DoubleSide });
    this.matCollar.bumpMap?.repeat.set(1.5, 1.5);
    const matCortical = material(COLOR.laminaClara, 'hueso', { side: DoubleSide });
    matCortical.bumpMap?.repeat.set(1.4, 1.4);
    this.materiales.push(this.matPericondrio, this.matCollar, matCortical);
    this.pericondrio = new Mesh(geoPericondrio, this.matPericondrio);
    this.pericondrio.name = 'pericondrio';
    this.pericondrio.renderOrder = 7;
    this.collar = new Mesh(geoCollar, this.matCollar);
    this.collar.name = 'collar_periostico';
    this.cortical = new Mesh(geoCortical, matCortical);
    this.cortical.name = 'cortical';
    this.grupo.add(this.pericondrio, this.collar, this.cortical);

    // Yema perióstica (vaso horizontal que perfora el collar) y vaso medular (vertical, en el centro).
    const matVaso = material(COLOR.vaso, 'vaso', {
      emissive: '#7a2a24',
      emissiveIntensity: 0.35,
    });
    this.materiales.push(matVaso);
    this.yema = new Mesh(geoCilindro, matVaso);
    this.yema.name = 'yema_periostica';
    this.yema.rotation.z = Math.PI / 2;
    this.yema.position.y = YEMA.y;
    this.vasoMedular = new Mesh(geoCilindro, matVaso);
    this.vasoMedular.name = 'vaso_medular';
    this.vasoMedular.position.x = 0.05;
    this.grupo.add(this.yema, this.vasoMedular);

    // Trabéculas del centro primario (hueso inmaduro sobre restos de cartílago) y, al final, la cavidad medular
    // que las sustituye, llena de médula ROJA: es un hueso en crecimiento (con placa de crecimiento), y al nacer y
    // en la infancia toda la médula es hematopoyética; la conversión a grasa empieza en la diáfisis después del
    // primer año (fidelidad-07). Es el mismo rojo de la médula del lado intramembranoso.
    const geoTramo = tramo(6);
    this.geometrias.push(geoTramo);
    const matTrabecula = material(COLOR.huesoNuevo, 'hueso_inmaduro');
    const matMedula = material(COLOR.medulaRoja, 'medula');
    this.materiales.push(matTrabecula, matMedula);
    this.trabeculas = instanciar(
      geoTramo,
      matTrabecula,
      this.datosTrabeculas.length,
      'trabeculas_centro',
    );
    this.cavidad = new Mesh(geoCilindro, matMedula);
    this.cavidad.name = 'cavidad_medular';
    this.grupo.add(this.trabeculas, this.cavidad);

    // Células del frente: osteoclastos (grandes, lilas, aplanados contra el cartílago que reabsorben) y
    // osteoblastos (pequeños, violetas, cúbicos-altos sobre las trabéculas).
    const matOsteoclasto = material(COLOR.osteoclasto, 'celula');
    const matOsteoblasto = material(COLOR.osteoblasto, 'celula');
    this.materiales.push(matOsteoclasto, matOsteoblasto);
    this.osteoclastos = instanciar(geoCelula, matOsteoclasto, N_OSTEOCLASTOS, 'osteoclastos');
    this.osteoblastos = instanciar(
      esfera(12, 8),
      matOsteoblasto,
      N_OSTEOBLASTOS_CENTRO,
      'osteoblastos_centro',
    );
    this.geometrias.push(this.osteoblastos.geometry);
    this.grupo.add(this.osteoclastos, this.osteoblastos);

    // Centros secundarios de osificación en las epífisis: hueso esponjoso nuevo.
    const matSecundario = material(COLOR.huesoNuevo, 'hueso_esponjoso');
    this.materiales.push(matSecundario);
    for (const signo of [1, -1] as const) {
      const sec = new Mesh(geoEpifisis, matSecundario);
      sec.name = signo === 1 ? 'centro_secundario_superior' : 'centro_secundario_inferior';
      sec.position.y = signo * SECUNDARIO.y;
      this.secundarios.push(sec);
      this.grupo.add(sec);
    }
  }

  /** Presencia (0 a 1) de un condrocito en `laguna`: desaparece donde el hueso ya sustituyó al cartílago. */
  private presenciaCondrocito(laguna: Punto3, frente: number, secundario: number): number {
    const ay = Math.abs(laguna[1]);
    let presencia = 1 - suave(fraccion(frente - ay, -0.05, 0.1));
    if (secundario > 0.01) {
      const [sx, sy, sz] = SECUNDARIO.semiejes;
      const d =
        (laguna[0] / (sx * secundario)) ** 2 +
        ((ay - SECUNDARIO.y) / (sy * secundario)) ** 2 +
        (laguna[2] / (sz * secundario)) ** 2;
      presencia *= suave(fraccion(d, 0.85, 1.3));
    }
    return presencia;
  }

  actualizar(estado: EstadoDosRutas): void {
    const ec = estado.endocondral;
    const dif = suave(estado.diferenciacion);
    const molde = suave(ec.molde);
    const hipertrofia = suave(ec.hipertrofia);
    const collar = suave(ec.collar);
    const cortical = suave(ec.cortical);
    const secundario = suave(ec.secundario);
    const cavidad = suave(ec.cavidad);
    const laminar = suave(ec.laminar);
    const { frente, calcificado } = ec;

    // Panel de mesénquima.
    const opacidadPanel = OPACIDAD_PANEL * estado.mesenquima;
    this.panel.visible = opacidadPanel > 0.004;
    this.matPanel.opacity = opacidadPanel;

    // Células: de mesenquimales dispersas a condrocitos en sus lagunas; los centrales se hipertrofian y luego
    // desaparecen al paso del frente de osificación.
    let hayLagunas = false;
    this.datosCelulas.forEach((c, i) => {
      const k = llegada(estado.condensacion, c.retraso);
      let pos = mezclarP(c.dispersa, c.condensada, k);
      pos = mezclarP(pos, c.laguna, molde);
      const tam = this.tamanoCelula[i]!;
      let semi = mezclarV3(FORMA.fusiforme, FORMA.condrocito, dif);
      semi = [semi[0] * tam, semi[1] * tam, semi[2] * tam];
      auxColor.copy(this.colores.precursor).lerp(this.colores.condrocito, dif);
      if (c.central) {
        const crecido = 1 + 0.9 * hipertrofia;
        semi = [semi[0] * crecido, semi[1] * crecido, semi[2] * crecido];
        auxColor.lerp(this.colores.hipertrofico, hipertrofia);
      }
      const presencia = this.presenciaCondrocito(c.laguna, frente, secundario);
      const giro = (c.retraso - 0.5) * 1.2 * (1 - dif);
      ponerEsfera(
        this.celulas,
        i,
        pos,
        semi[0] * presencia,
        semi[1] * presencia,
        semi[2] * presencia,
        giro,
      );
      this.celulas.setColorAt(i, auxColor);
      ponerEsfera(
        this.nucleos,
        i,
        [pos[0], pos[1], pos[2] + semi[2] * 0.3],
        semi[0] * 0.45 * presencia,
        semi[1] * 0.45 * presencia,
        semi[2] * 0.45 * presencia,
        giro,
      );
      // La laguna solo existe dentro del cartílago: aparece con el molde y se agranda con la hipertrofia.
      const laguna = molde * dif * presencia;
      if (laguna > 0.004) hayLagunas = true;
      ponerEsfera(
        this.lagunas,
        i,
        [pos[0], pos[1], pos[2] - semi[2] * 0.5],
        semi[0] * 1.2 * laguna,
        semi[1] * 1.2 * laguna,
        semi[2] * 1.2 * laguna,
      );
    });
    this.lagunas.visible = hayLagunas;
    this.celulas.instanceMatrix.needsUpdate = true;
    this.nucleos.instanceMatrix.needsUpdate = true;
    this.lagunas.instanceMatrix.needsUpdate = true;
    if (this.celulas.instanceColor) this.celulas.instanceColor.needsUpdate = true;

    // Molde cartilaginoso: la diáfisis va del frente a `calcificado` (calcificado) y de ahí al extremo
    // (cartílago sano); las epífisis son elipsoides completos.
    const hayMolde = molde > 0.004;
    const radio = MOLDE.radio * molde;
    const [superior, inferior] = [1, -1] as const;
    [superior, inferior].forEach((signo, i) => {
      const cart = this.cartilago[i]!;
      const calc = this.calcificado[i]!;
      const epi = this.epifisis[i]!;
      const desde = Math.min(calcificado, MOLDE.medioLargo) * molde;
      const hasta = MOLDE.medioLargo * molde;
      const largoCart = hasta - desde;
      cart.visible = hayMolde && largoCart > 0.004;
      cart.scale.set(radio, Math.max(0.001, largoCart), radio);
      cart.position.y = signo * (desde + largoCart / 2);
      const desdeCalc = Math.min(frente, calcificado) * molde;
      const largoCalc = desde - desdeCalc;
      calc.visible = hayMolde && largoCalc > 0.004;
      calc.scale.set(radio, Math.max(0.001, largoCalc), radio);
      calc.position.y = signo * (desdeCalc + largoCalc / 2);
      epi.visible = hayMolde;
      epi.scale.set(
        MOLDE.rEpifisis * molde,
        MOLDE.semiejeEpifisis * molde,
        MOLDE.rEpifisis * molde,
      );
      epi.position.y = signo * MOLDE.yEpifisis * molde;
    });

    // Pericondrio → periostio: se separa del cartílago a medida que el collar y la cortical crecen debajo.
    this.pericondrio.visible = hayMolde;
    const radioPericondrio = mezclar(mezclar(1, 1.27, collar), 1.45, cortical) * molde;
    this.pericondrio.scale.set(
      radioPericondrio,
      (2 * MOLDE.medioLargo + 0.1) * molde,
      radioPericondrio,
    );
    this.matPericondrio.opacity = 0.6 * molde;

    // Collar perióstico y cortical.
    this.collar.visible = collar > 0.004;
    this.collar.scale.set(1, Math.max(0.001, 2 * COLLAR.medioLargo * collar), 1);
    this.matCollar.color.copy(this.colores.hueso).lerp(this.colores.laminar, laminar);
    this.cortical.visible = cortical > 0.004;
    this.cortical.scale.set(1, Math.max(0.001, 2 * COLLAR.medioLargo * cortical), 1);

    // Yema perióstica y vaso medular.
    const yema = suave(ec.yema);
    const largoYema = (YEMA.x0 - 0.05) * yema;
    this.yema.visible = largoYema > 0.004;
    this.yema.scale.set(YEMA.radio, Math.max(0.001, largoYema), YEMA.radio);
    this.yema.position.x = YEMA.x0 - largoYema / 2;
    this.vasoMedular.visible = frente > 0.02;
    this.vasoMedular.scale.set(0.05, Math.max(0.001, 2 * frente), 0.05);

    // Trabéculas del centro primario: aparecen al paso del frente; las del centro se reabsorben al abrirse la
    // cavidad medular.
    let hayTrabeculas = false;
    this.datosTrabeculas.forEach((tr, i) => {
      let f = suave(fraccion(frente - tr.altura, 0, 0.12));
      if (tr.altura < 0.95) f *= 1 - cavidad;
      if (f < 0.004) {
        this.trabeculas.setMatrixAt(i, MATRIZ_CERO);
        return;
      }
      hayTrabeculas = true;
      ponerTramo(this.trabeculas, i, tr.a, haciaP(tr.a, tr.b, f), 0.045 * this.grosorTrabecula[i]!);
    });
    this.trabeculas.visible = hayTrabeculas;
    this.trabeculas.instanceMatrix.needsUpdate = true;
    this.cavidad.visible = cavidad > 0.004;
    this.cavidad.scale.set(
      R_INTERIOR_DIAFISIS,
      Math.max(0.001, 1.9 * cavidad),
      R_INTERIOR_DIAFISIS,
    );

    // Células del frente: a la altura del frente, arriba y abajo.
    const celulasFrente = suave(ec.celulasFrente);
    this.osteoclastos.visible = celulasFrente > 0.004;
    this.osteoblastos.visible = celulasFrente > 0.004 && frente > 0.25;
    // Un osteoclasto activo es grande y aplanado, pegado a la superficie que reabsorbe (antes, una esfera perfecta:
    // se leía como una partícula): apoyado en el plano del frente y girado en ese plano, cada uno de una manera.
    const r = 0.12 * celulasFrente;
    const posOsteoclastos: Punto3[] = [
      [0.14, frente + 0.55 * r, 0.14],
      [-0.14, frente + 0.55 * r, -0.02],
      [0.1, -frente - 0.55 * r, 0.12],
      [-0.16, -frente - 0.55 * r, 0],
    ];
    posOsteoclastos.forEach((p, i) => {
      ponerEsfera(this.osteoclastos, i, p, 1.5 * r, 0.55 * r, 1.2 * r, 0, i * 1.3);
    });
    this.osteoclastos.instanceMatrix.needsUpdate = true;
    const rb = 0.07 * celulasFrente;
    for (let i = 0; i < N_OSTEOBLASTOS_CENTRO; i++) {
      const signo = i % 2 === 0 ? 1 : -1;
      const columna = Math.floor(i / 2) - 1;
      ponerEsfera(
        this.osteoblastos,
        i,
        [columna * 0.2, signo * (frente - 0.22), 0.2],
        0.9 * rb,
        1.2 * rb,
        0.9 * rb,
      );
    }
    this.osteoblastos.instanceMatrix.needsUpdate = true;

    // Centros secundarios.
    for (const sec of this.secundarios) {
      sec.visible = secundario > 0.004;
      const [sx, sy, sz] = SECUNDARIO.semiejes;
      sec.scale.set(sx * secundario, sy * secundario, sz * secundario);
    }
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    liberarMateriales(this.materiales);
    for (const i of [
      this.celulas,
      this.lagunas,
      this.nucleos,
      this.trabeculas,
      this.osteoclastos,
      this.osteoblastos,
    ]) {
      i.dispose();
    }
  }
}
