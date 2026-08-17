const express = require("express");
const multer = require("multer");
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const { execFile } = require("child_process");
const { promisify } = require("util");

const router = express.Router();
const execFileAsync = promisify(execFile);

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const importers = [
  { module: "Catálogos", script: "importarCatalogos.js" },
  { module: "Cuantificación", script: "importarCuantificaciones.js" },
  { module: "Monitoreo", script: "importarMonitoreo.js" },
  { module: "Calidad", script: "importarCalidad.js" },
];

let uploadInProgress = false;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (extension !== ".xlsx") {
      const error = new Error("Solo se permiten archivos Excel con extensión .xlsx");
      error.statusCode = 400;
      return callback(error);
    }

    callback(null, true);
  },
});

function receiveExcel(req, res, next) {
  upload.single("archivo")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        ok: false,
        mensaje: "El archivo supera el límite permitido de 15 MB",
      });
    }

    res.status(error.statusCode || 400).json({
      ok: false,
      mensaje: error.message || "No se pudo recibir el archivo",
    });
  });
}

function lastErrorLine(value) {
  const lines = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.at(-1) || "La importación no pudo completarse";
}

async function runImporter(importer, excelPath) {
  const scriptPath = path.resolve(__dirname, "../scripts", importer.script);

  const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
    env: {
      ...process.env,
      RUTA_EXCEL: excelPath,
    },
    timeout: 180_000,
    maxBuffer: 2 * 1024 * 1024,
  });

  return {
    modulo: importer.module,
    estado: "completado",
    detalle: stdout.trim(),
  };
}

router.post("/excel", receiveExcel, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      mensaje: "Selecciona un archivo Excel para continuar",
    });
  }

  if (uploadInProgress) {
    return res.status(409).json({
      ok: false,
      mensaje: "Ya existe una carga en proceso. Espera a que termine antes de enviar otra.",
    });
  }

  let temporaryDirectory;
  uploadInProgress = true;

  try {
    temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "lagunas-carga-"));
    const excelPath = path.join(temporaryDirectory, "carga.xlsx");
    await fs.writeFile(excelPath, req.file.buffer);

    const results = [];

    for (const importer of importers) {
      results.push(await runImporter(importer, excelPath));
    }

    res.status(200).json({
      ok: true,
      mensaje: "El archivo fue validado e importado correctamente",
      archivo: req.file.originalname,
      modulos: results,
    });
  } catch (error) {
    console.error("Error al importar el Excel:", error.message);

    res.status(422).json({
      ok: false,
      mensaje: "El Excel no pudo importarse",
      detalle: lastErrorLine(error.stderr || error.message),
    });
  } finally {
    uploadInProgress = false;

    if (temporaryDirectory) {
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
});

module.exports = router;
