-- Ajustes del OVA que el docente cambia desde su panel (pedido del usuario, 2026-11-07): por ahora
-- la configuración del proveedor de IA del mentor (`clave = 'mentor'`, `valor` JSON con la clave de
-- la API cifrada con SECRET_KEY). Tabla clave-valor para no migrar por cada ajuste nuevo.
CREATE TABLE ajustes (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
