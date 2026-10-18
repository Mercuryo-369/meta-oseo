import { describe, expect, it } from 'vitest';
import { DataTexture, MeshPhysicalMaterial, RepeatWrapping, ShaderLib } from 'three';
import {
  liberarMaterialOrganico,
  materialOrganico,
  materialTriplanar,
  oclusionPorVertice,
  ponerOpacidad,
  RUGOSIDAD_MINIMA_RELIEVE,
  ruidoFractal,
  texturaRelieve,
  veloFresnel,
} from './realismo';

describe('modificaciones del sombreador encadenadas', () => {
  it('motas, velo y oclusión se aplican juntas sobre el material físico real de three', () => {
    const m = materialOrganico('#eed3dc', 'membrana', { transparent: true });
    veloFresnel(m, 0.3, 1.8);
    oclusionPorVertice(m);
    oclusionPorVertice(m); // dos veces el mismo nombre: no se duplica
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
    };
    m.onBeforeCompile(shader as never, undefined as never);
    // Cada una encontró su marca aunque otra la hubiera sustituido antes.
    expect(shader.fragmentShader).toContain('uniform float uMotasOrg;');
    expect(shader.fragmentShader).toContain('uniform float uVeloCentro;');
    expect(shader.fragmentShader).toContain(
      'diffuseColor.a = clamp(diffuseColor.a * mix(uVeloCentro',
    );
    expect(shader.fragmentShader).toContain('reflectedLight.indirectDiffuse *= vAo;');
    expect(shader.vertexShader).toContain('attribute float ao;');
    expect(shader.vertexShader).toContain('vAo = ao;');
    expect(shader.fragmentShader.match(/varying float vAo;/g)).toHaveLength(1);
    // El velo cambia el alfa después de la luz y antes de escribir el color.
    const f = shader.fragmentShader;
    expect(f.indexOf('fVelo')).toBeGreaterThan(f.indexOf('#include <lights_fragment_end>'));
    expect(f.indexOf('fVelo')).toBeLessThan(f.indexOf('#include <opaque_fragment>'));
    expect(shader.uniforms.uVeloBorde!.value).toBe(1.8);
    expect(m.customProgramCacheKey()).toBe('ova-motas-velo-ao');
    liberarMaterialOrganico(m);
  });

  it('el brillo de terciopelo de un material blanco (color por instancia) es gris, no blanco', () => {
    expect(materialOrganico('#ffffff', 'celula').sheenColor.getHexString()).toBe('8a8590');
    expect(materialOrganico('#8d86c6', 'celula').sheenColor.getHexString()).toBe('8d86c6');
  });
});

describe('ponerOpacidad', () => {
  it('vuelve transparente el material solo mientras hace falta y lo recompila al cruzar el umbral', () => {
    const m = new MeshPhysicalMaterial();
    const v0 = m.version;
    ponerOpacidad([m], 1);
    expect(m.transparent).toBe(false);
    expect(m.version).toBe(v0);

    // Opaco → transparente: hay que recompilar (un programa opaco fija el alfa a 1 y la pieza no se desvanecería).
    ponerOpacidad([m], 0.4);
    expect(m.transparent).toBe(true);
    expect(m.opacity).toBeCloseTo(0.4);
    expect(m.depthWrite).toBe(false);
    const v1 = m.version;
    expect(v1).toBeGreaterThan(v0);

    // Sigue transparente: nada que recompilar en cada fotograma.
    ponerOpacidad([m], 0.6);
    expect(m.version).toBe(v1);
    expect(m.depthWrite).toBe(true);

    // Vuelta a opaco (acotado a 1): se recompila otra vez.
    ponerOpacidad([m], 1.3);
    expect(m.transparent).toBe(false);
    expect(m.opacity).toBe(1);
    expect(m.version).toBeGreaterThan(v1);
    m.dispose();
  });
});

describe('ruidoFractal', () => {
  it('es determinista y queda normalizado entre 0 y 1', () => {
    const a = ruidoFractal(7, 4, 4);
    const b = ruidoFractal(7, 4, 4);
    expect(a).toEqual(b);
    expect(Math.min(...a)).toBeCloseTo(0, 5);
    expect(Math.max(...a)).toBeCloseTo(1, 5);
  });

  it('se repite sin costura: el borde derecho continúa en el izquierdo', () => {
    const lado = 256;
    const r = ruidoFractal(3, 4, 4, 1);
    // Con una sola octava suave, píxeles vecinos a través del borde se parecen tanto como vecinos dentro.
    let saltoBorde = 0;
    let saltoDentro = 0;
    for (let j = 0; j < lado; j++) {
      saltoBorde += Math.abs(r[j * lado + lado - 1]! - r[j * lado]!);
      saltoDentro += Math.abs(r[j * lado + 100]! - r[j * lado + 101]!);
    }
    expect(saltoBorde).toBeLessThan(saltoDentro * 3 + 1);
  });

  it('con escalas distintas por eje da vetas: varía más a lo ancho que a lo alto', () => {
    const lado = 256;
    const r = ruidoFractal(5, 32, 2, 1);
    let ancho = 0;
    let alto = 0;
    for (let k = 0; k < lado - 1; k++) {
      ancho += Math.abs(r[64 * lado + k]! - r[64 * lado + k + 1]!);
      alto += Math.abs(r[k * lado + 64]! - r[(k + 1) * lado + 64]!);
    }
    expect(ancho).toBeGreaterThan(alto * 4);
  });
});

describe('texturaRelieve', () => {
  it('se calcula una vez, se comparte y se repite sobre la superficie', () => {
    const t = texturaRelieve('poros');
    expect(t).toBeInstanceOf(DataTexture);
    expect(texturaRelieve('poros')).toBe(t);
    expect(t.wrapS).toBe(RepeatWrapping);
    expect(t.image.width).toBe(256);
  });

  it('lleva la altura en R y en G un factor de rugosidad entre RUGOSIDAD_MINIMA_RELIEVE y 1, que crece con ella', () => {
    const datos = texturaRelieve('poros').image.data as Uint8Array;
    let minR = 255;
    let minG = 255;
    for (let k = 0; k < datos.length; k += 4) {
      minR = Math.min(minR, datos[k]!);
      minG = Math.min(minG, datos[k + 1]!);
      // La rugosidad no baja del mínimo ni deja de seguir a la altura (la rugosidad media ya no cae a la mitad).
      const esperado = Math.round(
        (1 - (1 - RUGOSIDAD_MINIMA_RELIEVE) * (1 - datos[k]! / 255)) * 255,
      );
      expect(Math.abs(datos[k + 1]! - esperado)).toBeLessThanOrEqual(1);
    }
    expect(minR).toBeLessThan(40);
    expect(minG).toBeGreaterThanOrEqual(Math.floor(RUGOSIDAD_MINIMA_RELIEVE * 255) - 1);
  });
});

describe('materialOrganico', () => {
  it('el hueso es mate y lleva relieve de poros; el cartílago, liso y húmedo', () => {
    const hueso = materialOrganico('#eadfc8', 'hueso');
    const cartilago = materialOrganico('#dde9ef', 'cartilago');
    expect(hueso).toBeInstanceOf(MeshPhysicalMaterial);
    expect(hueso.bumpMap?.name).toBe('relieve_poros');
    expect(hueso.roughness).toBeGreaterThan(cartilago.roughness);
    expect(cartilago.clearcoat).toBeGreaterThan(hueso.clearcoat);
    liberarMaterialOrganico(hueso);
    liberarMaterialOrganico(cartilago);
  });

  it('cada material tiene su propia repetición de la textura compartida', () => {
    const a = materialOrganico('#fff', 'hueso');
    const b = materialOrganico('#fff', 'membrana');
    expect(a.bumpMap).not.toBe(b.bumpMap);
    expect(a.bumpMap!.source).toBe(texturaRelieve('poros').source);
    expect(b.sheen).toBeGreaterThan(0);
  });

  it('lo que se pasa aparte pisa el ajuste del tejido', () => {
    const m = materialOrganico('#fff', 'vaso', { emissive: '#7a2a24', roughness: 0.9 });
    expect(m.roughness).toBe(0.9);
    expect(m.emissive.getHexString()).toBe('7a2a24');
  });

  it('el color varía con el relieve (motas): el sombreador lee la altura con las UV del relieve', () => {
    const m = materialOrganico('#eadfc8', 'hueso');
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
    };
    m.onBeforeCompile(shader as never, undefined as never);
    expect(shader.fragmentShader).toContain('uniform float uMotasOrg;');
    expect(shader.fragmentShader).toContain('texture2D(bumpMap, vBumpMapUv).r');
    // La inyección va después del color (y del color por vértice o instancia), dentro de main.
    expect(shader.fragmentShader.indexOf('uMotasOrg, 1.0 + uMotasOrg')).toBeGreaterThan(
      shader.fragmentShader.indexOf('void main()'),
    );
    expect(shader.uniforms.uMotasOrg!.value).toBeGreaterThan(0);
    expect(m.customProgramCacheKey()).toBe('ova-motas');
    // Sin relieve (vasos) no hay motas: el programa por defecto de three.
    expect(materialOrganico('#fff', 'vaso').customProgramCacheKey()).not.toBe('ova-motas');
    liberarMaterialOrganico(m);
  });
});

describe('materialTriplanar', () => {
  it('no usa UV: sin mapas de relieve, y el sombreador proyecta el relieve desde los tres ejes', () => {
    const m = materialTriplanar('#e8dcc3', 'hueso', { escala: 2, intensidad: 1, motas: 0.1 });
    expect(m.bumpMap).toBeNull();
    expect(m.roughnessMap).toBeNull();
    // Se compila con los sombreadores reales del material físico de three: cada inyección debe encontrar
    // su marca (si una versión nueva de three la cambiara, esta prueba lo diría).
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
    };
    m.onBeforeCompile(shader as never, undefined as never);
    expect(shader.vertexShader).toContain('vPosTri = position;');
    expect(shader.vertexShader).toContain('vNormalTri = objectNormal;');
    expect(shader.fragmentShader).toContain('float hTri = alturaTri();');
    expect(shader.fragmentShader).toContain('roughnessFactor = clamp(');
    expect(shader.fragmentShader).toContain('normal = perturbarTri(');
    expect(shader.uniforms.uEscalaTri!.value).toBe(2);
    // Clon propio de la textura de la caché (mismos datos): se libera con el material.
    const relieve = shader.uniforms.uRelieveTri!.value as DataTexture;
    expect(relieve).not.toBe(texturaRelieve('poros'));
    expect(relieve.source).toBe(texturaRelieve('poros').source);
    expect(m.customProgramCacheKey()).toBe('ova-triplanar-poros');
    let liberado = false;
    relieve.addEventListener('dispose', () => (liberado = true));
    liberarMaterialOrganico(m);
    expect(liberado).toBe(true);
  });
});
