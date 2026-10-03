/**
 * MODO DEMOSTRACIÓN (VITE_MODO_DEMO=true al compilar), para publicar el OVA sin backend.
 *
 * `apiFetchRaw` no llama a la red: este módulo contesta las rutas de la API en memoria. Todo
 * funciona (módulos, actividades, 3D, puntos e insignias de la sesión), pero NADA se guarda:
 * al recargar la página se empieza de cero. El mentor, el certificado y el panel docente
 * responden 503 con un mensaje claro, porque sin servidor no pueden existir.
 */
import type { ModuloProgress, ResultadoActividadFila, Usuario } from '@/types/api';

const USUARIO_DEMO: Usuario = {
  id: 0,
  nombre: 'Visitante',
  apellido: 'Demostración',
  tipo_identificacion: 'CC',
  numero_identificacion: '0000000000',
  nivel: 'pregrado',
  rol: 'estudiante',
  created_at: '2026-01-01T00:00:00Z',
};

const resultados = new Map<string, ResultadoActividadFila>();
const modulos = new Map<number, ModuloProgress>();

export function usuarioDemo(): Usuario {
  return USUARIO_DEMO;
}

function respuesta(status: number, cuerpo: unknown): Response {
  return new Response(status === 204 ? null : JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function noDisponible(): Response {
  return respuesta(503, {
    detail: 'Esta función necesita el servidor y no está disponible en la versión de demostración.',
  });
}

function puntajeTotal(): number {
  let total = 0;
  for (const r of resultados.values()) total += r.mejor_puntaje;
  return total;
}

function progresoModulo(n: number): ModuloProgress {
  return (
    modulos.get(n) ?? {
      modulo: n,
      seccion_actual: null,
      completado: false,
      tiempo_total_seg: 0,
      updated_at: null,
    }
  );
}

function leer(cuerpo: BodyInit | undefined): Record<string, unknown> {
  try {
    return typeof cuerpo === 'string' ? (JSON.parse(cuerpo) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Contesta una petición a la API (ruta sin el prefijo `/api`). */
export function responderDemo(
  path: string,
  metodo: string,
  cuerpo: BodyInit | undefined,
): Response {
  const url = new URL(path, 'http://demo');
  const ruta = url.pathname;
  const ahora = new Date().toISOString();

  if (ruta === '/me' || ruta.startsWith('/auth/')) {
    return respuesta(
      200,
      ruta === '/me' ? USUARIO_DEMO : { access_token: 'demo', usuario: USUARIO_DEMO },
    );
  }
  if (ruta === '/health') return respuesta(200, { status: 'ok', env: 'demo' });
  if (ruta === '/progress' && metodo === 'GET') {
    return respuesta(200, {
      modulos: [...modulos.values()],
      puntaje_total: puntajeTotal(),
      logros: [],
    });
  }
  if (ruta === '/achievements') return respuesta(200, { logros: [] });
  if (ruta === '/activities/results') {
    const n = Number(url.searchParams.get('modulo'));
    return respuesta(200, {
      resultados: [...resultados.values()].filter((r) => !n || r.modulo === n),
    });
  }

  const resultado = /^\/activities\/([^/]+)\/result$/.exec(ruta);
  if (resultado && metodo === 'POST') {
    const id = decodeURIComponent(resultado[1] ?? '');
    const b = leer(cuerpo);
    const previo = resultados.get(id);
    const puntaje = typeof b.puntaje === 'number' ? b.puntaje : 0;
    const fila: ResultadoActividadFila = {
      activity_id: id,
      modulo: Number(b.modulo) || 0,
      tipo: b.tipo as ResultadoActividadFila['tipo'],
      mejor_puntaje: Math.max(previo?.mejor_puntaje ?? 0, puntaje),
      intentos: (previo?.intentos ?? 0) + 1,
      completada: Boolean(previo?.completada) || b.completada !== false,
      ultimo_intento_en: ahora,
    };
    resultados.set(id, fila);
    return respuesta(201, {
      resultado: {
        activity_id: id,
        modulo: fila.modulo,
        tipo: fila.tipo,
        puntaje,
        intentos: fila.intentos,
        completada: fila.completada,
        created_at: ahora,
      },
      puntaje_total: puntajeTotal(),
      logros_nuevos: [],
    });
  }

  const progreso = /^\/progress\/(\d+)$/.exec(ruta);
  if (progreso) {
    const n = Number(progreso[1]);
    const b = leer(cuerpo);
    const previo = progresoModulo(n);
    const nuevo: ModuloProgress = {
      modulo: n,
      seccion_actual:
        typeof b.seccion_actual === 'string' ? b.seccion_actual : previo.seccion_actual,
      completado: previo.completado || b.completado === true,
      tiempo_total_seg: previo.tiempo_total_seg + (Number(b.tiempo_delta_seg) || 0),
      updated_at: ahora,
    };
    if (metodo !== 'GET') modulos.set(n, nuevo);
    return respuesta(200, metodo === 'GET' ? previo : { modulo: nuevo, logros_nuevos: [] });
  }

  return noDisponible();
}
