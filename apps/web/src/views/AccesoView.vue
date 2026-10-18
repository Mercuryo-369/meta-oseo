<script setup lang="ts">
/**
 * Pantalla única de acceso (F1-14): tipo + número de identificación.
 *
 * Flujo: "Continuar" intenta el login. Si el servidor responde 404 `usuario_no_encontrado`
 * se piden nombre y apellido y el botón pasa a "Registrarme" (mismos datos + nombre y
 * apellido en POST /api/auth/register). Se prueba siempre el login primero: así una errata
 * en el número nunca crea una cuenta nueva sin que el estudiante lo vea.
 */
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Loader2 } from '@lucide/vue';
import OsteonaIlustracion from '@/components/OsteonaIlustracion.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ApiError, MENSAJE_SIN_CONEXION } from '@/lib/api';
import type { TipoIdentificacion } from '@/lib/identificacion';
import {
  TIPO_POR_DEFECTO,
  TIPOS_IDENTIFICACION,
  esSoloNumerico,
  validarNombre,
  validarNumero,
} from '@/lib/identificacion';
import SelectorTema from '@/components/SelectorTema.vue';
import { destinoSeguro } from '@/router/guard';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

type Paso = 'identificar' | 'registrar';
type Campo = 'numero' | 'nombre' | 'apellido';

const tipo = ref<TipoIdentificacion>(TIPO_POR_DEFECTO);
const numero = ref('');
const nombre = ref('');
const apellido = ref('');
const paso = ref<Paso>('identificar');
const cargando = ref(false);

/** Error que no pertenece a un campo (red, servidor, límite de intentos). */
const errorGeneral = ref<string | null>(null);
/** Información neutra: "no te encontramos, regístrate" o "ya estabas registrado". */
const aviso = ref<string | null>(null);
const errores = reactive<Record<Campo, string | null>>({
  numero: null,
  nombre: null,
  apellido: null,
});

const IDS: Record<Campo, string> = {
  numero: 'numero-identificacion',
  nombre: 'nombre',
  apellido: 'apellido',
};

const registrando = computed(() => paso.value === 'registrar');
const textoBoton = computed(() => {
  if (cargando.value) return registrando.value ? 'Registrando…' : 'Verificando…';
  return registrando.value ? 'Registrarme' : 'Continuar';
});
const inputmode = computed(() => (esSoloNumerico(tipo.value) ? 'numeric' : 'text'));

function limpiarMensajes(): void {
  errorGeneral.value = null;
  aviso.value = null;
  errores.numero = errores.nombre = errores.apellido = null;
}

async function enfocar(campo: Campo): Promise<void> {
  await nextTick();
  document.getElementById(IDS[campo])?.focus();
}

onMounted(() => {
  void enfocar('numero');
});

// Si cambian el tipo o el número después de pedir nombre y apellido, es otra identificación:
// se vuelve a comprobar con un login (los nombres escritos se conservan).
watch([tipo, numero], () => {
  if (paso.value === 'registrar') {
    paso.value = 'identificar';
    aviso.value = null;
  }
});

function describedBy(campo: Campo): string | undefined {
  return errores[campo] ? `${IDS[campo]}-error` : undefined;
}

/** Valida en cliente con las mismas reglas del contrato. Devuelve los valores limpios o `null`. */
function validar() {
  const n = validarNumero(numero.value);
  errores.numero = n.ok ? null : n.error;
  let nom: ReturnType<typeof validarNombre> | null = null;
  let ape: ReturnType<typeof validarNombre> | null = null;
  if (registrando.value) {
    nom = validarNombre(nombre.value, 'nombre');
    ape = validarNombre(apellido.value, 'apellido');
    errores.nombre = nom.ok ? null : nom.error;
    errores.apellido = ape.ok ? null : ape.error;
  }
  const primerError = (['numero', 'nombre', 'apellido'] as const).find((c) => errores[c]);
  if (primerError) {
    void enfocar(primerError);
    return null;
  }
  return {
    numero: n.ok ? n.valor : '',
    nombre: nom?.ok ? nom.valor : '',
    apellido: ape?.ok ? ape.valor : '',
  };
}

function manejarError(e: unknown): void {
  if (!(e instanceof ApiError)) {
    errorGeneral.value = 'No pudimos completar la acción. Inténtalo de nuevo.';
    return;
  }
  if (e.status === 404 && e.code === 'usuario_no_encontrado' && paso.value === 'identificar') {
    paso.value = 'registrar';
    aviso.value =
      'No encontramos esa identificación. Escribe tu nombre y apellido para registrarte.';
    void enfocar('nombre');
    return;
  }
  if (e.status === 409) {
    paso.value = 'identificar';
    aviso.value = 'Esa identificación ya está registrada. Pulsa Continuar para ingresar.';
    void enfocar('numero');
    return;
  }
  if (e.status === 422) {
    // El servidor rechazó un dato que el cliente aceptó: se muestra junto al campo.
    const usados: Array<[Campo, string]> = [
      ['numero', 'numero_identificacion'],
      ['nombre', 'nombre'],
      ['apellido', 'apellido'],
    ];
    let alguno = false;
    for (const [campo, clave] of usados) {
      if (e.campos[clave]) {
        errores[campo] = 'Revisa este dato: el servidor no lo aceptó.';
        alguno = true;
      }
    }
    if (!alguno) errorGeneral.value = 'Revisa los datos ingresados e inténtalo de nuevo.';
    return;
  }
  if (e.status === 429) {
    errorGeneral.value =
      'Hiciste demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.';
    return;
  }
  if (e.status === 0) {
    errorGeneral.value = MENSAJE_SIN_CONEXION;
    return;
  }
  if (e.status >= 500) {
    errorGeneral.value =
      'El servicio no está disponible por ahora. Inténtalo de nuevo en unos minutos.';
    return;
  }
  errorGeneral.value = 'No pudimos completar la acción. Inténtalo de nuevo.';
}

async function enviar(): Promise<void> {
  if (cargando.value) return;
  limpiarMensajes();
  const datos = validar();
  if (!datos) return;

  cargando.value = true;
  try {
    if (registrando.value) {
      await auth.register({
        nombre: datos.nombre,
        apellido: datos.apellido,
        tipo: tipo.value,
        numero: datos.numero,
      });
    } else {
      await auth.login(tipo.value, datos.numero);
    }
    await router.replace(destinoSeguro(route.query.redirect) ?? '/');
  } catch (e) {
    manejarError(e);
  } finally {
    cargando.value = false;
  }
}
</script>

<template>
  <!-- Cambio de tema también antes de entrar (aquí no hay cabecera). -->
  <div
    class="fixed top-2 right-2 z-10"
    style="margin-top: var(--area-segura-arriba); margin-right: var(--area-segura-derecha)"
  >
    <SelectorTema />
  </div>
  <main
    class="mx-auto grid min-h-dvh w-full max-w-5xl content-center gap-8 px-4 py-8 md:grid-cols-2 md:items-center md:gap-14"
    style="
      padding-top: max(2rem, var(--area-segura-arriba));
      padding-bottom: max(2rem, var(--area-segura-abajo));
    "
  >
    <section class="flex flex-col items-start gap-5 md:gap-7">
      <OsteonaIlustracion class="w-40 shrink-0 md:w-72" />
      <div class="space-y-3">
        <h1 class="text-3xl font-semibold tracking-tight md:text-5xl">Metabolismo óseo</h1>
        <p class="text-muted-foreground max-w-prose text-lg leading-relaxed">
          Un viaje interactivo desde la célula hasta el hueso.
        </p>
      </div>
    </section>

    <section aria-labelledby="titulo-acceso" class="bg-card rounded-xl border p-5 shadow-sm md:p-7">
      <h2 id="titulo-acceso" class="text-xl font-semibold">
        {{ registrando ? 'Crea tu cuenta' : 'Ingresa con tu documento' }}
      </h2>

      <form class="mt-5 space-y-5" novalidate @submit.prevent="enviar">
        <div class="space-y-2">
          <Label for="tipo-identificacion">Tipo de identificación</Label>
          <NativeSelect id="tipo-identificacion" v-model="tipo" name="tipo_identificacion">
            <NativeSelectOption v-for="t in TIPOS_IDENTIFICACION" :key="t.codigo" :value="t.codigo">
              {{ t.etiqueta }} ({{ t.codigo }})
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="space-y-2">
          <Label :for="IDS.numero">Número de identificación</Label>
          <Input
            :id="IDS.numero"
            v-model="numero"
            name="numero_identificacion"
            type="text"
            :inputmode="inputmode"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            enterkeyhint="go"
            :aria-invalid="errores.numero ? 'true' : undefined"
            :aria-describedby="describedBy('numero')"
          />
          <p v-if="errores.numero" :id="`${IDS.numero}-error`" class="text-destructive text-sm">
            {{ errores.numero }}
          </p>
        </div>

        <p
          v-if="aviso"
          role="status"
          class="bg-accent text-accent-foreground rounded-md px-3 py-2 text-sm"
        >
          {{ aviso }}
        </p>

        <template v-if="registrando">
          <div class="space-y-2">
            <Label :for="IDS.nombre">Nombre</Label>
            <Input
              :id="IDS.nombre"
              v-model="nombre"
              name="nombre"
              type="text"
              autocomplete="given-name"
              enterkeyhint="next"
              :aria-invalid="errores.nombre ? 'true' : undefined"
              :aria-describedby="describedBy('nombre')"
            />
            <p v-if="errores.nombre" :id="`${IDS.nombre}-error`" class="text-destructive text-sm">
              {{ errores.nombre }}
            </p>
          </div>

          <div class="space-y-2">
            <Label :for="IDS.apellido">Apellido</Label>
            <Input
              :id="IDS.apellido"
              v-model="apellido"
              name="apellido"
              type="text"
              autocomplete="family-name"
              enterkeyhint="go"
              :aria-invalid="errores.apellido ? 'true' : undefined"
              :aria-describedby="describedBy('apellido')"
            />
            <p
              v-if="errores.apellido"
              :id="`${IDS.apellido}-error`"
              class="text-destructive text-sm"
            >
              {{ errores.apellido }}
            </p>
          </div>
        </template>

        <p v-if="errorGeneral || auth.errorSesion" role="alert" class="text-destructive text-sm">
          {{ errorGeneral ?? auth.errorSesion }}
        </p>

        <Button type="submit" size="lg" class="w-full" :disabled="cargando" :aria-busy="cargando">
          <Loader2
            v-if="cargando"
            class="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {{ textoBoton }}
        </Button>

        <p class="text-muted-foreground text-sm">
          Guardamos tu nombre y documento solo para registrar tu avance y emitir tu certificado.
        </p>
      </form>
    </section>
  </main>
</template>
