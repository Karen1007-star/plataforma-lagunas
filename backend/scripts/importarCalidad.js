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

async function leerHoja(nombreHoja, campoIdentificador) {
  const filas = await readSheet(rutaExcel, nombreHoja);
  const encabezados = filas[3];

  if (!encabezados || !encabezados.includes(campoIdentificador)) {
    throw new Error(
      `La hoja "${nombreHoja}" no contiene el campo "${campoIdentificador}" en la fila 4.`
    );
  }

  return filas
    .slice(4)
    .filter((fila) => {
      const posicionId = encabezados.indexOf(campoIdentificador);
      const identificador = fila[posicionId];
      return identificador !== null && String(identificador).trim() !== "";
    })
    .map((fila) =>
      Object.fromEntries(
        encabezados.map((encabezado, posicion) => [encabezado, fila[posicion] ?? null])
      )
    );
}

async function importarCalidad() {
  if (!fs.existsSync(rutaExcel)) {
    throw new Error(
      `No se encontró el Excel en:\n${rutaExcel}\n` +
        "Comprueba que el archivo esté dentro de la carpeta datos y conserve el nombre original."
    );
  }

  const parametros = await leerHoja("Parametros_Calidad", "id_parametro");
  const resultados = await leerHoja("Resultados_Calidad", "id_resultado");

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    for (const parametro of parametros) {
      await cliente.query(
        `
          INSERT INTO parametros_calidad (
            id_parametro,
            codigo_parametro,
            nombre_parametro,
            unidad_medida,
            limite_min,
            limite_max,
            tipo_limite,
            categoria,
            metodo_analitico
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id_parametro) DO UPDATE SET
            codigo_parametro = EXCLUDED.codigo_parametro,
            nombre_parametro = EXCLUDED.nombre_parametro,
            unidad_medida = EXCLUDED.unidad_medida,
            limite_min = EXCLUDED.limite_min,
            limite_max = EXCLUDED.limite_max,
            tipo_limite = EXCLUDED.tipo_limite,
            categoria = EXCLUDED.categoria,
            metodo_analitico = EXCLUDED.metodo_analitico
        `,
        [
          parametro.id_parametro,
          parametro.codigo_parametro,
          parametro.nombre_parametro,
          parametro.unidad_medida,
          parametro.limite_min,
          parametro.limite_max,
          parametro.tipo_limite,
          parametro.categoria,
          parametro.metodo_analitico,
        ]
      );
    }

    for (const resultado of resultados) {
      await cliente.query(
        `
          INSERT INTO resultados_calidad (
            id_resultado,
            id_campana,
            id_parametro,
            valor_medido,
            limite_min_aplicado,
            limite_max_aplicado,
            metodo_analitico
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id_resultado) DO UPDATE SET
            id_campana = EXCLUDED.id_campana,
            id_parametro = EXCLUDED.id_parametro,
            valor_medido = EXCLUDED.valor_medido,
            limite_min_aplicado = EXCLUDED.limite_min_aplicado,
            limite_max_aplicado = EXCLUDED.limite_max_aplicado,
            metodo_analitico = EXCLUDED.metodo_analitico
        `,
        [
          resultado.id_resultado,
          resultado.id_campana,
          resultado.id_parametro,
          resultado.valor_medido,
          resultado.limite_min_aplicado,
          resultado.limite_max_aplicado,
          resultado.metodo_analitico,
        ]
      );
    }

    await cliente.query("COMMIT");

    const resumen = await cliente.query(`
      SELECT
        (SELECT COUNT(*) FROM parametros_calidad)::INTEGER AS parametros,
        (SELECT COUNT(*) FROM resultados_calidad)::INTEGER AS resultados
    `);

    console.log("Carga de calidad completada correctamente:");
    console.table(resumen.rows[0]);
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

importarCalidad()
  .catch((error) => {
    console.error("No se pudieron importar los datos de calidad:");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
