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

async function importarCatalogos() {
  if (!fs.existsSync(rutaExcel)) {
    throw new Error(
      `No se encontró el Excel en:\n${rutaExcel}\n` +
        "Comprueba que el archivo esté dentro de la carpeta datos y conserve el nombre original."
    );
  }

  const unidades = await leerHoja(
    "Unidades_Hidrograficas",
    "id_unidad"
  );
  const ubicaciones = await leerHoja("Ubicaciones", "id_ubicacion");
  const lagunas = await leerHoja("Lagunas", "id_laguna");

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    for (const unidad of unidades) {
      await cliente.query(
        `
          INSERT INTO unidades_hidrograficas (
            id_unidad,
            codigo_unidad,
            nombre_unidad,
            vertiente,
            region_hidrografica,
            autoridad_administrativa_agua
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id_unidad) DO UPDATE SET
            codigo_unidad = EXCLUDED.codigo_unidad,
            nombre_unidad = EXCLUDED.nombre_unidad,
            vertiente = EXCLUDED.vertiente,
            region_hidrografica = EXCLUDED.region_hidrografica,
            autoridad_administrativa_agua = EXCLUDED.autoridad_administrativa_agua
        `,
        [
          unidad.id_unidad,
          String(unidad.codigo_unidad),
          unidad.nombre_unidad,
          unidad.vertiente,
          unidad.region_hidrografica,
          unidad.autoridad_administrativa_agua,
        ]
      );
    }

    for (const ubicacion of ubicaciones) {
      await cliente.query(
        `
          INSERT INTO ubicaciones (
            id_ubicacion,
            departamento,
            provincia,
            distrito,
            centro_poblado,
            latitud_decimal,
            longitud_decimal,
            altitud_msnm
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id_ubicacion) DO UPDATE SET
            departamento = EXCLUDED.departamento,
            provincia = EXCLUDED.provincia,
            distrito = EXCLUDED.distrito,
            centro_poblado = EXCLUDED.centro_poblado,
            latitud_decimal = EXCLUDED.latitud_decimal,
            longitud_decimal = EXCLUDED.longitud_decimal,
            altitud_msnm = EXCLUDED.altitud_msnm
        `,
        [
          ubicacion.id_ubicacion,
          ubicacion.departamento,
          ubicacion.provincia,
          ubicacion.distrito,
          ubicacion.centro_poblado,
          ubicacion.latitud_decimal,
          ubicacion.longitud_decimal,
          ubicacion.altitud_msnm,
        ]
      );
    }

    for (const laguna of lagunas) {
      await cliente.query(
        `
          INSERT INTO lagunas (
            id_laguna,
            codigo_laguna,
            nombre_laguna,
            id_ubicacion,
            id_unidad,
            tipo_laguna,
            origen,
            estado_operativo,
            area_total_ha,
            capacidad_max_hm3,
            responsable,
            fecha_registro
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id_laguna) DO UPDATE SET
            codigo_laguna = EXCLUDED.codigo_laguna,
            nombre_laguna = EXCLUDED.nombre_laguna,
            id_ubicacion = EXCLUDED.id_ubicacion,
            id_unidad = EXCLUDED.id_unidad,
            tipo_laguna = EXCLUDED.tipo_laguna,
            origen = EXCLUDED.origen,
            estado_operativo = EXCLUDED.estado_operativo,
            area_total_ha = EXCLUDED.area_total_ha,
            capacidad_max_hm3 = EXCLUDED.capacidad_max_hm3,
            responsable = EXCLUDED.responsable,
            fecha_registro = EXCLUDED.fecha_registro
        `,
        [
          laguna.id_laguna,
          laguna.codigo_laguna,
          laguna.nombre_laguna,
          laguna.id_ubicacion,
          laguna.id_unidad,
          laguna.tipo_laguna,
          laguna.origen,
          laguna.estado_operativo,
          laguna.area_total_ha,
          laguna.capacidad_max_hm3,
          laguna.responsable,
          laguna.fecha_registro,
        ]
      );
    }

    await cliente.query("COMMIT");

    const resumen = await cliente.query(`
      SELECT
        (SELECT COUNT(*) FROM unidades_hidrograficas)::INTEGER AS unidades,
        (SELECT COUNT(*) FROM ubicaciones)::INTEGER AS ubicaciones,
        (SELECT COUNT(*) FROM lagunas)::INTEGER AS lagunas
    `);

    console.log("Carga completada correctamente:");
    console.table(resumen.rows[0]);
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

importarCatalogos()
  .catch((error) => {
    console.error("No se pudieron importar los catálogos:");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
