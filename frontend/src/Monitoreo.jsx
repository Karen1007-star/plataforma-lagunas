import { useEffect, useMemo, useState } from "react";
import "./Monitoreo.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function formatDate(date) {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCoordinate(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toFixed(5);
}

function normalizeClass(value) {
  return String(value || "sin-dato")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function MonitorIcon({ name }) {
  const paths = {
    point: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    campaign: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
      </>
    ),
    altitude: (
      <>
        <path d="m3 19 6-10 4 6 2-3 6 7H3Z" />
        <path d="m7.8 11 1.2 2 1.1-1.6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 4.2 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
  };

  return (
    <svg className="monitor-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function MonitorMetric({ icon, label, value, note, tone }) {
  return (
    <article className="monitor-metric">
      <span className={`monitor-metric-icon ${tone}`}>
        <MonitorIcon name={icon} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

function MonitoreoPage({ catalog = [] }) {
  const [selectedLagoonId, setSelectedLagoonId] = useState("");
  const [pointFilter, setPointFilter] = useState("todos");
  const [seasonFilter, setSeasonFilter] = useState("todas");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedLagoonId && catalog.length > 0) {
      setSelectedLagoonId(String(catalog[0].id_laguna));
    }
  }, [catalog, selectedLagoonId]);

  useEffect(() => {
    if (!selectedLagoonId) return undefined;

    const controller = new AbortController();

    async function loadMonitoring() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE}/monitoreo/laguna/${selectedLagoonId}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("No se pudo consultar el monitoreo de la laguna");
        }

        const responseData = await response.json();
        setData(responseData);
        setPointFilter("todos");
        setSeasonFilter("todas");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          console.error(requestError);
          setError(
            "No se pudieron cargar los datos de monitoreo. Verifica que el backend esté encendido.",
          );
          setData(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadMonitoring();
    return () => controller.abort();
  }, [selectedLagoonId]);

  const campaigns = useMemo(() => {
    if (!data?.puntos) return [];

    return data.puntos
      .flatMap((point) =>
        point.campanas.map((campaign) => ({
          ...campaign,
          id_punto: point.id_punto,
          codigo_punto: point.codigo_punto,
          nombre_punto: point.nombre_punto,
          tipo_punto: point.tipo_punto,
        })),
      )
      .sort((a, b) => String(b.fecha_muestreo).localeCompare(String(a.fecha_muestreo)));
  }, [data]);

  const seasons = useMemo(
    () => [...new Set(campaigns.map((campaign) => campaign.temporada).filter(Boolean))].sort(),
    [campaigns],
  );

  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) => {
        const matchesPoint =
          pointFilter === "todos" || String(campaign.id_punto) === pointFilter;
        const matchesSeason =
          seasonFilter === "todas" || campaign.temporada === seasonFilter;
        return matchesPoint && matchesSeason;
      }),
    [campaigns, pointFilter, seasonFilter],
  );

  const activePoints = useMemo(
    () =>
      (data?.puntos || []).filter((point) => {
        const state = normalizeClass(point.estado_punto);
        return state === "activo" || state === "operativo";
      }).length,
    [data],
  );

  const averageAltitude = useMemo(() => {
    const altitudes = (data?.puntos || [])
      .map((point) => Number(point.altitud_msnm))
      .filter(Number.isFinite);

    if (!altitudes.length) return 0;
    return Math.round(altitudes.reduce((total, altitude) => total + altitude, 0) / altitudes.length);
  }, [data]);

  const latestCampaign = campaigns[0];

  return (
    <div className="monitor-page">
      <section className="panel monitor-selector-panel">
        <div>
          <p className="eyebrow">Consulta por laguna</p>
          <h2>Selecciona el cuerpo de agua</h2>
          <p>Revisa los puntos instalados y el historial de campañas de campo.</p>
        </div>

        <label className="monitor-lagoon-select">
          <span>Laguna</span>
          <select
            value={selectedLagoonId}
            onChange={(event) => setSelectedLagoonId(event.target.value)}
          >
            {catalog.map((lagoon) => (
              <option key={lagoon.id_laguna} value={lagoon.id_laguna}>
                {lagoon.codigo_laguna} · {lagoon.nombre_laguna}
              </option>
            ))}
          </select>
        </label>
      </section>

      {!catalog.length && (
        <section className="panel monitor-message">
          <MonitorIcon name="alert" />
          <div>
            <strong>No hay lagunas disponibles</strong>
            <p>Primero debe cargarse el catálogo general de lagunas.</p>
          </div>
        </section>
      )}

      {loading && (
        <section className="panel monitor-message">
          <span className="monitor-loader" />
          <div>
            <strong>Cargando monitoreo…</strong>
            <p>Estamos consultando los puntos y campañas registradas.</p>
          </div>
        </section>
      )}

      {error && !loading && (
        <section className="panel monitor-message monitor-error" role="alert">
          <MonitorIcon name="alert" />
          <div>
            <strong>No se pudo cargar el módulo</strong>
            <p>{error}</p>
          </div>
        </section>
      )}

      {data?.ok && !loading && !error && (
        <>
          <section className="monitor-metrics" aria-label="Indicadores de monitoreo">
            <MonitorMetric
              icon="point"
              label="Puntos registrados"
              value={data.total_puntos}
              note={`${activePoints} puntos activos`}
              tone="blue"
            />
            <MonitorMetric
              icon="campaign"
              label="Campañas realizadas"
              value={data.total_campanas}
              note="Historial de muestreo"
              tone="purple"
            />
            <MonitorMetric
              icon="calendar"
              label="Última campaña"
              value={latestCampaign ? formatDate(latestCampaign.fecha_muestreo) : "—"}
              note={latestCampaign?.temporada || "Sin registros"}
              tone="green"
            />
            <MonitorMetric
              icon="altitude"
              label="Altitud promedio"
              value={averageAltitude ? `${averageAltitude.toLocaleString("es-PE")} m` : "—"}
              note="Metros sobre el nivel del mar"
              tone="orange"
            />
          </section>

          <section className="panel monitor-points-panel">
            <div className="panel-heading monitor-heading">
              <div>
                <p className="eyebrow">Red de seguimiento</p>
                <h2>Puntos de monitoreo</h2>
              </div>
              <div className="monitor-lagoon-badge">
                <span>{data.laguna.nombre}</span>
                <code>{data.laguna.codigo}</code>
              </div>
            </div>

            <div className="monitor-points-grid">
              {data.puntos.map((point) => (
                <article className="monitor-point-card" key={point.id_punto}>
                  <header>
                    <span className="monitor-point-pin"><MonitorIcon name="point" /></span>
                    <div>
                      <code>{point.codigo_punto}</code>
                      <h3>{point.nombre_punto}</h3>
                    </div>
                    <span className={`monitor-status ${normalizeClass(point.estado_punto)}`}>
                      {point.estado_punto || "Sin estado"}
                    </span>
                  </header>

                  <div className="monitor-point-facts">
                    <div><span>Tipo</span><strong>{point.tipo_punto || "—"}</strong></div>
                    <div><span>Altitud</span><strong>{point.altitud_msnm ? `${Number(point.altitud_msnm).toLocaleString("es-PE")} m` : "—"}</strong></div>
                    <div><span>Latitud</span><strong>{formatCoordinate(point.latitud_decimal)}</strong></div>
                    <div><span>Longitud</span><strong>{formatCoordinate(point.longitud_decimal)}</strong></div>
                  </div>

                  <footer>
                    <span>{point.campanas.length} campañas registradas</span>
                    <button type="button" onClick={() => setPointFilter(String(point.id_punto))}>
                      Ver historial
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          </section>

          <section className="panel monitor-history-panel">
            <div className="panel-heading monitor-history-heading">
              <div>
                <p className="eyebrow">Registro de campo</p>
                <h2>Historial de campañas</h2>
              </div>

              <div className="monitor-filters">
                <label>
                  <span>Punto</span>
                  <select value={pointFilter} onChange={(event) => setPointFilter(event.target.value)}>
                    <option value="todos">Todos los puntos</option>
                    {data.puntos.map((point) => (
                      <option key={point.id_punto} value={point.id_punto}>
                        {point.codigo_punto} · {point.nombre_punto}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Temporada</span>
                  <select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}>
                    <option value="todas">Todas</option>
                    {seasons.map((season) => (
                      <option key={season} value={season}>{season}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="monitor-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Punto</th>
                    <th>Temporada</th>
                    <th>Responsable</th>
                    <th>Laboratorio</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id_campana}>
                      <td data-label="Fecha"><strong>{formatDate(campaign.fecha_muestreo)}</strong></td>
                      <td data-label="Punto">
                        <div className="monitor-table-point">
                          <code>{campaign.codigo_punto}</code>
                          <span>{campaign.nombre_punto}</span>
                        </div>
                      </td>
                      <td data-label="Temporada"><span className={`monitor-season ${normalizeClass(campaign.temporada)}`}>{campaign.temporada || "—"}</span></td>
                      <td data-label="Responsable">{campaign.responsable_muestreo || "—"}</td>
                      <td data-label="Laboratorio">{campaign.laboratorio || "—"}</td>
                      <td className="monitor-observation" data-label="Observaciones">{campaign.observaciones || "Sin observaciones"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!filteredCampaigns.length && (
                <div className="monitor-empty">
                  <MonitorIcon name="search" />
                  <strong>No encontramos campañas</strong>
                  <p>Cambia los filtros para mostrar otros registros.</p>
                </div>
              )}
            </div>

            <footer className="monitor-table-footer">
              <span>{filteredCampaigns.length} campañas mostradas</span>
              <span>Ordenadas de la más reciente a la más antigua</span>
            </footer>
          </section>
        </>
      )}
    </div>
  );
}

export default MonitoreoPage;
