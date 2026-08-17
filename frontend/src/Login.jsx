import { useState } from "react";
import "./Login.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function LoginIcon({ name }) {
  const paths = {
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.1 2.8M6.5 6.5C3.6 8.3 2 12 2 12s3.5 6 10 6a10 10 0 0 0 4.1-.8" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
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
    <svg className="login-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function LoginPage({ onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correo: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.mensaje || "No se pudo iniciar sesión.");
      }

      onAuthenticated({
        token: data.token,
        usuario: data.usuario,
      });
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
    <div className="login-shell">
      <div className="login-water login-water-one" />
      <div className="login-water login-water-two" />

      <main className="login-card">
        <section className="login-brand-panel">
          <div className="login-brand">
            <div className="login-brand-mark"><span /><span /><span /></div>
            <div>
              <strong>Lagunas</strong>
              <small>Gestión hídrica</small>
            </div>
          </div>

          <div className="login-brand-copy">
            <p>Plataforma de monitoreo</p>
            <h1>Información hídrica para mejores decisiones</h1>
            <span>
              Consulta el inventario, las mediciones, las campañas de campo y la calidad
              del agua desde un solo lugar.
            </span>
          </div>

          <div className="login-benefits">
            <div><LoginIcon name="chart" /><span>Indicadores integrados</span></div>
            <div><LoginIcon name="database" /><span>Datos centralizados</span></div>
            <div><LoginIcon name="shield" /><span>Acceso por perfiles</span></div>
          </div>

          <div className="login-lake-visual" aria-hidden="true">
            <span /><span /><span />
            <div><LoginIcon name="database" /></div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-heading">
            <span className="login-security"><LoginIcon name="shield" /></span>
            <p className="eyebrow">Acceso seguro</p>
            <h2>Bienvenida</h2>
            <p>Ingresa tus credenciales para acceder a la plataforma.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Correo electrónico</span>
              <div className="login-input-wrap">
                <LoginIcon name="mail" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@dominio.com"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </label>

            <label>
              <span>Contraseña</span>
              <div className="login-input-wrap">
                <LoginIcon name="lock" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <LoginIcon name={showPassword ? "eyeOff" : "eye"} />
                </button>
              </div>
            </label>

            {error && (
              <div className="login-error" role="alert">
                <LoginIcon name="alert" />
                <span>{error}</span>
              </div>
            )}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? <span className="login-spinner" /> : <LoginIcon name="shield" />}
              {loading ? "Verificando…" : "Iniciar sesión"}
            </button>
          </form>

          <div className="login-session-note">
            <LoginIcon name="lock" />
            <span>Tu sesión permanecerá activa hasta por 8 horas.</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
