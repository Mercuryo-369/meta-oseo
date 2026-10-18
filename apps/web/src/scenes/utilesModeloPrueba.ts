/** Utilidades de las pruebas de los modelos construidos por código (solo las importan los `*.test.ts`). */
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import type { Modelo3d } from '@/content/nodos3d';
import { useModeloExploracion } from './useModeloExploracion';
import type { ModeloExploracion } from './useModeloExploracion';

/** Monta un componente mínimo con `useModeloExploracion` para el modelo y devuelve su estado. */
export function montarModeloPorCodigo(modelo: Modelo3d): ModeloExploracion {
  let resultado: ModeloExploracion | null = null;
  mount(
    defineComponent({
      setup() {
        resultado = useModeloExploracion({ modelo, nombre: 'prueba', aspecto: () => 1.5 });
        return () => h('div');
      },
    }),
  );
  return resultado!;
}
