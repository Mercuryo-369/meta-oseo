/** Pruebas de las vistas de cámara con nombre, el encuadre por nodo y las transiciones (vistas.ts). */
import { describe, expect, it } from 'vitest';
import { VISTAS_CAMARA } from '@/content/nodos3d';
import { distanciaParaEncajar } from './encuadre';
import {
  DISTANCIA_MAX_VISTA_MEDIAL,
  DISTANCIA_MIN_ABSOLUTA,
  DURACION_TRANSICION_MS,
  ETIQUETA_VISTA,
  FACTOR_ZOOM_BOTON,
  RADIO_ZONA_ANCLA,
  calcularEncuadre,
  crearTransicion,
  direccionDeVista,
  estadoConZoom,
  estadoDeEncuadre,
  interpolarCamara,
  limitesZoomExploracion,
  suavizar,
} from './vistas';
import type { EstadoCamara, Vec3 } from './vistas';

const norma = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);
const distancia = (e: EstadoCamara): number =>
  Math.hypot(
    e.posicion[0] - e.objetivo[0],
    e.posicion[1] - e.objetivo[1],
    e.posicion[2] - e.objetivo[2],
  );

describe('direccionDeVista', () => {
  it('devuelve una dirección unitaria para cada vista con nombre', () => {
    for (const vista of VISTAS_CAMARA) {
      expect(norma(direccionDeVista(vista)), vista).toBeCloseTo(1, 10);
    }
  });

  it('frontal mira desde delante (+Z) y elevada; posterior, desde atrás', () => {
    const frontal = direccionDeVista('frontal');
    expect(frontal[2]).toBeGreaterThan(0.9);
    expect(frontal[1]).toBeGreaterThan(0);
    expect(Math.abs(frontal[0])).toBeLessThan(1e-9);
    expect(direccionDeVista('posterior')[2]).toBeLessThan(-0.9);
  });

  it('lateral_derecha pone la cámara del lado derecho del sujeto (-X) y lateral_izquierda del otro', () => {
    expect(direccionDeVista('lateral_derecha')[0]).toBeLessThan(-0.9);
    expect(direccionDeVista('lateral_izquierda')[0]).toBeGreaterThan(0.9);
  });

  it('superior e inferior no caen en el polo exacto (OrbitControls no lo admite)', () => {
    expect(direccionDeVista('superior')[1]).toBeLessThan(1);
    expect(direccionDeVista('superior')[1]).toBeGreaterThan(0.9);
    expect(direccionDeVista('inferior')[1]).toBeGreaterThan(-1);
    expect(direccionDeVista('inferior')[1]).toBeLessThan(-0.9);
  });

  it('oblicua queda entre frontal y lateral derecha, elevada', () => {
    const [x, y, z] = direccionDeVista('oblicua');
    expect(x).toBeLessThan(0);
    expect(z).toBeGreaterThan(0);
    expect(y).toBeGreaterThan(direccionDeVista('frontal')[1]);
  });

  it('las vistas mediales ponen la cámara del lado contrario, algo elevada, mirando la cara interna de la rama', () => {
    const [xd, yd, zd] = direccionDeVista('medial_derecha');
    // La cara medial de la rama DERECHA (-X) mira hacia +X: la cámara está en +X.
    expect(xd).toBeGreaterThan(0.85);
    expect(yd).toBeGreaterThan(0.3);
    expect(zd).toBeGreaterThan(0);
    const [xi, yi, zi] = direccionDeVista('medial_izquierda');
    expect(xi).toBeCloseTo(-xd, 10);
    expect(yi).toBeCloseTo(yd, 10);
    expect(zi).toBeCloseTo(zd, 10);
  });

  it('una vista desconocida (contenido corrupto) cae en frontal en vez de romper', () => {
    expect(direccionDeVista('cenital' as never)).toEqual(direccionDeVista('frontal'));
  });

  it('todas las vistas del catálogo tienen nombre en español para la interfaz', () => {
    for (const vista of VISTAS_CAMARA) {
      expect(ETIQUETA_VISTA[vista], vista).toMatch(/^[A-ZÁÉÍÓÚ][a-záéíóú ]+$/);
    }
    expect(Object.keys(ETIQUETA_VISTA).sort()).toEqual([...VISTAS_CAMARA].sort());
  });
});

describe('calcularEncuadre', () => {
  const base = { centro: [0, 0, 0] as Vec3, radio: 1, vista: 'frontal' as const, zoom: 1 };

  it('con zoom 1 coincide con la distancia de encaje del radio', () => {
    const e = calcularEncuadre({ ...base, aspecto: 1 });
    expect(e.distancia).toBeCloseTo(distanciaParaEncajar(1, 1), 10);
    expect(e.objetivo).toEqual([0, 0, 0]);
  });

  it('el zoom divide la distancia: 2 es el doble de cerca', () => {
    const uno = calcularEncuadre({ ...base, aspecto: 1 }).distancia;
    expect(calcularEncuadre({ ...base, zoom: 2, aspecto: 1 }).distancia).toBeCloseTo(uno / 2, 10);
    expect(calcularEncuadre({ ...base, zoom: 0.5, aspecto: 1 }).distancia).toBeCloseTo(uno * 2, 10);
  });

  it('un nodo pequeño se encuadra más cerca que el modelo entero (el radio es el del nodo)', () => {
    const modelo = calcularEncuadre({ ...base, aspecto: 1.5 });
    const nodo = calcularEncuadre({ ...base, radio: RADIO_ZONA_ANCLA, aspecto: 1.5 });
    expect(nodo.distancia).toBeLessThan(modelo.distancia / 2);
  });

  it('las vistas mediales de un nodo dejan la cámara dentro del arco: distancia máxima aunque el zoom sea 0,5', () => {
    for (const vista of ['medial_derecha', 'medial_izquierda'] as const) {
      const e = calcularEncuadre({
        ...base,
        radio: RADIO_ZONA_ANCLA,
        vista,
        zoom: 0.5,
        aspecto: 0.5,
      });
      expect(e.distancia, vista).toBeLessThanOrEqual(DISTANCIA_MAX_VISTA_MEDIAL);
      // Una vista externa con los mismos datos sí queda más lejos: el tope es solo de las mediales.
      const lateral = calcularEncuadre({
        ...base,
        radio: RADIO_ZONA_ANCLA,
        vista: 'lateral_izquierda',
        zoom: 0.5,
        aspecto: 0.5,
      });
      expect(lateral.distancia).toBeGreaterThan(DISTANCIA_MAX_VISTA_MEDIAL);
    }
  });

  it('la vista medial del modelo entero (radio 1) no lleva tope: no hay arco que respetar', () => {
    const e = calcularEncuadre({ ...base, vista: 'medial_derecha', aspecto: 1 });
    expect(e.distancia).toBeCloseTo(distanciaParaEncajar(1, 1), 10);
  });

  it('en un móvil vertical la distancia es mayor que en horizontal (cabe el eje estrecho)', () => {
    const vertical = calcularEncuadre({ ...base, aspecto: 0.5 }).distancia;
    const horizontal = calcularEncuadre({ ...base, aspecto: 2 }).distancia;
    expect(vertical).toBeGreaterThan(horizontal);
  });

  it('acota la distancia a los límites de zoom', () => {
    const limites = limitesZoomExploracion(distanciaParaEncajar(1, 1));
    const muyCerca = calcularEncuadre({ ...base, radio: 0.01, zoom: 3, aspecto: 1 }, limites);
    expect(muyCerca.distancia).toBe(limites.minima);
    const muyLejos = calcularEncuadre({ ...base, radio: 50, zoom: 0.5, aspecto: 1 }, limites);
    expect(muyLejos.distancia).toBe(limites.maxima);
  });

  it('entradas absurdas (zoom 0 o negativo, radio 0, NaN, Infinity) se corrigen sin fallar', () => {
    const referencia = calcularEncuadre({ ...base, aspecto: 1 }).distancia;
    for (const zoom of [0, -2, NaN, Infinity]) {
      const e = calcularEncuadre({ ...base, zoom, aspecto: 1 });
      if (zoom === Infinity) {
        // El zoom infinito no es válido: se trata como 1.
        expect(e.distancia).toBeCloseTo(referencia, 10);
      } else {
        expect(Number.isFinite(e.distancia), String(zoom)).toBe(true);
        expect(e.distancia).toBeCloseTo(referencia, 10);
      }
    }
    for (const radio of [0, -1, NaN]) {
      expect(Number.isFinite(calcularEncuadre({ ...base, radio, aspecto: 0 }).distancia)).toBe(
        true,
      );
    }
  });
});

describe('limitesZoomExploracion', () => {
  it('la mínima no depende del tamaño del modelo (se puede acercar a un nodo pequeño)', () => {
    expect(limitesZoomExploracion(2).minima).toBe(DISTANCIA_MIN_ABSOLUTA);
    expect(limitesZoomExploracion(20).minima).toBe(DISTANCIA_MIN_ABSOLUTA);
  });

  it('la máxima deja ver el modelo completo con holgura y nunca es menor que 4 veces la mínima', () => {
    const d = distanciaParaEncajar(1, 1);
    expect(limitesZoomExploracion(d).maxima).toBeGreaterThan(d);
    expect(limitesZoomExploracion(0.01).maxima).toBeGreaterThanOrEqual(DISTANCIA_MIN_ABSOLUTA * 4);
  });
});

describe('estadoConZoom', () => {
  const actual: EstadoCamara = { objetivo: [0, 0, 0], posicion: [0, 0, 4] };
  const limites = { minima: 0.5, maxima: 8 };

  it('acercar divide la distancia y mantiene la dirección y el objetivo', () => {
    const e = estadoConZoom(actual, FACTOR_ZOOM_BOTON, limites);
    expect(distancia(e)).toBeCloseTo(4 / FACTOR_ZOOM_BOTON, 10);
    expect(e.objetivo).toEqual(actual.objetivo);
    expect(e.posicion[0]).toBeCloseTo(0, 10);
  });

  it('alejar multiplica la distancia', () => {
    expect(distancia(estadoConZoom(actual, 1 / FACTOR_ZOOM_BOTON, limites))).toBeCloseTo(
      4 * FACTOR_ZOOM_BOTON,
      10,
    );
  });

  it('respeta los límites en los dos extremos', () => {
    expect(distancia(estadoConZoom(actual, 100, limites))).toBeCloseTo(0.5, 10);
    expect(distancia(estadoConZoom(actual, 0.001, limites))).toBeCloseTo(8, 10);
  });

  it('un factor no válido o una cámara sobre el objetivo no mueven nada', () => {
    for (const factor of [0, -1, NaN, Infinity]) {
      expect(estadoConZoom(actual, factor, limites), String(factor)).toEqual(actual);
    }
    const encima: EstadoCamara = { objetivo: [1, 1, 1], posicion: [1, 1, 1] };
    expect(estadoConZoom(encima, 2, limites)).toEqual(encima);
  });
});

describe('interpolarCamara y suavizar', () => {
  const frontal: EstadoCamara = { objetivo: [0, 0, 0], posicion: [0, 0, 4] };
  const posterior: EstadoCamara = { objetivo: [0, 0, 0], posicion: [0, 0, -4] };

  it('en t=0 y t=1 devuelve los extremos', () => {
    const inicio = interpolarCamara(frontal, posterior, 0);
    const fin = interpolarCamara(frontal, posterior, 1);
    inicio.posicion.forEach((v, i) => expect(v).toBeCloseTo(frontal.posicion[i]!, 9));
    fin.posicion.forEach((v, i) => expect(v).toBeCloseTo(posterior.posicion[i]!, 9));
  });

  it('pasar de frontal a posterior RODEA el modelo: nunca atraviesa el objetivo', () => {
    for (let t = 0.05; t < 1; t += 0.05) {
      const e = interpolarCamara(frontal, posterior, t);
      expect(distancia(e), `t=${t}`).toBeGreaterThan(3.9);
    }
  });

  it('la distancia se interpola entre las dos', () => {
    const cerca: EstadoCamara = { objetivo: [0, 0, 0], posicion: [0, 0, 1] };
    const mitad = interpolarCamara(frontal, cerca, 0.5);
    expect(distancia(mitad)).toBeCloseTo(2.5, 9);
  });

  it('el objetivo se interpola en línea recta', () => {
    const a: EstadoCamara = { objetivo: [0, 0, 0], posicion: [0, 0, 4] };
    const b: EstadoCamara = { objetivo: [2, 4, 0], posicion: [2, 4, 4] };
    expect(interpolarCamara(a, b, 0.5).objetivo).toEqual([1, 2, 0]);
  });

  it('t fuera de rango o NaN se acota; suavizar es monótona, 0 en 0 y 1 en 1', () => {
    expect(suavizar(-5)).toBe(0);
    expect(suavizar(7)).toBe(1);
    expect(suavizar(NaN)).toBe(1);
    expect(suavizar(0.5)).toBeCloseTo(0.5, 10);
    let anterior = -1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = suavizar(t);
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
    const e = interpolarCamara(frontal, posterior, NaN);
    e.posicion.forEach((v, i) => expect(v).toBeCloseTo(posterior.posicion[i]!, 9));
  });

  it('la cámara sobre el objetivo (radio 0) no produce NaN', () => {
    const cero: EstadoCamara = { objetivo: [0, 0, 0], posicion: [0, 0, 0] };
    const e = interpolarCamara(cero, frontal, 0.5);
    expect(e.posicion.every(Number.isFinite)).toBe(true);
  });
});

describe('crearTransicion', () => {
  const desde: EstadoCamara = { objetivo: [0, 0, 0], posicion: [0, 0, 4] };
  const hasta: EstadoCamara = { objetivo: [1, 0, 0], posicion: [1, 0, 2] };

  it('avanza con el reloj y termina en `hasta`', () => {
    const t = crearTransicion(desde, hasta, 1000);
    const mitad = t.paso(1000 + DURACION_TRANSICION_MS / 2);
    expect(mitad.terminada).toBe(false);
    expect(mitad.estado.objetivo[0]).toBeGreaterThan(0);
    expect(mitad.estado.objetivo[0]).toBeLessThan(1);
    const fin = t.paso(1000 + DURACION_TRANSICION_MS);
    expect(fin.terminada).toBe(true);
    expect(fin.estado).toBe(hasta);
  });

  it('antes del inicio (reloj desfasado) se queda en `desde`', () => {
    const t = crearTransicion(desde, hasta, 1000);
    const antes = t.paso(500);
    expect(antes.terminada).toBe(false);
    expect(antes.estado.posicion[2]).toBeCloseTo(4, 9);
  });

  it('con duración 0 (movimiento reducido) ya en el primer paso da el estado final, sin intermedios', () => {
    const t = crearTransicion(desde, hasta, 1000, 0);
    const primero = t.paso(1000);
    expect(primero.terminada).toBe(true);
    expect(primero.estado).toBe(hasta);
  });

  it('una duración negativa o NaN también es instantánea', () => {
    for (const d of [-100, NaN]) {
      expect(crearTransicion(desde, hasta, 0, d).paso(0).terminada, String(d)).toBe(true);
    }
  });
});

describe('estadoDeEncuadre', () => {
  it('coloca la cámara a `distancia` del objetivo en la dirección de la vista', () => {
    const encuadre = calcularEncuadre({
      centro: [0.2, 0.3, 0.4],
      radio: 0.5,
      vista: 'lateral_derecha',
      zoom: 1.5,
      aspecto: 1,
    });
    const estado = estadoDeEncuadre(encuadre);
    expect(distancia(estado)).toBeCloseTo(encuadre.distancia, 9);
    expect(estado.objetivo).toEqual([0.2, 0.3, 0.4]);
    expect(estado.posicion[0]).toBeLessThan(0.2 - 0.5);
  });
});
