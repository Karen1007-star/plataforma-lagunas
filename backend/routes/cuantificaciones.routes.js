const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/laguna/:idLaguna", async (req, res) => {
  try {
    const { idLaguna } = req.params;

    const resultado = await pool.query(
      `
        SELECT
        c.id_cuantificacion,

        TO_CHAR(
            c.fecha_medicion,
            'YYYY-MM-DD'
        ) AS fecha_medicion,

        c.area_total_ha::DOUBLE PRECISION
            AS area_total_ha,

        c.porcentaje_area_humeda::DOUBLE PRECISION
            AS porcentaje_area_humeda,

        c.area_humeda_ha::DOUBLE PRECISION
            AS area_humeda_ha,

        c.area_seca_ha::DOUBLE PRECISION
            AS area_seca_ha,

        c.capacidad_max_hm3::DOUBLE PRECISION
            AS capacidad_max_hm3,

        c.porcentaje_disponible::DOUBLE PRECISION
            AS porcentaje_disponible,

        c.volumen_disponible_hm3::DOUBLE PRECISION
            AS volumen_disponible_hm3,

        c.nivel_agua_m::DOUBLE PRECISION
            AS nivel_agua_m,

        c.fuente_dato,
        l.id_laguna,
        l.codigo_laguna,
        l.nombre_laguna
        
        FROM cuantificaciones AS c
        INNER JOIN lagunas AS l
          ON l.id_laguna = c.id_laguna
        WHERE c.id_laguna = $1
        ORDER BY c.fecha_medicion ASC
      `,
      [idLaguna]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "No se encontraron mediciones para esta laguna",
      });
    }

    res.status(200).json({
      ok: true,
      total: resultado.rowCount,
      laguna: {
        id: resultado.rows[0].id_laguna,
        codigo: resultado.rows[0].codigo_laguna,
        nombre: resultado.rows[0].nombre_laguna,
      },
      datos: resultado.rows,
    });
  } catch (error) {
    console.error("Error al consultar cuantificaciones:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "No se pudieron obtener las cuantificaciones",
    });
  }
});

module.exports = router;