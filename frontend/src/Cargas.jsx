import { useRef, useState } from "react";
import "./Cargas.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const modules = [
  {
    name: "Catálogos",
    description: "Unidades hidrográficas, ubicaciones y lagunas",
    sheets: "3 hojas",
  },
  {
    name: "Cuantificación",
    description: "Área, capacidad, disponibilidad y nivel de agua",
    sheets: "1 hoja",
  },
  {
    name: "Monitoreo",
    description: "Puntos instalados y campañas de muestreo",
    sheets: "2 hojas",
  },
  {
    name: "Calidad",
    description: "Parámetros y resultados analíticos",
    sheets: "2 hojas",
  },
];

function UploadIcon({ name }) {
  const paths = {
    upload: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5" />
        <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6z" />
        <path d="M14 2v5h5M9 13h6M9 17h6" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 4.2 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
        <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
      </>
    ),
    close: <path d="m7 7 10 10M17 7 7 17" />,
  };

  return (
    <svg className="upload-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function CargasPage({ token, onSessionExpired }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function selectFile(nextFile) {
    setError("");
    setResult(null);

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
      setFile(null);
      setError("Selecciona un archivo Excel con extensión .xlsx.");
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("El archivo supera el límite máximo de 15 MB.");
      return;
    }

    if (nextFile.size === 0) {
      setFile(null);
      setError("El archivo seleccionado está vacío.");
      return;
    }

    setFile(nextFile);
  }

  function clearFile() {
    setFile(null);
    setError("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  async function importExcel() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("archivo", file);

      const response = await fetch(`${API_BASE}/cargas/excel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        onSessionExpired?.();
        throw new Error("La sesión expiró. Inicia sesión nuevamente.");
      }

      if (!response.ok) {
        throw new Error(
          responseData.detalle ||
            responseData.mensaje ||
            "El archivo no pudo importarse.",
        );
      }

      setResult(responseData);
    } catch (requestError) {
      console.error(requestError);
      setError(
        requestError.message ||
          "No se pudo conectar con el backend. Comprueba que esté encendido.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="upload-page">
      <section className="upload-grid">
        <article className="panel upload-main-panel">
          <div className="upload-heading">
            <div className="upload-heading-icon"><UploadIcon name="upload" /></div>
            <div>
              <p className="eyebrow">Importación centralizada</p>
              <h2>Cargar base de datos</h2>
              <p>Selecciona el Excel que conserva la estructura oficial de la plataforma.</p>
            </div>
          </div>

          <input
            ref={inputRef}
            className="upload-hidden-input"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />

          {!file ? (
            <button
              className={`upload-dropzone ${dragging ? "dragging" : ""}`}
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <span className="upload-drop-icon"><UploadIcon name="upload" /></span>
              <strong>Arrastra tu archivo Excel aquí</strong>
              <span>o haz clic para seleccionarlo desde tu computadora</span>
              <small>Únicamente archivos .xlsx · Tamaño máximo 15 MB</small>
            </button>
          ) : (
            <div className="upload-file-card">
              <span className="upload-file-icon"><UploadIcon name="file" /></span>
              <div>
                <strong>{file.name}</strong>
                <span>{formatFileSize(file.size)} · Archivo Excel</span>
              </div>
              <span className="upload-file-ready"><UploadIcon name="check" /> Listo</span>
              <button type="button" onClick={clearFile} aria-label="Quitar archivo">
                <UploadIcon name="close" />
              </button>
            </div>
          )}

          {error && (
            <div className="upload-message upload-error" role="alert">
              <UploadIcon name="alert" />
              <div>
                <strong>No se pudo completar la carga</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {result?.ok && (
            <div className="upload-success">
              <div className="upload-success-heading">
                <span><UploadIcon name="check" /></span>
                <div>
                  <strong>Importación completada</strong>
                  <p>{result.mensaje}</p>
                </div>
              </div>

              <div className="upload-result-grid">
                {result.modulos?.map((module) => (
                  <div key={module.modulo}>
                    <UploadIcon name="check" />
                    <span>{module.modulo}</span>
                    <strong>{module.estado}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="upload-action-row">
            <div>
              <UploadIcon name="database" />
              <p>
                Los registros existentes se actualizarán y los nuevos se agregarán.
                <strong> La importación no elimina información.</strong>
              </p>
            </div>
            <button
              className="upload-submit"
              type="button"
              disabled={!file || loading}
              onClick={importExcel}
            >
              {loading ? <span className="upload-spinner" /> : <UploadIcon name="upload" />}
              {loading ? "Procesando Excel…" : "Importar archivo"}
            </button>
          </div>
        </article>

        <aside className="panel upload-guide-panel">
          <p className="eyebrow">Antes de comenzar</p>
          <h2>Estructura esperada</h2>
          <p className="upload-guide-intro">
            El Excel debe mantener los nombres de hojas y columnas utilizados por la base oficial.
          </p>

          <div className="upload-module-list">
            {modules.map((module, index) => (
              <div className="upload-module" key={module.name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{module.name}</strong>
                  <p>{module.description}</p>
                </div>
                <small>{module.sheets}</small>
              </div>
            ))}
          </div>

          <div className="upload-guide-note">
            <UploadIcon name="alert" />
            <p>
              No cambies los identificadores, nombres de hojas ni encabezados. Si falta algún
              campo obligatorio, la plataforma rechazará el archivo y mostrará el motivo.
            </p>
          </div>
        </aside>
      </section>

      <section className="panel upload-process-panel">
        <div>
          <p className="eyebrow">Proceso protegido</p>
          <h2>¿Qué sucede durante la importación?</h2>
        </div>
        <ol className="upload-steps">
          <li><span>1</span><div><strong>Recepción</strong><p>Se valida la extensión y el tamaño.</p></div></li>
          <li><span>2</span><div><strong>Lectura</strong><p>Se comprueban hojas y columnas.</p></div></li>
          <li><span>3</span><div><strong>Actualización</strong><p>Los módulos se procesan en orden.</p></div></li>
          <li><span>4</span><div><strong>Resultado</strong><p>Se informa el estado de cada módulo.</p></div></li>
        </ol>
      </section>
    </div>
  );
}

export default CargasPage;
