# Realismo de las escenas 3D: base compartida

Las 14 escenas procedurales (`apps/web/src/scenes/procedural/<escena>/`) y la mandíbula anatómica STL
(`EscenaExploracion.vue`, `MandibulaScene.vue`) comparten materiales, luz y sombras. Esta nota describe esa base
tal como quedó tras la revisión de diseño del 2026-10-15/17. Cada escena documenta lo suyo en
`docs/escena-3d-<escena>.md`.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `procedural/realismo.ts` | Texturas de relieve por código, `materialOrganico` por tejido, `materialTriplanar` (mallas sin UV), modificaciones del sombreador y `ponerOpacidad`. |
| `procedural/iluminacion.ts` | Valores del esquema de luz y cálculos puros: direcciones de las luces según la cámara, radio de la escena y ajuste de la cámara de sombras. |
| `procedural/EntornoRealista.vue` | Pone en cada lienzo las luces, el entorno de estudio y las sombras. Las escenas ya no declaran luces. |

## Materiales por tejido

`materialOrganico(color, tejido, extra)` devuelve un `MeshPhysicalMaterial` con los ajustes del tejido (rugosidad,
patrón y fuerza del relieve, repetición, terciopelo, barniz y motas). Hay 21 tejidos, del `hueso` al `liquido`.
`extra` pisa cualquier ajuste.

- **Textura de relieve** (256 × 256, calculada una vez y compartida): la altura va en R y B, y el canal G es un
  factor de rugosidad entre 0,78 (fondo de un poro) y 1 (cresta). three multiplica la rugosidad por G; antes G
  era la propia altura y la rugosidad quedaba a la mitad (brillo de plástico).
- **Motas**: el color varía con el relieve, más oscuro en el fondo de un poro, con una cantidad por tejido (de 0,08
  en el cartílago a 0,25 en el hueso inmaduro y el coágulo).
- **Terciopelo** (`sheen`): del color del material; gris medio (`#8a8590`) si el material es blanco porque el
  color va por vértice o por instancia.
- **Escala del relieve**: la repetición de cada tejido supone UV de 0 a 1. Con UV en unidades de escena
  (extrusiones, placas, geometrías propias) la escena fija la suya con `material.bumpMap!.repeat.set(x, y)`.
- **Desvanecidos**: `ponerOpacidad(materiales, o)`. three compila un material opaco con la constante OPAQUE, que
  fija el alfa a 1, y no recompila al cambiar `transparent`: `ponerOpacidad` lo recompila al cruzar el umbral.

### Modificaciones del sombreador

three admite un solo `onBeforeCompile` por material, así que todas pasan por `inyectar(material, nombre, f)`, que
las encadena y compone la clave del programa (`ova-motas-velo-ao`…). Nunca se asigna `onBeforeCompile` a mano.

- `veloFresnel(material, centro, borde)`: un tejido translúcido más transparente de frente que de canto.
- `oclusionPorVertice(material)`: apaga la luz indirecta según un atributo `ao` de la geometría (túneles,
  cavidades). La luz directa ya la tapan las sombras.
- `materialTriplanar`: el relieve se proyecta desde los tres ejes, para mallas sin UV.

## Luz

Esquema de estudio de ilustración médica, el mismo en todas las escenas:

| Luz | Valor | Por qué |
| --- | --- | --- |
| Principal | 2,2, casi neutra, arriba a la izquierda y a 45° de la vista | El ojo lee el relieve con luz de arriba a la izquierda; a 45° modela las formas y las sombras caen a la vista. |
| Contraluz | 0,7, fría, detrás del objeto, arriba a la derecha | Perfila los contornos y separa las piezas del fondo. |
| Hemisferio | 0,35, cielo cálido y suelo pardo | Relleno suave que no depende del giro. |
| Entorno | `RoomEnvironment` a 0,25, girado con la cámara | Luz indirecta y reflejos; girado, sus paneles quedan siempre del lado de la principal. |

Las direcciones se recalculan antes de cada dibujo a partir de la orientación de la cámara: el esquema no cambia
con el zoom ni con el lado de la órbita. Con estos valores, un tejido marfil queda a ≈1,05 veces su albedo en la
cara iluminada y a ≈1/3 en la de sombra. Antes, la luz de cada escena iba casi en el eje de la vista y entorno,
luz ambiental y hemisferio sumaban casi el doble de lo que admite un tejido claro: el marfil salía casi blanco.

## Sombras

- Solo proyecta la luz principal, con un mapa PCF (2048 en escritorio, 1024 en táctiles; radio 3).
- La caja de la cámara de sombras se ajusta al radio de la escena (caja envolvente desde el origen, redondeada a
  medias unidades) y los sesgos se miden en texels: sombras nítidas y pegadas a las piezas.
- Cada malla recibe sombras. Proyecta si es opaca (una pieza que se desvanece, con opacidad ≤ 0,9, deja de
  hacerlo) y si no lleva `userData.sinSombra`.
- Un material de doble cara entra en el mapa solo con su cara delantera (`shadowSide = FrontSide`), salvo que la
  escena fije otra: si no, la cara trasera iluminada (el interior de una cáscara) se sombrearía a sí misma.

## Rendimiento

- Todo se ajusta en `scene.onBeforeRender`, solo cuando se dibuja de verdad.
- Tras el primer dibujo se precompilan todas las variantes de sombreado (cada material opaco y transparente, y
  las dos caras de los transparentes de doble cara): sin esto se compilaban a ráfagas a mitad de la animación.
- La comprobación de errores de los sombreadores solo se hace en desarrollo.
- La demo de la mandíbula dibuja a demanda, como las demás escenas.

## Paleta unificada entre escenas

El mismo tejido tiene el mismo color en todas las escenas. Cada escena lo aplica en su paleta `NATURAL` (el
objeto `HEX` no cambia, porque otras escenas lo importan).

| Tejido | Color |
| --- | --- |
| Hueso maduro | marfil (`#e6d8bc` a `#eadfc8`) |
| Hueso nuevo laminar del remodelado | `#f2e9d8` |
| Hueso inmaduro o entretejido | `#e2b4a2` |
| Osteoide | `#eed4c9` |
| Ligamento periodontal | `#d4948b` |
| Hueso alveolar propio | `#f4ecdc` |
| Cemento, dentina, pulpa | `#d2b984`, `#ecd9aa`, `#c65f5b` |
| Encía | `#dc958c` |
| Médula roja, amarilla | `#9e3f33`, `#e8c561` |
| Cartílago hialino, calcificado | `#d9e8ef`, `#a2aaae` |
| Osteoblasto, osteocito, osteoclasto | `#8d86c6`, `#8a9ad2`, `#b893cf` |

## Cómo se comprueba

Sin navegador: pruebas de las funciones puras (`iluminacion.test.ts`), de las inyecciones contra los sombreadores
reales de three (`realismo.test.ts`) y del presupuesto de cada escena. Lo que solo se ve en pantalla (exposición,
sombras, motas) queda para la prueba en el equipo de la usuaria.
