import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { BloqueCallout as TipoCallout, BloqueImagen as TipoImagen } from '@/content/schema';
import { ETIQUETA_VARIANTE_CALLOUT, VARIANTES_CALLOUT } from '@/content/schema';
import BloqueCallout from './BloqueCallout.vue';
import BloqueImagen from './BloqueImagen.vue';
import BloqueTabla from './BloqueTabla.vue';
import TextoRico from './TextoRico.vue';
import { EVENTO_GLOSARIO, interceptarEnlaceGlosario } from './glosario';

describe('BloqueCallout', () => {
  it.each(VARIANTES_CALLOUT)('la variante %s lleva icono y etiqueta, no solo color', (variante) => {
    const bloque = {
      tipo: 'callout',
      id: `c_${variante}`,
      variante,
      markdown: 'Texto con **énfasis**.',
    } as TipoCallout;
    const wrapper = mount(BloqueCallout, { props: { bloque } });
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('p').text()).toBe(ETIQUETA_VARIANTE_CALLOUT[variante]);
    expect(wrapper.attributes('data-variante')).toBe(variante);
    expect(wrapper.find('strong').text()).toBe('énfasis');
  });

  it('con título propio antepone la etiqueta de la variante', () => {
    const bloque = {
      tipo: 'callout',
      id: 'c_x',
      variante: 'atencion',
      titulo: 'No confundir',
      markdown: 'Texto de ejemplo para el aviso.',
    } as TipoCallout;
    const wrapper = mount(BloqueCallout, { props: { bloque } });
    expect(wrapper.get('p').text()).toBe(`${ETIQUETA_VARIANTE_CALLOUT.atencion}: No confundir`);
  });
});

describe('BloqueImagen', () => {
  const bloque = {
    tipo: 'imagen',
    id: 'i_x',
    src: '/images/x.png',
    alt: 'Corte de un hueso largo con sus capas',
    pie: 'Corte **longitudinal**.',
    credito: 'Autor de prueba',
    ancho: 800,
    alto: 600,
  } as TipoImagen;

  it('usa el alt obligatorio, el pie y el crédito', () => {
    const wrapper = mount(BloqueImagen, { props: { bloque } });
    expect(wrapper.get('img').attributes('alt')).toBe(bloque.alt);
    expect(wrapper.get('img').attributes('loading')).toBe('lazy');
    expect(wrapper.get('figcaption').text()).toContain('Corte longitudinal');
    expect(wrapper.get('figcaption').text()).toContain('Crédito: Autor de prueba');
  });

  it('con figura (versión realista del dibujo) muestra la figura y no el SVG', () => {
    const wrapper = mount(BloqueImagen, {
      props: { bloque: { ...bloque, src: '/images/m1/x.svg', figura: '/images/m1/x_figura.webp' } },
    });
    expect(wrapper.get('img').attributes('src')).toBe('/images/m1/x_figura.webp');
  });

  it('si la imagen no carga muestra el texto alternativo en vez de un hueco', async () => {
    const wrapper = mount(BloqueImagen, { props: { bloque } });
    await wrapper.get('img').trigger('error');
    const caida = wrapper.get('[data-testid="imagen-caida"]');
    expect(caida.attributes('role')).toBe('img');
    expect(caida.attributes('aria-label')).toBe(bloque.alt);
    expect(caida.text()).toContain(bloque.alt);
  });
});

describe('BloqueTabla', () => {
  const bloque = {
    tipo: 'tabla',
    id: 'tb_x',
    titulo: 'Compacto frente a esponjoso',
    encabezado_criterio: 'Criterio',
    columnas: ['Compacto', 'Esponjoso'],
    filas: [
      { criterio: 'Densidad', celdas: ['Alta', 'Baja'] },
      { criterio: 'Ubicación', celdas: ['Diáfisis', 'Epífisis'] },
    ],
  } as never;

  it('ofrece una tabla real y una versión apilada con el mismo contenido', () => {
    const wrapper = mount(BloqueTabla, { props: { bloque } });
    const ancha = wrapper.get('[data-testid="tabla-ancha"]');
    expect(ancha.classes()).toContain('overflow-x-auto');
    expect(ancha.findAll('thead th')).toHaveLength(3);
    expect(ancha.findAll('tbody tr')).toHaveLength(2);
    expect(ancha.findAll('tbody th[scope="row"]').map((t) => t.text())).toEqual([
      'Densidad',
      'Ubicación',
    ]);
    const tarjetas = wrapper.findAll('[data-testid="tabla-apilada"] > li');
    expect(tarjetas).toHaveLength(2);
    expect(tarjetas[1]!.text()).toContain('Esponjoso');
    expect(tarjetas[1]!.text()).toContain('Baja');
    expect(tarjetas[1]!.text()).toContain('Epífisis');
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe('titulo-tb_x');
  });
});

describe('TextoRico y protocolo del glosario', () => {
  it('convierte el enlace de glosario en un evento y no navega', () => {
    const wrapper = mount(TextoRico, {
      props: { texto: 'El [osteoblasto](glosario:osteoblasto) forma hueso.' },
      attachTo: document.body,
    });
    const recibidos: string[] = [];
    document.addEventListener(EVENTO_GLOSARIO, (e) =>
      recibidos.push((e as CustomEvent<{ id: string }>).detail.id),
    );
    const enlace = wrapper.get('a[data-glosario]');
    expect(enlace.attributes('aria-haspopup')).toBe('dialog');
    const clic = new MouseEvent('click', { bubbles: true, cancelable: true });
    enlace.element.dispatchEvent(clic);
    expect(clic.defaultPrevented).toBe(true);
    expect(recibidos).toEqual(['osteoblasto']);
    wrapper.unmount();
  });

  it('no intercepta enlaces normales', () => {
    const a = document.createElement('a');
    a.href = 'https://ejemplo.org';
    document.body.append(a);
    const clic = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.addEventListener('click', (e) => {
      expect(interceptarEnlaceGlosario(e)).toBe(false);
    });
    a.dispatchEvent(clic);
    expect(clic.defaultPrevented).toBe(false);
    a.remove();
  });

  it('no ejecuta HTML crudo del contenido', () => {
    const wrapper = mount(TextoRico, {
      props: { texto: 'Hola <img src=x onerror="alert(1)"> <script>alert(2)</script>' },
    });
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('script').exists()).toBe(false);
  });
});
