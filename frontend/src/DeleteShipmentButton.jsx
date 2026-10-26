
import { useState } from "react";
import api from "./api";
import { Trash2 } from "lucide-react";

export default function DeleteShipmentButton({ shipment, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete shipment ${shipment.tracking_number}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      await api.delete(`/shipments/${shipment.id}/`);

      alert("Shipment deleted successfully.");
      if (onDeleted) onDeleted();
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        "Unable to delete shipment. Please try again.";

      alert(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      type="button"
      className="action-button action-button-delete"
      onClick={handleDelete}
      disabled={deleting}
      aria-label={deleting ? "Deleting shipment" : "Delete shipment"}
      title={deleting ? "Deleting shipment" : "Delete shipment"}
    >
      <Trash2 size={16} />
    </button>
  );
}
