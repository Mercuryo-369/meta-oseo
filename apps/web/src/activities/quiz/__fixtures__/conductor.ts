/**
 * Conductor de pruebas del quiz: responde a `ActividadQuiz` como lo haría un estudiante (con
 * clics y cambios sobre el DOM, sin tocar el estado interno). Conoce la actividad, así que puede
 * elegir la respuesta correcta o una incorrecta aunque las opciones estén barajadas. Solo lo usan
 * los archivos .test.ts (no entra al build).
 */
import { flushPromises } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import type { ActividadQuiz, Pregunta } from '@/content/schema';

export function preguntaVisible(wrapper: VueWrapper, quiz: ActividadQuiz): Pregunta {
  const id = wrapper.find('article[data-pregunta]').attributes('data-pregunta');
  const pregunta = quiz.config.preguntas.find((p) => p.id === id);
  if (!pregunta) throw new Error(`No hay una pregunta visible (data-pregunta="${id}").`);
  return pregunta;
}

/** El `<input>` de la opción con ese texto (texto plano, tal como se ve). */
export function entradaDeOpcion(wrapper: VueWrapper, texto: string) {
  const etiquetas = wrapper.findAll('label').filter((l) => l.text().includes(texto));
  // Con opciones que empiezan igual ("Colágeno tipo I" y "Colágeno tipo II") la primera etiqueta que
  // CONTIENE el texto puede ser la equivocada: se prefiere la coincidencia exacta y, si no la hay,
  // la etiqueta más corta.
  const exacta = etiquetas.find((l) => l.text().trim() === texto.trim());
  const etiqueta = exacta ?? [...etiquetas].sort((a, b) => a.text().length - b.text().length)[0];
  if (!etiqueta) throw new Error(`No hay una opción con el texto "${texto}".`);
  return etiqueta.find('input');
}

async function marcar(wrapper: VueWrapper, texto: string): Promise<void> {
  await entradaDeOpcion(wrapper, texto).setValue(true);
}

/** Mueve el paso con ese texto hasta la posición `destino` (0 = primera) con los botones. */
export async function moverPaso(
  wrapper: VueWrapper,
  texto: string,
  destino: number,
): Promise<void> {
  for (let vueltas = 0; vueltas < 20; vueltas++) {
    const filas = wrapper.findAll('ol[data-ordenar] > li');
    const actual = filas.findIndex((f) => f.text().includes(texto));
    if (actual < 0) throw new Error(`No hay un paso con el texto "${texto}".`);
    if (actual === destino) return;
    const accion = actual > destino ? 'subir' : 'bajar';
    await filas[actual]!.find(`button[data-accion="${accion}"]`).trigger('click');
  }
  throw new Error('No se pudo colocar el paso.');
}

/**
 * Deja elegida la respuesta de la pregunta visible, sin comprobarla.
 * `correcta: true` elige lo correcto; `false`, algo incorrecto (opción múltiple: solo una
 * incorrecta; ordenar: el orden inverso, que para 3 o más pasos siempre difiere del correcto).
 */
export async function responder(
  wrapper: VueWrapper,
  quiz: ActividadQuiz,
  correcta: boolean,
): Promise<void> {
  const pregunta = preguntaVisible(wrapper, quiz);
  if (pregunta.formato === 'verdadero_falso') {
    const valor = correcta ? pregunta.correcta : !pregunta.correcta;
    await marcar(wrapper, valor ? 'Verdadero' : 'Falso');
  } else if (pregunta.formato === 'opcion_multiple') {
    const elegidas = correcta
      ? pregunta.opciones.filter((o) => pregunta.correctas.includes(o.id))
      : pregunta.opciones.filter((o) => !pregunta.correctas.includes(o.id)).slice(0, 1);
    for (const o of elegidas) await marcar(wrapper, textoPlanoDeMarkdown(o.texto));
  } else if (pregunta.formato === 'ordenar') {
    const orden = correcta ? pregunta.pasos : [...pregunta.pasos].reverse();
    for (const [i, paso] of orden.entries()) {
      await moverPaso(wrapper, textoPlanoDeMarkdown(paso.texto), i);
    }
  }
}

/** Pulsa el botón principal (Comprobar / Siguiente / Ver resultado). */
export async function pulsarPrincipal(wrapper: VueWrapper): Promise<void> {
  await wrapper.find('button[data-principal]').trigger('click');
  await flushPromises();
}

/** Responde y comprueba la pregunta visible, y avanza (o termina si era la última). */
export async function resolverPregunta(
  wrapper: VueWrapper,
  quiz: ActividadQuiz,
  correcta: boolean,
): Promise<void> {
  await responder(wrapper, quiz, correcta);
  await pulsarPrincipal(wrapper); // Comprobar
  await pulsarPrincipal(wrapper); // Siguiente / Ver resultado
}

/** Resuelve el quiz entero desde la primera pregunta. `aciertos` puede ser un plan por posición. */
export async function completarQuiz(
  wrapper: VueWrapper,
  quiz: ActividadQuiz,
  aciertos: boolean | readonly boolean[] = true,
): Promise<void> {
  const total = quiz.config.preguntas.length;
  for (let i = 0; i < total; i++) {
    const correcta = typeof aciertos === 'boolean' ? aciertos : (aciertos[i] ?? true);
    await resolverPregunta(wrapper, quiz, correcta);
  }
}
