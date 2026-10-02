# Anclas de la mandíbula: cómo se calculan

Los puntos de interés numerados de la exploración 3D de la mandíbula (`exploracion-3d`, modelo `mandibula`) se
colocan con un `ancla` `{x, y, z}` por nodo (`docs/content-schema.md`, secciones 7.6 y 9). Con la primera
versión, esas coordenadas eran suposiciones del guion: varios números quedaban flotando fuera del hueso. Ahora
las **calcula un script sobre la propia malla** y una prueba comprueba que cada punto está sobre el hueso.

- Malla: `apps/web/public/models/mandibula_bodyparts3d.stl` (BodyParts3D FJ6399, 23 020 triángulos).
- Script: `tools/anclas/calcular_anclas.mjs` (con `malla.mjs`, `landmarks.mjs`, `geometria.mjs` y `png.mjs`).
  Node solo, sin dependencias.
- Fuente de los números: el bloque generado de `apps/web/src/content/nodos3d.ts` (`ESTRUCTURAS_MANDIBULA`
  y `ANCLAS_PIEZAS_DERECHA`). El script lo copia a la tabla `ANCLAS_MANDIBULA` de `tools/guiones/conversor/recursos.py`
  y a los `content.json` de los módulos.

## Uso

```bash
node tools/anclas/calcular_anclas.mjs                    # informe; no escribe nada
node tools/anclas/calcular_anclas.mjs --escribir         # escribe nodos3d.ts, recursos.py y los content.json
node tools/anclas/calcular_anclas.mjs --comprobar        # código 1 si algún destino no coincide con lo calculado
node tools/anclas/calcular_anclas.mjs --png=.verify/anclas/gen   # vistas PNG con los puntos numerados
ANCLAS_DEPURAR=1 node tools/anclas/calcular_anclas.mjs   # además, dónde cae cada número en pantalla
```

Es determinista (misma malla, mismos bytes; el reparto usa una semilla fija). En los `content.json` solo cambia
el valor de `ancla` de cada nodo, por id, con una sustitución de texto que no toca nada más: el convertidor de
guiones se niega a sobrescribir esos archivos pulidos y aquí no se usa `--forzar`. Para comprobar el
convertidor sin tocar el contenido: `convertir.py todos --salida <carpeta temporal>` y de nuevo con
`--comprobar --salida <la misma>`; las `ancla` que salen son las de los `content.json` (comprobado).

Si cambian la malla, las vistas de cámara o los ids de los nodos: `--escribir` y volver a correr las pruebas.

## Cómo se mide la malla

1. **Misma transformación que la escena** (`scenes/stl.ts`): girar -90º sobre X (Z anatómico a Y), centrar la
   caja envolvente y escalar la esfera envolvente a radio 1. La prueba `scenes/anclasMandibula.test.ts` vuelve a
   cargar el STL con `crearGeometriaMandibula` y comprueba las anclas contra esa geometría, así que el espejo
   del script no puede desviarse sin que se note.
2. **El STL trae dientes** (contra lo que se suponía): son 14 componentes conexas aparte (7 por lado: dos
   incisivos, canino, dos premolares y dos molares) más una componente con el hueso. Se separan por
   conectividad y se ordenan por |x|. El hueso es la componente más grande. Los dientes sirven para situar las
   estructuras alveolares y como oclusores al comprobar la visibilidad.
3. **Coordenadas de ancla**: fracciones (0 a 1) de la caja envolvente **de toda la malla** (dientes incluidos:
   por eso la caja llega a z = ±0,587 y el mentón óseo a 0,525). `x` 0 = lado derecho del sujeto (-X), `y` 0 =
   abajo, `z` 1 = adelante. Se redondean a 3 decimales y se acotan a [0, 1] (el esquema lo exige): la punta del
   cóndilo queda a y = 1 exacto, sobre la superficie.
4. **Sobre la superficie**: cada punto se calcula sobre la superficie del hueso y se saca 0,008 (0,6 mm) a lo largo
   de la normal. Lo que se guarda y se prueba es el punto ya redondeado.

## Reglas por estructura (lado derecho; el izquierdo se calcula espejando la malla)

| Estructura | Regla |
| --- | --- |
| `condilo` | vértice más alto del lado |
| `apofisis_coronoides`, `escotadura_mandibular` | sobre la envolvente superior del perfil (z, y) suavizada con 5 franjas: máximo de la rama por delante de la escotadura, y su mínimo |
| `angulo` (gonion) | vértice más posterior e inferior (máx. de -z - y) |
| `cuello_condilo` | nivel de menor grosor anteroposterior bajo la cabeza, cara anterolateral (rayo desde delante y fuera); se ofrecen tres niveles |
| `rama` | cara lateral (rayo horizontal) hacia el centro de la lámina; se ofrecen nueve desplazamientos |
| `cuerpo`, `cuerpo_molares`, `hueso_trabecular_cuerpo`, `cuerpo_mandibular_basal` | cara lateral del cuerpo a una fracción de su altura (borde basal a cresta) bajo los molares y premolares |
| `borde_basal`, `cortical_basal` | cara anterolateral, apenas sobre el borde inferior |
| `foramen_mentoniano` (= `agujero_mentoniano`) | hoyo de la cara lateral del cuerpo: se agrupan los vértices cuyo promedio de vecinos queda por fuera de la superficie (concavidad) y se toma el grupo de más peso |
| `foramen_mandibular` | el mismo detector en la cara medial de la rama, en la región central-posterior (con la língula justo delante) |
| `linea_milohioidea` | punto más medial de la cara lingual del cuerpo (la cresta), en cortes bajo los molares |
| `proceso_alveolar` (= `apofisis_alveolar`), `tabla_cortical_vestibular`, `tabla_cortical_lingual`, `septo_interdental`, `lamina_dura`, `canino_zona_compresion` (distal), `canino_zona_tension` (mesial) | hueso alveolar por vestibular o por lingual a la altura de un diente o entre dos, por debajo de la cresta; la dirección vestibular es la perpendicular al arco dentario. Cada uno se ofrece a tres alturas |
| `cresta_alveolar` | borde superior del hueso bajo un diente |
| `sinfisis` | pogonion: el punto más anterior de la línea media en la mitad inferior del hueso (rayo en x = 0) |

## Reparto entre los dos lados y variantes

Con todas las estructuras pares en el lado derecho, en la vista inicial varios números se tapaban entre sí
(cóndilo, coronoides y escotadura, por ejemplo, están a menos de 30 px). Cada estructura tiene entonces
**opciones**: el lado (derecha o izquierda) y, en las zonas extensas, varias posiciones anatómicamente válidas
(por ejemplo el cuerpo bajo el primer molar o entre los molares). El script elige una opción por estructura por
recocido simulado con semillas fijas, para minimizar el solapamiento de los números en la vista inicial de la
escena, con la **cámara real**: frontal, elevación 12º, a 1,1 / sin 20º del centro, en un lienzo de 324 x 448 px
(móvil de 390) y 660 x 448 (escritorio). Se penaliza estar a menos de 44 px (objetivo táctil) y mucho más a menos
de 36 px (el número dibujado), y se prefieren la regla base y el lado derecho a igualdad.

Esa cámara se comprobó en el navegador: la posición de los 10 números del módulo 1 medida en el DOM coincide con la
prevista por el script con un error de 1 px. Detalle que conviene saber: la distancia de la cámara se fija al cargar
el modelo con el aspecto que tiene el lienzo entonces (aún con `min-h-64`, es decir, apaisado), no con el final.

Resultado (separación mínima entre centros en la vista inicial): módulos 1, 2, 3 y 6, 43 px o más; módulo 4, 38 px;
**módulo 5, 31 px** (nueve estructuras alveolares en una franja de unos 250 px de ancho: no caben separadas 44 px).

## Vista recomendada y visibilidad

Para cada punto se lanzan rayos desde cada una de las nueve vistas con nombre (`frontal`, `posterior`,
`lateral_derecha`, `lateral_izquierda`, `superior`, `inferior`, `oblicua`, `medial_derecha` y `medial_izquierda`; a
1,3, 1,5 y 1,8 del punto, que es lo que da `calcularEncuadre`; las mediales, con la cámara dentro del arco, a 0,9 como
máximo) y se descarta la vista en la que el hueso o un diente tapan el punto. La **vista
recomendada** es la primera, por orden de preferencia, que lo ve de frente (coseno normal-cámara >= 0,4), o la de
mayor coseno si ninguna. `condilo`, `apofisis_coronoides`, `escotadura_mandibular` y `angulo` son bordes y puntas:
basta con verlos de perfil. Las vistas mediales van al final del orden de preferencia y solo se usan si ninguna vista
externa ve el punto de frente (foramen mandibular); NO intervienen en el reparto de lados de los números, para que
añadirlas no mueva ningún ancla ya aprobada.

- Si el contenido no fija `camara` en el nodo (hoy solo lo hacen dos nodos opcionales del módulo 5, para acercarse y separar el grupo apretado), la actividad usa esa vista al enfocarlo
  (`logica.ts`, con `estructuraDeNodo` de `nodos3d.ts`, que solo la aplica si el `ancla` del nodo es la calculada
  para su id).
- Cada punto lleva su **normal**; la escena atenúa el número cuya normal no mira a la cámara (coseno < -0,15:
  `miraALaCamara` en `proyeccion.ts`), en lugar de comparar solo el lado del centro del modelo. No es un trazado
  de rayos por fotograma: no detecta que otra parte del hueso tape un punto que sí mira a la cámara.

## Qué comprueba la prueba (`scenes/anclasMandibula.test.ts`)

- Cada ancla está a menos de 0,02 (1,5 mm) de la superficie de la malla real y no dentro (distancia punto-triángulo).
- Cada ancla está en el lado que dice su tabla; las piezas del catálogo (`ANCLAS_PIEZAS_DERECHA`), también sobre el hueso.
- Con la vista recomendada, `calcularEncuadre` + `estadoDeEncuadre` colocan una cámara que mira al punto sin que
  ningún triángulo se interponga (móvil y escritorio); y cada estructura se ve desde alguna de las siete vistas.
- Los `content.json` de los seis módulos usan exactamente esas anclas y la actividad enfoca cada nodo desde su vista.
- Y `tools/guiones/tests/test_anclas_mandibula.py` compara la tabla del convertidor con `nodos3d.ts`.

## Límites (dicho con honestidad)

- **Estructuras internas.** El conducto mandibular y el interior de la lámina dura o del hueso trabecular no se
  ven desde fuera: sus puntos están en la superficie más cercana (por ejemplo `hueso_trabecular_cuerpo` en la
  cara lateral del cuerpo, `lamina_dura` en el hueso alveolar vestibular). El nodo de `foramen_mandibular` dice
  «el marcador está en el foramen; el trayecto del conducto es interno». No se cambió ningún texto.
- **Foramen mandibular.** Está en la cara medial de la rama, que solo queda enfrente desde dentro de la mandíbula:
  de las vistas con nombre, solo `superior` la ve (de perfil, coseno 0,37). Una vista nueva (`interior_derecha`
  desde arriba y detrás del lado contrario) lo resolvería, pero es un cambio de esquema.
- **Módulo 5.** Nueve estructuras alveolares en la vista inicial: 31 px entre centros como mínimo, con números que se
  rozan sobre los incisivos. Opciones: dejar 2 a 3 de esos nodos como no requeridos y ponerles `camara` propia (ya
  se enfocan de cerca al elegirlos), o que el visor use una vista inicial más cercana para esa escena.
- **Escritorio.** En un lienzo apaisado la mandíbula ocupa poco (la cámara encuadra la esfera envolvente en el alto
  del lienzo): los números se ven, pero pequeños. Es del encuadre existente, no de las anclas.
- La malla es una sola pieza de baja resolución: el foramen mentoniano es un hoyo de pocos triángulos y la línea
  milohioidea, un cambio suave de pendiente; los puntos están donde la geometría lo indica, no donde lo dibujaría un atlas.
- Verificado en Chrome de escritorio con WebGL real (emulando 390 x 844 y 1280 x 800); falta el teléfono real.
