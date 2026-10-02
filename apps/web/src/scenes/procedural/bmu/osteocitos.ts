/**
 * Osteocitos de la escena de la BMU. Quedan atrapados en la matriz, así que solo se ven donde el hueso está
 * cortado: se dibujan como "cortes" planos sobre las dos caras de la cuña, con el mismo lenguaje que los SVG
 * (halo claro de la laguna, cuerpo azul #6f93e2, núcleo #3b2f86 y canalículos radiales). Cada osteocito son
 * tres discos superpuestos (un InstancedMesh) y seis canalículos (otro InstancedMesh): dos llamadas de
 * dibujo en total.
 *
 * Aparecen de forma gradual (`estado.osteocitos.progreso`, de 0 a `N_OSTEOCITOS`) y se colocan dentro del
 * grosor de la pared en su momento, a una profundidad fija de cada osteocito, de modo que el estado es
 * función pura de `t`.
 */
import {
  BoxGeometry,
  CircleGeometry,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshStandardMaterial,
} from 'three';
import { acotar, suave } from '../interpolacion';
import { N_OSTEOCITOS, espesorEn, radioExcavado } from './estado';
import type { EstadoBmu } from './estado';
import { HEX, lineal } from './paleta';
import { SECTOR_FIN, SECTOR_INICIO } from './sector';

const CANALICULOS = 6;
const COLOR_LAGUNA = lineal(HEX.lagunaOsteocito);
const COLOR_CUERPO = lineal(HEX.osteocito);
const COLOR_NUCLEO = lineal(HEX.nucleo);
const COLOR_CANALICULO = lineal('#7d4a8a');

/** Posición de cada osteocito: cara de corte (0 o 1), x y profundidad (0 = fuera, 1 = junto a la luz). */
const SITIOS: readonly { cara: 0 | 1; x: number; profundidad: number; giro: number }[] = [
  { cara: 1, x: 2.6, profundidad: 0.35, giro: 0.1 },
  { cara: 0, x: 2.2, profundidad: 0.6, giro: -0.2 },
  { cara: 1, x: 1.2, profundidad: 0.68, giro: 0.15 },
  { cara: 0, x: 0.6, profundidad: 0.3, giro: 0.05 },
  { cara: 1, x: -0.1, profundidad: 0.4, giro: -0.1 },
  { cara: 0, x: -0.7, profundidad: 0.7, giro: 0.2 },
  { cara: 1, x: -1.2, profundidad: 0.62, giro: -0.15 },
  { cara: 0, x: -1.8, profundidad: 0.38, giro: 0.12 },
  { cara: 1, x: -2.2, profundidad: 0.3, giro: 0.08 },
  { cara: 0, x: 1.5, profundidad: 0.5, giro: -0.12 },
  { cara: 1, x: 0.5, profundidad: 0.75, giro: 0.18 },
  { cara: 0, x: -1.3, profundidad: 0.75, giro: -0.06 },
];

export class OsteocitosBmu {
  readonly discos: InstancedMesh;
  readonly canaliculos: InstancedMesh;
  private readonly geometriaDisco = new CircleGeometry(1, 16);
  private readonly geometriaBarra = new BoxGeometry(1, 0.03, 0.004);
  private readonly material = new MeshStandardMaterial({
    roughness: 0.55,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  private readonly materialBarra = new MeshStandardMaterial({
    roughness: 0.6,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });

  constructor() {
    this.discos = new InstancedMesh(this.geometriaDisco, this.material, N_OSTEOCITOS * 3);
    this.canaliculos = new InstancedMesh(
      this.geometriaBarra,
      this.materialBarra,
      N_OSTEOCITOS * CANALICULOS,
    );
    for (const malla of [this.discos, this.canaliculos]) {
      malla.instanceMatrix.setUsage(DynamicDrawUsage);
      malla.instanceColor = new InstancedBufferAttribute(new Float32Array(malla.count * 3), 3);
      malla.frustumCulled = false;
    }
    this.discos.name = 'osteocitos_discos';
    this.canaliculos.name = 'osteocitos_canaliculos';
    // Colores fijos: solo cambian matrices.
    SITIOS.forEach((_s, i) => {
      this.color(this.discos, 3 * i, COLOR_LAGUNA);
      this.color(this.discos, 3 * i + 1, COLOR_CUERPO);
      this.color(this.discos, 3 * i + 2, COLOR_NUCLEO);
      for (let k = 0; k < CANALICULOS; k++) {
        this.color(this.canaliculos, CANALICULOS * i + k, COLOR_CANALICULO);
      }
    });
  }

  private color(malla: InstancedMesh, i: number, c: readonly [number, number, number]): void {
    const a = malla.instanceColor!.array as Float32Array;
    a[3 * i] = c[0];
    a[3 * i + 1] = c[1];
    a[3 * i + 2] = c[2];
  }

  private poner(
    malla: InstancedMesh,
    i: number,
    p: readonly [number, number, number],
    ex: readonly [number, number, number],
    ey: readonly [number, number, number],
    ez: readonly [number, number, number],
    sx: number,
    sy: number,
  ): void {
    const m = malla.instanceMatrix.array as Float32Array;
    const o = 16 * i;
    m[o] = ex[0] * sx;
    m[o + 1] = ex[1] * sx;
    m[o + 2] = ex[2] * sx;
    m[o + 3] = 0;
    m[o + 4] = ey[0] * sy;
    m[o + 5] = ey[1] * sy;
    m[o + 6] = ey[2] * sy;
    m[o + 7] = 0;
    m[o + 8] = ez[0];
    m[o + 9] = ez[1];
    m[o + 10] = ez[2];
    m[o + 11] = 0;
    m[o + 12] = p[0];
    m[o + 13] = p[1];
    m[o + 14] = p[2];
    m[o + 15] = 1;
  }

  private ocultar(malla: InstancedMesh, i: number): void {
    const m = malla.instanceMatrix.array as Float32Array;
    for (let k = 0; k < 16; k++) m[16 * i + k] = 0;
  }

  actualizar(estado: EstadoBmu): void {
    const { progreso } = estado.osteocitos;
    SITIOS.forEach((sitio, i) => {
      const aparicion = suave(acotar(progreso - i));
      const espesor = espesorEn(sitio.x, estado);
      const visible = aparicion > 0.01 && espesor > 0.12;
      if (!visible) {
        for (let d = 0; d < 3; d++) this.ocultar(this.discos, 3 * i + d);
        for (let k = 0; k < CANALICULOS; k++) this.ocultar(this.canaliculos, CANALICULOS * i + k);
        return;
      }
      const fi = sitio.cara === 0 ? SECTOR_INICIO : SECTOR_FIN;
      const c = Math.cos(fi);
      const s = Math.sin(fi);
      // Normal de la cara hacia la cuña quitada; el disco se levanta un poco para no fundirse con ella.
      const signo = sitio.cara === 0 ? -1 : 1;
      const normal: readonly [number, number, number] = [0, -signo * s, signo * c];
      const radial: readonly [number, number, number] = [0, c, s];
      const eje: readonly [number, number, number] = [1, 0, 0];
      const radio = radioExcavado(sitio.x, estado) - sitio.profundidad * espesor;
      const centro = (levantar: number, dx = 0, dr = 0): [number, number, number] => [
        sitio.x + dx,
        (radio + dr) * c + normal[1] * levantar,
        (radio + dr) * s + normal[2] * levantar,
      ];
      const ancho = 0.2 * aparicion;
      const alto = 0.115 * aparicion;
      // Giro leve dentro del plano de la cara: el eje mayor sigue las láminas.
      const cg = Math.cos(sitio.giro);
      const sg = Math.sin(sitio.giro);
      const ex: readonly [number, number, number] = [
        eje[0] * cg + radial[0] * sg,
        eje[1] * cg + radial[1] * sg,
        eje[2] * cg + radial[2] * sg,
      ];
      const ey: readonly [number, number, number] = [
        -eje[0] * sg + radial[0] * cg,
        -eje[1] * sg + radial[1] * cg,
        -eje[2] * sg + radial[2] * cg,
      ];
      this.poner(this.discos, 3 * i, centro(0.004), ex, ey, normal, ancho * 1.55, alto * 1.7);
      this.poner(this.discos, 3 * i + 1, centro(0.008), ex, ey, normal, ancho, alto);
      this.poner(
        this.discos,
        3 * i + 2,
        centro(0.012, 0.02, 0),
        ex,
        ey,
        normal,
        ancho * 0.48,
        alto * 0.62,
      );
      for (let k = 0; k < CANALICULOS; k++) {
        const a = sitio.giro + (2 * Math.PI * k) / CANALICULOS + 0.3;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        const largo = 0.2 * aparicion;
        const dir: [number, number, number] = [
          ex[0] * dx + ey[0] * dy,
          ex[1] * dx + ey[1] * dy,
          ex[2] * dx + ey[2] * dy,
        ];
        const perp: [number, number, number] = [
          -ex[0] * dy + ey[0] * dx,
          -ex[1] * dy + ey[1] * dx,
          -ex[2] * dy + ey[2] * dx,
        ];
        const base = centro(0.014);
        const separacion = 0.17 * aparicion + largo * 0.5;
        const posicion: [number, number, number] = [
          base[0] + dir[0] * separacion * (0.75 + 0.25 * Math.abs(dx)),
          base[1] + dir[1] * separacion * (0.75 + 0.25 * Math.abs(dx)),
          base[2] + dir[2] * separacion * (0.75 + 0.25 * Math.abs(dx)),
        ];
        this.poner(this.canaliculos, CANALICULOS * i + k, posicion, dir, perp, normal, largo, 1);
      }
    });
    this.discos.instanceMatrix.needsUpdate = true;
    this.canaliculos.instanceMatrix.needsUpdate = true;
  }

  liberar(): void {
    this.discos.dispose();
    this.canaliculos.dispose();
    this.geometriaDisco.dispose();
    this.geometriaBarra.dispose();
    this.material.dispose();
    this.materialBarra.dispose();
  }
}
