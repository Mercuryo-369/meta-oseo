import { beforeAll, describe, expect, it, vi } from 'vitest';
import { detenerNodo, entrarNodo, salirNodo } from './animacion';
import { precargarGsap } from './gsapPerezoso';

// GSAP se carga aparte en la aplicación; en estas pruebas se espera a que esté listo.
beforeAll(async () => {
  await precargarGsap();
});

function nodo(): HTMLElement {
  const el = document.createElement('li');
  el.dataset.x = '120';
  el.dataset.y = '-60';
  el.dataset.indice = '1';
  el.dataset.total = '6';
  el.style.left = '98px';
  document.body.appendChild(el);
  return el;
}

describe('animación del menú circular', () => {
  it('con movimiento reducido no anima: avisa al instante y no toca los estilos', () => {
    const el = nodo();
    const hecho = vi.fn();
    entrarNodo(el, hecho, true);
    expect(hecho).toHaveBeenCalledTimes(1);
    salirNodo(el, hecho, true);
    expect(hecho).toHaveBeenCalledTimes(2);
    expect(el.getAttribute('style')).toBe('left: 98px;');
  });

  it('la entrada parte de un desplazamiento, avisa al terminar y deja el estilo limpio', async () => {
    const el = nodo();
    // Un retardo largo deja una ventana amplia en la que el nodo espera en su punto de partida.
    el.dataset.indice = '25';
    const hecho = vi.fn();
    entrarNodo(el, hecho, false);
    // GSAP dibuja el primer fotograma en el siguiente ciclo de su reloj (no de forma síncrona):
    // se espera a verlo en lugar de suponer que ya ocurrió (dependía de la carga de la máquina).
    await vi.waitFor(() => expect(el.style.opacity).toBe('0'), { timeout: 5000 });
    await vi.waitFor(() => expect(hecho).toHaveBeenCalledTimes(1), { timeout: 10_000 });
    // Solo queda lo que pone la plantilla: la posición final no depende de GSAP.
    expect(el.getAttribute('style')).toBe('left: 98px;');
  });

  it('la salida avisa al terminar', async () => {
    const el = nodo();
    const hecho = vi.fn();
    salirNodo(el, hecho, false);
    await vi.waitFor(() => expect(hecho).toHaveBeenCalledTimes(1), { timeout: 10_000 });
  });

  it('detenerNodo cancela la animación y limpia los estilos temporales', async () => {
    const el = nodo();
    const hecho = vi.fn();
    entrarNodo(el, hecho, false);
    detenerNodo(el);
    expect(el.getAttribute('style')).toBe('left: 98px;');
    // Una animación cancelada no debe llamar a `done` después.
    await new Promise((r) => setTimeout(r, 450));
    expect(hecho).not.toHaveBeenCalled();
  });
});
