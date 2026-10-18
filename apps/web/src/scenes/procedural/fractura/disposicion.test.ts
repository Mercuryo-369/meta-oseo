/**
 * Pruebas de la disposición de las piezas repetidas de la escena de la fractura: deterministas, en el número
 * previsto, dentro de sus límites y coherentes con el estado (brecha, radios, perfiles).
 */
import { describe, expect, it } from 'vitest';
import {
  IRREGULAR,
  celulasInflamatorias,
  celulasMadre,
  desplazamientoEn,
  enCuna,
  gotasDeSangre,
  grumo,
  normalSobreCallo,
  osteoblastosDelCallo,
  osteoclastosDelCallo,
  perfilSolido,
  puntoSobreCallo,
  puntoSobreHematoma,
  radioCallo,
  radioHematoma,
  vasosNuevos,
  vasosRotos,
} from './disposicion';
import {
  BRECHA,
  CALLO,
  CUNA,
  DESPLAZAMIENTO,
  HEMATOMA,
  N_CELULAS_INFLAMATORIAS,
  N_CELULAS_MADRE,
  N_GOTAS,
  N_OSTEOBLASTOS,
  N_OSTEOCLASTOS,
  N_VASOS_NUEVOS,
  N_VASOS_ROTOS,
  PERIOSTIO,
  R_CORTICAL,
} from './estado';

describe('perfiles de revolución', () => {
  it('el hematoma es un fusiforme que llena la brecha, rodea los extremos y se cierra en sus puntas', () => {
    expect(radioHematoma(0)).toBeCloseTo(HEMATOMA.radio, 9);
    expect(radioHematoma(0)).toBeGreaterThan(PERIOSTIO.exterior);
    expect(radioHematoma(HEMATOMA.medioLargo)).toBe(0);
    expect(radioHematoma(-HEMATOMA.medioLargo - 1)).toBe(0);
    for (let y = 0; y < HEMATOMA.medioLargo; y += 0.1) {
      expect(radioHematoma(y + 0.1)).toBeLessThanOrEqual(radioHematoma(y));
    }
  });

  it('el callo es un manguito que sobresale de la cortical en el centro y se funde con ella en los extremos', () => {
    expect(radioCallo(0)).toBeCloseTo(CALLO.radioMax, 9);
    expect(radioCallo(CALLO.medioLargoCentro)).toBeGreaterThan(R_CORTICAL + 0.3);
    expect(radioCallo(CALLO.medioLargo - 1e-6)).toBeLessThan(R_CORTICAL);
    expect(radioCallo(CALLO.medioLargo)).toBe(0);
    for (let y = 0; y < CALLO.medioLargo - 0.1; y += 0.1) {
      expect(radioCallo(y + 0.1)).toBeLessThan(radioCallo(y));
    }
  });

  it('perfilSolido empieza y termina sobre el eje, sube en y y no tiene radios nulos por el medio', () => {
    const perfil = perfilSolido(radioCallo, -0.5, 0.5, 10);
    expect(perfil[0]).toEqual([0, -0.5]);
    expect(perfil[perfil.length - 1]).toEqual([0, 0.5]);
    expect(perfil).toHaveLength(13);
    for (let i = 1; i < perfil.length - 1; i++) {
      expect(perfil[i]![0]).toBeGreaterThan(0);
      expect(perfil[i]![1]).toBeGreaterThanOrEqual(perfil[i - 1]![1]);
    }
  });
});

describe('cuña y desplazamiento', () => {
  it('enCuna reconoce el sector que se abre (centrado en -90°) y deja fuera el resto', () => {
    const centro = ((CUNA.inicio + CUNA.arco / 2) * Math.PI) / 180;
    expect(enCuna(centro)).toBe(true);
    expect(enCuna(centro + Math.PI)).toBe(false);
    expect(enCuna(centro + ((CUNA.arco / 2 + 10) * Math.PI) / 180)).toBe(false);
  });

  it('solo el fragmento distal (y > 0) está desplazado', () => {
    expect(desplazamientoEn(1)).toBe(DESPLAZAMIENTO);
    expect(desplazamientoEn(-1)).toBe(0);
  });
});

describe('sangrado', () => {
  it('los vasos rotos salen de la cara de fractura hacia la brecha, en ambos fragmentos, y son deterministas', () => {
    const lista = vasosRotos();
    expect(lista).toHaveLength(N_VASOS_ROTOS);
    expect(vasosRotos()).toEqual(lista);
    let proximales = 0;
    for (const v of lista) {
      // Nacen en un extremo (o en el periostio roto) y apuntan hacia la brecha.
      expect(Math.abs(v.a[1])).toBeGreaterThanOrEqual(BRECHA / 2 - 1e-9);
      expect(Math.abs(v.b[1])).toBeLessThan(Math.abs(v.a[1]));
      if (v.a[1] < 0) proximales++;
    }
    expect(proximales).toBeGreaterThan(0);
    expect(proximales).toBeLessThan(lista.length);
  });

  it('las gotas caen cerca de la brecha, con radios pequeños', () => {
    const gotas = gotasDeSangre();
    expect(gotas).toHaveLength(N_GOTAS);
    expect(gotasDeSangre()).toEqual(gotas);
    for (const g of gotas) {
      expect(Math.abs(g.p[1])).toBeLessThan(0.75);
      expect(g.radio).toBeGreaterThan(0.03);
      expect(g.radio).toBeLessThan(0.08);
    }
  });
});

describe('células y vasos nuevos', () => {
  it('las células inflamatorias se reparten en neutrófilos y macrófagos, sobre el hematoma o en la brecha', () => {
    const { neutrofilos, macrofagos } = celulasInflamatorias();
    expect(neutrofilos.length + macrofagos.length).toBe(N_CELULAS_INFLAMATORIAS);
    expect(macrofagos.length).toBeGreaterThan(0);
    expect(celulasInflamatorias()).toEqual({ neutrofilos, macrofagos });
    for (const c of [...neutrofilos, ...macrofagos]) {
      expect(Math.abs(c.p[1])).toBeLessThan(HEMATOMA.medioLargo);
      expect(c.retraso).toBeGreaterThanOrEqual(0);
      expect(c.retraso).toBeLessThan(1);
    }
    for (const m of macrofagos)
      for (const n of neutrofilos) expect(m.radio).toBeGreaterThan(n.radio);
  });

  it('las células madre están fuera del periostio (o en la médula), lejos del extremo roto', () => {
    const lista = celulasMadre();
    expect(lista).toHaveLength(N_CELULAS_MADRE);
    for (const c of lista) {
      const radio = Math.hypot(c.p[0] - desplazamientoEn(c.p[1]), c.p[2]);
      expect(Math.abs(c.p[1])).toBeGreaterThan(BRECHA / 2 + 0.4);
      expect(radio > PERIOSTIO.exterior || radio < 0.55).toBe(true);
    }
  });

  it('los vasos nuevos nacen en el periostio o en la médula y crecen hacia la brecha, dentro del callo', () => {
    const lista = vasosNuevos();
    expect(lista).toHaveLength(N_VASOS_NUEVOS);
    expect(vasosNuevos()).toEqual(lista);
    for (const v of lista) {
      expect(Math.abs(v.b[1])).toBeLessThan(Math.abs(v.a[1]));
      const radioFin = Math.hypot(v.b[0] - desplazamientoEn(v.b[1]), v.b[2]);
      expect(radioFin).toBeLessThan(radioCallo(v.b[1]) + 1e-9);
    }
  });
});

describe('células sobre el callo', () => {
  it('osteoclastos y osteoblastos van en el número previsto, dentro del largo del callo', () => {
    const oc = osteoclastosDelCallo();
    const ob = osteoblastosDelCallo();
    expect(oc).toHaveLength(N_OSTEOCLASTOS);
    expect(ob).toHaveLength(N_OSTEOBLASTOS);
    expect(osteoclastosDelCallo()).toEqual(oc);
    for (const c of [...oc, ...ob]) expect(Math.abs(c.y)).toBeLessThan(CALLO.medioLargo * 0.8);
    for (const a of oc) for (const b of ob) expect(a.radio).toBeGreaterThan(b.radio);
  });

  it('puntoSobreCallo sigue la superficie (irregular) del callo a la escala pedida, alrededor del eje x = 0', () => {
    const { amplitud, semilla } = IRREGULAR.callo;
    for (const c of [...osteoclastosDelCallo(), ...osteoblastosDelCallo()]) {
      for (const escala of [1, 0.74, 0.565]) {
        const p = puntoSobreCallo(c, escala);
        // El callo es un torno centrado en x = 0: sin el desplazamiento del fragmento distal (antes, en y > 0, las
        // células quedaban 0,12 apartadas: flotaban).
        const superficie = escala * radioCallo(c.y) * (1 + amplitud * grumo(c.theta, c.y, semilla));
        expect(p[1]).toBeCloseTo(c.y * escala, 9);
        expect(Math.hypot(p[0], p[2])).toBeCloseTo(superficie + 0.2 * c.radio, 9);
      }
      // Con presencia parcial, la separación encoge con la célula.
      const radio = (p: readonly number[]) => Math.hypot(p[0]!, p[2]!);
      expect(radio(puntoSobreCallo(c, 1, 0.5))).toBeLessThan(radio(puntoSobreCallo(c, 1)));
      const n = normalSobreCallo(c);
      expect(Math.hypot(...n)).toBeCloseTo(1, 9);
      // Hacia fuera, y tumbada hacia el extremo del manguito (el perfil baja al alejarse del centro).
      expect(n[0] * Math.sin(c.theta) + n[2] * Math.cos(c.theta)).toBeGreaterThan(0.8);
      expect(n[1] * c.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('puntoSobreHematoma sigue la superficie del hematoma a su escala, alrededor del eje x = 0', () => {
    const { neutrofilos, macrofagos } = celulasInflamatorias();
    const { amplitud, semilla } = IRREGULAR.hematoma;
    const deSuperficie = [...neutrofilos, ...macrofagos].filter((c) => c.superficie);
    expect(deSuperficie.length).toBeGreaterThan(15);
    for (const c of deSuperficie) {
      const y = c.p[1];
      for (const s of [1, 0.61, 0.09]) {
        const p = puntoSobreHematoma(c, s);
        const superficie = s * radioHematoma(y) * (1 + amplitud * grumo(c.theta, y, semilla));
        expect(p[1]).toBeCloseTo(s * y, 9);
        // Asoma el 65 % de su diámetro: centro a 0,3 radios por fuera de la superficie.
        expect(Math.hypot(p[0], p[2])).toBeCloseTo(superficie + 0.3 * c.radio, 9);
      }
    }
  });
});
