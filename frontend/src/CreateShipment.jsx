
import { useState } from "react";
import api from "./api";
import { X, PackagePlus } from "lucide-react";

export default function CreateShipment({ onClose, onCreated }) {
  const [form, setForm] = useState({
  sender_name: "",
  sender_phone: "",
  sender_address: "",
  receiver_name: "",
  receiver_phone: "",
  receiver_address: "",
  origin: "",
  destination: "",
  package_description: "",
  weight_kg: "",
  shipping_cost: "",
  estimated_delivery: "",
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
      const payload = {
        ...form,
        weight_kg: Number(form.weight_kg),
        shipping_cost: Number(form.shipping_cost),
        estimated_delivery: form.estimated_delivery || null,
      };

      await api.post("/shipments/", payload);
      onCreated();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      setError(
        typeof data === "object"
          ? Object.entries(data)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : JSON.stringify(value)}`)
              .join(" | ")
          : "Could not create shipment. Please try again."
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
  ["shipping_cost", "Shipping cost", "number"],
  ["estimated_delivery", "Estimated delivery", "date"],
];

  return (
    <div className="shipment-modal-backdrop">
      <section className="shipment-modal">
        <div className="shipment-modal-header">
          <div>
            <h2><PackagePlus size={22} /> Create Shipment</h2>
            <p>Enter the shipment details below.</p>
          </div>
          <button type="button" className="shipment-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="shipment-form-grid">
            {fields.map(([name, label, type]) => (
              <label key={name} className="shipment-field">
                <span>{label}</span>
                <input
                  name={name}
                  type={type}
                  value={form[name]}
                  onChange={handleChange}
                  required={!["estimated_delivery"].includes(name)}
                  min={type === "number" ? "0" : undefined}
                  step={name === "weight_kg" || name === "shipping_cost" ? "0.01" : undefined}
                />
              </label>
            ))}
          </div>

          {error && <p className="shipment-form-error">{error}</p>}

          <div className="shipment-form-actions">
            <button type="button" className="shipment-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="shipment-submit" disabled={loading}>
              {loading ? "Creating..." : "Create Shipment"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
