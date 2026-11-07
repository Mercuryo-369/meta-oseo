-- Esquema de la API del OVA en D1 (SQLite). Equivale a las tres migraciones de Alembic de
-- services/api (esquema inicial, certificado con instantánea, mensajes del mentor).
-- Convenciones: fechas en texto ISO 8601 UTC con sufijo Z (`2026-09-23T20:00:00Z`), booleanos 0/1,
-- JSON en texto. Las columnas de enumeración son texto; la validación la hace el Worker.

CREATE TABLE achievements (
  codigo TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  modulo INTEGER
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  tipo_identificacion TEXT NOT NULL,
  numero_identificacion TEXT NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'pregrado',
  rol TEXT NOT NULL DEFAULT 'estudiante',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX uq_users_identificacion ON users (tipo_identificacion, numero_identificacion);

CREATE TABLE activity_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  modulo INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  puntaje INTEGER NOT NULL,
  intentos INTEGER NOT NULL,
  completada INTEGER NOT NULL,
  detalle TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX ix_activity_results_user_activity ON activity_results (user_id, activity_id);

CREATE TABLE progress_modulos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  modulo INTEGER NOT NULL,
  seccion_actual TEXT,
  completado INTEGER NOT NULL DEFAULT 0,
  tiempo_total_seg INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  CONSTRAINT uq_progress_modulos_user_modulo UNIQUE (user_id, modulo)
);

CREATE TABLE user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  codigo TEXT NOT NULL REFERENCES achievements (codigo),
  obtenido_en TEXT NOT NULL,
  CONSTRAINT uq_user_achievements_user_codigo UNIQUE (user_id, codigo)
);

CREATE TABLE usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX ix_usage_events_created_at ON usage_events (created_at);
CREATE INDEX ix_usage_events_user_id ON usage_events (user_id);

CREATE TABLE certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  tipo_identificacion TEXT NOT NULL,
  numero_identificacion TEXT NOT NULL,
  puntaje_total INTEGER NOT NULL,
  puntaje_obligatorias INTEGER,
  puntaje_maximo INTEGER,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX ix_certificates_codigo ON certificates (codigo);
CREATE UNIQUE INDEX ix_certificates_user_id ON certificates (user_id);

CREATE TABLE chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  modulo INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX ix_chat_sessions_user_id ON chat_sessions (user_id);

CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  model TEXT,
  citas TEXT,
  valoracion INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX ix_chat_messages_session_id ON chat_messages (session_id);

-- Catálogo de logros (Fase 1): completar el módulo N otorga el logro N. Corregir un texto es
-- cambiarlo aquí (o en una migración posterior con ON CONFLICT DO UPDATE).
INSERT INTO achievements (codigo, nombre, descripcion, modulo) VALUES
  ('primer_hueso', 'Primer hueso', 'Completaste el módulo 1', 1),
  ('celula_por_celula', 'Célula por célula', 'Completaste el módulo 2', 2),
  ('constructor', 'Constructor', 'Completaste el módulo 3', 3),
  ('mineralizador', 'Mineralizador', 'Completaste el módulo 4', 4),
  ('remodelador', 'Remodelador', 'Completaste el módulo 5', 5),
  ('cronista', 'Cronista', 'Completaste el módulo 6', 6);
