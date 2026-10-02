# Registro de revisiones con el docente

Cada vez que se le entrega algo al docente para que lo revise, se anota aquí: **fecha, versión, qué se entregó, qué
cambios pidió y si aprobó** (regla del proyecto, `CLAUDE.md`). Este archivo es la memoria de los ciclos de
aprobación: quien llegue después debe poder ver qué se acordó, con quién y cuándo, sin preguntar.

- [Cómo se usa](#cómo-se-usa)
- [Plantilla de un ciclo](#plantilla-de-un-ciclo)
- [Estado de aprobación por módulo](#estado-de-aprobación-por-módulo)
- [Ciclos](#ciclos)
  - [Entrega 1: 2026-09-25, versión 0.1.0](#entrega-1-2026-09-25-versión-010)

## Cómo se usa

1. **Al entregar**: se copia la plantilla debajo de «Ciclos», se numera («Entrega 2»...) y se llena la parte de
   *qué se entrega* y *qué se pide*, con la fecha y la versión (la del `package.json`, hoy 0.1.0).
2. **Al recibir la respuesta**: se completan *cambios pedidos* (una fila por cambio, con la referencia de la [lista
   de revisión](revision-docente.md) cuando exista, por ejemplo `M3-P17`) y *aprobación*.
3. **Al aplicar los cambios**: se marca cada fila como aplicada (con la fecha) y se regenera la lista de revisión
   (`python tools/guiones/pendientes.py`).
4. **Al aprobar un módulo**: se cambia su `estado_revision` (`revisado_docente` o `aprobado`, con quién, cuándo y
   qué versión; ver la [guía del docente](guia-docente.md#6-revisar-y-aprobar-el-contenido)) y se actualiza la tabla
   de estado de abajo.

La aprobación debe ser **explícita y de la persona que valida el contenido** (el docente), por escrito o en una
reunión anotada. Una respuesta ambigua se registra como «sin respuesta» y no cuenta como aprobación.

## Plantilla de un ciclo

Se copia todo lo que sigue debajo de «Ciclos».

```markdown
### Entrega N: AAAA-MM-DD, versión X.Y.Z

**Responsable de la entrega:** nombre · **Recibe:** nombre del docente · **Medio:** correo, reunión, etc.

**Qué se entrega**

- (documentos, módulos o funciones; dirección donde probar; versión del contenido)

**Qué se pide al docente**

- (decisiones, confirmaciones y revisiones concretas, con fecha límite si la hay)

**Respuesta del docente** (fecha de recepción: AAAA-MM-DD)

- (texto o resumen de lo que dijo; enlace al documento devuelto)

**Cambios pedidos**

| # | Referencia | Cambio pedido | Estado | Aplicado (fecha y versión) |
|---|---|---|---|---|
| 1 | M3-P17 | Corregir «X» a «Y» | pendiente / aplicado / rechazado (con motivo) | |

**Aprobación**

| Módulo o pieza | Resultado (aprobado / con cambios / sin respuesta) | Nombre y fecha |
|---|---|---|

**Observaciones para el próximo ciclo**

- (lo que quedó abierto)
```

## Estado de aprobación por módulo

Se actualiza al cerrar cada ciclo. «Borrador» significa que el contenido es nuestro y nadie lo ha validado.

| Módulo | Estado de revisión | Última versión revisada | Aprobado por | Fecha |
|---|---|---|---|---|
| 1. Conociendo el hueso | borrador | ninguna | | |
| 2. Descubriendo sus células | borrador | ninguna | | |
| 3. Construyendo hueso | borrador | ninguna | | |
| 4. Transformando la matriz | borrador | ninguna | | |
| 5. Renovando el hueso | borrador | ninguna | | |
| 6. El paso del tiempo | borrador | ninguna | | |
| Certificado, logros y puntajes | por acordar (decisiones D01 a D03 y D12 de la lista de revisión) | ninguna | | |
| Mentor de IA | sin probar con una clave real | ninguna | | |

## Ciclos

### Entrega 1: 2026-09-25, versión 0.1.0

**Responsable de la entrega:** equipo de desarrollo · **Recibe:** el docente que pidió el OVA · **Medio:** por definir
(entrega de la carpeta del proyecto y de los documentos de `docs/`).

**Qué se entrega**

Es la **primera entrega**: el OVA completo como borrador, para que el docente lo revise. Todo el contenido
pedagógico lo redactamos nosotros a partir del briefing (no se recibió material del docente), así que **nada está
validado**.

- Los <!--c:modulos-->6<!--/c--> módulos jugables, con <!--c:actividades-->128<!--/c--> actividades, <!--c:puntos-->3900<!--/c--> puntos posibles
  (<!--c:puntos_obligatorios-->2900<!--/c--> en las obligatorias), glosario y referencias.
- Gamificación (puntaje con penalización por intento, seis logros), certificado en PDF con verificación pública, panel
  del docente y mentor de IA.
- La documentación: [entrega.md](entrega.md) (resumen y estado real), [guía de instalación](guia-instalacion.md),
  [guía del docente](guia-docente.md), [guía del estudiante](guia-estudiante.md), [arquitectura](arquitectura.md), los
  guiones de los seis módulos (`docs/guion-por-modulo/`) y la [lista de revisión](revision-docente.md).
- Estado de revisión de los seis módulos: `borrador`.

**Lo que no está verificado** (el docente debe saberlo antes de probar): el mentor nunca se ha probado con una clave
real de Anthropic; nada se ha probado en un teléfono real; Docker nunca se ha construido; no hay videos reales; el modelo
3D de la mandíbula es provisional. Detalle en [entrega.md](entrega.md).

**Qué se pide al docente**

1. Recorrer los módulos con una cuenta de docente (ve todo abierto y no guarda nada) y, con una cuenta de prueba, la
   experiencia del estudiante, incluida la de un teléfono.
2. Responder la [lista de revisión](revision-docente.md):
   - las <!--c:decisiones-->20<!--/c--> decisiones de diseño (entre ellas el umbral del certificado, el acierto mínimo de las
     evaluaciones finales, la penalización por intento, los tipos de identificación de Colombia, las hormonas óseas
     controvertidas del módulo 1 y las hipótesis en disputa);
   - las <!--c:pendientes-->287<!--/c--> cifras y afirmaciones pendientes en el contenido, con sus
     <!--c:notas-->221<!--/c--> notas de verificación;
   - las <!--c:referencias-->125<!--/c--> referencias bibliográficas.
3. Indicar si dispone de **videos**, de un **modelo 3D propio** de la mandíbula o de material del curso (documentos,
   imágenes) que deba incorporarse.
4. Decidir cómo se accederá antes de abrirlo a estudiantes (hoy es solo con el número de documento, sin contraseña).
5. Proponer una fecha para una **prueba piloto** con 5 a 10 estudiantes.

**Respuesta del docente:** pendiente.

**Cambios pedidos:** ninguno todavía.

| # | Referencia | Cambio pedido | Estado | Aplicado (fecha y versión) |
|---|---|---|---|---|
| | | | | |

**Aprobación:** ningún módulo aprobado.

| Módulo o pieza | Resultado | Nombre y fecha |
|---|---|---|
| Los seis módulos | sin respuesta | |

**Observaciones para el próximo ciclo**

- Al recibir la respuesta: aplicar los cambios en los `content.json` (no en los guiones: ver la guía del docente), regenerar
  el manifiesto, el corpus del mentor y la lista de revisión, y pasar el estado de los módulos aprobados.
- Cuando se apruebe un módulo hay que actualizar la prueba `contenido.test.ts` de ese módulo, que hoy exige el estado
  `borrador`.
