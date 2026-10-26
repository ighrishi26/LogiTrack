
import { useState } from "react";
import { X, Pencil } from "lucide-react";
import api from "./api";

export default function EditShipment({ shipment, onClose, onUpdated }) {
  const [form, setForm] = useState({
    sender_name: shipment.sender_name || "",
    sender_phone: shipment.sender_phone || "",
    sender_address: shipment.sender_address || "",
    receiver_name: shipment.receiver_name || "",
    receiver_phone: shipment.receiver_phone || "",
    receiver_address: shipment.receiver_address || "",
    origin: shipment.origin || "",
    destination: shipment.destination || "",
    package_description: shipment.package_description || "",
    weight_kg: shipment.weight_kg ?? "",
    shipping_cost: shipment.shipping_cost ?? "",
    estimated_delivery: shipment.estimated_delivery
      ? shipment.estimated_delivery.slice(0, 10)
      : "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.patch(`/shipments/${shipment.id}/`, {
        ...form,
        weight_kg: Number(form.weight_kg),
        shipping_cost: Number(form.shipping_cost),
        estimated_delivery: form.estimated_delivery || null,
      });

      onUpdated();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      setError(
        typeof data === "object" && data
          ? JSON.stringify(data)
          : "Unable to update shipment."
      );
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    ["sender_name", "Sender name", "text"],
    ["sender_phone", "Sender phone", "tel"],
    ["sender_address", "Sender address", "text"],
    ["receiver_name", "Receiver name", "text"],
    ["receiver_phone", "Receiver phone", "tel"],
    ["receiver_address", "Receiver address", "text"],
    ["origin", "Origin", "text"],
    ["destination", "Destination", "text"],
    ["package_description", "Package description", "text"],
    ["weight_kg", "Weight (kg)", "number"],
    ["shipping_cost", "Shipping cost (₹)", "number"],
    ["estimated_delivery", "Estimated delivery", "date"],
  ];

  return (
    <div className="shipment-modal-backdrop">
      <section
        className="shipment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-shipment-title"
      >
        <div className="shipment-modal-header">
          <div>
            <h2 id="edit-shipment-title">
              <Pencil size={22} /> Edit Shipment
            </h2>
            <p>{shipment.tracking_number}</p>
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
          <div className="shipment-form-grid">
            {fields.map(([name, label, type]) => (
              <label className="shipment-field" key={name}>
                <span>{label}</span>
                <input
                  name={name}
                  type={type}
                  value={form[name]}
                  onChange={handleChange}
                  required={name !== "estimated_delivery"}
                  min={type === "number" ? "0" : undefined}
                  step={
                    name === "weight_kg" || name === "shipping_cost"
                      ? "0.01"
                      : undefined
                  }
                />
              </label>
            ))}
          </div>

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
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
