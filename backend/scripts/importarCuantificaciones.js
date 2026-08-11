const path = require("path");
const fs = require("fs");
const { readSheet } = require("read-excel-file/node");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const pool = require("../db");

const rutaExcel = path.resolve(
  __dirname,
  "../../datos/Base_Simulada_Plataforma_Lagunas.xlsx"
);

async function leerCuantificaciones() {
  const filas = await readSheet(rutaExcel, "Cuantificacion");
  const encabezados = filas[3];

  const camposObligatorios = [
    "id_cuantificacion",
    "id_laguna",
    "fecha_medicion",
    "area_total_ha",
    "porcentaje_area_humeda",
    "capacidad_max_hm3",
    "porcentaje_disponible",
    "nivel_agua_m",
    "fuente_dato",
  ];

  if (!encabezados) {
    throw new Error("La hoja Cuantificacion no contiene encabezados en la fila 4.");
  }

  for (const campo of camposObligatorios) {
    if (!encabezados.includes(campo)) {
      throw new Error(`La hoja Cuantificacion no contiene el campo "${campo}".`);
    }
  }

  return filas
    .slice(4)
    .filter((fila) => fila[encabezados.indexOf("id_cuantificacion")])
    .map((fila) =>
      Object.fromEntries(
        encabezados.map((encabezado, posicion) => [encabezado, fila[posicion] ?? null])
      )
    );
}

async function importarCuantificaciones() {
  if (!fs.existsSync(rutaExcel)) {
    throw new Error(
      `No se encontró el Excel en:\n${rutaExcel}\n` +
        "Comprueba que esté dentro de la carpeta datos y conserve el nombre original."
    );
  }

  const mediciones = await leerCuantificaciones();

  if (mediciones.length !== 432) {
    throw new Error(
      `Se esperaban 432 mediciones, pero el Excel contiene ${mediciones.length}.`
    );
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    for (const medicion of mediciones) {
      await cliente.query(
        `
          INSERT INTO cuantificaciones (
            id_cuantificacion,
            id_laguna,
            fecha_medicion,
            area_total_ha,
            porcentaje_area_humeda,
            capacidad_max_hm3,
            porcentaje_disponible,
            nivel_agua_m,
            fuente_dato
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id_cuantificacion) DO UPDATE SET
            id_laguna = EXCLUDED.id_laguna,
            fecha_medicion = EXCLUDED.fecha_medicion,
            area_total_ha = EXCLUDED.area_total_ha,
            porcentaje_area_humeda = EXCLUDED.porcentaje_area_humeda,
            capacidad_max_hm3 = EXCLUDED.capacidad_max_hm3,
            porcentaje_disponible = EXCLUDED.porcentaje_disponible,
            nivel_agua_m = EXCLUDED.nivel_agua_m,
            fuente_dato = EXCLUDED.fuente_dato
        `,
        [
          medicion.id_cuantificacion,
          medicion.id_laguna,
            medicion.fecha_medicion instanceof Date
            ? medicion.fecha_medicion.toISOString().slice(0, 10)
            : medicion.fecha_medicion,
          medicion.area_total_ha,
          medicion.porcentaje_area_humeda,
          medicion.capacidad_max_hm3,
          medicion.porcentaje_disponible,
          medicion.nivel_agua_m,
          medicion.fuente_dato,
        ]
      );
    }

    await cliente.query("COMMIT");

    const resumen = await cliente.query(`
      SELECT
        COUNT(*)::INTEGER AS total_mediciones,
        MIN(fecha_medicion) AS primera_medicion,
        MAX(fecha_medicion) AS ultima_medicion,
        COUNT(DISTINCT id_laguna)::INTEGER AS total_lagunas
      FROM cuantificaciones
    `);

    console.log("Carga de cuantificaciones completada correctamente:");
    console.table(resumen.rows[0]);
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

importarCuantificaciones()
  .catch((error) => {
    console.error("No se pudieron importar las cuantificaciones:");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
