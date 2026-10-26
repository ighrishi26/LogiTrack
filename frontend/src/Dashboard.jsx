
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateShipment from "./CreateShipment";
import UpdateShipmentStatus from "./UpdateShipmentStatus";
import ShipmentAnalytics from "./ShipmentAnalytics";
import ShipmentDetails from "./ShipmentDetails";
import EditShipment from "./EditShipment";
import DeleteShipmentButton from "./DeleteShipmentButton";
import Sidebar from "./Sidebar";
import PageFooter from "./PageFooter";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Box,
  CheckCircle2,
  CircleAlert,
  Download,
  Eye,
  PackagePlus,
  Pencil,
  RefreshCw,
  Search,
  SquarePen,
  Truck,
} from "lucide-react";
import api from "./api";

const statusLabels = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function formatStatus(status) {
  return statusLabels[status] || status?.replaceAll("_", " ") || "Unknown";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [shipmentCount, setShipmentCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [shipmentToView, setShipmentToView] = useState(null);
  const [shipmentToEdit, setShipmentToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateShipment, setShowCreateShipment] = useState(false);
  const [shipmentToUpdate, setShipmentToUpdate] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickFilter, setQuickFilter] = useState("ALL");
  const [statsError, setStatsError] = useState("");


  const today = new Date();
const todayKey = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

const delayedShipments = shipments.filter((shipment) => {
  const active =
    !["DELIVERED", "CANCELLED"].includes(shipment.status);

  return (
    active &&
    shipment.estimated_delivery &&
    shipment.estimated_delivery.slice(0, 10) < todayKey
  );
});

const dueTodayShipments = shipments.filter((shipment) => {
  const active =
    !["DELIVERED", "CANCELLED"].includes(shipment.status);

  return (
    active &&
    shipment.estimated_delivery &&
    shipment.estimated_delivery.slice(0, 10) === todayKey
  );
});

const visibleShipments = shipments.filter((shipment) => {
  if (quickFilter === "DELAYED") {
    return delayedShipments.some((item) => item.id === shipment.id);
  }

  if (quickFilter === "ACTIVE") {
    return !["DELIVERED", "CANCELLED"].includes(shipment.status);
  }

  if (quickFilter === "DELIVERED") {
    return shipment.status === "DELIVERED";
  }

  return true;
});

const loadDashboard = useCallback(async (
  searchTerm = "",
  statusTerm = "",
  fromDate = "",
  toDate = "",
  page = 1,
) => {
  setError("");

  try {
    const [profileResult, statsResult, shipmentsResult] =
      await Promise.allSettled([
        api.get("/auth/me/"),
        api.get("/shipments/stats/"),
        api.get("/shipments/", {
          params: {
            search: searchTerm || undefined,
            status: statusTerm || undefined,
            created_at__date__gte: fromDate || undefined,
            created_at__date__lte: toDate || undefined,
            ordering: "-created_at",
            page,
          },
        }),
      ]);

    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value.data);
    }

    if (statsResult.status === "fulfilled") {
  setStats(statsResult.value.data);
  setStatsError("");
} else {
  setStatsError(
    "Shipment statistics could not be loaded. Other dashboard data may still be available."
  );
}

    if (shipmentsResult.status === "fulfilled") {
      const data = shipmentsResult.value.data;

      setShipments(
        Array.isArray(data) ? data : data.results || []
      );
      setShipmentCount(
        Array.isArray(data) ? data.length : data.count || 0
      );
      setHasNextPage(
        Array.isArray(data) ? false : Boolean(data.next)
      );
    } else {
      setError("Unable to load shipment records. Please try again.");
    }

    if (
      profileResult.status === "rejected" &&
      shipmentsResult.status === "rejected"
    ) {
      setError("Unable to load dashboard data. Please log in again.");
    }
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
    void Promise.resolve().then(() => loadDashboard());
  }, [loadDashboard]);

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login", { replace: true });
  }

  function handleSearch(event) {
    event.preventDefault();
    setQuery(search.trim());
    setCurrentPage(1);
    setLoading(true);
    setError("");
    loadDashboard(search.trim(), statusFilter, dateFrom, dateTo, 1);
  }

  
function exportShipmentsToCSV() {
  const rows = visibleShipments;

  if (!rows || rows.length === 0) {
    alert("No shipments available to export.");
    return;
  }

  const columns = [
    ["tracking_number", "Tracking Number"],
    ["sender_name", "Sender"],
    ["receiver_name", "Receiver"],
    ["origin", "Origin"],
    ["destination", "Destination"],
    ["status", "Status"],
    ["weight_kg", "Weight (kg)"],
    ["shipping_cost", "Shipping Cost"],
    ["created_at", "Created At"],
    ["estimated_delivery", "Estimated Delivery"],
  ];

  function escapeCSV(value) {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  const header = columns
    .map(([, label]) => escapeCSV(label))
    .join(",");

  const data = rows.map((shipment) =>
    columns
      .map(([key]) => escapeCSV(shipment[key]))
      .join(",")
  );

  const csv = "\uFEFF" + [header, ...data].join("\r\n");
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "logitrack-shipments.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}


  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} onLogout={logout} />

      <main className="dashboard-main dashboard-home">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">OPERATIONS OVERVIEW</span>
            <h1>Dashboard</h1>
            <p>Monitor shipments and keep deliveries moving.</p>
          </div>
          <div className="dashboard-header-actions">
            <button
              className="refresh-button"
              onClick={() => loadDashboard(query, statusFilter, dateFrom, dateTo, currentPage)}
              disabled={loading}
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              type="button"
              className="create-shipment-button"
              onClick={() => setShowCreateShipment(true)}
            >
              <PackagePlus size={17} /> Create shipment
            </button>
            <button
              type="button"
              className="export-csv-button"
              onClick={exportShipmentsToCSV}
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </header>

        {error && (
          <div className="dashboard-error" role="alert">
            <CircleAlert size={18} /> {error}
            <button
              onClick={() => {
                setLoading(true);
                setError("");
                loadDashboard(query, statusFilter, dateFrom, dateTo, currentPage);
              }}
            >
              Try again
            </button>
          </div>
        )}

        {statsError && (
  <div className="dashboard-error" role="status">
    <CircleAlert size={18} />
    {statsError}
  </div>
)}

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-top">
              <span>Total shipments</span>
              <span className="stat-icon green"><Box size={20} /></span>
            </div>
            <strong>{loading ? "—" : stats?.total ?? 0}</strong>
            <small><Activity size={14} /> All recorded shipments</small>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>In transit</span>
              <span className="stat-icon blue"><Truck size={20} /></span>
            </div>
            <strong>{loading ? "—" : stats?.in_transit ?? 0}</strong>
            <small><ArrowUpRight size={14} /> Currently moving</small>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Delivered</span>
              <span className="stat-icon green"><CheckCircle2 size={20} /></span>
            </div>
            <strong>{loading ? "—" : stats?.delivered ?? 0}</strong>
            <small><ArrowUpRight size={14} /> Successfully delivered</small>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Pending</span>
              <span className="stat-icon amber"><Activity size={20} /></span>
            </div>
            <strong>{loading ? "—" : stats?.pending ?? 0}</strong>
            <small><ArrowDownRight size={14} /> Awaiting processing</small>
          </article>

          
<article className="stat-card">
  <div className="stat-top">
    <span>Out for delivery</span>
    <span className="stat-icon blue">
      <Truck size={20} />
    </span>
  </div>
  <strong>{loading ? "—" : stats?.out_for_delivery ?? 0}</strong>
  <small>
    <Activity size={14} /> Final delivery stage
  </small>
</article>

<article className="stat-card">
  <div className="stat-top">
    <span>Cancelled</span>
    <span className="stat-icon amber">
      <CircleAlert size={20} />
    </span>
  </div>
  <strong>{loading ? "—" : stats?.cancelled ?? 0}</strong>
  <small>
    <Activity size={14} /> Cancelled shipments
  </small>
</article>

        </section>

        <ShipmentAnalytics />

        <section className="shipments-panel operations-alerts-panel">
  <div className="panel-heading">
    <div>
      <h2>Operational alerts</h2>
      <p>
        Delivery dates and active shipments on the current page.
      </p>
    </div>
    <Activity size={22} />
  </div>

  <div className="operations-alert-grid">
    <button
      type="button"
      className="operations-alert-card alert-overdue"
      onClick={() => setQuickFilter("DELAYED")}
    >
      <CircleAlert size={22} />
      <span>Past estimated delivery</span>
      <strong>{delayedShipments.length}</strong>
      <small>Active shipments past their estimated date</small>
    </button>

    <button
      type="button"
      className="operations-alert-card alert-due"
      onClick={() => setQuickFilter("ACTIVE")}
    >
      <Truck size={22} />
      <span>Due today</span>
      <strong>{dueTodayShipments.length}</strong>
      <small>Active shipments estimated for today</small>
    </button>

    <button
      type="button"
      className="operations-alert-card alert-complete"
      onClick={() => setQuickFilter("DELIVERED")}
    >
      <CheckCircle2 size={22} />
      <span>Delivered</span>
      <strong>
        {shipments.filter(
          (shipment) => shipment.status === "DELIVERED"
        ).length}
      </strong>
      <small>Delivered shipments on this page</small>
    </button>
  </div>

  <p className="management-muted">
    Alerts are based on the records currently loaded. A past estimated
    date indicates a potential delay, not proof of a failed delivery.
  </p>
</section>

        <section className="shipments-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent shipments</h2>
              <p>Latest shipment records from your system</p>
            </div>
            <div className="shipment-filters">
              <form className="table-search" onSubmit={handleSearch}>
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tracking number..."
                  aria-label="Search shipments"
                />
                <button type="submit">Search</button>
              </form>
              <select
                className="shipment-status-filter"
                value={statusFilter}
                onChange={(event) => {
                  const nextStatus = event.target.value;
                  setStatusFilter(nextStatus);
                  setCurrentPage(1);
                  setLoading(true);
                  setError("");
                  loadDashboard(query, nextStatus, dateFrom, dateTo, 1);
                }}
                aria-label="Filter shipments by status"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <div className="shipment-date-filters">
                <label>
                  From
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(event) => {
                      const nextDateFrom = event.target.value;
                      setDateFrom(nextDateFrom);
                      setCurrentPage(1);
                      setLoading(true);
                      setError("");
                      loadDashboard(query, statusFilter, nextDateFrom, dateTo, 1);
                    }}
                  />
                </label>

                <label>
                  To
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(event) => {
                      const nextDateTo = event.target.value;
                      setDateTo(nextDateTo);
                      setCurrentPage(1);
                      setLoading(true);
                      setError("");
                      loadDashboard(query, statusFilter, dateFrom, nextDateTo, 1);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="shipment-quick-filters">
  {[
    ["ALL", "All"],
    ["ACTIVE", "Active"],
    ["DELAYED", "Potentially delayed"],
    ["DELIVERED", "Delivered"],
  ].map(([value, label]) => (
    <button
      key={value}
      type="button"
      className={
        quickFilter === value
          ? "shipment-quick-filter active"
          : "shipment-quick-filter"
      }
      onClick={() => setQuickFilter(value)}
      aria-pressed={quickFilter === value}
    >
      {label}
    </button>
  ))}
</div>


          <div className="table-scroll">
            <table className="shipments-table">
              <thead>
                <tr>
                  <th>Tracking number</th>
                  <th>Sender</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleShipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td>
                      <a
                        className="tracking-link"
                        href={`/track/${encodeURIComponent(shipment.tracking_number)}`}
                      >
                        {shipment.tracking_number}
                      </a>
                    </td>
                    <td>{shipment.sender_name}</td>
                    <td>{shipment.destination}</td>
                    <td>
                      <span className={`status-badge status-${shipment.status.toLowerCase()}`}>
                        {formatStatus(shipment.status)}
                      </span>
                    </td>
                    <td>
                      {shipment.created_at
                        ? new Date(shipment.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <div className="shipment-row-actions">
                      <button
                        type="button"
                        className="action-button action-button-view"
                        onClick={() => setShipmentToView(shipment)}
                        aria-label="View shipment details"
                        title="View details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        className="action-button action-button-update"
                        onClick={() => setShipmentToUpdate(shipment)}
                        aria-label="Update shipment status"
                        title="Update status"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
  type="button"
  className="action-button action-button-edit"
  onClick={() => setShipmentToEdit(shipment)}
  aria-label="Edit shipment"
  title="Edit shipment"
>
  <SquarePen size={14} />
</button>
<DeleteShipmentButton
  shipment={shipment}
  onDeleted={() => window.location.reload()}
/>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && visibleShipments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      No shipments found.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      Loading shipments...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>
              Showing {shipmentCount === 0 ? 0 : (currentPage - 1) * 10 + 1}-
              {Math.min(currentPage * 10, shipmentCount)} of {shipmentCount} shipments
            </span>
            <span>{stats?.total ?? 0} total records</span>
            {(currentPage > 1 || hasNextPage) && (
              <div className="pagination-controls">
                <button
                  type="button"
                  onClick={() => {
                    const previousPage = currentPage - 1;
                    setCurrentPage((page) => page - 1);
                    setLoading(true);
                    loadDashboard(query, statusFilter, dateFrom, dateTo, previousPage);
                  }}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span>Page {currentPage}</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextPage = currentPage + 1;
                    setCurrentPage((page) => page + 1);
                    setLoading(true);
                    loadDashboard(query, statusFilter, dateFrom, dateTo, nextPage);
                  }}
                  disabled={!hasNextPage}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
        <PageFooter label="LogiTrack Operations Dashboard" />
      </main>
      {showCreateShipment && (
        <CreateShipment
          onClose={() => setShowCreateShipment(false)}
          onCreated={() => {
            window.location.reload();
          }}
        />
      )}
      {shipmentToUpdate && (
        <UpdateShipmentStatus
          shipment={shipmentToUpdate}
          onClose={() => setShipmentToUpdate(null)}
          onUpdated={() => window.location.reload()}
        />
      )}
      {shipmentToView && (
        <ShipmentDetails
          shipment={shipmentToView}
          onClose={() => setShipmentToView(null)}
        />
      )}
      {shipmentToEdit && (
  <EditShipment
    shipment={shipmentToEdit}
    onClose={() => setShipmentToEdit(null)}
    onUpdated={() => window.location.reload()}
  />
)}
    </div>
  );
}
