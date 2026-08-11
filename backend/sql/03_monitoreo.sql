CREATE TABLE IF NOT EXISTS puntos_monitoreo (
  id_punto VARCHAR(10) PRIMARY KEY,
  id_laguna VARCHAR(10) NOT NULL,
  codigo_punto VARCHAR(30) NOT NULL UNIQUE,
  nombre_punto VARCHAR(120) NOT NULL,

  tipo_punto VARCHAR(30) NOT NULL
    CHECK (tipo_punto IN ('Afluente', 'Efluente', 'Centro')),

  latitud_decimal NUMERIC(9,6) NOT NULL
    CHECK (latitud_decimal BETWEEN -90 AND 90),

  longitud_decimal NUMERIC(9,6) NOT NULL
    CHECK (longitud_decimal BETWEEN -180 AND 180),

  altitud_msnm INTEGER
    CHECK (altitud_msnm >= 0),

  estado_punto VARCHAR(30) NOT NULL DEFAULT 'Activo'
    CHECK (
      estado_punto IN ('Activo', 'Mantenimiento', 'Inactivo')
    ),

  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_punto_laguna
    FOREIGN KEY (id_laguna)
    REFERENCES lagunas(id_laguna)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS campanas_monitoreo (
  id_campana VARCHAR(12) PRIMARY KEY,
  id_punto VARCHAR(10) NOT NULL,
  fecha_muestreo DATE NOT NULL,

  temporada VARCHAR(20) NOT NULL
    CHECK (
      temporada IN ('Lluvias', 'Seca', 'Transición')
    ),

  responsable_muestreo VARCHAR(120) NOT NULL,
  laboratorio VARCHAR(150) NOT NULL,
  observaciones TEXT,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_campana_punto
    FOREIGN KEY (id_punto)
    REFERENCES puntos_monitoreo(id_punto)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT uq_punto_fecha_muestreo
    UNIQUE (id_punto, fecha_muestreo)
);

CREATE INDEX IF NOT EXISTS idx_puntos_laguna
  ON puntos_monitoreo(id_laguna);

CREATE INDEX IF NOT EXISTS idx_campanas_punto
  ON campanas_monitoreo(id_punto);

CREATE INDEX IF NOT EXISTS idx_campanas_fecha
  ON campanas_monitoreo(fecha_muestreo);