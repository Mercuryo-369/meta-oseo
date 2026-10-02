# Escena 3D del hueso largo a la osteona (módulo 1)

Nota de diseño de `hueso_largo_a_osteona`, la segunda escena **procedural** del OVA (la primera es la BMU:
[escena-3d-bmu.md](escena-3d-bmu.md), que explica el formato, los controles y cómo añadir otra escena). Es una
actividad **opcional** del módulo 1, `m1_4_viaje_3d` (sección 1.4, 30 puntos), que acompaña a las actividades de
imágenes de esa sección: en vez de tocar capas en un dibujo plano, el estudiante baja de escala en 3D.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y la escena **baja de escala**. Aquí el tiempo no son días: es la
**profundidad de la mirada**. Puede subir y bajar cuando quiera, girar la escena con un dedo y acercarla con dos.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `entero` (0) | Hueso largo: diáfisis, epífisis con cartílago articular y periostio | `general` |
| `abierto` (0,2) | La tapa de la cortical se levanta: cortical, médula ósea amarilla y trabéculas de las epífisis | `interior` |
| `corte` (0,42) | Un corte transversal de la diáfisis: periostio, cortical con osteonas, endostio y médula | `corte` |
| `capas` (0,58) | Las capas del corte se separan | `capas` |
| `osteonas` (0,74) | Las capas se juntan y las osteonas de la cortical se destacan | `corte` |
| `osteona` (0,88) | Una osteona ampliada y cortada en escalera; el corte queda pequeño en una esquina | `osteona` |
| `osteocitos` (1) | Los osteocitos crecen y se ven los canalículos | `detalle` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/hueso/estado.ts`), igual que en la BMU: pistas de
  fotogramas clave con tramos suavizados. Adelantar y atrasar es exacto; nada se acumula entre fotogramas.
- **Tres "escalas" con su propio objeto** (`mallas.ts`): `HuesoLargo`, `CorteTransversal` y `OsteonaAmpliada`. Cada
  una recibe el estado y solo se mueve, se escala o se aclara; no calcula biología. Las que no se ven no se
  dibujan (`visible = false`).
- **Piezas repetidas y sus posiciones** (`disposicion.ts`, puro y determinista): las 16 osteonas del corte, las 240
  trabéculas de las epífisis, las láminas de la osteona ampliada y las 16 lagunas de osteocitos. Una prueba
  comprueba que las osteonas del corte no tocan el endostio ni la lámina externa.
- **Corte "en escalera" de la osteona:** cada lámina pierde un sector distinto, de manera que las interiores
  quedan a la vista como peldaños. Sobre cada peldaño van las fibras de colágeno (rayas oblicuas que alternan
  de sentido de una lámina a la siguiente) y, en los de fuera, los osteocitos en sus lagunas.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`), con una prop `resolverVista` para usar las vistas de esta
  escena (`hueso/vistas.ts`). Un dedo gira, dos acercan, sin paneo.
- **Colores:** los de los dibujos del módulo 1 y de la BMU (`hueso/paleta.ts`), para que cada capa se reconozca de
  un dibujo al otro.

## 3. Límites y honestidad

- Las formas son **esquemáticas**: el hueso largo es un cilindro con dos bulbos, no un fémur; las trabéculas son
  barras al azar sesgadas hacia la carga, no un patrón real; los tamaños no guardan escala entre pantallas.
- Los canalículos son líneas de un píxel: se ven poco en pantallas de baja densidad.
- **Sin revisión del docente** del texto de los pasos ni de la forma de las estructuras.
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas: menos de 12 000 triángulos en el hueso,
  4 000 en el corte y 7 000 en la osteona. La escena pesa 15 kB (6,3 kB gzip); three va en el chunk `webgl`
  compartido con la BMU y la mandíbula.
- Verificada en Chrome con WebGL, con emulación táctil de 390 × 844 px (`t` = 0; 0,2; 0,42; 0,58; 0,74; 0,88 y 1)
  y a 1280 × 800 px (`t` = 0,2). No se recorrió la línea de vuelta completa ni se probó el pellizco.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes | `apps/web/src/scenes/procedural/hueso/estado.ts` |
| Disposición de piezas repetidas | `.../hueso/disposicion.ts` |
| Formas (anillos, cáscaras) | `.../hueso/geometria.ts` |
| Las tres escalas | `.../hueso/mallas.ts` |
| Vistas de cámara | `.../hueso/vistas.ts` |
| Escena y contenido dentro del lienzo | `.../hueso/EscenaHueso.vue`, `ContenidoHueso.vue` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m1_conociendo_el_hueso/content.json`, actividad `m1_4_viaje_3d` |
