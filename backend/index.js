const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");
const lagunasRoutes = require("./routes/lagunas.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    mensaje: "API de la Plataforma de Lagunas funcionando",
  });
});

app.get("/health/db", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        current_database() AS base_datos,
        current_user AS usuario,
        NOW() AS fecha
    `);

    res.status(200).json({
      ok: true,
      mensaje: "Backend conectado con PostgreSQL",
      conexion: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error de PostgreSQL:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "No se pudo conectar con PostgreSQL",
    });
  }
});
app.use("/api/lagunas", lagunasRoutes);
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});