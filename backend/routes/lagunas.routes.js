const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        l.id_laguna,
        l.codigo_laguna,
        l.nombre_laguna,
        l.tipo_laguna,
        l.origen,
        l.estado_operativo,
        l.area_total_ha,
        l.capacidad_max_hm3,
        l.responsable,
        u.departamento,
        u.provincia,
        u.distrito,
        u.centro_poblado,
        u.latitud_decimal,
        u.longitud_decimal,
        u.altitud_msnm,
        uh.codigo_unidad,
        uh.nombre_unidad
      FROM lagunas AS l
      INNER JOIN ubicaciones AS u
        ON u.id_ubicacion = l.id_ubicacion
      INNER JOIN unidades_hidrograficas AS uh
        ON uh.id_unidad = l.id_unidad
      ORDER BY l.nombre_laguna ASC
    `);

    res.status(200).json({
      ok: true,
      total: resultado.rowCount,
      datos: resultado.rows,
    });
  } catch (error) {
    console.error("Error al consultar lagunas:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "No se pudieron obtener las lagunas",
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      `
        SELECT
          l.id_laguna,
          l.codigo_laguna,
          l.nombre_laguna,
          l.tipo_laguna,
          l.origen,
          l.estado_operativo,
          l.area_total_ha,
          l.capacidad_max_hm3,
          l.responsable,
          l.fecha_registro,
          u.departamento,
          u.provincia,
          u.distrito,
          u.centro_poblado,
          u.latitud_decimal,
          u.longitud_decimal,
          u.altitud_msnm,
          uh.codigo_unidad,
          uh.nombre_unidad
        FROM lagunas AS l
        INNER JOIN ubicaciones AS u
          ON u.id_ubicacion = l.id_ubicacion
        INNER JOIN unidades_hidrograficas AS uh
          ON uh.id_unidad = l.id_unidad
        WHERE l.id_laguna = $1
      `,
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Laguna no encontrada",
      });
    }

    res.status(200).json({
      ok: true,
      datos: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al consultar la laguna:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "No se pudo obtener la laguna",
    });
  }
});
module.exports = router;