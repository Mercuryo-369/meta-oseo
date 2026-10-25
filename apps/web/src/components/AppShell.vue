<script setup lang="ts">
/**
 * Layout de las rutas autenticadas. Monta la cabecera (marca, botón «Módulos», HUD, panel docente, salir),
 * el menú de módulos y el panel del mentor alrededor de <RouterView/>:
 *
 *   pantallas estrechas  HUD en la cabecera; el menú se despliega desde la izquierda con el botón
 *                        «Módulos»; mentor = botón flotante abajo a la derecha.
 *   pantallas anchas     menú = barra lateral fija a la izquierda (el contenido deja 17rem libres);
 *                        mentor = panel lateral derecho que se superpone al contenido.
 *
 * CONTRATO CON LOS COMPONENTES HIJOS (no cambiar sin avisar): MenuModulos y MentorPanel se
 * posicionan a sí mismos con `position: fixed`; HudPuntaje es un bloque que rellena el ancho
 * disponible de la cabecera. El shell no necesita cambios cuando esos componentes se
 * reescriban; solo reserva espacio (padding de <main>) para que nada quede tapado de forma
 * permanente.
 */
import { nextTick, onMounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { LayoutDashboard, LogOut } from '@lucide/vue';
import HudPuntaje from '@/components/HudPuntaje.vue';
import BotonModulos from '@/components/navegacion/BotonModulos.vue';
import SelectorTema from '@/components/SelectorTema.vue';
import MenuModulos from '@/components/navegacion/MenuModulos.vue';
import MentorPanel from '@/components/mentor/MentorPanel.vue';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { useProgresoStore } from '@/stores/progreso';

const auth = useAuthStore();
const progreso = useProgresoStore();
const route = useRoute();
const router = useRouter();

// Ruta pública (carpeta public/). Se pasa como valor y no como atributo estático para que el
// compilador de plantillas no la convierta en un import de módulo.
const LOGO = '/favicon.svg';

const contenido = ref<HTMLElement | null>(null);

onMounted(() => {
  // Se pide una sola vez para todo el shell; el store no duplica peticiones concurrentes.
  void progreso.load();
});

// Al cambiar de página el foco pasa al contenido: quien usa teclado o lector de pantalla
// no queda atrapado en el enlace que acaba de activar.
watch(
  () => route.fullPath,
  async () => {
    await nextTick();
    contenido.value?.focus({ preventScroll: true });
  },
);

async function salir(): Promise<void> {
  auth.logout();
  await router.replace({ name: 'acceso' });
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <a href="#contenido" class="saltar-al-contenido">Saltar al contenido</a>

    <header
      class="bg-background/95 sticky top-0 z-30 border-b backdrop-blur"
      style="padding-top: var(--area-segura-arriba)"
    >
      <div
        class="flex min-h-14 w-full items-center gap-2 py-1"
        style="
          padding-left: max(0.75rem, var(--area-segura-izquierda));
          padding-right: max(0.75rem, var(--area-segura-derecha));
        "
      >
        <BotonModulos />

        <RouterLink
          :to="{ name: 'inicio' }"
          class="text-foreground flex min-h-11 shrink-0 items-center gap-2.5 rounded-md pr-1 text-base font-semibold tracking-tight"
          aria-label="Metabolismo óseo, ir al inicio"
        >
          <img :src="LOGO" alt="" class="size-8" width="32" height="32" />
          <span class="hidden sm:inline">Metabolismo óseo</span>
        </RouterLink>

        <div class="min-w-0 flex-1">
          <HudPuntaje />
        </div>

        <!-- Entrada al panel de seguimiento: solo para el rol docente. -->
        <Button
          v-if="auth.usuario?.rol === 'docente'"
          as-child
          variant="ghost"
          class="shrink-0 px-2 sm:px-3"
          title="Panel del docente"
        >
          <RouterLink :to="{ name: 'docente' }" data-testid="enlace-docente">
            <LayoutDashboard aria-hidden="true" />
            <span class="sr-only sm:not-sr-only">Panel docente</span>
          </RouterLink>
        </Button>

        <SelectorTema />

        <Button
          variant="ghost"
          class="shrink-0 px-2 sm:px-3"
          :title="
            auth.usuario ? `Salir (${auth.usuario.nombre} ${auth.usuario.apellido})` : 'Salir'
          "
          @click="salir"
        >
          <LogOut aria-hidden="true" />
          <span class="sr-only sm:not-sr-only">Salir</span>
        </Button>
      </div>
    </header>

    <MenuModulos />

    <!-- El padding inferior evita que el botón flotante del mentor tape el final del contenido en móvil. -->
    <main
      id="contenido"
      ref="contenido"
      tabindex="-1"
      class="flex-1 outline-none"
      style="padding-bottom: max(6rem, calc(var(--area-segura-abajo) + 5rem))"
    >
      <RouterView />
    </main>

    <MentorPanel />
  </div>
</template>
