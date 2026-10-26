
import { useState } from "react";
import { X, Truck } from "lucide-react";
import api from "./api";

const statuses = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PICKED_UP", label: "Picked Up" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function UpdateShipmentStatus({
  shipment,
  onClose,
  onUpdated,
}) {
  const [status, setStatus] = useState(shipment.status || "PENDING");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.patch(`/shipments/${shipment.id}/`, {
        status,
        tracking_location: location,
        tracking_notes: notes,
      });

      onUpdated();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      setError(
        typeof data === "object" && data
          ? JSON.stringify(data)
          : "Could not update shipment status."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shipment-modal-backdrop">
      <section className="shipment-modal">
        <div className="shipment-modal-header">
          <div>
            <h2><Truck size={22} /> Update Shipment Status</h2>
            <p>Tracking number: {shipment.tracking_number}</p>
          </div>

          <button
            type="button"
            className="shipment-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="shipment-field">
            <span>New status</span>
            <select
              className="shipment-status-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              required
            >
              {statuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="shipment-field" style={{ marginTop: 18 }}>
            <span>Current location</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. Pune Distribution Centre"
              required
            />
          </label>

          <label className="shipment-field" style={{ marginTop: 18 }}>
            <span>Tracking notes</span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Shipment dispatched"
              required
            />
          </label>

          {error && <p className="shipment-form-error">{error}</p>}

          <div className="shipment-form-actions">
            <button
              type="button"
              className="shipment-cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="shipment-submit"
              disabled={loading}
            >
              {loading ? "Updating..." : "Save Status"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
