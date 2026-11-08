<script setup lang="ts">
/**
 * Menú de la cuenta en la cabecera (portada minimalista, 2026-11-07): el nivel (pregrado o posgrado) y
 * los enlaces a logros y certificado salen de la portada y viven aquí, en una hoja lateral. «Salir»
 * sigue a la vista en la cabecera.
 */
import { ref } from 'vue';
import { Award, Settings, Trophy, UserRound } from '@lucide/vue';
import SelectorNivel from '@/components/nivel/SelectorNivel.vue';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth';

/** `cuenta`: botón «Mi cuenta» de la cabecera; `configuracion`: botón «Configuración» de la portada. */
withDefaults(defineProps<{ variante?: 'cuenta' | 'configuracion' }>(), { variante: 'cuenta' });

const auth = useAuthStore();
const abierto = ref(false);
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
        :title="
          auth.usuario ? `Tu cuenta: ${auth.usuario.nombre} ${auth.usuario.apellido}` : 'Tu cuenta'
        "
        data-testid="menu-cuenta"
      >
        <UserRound aria-hidden="true" />
        <span class="sr-only sm:not-sr-only">Mi cuenta</span>
      </Button>
    </SheetTrigger>
    <SheetContent side="right" class="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-sm">
      <SheetHeader class="text-left">
        <SheetTitle>{{
          auth.usuario ? `${auth.usuario.nombre} ${auth.usuario.apellido}` : 'Tu cuenta'
        }}</SheetTitle>
        <SheetDescription>Tu nivel, tus logros y tu certificado.</SheetDescription>
      </SheetHeader>

      <SelectorNivel />

      <section aria-labelledby="titulo-reconocimiento-menu">
        <h2 id="titulo-reconocimiento-menu" class="text-lg font-semibold">Tu reconocimiento</h2>
        <ul role="list" class="mt-2 grid gap-2">
          <li>
            <RouterLink
              :to="{ name: 'logros' }"
              class="bg-card hover:border-primary focus-visible:border-primary flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2.5 font-semibold transition-colors"
              data-testid="enlace-logros"
              @click="abierto = false"
            >
              <Trophy class="text-eosina size-5 shrink-0" aria-hidden="true" />
              Mis logros
            </RouterLink>
          </li>
          <li>
            <RouterLink
              :to="{ name: 'certificado' }"
              class="bg-card hover:border-primary focus-visible:border-primary flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2.5 font-semibold transition-colors"
              data-testid="enlace-certificado"
              @click="abierto = false"
            >
              <Award class="text-eosina size-5 shrink-0" aria-hidden="true" />
              Mi certificado
            </RouterLink>
          </li>
        </ul>
      </section>
    </SheetContent>
  </Sheet>
</template>
