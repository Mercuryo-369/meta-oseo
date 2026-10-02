/**
 * Puntos anatómicos de la mandíbula BodyParts3D calculados con geometría (sin coordenadas escritas a mano).
 *
 * Todo el cálculo se hace en un sistema CANÓNICO en el que la hemimandíbula trabajada es la de x < 0 (el lado
 * derecho del sujeto en la escena). El lado izquierdo se obtiene espejando la malla (`espejar`), aplicando las
 * mismas reglas y deshaciendo el espejo en el resultado. Así la derecha y la izquierda salen de la misma regla.
 *
 * Sistema del modelo normalizado (apps/web/src/scenes/stl.ts): +Y arriba, +Z hacia delante (el mentón),
 * -X = lado derecho del sujeto. Los dientes son componentes conexas aparte (1 hueso + 14 dientes).
 */
import { componentes } from './malla.mjs';
import { add, cross, distanciaASuperficie, mul, norma, preparar, rayo, sub, unit, vert } from './geometria.mjs';

/** Separación (unidades del modelo, radio = 1) entre el ancla y la superficie: apenas sobre el hueso. */
export const SEPARACION = 0.008;

/** Malla espejada en X (con el orden de vértices invertido para conservar las normales hacia fuera). */
export function espejar(m) {
  const P = Float64Array.from(m.P);
  for (let i = 0; i < m.nv; i++) P[i * 3] = -P[i * 3];
  const idx = Uint32Array.from(m.idx);
  for (let t = 0; t < m.nt; t++) { const b = idx[t * 3 + 1]; idx[t * 3 + 1] = idx[t * 3 + 2]; idx[t * 3 + 2] = b; }
  return { ...m, P, idx, caja: { min: [-m.caja.max[0], m.caja.min[1], m.caja.min[2]], max: [-m.caja.min[0], m.caja.max[1], m.caja.max[2]] } };
}

/** Prepara hueso y dientes de una malla: triángulos por componente, normales y vecindad del hueso. */
export function analizarMalla(m) {
  const comp = componentes(m);
  const hueso = [];
  const dientesTris = Array.from({ length: comp.n - 1 }, () => []);
  for (let t = 0; t < m.nt; t++) (comp.porTri[t] === 0 ? hueso : dientesTris[comp.porTri[t] - 1]).push(t);
  const todos = Array.from({ length: m.nt }, (_, t) => t);
  const g = preparar(m, hueso);
  const dientes = dientesTris.map((tris) => {
    const c = [0, 0, 0], mn = [9, 9, 9], mx = [-9, -9, -9]; let n = 0;
    for (const t of tris) for (let k = 0; k < 3; k++) { const p = vert(m, m.idx[t * 3 + k]); for (let a = 0; a < 3; a++) { c[a] += p[a]; mn[a] = Math.min(mn[a], p[a]); mx[a] = Math.max(mx[a], p[a]); } n++; }
    return { centro: c.map((v) => v / n), min: mn, max: mx, tris: tris.length };
  });
  return { m, hueso, todos, g, dientes };
}

const NOMBRES_DIENTE = ['incisivo_central', 'incisivo_lateral', 'canino', 'premolar_1', 'premolar_2', 'molar_1', 'molar_2'];

/** Vértice de hueso (canónico, x < 0) que maximiza `f`. */
function mejorVertice(A, f, filtro = () => true) {
  const { m, hueso } = A; let mejor = null, mv = -Infinity;
  const vistos = new Set();
  for (const t of hueso) for (let k = 0; k < 3; k++) {
    const i = m.idx[t * 3 + k]; if (vistos.has(i)) continue; vistos.add(i);
    const p = vert(m, i); if (!(p[0] < 0) || !filtro(p)) continue;
    const v = f(p); if (v > mv) { mv = v; mejor = i; }
  }
  return mejor;
}

const normalVert = (A, i) => [A.g.N[i * 3], A.g.N[i * 3 + 1], A.g.N[i * 3 + 2]];

/** Vértices del hueso del lado canónico (x < 0), una sola vez cada uno. */
function verticesLado(A) {
  const { m, hueso } = A; const set = new Set();
  for (const t of hueso) for (let k = 0; k < 3; k++) { const i = m.idx[t * 3 + k]; if (m.P[i * 3] < 0) set.add(i); }
  return [...set];
}

/** Punto de superficie con normal: `{ p, n }` (p sobre la malla). */
const enVertice = (A, i) => ({ p: vert(A.m, i), n: normalVert(A, i) });
const enRayo = (A, origen, dir) => { const h = rayo(A.m, A.hueso, origen, unit(dir)); return h ? { p: h.p, n: h.n } : null; };

/**
 * Calcula todos los puntos del lado canónico (x < 0). Devuelve { puntos: {id: {p, n}}, dientes: [...], notas }.
 * Las reglas están explicadas en docs/anclas-mandibula.md.
 */
export function puntosLado(A) {
  const { m, dientes: todosDientes } = A;
  const V = verticesLado(A);
  const ymin = Math.min(...V.map((i) => m.P[i * 3 + 1])), ymax = Math.max(...V.map((i) => m.P[i * 3 + 1]));

  // --- Dientes del lado (x < 0), ordenados de la línea media hacia atrás por |x| ---------------
  const dl = todosDientes.filter((d) => d.centro[0] < 0).sort((a, b) => Math.abs(a.centro[0]) - Math.abs(b.centro[0]));
  if (dl.length !== NOMBRES_DIENTE.length) throw new Error(`Se esperaban ${NOMBRES_DIENTE.length} dientes por lado y hay ${dl.length}`);
  const diente = Object.fromEntries(NOMBRES_DIENTE.map((n, k) => [n, dl[k]]));

  // --- Envolvente superior del lado en el perfil (z, y) -----------------------------------------
  const ANCHO = 0.02; const env = new Map();
  for (const i of V) { const k = Math.round(m.P[i * 3 + 2] / ANCHO); const y = m.P[i * 3 + 1]; if (!env.has(k) || y > env.get(k).y) env.set(k, { y, i }); }
  const claves = [...env.keys()].sort((a, b) => a - b);

  // Cóndilo: el punto más alto del lado.
  const iCondilo = mejorVertice(A, (p) => p[1]);
  const condilo = vert(m, iCondilo);
  // Fin de la rama por delante: primera franja tras el cóndilo cuya envolvente cae por debajo del plano medio del hueso.
  const kCond = Math.round(condilo[2] / ANCHO);
  const medio = (ymin + ymax) / 2;
  let kFin = claves[claves.length - 1];
  for (const k of claves) if (k > kCond && env.get(k).y < medio) { kFin = k - 1; break; }
  // Escotadura: el mínimo de la envolvente entre el cóndilo y el final de la rama (alejado del cóndilo).
  // La envolvente de una malla de pocos polígonos es dentada: se suaviza con la media de 5 franjas para hallar el fondo.
  const suave = (k) => { let s = 0, n = 0; for (let d = -2; d <= 2; d++) if (env.has(k + d)) { s += env.get(k + d).y; n++; } return s / n; };
  let kEsc = null;
  for (const k of claves) if (k * ANCHO > condilo[2] + 0.1 && k <= kFin - 2) { if (kEsc === null || suave(k) < suave(kEsc)) kEsc = k; }
  const iEsc = env.get(kEsc).i;
  // Coronoides: el máximo de la envolvente entre la escotadura y el final de la rama.
  let kCor = null;
  for (const k of claves) if (k > kEsc && k <= kFin) { if (kCor === null || env.get(k).y > env.get(kCor).y) kCor = k; }
  const iCor = env.get(kCor).i;
  const esc = vert(m, iEsc), cor = vert(m, iCor);

  // Ángulo (gonion): el vértice más posterior e inferior del lado.
  const iGon = mejorVertice(A, (p) => -p[2] - p[1] + 0.0 * p[0], (p) => p[2] < 0);
  const gon = vert(m, iGon);

  // Perfil de una franja z: cresta alveolar (borde superior del cuerpo) y borde basal.
  const franja = (z0, tol = 0.02, filtro = () => true) => V.filter((i) => Math.abs(m.P[i * 3 + 2] - z0) < tol && filtro(vert(m, i)));
  const crestaEn = (z0) => Math.max(...franja(z0, 0.02, (p) => p[0] < -0.03).map((i) => m.P[i * 3 + 1]));
  const baseEn = (z0) => Math.min(...franja(z0, 0.02, (p) => p[0] < -0.03).map((i) => m.P[i * 3 + 1]));
  const nivel = (z0, f) => baseEn(z0) + f * (crestaEn(z0) - baseEn(z0));

  const puntos = {};
  /** Variantes anatómicamente válidas de lo que abarca una zona extensa: id -> [{p, n, desc}]. La primera es la regla base. */
  const candidatos = {};
  const pv = (i) => enVertice(A, i);
  puntos.condilo = pv(iCondilo);
  puntos.apofisis_coronoides = pv(iCor);
  puntos.escotadura_mandibular = pv(iEsc);
  puntos.angulo = pv(iGon);

  // Cuello del cóndilo: el nivel de menor grosor anteroposterior bajo la cabeza; el punto va en su cara anterolateral.
  let mejorGrosor = Infinity, yCuello = null, centroCuello = null;
  // Se busca bajo la cabeza (que mide unos 0,12 del modelo de alto), no en ella.
  for (let y = condilo[1] - 0.26; y <= condilo[1] - 0.12; y += 0.01) {
    const b = V.filter((i) => Math.abs(m.P[i * 3 + 1] - y) < 0.012 && m.P[i * 3 + 2] < esc[2]).map((i) => vert(m, i));
    if (b.length < 4) continue;
    const zs = b.map((p) => p[2]); const g = Math.max(...zs) - Math.min(...zs);
    if (g < mejorGrosor) { mejorGrosor = g; yCuello = y; centroCuello = [b.reduce((s, p) => s + p[0], 0) / b.length, y, b.reduce((s, p) => s + p[2], 0) / b.length]; }
  }
  const dAL = unit([-1, 0, 1]);
  // Variantes: el mismo corte y otros dos más abajo (el cuello se continúa con la rama sin un límite nítido).
  candidatos.cuello_condilo = [0, -0.05, -0.1].map((dy) => {
    const c = [centroCuello[0], centroCuello[1] + dy, centroCuello[2]];
    return { ...enRayo(A, add(c, mul(dAL, 2)), mul(dAL, -1)), desc: `cara anterolateral del cuello, ${dy === 0 ? 'nivel de menor grosor' : dy + ' más abajo'}` };
  });

  // Rama: cara lateral en el centro de la lámina (entre el cóndilo y la coronoides, entre la escotadura y el ángulo).
  const yRama = (esc[1] + gon[1]) / 2, zRama = (condilo[2] + cor[2]) / 2;
  const lateral = (y, z) => enRayo(A, [-2, y, z], [1, 0, 0]);
  const signo = (v) => (v >= 0 ? '+' : '') + v;
  candidatos.rama = [[0, 0], [-0.12, 0], [0.12, 0], [0, -0.07], [0, 0.05], [-0.12, -0.07], [0.12, 0.05], [0.2, 0], [-0.2, 0]]
    .map(([dy, dz]) => ({ ...lateral(yRama + dy, zRama + dz), desc: `centro de la lámina, y ${signo(dy)}, z ${signo(dz)}` }));

  // Zonas del cuerpo: `nivel(z, f)` = fracción f de la altura del cuerpo desde el borde basal (0) hasta la cresta (1).
  const zM1 = diente.molar_1.centro[2], zM2 = diente.molar_2.centro[2], zP1 = diente.premolar_1.centro[2], zP2 = diente.premolar_2.centro[2];
  const zMol = (zM1 + zM2) / 2, zPM = (zM1 + zP2) / 2;
  const cuadricula = (zs, fs, hacer) => zs.flatMap(([nz, z]) => fs.map((f) => ({ ...hacer(z, f), desc: `${nz}, nivel ${f}` })));
  candidatos.cuerpo = cuadricula([['bajo el primer molar', zM1], ['entre los molares', zMol], ['entre el 1.er molar y el 2.º premolar', zPM]], [0.5, 0.35, 0.65], (z, f) => lateral(nivel(z, f), z));
  candidatos.cuerpo_molares = cuadricula([['entre los molares', zMol], ['bajo el primer molar', zM1], ['entre el 1.er molar y el 2.º premolar', zPM]], [0.4, 0.55, 0.25], (z, f) => lateral(nivel(z, f), z));
  candidatos.hueso_trabecular_cuerpo = cuadricula([['entre el 1.er molar y el 2.º premolar', zPM], ['bajo el primer molar', zM1], ['bajo el segundo premolar', zP2]], [0.5, 0.4, 0.6], (z, f) => lateral(nivel(z, f), z));
  candidatos.cuerpo_mandibular_basal = cuadricula([['bajo el segundo premolar', zP2], ['bajo el primer molar', zM1], ['entre el 1.er molar y el 2.º premolar', zPM]], [0.28, 0.2, 0.36], (z, f) => lateral(nivel(z, f), z));
  // Borde basal y su cortical: cara anterolateral del cuerpo, apenas sobre el borde inferior.
  const basal = (z0, f) => enRayo(A, [-1.6, nivel(z0, f), z0 + 1.4], [1, 0, -1]);
  candidatos.borde_basal = cuadricula([['bajo el segundo premolar', zP2], ['bajo el primer molar', zM1], ['bajo el primer premolar', zP1]], [0.1, 0.06, 0.15], basal);
  candidatos.cortical_basal = cuadricula([['bajo el primer molar', zM1], ['bajo el segundo premolar', zP2], ['bajo el primer premolar', zP1]], [0.06, 0.1, 0.03], basal);

  // Foramen mentoniano: el hoyo (concavidad) más marcado de la cara lateral del cuerpo bajo los premolares.
  puntos.foramen_mentoniano = hoyo(A, V, (p, n) => p[0] < -0.15 && n[0] < -0.4 && p[2] > 0.15 && p[2] < 0.5 && p[1] < crestaEn(p[2]) - 0.02 && p[1] > baseEn(p[2]) + 0.05);

  // Foramen mandibular: el hoyo más marcado de la cara medial de la rama (con la língula justo delante).
  puntos.foramen_mandibular = hoyo(A, V, (p, n) => p[0] < -0.3 && n[0] > 0.5 && Math.abs(p[2] - (zRama - 0.05)) < 0.12 && Math.abs(p[1] - yRama) < 0.12);

  // Línea milohioidea: el punto más medial de la cara lingual del cuerpo (la cresta), en varios cortes bajo los molares.
  const milohioidea = (z0) => {
    let mejor = null;
    for (let y = baseEn(z0) + 0.05; y < crestaEn(z0) - 0.02; y += 0.005) {
      const h = rayo(m, A.hueso, [0, y, z0], [-1, 0, 0]);
      if (h && (!mejor || Math.abs(h.p[0]) < Math.abs(mejor.p[0]))) mejor = h;
    }
    return { p: mejor.p, n: mejor.n };
  };
  candidatos.linea_milohioidea = [['bajo el primer molar', zM1], ['entre los molares', zMol], ['entre el 1.er molar y el 2.º premolar', zPM]].map(([d, z]) => ({ ...milohioidea(z), desc: d }));

  // --- Alveolares: rayos horizontales sobre el hueso que rodea a los dientes ------------------------
  // Dirección "hacia fuera" (vestibular) en el plano horizontal en cada diente, perpendicular al arco.
  const arco = NOMBRES_DIENTE.map((n) => diente[n].centro);
  const centroArco = [arco.reduce((s, c) => s + c[0], 0) / arco.length, 0, arco.reduce((s, c) => s + c[2], 0) / arco.length];
  const vestibular = (k) => {
    const a = arco[Math.max(0, k - 1)], b = arco[Math.min(arco.length - 1, k + 1)];
    const t = unit([b[0] - a[0], 0, b[2] - a[2]]);
    let n = [t[2], 0, -t[0]];
    const fuera = [arco[k][0] - centroArco[0], 0, arco[k][2] - centroArco[2]];
    if (n[0] * fuera[0] + n[2] * fuera[2] < 0) n = mul(n, -1);
    return n;
  };
  /** Punto del hueso alveolar en la cara vestibular (o lingual) a la altura de un diente o entre dos. */
  const alveolar = ({ entre, en, lingual = false, bajoCresta = 0.055 }) => {
    let c, nh, desc;
    if (entre) { const [a, b] = entre.map((n) => NOMBRES_DIENTE.indexOf(n)); c = mul(add(arco[a], arco[b]), 0.5); nh = unit(add(vestibular(a), vestibular(b))); desc = `entre ${entre.join(' y ')}`; }
    else { const k = NOMBRES_DIENTE.indexOf(en); c = arco[k]; nh = vestibular(k); desc = en; }
    const o = [c[0], crestaEn(c[2]) - bajoCresta, c[2]];
    const h = lingual ? enRayo(A, add(o, mul(nh, -0.35)), nh) : enRayo(A, add(o, mul(nh, 0.7)), mul(nh, -1));
    return { ...h, desc: `${lingual ? 'cara lingual, ' : 'cara vestibular, '}${desc}` };
  };
  // Parte anterior del cuerpo (bajo los incisivos, el canino y los premolares): cara vestibular a una fracción de la altura.
  const cuerpoAnterior = (en, f) => {
    const k = NOMBRES_DIENTE.indexOf(en), c = arco[k], nh = vestibular(k);
    return { ...enRayo(A, add([c[0], nivel(c[2], f), c[2]], mul(nh, 0.7)), mul(nh, -1)), desc: `cuerpo anterior bajo ${en}, nivel ${f}` };
  };
  const anterior = (fs, dientes) => dientes.flatMap((en) => fs.map((f) => cuerpoAnterior(en, f)));
  candidatos.cuerpo_mandibular_basal.push(...anterior([0.2, 0.3], ['canino', 'incisivo_lateral', 'premolar_1']));
  candidatos.borde_basal.push(...anterior([0.08, 0.14], ['canino', 'incisivo_lateral']));
  candidatos.cortical_basal.push(...anterior([0.05, 0.1], ['canino', 'incisivo_lateral']));
  // Cada punto alveolar se ofrece a tres alturas (la base, más cerca de la cresta y más abajo, sobre el hueso que rodea la raíz).
  const ALTURAS = [0, -0.035, 0.04];
  const enDientes = (lista, opciones = {}) => lista.flatMap((en) => ALTURAS.map((dy) => alveolar({ en, ...opciones, bajoCresta: (opciones.bajoCresta ?? 0.055) + dy }))).filter((c) => c.p);
  const entreDientes = (lista, opciones = {}) => lista.flatMap((entre) => ALTURAS.map((dy) => alveolar({ entre, ...opciones, bajoCresta: (opciones.bajoCresta ?? 0.055) + dy }))).filter((c) => c.p);
  candidatos.proceso_alveolar = enDientes(['premolar_2', 'premolar_1', 'molar_1', 'canino', 'incisivo_lateral']);
  candidatos.tabla_cortical_vestibular = enDientes(['incisivo_central', 'incisivo_lateral', 'canino', 'premolar_1', 'premolar_2'], { bajoCresta: 0.06 });
  candidatos.tabla_cortical_lingual = enDientes(['premolar_2', 'molar_1', 'premolar_1', 'canino'], { lingual: true, bajoCresta: 0.07 });
  candidatos.septo_interdental = entreDientes([['premolar_1', 'premolar_2'], ['premolar_2', 'molar_1'], ['incisivo_central', 'incisivo_lateral'], ['canino', 'premolar_1'], ['incisivo_lateral', 'canino']], { bajoCresta: 0.04 });
  candidatos.lamina_dura = enDientes(['molar_1', 'premolar_2', 'premolar_1', 'canino', 'incisivo_lateral'], { bajoCresta: 0.05 });
  candidatos.canino_zona_compresion = entreDientes([['canino', 'premolar_1']], { bajoCresta: 0.06 });
  candidatos.canino_zona_tension = entreDientes([['incisivo_lateral', 'canino']], { bajoCresta: 0.06 });
  // Cresta alveolar: el borde superior del hueso (punto más alto de una franja) bajo un diente.
  candidatos.cresta_alveolar = [['bajo el primer molar', zM1], ['bajo el segundo premolar', zP2], ['bajo el primer premolar', zP1], ['bajo el canino', diente.canino.centro[2]], ['bajo el incisivo lateral', diente.incisivo_lateral.centro[2]]]
    .map(([d, z]) => ({ ...pv(mejorVertice(A, (p) => (Math.abs(p[2] - z) < 0.02 && p[0] < -0.03 ? p[1] : -Infinity))), desc: d }));

  for (const id of Object.keys(candidatos)) candidatos[id] = candidatos[id].filter((c) => c && c.p); // un rayo que no toca el hueso no da variante
  // Las estructuras con variantes toman por defecto la primera; las demás son un solo punto.
  for (const [id, lista] of Object.entries(candidatos)) puntos[id] = lista[0];
  for (const id of Object.keys(puntos)) candidatos[id] ??= [{ ...puntos[id], desc: 'punto único' }];
  candidatos.apofisis_alveolar = candidatos.proceso_alveolar;
  candidatos.agujero_mentoniano = candidatos.foramen_mentoniano;
  puntos.apofisis_alveolar = puntos.proceso_alveolar;
  puntos.agujero_mentoniano = puntos.foramen_mentoniano;

  return { puntos, candidatos, dientes: dl.map((d, k) => ({ nombre: NOMBRES_DIENTE[k], ...d })), referencias: { condilo, esc, cor, gon, yRama, zRama, yCuello } };
}

/**
 * Hoyo (foramen) de la superficie: agrupa los vértices cuya "concavidad" (desplazamiento del promedio de sus
 * vecinos sobre la normal) es alta dentro de la región `filtro` y devuelve el centro del grupo de mayor peso,
 * proyectado sobre la superficie con un rayo que viene de fuera (dirección `haciaDentro` opuesta a la salida).
 */
function hoyo(A, V, filtro) {
  const { m, g } = A;
  const cand = [];
  for (const i of V) {
    if (!g.vecinos[i].size) continue;
    const p = vert(m, i), n = [g.N[i * 3], g.N[i * 3 + 1], g.N[i * 3 + 2]];
    if (!filtro(p, n)) continue;
    let c = [0, 0, 0]; for (const j of g.vecinos[i]) c = add(c, vert(m, j)); c = mul(c, 1 / g.vecinos[i].size);
    const s = sub(c, p); const score = s[0] * n[0] + s[1] * n[1] + s[2] * n[2];
    if (score > 0) cand.push({ p, n, score });
  }
  cand.sort((a, b) => b.score - a.score);
  const mx = cand[0].score; const fuertes = cand.filter((c) => c.score >= 0.55 * mx);
  // Agrupación por proximidad (radio 0,05) y peso = suma de concavidades.
  const grupos = [];
  for (const c of fuertes) {
    let g1 = grupos.find((gr) => gr.some((q) => norma(sub(q.p, c.p)) < 0.05));
    if (!g1) { g1 = []; grupos.push(g1); } g1.push(c);
  }
  grupos.sort((a, b) => b.reduce((s, c) => s + c.score, 0) - a.reduce((s, c) => s + c.score, 0));
  const gr = grupos[0]; const w = gr.reduce((s, c) => s + c.score, 0);
  const centro = gr.reduce((s, c) => add(s, mul(c.p, c.score / w)), [0, 0, 0]);
  const nMed = unit(gr.reduce((s, c) => add(s, mul(c.n, c.score / w)), [0, 0, 0]));
  const h = rayo(m, A.hueso, add(centro, mul(nMed, 0.4)), mul(nMed, -1));
  return h ? { p: h.p, n: h.n } : { p: centro, n: nMed };
}

/**
 * Sínfisis (mentón): el punto más anterior de la línea media en la mitad INFERIOR del hueso (el pogonion, la
 * protuberancia mentoniana; la mitad superior es hueso alveolar). Va aparte: no es par. Se proyecta con un rayo
 * horizontal en x = 0 para quedar exactamente en la línea media.
 */
export function puntoSinfisis(A) {
  const { m, hueso } = A;
  const ys = []; const vistos = new Set();
  for (const t of hueso) for (let k = 0; k < 3; k++) { const i = m.idx[t * 3 + k]; if (!vistos.has(i)) { vistos.add(i); const p = vert(m, i); if (Math.abs(p[0]) < 0.03) ys.push(p[1]); } }
  const yMedio = (Math.min(...ys) + Math.max(...ys)) / 2;
  let mejor = null;
  for (let y = Math.min(...ys) + 0.02; y < yMedio; y += 0.005) { const h = rayo(m, hueso, [0, y, 2], [0, 0, -1]); if (h && (!mejor || h.p[2] > mejor.p[2])) mejor = h; }
  return { p: mejor.p, n: mejor.n };
}

/** Deshace el espejo de un punto `{p, n}`. */
export const desespejar = (pt) => ({ p: [-pt.p[0], pt.p[1], pt.p[2]], n: [-pt.n[0], pt.n[1], pt.n[2]] });

/** Todos los puntos de los dos lados: `{ derecha, izquierda, candidatos: {derecha, izquierda}, sinfisis }` (coordenadas del modelo). */
export function calcularLados(m) {
  const derecha = puntosLado(analizarMalla(m));
  const izq = puntosLado(analizarMalla(espejar(m)));
  const desesp = (mapa) => Object.fromEntries(Object.entries(mapa).map(([id, v]) => [id, Array.isArray(v) ? v.map((c) => ({ ...desespejar(c), desc: c.desc })) : desespejar(v)]));
  return {
    derecha: derecha.puntos, izquierda: desesp(izq.puntos),
    candidatos: { derecha: derecha.candidatos, izquierda: desesp(izq.candidatos) },
    dientes: derecha.dientes, referencias: derecha.referencias, sinfisis: puntoSinfisis(analizarMalla(m)),
  };
}

export { cross, distanciaASuperficie };
