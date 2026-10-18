/**
 * Carga de un modelo GLB con nodos nombrados (las células, F0-10; la mandíbula definitiva, F0-09) y
 * búsqueda de sus nodos por nombre. Los GLB definitivos aún no existen: si el archivo falta, la escena
 * muestra el error y la lista de nodos de la actividad sigue completando (docs/content-schema.md, 16).
 *
 * La lógica es pura respecto a Vue y a WebGL: `parsearGlb` y `ubicarNodoGlb` se prueban sin lienzo.
 *
 * Los GLB con compresión Draco necesitarían además un `DRACOLoader` con sus archivos de
 * decodificación; hoy no se sirven, así que un GLB comprimido con Draco falla con el mensaje de "archivo
 * no válido" en vez de quedarse cargando.
 */
import { Box3, Group, Mesh, Sphere, Vector3 } from 'three';
import type { BufferGeometry, Material, MeshStandardMaterial, Object3D, Texture } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Modelo3d } from '@/content/nodos3d';
import { RUTA_GLB } from '@/content/nodos3d';
import type { CajaModelo, UbicacionNodo } from './anclas';
import { escalaParaEncajar } from './encuadre';
import { ErrorModelo } from './stl';

/** Ruta pública del GLB de un modelo, respetando la base de la aplicación (`import.meta.env.BASE_URL`). */
export function urlGlb(modelo: Modelo3d): string {
  const ruta = RUTA_GLB[modelo];
  if (!ruta)
    throw new ErrorModelo(`El modelo «${modelo}» no se descarga: se construye por código.`);
  return `${import.meta.env.BASE_URL}${ruta.replace(/^\/+/, '')}`;
}

/** Radio mínimo de la zona de un nodo minúsculo, para que la cámara no se meta dentro de él. */
export const RADIO_MIN_NODO = 0.08;

/** Interpreta los bytes de un GLB y devuelve su escena. Lanza `ErrorModelo` si no es válido. */
export function parsearGlb(bytes: ArrayBuffer): Promise<Object3D> {
  return new Promise((resolver, rechazar) => {
    try {
      new GLTFLoader().parse(
        bytes,
        '',
        (gltf) => resolver(gltf.scene),
        (error) => rechazar(new ErrorModelo('El archivo del modelo 3D no es válido.', error)),
      );
    } catch (error) {
      rechazar(new ErrorModelo('El archivo del modelo 3D no es válido.', error));
    }
  });
}

export interface EscenaNormalizada {
  /** Grupo en el origen que contiene la escena original, centrada y con esfera envolvente de radio 1. */
  raiz: Group;
  caja: CajaModelo;
}

/** Centra la escena en el origen y la escala a esfera envolvente de radio 1 (como `crearGeometriaMandibula`). */
export function normalizarEscena(escena: Object3D): EscenaNormalizada {
  const raiz = new Group();
  raiz.name = 'raiz_exploracion';
  raiz.add(escena);
  raiz.updateMatrixWorld(true);

  const caja = new Box3().setFromObject(escena);
  if (caja.isEmpty()) throw new ErrorModelo('El archivo del modelo 3D está vacío.');
  const centro = caja.getCenter(new Vector3());
  const radio = caja.getBoundingSphere(new Sphere()).radius;
  escena.position.sub(centro);
  raiz.scale.setScalar(escalaParaEncajar(radio));
  raiz.updateMatrixWorld(true);

  const final = new Box3().setFromObject(raiz);
  return {
    raiz,
    caja: {
      min: [final.min.x, final.min.y, final.min.z],
      max: [final.max.x, final.max.y, final.max.z],
    },
  };
}

/**
 * Dónde está el nodo con ese nombre dentro del GLB normalizado, o `null` si no existe o no tiene
 * volumen. El punto es el centro de su caja y el radio, el de su esfera envolvente (con mínimo).
 */
export function ubicarNodoGlb(raiz: Object3D, id: string): UbicacionNodo | null {
  // `getObjectByName('')` devuelve el primer objeto SIN nombre (p. ej. la raíz): un id vacío no es un nodo.
  if (!id) return null;
  const nodo = raiz.getObjectByName(id);
  if (!nodo) return null;
  raiz.updateMatrixWorld(true);
  const caja = new Box3().setFromObject(nodo);
  if (caja.isEmpty()) return null;
  const centro = caja.getCenter(new Vector3());
  const tamano = caja.getSize(new Vector3());
  return {
    punto: [centro.x, centro.y, centro.z],
    radio: Math.max(RADIO_MIN_NODO, tamano.length() / 2),
    origen: 'nodo_glb',
  };
}

/**
 * Resalta el nodo `id` de un modelo de piezas (GLB o el hueso largo) con un brillo propio de `color` en sus
 * materiales, y apaga el de los demás (vuelven a su brillo original). Con `id` nulo no resalta nada. Sirve de
 * respuesta visual al tocar una zona: el nodo elegido se distingue del resto, no solo por su etiqueta.
 */
export function resaltarNodo(
  raiz: Object3D,
  id: string | null,
  color: string,
  intensidad = 0.3,
): void {
  const elegidas = new Set<Object3D>();
  if (id) raiz.getObjectByName(id)?.traverse((o) => elegidas.add(o));
  raiz.traverse((objeto) => {
    if (!(objeto instanceof Mesh)) return;
    const materiales: Material[] = Array.isArray(objeto.material)
      ? objeto.material
      : [objeto.material];
    for (const material of materiales) {
      const conBrillo = material as MeshStandardMaterial;
      if (!conBrillo.emissive) continue;
      const original = (conBrillo.userData.brilloOriginal ??= {
        color: conBrillo.emissive.getHex(),
        intensidad: conBrillo.emissiveIntensity,
      }) as { color: number; intensidad: number };
      if (elegidas.has(objeto)) {
        conBrillo.emissive.set(color);
        conBrillo.emissiveIntensity = intensidad;
      } else {
        conBrillo.emissive.setHex(original.color);
        conBrillo.emissiveIntensity = original.intensidad;
      }
    }
  });
}

/** Libera geometrías, materiales y texturas de una escena cargada (los recursos de la GPU). */
export function liberarEscena(raiz: Object3D): void {
  raiz.traverse((objeto) => {
    if (!(objeto instanceof Mesh)) return;
    (objeto.geometry as BufferGeometry | undefined)?.dispose();
    const materiales: Material[] = Array.isArray(objeto.material)
      ? objeto.material
      : [objeto.material];
    for (const material of materiales) {
      for (const valor of Object.values(material)) {
        if (valor && typeof valor === 'object' && (valor as Texture).isTexture) {
          (valor as Texture).dispose();
        }
      }
      material.dispose();
    }
  });
}
