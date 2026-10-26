
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  CircleAlert,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Truck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import api from "./api";
import Sidebar from "./Sidebar";
import PageFooter from "./PageFooter";

const stages = [
  { value: "", label: "All stages" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PICKED_UP", label: "Picked up" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const statusLabels = Object.fromEntries(
  stages.filter((stage) => stage.value).map((stage) => [
    stage.value,
    stage.label,
  ])
);

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not scheduled"
    : date.toLocaleDateString();
}

export default function PickupDelivery() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const [profileResult, shipmentResult] = await Promise.allSettled([
        api.get("/auth/me/"),
        api.get("/shipments/", {
          params: {
            search: search.trim() || undefined,
            status: stageFilter || undefined,
            ordering: "-created_at",
            page,
          },
        }),
      ]);

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value.data);
      }

      if (shipmentResult.status === "rejected") {
        throw shipmentResult.reason;
      }

      const data = shipmentResult.value.data;
      const records = Array.isArray(data) ? data : data.results || [];

      setShipments(records);
      setHasNext(Boolean(!Array.isArray(data) && data.next));
      setHasPrevious(Boolean(!Array.isArray(data) && data.previous));

      setSelectedStatuses((previous) => {
        const next = { ...previous };
        records.forEach((shipment) => {
          if (!next[shipment.id]) {
            next[shipment.id] = shipment.status;
          }
        });
        return next;
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not load pickup and delivery records."
      );
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadData]);

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login", { replace: true });
  }

  async function updateStatus(shipment) {
    const nextStatus = selectedStatuses[shipment.id];

    if (!nextStatus || nextStatus === shipment.status) {
      setNotice("Choose a different status before updating.");
      return;
    }

    const location = window.prompt(
      "Enter the current pickup/delivery location:"
    );

    if (location === null) return;

    const notes = window.prompt(
      "Enter a tracking note (optional):",
      `Status changed from ${shipment.status} to ${nextStatus}`
    );

    if (notes === null) return;

    setUpdatingId(shipment.id);
    setError("");
    setNotice("");

    try {
      await api.patch(`/shipments/${shipment.id}/`, {
        status: nextStatus,
        tracking_location: location.trim(),
        tracking_notes: notes.trim(),
      });

      setNotice(
        `${shipment.tracking_number} updated to ${
          statusLabels[nextStatus] || nextStatus
        }.`
      );

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          JSON.stringify(err.response?.data) ||
          "Status update failed. Check your role permissions."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = {
    pickup: shipments.filter((item) =>
      ["PENDING", "CONFIRMED"].includes(item.status)
    ).length,
    moving: shipments.filter((item) =>
      ["PICKED_UP", "IN_TRANSIT"].includes(item.status)
    ).length,
    delivery: shipments.filter(
      (item) => item.status === "OUT_FOR_DELIVERY"
    ).length,
    delivered: shipments.filter(
      (item) => item.status === "DELIVERED"
    ).length,
  };

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} onLogout={logout} />

      <main className="dashboard-main management-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">LOGISTICS OPERATIONS</span>
            <h1>Pickup & Delivery</h1>
            <p>
              Coordinate collection, transit and final-mile delivery.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </header>

        <section className="pickup-stats-grid">
          <article className="stat-card">
            <div className="stat-top">
              <span>Awaiting pickup</span>
              <span className="stat-icon amber">
                <CalendarCheck size={20} />
              </span>
            </div>
            <strong>{counts.pickup}</strong>
            <small>Pending or confirmed</small>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>In transit</span>
              <span className="stat-icon blue">
                <Truck size={20} />
              </span>
            </div>
            <strong>{counts.moving}</strong>
            <small>Picked up or moving</small>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Out for delivery</span>
              <span className="stat-icon blue">
                <MapPin size={20} />
              </span>
            </div>
            <strong>{counts.delivery}</strong>
            <small>Final-mile delivery</small>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Delivered</span>
              <span className="stat-icon green">
                <CheckCircle2 size={20} />
              </span>
            </div>
            <strong>{counts.delivered}</strong>
            <small>Successfully delivered</small>
          </article>
        </section>

        {error && (
          <div className="dashboard-error" role="alert">
            <CircleAlert size={18} />
            <span>{error}</span>
            <button onClick={loadData}>Try again</button>
          </div>
        )}

        {notice && (
          <div className="pickup-notice" role="status">
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}

        <section className="shipments-panel management-panel pickup-panel">
          <div className="panel-heading">
            <div>
              <h2>Pickup and delivery queue</h2>
              <p>
                Review shipment stages and record status updates.
              </p>
            </div>
          </div>

          <div className="pickup-filters">
            <div className="management-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search tracking number, sender or destination"
                aria-label="Search pickup and delivery shipments"
              />
            </div>

            <select
              className="shipment-status-filter"
              value={stageFilter}
              onChange={(event) => {
                setStageFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by shipment stage"
            >
              {stages.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          <div className="table-scroll">
            <table className="shipments-table pickup-table">
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Route</th>
                  <th>Delivery estimate</th>
                  <th>Current stage</th>
                  <th>Update stage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td>
                      <strong>{shipment.tracking_number}</strong>
                      <small className="pickup-sender">
                        {shipment.sender_name} → {shipment.receiver_name}
                      </small>
                    </td>

                    <td>
                      <div className="pickup-route">
                        <span>{shipment.origin}</span>
                        <ArrowRight size={14} />
                        <span>{shipment.destination}</span>
                      </div>
                    </td>

                    <td>{formatDate(shipment.estimated_delivery)}</td>

                    <td>
                      <span
                        className={`status-badge status-${(
                          shipment.status || ""
                        ).toLowerCase()}`}
                      >
                        {statusLabels[shipment.status] || shipment.status}
                      </span>
                    </td>

                    <td>
                      <div className="pickup-update-control">
                        <select
                          value={
                            selectedStatuses[shipment.id] || shipment.status
                          }
                          onChange={(event) =>
                            setSelectedStatuses((previous) => ({
                              ...previous,
                              [shipment.id]: event.target.value,
                            }))
                          }
                          aria-label={`New status for ${shipment.tracking_number}`}
                        >
                          {stages
                            .filter((stage) => stage.value)
                            .map((stage) => (
                              <option
                                key={stage.value}
                                value={stage.value}
                              >
                                {stage.label}
                              </option>
                            ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => updateStatus(shipment)}
                          disabled={
                            updatingId === shipment.id ||
                            (selectedStatuses[shipment.id] || shipment.status) ===
                              shipment.status
                          }
                        >
                          {updatingId === shipment.id
                            ? "Saving..."
                            : "Save"}
                        </button>
                      </div>
                    </td>

                    <td>
                      <button
                        className="management-text-button"
                        onClick={() =>
                          navigate(
                            `/track/${encodeURIComponent(
                              shipment.tracking_number
                            )}`
                          )
                        }
                      >
                        <Package size={15} /> Track
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && shipments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      No shipments match these filters.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      Loading pickup and delivery records...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>Page {page}</span>
            <div className="pagination-controls">
              <button
                disabled={!hasPrevious || loading}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <button
                disabled={!hasNext || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
        <PageFooter label="LogiTrack Pickup & Delivery" />
      </main>
    </div>
  );
}
