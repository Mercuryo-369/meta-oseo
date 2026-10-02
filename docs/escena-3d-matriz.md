# Escena 3D de la matriz ósea: del fragmento al cristal (módulo 1)

Nota de diseño de `matriz_osea`, escena **procedural** del OVA (el formato, los controles y cómo añadir otra
escena están en [escena-3d-bmu.md](escena-3d-bmu.md); la plantilla de "viaje por escalas" es
[escena-3d-hueso.md](escena-3d-hueso.md)). Es una actividad **opcional** del módulo 1, `m1_3_matriz_3d`
(sección 1.3, 30 puntos), que acompaña a la animación `m1_3_video_matriz`
(`public/images/m1/m1_matriz_composicion.svg`): cuenta la misma historia, con los mismos colores, pero en 3D
y bajando de escala.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y la escena **baja de escala**. Como en la escena del hueso, aquí el
tiempo no son días: es la **profundidad de la mirada**. Puede subir y bajar cuando quiera, girar la escena
con un dedo y acercarla con dos.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `fragmento` (0) | Un bloque de hueso laminar: laminillas paralelas de dos tonos, con rayas que insinúan que sus fibras cambian de dirección | `general` |
| `fibras` (0,17) | Tres laminillas ampliadas y cortadas en escalera, cada una hecha de fibras de colágeno paralelas; de una a la siguiente cambian de dirección (-52°, 0°, +52°). Al final de la fase la fibra central se destaca en amarillo: es la que se abre | `fibra` |
| `fibrilla` (0,34) | Una fibrilla sacada de la fibra (el resto queda detrás como una fila de cilindros lisos) y abierta por la mitad: moléculas de tropocolágeno en forma de bastón, escalonadas un periodo D de fila a fila | `fibrilla` |
| `huecos` (0,5) | En el plano de corte se destacan en celeste los huecos entre el final de una molécula y el principio de la siguiente | `detalle` |
| `mineral` (0,64) | Placas crema de hidroxiapatita crecen primero en los huecos y después a lo largo de la superficie de la fibrilla | `detalle` |
| `proteinas` (0,78) | Glóbulos de tres colores (osteocalcina, osteopontina, osteonectina) pegados a los cristales | `detalle` |
| `carga` (1) | Flechas naranjas de tracción hacia fuera en los extremos (la fibrilla se estira un 5 %) y flechas azules de compresión transversales hacia dentro, como en el dibujo | `carga` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/matriz/estado.ts`): pistas de fotogramas
  clave con tramos suavizados. Adelantar y atrasar es exacto; nada se acumula entre fotogramas.
- **Tres "escalas" con su propio objeto** (`mallas.ts`): `FragmentoLaminar`, `LaminillasAmpliadas` y
  `FibrillaAbierta`. Cada una recibe el estado y solo se mueve, se escala o se aclara; no calcula biología.
  La transición entre escalas es la del hueso: la anterior se encoge y se desvanece mientras la siguiente crece
  y aparece. Las que no se ven no se dibujan (`visible = false`), y dentro de la fibrilla los huecos, los
  cristales, las proteínas y las flechas solo se dibujan desde su fase.
- **Modelo de Hodge-Petruska con proporciones reales** (`disposicion.ts`, puro y determinista): periodo D
  (67 nm) = 0,6 unidades; molécula de 4,4 D; hueco de 0,6 D; cada fila un periodo por delante de la anterior,
  con ciclo de cinco filas. Las moléculas van en una retícula hexagonal, y la fibrilla se dibuja **abierta**
  (solo su mitad trasera) para que el plano de corte, de frente a la cámara, muestre el escalonado y los huecos
  como en el dibujo plano. Los cristales tienen la proporción de una placa real (unos 50 x 25 x 3 nm) y las
  proteínas son pocas, porque regulan y no forman la masa de la matriz.
- **Piezas repetidas en `InstancedMesh`**: fibras de las laminillas, moléculas, fibrillas vecinas, huecos,
  cristales, proteínas y flechas (color por instancia para los dos tonos de fila, las tres proteínas y los dos
  tipos de flecha). Las fibras de cada laminilla se recortan a su huella (Liang-Barsky) para que ninguna
  sobresalga.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con la prop `resolverVista` y las vistas de esta
  escena (`matriz/vistas.ts`). Un dedo gira, dos acercan, sin paneo.
- **Colores** (`paleta.ts`): los del grupo correspondiente del SVG (`fragmento_hueso`, `fibrilla_colageno`,
  `zonas_hueco` celeste, `cristales_hidroxiapatita` crema, los tres de `proteinas_no_colagenas`,
  `fuerza_traccion` naranja y `fuerza_compresion` azul) y el rosa del hueso de la BMU.

## 3. Límites y honestidad

- Los **tamaños son esquemáticos** y no guardan escala entre pantallas: el fragmento, las laminillas y la
  fibrilla se dibujan del tamaño que cabe en la pantalla (el contenido lo dice). Dentro de la fibrilla sí se
  respetan las proporciones D / molécula / hueco, pero el diámetro de las moléculas y de la fibrilla, el número
  de moléculas (unas 170) y el de cristales están exagerados o reducidos para que se lean en un móvil.
- **Simplificaciones biológicas**: la fibrilla se muestra como un haz recto de bastones sin la torsión real
  de la triple hélice ni la microfibrilla de cinco moléculas; los huecos solo se marcan en el plano de corte;
  las placas de mineral "de superficie" son una convención (el mineral extrafibrilar real envuelve las
  fibrillas); las flechas de compresión son transversales, como en el dibujo del docente, aunque la carga
  principal del hueso es axial. El estiramiento bajo tracción (5 %) es un gesto didáctico, no una deformación
  real (la del colágeno óseo es de un orden de magnitud menor).
- **Sin revisión del docente** del texto de los pasos ni de la forma de las estructuras.
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas en memoria: menos de 8 600 triángulos
  y 6 llamadas de dibujo en el peor instante (t = 0,875). La escena pesa 16 kB (6,2 kB gzip); three va en el
  chunk `webgl` compartido con las otras escenas.
- Verificada en Chrome con WebGL, con emulación táctil de 390 × 844 px (`t` = 0; 0,17; 0,34; 0,5; 0,64;
  0,78 y 1) y a 1280 × 800 px (`t` = 0,34 y 1). No se probó el pellizco ni el giro con el dedo, ni la línea de
  vuelta completa. En modo claro no se comprobó el contraste de las placas crema sobre el fondo.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes | `apps/web/src/scenes/procedural/matriz/estado.ts` |
| Disposición de piezas repetidas (fibras, moléculas, huecos, cristales, proteínas, flechas) | `.../matriz/disposicion.ts` |
| Formas (bastón, placa, glóbulo, flecha) | `.../matriz/geometria.ts` |
| Las tres escalas | `.../matriz/mallas.ts` |
| Vistas de cámara | `.../matriz/vistas.ts` |
| Colores | `.../matriz/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../matriz/EscenaMatriz.vue`, `ContenidoMatriz.vue` |
| Pruebas | `.../matriz/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m1_conociendo_el_hueso/content.json`, actividad `m1_3_matriz_3d` |
