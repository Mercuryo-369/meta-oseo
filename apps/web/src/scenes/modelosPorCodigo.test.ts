/**
 * Contrato común de los modelos construidos por código (`modelosPorCodigo.ts`): cada nodo del catálogo es una región
 * que la exploración encuentra por nombre, distinta del grupo raíz, y con un punto de etiqueta finito.
 */
import { describe, expect, it } from 'vitest';
import { CATALOGO_NODOS } from '@/content/nodos3d';
import type { Modelo3d } from '@/content/nodos3d';
import { MODELOS_POR_CODIGO, esModeloPorCodigo } from './modelosPorCodigo';

const modelos = Object.keys(MODELOS_POR_CODIGO) as Modelo3d[];

describe.each(modelos)('modelo por código %s', (id) => {
  it('cada nodo del catálogo es una región con nombre, que no es el grupo raíz', async () => {
    const definicion = await MODELOS_POR_CODIGO[id]!();
    const modelo = definicion.crear();
    expect(esModeloPorCodigo(id)).toBe(true);
    for (const nodo of CATALOGO_NODOS[id]) {
      const region = modelo.getObjectByName(nodo.id);
      expect(region, `${id}: falta la región ${nodo.id}`).toBeDefined();
      // Si el raíz se llamara igual, resaltar la región encendería el modelo entero.
      expect(region, `${id}: el grupo raíz se llama ${nodo.id}`).not.toBe(modelo);
      expect(definicion.esRegion(nodo.id)).toBe(true);
      const punto = definicion.puntoDeRegion(nodo.id);
      expect(punto.punto.every(Number.isFinite), `${id}/${nodo.id}: punto`).toBe(true);
      expect(punto.radio).toBeGreaterThan(0);
    }
    expect(definicion.esRegion('no_existe')).toBe(false);
  });
});
