const express = require("express");
const pool = require("../db");

const router = express.Router();

// Catálogo de parámetros y límites de referencia.
router.get("/parametros", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id_parametro,
        codigo_parametro,
        nombre_parametro,
        unidad_medida,
        limite_min,
        limite_max,
        tipo_limite,
        categoria,
        metodo_analitico
      FROM parametros_calidad
      ORDER BY nombre_parametro
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar los parámetros de calidad:", error.message);
    res.status(500).json({ error: "No se pudieron consultar los parámetros de calidad" });
  }
});

// Indicadores generales para las tarjetas del módulo Calidad.
router.get("/resumen", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        COUNT(*)::INTEGER AS total_resultados,
        COUNT(DISTINCT r.id_parametro)::INTEGER AS total_parametros,
        COUNT(DISTINCT r.id_campana)::INTEGER AS total_campanas,
        COUNT(DISTINCT pm.id_punto)::INTEGER AS total_puntos,
        COUNT(DISTINCT pm.id_laguna)::INTEGER AS total_lagunas,
        COUNT(*) FILTER (
          WHERE r.estado_resultado = 'Dentro de rango'
        )::INTEGER AS dentro_de_rango,
        COUNT(*) FILTER (
          WHERE r.estado_resultado <> 'Dentro de rango'
        )::INTEGER AS fuera_de_rango,
        ROUND(
          100.0 * COUNT(*) FILTER (
            WHERE r.estado_resultado = 'Dentro de rango'
          ) / NULLIF(COUNT(*), 0),
          2
        )::DOUBLE PRECISION AS porcentaje_dentro_de_rango
      FROM resultados_calidad r
      INNER JOIN campanas_monitoreo c
        ON c.id_campana = r.id_campana
      INNER JOIN puntos_monitoreo pm
        ON pm.id_punto = c.id_punto
    `);

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al consultar el resumen de calidad:", error.message);
    res.status(500).json({ error: "No se pudo consultar el resumen de calidad" });
  }
});

// Cantidad y porcentaje de resultados por estado.
router.get("/estados", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        estado_resultado,
        COUNT(*)::INTEGER AS cantidad,
        ROUND(
          100.0 * COUNT(*) / SUM(COUNT(*)) OVER (),
          2
        )::DOUBLE PRECISION AS porcentaje
      FROM resultados_calidad
      GROUP BY estado_resultado
      ORDER BY cantidad DESC, estado_resultado
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar los estados de calidad:", error.message);
    res.status(500).json({ error: "No se pudieron consultar los estados de calidad" });
  }
});

// Resumen de calidad por laguna para tablas, gráficos y mapa.
router.get("/por-laguna", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        l.id_laguna,
        l.codigo_laguna,
        l.nombre_laguna,
        COUNT(r.id_resultado)::INTEGER AS total_resultados,
        COUNT(r.id_resultado) FILTER (
          WHERE r.estado_resultado = 'Dentro de rango'
        )::INTEGER AS dentro_de_rango,
        COUNT(r.id_resultado) FILTER (
          WHERE r.estado_resultado <> 'Dentro de rango'
        )::INTEGER AS fuera_de_rango,
        ROUND(
          100.0 * COUNT(r.id_resultado) FILTER (
            WHERE r.estado_resultado = 'Dentro de rango'
          ) / NULLIF(COUNT(r.id_resultado), 0),
          2
        )::DOUBLE PRECISION AS porcentaje_dentro_de_rango
      FROM lagunas l
      LEFT JOIN puntos_monitoreo pm
        ON pm.id_laguna = l.id_laguna
      LEFT JOIN campanas_monitoreo c
        ON c.id_punto = pm.id_punto
      LEFT JOIN resultados_calidad r
        ON r.id_campana = c.id_campana
      GROUP BY l.id_laguna, l.codigo_laguna, l.nombre_laguna
      ORDER BY l.nombre_laguna
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar la calidad por laguna:", error.message);
    res.status(500).json({ error: "No se pudo consultar la calidad por laguna" });
  }
});

// Resultados detallados. Todos los filtros son opcionales.
// Ejemplo: /resultados?id_laguna=LAG-001&id_parametro=PAR-001&estado=Dentro%20de%20rango
router.get("/resultados", async (req, res) => {
  const {
    id_laguna,
    id_parametro,
    estado,
    fecha_desde,
    fecha_hasta,
  } = req.query;

  const filtros = [];
  const valores = [];

  function agregarFiltro(condicion, valor) {
    valores.push(valor);
    filtros.push(`${condicion} $${valores.length}`);
  }

  if (id_laguna) {
    agregarFiltro("l.id_laguna =", id_laguna);
  }

  if (id_parametro) {
    agregarFiltro("r.id_parametro =", id_parametro);
  }

  if (estado) {
    agregarFiltro("r.estado_resultado =", estado);
  }

  if (fecha_desde) {
    agregarFiltro("c.fecha_muestreo >=", fecha_desde);
  }

  if (fecha_hasta) {
    agregarFiltro("c.fecha_muestreo <=", fecha_hasta);
  }

  const where = filtros.length > 0 ? `WHERE ${filtros.join(" AND ")}` : "";

  try {
    const resultado = await pool.query(
      `
        SELECT
          r.id_resultado,
          r.valor_medido,
          r.limite_min_aplicado,
          r.limite_max_aplicado,
          r.estado_resultado,
          r.metodo_analitico,
          p.id_parametro,
          p.codigo_parametro,
          p.nombre_parametro,
          p.unidad_medida,
          p.categoria,
          c.id_campana,
          c.fecha_muestreo,
          c.temporada,
          c.responsable_muestreo,
          c.laboratorio,
          pm.id_punto,
          pm.codigo_punto,
          pm.nombre_punto,
          pm.tipo_punto,
          l.id_laguna,
          l.codigo_laguna,
          l.nombre_laguna
        FROM resultados_calidad r
        INNER JOIN parametros_calidad p
          ON p.id_parametro = r.id_parametro
        INNER JOIN campanas_monitoreo c
          ON c.id_campana = r.id_campana
        INNER JOIN puntos_monitoreo pm
          ON pm.id_punto = c.id_punto
        INNER JOIN lagunas l
          ON l.id_laguna = pm.id_laguna
        ${where}
        ORDER BY
          c.fecha_muestreo DESC,
          l.nombre_laguna,
          p.nombre_parametro
      `,
      valores
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar los resultados de calidad:", error.message);
    res.status(500).json({ error: "No se pudieron consultar los resultados de calidad" });
  }
});

module.exports = router;
