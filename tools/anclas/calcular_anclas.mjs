#!/usr/bin/env node
/**
 * Calcula las ANCLAS de la mandíbula (puntos de interés de la actividad `exploracion-3d`) a partir de la
 * malla real (apps/web/public/models/mandibula_bodyparts3d.stl) y las escribe en sus tres destinos:
 *
 *   1. apps/web/src/content/nodos3d.ts      (bloque generado: la FUENTE, con lado, normal y vista recomendada)
 *   2. tools/guiones/conversor/recursos.py  (tabla ANCLAS_MANDIBULA del convertidor de guiones)
 *   3. apps/web/src/modules/<módulo>/content.json (solo los valores `ancla` de los nodos de la mandíbula, por id)
 *
 * Uso (desde la raíz del repositorio):
 *   node tools/anclas/calcular_anclas.mjs              informe en pantalla, no escribe nada
 *   node tools/anclas/calcular_anclas.mjs --escribir   escribe los tres destinos
 *   node tools/anclas/calcular_anclas.mjs --comprobar  falla (código 1) si algún destino difiere de lo calculado
 *   node tools/anclas/calcular_anclas.mjs --png=DIR    además guarda vistas PNG con los puntos numerados
 *
 * Es determinista: misma malla, mismo resultado. El método está en docs/anclas-mandibula.md.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarMalla } from './malla.mjs';
import { calcularLados, SEPARACION, analizarMalla, puntoSinfisis } from './landmarks.mjs';
import { add, dot, mul, norma, rayo, sub, unit } from './geometria.mjs';
import { dibujarNumero, escribirPng, renderizar } from './png.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUTA_STL = join(RAIZ, 'apps/web/public/models/mandibula_bodyparts3d.stl');
const RUTA_NODOS3D = join(RAIZ, 'apps/web/src/content/nodos3d.ts');
const RUTA_RECURSOS = join(RAIZ, 'tools/guiones/conversor/recursos.py');
const DIR_MODULOS = join(RAIZ, 'apps/web/src/modules');

const DECIMALES = 3;
const redondear = (v, d = DECIMALES) => Math.round(v * 10 ** d) / 10 ** d;

/** Estructuras que se piden por ancla, con el id de contenido -> clave del punto calculado. */
const ALIAS = { agujero_mentoniano: 'foramen_mentoniano', apofisis_alveolar: 'proceso_alveolar' };
/** Piezas del catálogo (nodos3d.ts) que la escena ubica sin ancla del contenido: siempre del lado derecho. */
const PIEZAS_CATALOGO = ['condilo', 'apofisis_coronoides', 'rama', 'angulo', 'cuerpo', 'sinfisis', 'foramen_mentoniano'];

// --- Cámara: espejo en JS de apps/web/src/scenes/{vistas,encuadre}.ts (una prueba de vitest lo vigila) ---------
const FOV = 40;
const ANGULOS_VISTA = {
  frontal: [0, 12], posterior: [180, 12], lateral_derecha: [90, 12], lateral_izquierda: [-90, 12],
  superior: [0, 78], inferior: [0, -78], oblicua: [40, 28],
  medial_derecha: [-75, 25], medial_izquierda: [75, 25],
};
/** Las vistas mediales meten la cámara en el arco: al enfocar un nodo su distancia se limita a esto (vistas.ts). */
const DISTANCIA_MAX_VISTA_MEDIAL = 0.9;
const VISTAS_MEDIALES = ['medial_derecha', 'medial_izquierda'];
const rad = (g) => (g * Math.PI) / 180;
export function direccionDeVista(vista) {
  const [az, el] = ANGULOS_VISTA[vista];
  return [-Math.sin(rad(az)) * Math.cos(rad(el)), Math.sin(rad(el)), Math.cos(rad(az)) * Math.cos(rad(el))];
}
/**
 * Cámara inicial de la escena: frontal, elevación 12º y a la distancia que encuadra la esfera del modelo
 * con el aspecto que había al cargar (siempre >= 1: el lienzo aún no tiene su alto final, `min-h-64`), es
 * decir, 1,1 / sin(20º) tanto en móvil como en escritorio. Se comprobó en el navegador con 1 px de error.
 */
const CAMARA_INICIAL = (() => { const d = 1.1 / Math.sin(rad(FOV / 2)); return [0, d * Math.sin(rad(12)), d * Math.cos(rad(12))]; })();
/** Píxel de un punto visto desde la cámara inicial de la escena en un lienzo W x H. */
function pixelInicial(p, W, H) {
  const pos = CAMARA_INICIAL;
  const f = unit(mul(pos, -1)), r = unit([-f[2], 0, f[0]]) /* f x (0,1,0): la derecha de la imagen */, u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const q = sub(p, pos), z = dot(q, f);
  const nx = dot(q, r) / z / (Math.tan(rad(FOV / 2)) * (W / H)), ny = dot(q, u) / z / Math.tan(rad(FOV / 2));
  return [(nx + 1) / 2 * W, (1 - ny) / 2 * H];
}
/** Cuánto mira la normal `n` en `p` hacia la cámara inicial (coseno; la escena atenúa el punto por debajo de -0,15). */
const frenteInicial = (p, n) => { const v = sub(CAMARA_INICIAL, p); return dot(n, v) / norma(v); };
const LIENZOS = [[324, 448], [660, 448]]; // móvil de 390 px y escritorio: el alto es fijo, min(62svh, 28rem)

// --- Lectura del contenido -----------------------------------------------------------------------------------
/** Nodos de la mandíbula de cada módulo: [{ modulo, ids: [...] }]. */
function leerActividades() {
  const salida = [];
  for (const dir of readdirSync(DIR_MODULOS).sort()) {
    const f = join(DIR_MODULOS, dir, 'content.json');
    if (!existsSync(f)) continue;
    const json = JSON.parse(readFileSync(f, 'utf8'));
    const ids = [];
    (function recorrer(o) {
      if (Array.isArray(o)) o.forEach(recorrer);
      else if (o && typeof o === 'object') {
        if (o.modelo === 'mandibula' && Array.isArray(o.nodos)) ids.push(o.nodos.map((n) => n.id));
        Object.values(o).forEach(recorrer);
      }
    })(json);
    ids.forEach((lista) => salida.push({ modulo: dir.slice(0, 2), archivo: f, ids: lista }));
  }
  return salida;
}

// --- Cálculo -------------------------------------------------------------------------------------------------
function calcular() {
  const m = cargarMalla(RUTA_STL);
  const A = analizarMalla(m);
  const L = calcularLados(m);
  const actividades = leerActividades();
  const idsUsados = [...new Set(actividades.flatMap((a) => a.ids))].sort();
  const clave = (id) => ALIAS[id] ?? id;
  const desconocidos = idsUsados.filter((id) => id !== 'sinfisis' && !L.derecha[clave(id)]);
  if (desconocidos.length) throw new Error(`Ids de la mandíbula sin regla de cálculo: ${desconocidos.join(', ')}`);

  // Visibilidad desde cada vista con nombre y vista recomendada.
  const todos = A.todos;
  const ORDEN = {
    // Las mediales van al final: solo ganan si ninguna vista externa ve el punto de frente (foramen y língula).
    derecha: ['frontal', 'oblicua', 'lateral_derecha', 'posterior', 'superior', 'inferior', 'lateral_izquierda', 'medial_derecha', 'medial_izquierda'],
    izquierda: ['frontal', 'lateral_izquierda', 'posterior', 'superior', 'inferior', 'oblicua', 'lateral_derecha', 'medial_izquierda', 'medial_derecha'],
    medio: ['frontal', 'oblicua', 'lateral_derecha', 'inferior', 'superior', 'posterior', 'lateral_izquierda', 'medial_derecha', 'medial_izquierda'],
  };
  // La cámara se coloca a 1,3 a 1,8 del punto según el aspecto del lienzo (calcularEncuadre): se exige verlo a todas.
  const DISTANCIAS_FOCO = [1.3, 1.5, 1.8];
  const visibilidad = (p, n) => {
    const r = {};
    for (const v of Object.keys(ANGULOS_VISTA)) {
      const d = direccionDeVista(v);
      const visible = DISTANCIAS_FOCO.every((distancia) => { const dist = VISTAS_MEDIALES.includes(v) ? Math.min(distancia, DISTANCIA_MAX_VISTA_MEDIAL) : distancia; const cam = add(p, mul(d, dist)); return !rayo(m, todos, cam, unit(sub(p, cam)), dist - 0.03); });
      r[v] = { visible, frente: dot(n, d) };
    }
    return r;
  };
  const BUENA_CARA = 0.4; // coseno mínimo entre la normal y la dirección de la cámara para "verlo de frente"
  const SILUETA = { // estructuras de borde o punta: basta con verlas de perfil; su vista preferida va primero
    condilo: ['frontal', 'lateral', 'posterior'], apofisis_coronoides: ['frontal', 'lateral', 'oblicua'],
    escotadura_mandibular: ['lateral', 'frontal', 'oblicua'], angulo: ['lateral', 'posterior', 'inferior'],
  };
  /** Vista recomendada de un punto y cuánto cuesta (para el reparto): 0 si se ve de frente desde una vista normal. */
  const vistaDe = (id, l, pt, conMediales = false) => {
    const p = cuantizar(sobre(pt)), n = unit(pt.n);
    const vis = visibilidad(p, n);
    const propia = l === 'izquierda' ? 'lateral_izquierda' : 'lateral_derecha';
    // El reparto de lados (recocido de abajo) se decide SIN las vistas mediales, para que añadirlas no mueva ningún
    // ancla ya aprobada; la vista recomendada FINAL de cada estructura sí las considera (`conMediales`).
    const orden = conMediales ? ORDEN[l] : ORDEN[l].filter((v) => !VISTAS_MEDIALES.includes(v));
    let vista, nota = '', penal = 0;
    const silueta = SILUETA[id]?.map((v) => (v === 'lateral' ? propia : v));
    if (silueta) vista = silueta.find((v) => vis[v].visible && vis[v].frente >= -0.1) ?? undefined;
    vista ??= orden.find((v) => vis[v].visible && vis[v].frente >= BUENA_CARA);
    if (!vista) {
      const visibles = orden.filter((v) => vis[v].visible).sort((a, b) => vis[b].frente - vis[a].frente);
      vista = visibles[0];
      nota = vista ? `cara ${vis[vista].frente.toFixed(2)}` : 'oculta';
      penal = vista ? 150 : 1e6;
      vista ??= 'frontal';
    } else if (vista === 'superior' || vista === 'inferior') penal = 60; // solo se ve desde arriba o abajo
    if (frenteInicial(p, n) < -0.15) penal += 40; // en la vista inicial el punto se dibuja atenuado
    return { vista, nota, penal };
  };

  // Opciones de cada estructura: lado x variante. La sínfisis es de la línea media (una sola opción).
  const sobre = (pt) => add(pt.p, mul(unit(pt.n), SEPARACION));
  const aFraccion = (p) => ['x', 'y', 'z'].map((k, i) => (p[i] - m.caja.min[i]) / (m.caja.max[i] - m.caja.min[i]));
  /** El punto tal como lo dibuja la escena: con las fracciones redondeadas a 3 decimales y acotadas de 0 a 1. */
  const cuantizar = (p) => aFraccion(p).map((v, i) => m.caja.min[i] + Math.min(1, Math.max(0, redondear(v))) * (m.caja.max[i] - m.caja.min[i]));
  const variables = [...new Set(idsUsados.filter((id) => id !== 'sinfisis').map(clave))].sort();
  const opciones = Object.fromEntries(variables.map((v) => [v, ['derecha', 'izquierda'].flatMap((lado) => L.candidatos[lado][v].map((pt, k) => ({ lado, k, pt, desc: pt.desc, vis: vistaDe(v, lado, pt), px: LIENZOS.map(([W, H]) => pixelInicial(cuantizar(sobre(pt)), W, H)) })))]));
  const visSinfisis = vistaDe('sinfisis', 'medio', L.sinfisis);
  const pxSinfisis = LIENZOS.map(([W, H]) => pixelInicial(cuantizar(sobre(L.sinfisis)), W, H));
  const opcionDe = (id, eleccion) => (id === 'sinfisis' ? { lado: 'medio', k: 0, pt: L.sinfisis, desc: 'línea media', vis: visSinfisis, px: pxSinfisis } : opciones[clave(id)][eleccion[clave(id)]]);
  const pos = (id, eleccion) => opcionDe(id, eleccion).px;
  const MIN_PX = 44; // objetivo táctil
  const DIAMETRO_PX = 36; // el número dibujado: por debajo de esto dos números se tapan
  const grupos = actividades.map((act) => [...new Set(act.ids.map((id) => (id === 'sinfisis' ? id : clave(id))))]);
  const gruposDe = Object.fromEntries(variables.map((v) => [v, grupos.filter((g) => g.includes(v))]));
  /** Coste del solapamiento de dos números en los dos lienzos: por debajo de 44 px cuesta, por debajo de 36 px (se tapan) cuesta mucho más. */
  const pareja = (a, b, eleccion) => {
    const pa = pos(a, eleccion), pb = pos(b, eleccion);
    let c = 0;
    for (let k = 0; k < LIENZOS.length; k++) { const d = Math.hypot(pa[k][0] - pb[k][0], pa[k][1] - pb[k][1]); if (d < MIN_PX) c += (MIN_PX - d) ** 2; if (d < DIAMETRO_PX) c += 4 * (DIAMETRO_PX - d) ** 2; }
    return c;
  };
  /** Coste propio de una estructura: vista poco buena o atenuada, y un desempate a favor de la regla base y del lado derecho. */
  const propio = (v, eleccion) => { const o = opciones[v][eleccion[v]]; return o.vis.penal + 0.01 * o.k + (o.lado === 'izquierda' ? 0.02 : 0); };
  /** Coste de todo lo que toca a `v` (sus parejas en cada actividad y lo propio). */
  const costeVar = (v, eleccion) => {
    let c = propio(v, eleccion);
    for (const g of gruposDe[v]) for (const u of g) if (u !== v) c += pareja(v, u, eleccion);
    return c;
  };
  const coste = (eleccion) => {
    let c = variables.reduce((suma, v) => suma + propio(v, eleccion), 0);
    for (const g of grupos) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) c += pareja(g[i], g[j], eleccion);
    return c;
  };
  // Recocido simulado con semillas fijas (determinista): cambia la opción de una estructura a la vez; gana el mejor de varios arranques.
  const rngDe = (semilla) => { let a = semilla | 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const indiceDe = (v, lado, k) => opciones[v].findIndex((o) => o.lado === lado && o.k === k);
  const base = Object.fromEntries(variables.map((v) => [v, indiceDe(v, 'derecha', 0)]));
  let mejor = { c: Infinity, cur: base };
  const PASOS = 150000, SEMILLAS = 12;
  for (let semilla = 1; semilla <= SEMILLAS; semilla++) {
    const rng = rngDe(semilla * 7919);
    const cur = { ...base };
    let cActual = coste(cur);
    if (cActual < mejor.c) mejor = { c: cActual, cur: { ...cur } };
    for (let i = 0; i < PASOS; i++) {
      const T = 2500 * (1 - i / PASOS) ** 2 + 0.3;
      const v = variables[Math.floor(rng() * variables.length)];
      const nueva = Math.floor(rng() * opciones[v].length);
      if (nueva === cur[v]) continue;
      const antes = costeVar(v, cur), previa = cur[v];
      cur[v] = nueva;
      const delta = costeVar(v, cur) - antes;
      if (delta <= 0 || rng() < Math.exp(-delta / T)) {
        cActual += delta;
        if (cActual < mejor.c - 1e-9) mejor = { c: cActual, cur: { ...cur } };
      } else cur[v] = previa;
    }
  }
  const eleccion = mejor.cur;
  const lado = Object.fromEntries(variables.map((v) => [v, opciones[v][eleccion[v]].lado]));

  const estructuras = {};
  for (const id of idsUsados) {
    const op = opcionDe(id, eleccion);
    const l = op.lado, pt = op.pt;
    const p = cuantizar(sobre(pt)), n = unit(pt.n);
    const vis = vistaDe(id, l, pt, true);
    const fr = aFraccion(p).map((v) => Math.min(1, Math.max(0, redondear(v)))); // el esquema exige de 0 a 1
    estructuras[id] = { ancla: { x: fr[0], y: fr[1], z: fr[2] }, lado: l, normal: n.map((v) => redondear(v, 2)), vista: vis.vista, nota: vis.nota, p, desc: op.desc };
  }
  // Ancla del lado derecho para las piezas del catálogo (ubicación sin ancla del contenido).
  const piezas = Object.fromEntries(PIEZAS_CATALOGO.map((id) => {
    const pt = id === 'sinfisis' ? L.sinfisis : L.derecha[clave(id)]; // regla base del lado derecho
    const f = aFraccion(sobre(pt)).map((v) => Math.min(1, Math.max(0, redondear(v))));
    return [id, { x: f[0], y: f[1], z: f[2] }];
  }));
  return { m, A, L, actividades, idsUsados, estructuras, piezas, lado: eleccion, coste: mejor.c, pos };
}

// --- Generación de los destinos --------------------------------------------------------------------------------
const fmt = (n) => (Object.is(n, -0) ? '0' : String(n));
function bloqueTs(r) {
  const filas = Object.keys(r.estructuras).sort().map((id) => {
    const e = r.estructuras[id];
    return `  ${id}: {\n    ancla: { x: ${fmt(e.ancla.x)}, y: ${fmt(e.ancla.y)}, z: ${fmt(e.ancla.z)} },\n    lado: '${e.lado}',\n    normal: [${e.normal.map(fmt).join(', ')}],\n    vista: '${e.vista}',\n  },`;
  });
  const piezas = Object.entries(r.piezas).map(([id, a]) => `  ${id}: { x: ${fmt(a.x)}, y: ${fmt(a.y)}, z: ${fmt(a.z)} },`);
  return `// <anclas-mandibula:inicio>
// GENERADO por tools/anclas/calcular_anclas.mjs a partir de la malla real. No editar a mano: se vuelve a
// generar con \`node tools/anclas/calcular_anclas.mjs --escribir\` (método en docs/anclas-mandibula.md).

/**
 * Cada estructura de la mandíbula que el contenido pide por ancla, con su punto SOBRE la superficie del hueso
 * (unos 0,6 mm por fuera), en coordenadas de ancla (ver \`AnclaNodo\`).
 *  - \`lado\`: en qué hemimandíbula está el punto. Las estructuras pares se reparten entre las dos para que los
 *    números no se amontonen en la vista inicial; \`medio\` es la línea media.
 *  - \`normal\`: la normal de la superficie en el punto (hacia fuera del hueso), para saber si mira a la cámara.
 *  - \`vista\`: la vista con nombre desde la que se ve el punto sin que otra parte del hueso o un diente lo tape.
 *    La escena la usa al enfocar el nodo cuando el contenido no fija una \`camara\`.
 */
export interface EstructuraMandibula {
  ancla: AnclaNodo;
  lado: 'derecha' | 'izquierda' | 'medio';
  normal: readonly [number, number, number];
  vista: VistaCamara;
}

export const ESTRUCTURAS_MANDIBULA: Readonly<Record<string, EstructuraMandibula>> = {
${filas.join('\n')}
};

/** Ancla del lado DERECHO de las piezas del catálogo (las usa la escena si el nodo del contenido no lleva ancla). */
export const ANCLAS_PIEZAS_DERECHA: Readonly<Record<string, AnclaNodo>> = {
${piezas.join('\n')}
};
// <anclas-mandibula:fin>`;
}

function bloquePy(r) {
  const filas = Object.keys(r.estructuras).sort().map((id) => {
    const a = r.estructuras[id].ancla;
    return `    "${id}": (${fmt(a.x)}, ${fmt(a.y)}, ${fmt(a.z)}),`;
  });
  return `# <anclas-mandibula:inicio>
# GENERADO por tools/anclas/calcular_anclas.mjs desde la malla real; no editar a mano (docs/anclas-mandibula.md).
# Cada punto está sobre la superficie del hueso; las estructuras pares se reparten entre los dos lados.
ANCLAS_MANDIBULA: dict[str, tuple[float, float, float]] = {
${filas.join('\n')}
}
# <anclas-mandibula:fin>`;
}

/** Sustituye lo que hay entre los marcadores; si aún no hay, sustituye el texto \`inicioViejo..finViejo\`. */
function conMarcadores(texto, bloque, migrar) {
  const re = /(?:\/\/|#) <anclas-mandibula:inicio>[\s\S]*?(?:\/\/|#) <anclas-mandibula:fin>/;
  if (re.test(texto)) return texto.replace(re, () => bloque);
  return migrar(texto, bloque);
}

function nuevoNodos3d(r, actual) {
  return conMarcadores(actual, bloqueTs(r), (t, b) => t.replace(/(\/\* -{20,}\n \* Escenas PROCEDURALES)/, `${b}\n\n$1`));
}
function nuevoRecursos(r, actual) {
  return conMarcadores(actual, bloquePy(r), (t, b) => t.replace(/ANCLAS_MANDIBULA: dict\[str, tuple\[float, float, float\]\] = \{[\s\S]*?\n\}\n/, `${b}\n`));
}

/** Sustituye el `ancla` de cada nodo (por id) sin tocar nada más del archivo. Solo dentro de actividades de la mandíbula. */
function nuevoContenido(r, texto) {
  const re = /("id": "([a-z_0-9]+)",(?:(?!"id":)[\s\S])*?"ancla": \{\s*"x": )(-?[0-9.]+)(,\s*"y": )(-?[0-9.]+)(,\s*"z": )(-?[0-9.]+)/g;
  return texto.replace(re, (todo, cab, id, x, s1, y, s2, z) => {
    const e = r.estructuras[id];
    if (!e) return todo;
    return `${cab}${fmt(e.ancla.x)}${s1}${fmt(e.ancla.y)}${s2}${fmt(e.ancla.z)}`;
  });
}

// --- Informe ---------------------------------------------------------------------------------------------------
function informe(r) {
  const l = [];
  l.push(`Malla: ${r.m.nt} triángulos, ${r.m.nv} vértices, radio original ${r.m.radioOriginal.toFixed(2)} mm (1 unidad del modelo).`);
  l.push(`Caja: min ${r.m.caja.min.map((v) => v.toFixed(4))} max ${r.m.caja.max.map((v) => v.toFixed(4))}`);
  l.push(`Coste de solapamiento en la vista inicial: ${r.coste.toFixed(1)} (0 = ningún par de números a menos de 44 px).`);
  l.push('\nid'.padEnd(28) + 'lado'.padEnd(11) + 'ancla (x, y, z)'.padEnd(26) + 'vista'.padEnd(20) + 'nota'.padEnd(12) + 'variante');
  for (const id of Object.keys(r.estructuras).sort()) {
    const e = r.estructuras[id];
    l.push(id.padEnd(27) + e.lado.padEnd(11) + `${e.ancla.x}, ${e.ancla.y}, ${e.ancla.z}`.padEnd(26) + e.vista.padEnd(20) + e.nota.padEnd(12) + e.desc);
  }
  if (process.env.ANCLAS_DEPURAR) {
    for (const act of r.actividades) {
      l.push(`\nPosiciones ${act.modulo} (móvil ${LIENZOS[0].join('x')}):`);
      for (const id of act.ids) { const q = r.pos(id, r.lado)[0]; l.push(`  ${id.padEnd(28)} ${q[0].toFixed(0).padStart(4)} ${q[1].toFixed(0).padStart(4)}`); }
    }
  }
  l.push('\nSeparación mínima entre números (px) por actividad, en la vista inicial:');
  for (const act of r.actividades) {
    const ids = act.ids;
    const res = LIENZOS.map(([W, H], k) => {
      let mn = Infinity, par = '';
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const a = r.pos(ids[i], r.lado), b = r.pos(ids[j], r.lado); if (clave2(ids[i]) === clave2(ids[j])) continue;
        const d = Math.hypot(a[k][0] - b[k][0], a[k][1] - b[k][1]); if (d < mn) { mn = d; par = `${ids[i]}/${ids[j]}`; }
      }
      return `${W}x${H}: ${mn.toFixed(0)} (${par})`;
    });
    l.push(`  ${act.modulo}: ${res.join('   ')}`);
  }
  return l.join('\n');
}
const clave2 = (id) => ALIAS[id] ?? id;

// --- PNG de inspección -----------------------------------------------------------------------------------------
function guardarPng(r, dir) {
  mkdirSync(dir, { recursive: true });
  const ids = Object.keys(r.estructuras).sort();
  const vistas = { frontal: [[0, 0.2, 1], [0, 1, 0]], oblicua: [[-0.6, 0.5, 0.6], [0, 1, 0]], lateral_derecha: [[-1, 0.2, 0], [0, 1, 0]], posterior: [[0, 0.5, -1], [0, 1, 0]], superior: [[0, 1, 0], [0, 0, -1]] };
  for (const [nombre, [dir3, arriba]] of Object.entries(vistas)) {
    const puntos = ids.map((id) => ({ p: r.estructuras[id].p, color: [220, 30, 30], r: 4 }));
    const out = renderizar(r.m, { dir: dir3, arriba, color: (t) => (r.A.hueso.includes(t) || true ? [200, 190, 170] : null), escala: 1.7, puntos, w: 1000, h: 800 });
    const nrm = (v) => { const q = Math.hypot(...v); return v.map((a) => a / q); };
    const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const d = nrm(dir3), der = nrm(cr(arriba, d)), up = cr(d, der), S = (800 * 1.7) / 2;
    ids.forEach((id, i) => { const p = r.estructuras[id].p; dibujarNumero(out.buf, out.w, out.h, Math.round(500 + dot(p, der) * S) + 6, Math.round(400 - dot(p, up) * S) - 14, i + 1, [0, 0, 0], 3); });
    escribirPng(join(dir, `anclas_${nombre}.png`), out.w, out.h, out.buf);
  }
  writeFileSync(join(dir, 'leyenda.txt'), ids.map((id, i) => `${i + 1} = ${id}`).join('\n') + '\n');
}

// --- Programa principal ----------------------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  const escribir = args.includes('--escribir'), comprobar = args.includes('--comprobar');
  const png = args.find((a) => a.startsWith('--png='))?.slice(6);
  const r = calcular();
  console.log(informe(r));
  if (png) guardarPng(r, resolve(png));

  const destinos = [
    [RUTA_NODOS3D, (t) => nuevoNodos3d(r, t)],
    [RUTA_RECURSOS, (t) => nuevoRecursos(r, t)],
    ...readdirSync(DIR_MODULOS).sort().map((d) => join(DIR_MODULOS, d, 'content.json')).filter(existsSync).map((f) => [f, (t) => nuevoContenido(r, t)]),
  ];
  let difieren = 0;
  for (const [ruta, f] of destinos) {
    const antes = readFileSync(ruta, 'utf8'), despues = f(antes);
    if (antes === despues) continue;
    difieren++;
    console.log(`${escribir ? 'escribe' : 'difiere'}: ${ruta.replace(RAIZ, '.')}`);
    if (escribir) writeFileSync(ruta, despues);
  }
  if (comprobar && difieren) { console.error(`\n${difieren} destino(s) no coinciden con lo calculado. Ejecuta con --escribir.`); process.exit(1); }
  if (!escribir && !comprobar) console.log(`\n(sin --escribir no se modifica nada; ${difieren} destino(s) cambiarían)`);
}

main();
