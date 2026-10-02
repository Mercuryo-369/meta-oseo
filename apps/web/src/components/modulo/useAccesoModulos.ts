/**
 * Reglas de acceso que dependen de quién mira: el bloqueo secuencial de módulos y de secciones
 * (`BLOQUEO_SECUENCIAL`, requisito del briefing para el ESTUDIANTE) y la vista de revisión del
 * docente.
 *
 * El docente que recibe el OVA necesita recorrer los seis módulos completos, así que para el rol
 * `docente` no hay bloqueo de módulos ni de secciones. A cambio, esa vista es de SOLO LECTURA: no
 * registra resultados, puntajes, tiempo ni sección actual en el servidor (no ensucia las
 * estadísticas de la cohorte) y las actividades se abren en modo `revisar` (ver `ModuloView.vue` y
 * `BloqueActividad.vue`).
 *
 * El rol viene de `GET /api/me` (lo decide el servidor); un estudiante no puede activar este
 * comportamiento desde el navegador. Para demos locales sin cuenta docente existe
 * `VITE_BLOQUEO_SECUENCIAL=false` (README): quita el bloqueo, pero guarda el progreso con
 * normalidad.
 */
import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { BLOQUEO_SECUENCIAL } from '@/config';
import type { Rol } from '@/types/api';
import { useAuthStore } from '@/stores/auth';

/** Bloqueo que rige para un rol: el docente nunca queda bloqueado. */
export function bloqueoEfectivo(bloqueoConfigurado: boolean, rol: Rol | undefined): boolean {
  return bloqueoConfigurado && rol !== 'docente';
}

export interface AccesoModulos {
  /** Vista de revisión del docente: todo abierto, solo lectura, sin enviar nada. */
  esDocente: ComputedRef<boolean>;
  /** `BLOQUEO_SECUENCIAL` ya ajustado al rol. */
  bloqueoSecuencial: ComputedRef<boolean>;
}

export function useAccesoModulos(): AccesoModulos {
  const auth = useAuthStore();
  const esDocente = computed(() => auth.usuario?.rol === 'docente');
  const bloqueoSecuencial = computed(() => bloqueoEfectivo(BLOQUEO_SECUENCIAL, auth.usuario?.rol));
  return { esDocente, bloqueoSecuencial };
}
