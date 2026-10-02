/**
 * Rutas de la SPA. Todas las vistas se cargan de forma perezosa: la pantalla de acceso no
 * arrastra el shell, ni el shell arrastra Three.js (solo /demo-mandibula lo carga).
 *
 * Nombres de ruta en snake_case español (regla del proyecto); las rutas visibles en URL
 * mantienen el formato acordado (/modulo/3, /demo-mandibula).
 */
import { watch } from 'vue';
import type { Router, RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { guardarSesion } from './guard';
import { guardarModulo } from './guardModulo';

declare module 'vue-router' {
  interface RouteMeta {
    /** Ruta accesible sin sesión. */
    publica?: boolean;
    /** Título de la pestaña y de la pantalla (sin el nombre de la aplicación). */
    titulo?: string;
  }
}

export const NOMBRE_APP = 'Metabolismo óseo · OVA';

export const rutas: RouteRecordRaw[] = [
  {
    path: '/acceso',
    name: 'acceso',
    component: () => import('@/views/AccesoView.vue'),
    meta: { publica: true, titulo: 'Ingresar' },
  },
  {
    // Layout de las rutas autenticadas: menú, HUD y mentor alrededor de <RouterView/>.
    path: '/',
    component: () => import('@/components/AppShell.vue'),
    children: [
      {
        path: '',
        name: 'inicio',
        component: () => import('@/views/HomeView.vue'),
        meta: { titulo: 'Inicio' },
      },
      {
        // El patrón ([1-6]) deja que /modulo/7 caiga en el 404 sin validar a mano.
        path: 'modulo/:n([1-6])',
        name: 'modulo',
        component: () => import('@/views/ModuloView.vue'),
        props: (route) => ({ n: Number(route.params.n) }),
        meta: { titulo: 'Módulo' },
      },
      {
        // Panel de seguimiento de la cohorte. Solo el rol docente ve los datos: la propia vista
        // muestra "acceso solo para docentes" a un estudiante y no llama al panel.
        path: 'docente',
        name: 'docente',
        component: () => import('@/views/DocenteView.vue'),
        meta: { titulo: 'Panel del docente' },
      },
      {
        path: 'demo-mandibula',
        name: 'demo_mandibula',
        component: () => import('@/views/DemoMandibulaView.vue'),
        meta: { titulo: 'Demo de mandíbula 3D' },
      },
      {
        path: 'certificado',
        name: 'certificado',
        component: () => import('@/views/CertificadoView.vue'),
        meta: { titulo: 'Mi certificado' },
      },
      {
        path: 'logros',
        name: 'logros',
        component: () => import('@/views/LogrosView.vue'),
        meta: { titulo: 'Mis logros' },
      },
    ],
  },
  {
    // Verificación pública de certificados: la abre un tercero desde el QR o la URL del PDF, sin
    // sesión y sin AppShell. Sin código muestra el formulario para escribirlo.
    path: '/verify/:codigo?',
    name: 'verificar',
    component: () => import('@/views/VerificarView.vue'),
    meta: { publica: true, titulo: 'Verificar certificado' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'no_encontrado',
    component: () => import('@/views/NoEncontradoView.vue'),
    meta: { publica: true, titulo: 'Página no encontrada' },
  },
];

export function crearRouter(history = createWebHistory()): Router {
  const router = createRouter({
    history,
    routes: rutas,
    // Un cambio solo de query en la misma ruta (la sección de un módulo, `?s=`) lo maneja la página:
    // mueve el foco y el desplazamiento al título de la sección.
    scrollBehavior: (to, from, guardada) =>
      guardada ?? (to.path === from.path ? false : { top: 0 }),
  });
  router.beforeEach(guardarSesion);
  router.beforeEach(guardarModulo);
  router.afterEach((to) => {
    const titulo = to.meta.titulo;
    document.title = titulo ? `${titulo} · ${NOMBRE_APP}` : NOMBRE_APP;
  });
  return router;
}

/**
 * Si la sesión se cierra (401 de la API, botón de salir), lleva a /acceso desde cualquier
 * ruta protegida. Requiere que Pinia ya esté instalada.
 */
export function vigilarSesion(router: Router): () => void {
  const auth = useAuthStore();
  return watch(
    () => auth.isAuthenticated,
    (autenticado) => {
      if (!autenticado && !router.currentRoute.value.meta.publica) {
        void router.replace({ name: 'acceso' });
      }
    },
  );
}

export const router = crearRouter();
