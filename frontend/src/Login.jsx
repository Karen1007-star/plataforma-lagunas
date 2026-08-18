import { useState } from "react";
import "./Login.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const RETRYABLE_STATUS = new Set([404, 502, 503, 504]);
const MAX_LOGIN_ATTEMPTS = 13;
const RETRY_DELAY_MS = 5000;

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function LoginPage({ onLogin, checking = false }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading || checking) return;

    setLoading(true);
    setLoadingMessage("Conectando con el servidor…");
    setError("");

    try {
      for (let attempt = 1; attempt <= MAX_LOGIN_ATTEMPTS; attempt += 1) {
        let response;

        try {
          response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ correo, password }),
          });
        } catch {
          if (attempt === MAX_LOGIN_ATTEMPTS) {
            throw new Error(
              "El servidor gratuito está tardando en iniciar. Espera un momento e inténtalo nuevamente.",
            );
          }

          setLoadingMessage("Iniciando servidor gratuito…");
          await wait(RETRY_DELAY_MS);
          continue;
        }

        const data = await response.json().catch(() => ({}));

        if (RETRYABLE_STATUS.has(response.status)) {
          if (attempt === MAX_LOGIN_ATTEMPTS) {
            throw new Error(
              "El servidor gratuito está tardando en iniciar. Espera un momento e inténtalo nuevamente.",
            );
          }

          setLoadingMessage("Iniciando servidor gratuito…");
          await wait(RETRY_DELAY_MS);
          continue;
        }

        if (!response.ok || !data.token || !data.usuario) {
          throw new Error(data.mensaje || "No se pudo iniciar sesión");
        }

        onLogin(data);
        return;
      }
    } catch (requestError) {
      setError(
        requestError.message ||
          "No se pudo conectar con el servidor. Comprueba que el backend esté encendido.",
      );
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-hidden="true">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
        <div className="login-brand">
          <div className="login-brand-mark"><span /><span /><span /></div>
          <div>
            <strong>Lagunas</strong>
            <small>Gestión hídrica</small>
          </div>
        </div>

        <div className="login-message">
          <p>PLATAFORMA DE MONITOREO</p>
          <h1>Información hídrica para decisiones oportunas.</h1>
          <span>
            Consulta el estado, la disponibilidad y la calidad del agua desde un solo lugar.
          </span>
        </div>

        <div className="login-water-lines"><i /><i /><i /></div>
      </section>

      <section className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-mobile-brand">
            <div className="login-brand-mark"><span /><span /><span /></div>
            <strong>Lagunas</strong>
          </div>

          <p className="login-eyebrow">ACCESO SEGURO</p>
          <h2>Bienvenida</h2>
          <p className="login-intro">Ingresa tus datos para acceder a la plataforma.</p>

          <label>
            Correo electrónico
            <input
              autoComplete="email"
              autoFocus
              disabled={loading || checking}
              onChange={(event) => setCorreo(event.target.value)}
              placeholder="nombre@correo.com"
              required
              type="email"
              value={correo}
            />
          </label>

          <label>
            Contraseña
            <input
              autoComplete="current-password"
              disabled={loading || checking}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ingresa tu contraseña"
              required
              type="password"
              value={password}
            />
          </label>

          {error && <div className="login-error" role="alert">{error}</div>}

          <button className="login-submit" disabled={loading || checking} type="submit">
            {checking
              ? "Comprobando sesión…"
              : loading
                ? loadingMessage || "Ingresando…"
                : "Ingresar"}
          </button>

          <small className="login-help">
            {loading && loadingMessage === "Iniciando servidor gratuito…"
              ? "La primera conexión puede tardar hasta un minuto."
              : "El acceso depende del rol asignado a tu cuenta."}
          </small>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
