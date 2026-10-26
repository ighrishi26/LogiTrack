
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, MapPin, Package } from "lucide-react";
import api from "./api";
import PageFooter from "./PageFooter";

export default function TrackingPage() {
  const { trackingNumber } = useParams();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadShipment() {
      setLoading(true);
      setError("");
      setShipment(null);

      try {
        const response = await api.get(
          `/track/${encodeURIComponent(trackingNumber)}/`
        );

        if (active) {
          setShipment(response.data.shipment);
        }
      } catch {
        if (active) {
          setError(
            "Shipment not found. Check the tracking number and try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadShipment();

    return () => {
      active = false;
    };
  }, [trackingNumber]);

  return (
    <main className="tracking-page">
      <header className="tracking-header">
        <Link to="/" className="brand">
          <span className="brand-icon"><Package size={22} /></span>
          LogiTrack
        </Link>
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Home</Link>
      </header>

      <section className="tracking-content">
        <span className="eyebrow">SHIPMENT TRACKING</span>
        <h1>Your shipment journey</h1>
        <p className="tracking-subtitle">
          Tracking number: <strong>{trackingNumber}</strong>
        </p>

        {loading && <div className="message-card">Loading shipment details…</div>}

        {!loading && error && (
          <div className="message-card error-message">{error}</div>
        )}

        {!loading && shipment && (
          <>
            <div className="shipment-summary">
              <div>
                <span className="muted-label">CURRENT STATUS</span>
                <h2>{shipment.status.replaceAll("_", " ")}</h2>
                <span className="tracking-number">{shipment.tracking_number}</span>
              </div>
              <div className="status-icon"><Package size={29} /></div>
            </div>

            <div className="journey-card">
              <div className="journey-route">
                <div>
                  <span className="muted-label">ORIGIN</span>
                  <h3>{shipment.origin}</h3>
                </div>
                <div className="route-arrow">→</div>
                <div>
                  <span className="muted-label">DESTINATION</span>
                  <h3>{shipment.destination}</h3>
                </div>
              </div>

              <div className="delivery-details">
                <div>
                  <Clock3 size={18} />
                  <span>
                    Estimated delivery:{" "}
                    <strong>{shipment.estimated_delivery || "Not available"}</strong>
                  </span>
                </div>
                {shipment.actual_delivery && (
                  <div>
                    <CheckCircle2 size={18} />
                    <span>Delivered on <strong>{shipment.actual_delivery}</strong></span>
                  </div>
                )}
              </div>
            </div>

            <section className="tracking-history">
              <h2>Shipment Tracking History</h2>

              {shipment.tracking_history?.length > 0 ? (
                <div className="tracking-timeline">
                  {shipment.tracking_history.map((event, index) => (
                    <article
                      className="tracking-event"
                      key={`${event.timestamp}-${index}`}
                    >
                      <h3>{event.status.replaceAll("_", " ")}</h3>

                      {event.location && (
                        <p className="tracking-event-location">
                          <MapPin size={14} />
                          {event.location}
                        </p>
                      )}

                      {event.notes && <p>{event.notes}</p>}

                      <time>
                        {new Date(event.timestamp).toLocaleString()}
                      </time>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="tracking-empty">
                  No tracking events have been recorded yet.
                </p>
              )}
            </section>
          </>
        )}
      </section>
      <PageFooter label="LogiTrack Shipment Tracking" />
    </main>
  );
}
