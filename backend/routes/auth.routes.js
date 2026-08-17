const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/login", async (req, res) => {
  const correo = String(req.body?.correo || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!correo || !password) {
    return res.status(400).json({
      ok: false,
      mensaje: "Ingresa tu correo y contraseña",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      ok: false,
      mensaje: "La autenticación no está configurada en el servidor",
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          id_usuario,
          nombre,
          correo,
          password_hash,
          rol,
          activo
        FROM usuarios
        WHERE LOWER(correo) = $1
      `,
      [correo],
    );

    const user = result.rows[0];
    const validPassword = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!user || !validPassword || !user.activo) {
      return res.status(401).json({
        ok: false,
        mensaje: "Correo o contraseña incorrectos",
      });
    }

    const token = jwt.sign(
      {
        nombre: user.nombre,
        rol: user.rol,
      },
      process.env.JWT_SECRET,
      {
        subject: String(user.id_usuario),
        issuer: "plataforma-lagunas",
        expiresIn: "8h",
      },
    );

    res.status(200).json({
      ok: true,
      mensaje: "Inicio de sesión correcto",
      token,
      usuario: {
        id: user.id_usuario,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "No se pudo iniciar sesión",
    });
  }
});

router.get("/me", authenticate, (req, res) => {
  res.status(200).json({
    ok: true,
    usuario: req.user,
  });
});

module.exports = router;
