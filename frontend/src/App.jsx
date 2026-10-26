
import { useState } from "react";
import { ArrowRight, Package, Search, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import PageFooter from "./PageFooter";

export default function App() {
  const [trackingNumber, setTrackingNumber] = useState("");

  return (
    <div className="app-shell">
      <header className="navbar">
        <Link to="/" className="brand">
          <span className="brand-icon"><Truck size={23} /></span>
          <span>LogiTrack</span>
        </Link>

        <nav>
          <a href="#track">Track Shipment</a>
          <a href="#features">Features</a>
          <Link to="/login" className="nav-button">Staff Login</Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">SMART LOGISTICS MANAGEMENT</span>
            <h1>Every shipment.<br /><span>Every mile.</span><br />Under control.</h1>
            <p>
              Track deliveries, monitor shipment progress, and stay
              informed from dispatch to destination.
            </p>
            <a href="#track" className="primary-button">
              Track your shipment <ArrowRight size={18} />
            </a>
          </div>

          <div className="hero-visual">
            <div className="visual-glow" />
            <div className="truck-card">
              <div className="truck-illustration">
                <Truck size={105} strokeWidth={1.1} />
              </div>
              <div className="route-line">
                <span className="route-dot" />
                <span className="route-dash" />
                <span className="route-dot destination-dot" />
              </div>
              <div className="route-labels">
                <span>Pune</span>
                <span>Mumbai</span>
              </div>
              <div className="delivery-chip">
                <span className="status-dot" />
                Reliable shipment tracking
              </div>
            </div>
          </div>
        </section>

        <section id="track" className="tracking-section">
          <div className="section-heading">
            <span className="eyebrow">SHIPMENT VISIBILITY</span>
            <h2>Where is your package?</h2>
            <p>Enter your tracking number to see the latest shipment updates.</p>
          </div>

          <form
            className="tracking-form"
            onSubmit={(event) => {
              event.preventDefault();
              const value = trackingNumber.trim();
              if (value) {
                window.location.href =
                  "/track/" + encodeURIComponent(value);
              }
            }}
          >
            <Search size={21} />
            <input
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="Enter tracking number (e.g. LT-DA43F746CE)"
              aria-label="Shipment tracking number"
              required
            />
            <button type="submit">Track package <ArrowRight size={17} /></button>
          </form>
        </section>

        <section id="features" className="features-section">
          <div className="section-heading">
            <span className="eyebrow">BUILT FOR BETTER DELIVERY</span>
            <h2>Logistics, made clearer.</h2>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon"><Package size={24} /></div>
              <h3>Shipment tracking</h3>
              <p>View the latest shipment status and delivery progress.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon"><Truck size={24} /></div>
              <h3>Operational visibility</h3>
              <p>Give your logistics team a central place to manage deliveries.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon"><Search size={24} /></div>
              <h3>Clear updates</h3>
              <p>Follow shipment milestones through a tracking timeline.</p>
            </article>
          </div>
        </section>
      </main>

      <PageFooter label="LogiTrack · Smarter logistics. Clearer journeys." />
    </div>
  );
}
