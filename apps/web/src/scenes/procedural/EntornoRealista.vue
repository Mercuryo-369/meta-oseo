<script setup lang="ts">
/**
 * Luz de estudio, entorno y sombras de las escenas 3D (va dentro de un <TresCanvas>). Desde la revisión de
 * diseño (2026-10-15) pone él mismo las luces de todas las escenas, con el esquema de `iluminacion.ts`:
 *
 *  - Luz principal desde arriba a la izquierda de lo que se ve (a unos 45° de la vista), contraluz fría desde
 *    detrás del objeto y relleno suave (hemisferio y entorno). Antes de cada dibujo se reorientan a partir de la
 *    cámara: el esquema es el mismo con cualquier zoom y desde cualquier lado de la órbita.
 *  - Entorno: genera una vez un mapa de entorno de estudio (`RoomEnvironment` prefiltrado con `PMREMGenerator`) y
 *    lo pone como `scene.environment`: luz indirecta suave y reflejos sutiles en los materiales físicos. No se
 *    ve como fondo (el lienzo sigue transparente).
 *  - Sombras (`sombras`, activadas por defecto): solo las proyecta la luz principal, con un mapa PCF de borde
 *    suave cuya caja se ajusta a la escena (`ajusteSombras`). Cada malla las recibe; las proyecta si es opaca
 *    (una malla que se está desvaneciendo, transparente con opacidad < 0,9, deja de proyectarlas en ese
 *    fotograma) y no lleva `userData.sinSombra`. Un material de doble cara pasa al mapa de sombras solo con su
 *    cara delantera, salvo que la escena le fije otra `shadowSide`: si no, la cara trasera iluminada (el interior
 *    de una cáscara abierta) se sombrearía a sí misma.
 *
 * Todo se ajusta en `scene.onBeforeRender`: solo cuando se dibuja de verdad (con el render a demanda, cuando la
 * escena cambia). Fuera de un <TresCanvas> real (las pruebas montan lienzos falsos) no hace nada: así nunca hace
 * fallar la escena que lo contiene. Al desmontar quita las luces y el entorno y los libera.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import type {
  Camera,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import {
  Box3,
  DirectionalLight,
  DoubleSide,
  FrontSide,
  HemisphereLight,
  PCFShadowMap,
  PMREMGenerator,
  Vector3,
} from 'three';
import type { InstancedMesh } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ILUMINACION, ajusteSombras, direccionesLuces, radioEscena } from './iluminacion';

const props = withDefaults(defineProps<{ intensidad?: number; sombras?: boolean }>(), {
  intensidad: ILUMINACION.entorno,
  sombras: true,
});

/** Contexto de TresJS, o `null` si este componente no está dentro de un lienzo real. */
function contexto() {
  try {
    return useTres();
  } catch {
    return null;
  }
}

const tres = contexto();

const clave = new DirectionalLight(ILUMINACION.clave.color, ILUMINACION.clave.intensidad);
clave.name = 'luz_clave';
const contraluz = new DirectionalLight(
  ILUMINACION.contraluz.color,
  ILUMINACION.contraluz.intensidad,
);
contraluz.name = 'luz_contraluz';
const hemisferio = new HemisphereLight(
  ILUMINACION.hemisferio.cielo,
  ILUMINACION.hemisferio.suelo,
  ILUMINACION.hemisferio.intensidad,
);
hemisferio.name = 'luz_hemisferio';

let objetivoEntorno: WebGLRenderTarget | null = null;
let escenaPreparada: Scene | null = null;
let anterior: Scene['onBeforeRender'] | null = null;
let propio: Scene['onBeforeRender'] | null = null;

/** Lado del mapa de sombras: más fino en escritorio que en pantallas táctiles. */
function ladoMapaSombras(): number {
  try {
    return window.matchMedia?.('(pointer: coarse)').matches ? 1024 : 2048;
  } catch {
    return 1024;
  }
}
let lado = 1024;
let radio = 0;
let distancia = 18;
let dibujos = 0;

const _caja = new Box3();
const _pieza = new Box3();
const _dirClave = new Vector3();
const _dirContraluz = new Vector3();
const _posCamara = new Vector3();
let precompilado = false;

/** Caja envolvente de las mallas de la escena (también las ocultas: abarca toda la animación). */
function cajaContenido(escena: Object3D): Box3 {
  _caja.makeEmpty();
  escena.traverse((o: Object3D) => {
    const malla = o as Mesh;
    if (!malla.isMesh) return;
    const instanciada = malla as unknown as InstancedMesh;
    if (instanciada.isInstancedMesh) {
      if (instanciada.boundingBox === null) instanciada.computeBoundingBox();
      _pieza.copy(instanciada.boundingBox!);
    } else {
      const g = malla.geometry;
      if (g.boundingBox === null) g.computeBoundingBox();
      _pieza.copy(g.boundingBox!);
    }
    _pieza.applyMatrix4(malla.matrixWorld);
    // Una instancia con matriz nula da coordenadas no finitas: no debe estropear la caja de toda la escena.
    const { min, max } = _pieza;
    if (Number.isFinite(min.x + min.y + min.z + max.x + max.y + max.z)) _caja.union(_pieza);
  });
  return _caja;
}

/** Ajusta la cámara de sombras de la luz principal al radio actual de la escena. */
function ajustarCamaraSombras(): void {
  const a = ajusteSombras(radio, lado);
  const c = clave.shadow.camera;
  c.left = -a.extension;
  c.right = a.extension;
  c.top = a.extension;
  c.bottom = -a.extension;
  c.near = Math.max(0.05, a.cerca);
  c.far = a.lejos;
  c.updateProjectionMatrix();
  clave.shadow.normalBias = a.sesgoNormal;
  clave.shadow.bias = a.sesgo;
  distancia = a.distancia;
}

/** Qué mallas reciben y proyectan sombras en este dibujo. */
function prepararMallas(escena: Object3D): void {
  escena.traverse((o: Object3D) => {
    const malla = o as Mesh;
    if (!malla.isMesh) return;
    const materiales = (
      Array.isArray(malla.material) ? malla.material : [malla.material]
    ) as Material[];
    const material = materiales[0];
    malla.receiveShadow = true;
    malla.castShadow =
      !malla.userData.sinSombra && !!material && (!material.transparent || material.opacity > 0.9);
    for (const m of materiales) {
      if (m && m.side === DoubleSide && m.shadowSide === null) m.shadowSide = FrontSide;
    }
  });
}

/**
 * Compila de una vez todas las variantes de sombreado que la animación va a pedir: las de cada material tal como
 * está y las de su estado contrario de transparencia (los desvanecidos cambian `transparent`, y three compila un
 * programa distinto para cada estado y para cada cara de una pieza transparente de doble cara). Sin esto se
 * compilaban a ráfagas de 3 a 7 a mitad de la reproducción, en cada visita (TresJS destruye el contexto al
 * salir): tirones visibles en un móvil. `renderer.compile` recorre también las piezas ocultas. Si algo falla, se
 * compilarán al dibujar, como antes.
 */
function precompilar(r: WebGLRenderer, escena: Scene, camara: Camera): void {
  try {
    if (props.sombras) prepararMallas(escena);
    const fisicos = new Set<MeshPhysicalMaterial>();
    escena.traverse((o: Object3D) => {
      const m = (o as Mesh).material as Material | Material[] | undefined;
      for (const x of Array.isArray(m) ? m : m ? [m] : []) {
        if ((x as MeshPhysicalMaterial).isMeshPhysicalMaterial)
          fisicos.add(x as MeshPhysicalMaterial);
      }
    });
    const alternar = (): void => {
      for (const m of fisicos) {
        m.transparent = !m.transparent;
        m.needsUpdate = true;
      }
    };
    r.compile(escena, camara);
    alternar();
    // Con KHR_parallel_shader_compile no bloquea: los programas se terminan de compilar en segundo plano.
    void r.compileAsync(escena, camara).catch(() => undefined);
    alternar();
  } catch {
    // Sin precompilación: cada variante se compilará la primera vez que se dibuje.
  }
  tres?.invalidate();
}

/** Antes de cada dibujo: luces orientadas según la cámara y sombras listas. */
function antesDeDibujar(escena: Scene, camara: Camera): void {
  const matrizCamara = camara.matrixWorld;
  // El radio, al empezar y cada 30 dibujos: las piezas se mueven poco, y redondeado no cambia en cada fotograma.
  if (dibujos++ % 30 === 0) {
    const r = radioEscena(cajaContenido(escena));
    if (r !== radio) {
      radio = r;
      ajustarCamaraSombras();
    }
  }
  direccionesLuces(matrizCamara, _dirClave, _dirContraluz);
  clave.position.copy(_dirClave).multiplyScalar(distancia);
  contraluz.position.copy(_dirContraluz).multiplyScalar(distancia);
  // three ya actualizó las matrices de la escena antes de llamar a onBeforeRender.
  clave.updateMatrixWorld();
  contraluz.updateMatrixWorld();
  // El entorno gira con la cámara (solo en acimut): sus paneles de luz quedan siempre delante, arriba y a la
  // izquierda de lo que se ve, del lado de la luz principal, y la exposición no depende de por dónde se mire.
  // (three busca el entorno en la dirección de la normal girada al revés: con el giro igual al acimut de la
  // cámara, el panel +Z del RoomEnvironment mira hacia ella.)
  _posCamara.setFromMatrixPosition(matrizCamara);
  escena.environmentRotation.y = Math.atan2(_posCamara.x, _posCamara.z);
  if (props.sombras) prepararMallas(escena);
  if (!precompilado) {
    precompilado = true;
    const r = tres?.renderer as unknown as WebGLRenderer | undefined;
    // Fuera del dibujo en curso: compile() cambia el estado de dibujo del renderizador.
    if (r) setTimeout(() => precompilar(r, escena, camara), 0);
  }
}

function crear(): void {
  if (!tres) return;
  // Solo con WebGL (el proyecto no usa WebGPU); sin un renderizador real no hay nada que hacer.
  const r = tres.renderer as unknown as WebGLRenderer | undefined;
  if (!r || typeof (r as { getContext?: unknown }).getContext !== 'function') return;
  const escena = tres.scene.value;
  escenaPreparada = escena;
  // Comprobar cada sombreador obliga a esperar a que termine de compilar: solo en desarrollo, donde sus errores
  // se ven en la consola.
  r.debug.checkShaderErrors = import.meta.env.DEV;

  const generador = new PMREMGenerator(r);
  const sala = new RoomEnvironment();
  objetivoEntorno = generador.fromScene(sala, 0.04);
  sala.dispose();
  generador.dispose();
  escena.environment = objetivoEntorno.texture;
  escena.environmentIntensity = props.intensidad;

  escena.add(clave, contraluz, hemisferio);
  if (props.sombras && r.shadowMap) {
    r.shadowMap.enabled = true;
    r.shadowMap.type = PCFShadowMap;
    lado = ladoMapaSombras();
    clave.castShadow = true;
    clave.shadow.mapSize.set(lado, lado);
    clave.shadow.radius = 3;
  }

  anterior = escena.onBeforeRender;
  propio = function (this: Scene, ...args: Parameters<Scene['onBeforeRender']>) {
    anterior?.apply(this, args);
    antesDeDibujar(escena, args[2]);
  };
  escena.onBeforeRender = propio;
  tres.invalidate();
}

if (tres) {
  crear();
  watch(
    () => props.intensidad,
    (v) => {
      if (!escenaPreparada) return;
      escenaPreparada.environmentIntensity = v;
      tres.invalidate();
    },
  );
  onBeforeUnmount(() => {
    const escena = escenaPreparada;
    if (!escena) return;
    escena.remove(clave, contraluz, hemisferio);
    if (escena.onBeforeRender === propio && anterior) escena.onBeforeRender = anterior;
    if (objetivoEntorno && escena.environment === objetivoEntorno.texture)
      escena.environment = null;
    objetivoEntorno?.dispose();
    objetivoEntorno = null;
    clave.dispose();
    contraluz.dispose();
    hemisferio.dispose();
    escenaPreparada = null;
  });
}
</script>

<template>
  <!-- Sin nada que dibujar: solo prepara luces, entorno y sombras. -->
  <TresGroup />
</template>
