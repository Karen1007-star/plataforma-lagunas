const fs = require("fs");
const path = require("path");
const { readSheet } = require("read-excel-file/node");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const pool = require("../db");

const rutaExcel = process.env.RUTA_EXCEL
  ? path.resolve(process.env.RUTA_EXCEL)
  : path.resolve(
      __dirname,
      "../../datos/Base_Simulada_Plataforma_Lagunas.xlsx"
    );

async function leerHoja(nombreHoja, camposRequeridos) {
  const filas = await readSheet(rutaExcel, nombreHoja);

  if (!filas || filas.length < 5) {
    throw new Error(`La hoja ${nombreHoja} no contiene datos para importar`);
  }

  const encabezados = filas[3].map((valor) =>
    String(valor ?? "").trim()
  );

  for (const campo of camposRequeridos) {
    if (!encabezados.includes(campo)) {
      throw new Error(
        `Falta la columna ${campo} en la hoja ${nombreHoja}`
      );
    }
  }

  return filas
    .slice(4)
    .filter((fila) => fila.some((valor) => valor !== null && valor !== ""))
    .map((fila) =>
      Object.fromEntries(
        encabezados.map((encabezado, indice) => [
          encabezado,
          fila[indice] ?? null,
        ])
      )
    );
}

function fechaComoTexto(valor) {
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }

  return valor;
}

async function importarMonitoreo() {
  if (!fs.existsSync(rutaExcel)) {
    throw new Error(`No se encontró el archivo Excel en: ${rutaExcel}`);
  }

  const puntos = await leerHoja("Puntos_Monitoreo", [
    "id_punto",
    "id_laguna",
    "codigo_punto",
    "nombre_punto",
    "tipo_punto",
    "latitud_decimal",
    "longitud_decimal",
    "altitud_msnm",
    "estado_punto",
  ]);

  const campanas = await leerHoja("Campanas_Monitoreo", [
    "id_campana",
    "id_punto",
    "fecha_muestreo",
    "temporada",
    "responsable_muestreo",
    "laboratorio",
    "observaciones",
  ]);

  if (puntos.length === 0) {
    throw new Error("La hoja Puntos_Monitoreo no contiene registros para importar");
  }

  if (campanas.length === 0) {
    throw new Error("La hoja Campanas_Monitoreo no contiene registros para importar");
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    for (const punto of puntos) {
      await cliente.query(
        `
          INSERT INTO puntos_monitoreo (
            id_punto,
            id_laguna,
            codigo_punto,
            nombre_punto,
            tipo_punto,
            latitud_decimal,
            longitud_decimal,
            altitud_msnm,
            estado_punto
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id_punto) DO UPDATE SET
            id_laguna = EXCLUDED.id_laguna,
            codigo_punto = EXCLUDED.codigo_punto,
            nombre_punto = EXCLUDED.nombre_punto,
            tipo_punto = EXCLUDED.tipo_punto,
            latitud_decimal = EXCLUDED.latitud_decimal,
            longitud_decimal = EXCLUDED.longitud_decimal,
            altitud_msnm = EXCLUDED.altitud_msnm,
            estado_punto = EXCLUDED.estado_punto
        `,
        [
          punto.id_punto,
          punto.id_laguna,
          punto.codigo_punto,
          punto.nombre_punto,
          punto.tipo_punto,
          punto.latitud_decimal,
          punto.longitud_decimal,
          punto.altitud_msnm,
          punto.estado_punto,
        ]
      );
    }

    for (const campana of campanas) {
      await cliente.query(
        `
          INSERT INTO campanas_monitoreo (
            id_campana,
            id_punto,
            fecha_muestreo,
            temporada,
            responsable_muestreo,
            laboratorio,
            observaciones
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id_campana) DO UPDATE SET
            id_punto = EXCLUDED.id_punto,
            fecha_muestreo = EXCLUDED.fecha_muestreo,
            temporada = EXCLUDED.temporada,
            responsable_muestreo = EXCLUDED.responsable_muestreo,
            laboratorio = EXCLUDED.laboratorio,
            observaciones = EXCLUDED.observaciones
        `,
        [
          campana.id_campana,
          campana.id_punto,
          fechaComoTexto(campana.fecha_muestreo),
          campana.temporada,
          campana.responsable_muestreo,
          campana.laboratorio,
          campana.observaciones,
        ]
      );
    }

    await cliente.query("COMMIT");

    const resumen = await cliente.query(`
      SELECT
        (SELECT COUNT(*) FROM puntos_monitoreo)::INTEGER AS total_puntos,
        (SELECT COUNT(*) FROM campanas_monitoreo)::INTEGER AS total_campanas,
        TO_CHAR(
          (SELECT MIN(fecha_muestreo) FROM campanas_monitoreo),
          'YYYY-MM-DD'
        ) AS primera_campana,
        TO_CHAR(
          (SELECT MAX(fecha_muestreo) FROM campanas_monitoreo),
          'YYYY-MM-DD'
        ) AS ultima_campana
    `);

    console.log("Carga de monitoreo completada correctamente:");
    console.table(resumen.rows[0]);
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

importarMonitoreo()
  .catch((error) => {
    console.error("No se pudieron importar los datos de monitoreo:");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
