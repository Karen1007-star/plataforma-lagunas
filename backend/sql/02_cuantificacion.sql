CREATE TABLE IF NOT EXISTS cuantificaciones (
  id_cuantificacion VARCHAR(15) PRIMARY KEY,
  id_laguna VARCHAR(10) NOT NULL,
  fecha_medicion DATE NOT NULL,

  area_total_ha NUMERIC(12,2) NOT NULL
    CHECK (area_total_ha >= 0),

  porcentaje_area_humeda NUMERIC(7,6) NOT NULL
    CHECK (porcentaje_area_humeda BETWEEN 0 AND 1),

  area_humeda_ha NUMERIC(12,2)
    GENERATED ALWAYS AS (
      ROUND(area_total_ha * porcentaje_area_humeda, 2)
    ) STORED,

  area_seca_ha NUMERIC(12,2)
    GENERATED ALWAYS AS (
      ROUND(area_total_ha - (area_total_ha * porcentaje_area_humeda), 2)
    ) STORED,

  capacidad_max_hm3 NUMERIC(12,3) NOT NULL
    CHECK (capacidad_max_hm3 >= 0),

  porcentaje_disponible NUMERIC(7,6) NOT NULL
    CHECK (porcentaje_disponible BETWEEN 0 AND 1),

  volumen_disponible_hm3 NUMERIC(12,3)
    GENERATED ALWAYS AS (
      ROUND(capacidad_max_hm3 * porcentaje_disponible, 3)
    ) STORED,

  nivel_agua_m NUMERIC(10,2)
    CHECK (nivel_agua_m >= 0),

  fuente_dato VARCHAR(150),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_cuantificacion_laguna
    FOREIGN KEY (id_laguna)
    REFERENCES lagunas(id_laguna)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT uq_laguna_fecha_medicion
    UNIQUE (id_laguna, fecha_medicion)
);

CREATE INDEX IF NOT EXISTS idx_cuantificaciones_laguna
  ON cuantificaciones(id_laguna);

CREATE INDEX IF NOT EXISTS idx_cuantificaciones_fecha
  ON cuantificaciones(fecha_medicion);