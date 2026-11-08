<script setup lang="ts">
/**
 * Menú de la cuenta (hoja lateral): cabecera azul con la inicial, el nombre, el rol y el nivel, con el
 * puntaje y los módulos completados; después el selector de nivel, los accesos a logros y certificado
 * y el cierre de sesión. Se abre desde «Mi cuenta» (cabecera) o «Configuración» (portada). Estilo de la
 * portada del 2026-11-07.
 */
import { computed, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { Award, ChevronRight, LogOut, Settings, Trophy, UserRound } from '@lucide/vue';
import { cerrarMentor } from '@/ai/explicame';
import { usePasosModulos } from '@/components/modulo/usePasosModulos';
import SelectorNivel from '@/components/nivel/SelectorNivel.vue';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MODULOS } from '@/data/modulos';
import { useAuthStore } from '@/stores/auth';
import { useProgresoStore } from '@/stores/progreso';

/** `cuenta`: botón «Mi cuenta» de la cabecera; `configuracion`: botón «Configuración» de la portada. */
withDefaults(defineProps<{ variante?: 'cuenta' | 'configuracion' }>(), { variante: 'cuenta' });

const auth = useAuthStore();
const progreso = useProgresoStore();
const router = useRouter();
const { completados } = usePasosModulos();
const abierto = ref(false);
// Al abrir el menú se cierra el mentor: si no, su panel queda encima de esta hoja sin poder usarse.
watch(abierto, (valor) => {
  if (valor) cerrarMentor();
});

const nombreCompleto = computed(() =>
  auth.usuario ? `${auth.usuario.nombre} ${auth.usuario.apellido}` : 'Tu cuenta',
);
const inicial = computed(() => (auth.usuario?.nombre.trim()[0] ?? '?').toUpperCase());
const rol = computed(() => (auth.usuario?.rol === 'docente' ? 'Docente' : 'Estudiante'));
const nivel = computed(() => (auth.usuario?.nivel === 'posgrado' ? 'Posgrado' : 'Pregrado'));

async function salir(): Promise<void> {
  abierto.value = false;
  auth.logout();
  await router.replace({ name: 'acceso' });
}
</script>

<template>
  <Sheet v-model:open="abierto">
    <SheetTrigger as-child>
      <Button
        v-if="variante === 'configuracion'"
        variant="outline"
        class="rounded-full"
        title="Configuración: nivel, logros y certificado"
        data-testid="menu-configuracion"
      >
        <Settings aria-hidden="true" />
        Configuración
      </Button>
      <Button
        v-else
        variant="ghost"
        class="shrink-0 px-2 sm:px-3"
        :title="`Tu cuenta: ${nombreCompleto}`"
        data-testid="menu-cuenta"
      >
        <UserRound aria-hidden="true" />
        <span class="sr-only sm:not-sr-only">Mi cuenta</span>
      </Button>
    </SheetTrigger>

    <SheetContent side="right" class="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
      <!-- Cabecera azul, como la barra lateral de la portada -->
      <div class="cuenta-cabecera px-6 pt-8 pb-6 text-white">
        <div class="flex items-center gap-4">
          <span
            class="grid size-14 shrink-0 place-items-center rounded-full bg-white/20 text-2xl font-bold ring-2 ring-white/40"
            aria-hidden="true"
          >
            {{ inicial }}
          </span>
          <div class="min-w-0">
            <SheetTitle class="truncate text-xl font-bold text-white">{{
              nombreCompleto
            }}</SheetTitle>
            <SheetDescription class="text-sm text-white/75">
              {{ rol }} · {{ nivel }}
            </SheetDescription>
          </div>
        </div>
        <dl class="mt-5 grid grid-cols-2 gap-3">
          <div class="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
            <dt class="text-xs text-white/75">Puntos</dt>
            <dd class="text-xl font-bold tabular-nums">{{ progreso.puntajeTotal }}</dd>
          </div>
          <div class="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
            <dt class="text-xs text-white/75">Módulos completados</dt>
            <dd class="text-xl font-bold tabular-nums">
              {{ completados }} de {{ MODULOS.length }}
            </dd>
          </div>
        </dl>
      </div>

      <div class="flex flex-1 flex-col gap-6 px-6 py-6">
        <SelectorNivel />

        <section aria-labelledby="titulo-reconocimiento-menu">
          <h2 id="titulo-reconocimiento-menu" class="text-lg font-semibold">Tu reconocimiento</h2>
          <ul role="list" class="mt-2 grid gap-2">
            <li>
              <RouterLink
                :to="{ name: 'logros' }"
                class="bg-card hover:border-primary focus-visible:border-primary flex items-center gap-3 rounded-2xl border p-3 transition-colors outline-none"
                data-testid="enlace-logros"
                @click="abierto = false"
              >
                <span
                  class="bg-eosina/15 text-eosina grid size-10 shrink-0 place-items-center rounded-full"
                  aria-hidden="true"
                >
                  <Trophy class="size-5" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold">Mis logros</span>
                  <span class="text-muted-foreground block text-xs">
                    Los que ya tienes y cuál es el siguiente.
                  </span>
                </span>
                <ChevronRight class="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
              </RouterLink>
            </li>
            <li>
              <RouterLink
                :to="{ name: 'certificado' }"
                class="bg-card hover:border-primary focus-visible:border-primary flex items-center gap-3 rounded-2xl border p-3 transition-colors outline-none"
                data-testid="enlace-certificado"
                @click="abierto = false"
              >
                <span
                  class="bg-eosina/15 text-eosina grid size-10 shrink-0 place-items-center rounded-full"
                  aria-hidden="true"
                >
                  <Award class="size-5" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold">Mi certificado</span>
                  <span class="text-muted-foreground block text-xs">
                    Se obtiene al completar los seis módulos con el puntaje mínimo.
                  </span>
                </span>
                <ChevronRight class="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
              </RouterLink>
            </li>
          </ul>
        </section>

        <div class="mt-auto border-t pt-4">
          <Button variant="outline" class="w-full rounded-full" @click="salir">
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>

<style scoped>
.cuenta-cabecera {
  background: linear-gradient(165deg, #0b2d5c 0%, #123f7d 60%, #1b4d8f 100%);
}
</style>
