import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router";
import "./App.css";
import "./Overview.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const navigation = [
  { label: "Vista general", icon: "grid", path: "/" },
  { label: "Lagunas", icon: "lake", path: "/lagunas" },
  { label: "Cuantificación", icon: "chart", path: "/cuantificacion" },
  { label: "Monitoreo", icon: "pin", path: "/monitoreo" },
  { label: "Calidad", icon: "shield", path: "/calidad" },
];

const pageDetails = {
  "/": {
    eyebrow: "Panel de control",
    title: "Vista general",
    subtitle: "Resumen integrado de las lagunas, el monitoreo y la calidad del agua.",
  },
  "/lagunas": {
    eyebrow: "Inventario hídrico",
    title: "Lagunas",
    subtitle: "Catálogo, ubicación y características de cada laguna registrada.",
  },
  "/cuantificacion": {
    eyebrow: "Disponibilidad hídrica",
    title: "Cuantificación",
    subtitle: "Evolución del área, volumen y nivel de agua por laguna.",
  },
  "/monitoreo": {
    eyebrow: "Seguimiento de campo",
    title: "Monitoreo",
    subtitle: "Puntos, campañas y actividades de muestreo registradas.",
  },
  "/calidad": {
    eyebrow: "Módulo ambiental",
    title: "Calidad del agua",
    subtitle: "Seguimiento de parámetros, resultados y alertas por laguna.",
  },
};

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

function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value || 0));
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

function OverviewPage({ summary, catalog, qualityByLagoon }) {
  const overview = useMemo(() => {
    const departments = {};
    const operationalStates = {};
    let totalArea = 0;
    let totalCapacity = 0;

    catalog.forEach((lagoon) => {
      totalArea += Number(lagoon.area_total_ha || 0);
      totalCapacity += Number(lagoon.capacidad_max_hm3 || 0);
      departments[lagoon.departamento] = (departments[lagoon.departamento] || 0) + 1;
      operationalStates[lagoon.estado_operativo] =
        (operationalStates[lagoon.estado_operativo] || 0) + 1;
    });

    const departmentRows = Object.entries(departments)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const stateRows = Object.entries(operationalStates)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const priorities = [...qualityByLagoon]
      .sort((a, b) => Number(b.fuera_de_rango) - Number(a.fuera_de_rango))
      .slice(0, 5);

    return {
      totalArea,
      totalCapacity,
      departmentRows,
      stateRows,
      priorities,
      maxDepartment: Math.max(...departmentRows.map((item) => item.count), 1),
    };
  }, [catalog, qualityByLagoon]);

  const compliance = Number(summary?.porcentaje_dentro_de_rango || 0);

  return (
    <>
      <section className="metrics-grid" aria-label="Resumen de la plataforma">
        <MetricCard
          icon="lake"
          label="Lagunas registradas"
          value={formatNumber(catalog.length)}
          note={`${overview.departmentRows.length} departamentos representados`}
          tone="blue"
        />
        <MetricCard
          icon="pin"
          label="Puntos de monitoreo"
          value={formatNumber(summary?.total_puntos)}
          note={`${formatNumber(summary?.total_campanas)} campañas realizadas`}
          tone="purple"
        />
        <MetricCard
          icon="clipboard"
          label="Resultados de calidad"
          value={formatNumber(summary?.total_resultados)}
          note={`${formatNumber(summary?.total_parametros)} parámetros evaluados`}
          tone="green"
        />
        <MetricCard
          icon="shield"
          label="Conformidad general"
          value={`${compliance.toFixed(2)} %`}
          note={`${formatNumber(summary?.fuera_de_rango)} alertas identificadas`}
          tone="orange"
        />
      </section>

      <section className="overview-hero panel">
        <div className="overview-hero-copy">
          <p className="eyebrow">Panorama del sistema</p>
          <h2>Información hídrica integrada en un solo lugar</h2>
          <p>
            La plataforma consolida el inventario de lagunas, sus mediciones, campañas de
            monitoreo y resultados de calidad para facilitar el seguimiento técnico.
          </p>
          <div className="hero-facts">
            <div>
              <span>Área registrada</span>
              <strong>{formatNumber(overview.totalArea, 1)} ha</strong>
            </div>
            <div>
              <span>Capacidad máxima</span>
              <strong>{formatNumber(overview.totalCapacity, 2)} hm³</strong>
            </div>
          </div>
        </div>
        <div className="water-visual" aria-hidden="true">
          <div className="water-orbit orbit-one" />
          <div className="water-orbit orbit-two" />
          <div className="water-drop"><Icon name="lake" /></div>
          <span>{formatNumber(catalog.length)}</span>
          <small>lagunas</small>
        </div>
      </section>

      <section className="overview-grid">
        <article className="panel overview-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Cobertura territorial</p>
              <h2>Lagunas por departamento</h2>
            </div>
            <span className="panel-tag">{overview.departmentRows.length} territorios</span>
          </div>

          <div className="department-list">
            {overview.departmentRows.map((department) => (
              <div className="department-row" key={department.name}>
                <div>
                  <strong>{department.name}</strong>
                  <span>{department.count} lagunas</span>
                </div>
                <div className="department-bar">
                  <span
                    style={{ width: `${(department.count / overview.maxDepartment) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel overview-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Situación actual</p>
              <h2>Estado operativo</h2>
            </div>
          </div>

          <div className="state-list">
            {overview.stateRows.map((state, index) => {
              const percentage = catalog.length ? (state.count / catalog.length) * 100 : 0;
              return (
                <div className="state-row" key={state.name}>
                  <div className={`state-badge state-${index + 1}`}>
                    <Icon name={index === 0 ? "check" : "alert"} />
                  </div>
                  <div>
                    <strong>{state.name}</strong>
                    <span>{percentage.toFixed(1)} % del inventario</span>
                  </div>
                  <b>{state.count}</b>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="panel priority-panel">
        <div className="panel-heading priority-heading">
          <div>
            <p className="eyebrow">Seguimiento recomendado</p>
            <h2>Lagunas con más resultados fuera de rango</h2>
          </div>
          <NavLink className="text-link" to="/calidad">Ver módulo de Calidad →</NavLink>
        </div>

        <div className="priority-list">
          {overview.priorities.map((lagoon, index) => (
            <div className="priority-row" key={lagoon.id_laguna}>
              <span className="priority-rank">{String(index + 1).padStart(2, "0")}</span>
              <div className="priority-name">
                <strong>{lagoon.nombre_laguna}</strong>
                <code>{lagoon.codigo_laguna}</code>
              </div>
              <div className="priority-measure">
                <span>Alertas</span>
                <strong>{formatNumber(lagoon.fuera_de_rango)}</strong>
              </div>
              <div className="priority-measure">
                <span>Conformidad</span>
                <strong>{Number(lagoon.porcentaje_dentro_de_rango || 0).toFixed(1)} %</strong>
              </div>
              <div className="mini-progress">
                <span style={{ width: `${Number(lagoon.porcentaje_dentro_de_rango || 0)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function QualityPage({ summary, states, lagoons }) {
  const [query, setQuery] = useState("");

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
            <div className="alert-symbol"><Icon name="alert" /></div>
          </div>

          <p className="alert-copy">
            Resultados que requieren revisión técnica o seguimiento en una próxima campaña.
          </p>

          <div className="progress-line"><span style={{ width: `${outPercentage}%` }} /></div>
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
                    <td>
                      <span className={hasAlerts ? "status-number warning" : "status-number"}>
                        {formatNumber(lagoon.fuera_de_rango)}
                      </span>
                    </td>
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
  );
}

function PendingModule({ icon, title }) {
  return (
    <section className="panel pending-module">
      <div className="pending-illustration">
        <Icon name={icon} />
        <span />
        <span />
      </div>
      <p className="eyebrow">Siguiente etapa</p>
      <h2>{title}</h2>
      <p>
        La navegación ya funciona. En el próximo avance conectaremos esta sección con los
        datos existentes del backend.
      </p>
      <NavLink className="pending-link" to="/">Volver a Vista general</NavLink>
    </section>
  );
}

function App() {
  const location = useLocation();
  const [summary, setSummary] = useState(null);
  const [states, setStates] = useState([]);
  const [qualityByLagoon, setQualityByLagoon] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const responses = await Promise.all([
        fetch(`${API_BASE}/calidad/resumen`),
        fetch(`${API_BASE}/calidad/estados`),
        fetch(`${API_BASE}/calidad/por-laguna`),
        fetch(`${API_BASE}/lagunas`),
      ]);

      if (responses.some((response) => !response.ok)) {
        throw new Error("La API respondió con un error");
      }

      const [summaryData, statesData, qualityData, catalogData] = await Promise.all(
        responses.map((response) => response.json()),
      );

      setSummary(summaryData);
      setStates(statesData);
      setQualityByLagoon(qualityData);
      setCatalog(Array.isArray(catalogData.datos) ? catalogData.datos : []);
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

  const currentPage = pageDetails[location.pathname] || pageDetails["/"];

  function renderPage() {
    if (location.pathname === "/") {
      return (
        <OverviewPage
          summary={summary}
          catalog={catalog}
          qualityByLagoon={qualityByLagoon}
        />
      );
    }

    if (location.pathname === "/calidad") {
      return <QualityPage summary={summary} states={states} lagoons={qualityByLagoon} />;
    }

    const pending = navigation.find((item) => item.path === location.pathname);
    return <PendingModule icon={pending?.icon || "grid"} title={pending?.label || "Módulo"} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div>
            <strong>Lagunas</strong>
            <small>Gestión hídrica</small>
          </div>
        </div>

        <nav aria-label="Navegación principal">
          <p className="nav-label">Plataforma</p>
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
              end={item.path === "/"}
              key={item.path}
              to={item.path}
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {isActive && <i />}
                </>
              )}
            </NavLink>
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
            <p className="eyebrow">{currentPage.eyebrow}</p>
            <h1>{currentPage.title}</h1>
            <p className="subtitle">{currentPage.subtitle}</p>
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
            <div className="avatar" aria-label="Usuario administrador">KA</div>
          </div>
        </header>

        {error && (
          <section className="error-banner" role="alert">
            <Icon name="alert" />
            <div>
              <strong>No se pudieron cargar los indicadores</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={loadDashboard}>Reintentar</button>
          </section>
        )}

        {loading ? (
          <section className="loading-panel">
            <div className="loader" />
            <p>Cargando información de la plataforma…</p>
          </section>
        ) : renderPage()}
      </main>
    </div>
  );
}

export default App;
