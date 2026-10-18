/**
 * Recorrido de los seis módulos para las portadas (inicio y mapa 3D de la mandíbula): estado de cada
 * módulo (la misma regla que las tarjetas y el menú circular, `estadoDeTarjeta`), el módulo que toca
 * estudiar y adónde lleva la flecha de «continuar».
 */
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { MODULOS } from '@/data/modulos';
import type { Modulo } from '@/data/modulos';
import { useProgresoStore } from '@/stores/progreso';
import { estadoDeTarjeta, textoEstadoTarjeta } from './identidad';
import type { EstadoTarjeta } from './identidad';
import { useAccesoModulos } from './useAccesoModulos';

/** Distintivo de un paso: completado, bloqueado o ninguno. */
export type MarcaPaso = 'completada' | 'bloqueada' | 'normal';

export interface PasoModulo {
  m: Modulo;
  marca: MarcaPaso;
  /** Estado en texto (para lectores de pantalla y títulos). */
  etiqueta: string;
  /** Es el módulo que toca estudiar. */
  actual: boolean;
}

export interface DestinoContinuar {
  to: RouteLocationRaw;
  texto: string;
}

export function usePasosModulos() {
  const progreso = useProgresoStore();
  const { bloqueoSecuencial } = useAccesoModulos();

  const completados = computed(() => progreso.modulosCompletados.length);
  const recorridoCompleto = computed(() => completados.value >= MODULOS.length);

  /** Módulos con avance guardado (sección actual o tiempo) y sin completar. */
  const enCurso = computed(() =>
    progreso.modulos
      .filter((m) => !m.completado && (m.seccion_actual !== null || m.tiempo_total_seg > 0))
      .map((m) => m.modulo),
  );
  /** Mientras llega el progreso no se muestra un estado que luego cambiaría (parpadeo del candado). */
  const cargandoProgreso = computed(() => progreso.loading && !progreso.loaded);

  function estadoDe(numero: number): EstadoTarjeta {
    return estadoDeTarjeta(numero, {
      completados: progreso.modulosCompletados,
      enCurso: enCurso.value,
      bloqueoSecuencial: bloqueoSecuencial.value,
    });
  }

  /** Módulo que toca estudiar: el primero en curso o, si no hay, el primero abierto sin completar. */
  const siguiente = computed<Modulo | null>(() => {
    if (cargandoProgreso.value) return null;
    const estados = MODULOS.map((m) => ({ m, e: estadoDe(m.numero) }));
    return (
      estados.find((x) => x.e === 'en_curso')?.m ??
      estados.find((x) => x.e === 'disponible')?.m ??
      null
    );
  });

  /** Un paso por módulo, con el mismo estado que su tarjeta. */
  const pasos = computed<PasoModulo[]>(() =>
    MODULOS.map((m) => {
      const e: EstadoTarjeta = cargandoProgreso.value ? 'disponible' : estadoDe(m.numero);
      const marca: MarcaPaso =
        e === 'completado' ? 'completada' : e === 'bloqueado' ? 'bloqueada' : 'normal';
      return {
        m,
        marca,
        etiqueta: textoEstadoTarjeta(e, m.numero),
        actual: siguiente.value?.numero === m.numero,
      };
    }),
  );

  /** Destino y texto de la flecha de «continuar». */
  const continuar = computed<DestinoContinuar | null>(() => {
    const m = siguiente.value;
    if (m) {
      const verbo = estadoDe(m.numero) === 'en_curso' ? 'Continuar' : 'Empezar';
      return {
        to: { name: 'modulo', params: { n: m.numero } },
        texto: `${verbo}: Módulo ${m.numero}, ${m.titulo}`,
      };
    }
    if (recorridoCompleto.value) {
      return { to: { name: 'certificado' }, texto: 'Ver mi certificado' };
    }
    return null;
  });

  return {
    completados,
    recorridoCompleto,
    cargandoProgreso,
    estadoDe,
    siguiente,
    pasos,
    continuar,
  };
}
