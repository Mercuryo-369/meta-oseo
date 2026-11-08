<script setup lang="ts">
/**
 * Portada del estudiante (diseño del 2026-11-07): la barra lateral con el saludo, el progreso y la ruta
 * de aprendizaje, y la mandíbula 3D con los seis módulos (`MandibulaModulos`). Aquí solo se añaden los
 * avisos (vista de docente, error de carga) y el enlace «continuar» para lectores de pantalla.
 */
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { Eye } from '@lucide/vue';
import MandibulaModulos from '@/components/inicio/MandibulaModulos.vue';
import { useAccesoModulos } from '@/components/modulo/useAccesoModulos';
import { usePasosModulos } from '@/components/modulo/usePasosModulos';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { useContextoStore } from '@/stores/contextoPedagogico';
import { useProgresoStore } from '@/stores/progreso';

const auth = useAuthStore();
const progreso = useProgresoStore();
const contexto = useContextoStore();
const { esDocente } = useAccesoModulos();
const { continuar } = usePasosModulos();

const nombre = computed(() => auth.usuario?.nombre ?? '');

onMounted(() => {
  contexto.setSeccion('inicio');
  void progreso.load();
});
</script>

<template>
  <!-- El padding inferior en móvil deja el final por encima del botón flotante del mentor. -->
  <div
    class="w-full px-4 pt-4 pb-[max(7rem,calc(var(--area-segura-abajo)+6rem))] md:px-6 lg:pt-3 lg:pb-3"
  >
    <section aria-labelledby="titulo-inicio" class="relative" data-testid="portada-inicio">
      <MandibulaModulos :nombre="nombre">
        <template #antes>
          <p
            v-if="esDocente"
            class="flex items-start gap-2 rounded-2xl bg-white/10 p-3 text-xs text-white/85 ring-1 ring-white/15"
            role="note"
            data-testid="nota-docente"
          >
            <Eye class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>Vista de docente.</strong> Puedes abrir los seis módulos completos. Mientras
              revisas no se guarda avance, puntaje ni tiempo.
            </span>
          </p>
          <p
            v-if="progreso.error"
            role="status"
            class="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/10 p-3 text-xs text-white/85 ring-1 ring-white/15"
          >
            <span>{{ progreso.error }}</span>
            <Button variant="outline" size="sm" @click="progreso.load({ force: true })">
              Reintentar
            </Button>
          </p>
        </template>
      </MandibulaModulos>
      <RouterLink
        v-if="continuar"
        :to="continuar.to"
        class="sr-only focus:not-sr-only"
        :aria-label="continuar.texto"
        data-testid="continuar-inicio"
      >
        {{ continuar.texto }}
      </RouterLink>
    </section>
  </div>
</template>
