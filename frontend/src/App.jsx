import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const navigation = [
  { label: "Vista general", icon: "grid" },
  { label: "Lagunas", icon: "lake" },
  { label: "Cuantificación", icon: "chart" },
  { label: "Monitoreo", icon: "pin" },
  { label: "Calidad", icon: "shield", active: true },
];

const icons = {
  grid: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  ),
  lake: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 15c2.5-2 4.5-2 7 0s4.5 2 7 0 3.5-2 4-1" />
      <path d="M3 19c2.5-2 4.5-2 7 0s4.5 2 7 0 3.5-2 4-1" />
      <path d="M12 3 7 11h10l-5-8Z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  ),
  flask: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3h6" />
      <path d="M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
      <path d="M7.5 15h9" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M9 10h6M9 14h6M9 18h3" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.3 4.2 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  ),
};

function Icon({ name }) {
  return <span className="icon">{icons[name]}</span>;
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-PE").format(Number(value || 0));
}

function MetricCard({ icon, label, value, note, tone }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon name={icon} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
    </article>
  );
}

function App() {
  const [summary, setSummary] = useState(null);
  const [states, setStates] = useState([]);
  const [lagoons, setLagoons] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const endpoints = ["resumen", "estados", "por-laguna"];
      const responses = await Promise.all(
        endpoints.map((endpoint) => fetch(`${API_BASE}/calidad/${endpoint}`)),
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("La API respondió con un error");
      }

      const [summaryData, statesData, lagoonsData] = await Promise.all(
        responses.map((response) => response.json()),
      );

      setSummary(summaryData);
      setStates(statesData);
      setLagoons(lagoonsData);
      setUpdatedAt(new Date());
    } catch (requestError) {
      console.error(requestError);
      setError(
        "No pudimos conectar con el backend. Comprueba que esté encendido en el puerto 3000.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredLagoons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...lagoons]
      .filter((lagoon) => {
        if (!normalizedQuery) return true;
        return `${lagoon.nombre_laguna} ${lagoon.codigo_laguna}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => Number(b.fuera_de_rango) - Number(a.fuera_de_rango));
  }, [lagoons, query]);

  const withinPercentage = Number(summary?.porcentaje_dentro_de_rango || 0);
  const outPercentage = Math.max(0, 100 - withinPercentage);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>Lagunas</strong>
            <small>Gestión hídrica</small>
          </div>
        </div>

        <nav aria-label="Navegación principal">
          <p className="nav-label">Plataforma</p>
          {navigation.map((item) => (
            <button
              type="button"
              className={item.active ? "nav-item active" : "nav-item"}
              key={item.label}
              title={item.active ? item.label : `${item.label} — próximamente`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.active && <i />}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <Icon name="shield" />
          <div>
            <strong>Datos simulados</strong>
            <span>Entorno de desarrollo</span>
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Módulo ambiental</p>
            <h1>Calidad del agua</h1>
            <p className="subtitle">
              Seguimiento de parámetros, resultados y alertas por laguna.
            </p>
          </div>

          <div className="topbar-actions">
            <div className="live-status">
              <span />
              {updatedAt
                ? `Actualizado ${updatedAt.toLocaleTimeString("es-PE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Esperando datos"}
            </div>
            <div className="avatar" aria-label="Usuario administrador">
              KA
            </div>
          </div>
        </header>

        {error && (
          <section className="error-banner" role="alert">
            <Icon name="alert" />
            <div>
              <strong>No se pudieron cargar los indicadores</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={loadDashboard}>
              Reintentar
            </button>
          </section>
        )}

        {loading ? (
          <section className="loading-panel">
            <div className="loader" />
            <p>Cargando información de calidad…</p>
          </section>
        ) : (
          <>
            <section className="metrics-grid" aria-label="Indicadores de calidad">
              <MetricCard
                icon="clipboard"
                label="Resultados analizados"
                value={formatNumber(summary?.total_resultados)}
                note={`${formatNumber(summary?.total_campanas)} campañas`}
                tone="blue"
              />
              <MetricCard
                icon="flask"
                label="Parámetros evaluados"
                value={formatNumber(summary?.total_parametros)}
                note={`${formatNumber(summary?.total_puntos)} puntos de monitoreo`}
                tone="purple"
              />
              <MetricCard
                icon="check"
                label="Dentro del rango"
                value={`${withinPercentage.toFixed(2)} %`}
                note={`${formatNumber(summary?.dentro_de_rango)} resultados conformes`}
                tone="green"
              />
              <MetricCard
                icon="alert"
                label="Fuera del rango"
                value={formatNumber(summary?.fuera_de_rango)}
                note={`${outPercentage.toFixed(2)} % del total`}
                tone="orange"
              />
            </section>

            <section className="content-grid">
              <article className="panel quality-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Distribución general</p>
                    <h2>Estado de los resultados</h2>
                  </div>
                  <span className="panel-tag">{formatNumber(summary?.total_lagunas)} lagunas</span>
                </div>

                <div className="quality-content">
                  <div
                    className="donut"
                    style={{ "--within": `${withinPercentage * 3.6}deg` }}
                    aria-label={`${withinPercentage.toFixed(2)} por ciento dentro de rango`}
                  >
                    <div>
                      <strong>{withinPercentage.toFixed(1)}%</strong>
                      <span>conforme</span>
                    </div>
                  </div>

                  <div className="legend">
                    {states.map((state) => {
                      const isWithin = state.estado_resultado === "Dentro de rango";
                      return (
                        <div className="legend-row" key={state.estado_resultado}>
                          <span className={isWithin ? "legend-dot green" : "legend-dot orange"} />
                          <div>
                            <p>{state.estado_resultado}</p>
                            <strong>{formatNumber(state.cantidad)}</strong>
                          </div>
                          <span>{Number(state.porcentaje).toFixed(2)} %</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="quality-message">
                  <Icon name="shield" />
                  <p>
                    <strong>Lectura general favorable.</strong> Nueve de cada diez mediciones se
                    encuentran dentro de los rangos de referencia simulados.
                  </p>
                </div>
              </article>

              <article className="panel alert-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Atención prioritaria</p>
                    <h2>Alertas detectadas</h2>
                  </div>
                  <div className="alert-count">{formatNumber(summary?.fuera_de_rango)}</div>
                </div>

                <div className="alert-visual">
                  <div className="wave wave-one" />
                  <div className="wave wave-two" />
                  <div className="alert-symbol">
                    <Icon name="alert" />
                  </div>
                </div>

                <p className="alert-copy">
                  Resultados que requieren revisión técnica o seguimiento en una próxima campaña.
                </p>

                <div className="progress-line">
                  <span style={{ width: `${outPercentage}%` }} />
                </div>
                <div className="progress-labels">
                  <span>Incidencia general</span>
                  <strong>{outPercentage.toFixed(2)} %</strong>
                </div>
              </article>
            </section>

            <section className="panel table-panel">
              <div className="panel-heading table-heading">
                <div>
                  <p className="eyebrow">Comparativo territorial</p>
                  <h2>Calidad por laguna</h2>
                </div>

                <label className="search-box">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar laguna o código"
                    type="search"
                  />
                </label>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Laguna</th>
                      <th>Código</th>
                      <th>Total</th>
                      <th>Dentro de rango</th>
                      <th>Fuera de rango</th>
                      <th>Conformidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLagoons.map((lagoon) => {
                      const percentage = Number(lagoon.porcentaje_dentro_de_rango || 0);
                      const hasAlerts = Number(lagoon.fuera_de_rango) > 0;

                      return (
                        <tr key={lagoon.id_laguna}>
                          <td>
                            <div className="lagoon-name">
                              <span><Icon name="lake" /></span>
                              <strong>{lagoon.nombre_laguna}</strong>
                            </div>
                          </td>
                          <td><code>{lagoon.codigo_laguna}</code></td>
                          <td>{formatNumber(lagoon.total_resultados)}</td>
                          <td><span className="status-number good">{formatNumber(lagoon.dentro_de_rango)}</span></td>
                          <td><span className={hasAlerts ? "status-number warning" : "status-number"}>{formatNumber(lagoon.fuera_de_rango)}</span></td>
                          <td>
                            <div className="compliance">
                              <div><span style={{ width: `${percentage}%` }} /></div>
                              <strong>{percentage.toFixed(1)}%</strong>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <footer className="table-footer">
                <span>{filteredLagoons.length} lagunas mostradas</span>
                <span>Ordenadas por número de alertas</span>
              </footer>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
