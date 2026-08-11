CREATE TABLE IF NOT EXISTS unidades_hidrograficas (
  id_unidad VARCHAR(10) PRIMARY KEY,
  codigo_unidad VARCHAR(20) NOT NULL UNIQUE,
  nombre_unidad VARCHAR(120) NOT NULL,
  vertiente VARCHAR(50),
  region_hidrografica VARCHAR(100),
  autoridad_administrativa_agua VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS ubicaciones (
  id_ubicacion VARCHAR(10) PRIMARY KEY,
  departamento VARCHAR(80) NOT NULL,
  provincia VARCHAR(80) NOT NULL,
  distrito VARCHAR(80) NOT NULL,
  centro_poblado VARCHAR(120),
  latitud_decimal NUMERIC(9,6) NOT NULL
    CHECK (latitud_decimal BETWEEN -90 AND 90),
  longitud_decimal NUMERIC(9,6) NOT NULL
    CHECK (longitud_decimal BETWEEN -180 AND 180),
  altitud_msnm INTEGER
    CHECK (altitud_msnm >= 0)
);

CREATE TABLE IF NOT EXISTS lagunas (
  id_laguna VARCHAR(10) PRIMARY KEY,
  codigo_laguna VARCHAR(30) NOT NULL UNIQUE,
  nombre_laguna VARCHAR(150) NOT NULL,
  id_ubicacion VARCHAR(10) NOT NULL,
  id_unidad VARCHAR(10) NOT NULL,
  tipo_laguna VARCHAR(50),
  origen VARCHAR(50),
  estado_operativo VARCHAR(30) NOT NULL DEFAULT 'Operativa',
  area_total_ha NUMERIC(12,2)
    CHECK (area_total_ha >= 0),
  capacidad_max_hm3 NUMERIC(12,3)
    CHECK (capacidad_max_hm3 >= 0),
  responsable VARCHAR(150),
  fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,

  CONSTRAINT fk_laguna_ubicacion
    FOREIGN KEY (id_ubicacion)
    REFERENCES ubicaciones(id_ubicacion)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_laguna_unidad
    FOREIGN KEY (id_unidad)
    REFERENCES unidades_hidrograficas(id_unidad)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ubicaciones_departamento
  ON ubicaciones(departamento);

CREATE INDEX IF NOT EXISTS idx_lagunas_ubicacion
  ON lagunas(id_ubicacion);

CREATE INDEX IF NOT EXISTS idx_lagunas_unidad
  ON lagunas(id_unidad);