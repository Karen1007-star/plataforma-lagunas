const jwt = require("jsonwebtoken");
const pool = require("../db");

function unauthorized(res, message = "Debes iniciar sesión para continuar") {
  return res.status(401).json({
    ok: false,
    mensaje: message,
  });
}

async function authenticate(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return unauthorized(res);
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      ok: false,
      mensaje: "La autenticación no está configurada en el servidor",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "plataforma-lagunas",
    });

    const result = await pool.query(
      `
        SELECT
          id_usuario,
          nombre,
          correo,
          rol,
          activo
        FROM usuarios
        WHERE id_usuario = $1
      `,
      [payload.sub],
    );

    const user = result.rows[0];

    if (!user || !user.activo) {
      return unauthorized(res, "La cuenta no está disponible");
    }

    req.user = {
      id: user.id_usuario,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return unauthorized(res, "La sesión expiró. Inicia sesión nuevamente.");
    }

    unauthorized(res, "La sesión no es válida");
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        ok: false,
        mensaje: "Tu perfil no tiene permiso para realizar esta acción",
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};
