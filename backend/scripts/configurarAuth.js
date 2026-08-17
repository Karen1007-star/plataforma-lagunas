const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env");

require("dotenv").config({
  path: envPath,
  quiet: true,
});

const pool = require("../db");

function ensureJwtSecret() {
  const currentContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";

  const configured = currentContent
    .split(/\r?\n/)
    .some((line) => line.startsWith("JWT_SECRET=") && line.slice(11).trim());

  if (configured) return false;

  const separator = currentContent && !currentContent.endsWith("\n") ? "\n" : "";
  const secret = crypto.randomBytes(64).toString("hex");
  fs.appendFileSync(envPath, `${separator}JWT_SECRET=${secret}\n`, "utf8");
  return true;
}

async function configureAuthentication() {
  const secretCreated = ensureJwtSecret();
  const sqlPath = path.resolve(__dirname, "../sql/05_usuarios.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  await pool.query(sql);

  console.log("Autenticación configurada correctamente.");
  console.log("Tabla usuarios: lista");
  console.log(`Clave local: ${secretCreated ? "creada" : "ya existente"}`);
  console.log("Reinicia el backend antes de probar el inicio de sesión.");
}

configureAuthentication()
  .catch((error) => {
    console.error("No se pudo configurar la autenticación:");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
