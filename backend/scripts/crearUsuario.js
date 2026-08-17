const path = require("path");
const bcrypt = require("bcryptjs");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});

const pool = require("../db");

const [nombreArgument, correoArgument, roleArgument = "consulta"] = process.argv.slice(2);
const name = String(nombreArgument || "").trim();
const email = String(correoArgument || "").trim().toLowerCase();
const role = String(roleArgument || "").trim().toLowerCase();
const password = String(process.env.USUARIO_PASSWORD || "");

async function createUser() {
  if (!name || !email) {
    throw new Error(
      'Uso: node scripts/crearUsuario.js "Nombre" correo@dominio.com administrador|consulta',
    );
  }

  if (!email.includes("@")) {
    throw new Error("El correo indicado no es válido");
  }

  if (!['administrador', 'consulta'].includes(role)) {
    throw new Error('El rol debe ser "administrador" o "consulta"');
  }

  if (password.length < 8) {
    throw new Error(
      "La contraseña debe tener al menos 8 caracteres y enviarse mediante USUARIO_PASSWORD",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `
      INSERT INTO usuarios (
        nombre,
        correo,
        password_hash,
        rol,
        activo
      )
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (correo) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        password_hash = EXCLUDED.password_hash,
        rol = EXCLUDED.rol,
        activo = TRUE,
        fecha_actualizacion = NOW()
      RETURNING id_usuario, nombre, correo, rol, activo
    `,
    [name, email, passwordHash, role],
  );

  console.log("Usuario guardado correctamente:");
  console.table(result.rows);
}

createUser()
  .catch((error) => {
    console.error("No se pudo crear el usuario:");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
