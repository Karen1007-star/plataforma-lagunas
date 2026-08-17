CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'consulta',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_rol_valido
    CHECK (rol IN ('administrador', 'consulta'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_correo_lower
  ON usuarios (LOWER(correo));
