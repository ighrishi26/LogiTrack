
import { useEffect, useState } from "react";
import { X, Package, MapPin, UserRound, Clock, Truck } from "lucide-react";
import api from "./api";

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

function formatStatus(value) {
  return (value || "UNKNOWN").replaceAll("_", " ");
}

export default function ShipmentDetails({ shipment, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDetails() {
      try {
        const response = await api.get(`/shipments/${shipment.id}/`);
        if (active) setDetails(response.data);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.detail ||
              "Unable to load shipment details. Check your login and permissions."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDetails();

    return () => {
      active = false;
    };
  }, [shipment.id]);

  return (
    <div className="shipment-modal-backdrop" onClick={onClose}>
      <section
        className="shipment-modal shipment-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shipment-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shipment-modal-header">
          <div>
            <h2 id="shipment-details-title">
              <Package size={22} /> Shipment Details
            </h2>
            <p>{shipment.tracking_number}</p>
          </div>

          <button
            type="button"
            className="shipment-close"
            onClick={onClose}
            aria-label="Close shipment details"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p>Loading shipment details...</p>
        ) : error ? (
          <p className="shipment-form-error">{error}</p>
        ) : (
          <>
            <div className="shipment-details-status">
              <span>Current status</span>
              <strong>{formatStatus(details.status)}</strong>
            </div>

            <div className="shipment-details-grid">
              <section className="shipment-detail-card">
                <h3><UserRound size={18} /> Sender</h3>
                <p><strong>{details.sender_name}</strong></p>
                <p>{details.sender_phone}</p>
                <p>{details.sender_address}</p>
              </section>

              <section className="shipment-detail-card">
                <h3><UserRound size={18} /> Receiver</h3>
                <p><strong>{details.receiver_name}</strong></p>
                <p>{details.receiver_phone}</p>
                <p>{details.receiver_address}</p>
              </section>

              <section className="shipment-detail-card">
                <h3><MapPin size={18} /> Route</h3>
                <p><strong>Origin:</strong> {details.origin}</p>
                <p><strong>Destination:</strong> {details.destination}</p>
              </section>

              <section className="shipment-detail-card">
                <h3><Package size={18} /> Package</h3>
                <p>{details.package_description || "Not provided"}</p>
                <p><strong>Weight:</strong> {details.weight_kg} kg</p>
                <p>
                  <strong>Shipping cost:</strong>{" "}
                  {Number(details.shipping_cost || 0).toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                  })}
                </p>
              </section>

              <section className="shipment-detail-card">
                <h3><Clock size={18} /> Delivery Dates</h3>
                <p><strong>Created:</strong> {formatDate(details.created_at)}</p>
                <p>
                  <strong>Estimated:</strong>{" "}
                  {formatDate(details.estimated_delivery)}
                </p>
                <p>
                  <strong>Delivered:</strong>{" "}
                  {formatDate(details.actual_delivery)}
                </p>
              </section>
            </div>

            <section className="shipment-detail-history">
              <h3><Truck size={18} /> Tracking History</h3>

              {details.tracking_history?.length ? (
                <div className="tracking-timeline">
                  {details.tracking_history.map((event, index) => (
                    <article
                      className="tracking-event"
                      key={`${event.timestamp}-${index}`}
                    >
                      <h3>{formatStatus(event.status)}</h3>
                      {event.location && (
                        <p className="tracking-event-location">
                          <MapPin size={14} />
                          {event.location}
                        </p>
                      )}
                      {event.notes && <p>{event.notes}</p>}
                      <time>{formatDate(event.timestamp)}</time>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="tracking-empty">
                  No tracking history recorded yet.
                </p>
              )}
            </section>
          </>
        )}
      </section>
    </div>
  );
}
