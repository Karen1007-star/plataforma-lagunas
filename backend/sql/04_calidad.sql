CREATE TABLE IF NOT EXISTS parametros_calidad (
  id_parametro VARCHAR(20) PRIMARY KEY,
  codigo_parametro VARCHAR(20) NOT NULL UNIQUE,
  nombre_parametro VARCHAR(100) NOT NULL,
  unidad_medida VARCHAR(50) NOT NULL,

  limite_min NUMERIC(14, 4),
  limite_max NUMERIC(14, 4),

  tipo_limite VARCHAR(20) NOT NULL
    CHECK (tipo_limite IN ('Rango', 'Mínimo', 'Máximo')),

  categoria VARCHAR(50) NOT NULL,
  metodo_analitico VARCHAR(120),

  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (
    limite_min IS NOT NULL
    OR limite_max IS NOT NULL
  ),

  CHECK (
    limite_min IS NULL
    OR limite_max IS NULL
    OR limite_min <= limite_max
  )
);

CREATE TABLE IF NOT EXISTS resultados_calidad (
  id_resultado VARCHAR(20) PRIMARY KEY,

  id_campana VARCHAR(20) NOT NULL
    REFERENCES campanas_monitoreo(id_campana)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  id_parametro VARCHAR(20) NOT NULL
    REFERENCES parametros_calidad(id_parametro)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  valor_medido NUMERIC(14, 4) NOT NULL
    CHECK (valor_medido >= 0),

  limite_min_aplicado NUMERIC(14, 4),
  limite_max_aplicado NUMERIC(14, 4),

  estado_resultado VARCHAR(30)
    GENERATED ALWAYS AS (
      CASE
        WHEN
          (
            limite_min_aplicado IS NULL
            OR valor_medido >= limite_min_aplicado
          )
          AND
          (
            limite_max_aplicado IS NULL
            OR valor_medido <= limite_max_aplicado
          )
        THEN 'Dentro de rango'
        ELSE 'Fuera de rango'
      END
    ) STORED,

  metodo_analitico VARCHAR(120),
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_resultado_campana_parametro
    UNIQUE (id_campana, id_parametro),

  CHECK (
    limite_min_aplicado IS NULL
    OR limite_max_aplicado IS NULL
    OR limite_min_aplicado <= limite_max_aplicado
  )
);

CREATE INDEX IF NOT EXISTS idx_resultados_calidad_campana
  ON resultados_calidad(id_campana);

CREATE INDEX IF NOT EXISTS idx_resultados_calidad_parametro
  ON resultados_calidad(id_parametro);

CREATE INDEX IF NOT EXISTS idx_resultados_calidad_estado
  ON resultados_calidad(estado_resultado);