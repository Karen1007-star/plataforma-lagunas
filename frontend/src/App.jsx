import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import "./Overview.css";
import "./Lagunas.css";
import "./Cuantificacion.css";
import "./MapaLagunas.css";
import MonitoreoPage from "./Monitoreo";

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

function formatDate(date, options = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-PE", options);
}

function formatPercentage(value) {
  const numericValue = Number(value || 0);
  return numericValue <= 1 ? numericValue * 100 : numericValue;
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

function lagoonStateClass(state) {
  const normalized = String(state || "").toLowerCase();
  if (normalized === "operativa") return "operational";
  if (normalized.includes("observación")) return "observation";
  return "maintenance";
}

function MapBounds({ lagoons }) {
  const map = useMap();

  useEffect(() => {
    const positions = lagoons
      .map((lagoon) => [Number(lagoon.latitud_decimal), Number(lagoon.longitud_decimal)])
      .filter(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));

    if (positions.length === 1) {
      map.setView(positions[0], 12);
    } else if (positions.length > 1) {
      map.fitBounds(positions, { padding: [45, 45], maxZoom: 10 });
    }
  }, [lagoons, map]);

  return null;
}

function LagoonsMap({ lagoons, onSelectLagoon }) {
  const mappedLagoons = lagoons.filter((lagoon) => {
    const latitude = Number(lagoon.latitud_decimal);
    const longitude = Number(lagoon.longitud_decimal);
    return Number.isFinite(latitude) && Number.isFinite(longitude);
  });

  function markerIcon(state) {
    const tone = lagoonStateClass(state);
    return L.divIcon({
      className: "lagoon-marker-shell",
      html: `<span class="lagoon-map-marker ${tone}"><i></i></span>`,
      iconSize: [34, 42],
      iconAnchor: [17, 42],
      popupAnchor: [0, -37],
    });
  }

  return (
    <section className="panel lagoons-map-panel" aria-label="Mapa interactivo de lagunas">
      <div className="map-panel-header">
        <div>
          <p className="eyebrow">Distribución geográfica</p>
          <h2>Mapa de lagunas registradas</h2>
          <span>{mappedLagoons.length} ubicaciones visibles según los filtros aplicados</span>
        </div>

        <div className="map-state-legend" aria-label="Leyenda del mapa">
          <span><i className="operational" /> Operativa</span>
          <span><i className="observation" /> En observación</span>
          <span><i className="maintenance" /> Mantenimiento</span>
        </div>
      </div>

      <div className="lagoon-map-canvas">
        <MapContainer
          center={[-9.19, -75.02]}
          zoom={5}
          scrollWheelZoom
          aria-label="Mapa con la ubicación de las lagunas"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds lagoons={mappedLagoons} />

          {mappedLagoons.map((lagoon) => (
            <Marker
              key={lagoon.id_laguna}
              position={[Number(lagoon.latitud_decimal), Number(lagoon.longitud_decimal)]}
              icon={markerIcon(lagoon.estado_operativo)}
            >
              <Popup minWidth={245}>
                <article className="lagoon-map-popup">
                  <div className="popup-title-row">
                    <div>
                      <p>Laguna registrada</p>
                      <h3>{lagoon.nombre_laguna}</h3>
                      <code>{lagoon.codigo_laguna}</code>
                    </div>
                    <span className={`lagoon-state ${lagoonStateClass(lagoon.estado_operativo)}`}>
                      {lagoon.estado_operativo}
                    </span>
                  </div>

                  <div className="popup-location">
                    <Icon name="pin" />
                    <span>
                      {lagoon.distrito}, {lagoon.provincia}<br />
                      <small>{lagoon.departamento}</small>
                    </span>
                  </div>

                  <div className="popup-stats">
                    <div><span>Área</span><strong>{formatNumber(lagoon.area_total_ha, 1)} ha</strong></div>
                    <div><span>Capacidad</span><strong>{formatNumber(lagoon.capacidad_max_hm3, 2)} hm³</strong></div>
                    <div><span>Altitud</span><strong>{formatNumber(lagoon.altitud_msnm)} m</strong></div>
                  </div>

                  <button type="button" onClick={() => onSelectLagoon(lagoon)}>
                    Ver ficha técnica <span aria-hidden="true">→</span>
                  </button>
                </article>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <footer className="map-panel-footer">
        <span>Usa el ratón para desplazarte y la rueda para acercar o alejar.</span>
        <strong>Selecciona un marcador para consultar la laguna.</strong>
      </footer>
    </section>
  );
}

function LagoonsPage({ catalog }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("Todos");
  const [operationalState, setOperationalState] = useState("Todos");
  const [selectedLagoon, setSelectedLagoon] = useState(null);
  const [viewMode, setViewMode] = useState("cards");

  const departments = useMemo(
    () => [...new Set(catalog.map((lagoon) => lagoon.departamento))].sort(),
    [catalog],
  );

  const operationalStates = useMemo(
    () => [...new Set(catalog.map((lagoon) => lagoon.estado_operativo))].sort(),
    [catalog],
  );

  const filteredCatalog = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return catalog.filter((lagoon) => {
      const matchesQuery =
        !normalizedQuery ||
        `${lagoon.nombre_laguna} ${lagoon.codigo_laguna} ${lagoon.provincia} ${lagoon.distrito}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesDepartment =
        department === "Todos" || lagoon.departamento === department;
      const matchesState =
        operationalState === "Todos" || lagoon.estado_operativo === operationalState;

      return matchesQuery && matchesDepartment && matchesState;
    });
  }, [catalog, department, operationalState, query]);

  const catalogSummary = useMemo(
    () => ({
      totalArea: catalog.reduce(
        (total, lagoon) => total + Number(lagoon.area_total_ha || 0),
        0,
      ),
      totalCapacity: catalog.reduce(
        (total, lagoon) => total + Number(lagoon.capacidad_max_hm3 || 0),
        0,
      ),
      averageAltitude: catalog.length
        ? catalog.reduce(
            (total, lagoon) => total + Number(lagoon.altitud_msnm || 0),
            0,
          ) / catalog.length
        : 0,
    }),
    [catalog],
  );

  useEffect(() => {
    if (!selectedLagoon) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setSelectedLagoon(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [selectedLagoon]);

  return (
    <>
      <section className="metrics-grid" aria-label="Resumen del inventario de lagunas">
        <MetricCard
          icon="lake"
          label="Lagunas registradas"
          value={formatNumber(catalog.length)}
          note={`${departments.length} departamentos`}
          tone="blue"
        />
        <MetricCard
          icon="grid"
          label="Área total"
          value={`${formatNumber(catalogSummary.totalArea, 1)} ha`}
          note="Superficie hídrica registrada"
          tone="purple"
        />
        <MetricCard
          icon="chart"
          label="Capacidad máxima"
          value={`${formatNumber(catalogSummary.totalCapacity, 2)} hm³`}
          note="Capacidad conjunta estimada"
          tone="green"
        />
        <MetricCard
          icon="pin"
          label="Altitud promedio"
          value={`${formatNumber(catalogSummary.averageAltitude)} m`}
          note="Metros sobre el nivel del mar"
          tone="orange"
        />
      </section>

      <section className="panel lagoon-toolbar">
        <div className="lagoon-toolbar-copy">
          <p className="eyebrow">Inventario principal</p>
          <h2>Explorar lagunas</h2>
          <span>{filteredCatalog.length} de {catalog.length} registros visibles</span>
          <div className="lagoon-view-switch" role="group" aria-label="Tipo de visualización">
            <button
              className={viewMode === "cards" ? "active" : ""}
              type="button"
              aria-pressed={viewMode === "cards"}
              onClick={() => setViewMode("cards")}
            >
              <Icon name="grid" /> Tarjetas
            </button>
            <button
              className={viewMode === "map" ? "active" : ""}
              type="button"
              aria-pressed={viewMode === "map"}
              onClick={() => setViewMode("map")}
            >
              <Icon name="pin" /> Mapa
            </button>
          </div>
        </div>

        <div className="lagoon-filters">
          <label className="search-box lagoon-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar laguna, código o ubicación"
              type="search"
            />
          </label>

          <label className="select-filter">
            <span>Departamento</span>
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option>Todos</option>
              {departments.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="select-filter">
            <span>Estado</span>
            <select
              value={operationalState}
              onChange={(event) => setOperationalState(event.target.value)}
            >
              <option>Todos</option>
              {operationalStates.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </section>

      {filteredCatalog.length > 0 && viewMode === "map" ? (
        <LagoonsMap lagoons={filteredCatalog} onSelectLagoon={setSelectedLagoon} />
      ) : filteredCatalog.length > 0 ? (
        <section className="lagoon-grid" aria-label="Listado de lagunas">
          {filteredCatalog.map((lagoon) => (
            <article className="lagoon-card" key={lagoon.id_laguna}>
              <div className="lagoon-card-visual">
                <div className="lagoon-contours contour-one" />
                <div className="lagoon-contours contour-two" />
                <span className="lagoon-card-icon"><Icon name="lake" /></span>
                <span className={`lagoon-state ${lagoonStateClass(lagoon.estado_operativo)}`}>
                  {lagoon.estado_operativo}
                </span>
              </div>

              <div className="lagoon-card-body">
                <div className="lagoon-card-title">
                  <div>
                    <h3>{lagoon.nombre_laguna}</h3>
                    <code>{lagoon.codigo_laguna}</code>
                  </div>
                  <span className="lagoon-type">{lagoon.tipo_laguna}</span>
                </div>

                <div className="lagoon-location">
                  <Icon name="pin" />
                  <p>
                    <strong>{lagoon.distrito}, {lagoon.provincia}</strong>
                    <span>{lagoon.departamento} · {formatNumber(lagoon.altitud_msnm)} m s. n. m.</span>
                  </p>
                </div>

                <div className="lagoon-card-stats">
                  <div>
                    <span>Área</span>
                    <strong>{formatNumber(lagoon.area_total_ha, 1)} ha</strong>
                  </div>
                  <div>
                    <span>Capacidad</span>
                    <strong>{formatNumber(lagoon.capacidad_max_hm3, 2)} hm³</strong>
                  </div>
                </div>

                <button type="button" onClick={() => setSelectedLagoon(lagoon)}>
                  Ver ficha técnica
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel lagoon-empty">
          <Icon name="lake" />
          <h2>No encontramos lagunas</h2>
          <p>Prueba con otro nombre o cambia los filtros seleccionados.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDepartment("Todos");
              setOperationalState("Todos");
            }}
          >
            Limpiar filtros
          </button>
        </section>
      )}

      {selectedLagoon && (
        <div className="lagoon-modal" role="dialog" aria-modal="true" aria-labelledby="lagoon-title">
          <button
            className="lagoon-modal-backdrop"
            type="button"
            aria-label="Cerrar ficha técnica"
            onClick={() => setSelectedLagoon(null)}
          />
          <article className="lagoon-detail">
            <div className="lagoon-detail-header">
              <div className="lagoon-detail-mark"><Icon name="lake" /></div>
              <div>
                <p className="eyebrow">Ficha técnica</p>
                <h2 id="lagoon-title">{selectedLagoon.nombre_laguna}</h2>
                <code>{selectedLagoon.codigo_laguna}</code>
              </div>
              <button
                className="detail-close"
                type="button"
                aria-label="Cerrar"
                onClick={() => setSelectedLagoon(null)}
              >
                ×
              </button>
            </div>

            <div className="lagoon-detail-status">
              <span className={`lagoon-state ${lagoonStateClass(selectedLagoon.estado_operativo)}`}>
                {selectedLagoon.estado_operativo}
              </span>
              <span>{selectedLagoon.tipo_laguna}</span>
              <span>Origen {selectedLagoon.origen}</span>
            </div>

            <div className="detail-section">
              <h3>Ubicación</h3>
              <dl>
                <div><dt>Departamento</dt><dd>{selectedLagoon.departamento}</dd></div>
                <div><dt>Provincia</dt><dd>{selectedLagoon.provincia}</dd></div>
                <div><dt>Distrito</dt><dd>{selectedLagoon.distrito}</dd></div>
                <div><dt>Centro poblado</dt><dd>{selectedLagoon.centro_poblado}</dd></div>
                <div><dt>Altitud</dt><dd>{formatNumber(selectedLagoon.altitud_msnm)} m s. n. m.</dd></div>
                <div><dt>Coordenadas</dt><dd>{selectedLagoon.latitud_decimal}, {selectedLagoon.longitud_decimal}</dd></div>
              </dl>
            </div>

            <div className="detail-section">
              <h3>Características hídricas</h3>
              <dl>
                <div><dt>Área total</dt><dd>{formatNumber(selectedLagoon.area_total_ha, 2)} ha</dd></div>
                <div><dt>Capacidad máxima</dt><dd>{formatNumber(selectedLagoon.capacidad_max_hm3, 3)} hm³</dd></div>
                <div><dt>Unidad hidrográfica</dt><dd>{selectedLagoon.nombre_unidad}</dd></div>
                <div><dt>Código de unidad</dt><dd>{selectedLagoon.codigo_unidad}</dd></div>
              </dl>
            </div>

            <div className="detail-responsible">
              <span>Responsable</span>
              <strong>{selectedLagoon.responsable}</strong>
            </div>
          </article>
        </div>
      )}
    </>
  );
}

function QuantificationTrendChart({ measurements }) {
  const width = 920;
  const height = 280;
  const padding = { top: 26, right: 24, bottom: 47, left: 46 };
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const series = measurements.map((measurement, index) => ({
    ...measurement,
    x:
      measurements.length === 1
        ? padding.left + usableWidth / 2
        : padding.left + (index / (measurements.length - 1)) * usableWidth,
    availability: formatPercentage(measurement.porcentaje_disponible),
    wetArea: formatPercentage(measurement.porcentaje_area_humeda),
  }));

  const pointFor = (item, key) =>
    `${item.x},${padding.top + usableHeight - (Math.min(100, Math.max(0, item[key])) / 100) * usableHeight}`;
  const availabilityPoints = series.map((item) => pointFor(item, "availability")).join(" ");
  const wetAreaPoints = series.map((item) => pointFor(item, "wetArea")).join(" ");
  const labelStep = Math.max(1, Math.ceil(series.length / 6));

  if (!series.length) return null;

  return (
    <div className="quant-chart-wrap">
      <svg
        className="quant-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Evolución porcentual del área húmeda y la disponibilidad de agua"
      >
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padding.top + usableHeight - (tick / 100) * usableHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text x={padding.left - 12} y={y + 4}>{tick}%</text>
            </g>
          );
        })}

        <polyline className="quant-line wet" points={wetAreaPoints} />
        <polyline className="quant-line available" points={availabilityPoints} />

        {series.map((item, index) => (
          <g key={item.id_cuantificacion}>
            <circle
              className="quant-point wet"
              cx={item.x}
              cy={pointFor(item, "wetArea").split(",")[1]}
              r="4"
            />
            <circle
              className="quant-point available"
              cx={item.x}
              cy={pointFor(item, "availability").split(",")[1]}
              r="4"
            />
            {(index % labelStep === 0 || index === series.length - 1) && (
              <text className="quant-date-label" x={item.x} y={height - 15}>
                {formatDate(item.fecha_medicion, { month: "short", year: "2-digit" })}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function QuantificationPage({ catalog }) {
  const [selectedLagoonId, setSelectedLagoonId] = useState("");
  const [measurements, setMeasurements] = useState([]);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);
  const [measurementError, setMeasurementError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const activeLagoonId = selectedLagoonId || catalog[0]?.id_laguna || "";
  const selectedLagoon = catalog.find((lagoon) => lagoon.id_laguna === activeLagoonId);

  useEffect(() => {
    if (!activeLagoonId) return undefined;

    const controller = new AbortController();

    async function loadMeasurements() {
      setLoadingMeasurements(true);
      setMeasurementError("");

      try {
        const response = await fetch(
          `${API_BASE}/cuantificaciones/laguna/${activeLagoonId}`,
          { signal: controller.signal },
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.mensaje || "No se pudieron obtener las mediciones");
        }

        const rows = Array.isArray(payload.datos) ? payload.datos : [];
        setMeasurements(
          [...rows].sort(
            (first, second) =>
              new Date(first.fecha_medicion) - new Date(second.fecha_medicion),
          ),
        );
      } catch (requestError) {
        if (requestError.name === "AbortError") return;
        console.error(requestError);
        setMeasurements([]);
        setMeasurementError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoadingMeasurements(false);
      }
    }

    loadMeasurements();
    return () => controller.abort();
  }, [activeLagoonId, reloadKey]);

  const latest = measurements.at(-1);
  const previous = measurements.at(-2);
  const availability = formatPercentage(latest?.porcentaje_disponible);
  const wetAreaPercentage = formatPercentage(latest?.porcentaje_area_humeda);
  const dryAreaPercentage = Math.max(0, 100 - wetAreaPercentage);

  function variation(currentValue, previousValue, decimals = 1) {
    if (previousValue === undefined || previousValue === null) return "Primera medición registrada";
    const difference = Number(currentValue || 0) - Number(previousValue || 0);
    const sign = difference > 0 ? "+" : "";
    return `${sign}${formatNumber(difference, decimals)} respecto a la medición anterior`;
  }

  return (
    <>
      <section className="panel quant-toolbar">
        <div className="quant-toolbar-copy">
          <p className="eyebrow">Consulta por laguna</p>
          <h2>Balance hídrico histórico</h2>
          <span>Selecciona una laguna para revisar sus mediciones en el tiempo.</span>
        </div>

        <label className="quant-selector">
          <span>Laguna seleccionada</span>
          <select
            value={activeLagoonId}
            onChange={(event) => setSelectedLagoonId(event.target.value)}
          >
            {catalog.map((lagoon) => (
              <option key={lagoon.id_laguna} value={lagoon.id_laguna}>
                {lagoon.nombre_laguna} · {lagoon.codigo_laguna}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loadingMeasurements ? (
        <section className="panel quant-feedback">
          <div className="loader" />
          <p>Cargando mediciones de {selectedLagoon?.nombre_laguna || "la laguna"}…</p>
        </section>
      ) : measurementError ? (
        <section className="panel quant-feedback quant-error" role="alert">
          <Icon name="alert" />
          <h2>No se pudieron cargar las cuantificaciones</h2>
          <p>{measurementError}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
            Reintentar
          </button>
        </section>
      ) : measurements.length === 0 ? (
        <section className="panel quant-feedback">
          <Icon name="chart" />
          <h2>Sin mediciones disponibles</h2>
          <p>Esta laguna todavía no tiene registros de cuantificación.</p>
        </section>
      ) : (
        <>
          <section className="metrics-grid" aria-label="Última cuantificación registrada">
            <MetricCard
              icon="lake"
              label="Área húmeda"
              value={`${formatNumber(latest.area_humeda_ha, 2)} ha`}
              note={variation(latest.area_humeda_ha, previous?.area_humeda_ha, 2)}
              tone="blue"
            />
            <MetricCard
              icon="chart"
              label="Volumen disponible"
              value={`${formatNumber(latest.volumen_disponible_hm3, 3)} hm³`}
              note={variation(
                latest.volumen_disponible_hm3,
                previous?.volumen_disponible_hm3,
                3,
              )}
              tone="purple"
            />
            <MetricCard
              icon="check"
              label="Disponibilidad"
              value={`${formatNumber(availability, 1)} %`}
              note={`${formatNumber(latest.capacidad_max_hm3, 2)} hm³ de capacidad máxima`}
              tone="green"
            />
            <MetricCard
              icon="pin"
              label="Nivel del agua"
              value={`${formatNumber(latest.nivel_agua_m, 2)} m`}
              note={variation(latest.nivel_agua_m, previous?.nivel_agua_m, 2)}
              tone="orange"
            />
          </section>

          <section className="quant-main-grid">
            <article className="panel quant-trend-panel">
              <div className="panel-heading quant-panel-heading">
                <div>
                  <p className="eyebrow">Evolución temporal</p>
                  <h2>Área húmeda y disponibilidad</h2>
                </div>
                <div className="quant-legend">
                  <span><i className="wet" /> Área húmeda</span>
                  <span><i className="available" /> Disponibilidad</span>
                </div>
              </div>

              <QuantificationTrendChart measurements={measurements} />

              <footer className="quant-chart-footer">
                <span>{measurements.length} mediciones registradas</span>
                <strong>Última actualización: {formatDate(latest.fecha_medicion)}</strong>
              </footer>
            </article>

            <article className="panel quant-balance-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Medición más reciente</p>
                  <h2>Estado hídrico</h2>
                </div>
                <span className="panel-tag">{formatDate(latest.fecha_medicion)}</span>
              </div>

              <div
                className="availability-ring"
                style={{ "--availability": `${Math.min(100, availability) * 3.6}deg` }}
              >
                <div>
                  <strong>{formatNumber(availability, 1)}%</strong>
                  <span>disponible</span>
                </div>
              </div>

              <div className="area-composition">
                <div className="composition-title">
                  <span>Composición del área</span>
                  <strong>{formatNumber(latest.area_total_ha, 2)} ha</strong>
                </div>
                <div className="composition-bar">
                  <span className="wet" style={{ width: `${Math.min(100, wetAreaPercentage)}%` }} />
                  <span className="dry" style={{ width: `${Math.min(100, dryAreaPercentage)}%` }} />
                </div>
                <div className="composition-legend">
                  <span><i className="wet" /> Húmeda {formatNumber(latest.area_humeda_ha, 2)} ha</span>
                  <span><i className="dry" /> Seca {formatNumber(latest.area_seca_ha, 2)} ha</span>
                </div>
              </div>

              <div className="quant-source">
                <span>Fuente del dato</span>
                <strong>{latest.fuente_dato || "No especificada"}</strong>
              </div>
            </article>
          </section>

          <section className="panel quant-history-panel">
            <div className="panel-heading quant-history-heading">
              <div>
                <p className="eyebrow">Registro cronológico</p>
                <h2>Historial de cuantificaciones</h2>
              </div>
              <div className="quant-lagoon-id">
                <span>{selectedLagoon?.nombre_laguna || latest.nombre_laguna}</span>
                <code>{selectedLagoon?.codigo_laguna || latest.codigo_laguna}</code>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Área húmeda</th>
                    <th>Área seca</th>
                    <th>Disponibilidad</th>
                    <th>Volumen disponible</th>
                    <th>Nivel del agua</th>
                    <th>Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {[...measurements].reverse().map((measurement) => {
                    const availablePercentage = formatPercentage(
                      measurement.porcentaje_disponible,
                    );
                    return (
                      <tr key={measurement.id_cuantificacion}>
                        <td><strong>{formatDate(measurement.fecha_medicion)}</strong></td>
                        <td>{formatNumber(measurement.area_humeda_ha, 2)} ha</td>
                        <td>{formatNumber(measurement.area_seca_ha, 2)} ha</td>
                        <td>
                          <div className="quant-table-progress">
                            <div><span style={{ width: `${Math.min(100, availablePercentage)}%` }} /></div>
                            <strong>{formatNumber(availablePercentage, 1)}%</strong>
                          </div>
                        </td>
                        <td>{formatNumber(measurement.volumen_disponible_hm3, 3)} hm³</td>
                        <td>{formatNumber(measurement.nivel_agua_m, 2)} m</td>
                        <td><span className="source-chip">{measurement.fuente_dato || "—"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <footer className="table-footer">
              <span>{measurements.length} registros mostrados</span>
              <span>Ordenados del más reciente al más antiguo</span>
            </footer>
          </section>
        </>
      )}
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

    if (location.pathname === "/lagunas") {
      return <LagoonsPage catalog={catalog} />;
    }

    if (location.pathname === "/cuantificacion") {
      return <QuantificationPage catalog={catalog} />;
    }
    if (location.pathname === "/monitoreo") {
      return <MonitoreoPage catalog={catalog} />;
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
