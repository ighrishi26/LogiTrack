
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, PackageCheck, Truck, UserRound } from "lucide-react";
import api from "./api";
import PageFooter from "./PageFooter";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login/", {
        username,
        password,
      });

      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);

      const profile = await api.get("/auth/me/");

      if (profile.data.role === "CUSTOMER") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setError("This login is for staff accounts. Please use a staff account.");
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setError("Login failed. Check your username, password, and backend server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <aside className="login-showcase">
        <Link to="/" className="brand login-brand">
          <span className="brand-icon"><Truck size={23} /></span>
          LogiTrack
        </Link>

        <div className="login-showcase-copy">
          <span className="login-showcase-kicker">LOGISTICS, IN SYNC</span>
          <h2>Move every delivery forward.</h2>
          <p>
            One clear view of your shipments, your team, and every step in
            between.
          </p>
        </div>

        <div className="login-route-card" aria-label="Shipment status preview">
          <div className="login-route-heading">
            <span className="login-route-icon"><PackageCheck size={20} /></span>
            <span>
              <strong>Shipment in transit</strong>
              <small>LT-DA43F746CE</small>
            </span>
            <span className="login-route-status">ON TRACK</span>
          </div>
          <div className="login-route-track">
            <span className="login-route-stop complete" />
            <span className="login-route-progress" />
            <span className="login-route-stop current" />
            <span className="login-route-progress pending" />
            <span className="login-route-stop" />
          </div>
          <div className="login-route-labels">
            <span>Pune</span>
            <span>In transit</span>
            <span>Mumbai</span>
          </div>
          <div className="login-route-note">
            <span className="login-route-live-dot" />
            Live updates keep everyone informed
          </div>
        </div>

        <PageFooter
          label="Reliable operations start with visibility."
          className="app-page-footer-login"
        />
      </aside>

      <section className="login-panel">
        <div className="login-form-content">
          <span className="eyebrow">STAFF PORTAL</span>
          <h1>Welcome back</h1>
          <p className="login-description">
            Sign in to manage shipments and monitor logistics operations.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="username">Username</label>
            <div className="login-input">
              <UserRound size={18} />
              <input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            <label htmlFor="password">Password</label>
            <div className="login-input">
              <LockKeyhole size={18} />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="login-submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in to LogiTrack"}
            </button>
          </form>

          <Link to="/" className="back-link login-back">← Back to home</Link>
        </div>
      </section>
    </main>
  );
}
