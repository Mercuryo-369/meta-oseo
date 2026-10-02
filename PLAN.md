# Plan de construcción — OVA "Metabolismo óseo: un viaje interactivo desde la célula hasta el hueso"

Objeto Virtual de Aprendizaje para ciencias de la salud. Seis módulos que van de la
célula al hueso mandibular, con interactividad obligatoria para avanzar, mentor de IA,
gamificación y certificado final. 100 % funcional en móvil.

Fuente pedagógica: [docs/briefing-pedagogico.md](docs/briefing-pedagogico.md).
Estado de avance: [TODO.md](TODO.md). Repos a reutilizar: [docs/referencias.md](docs/referencias.md).

---

## 1. Decisiones de stack (cerradas)

| Capa | Elección | Por qué |
|---|---|---|
| Frontend | **Vue 3 + Vite + TypeScript** | Composition API, integración natural con TresJS. SPA separada que consume la API. |
| Estado | **Pinia** | Store del `ContextoPedagogico` y del progreso/puntaje. |
| UI | **Tailwind CSS + shadcn-vue** | Componentes accesibles; el menú circular se hace a medida con SVG. |
| 3D | **TresJS (`@tresjs/core`) + cientos** | Mandíbula y células rotables con `useGLTF` + Draco, eventos por mesh, `Html` para etiquetas. Solo donde el 3D aporta; el resto es 2D. |
| Interacciones 2D | **SVG inline + `@vueuse/gesture` / `@formkit/drag-and-drop`** | Imágenes multicapa con hover, arrastre de moléculas a receptores, asociación de columnas. Funciona con touch. |
| Animación | **@vueuse/motion + GSAP** | Transiciones de paneles; GSAP para tweens de cámara y para el "efecto biológico" al acoplar una molécula. |
| Moléculas | **Mol\* o NGL embebido** | Proteínas reales desde PDB cuando el módulo lo pida. |
| Video | **`<video>` nativo + HLS si hay hosting** | Contenido mixto video + texto. |
| Chat IA en UI | **`fetch` + `ReadableStream` sobre SSE propio** (composable `useMentor`) | Streaming token a token. Se descartó `@ai-sdk/vue`: exigiría emular su protocolo de stream en FastAPI y las acciones de cámara 3D del mentor (F3-08) necesitan eventos propios. Ver `docs/api-contract.md`. |
| Backend único | **Python 3.14 + FastAPI** | Un solo servicio: registro, progreso, puntajes, logros, certificados, estadísticas, mentor de IA y RAG. Liviano y todo en Python. |
| ORM y migraciones | **SQLModel (SQLAlchemy 2 + Pydantic) + Alembic** | Modelos tipados que sirven también como schemas de la API. |
| Base de datos | **SQLite en desarrollo, PostgreSQL 16 en producción** | PostgreSQL trae `pgvector`, así el RAG vive en la misma base. |
| Auth | **JWT (`PyJWT`) con `Authorization: Bearer`** | Sin contraseña al inicio: el estudiante entra con tipo y número de identificación. |
| Certificados | **reportlab** (+ fuentes DejaVu) | PDF en Python puro, sin dependencias de sistema (WeasyPrint exige GTK en Windows), con código de verificación y QR. |
| LLM | **Claude Opus 5 (`claude-opus-5`) vía SDK oficial `anthropic`** | Razonamiento científico. Thinking adaptativo, streaming. |
| Recuperación RAG | **BM25 propio en Python puro (hoy) → `pgvector` (F6-10)** | Cambio del 2026-09-24: sin ChromaDB ni embeddings (nada pesado en Windows con Python 3.14 ni en imagen slim). Corpus generado a `app/data/corpus.jsonl`; la interfaz `Retriever` permite sumar pgvector sin tocar el resto. Ver `docs/mentor-eval.md`. |
| Monorepo | **pnpm workspace para `apps/web` + `services/api` con `uv`** | Un solo repo, dos apps. |

### Decisión clave: un solo backend
FastAPI concentra todo. El frontend habla con un único origen. La clave de Anthropic vive
solo en el backend. Se elimina la validación cruzada de tokens entre servicios.

### Decisión clave: registro mínimo
El estudiante se registra con **nombre, apellido, tipo de identificación y número de
identificación**. El número de identificación es el identificador de acceso; no hay
contraseña en esta etapa. Riesgo aceptado: cualquiera que conozca el documento de otro
puede entrar como esa persona. Se revisa antes del despliegue público (F6).

### Decisión clave: 3D solo donde aporta
El briefing exige móvil al 100 %. El 3D pesado se reserva para la mandíbula (Módulos 1 y 5)
y las células (Módulo 2). Las imágenes multicapa, el arrastre molecular y las actividades de
relación se hacen en SVG/2D, que rinden bien en cualquier teléfono.

---

## 2. Estructura del repositorio

```
ova-metabolismo-oseo/
├── apps/
│   └── web/                      # Vue 3 + Vite + TresJS
│       ├── src/
│       │   ├── modules/          # m1-conociendo ... m6-paso-del-tiempo, uno por carpeta
│       │   │   └── m3-construyendo/
│       │   │       ├── content.json   # texto, imágenes, actividades del módulo
│       │   │       ├── scenes/        # escenas 3D propias del módulo
│       │   │       └── activities/    # instancias de actividades
│       │   ├── activities/       # Motor de actividades reutilizable (ver §4)
│       │   ├── scenes/           # Escenas 3D compartidas (mandíbula, célula)
│       │   ├── components/       # UI: menú circular, panel mentor, HUD de puntaje
│       │   ├── stores/           # Pinia: contexto, progreso, gamificación
│       │   └── ai/               # Composables del mentor (useChat, contexto)
│       └── public/
│           ├── models/           # GLB optimizados
│           ├── images/           # SVG multicapa por módulo
│           └── videos/
├── services/
│   └── api/                      # FastAPI (único backend)
│       ├── app/
│       │   ├── main.py
│       │   ├── core/             # settings, seguridad JWT, db
│       │   ├── models/           # SQLModel: user, progress, activity_result, achievement, certificate, chat
│       │   ├── routers/
│       │   │   ├── auth.py       # /auth/register, /auth/login
│       │   │   ├── progress.py   # /progress, /activities/{id}/result
│       │   │   ├── gamification.py  # /achievements, /leaderboard
│       │   │   ├── certificates.py  # /certificates, /verify/{codigo}
│       │   │   ├── mentor.py     # /chat, /explain, /progress-hint (streaming)
│       │   │   ├── quiz.py       # /quiz
│       │   │   └── teacher.py    # estadísticas para el docente
│       │   ├── ai/               # cliente Anthropic, tools, prompts versionados
│       │   └── rag/              # texto (español), corpus, retriever BM25, consulta, evaluación
│       ├── alembic/              # migraciones
│       ├── corpus/               # documentos del curso (gitignored)
│       ├── tests/
│       └── pyproject.toml        # gestionado con uv
├── docs/
│   ├── briefing-pedagogico.md    # Fuente del docente
│   ├── guion-por-modulo/         # m1.md ... m6.md: textos, imágenes, actividades
│   ├── contexto-3d.md            # Mapa nodo GLB → concepto → prompt
│   ├── referencias.md            # Repos de GitHub a reutilizar
│   └── revisiones.md             # Ciclos de aprobación con el docente
├── PLAN.md
├── TODO.md
├── CLAUDE.md
└── docker-compose.yml
```

---

## 3. Contrato central: el "contexto pedagógico"

Todo lo que hace el mentor de IA depende de saber dónde está el estudiante. Objeto único
en Pinia, enviado en cada petición a FastAPI:

```ts
type ContextoPedagogico = {
  modulo: 1 | 2 | 3 | 4 | 5 | 6;
  seccion: string;                   // id de la sección dentro del módulo
  actividadActual?: {
    id: string;
    tipo: "multicapa" | "arrastre-molecular" | "relacion-columnas" | "quiz" | "video-texto" | "exploracion-3d";
    intentos: number;
    completada: boolean;
  };
  estructuraSeleccionada?: string;   // nodo GLB o capa SVG, ej. "osteoblasto", "condilo"
  moleculaSeleccionada?: string;     // ej. "RANKL"
  nivel: "pregrado" | "posgrado";
  tiempoEnSeccionSeg: number;
  interaccionesRecientes: string[];  // últimos 10 eventos
  progreso: {
    modulosCompletados: number[];
    puntajeTotal: number;
    logros: string[];
  };
};
```

Este contrato se congela en la Fase 1 y es el eje del proyecto.

---

## 4. Motor de actividades (reutilizable entre módulos)

Los seis módulos usan los mismos tipos de interacción. Se construye una vez cada tipo como
componente genérico que recibe su configuración desde `content.json`:

| Tipo | Componente | Configuración | Tecnología | Puntaje |
|---|---|---|---|---|
| Exploración multicapa | `ActivityLayers` | SVG con `<g id>` por capa; texto por capa; capas que deben visitarse | SVG inline, hover en desktop, tap en móvil | Por capas visitadas |
| Arrastre molecular | `ActivityDrag` | Lista de moléculas, receptores, pares válidos, animación de efecto | Drag & drop táctil, GSAP | Por acople correcto, penaliza intentos |
| Relación de columnas | `ActivityMatch` | Dos listas y pares correctos | Tap-tap o arrastre | Por pares |
| Quiz | `ActivityQuiz` | Preguntas estáticas o generadas por IA | Opción múltiple con feedback | Por acierto |
| Video + texto | `ActivityMedia` | URL de video, texto, hitos | `<video>`, scroll sincronizado | Por completar |
| Exploración 3D | `ActivityScene3D` | GLB, nodos, textos | TresJS | Por nodos visitados |

Cada actividad emite `completada(puntaje)`; la store de gamificación acumula y desbloquea logros.

---

## 5. Gamificación y certificado

- **Puntos** por actividad, con penalización por intentos fallidos.
- **Logros** (insignias internas): "Primer hueso", "Célula por célula", "Constructor", "Mineralizador", "Remodelador", "Cronista", más logros transversales ("Sin errores en un módulo", "Preguntó al mentor 10 veces").
- **Certificado PDF** al completar los seis módulos con puntaje mínimo. Código de verificación público (`/verify/{codigo}`).
- **HUD** persistente con puntaje, módulo actual y siguiente logro.

---

## 6. Fases de trabajo

### Fase 0 — Contenido y assets (semanas 1–3, en paralelo con Fase 1)
- [ ] Guion por módulo con el docente en `docs/guion-por-modulo/`: textos, imágenes disponibles, actividades por sección, preguntas tipo.
- [ ] Inventario de imágenes/videos existentes del docente y qué falta producir.
- [ ] Documentos del curso para RAG (con permiso de uso).
- [ ] Mandíbula BodyParts3D refinada en Blender con nodos nombrados; GLB con Draco.
- [ ] Modelos de célula (osteoblasto, osteoclasto, osteocito, osteoprogenitora) en GLB low-poly.
- [ ] Convertir imágenes clave a SVG multicapa con ids por estructura.
- [ ] `docs/contexto-3d.md`: nodo/capa → concepto → texto → prompt.
- [ ] Definir la tabla de puntajes y logros con el docente.

### Fase 1 — Esqueleto técnico (semanas 1–3)
- [ ] Monorepo, Docker Compose con web, api y postgres.
- [ ] FastAPI: modelos SQLModel (`users`, `progress`, `activity_results`, `achievements`, `certificates`, `chat_sessions`, `chat_messages`, `usage_events`), Alembic, registro/login mínimo con JWT.
- [ ] FastAPI: `/health`, cliente Anthropic con streaming en `/chat`.
- [ ] Vue: layout móvil primero, Vue Router con una ruta por módulo, Pinia con `ContextoPedagogico`, menú circular lateral, HUD de puntaje.
- [ ] Escena TresJS "hola mandíbula" con Draco, probada en un teléfono real.
- [ ] CI básica.

**Entregable:** registro, menú circular navegable, mandíbula rotando en móvil, chat con streaming.

### Fase 2 — Motor de actividades + Módulo 1 piloto (semanas 4–6)
- [ ] `ActivityLayers`, `ActivityMatch`, `ActivityMedia`, `ActivityScene3D` genéricos.
- [ ] Store de gamificación: puntos, logros, persistencia en la API.
- [ ] Módulo 1 "Conociendo el hueso" completo con `content.json`.
- [ ] Primer ciclo de revisión con el docente (`docs/revisiones.md`).

**Entregable:** Módulo 1 jugable de principio a fin, con puntaje, en móvil y desktop.

### Fase 3 — Mentor de IA contextual (semanas 6–9)
- [x] Corpus del mentor (`scripts/build_corpus.py`) y recuperación BM25 (`app/rag/`), sin ChromaDB (2026-09-24).
- [ ] `/chat` con system prompt + contexto pedagógico + chunks + historial; prompt caching.
- [ ] "Explícame esto" desde cualquier capa/nodo/molécula seleccionada, analogía según `nivel`.
- [ ] Monitoreo: el mentor lee `progreso` y sugiere qué reforzar (`/progress-hint`).
- [ ] Tool use: `enfocar_estructura`, `ir_a_seccion`, `abrir_actividad`.
- [ ] Guardar sesiones y tokens en la base; límites por estudiante.

**Entregable:** el mentor responde sobre lo que el estudiante está viendo y cita el material del curso.

### Fase 4 — Módulos 2 y 3 + arrastre molecular (semanas 9–12)
- [ ] `ActivityDrag` con animación de efecto biológico.
- [ ] Módulo 2 "Descubriendo sus células" con escena 3D de células.
- [ ] Módulo 3 "Construyendo hueso" (alta densidad): mecanotransducción con arrastre molecular.
- [ ] `ActivityQuiz` con preguntas generadas por IA (`/quiz`, salida estructurada) y feedback inmediato.
- [ ] Segundo ciclo de revisión.

### Fase 5 — Módulos 4, 5 y 6 (semanas 12–16)
- [ ] Módulo 4 "Transformando la matriz" (alta densidad).
- [ ] Módulo 5 "Renovando el hueso" (alta densidad): remodelado sobre la mandíbula 3D.
- [ ] Módulo 6 "El paso del tiempo".
- [ ] Certificado PDF con verificación pública.
- [ ] Tercer ciclo de revisión.

### Fase 6 — Pulido, pruebas y despliegue (semanas 16–18)
- [ ] Accesibilidad (teclado, contraste, aria) y rendimiento móvil (lazy load, Draco, `<Suspense>`).
- [ ] Panel docente: progreso por cohorte, actividades más falladas, uso del mentor.
- [ ] Prueba con 5–10 estudiantes; ajustes.
- [ ] Despliegue: frontend en Vercel/Netlify, FastAPI + PostgreSQL en VPS con Docker (o Railway/Fly.io).
- [ ] Revisar el acceso sin contraseña antes de abrir al público (OTP por correo o contraseña).
- [ ] Aprobación final del docente antes de publicar.

---

## 7. Diseño de la capa de IA

### System prompt (esqueleto)
- Rol: mentor de histología y fisiología ósea, tono simple y directo (así lo pide el briefing).
- Reglas: responder en español, ajustar profundidad según `nivel`, citar el material del curso, admitir incertidumbre, no inventar bibliografía, no resolver las actividades por el estudiante sino guiar.
- Contexto inyectado: `ContextoPedagogico` serializado + chunks recuperados.
- Bloque estable primero para prompt caching; contexto variable al final.

### Herramientas que la IA puede invocar (tool use)
| Tool | Efecto en el frontend |
|---|---|
| `enfocar_estructura(id)` | Mueve la cámara o resalta la capa SVG |
| `ir_a_seccion(modulo, seccion)` | Navega |
| `abrir_actividad(id)` | Abre una actividad de refuerzo |

### Modelos
- Mentor, explicaciones y preguntas generadas: `claude-opus-5`, thinking adaptativo, streaming, `effort: "medium"`.
- Si el costo por estudiante resulta alto, medir primero y decidir después si alguna ruta baja a un modelo más económico.

### Control de costos
- Prompt caching del system prompt y del corpus frecuente.
- Límite de mensajes por sesión y por día.
- Registrar `input_tokens` / `output_tokens` por petición.

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Móvil al 100 % con 3D | 3D solo en mandíbula y células; todo lo demás en SVG. Probar en teléfono real desde la Fase 1. |
| Módulos 3, 4 y 5 muy densos | Motor de actividades genérico primero; el contenido se vuelca como JSON, no como código. |
| Contenido del docente llega tarde | Fase 0 arranca ya; Módulo 1 como piloto porque es el de menor densidad. |
| Alucinaciones en contenido médico | RAG obligatorio con citas, revisión docente de prompts, disclaimer. |
| Costo de tokens | Caching, límites, logging desde el día uno. |
| Ciclos de revisión sin cierre | `docs/revisiones.md` con fecha, versión revisada, cambios pedidos y aprobación explícita. |
| Acceso solo con número de identificación | Aceptado para la etapa piloto en entorno controlado. Antes del despliegue público se añade OTP por correo o contraseña. |
| TresJS tiene menos ejemplos que R3F | Portar patrones de `human-anatomy-viewer`; la lógica Three.js es idéntica. |

---

## 9. Primeros pasos inmediatos

1. Enviar al docente el formato de `docs/guion-por-modulo/m1.md` y pedir el material del Módulo 1.
2. Crear el monorepo y `docker-compose.yml` (F1-01, F1-02).
3. Congelar `ContextoPedagogico` (F1-09).
4. Descargar la mandíbula BodyParts3D y separar nodos en Blender (F0-04, F0-05).
