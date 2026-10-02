/**
 * Sugerencias de refuerzo (F3-07): los conceptos que conviene repasar según el avance del
 * estudiante. Las calcula el servidor con reglas fijas (`GET /api/mentor/refuerzo`), sin llamar al
 * modelo, así que pedirlas es barato y se puede hacer al abrir el panel o la portada.
 *
 * Un fallo NO se muestra: sin sugerencias las tarjetas no aparecen, y un aviso de error en la
 * portada sería ruido para algo opcional. El error queda en `error` por si una vista lo quiere.
 *
 * - `cargar()` no repite la petición si la última tiene menos de `VIGENCIA_MS`; `{ force: true }`
 *   la fuerza (la portada lo usa: acaba de volver de un módulo).
 * - Al cerrar sesión se vacía todo: nunca se muestran las sugerencias de otra persona.
 * - Las `url` que no son una ruta interna del OVA se descartan (`esRutaInterna`).
 */
import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import type { SugerenciaRefuerzo } from './mentorApi';
import { obtenerRefuerzo } from './mentorApi';

/** Cuánto tiempo se considera vigente una respuesta (ms). */
export const VIGENCIA_MS = 20_000;

/** `/modulo/<n>` con `?s=<seccion>` opcional: los enlaces del refuerzo nunca salen del OVA. */
const RUTA_INTERNA = /^\/modulo\/[1-6](\?s=[a-z0-9_-]{1,64})?$/;

export function esRutaInterna(url: unknown): url is string {
  return typeof url === 'string' && RUTA_INTERNA.test(url);
}

function esSugerenciaValida(item: SugerenciaRefuerzo): boolean {
  return (
    typeof item.concepto === 'string' &&
    item.concepto !== '' &&
    typeof item.motivo === 'string' &&
    esRutaInterna(item.url)
  );
}

export const useRefuerzoStore = defineStore('refuerzo', () => {
  const auth = useAuthStore();

  const sugerencias = ref<SugerenciaRefuerzo[]>([]);
  const cargando = ref(false);
  const error = ref<string | null>(null);
  let ultimaCarga = 0;
  let serie = 0;
  let enCurso: Promise<void> | null = null;

  async function cargar(opciones: { force?: boolean } = {}): Promise<void> {
    if (!auth.token) return;
    if (enCurso) return enCurso;
    if (!opciones.force && ultimaCarga > 0 && Date.now() - ultimaCarga < VIGENCIA_MS) return;
    const miSerie = ++serie;
    cargando.value = true;
    const peticion = (async () => {
      try {
        const res = await obtenerRefuerzo();
        if (miSerie !== serie) return;
        sugerencias.value = Array.isArray(res.sugerencias)
          ? res.sugerencias.filter(esSugerenciaValida)
          : [];
        error.value = null;
        ultimaCarga = Date.now();
      } catch {
        if (miSerie !== serie) return;
        // Se conserva lo que ya había: un fallo momentáneo no debe hacer desaparecer la tarjeta.
        error.value = 'No se pudieron cargar las sugerencias de refuerzo.';
      } finally {
        if (miSerie === serie) {
          cargando.value = false;
          enCurso = null;
        }
      }
    })();
    enCurso = peticion;
    return peticion;
  }

  function reset(): void {
    serie += 1;
    sugerencias.value = [];
    cargando.value = false;
    error.value = null;
    ultimaCarga = 0;
    enCurso = null;
  }

  watch(
    () => auth.token,
    (token) => {
      if (!token) reset();
    },
  );

  return { sugerencias, cargando, error, cargar, reset };
});
