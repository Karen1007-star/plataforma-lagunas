const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/laguna/:idLaguna", async (req, res) => {
  try {
    const { idLaguna } = req.params;

    const resultadoLaguna = await pool.query(
      `
        SELECT
          id_laguna,
          codigo_laguna,
          nombre_laguna
        FROM lagunas
        WHERE id_laguna = $1
      `,
      [idLaguna]
    );

    if (resultadoLaguna.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "La laguna indicada no existe",
      });
    }

    const resultado = await pool.query(
      `
        SELECT
          p.id_punto,
          p.codigo_punto,
          p.nombre_punto,
          p.tipo_punto,
          p.latitud_decimal::DOUBLE PRECISION AS latitud_decimal,
          p.longitud_decimal::DOUBLE PRECISION AS longitud_decimal,
          p.altitud_msnm::DOUBLE PRECISION AS altitud_msnm,
          p.estado_punto,

          c.id_campana,
          TO_CHAR(c.fecha_muestreo, 'YYYY-MM-DD') AS fecha_muestreo,
          c.temporada,
          c.responsable_muestreo,
          c.laboratorio,
          c.observaciones

        FROM puntos_monitoreo AS p
        LEFT JOIN campanas_monitoreo AS c
          ON c.id_punto = p.id_punto
        WHERE p.id_laguna = $1
        ORDER BY p.codigo_punto ASC, c.fecha_muestreo ASC
      `,
      [idLaguna]
    );

    const puntosMap = new Map();
    let totalCampanas = 0;

    for (const fila of resultado.rows) {
      if (!puntosMap.has(fila.id_punto)) {
        puntosMap.set(fila.id_punto, {
          id_punto: fila.id_punto,
          codigo_punto: fila.codigo_punto,
          nombre_punto: fila.nombre_punto,
          tipo_punto: fila.tipo_punto,
          latitud_decimal: fila.latitud_decimal,
          longitud_decimal: fila.longitud_decimal,
          altitud_msnm: fila.altitud_msnm,
          estado_punto: fila.estado_punto,
          campanas: [],
        });
      }

      if (fila.id_campana) {
        puntosMap.get(fila.id_punto).campanas.push({
          id_campana: fila.id_campana,
          fecha_muestreo: fila.fecha_muestreo,
          temporada: fila.temporada,
          responsable_muestreo: fila.responsable_muestreo,
          laboratorio: fila.laboratorio,
          observaciones: fila.observaciones,
        });

        totalCampanas++;
      }
    }

    const laguna = resultadoLaguna.rows[0];
    const puntos = Array.from(puntosMap.values());

    res.status(200).json({
      ok: true,
      laguna: {
        id: laguna.id_laguna,
        codigo: laguna.codigo_laguna,
        nombre: laguna.nombre_laguna,
      },
      total_puntos: puntos.length,
      total_campanas: totalCampanas,
      puntos,
    });
  } catch (error) {
    console.error("Error al consultar el monitoreo:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "No se pudieron obtener los datos de monitoreo",
    });
  }
});

module.exports = router;