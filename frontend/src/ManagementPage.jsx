
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Package,
  CalendarCheck,
  Users,
  Truck,
  Warehouse,
  ReceiptText,
  BarChart3,
  Settings,
  RefreshCw,
  CircleAlert,
  ArrowRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "./api";
import Sidebar from "./Sidebar";
import PageFooter from "./PageFooter";

const reportChartColors = [
  "#176b4d",
  "#4b8b68",
  "#719b7b",
  "#d39a3c",
  "#5275a1",
  "#8068a0",
  "#b05d56",
];

const statusChartColors = {
  PENDING: "#c28a35",
  CONFIRMED: "#557b9b",
  PICKED_UP: "#8068a0",
  IN_TRANSIT: "#33828a",
  OUT_FOR_DELIVERY: "#5275a1",
  DELIVERED: "#35805b",
  CANCELLED: "#b05d56",
};

const pageConfig = {
  "/shipments": {
    title: "Shipments",
    description: "Search and review shipment records.",
    icon: Package,
  },
  "/live-tracking": {
    title: "Live Tracking",
    description: "Look up a shipment and inspect its tracking timeline.",
    icon: MapPin,
  },
  "/pickup-delivery": {
    title: "Pickup & Delivery",
    description: "Coordinate upcoming pickups and final deliveries.",
    icon: CalendarCheck,
  },
  "/customers": {
    title: "Customers",
    description: "Manage customer profiles and shipment relationships.",
    icon: Users,
  },
  "/fleet": {
    title: "Drivers & Fleet",
    description: "Manage drivers, vehicles, and fleet assignments.",
    icon: Truck,
  },
  "/warehouses": {
    title: "Warehouses",
    description: "Organize warehouse locations and operations.",
    icon: Warehouse,
  },
  "/billing": {
    title: "Billing & Invoices",
    description: "Manage shipping charges, invoices, and payment records.",
    icon: ReceiptText,
  },
  "/reports": {
    title: "Analytics & Reports",
    description: "Review shipment performance and operational reports.",
    icon: BarChart3,
  },
  "/settings": {
    title: "Settings",
    description: "Account information and application preferences.",
    icon: Settings,
  },
};

const statusLabels = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function ManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = pageConfig[location.pathname] || pageConfig["/shipments"];
  const PageIcon = page.icon;

  const [profile, setProfile] = useState(null);
  const [profileRefreshing, setProfileRefreshing] = useState(false);
  const [profileRefreshError, setProfileRefreshError] = useState("");
  const [profileRefreshSuccess, setProfileRefreshSuccess] = useState("");
  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackedShipment, setTrackedShipment] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [reportShipments, setReportShipments] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatus, setReportStatus] = useState("ALL");

  useEffect(() => {
    api.get("/auth/me/")
      .then((response) => setProfile(response.data))
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    if (location.pathname !== "/shipments") return;

    let cancelled = false;

    async function loadShipments() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/shipments/", {
          params: {
            search: search.trim() || undefined,
            ordering: "-created_at",
            page: 1,
          },
        });

        if (!cancelled) {
          const data = response.data;
          setShipments(
            Array.isArray(data) ? data : data.results || []
          );
        }
      } catch {
        if (!cancelled) {
          setError("Could not load shipments. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(loadShipments, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [location.pathname, search]);

  useEffect(() => {
  if (location.pathname !== "/reports") return;

  let cancelled = false;

  async function loadReportShipments() {
    setReportLoading(true);
    setReportError("");

    try {
      const response = await api.get("/shipments/", {
        params: {
          ordering: "-created_at",
          page: 1,
          page_size: 1000,
        },
      });

      const data = response.data;
      const records = Array.isArray(data)
        ? data
        : data.results || [];

      if (!cancelled) {
        setReportShipments(records);
      }
    } catch {
      if (!cancelled) {
        setReportError(
          "Unable to load shipment reports. Please refresh and try again."
        );
      }
    } finally {
      if (!cancelled) {
        setReportLoading(false);
      }
    }
  }

  loadReportShipments();

  return () => {
    cancelled = true;
  };
}, [location.pathname]);

const reportStatuses = [
  "PENDING",
  "CONFIRMED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const reportCounts = reportStatuses.reduce((counts, status) => {
  counts[status] = reportShipments.filter(
    (shipment) => shipment.status === status
  ).length;

  return counts;
}, {});

const reportStatusChartData = reportStatuses
  .map((status) => ({
    name: statusLabels[status],
    value: reportCounts[status],
    color: statusChartColors[status],
  }))
  .filter((entry) => entry.value > 0);

const reportMonthSlots = Array.from({ length: 6 }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 5 + index);

  return {
    date,
    key: `${date.getFullYear()}-${date.getMonth()}`,
    label: date.toLocaleDateString(undefined, { month: "short" }),
    shipments: 0,
    shippingCost: 0,
  };
});

const reportMonthsByKey = new Map(
  reportMonthSlots.map((month) => [month.key, month])
);

const reportDestinationCounts = {};
const reportRouteCounts = {};
const reportWeightCounts = [
  { range: "≤ 1 kg", count: 0 },
  { range: "> 1–5 kg", count: 0 },
  { range: "> 5–10 kg", count: 0 },
  { range: "> 10–25 kg", count: 0 },
  { range: "> 25 kg", count: 0 },
];

reportShipments.forEach((shipment) => {
  const createdAt = shipment.created_at
    ? new Date(shipment.created_at)
    : null;

  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    const monthKey = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const month = reportMonthsByKey.get(monthKey);

    if (month) {
      month.shipments += 1;
      month.shippingCost += Number(shipment.shipping_cost) || 0;
    }
  }

  const destination = String(shipment.destination || "Unknown");
  reportDestinationCounts[destination] =
    (reportDestinationCounts[destination] || 0) + 1;

  const origin = String(shipment.origin || "Unknown");
  const route = `${origin} → ${destination}`;
  reportRouteCounts[route] = (reportRouteCounts[route] || 0) + 1;

  const weight = Number(shipment.weight_kg);
  if (Number.isFinite(weight) && weight >= 0) {
    const bucket =
      weight <= 1 ? 0 :
      weight <= 5 ? 1 :
      weight <= 10 ? 2 :
      weight <= 25 ? 3 : 4;
    reportWeightCounts[bucket].count += 1;
  }
});

const reportTopDestinations = Object.entries(reportDestinationCounts)
  .map(([destination, shipments]) => ({ destination, shipments }))
  .sort((a, b) => b.shipments - a.shipments)
  .slice(0, 6);

const reportTopRoutes = Object.entries(reportRouteCounts)
  .map(([route, shipments]) => ({ route, shipments }))
  .sort((a, b) => b.shipments - a.shipments)
  .slice(0, 6);

const filteredReportShipments = reportShipments.filter((shipment) => {
  const term = reportSearch.trim().toLowerCase();

  const matchesSearch =
    !term ||
    [
      shipment.tracking_number,
      shipment.sender_name,
      shipment.origin,
      shipment.destination,
    ].some((value) =>
      String(value || "").toLowerCase().includes(term)
    );

  const matchesStatus =
    reportStatus === "ALL" || shipment.status === reportStatus;

  return matchesSearch && matchesStatus;
});

const deliveredCount = reportCounts.DELIVERED || 0;

const deliveryRate =
  reportShipments.length > 0
    ? Math.round((deliveredCount / reportShipments.length) * 100)
    : 0;

function exportShipmentReport() {
  const headers = [
    "Tracking Number",
    "Sender",
    "Origin",
    "Destination",
    "Status",
    "Created At",
  ];

  const escapeCsv = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const rows = filteredReportShipments.map((shipment) => [
    shipment.tracking_number,
    shipment.sender_name,
    shipment.origin,
    shipment.destination,
    statusLabels[shipment.status] || shipment.status,
    shipment.created_at
      ? new Date(shipment.created_at).toLocaleString()
      : "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "logitrack-shipment-report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

async function refreshProfile() {
  setProfileRefreshing(true);
  setProfileRefreshError("");
  setProfileRefreshSuccess("");

  try {
    const response = await api.get("/auth/me/");
    setProfile(response.data);
    setProfileRefreshSuccess("Account information refreshed.");
  } catch {
    setProfileRefreshError(
      "Could not refresh account information. Please try again."
    );
  } finally {
    setProfileRefreshing(false);
  }
}

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login", { replace: true });
  }

  async function trackShipment(event) {
    event.preventDefault();

    const number = trackingNumber.trim();

    if (!number) return;

    setTrackingLoading(true);
    setTrackingError("");
    setTrackedShipment(null);

    try {
      const response = await api.get(
        `/track/${encodeURIComponent(number)}/`
      );

      setTrackedShipment(
        response.data.shipment || response.data
      );
    } catch {
      setTrackingError(
        "Shipment not found, or tracking is temporarily unavailable."
      );
    } finally {
      setTrackingLoading(false);
    }
  }

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} onLogout={logout} />

      <main className="dashboard-main management-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">LOGITRACK OPERATIONS</span>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
          </div>
          <div className="management-page-icon">
            <PageIcon size={25} />
          </div>
        </header>

        {location.pathname === "/shipments" && (
          <section className="shipments-panel management-panel">
            <div className="panel-heading">
              <div>
                <h2>Shipment records</h2>
                <p>Records retrieved from your logistics database</p>
              </div>
              <span className="management-count">
                {shipments.length} shown
              </span>
            </div>

            <div className="management-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tracking number, sender, or destination"
                aria-label="Search shipments"
              />
            </div>

            {error && (
              <div className="dashboard-error">
                <CircleAlert size={18} />
                {error}
                <button
                  onClick={() => setSearch((value) => value)}
                >
                  Retry
                </button>
              </div>
            )}

            <div className="table-scroll">
              <table className="shipments-table">
                <thead>
                  <tr>
                    <th>Tracking number</th>
                    <th>Sender</th>
                    <th>Destination</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((shipment) => (
                    <tr key={shipment.id}>
                      <td>
                        <strong>{shipment.tracking_number}</strong>
                      </td>
                      <td>{shipment.sender_name}</td>
                      <td>{shipment.destination}</td>
                      <td>
                        <span
                          className={`status-badge status-${(
                            shipment.status || ""
                          ).toLowerCase()}`}
                        >
                          {statusLabels[shipment.status] ||
                            shipment.status}
                        </span>
                      </td>
                      <td>
                        {shipment.created_at
                          ? new Date(
                              shipment.created_at
                            ).toLocaleDateString()
                          : "—"}
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
                          Track <ArrowRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!loading && shipments.length === 0 && (
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
          </section>
        )}

        {location.pathname === "/live-tracking" && (
          <section className="shipments-panel management-panel">
            <div className="panel-heading">
              <div>
                <h2>Track a shipment</h2>
                <p>
                  Enter a tracking number to retrieve its latest
                  recorded status and history.
                </p>
              </div>
            </div>

            <form
              className="management-search tracking-search"
              onSubmit={trackShipment}
            >
              <Search size={18} />
              <input
                value={trackingNumber}
                onChange={(event) =>
                  setTrackingNumber(event.target.value)
                }
                placeholder="e.g. LT-DA43F746CE"
                aria-label="Tracking number"
                required
              />
              <button type="submit" disabled={trackingLoading}>
                {trackingLoading ? "Searching..." : "Track"}
              </button>
            </form>

            {trackingError && (
              <p className="management-error" role="alert">
                {trackingError}
              </p>
            )}

            {trackedShipment && (
              <div className="tracking-result">
                <div className="tracking-result-heading">
                  <div>
                    <span className="eyebrow">TRACKING NUMBER</span>
                    <h2>{trackedShipment.tracking_number}</h2>
                  </div>
                  <span
                    className={`status-badge status-${(
                      trackedShipment.status || ""
                    ).toLowerCase()}`}
                  >
                    {statusLabels[trackedShipment.status] ||
                      trackedShipment.status}
                  </span>
                </div>

                <div className="tracking-route">
                  <div>
                    <span>ORIGIN</span>
                    <strong>{trackedShipment.origin || "—"}</strong>
                  </div>
                  <ArrowRight size={22} />
                  <div>
                    <span>DESTINATION</span>
                    <strong>{trackedShipment.destination || "—"}</strong>
                  </div>
                </div>

                <h3>Tracking timeline</h3>

                {trackedShipment.tracking_history?.length > 0 ? (
                  <div className="management-timeline">
                    {trackedShipment.tracking_history.map(
                      (event, index) => (
                        <div
                          className="management-timeline-event"
                          key={`${event.timestamp}-${index}`}
                        >
                          <span className="timeline-dot" />
                          <div>
                            <strong>
                              {statusLabels[event.status] ||
                                event.status}
                            </strong>
                            <p>{event.location || "Location not provided"}</p>
                            {event.notes && <p>{event.notes}</p>}
                            <small>
                              {event.timestamp
                                ? new Date(
                                    event.timestamp
                                  ).toLocaleString()
                                : ""}
                            </small>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="management-muted">
                    No tracking events have been recorded yet.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {location.pathname === "/reports" && (
  <section className="shipments-panel management-panel reports-panel">
    <div className="panel-heading">
      <div>
        <h2>Shipment analytics</h2>
        <p>
          Performance summaries calculated from your shipment records.
        </p>
      </div>

      <button
        className="management-text-button"
        onClick={() => window.location.reload()}
        disabled={reportLoading}
      >
        <RefreshCw size={16} />
        Refresh
      </button>
    </div>

    {reportError && (
      <div className="dashboard-error" role="alert">
        <CircleAlert size={18} />
        {reportError}
        <button onClick={() => navigate("/reports")}>
          Retry
        </button>
      </div>
    )}

    {reportLoading && (
      <p className="management-muted report-loading-state">
        Loading report data...
      </p>
    )}

    {!reportLoading && !reportError && (
      <>
        <div className="report-stat-grid">
          <article className="report-stat-card">
            <span>Total shipments</span>
            <strong>{reportShipments.length}</strong>
            <Package size={21} />
          </article>

          <article className="report-stat-card">
            <span>Delivered</span>
            <strong>{deliveredCount}</strong>
            <CalendarCheck size={21} />
          </article>

          <article className="report-stat-card">
            <span>In transit</span>
            <strong>{reportCounts.IN_TRANSIT || 0}</strong>
            <Truck size={21} />
          </article>

          <article className="report-stat-card">
            <span>Delivery rate</span>
            <strong>{deliveryRate}%</strong>
            <BarChart3 size={21} />
          </article>
        </div>

        <section className="report-charts-grid" aria-label="Shipment analytics charts">
          <article className="report-chart-card">
            <div className="report-chart-heading">
              <h3>Shipment volume</h3>
              <p>Shipments created each month · last 6 months</p>
            </div>
            <div className="report-chart">
              {reportShipments.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportMonthSlots} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="shipmentVolumeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#176b4d" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#176b4d" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#edf2ee" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#718078", fontSize: 11 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#718078", fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="shipments" name="Shipments" stroke="#176b4d" strokeWidth={2.5} fill="url(#shipmentVolumeFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="report-chart-empty">No shipment data available.</p>
              )}
            </div>
          </article>

          <article className="report-chart-card">
            <div className="report-chart-heading">
              <h3>Status distribution</h3>
              <p>Share of shipments by current status</p>
            </div>
            <div className="report-chart">
              {reportStatusChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportStatusChartData} dataKey="value" nameKey="name" cx="50%" cy="43%" innerRadius={54} outerRadius={88} paddingAngle={3} stroke="#fff" strokeWidth={3}>
                      {reportStatusChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={46} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="report-chart-empty">No status data available.</p>
              )}
            </div>
          </article>

          <article className="report-chart-card">
            <div className="report-chart-heading">
              <h3>Top shipping routes</h3>
              <p>Most frequently used origin and destination pairs</p>
            </div>
            <div className="report-chart">
              {reportTopRoutes.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportTopRoutes} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                    <CartesianGrid stroke="#edf2ee" strokeDasharray="3 5" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#718078", fontSize: 11 }} />
                    <YAxis type="category" dataKey="route" width={132} tickFormatter={(value) => value.length > 20 ? `${value.slice(0, 18)}…` : value} axisLine={false} tickLine={false} tick={{ fill: "#526258", fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="shipments" name="Shipments" fill="#4b8b68" radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="report-chart-empty">No route data available.</p>
              )}
            </div>
          </article>

          <article className="report-chart-card">
            <div className="report-chart-heading">
              <h3>Top destinations</h3>
              <p>Shipment volume for the most served destinations</p>
            </div>
            <div className="report-chart">
              {reportTopDestinations.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportTopDestinations} margin={{ top: 8, right: 8, left: -18, bottom: 42 }}>
                    <CartesianGrid stroke="#edf2ee" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="destination" tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 12)}…` : value} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={55} tick={{ fill: "#718078", fontSize: 10 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#718078", fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="shipments" name="Shipments" radius={[5, 5, 0, 0]}>
                      {reportTopDestinations.map((entry, index) => (
                        <Cell key={entry.destination} fill={reportChartColors[index % reportChartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="report-chart-empty">No destination data available.</p>
              )}
            </div>
          </article>

          <article className="report-chart-card">
            <div className="report-chart-heading">
              <h3>Shipping cost trend</h3>
              <p>Total shipping charges recorded each month</p>
            </div>
            <div className="report-chart">
              {reportShipments.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportMonthSlots} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#edf2ee" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#718078", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#718078", fontSize: 10 }} />
                    <Tooltip formatter={(value) => [Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }), "Shipping cost"]} />
                    <Line type="monotone" dataKey="shippingCost" name="Shipping cost" stroke="#d39a3c" strokeWidth={2.5} dot={{ r: 3, fill: "#d39a3c" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="report-chart-empty">No shipping cost data available.</p>
              )}
            </div>
          </article>

          <article className="report-chart-card">
            <div className="report-chart-heading">
              <h3>Shipment weight profile</h3>
              <p>Number of shipments by package weight range</p>
            </div>
            <div className="report-chart">
              {reportShipments.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportWeightCounts} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#edf2ee" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: "#718078", fontSize: 10 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#718078", fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Shipments" fill="#5275a1" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="report-chart-empty">No shipment weight data available.</p>
              )}
            </div>
          </article>
        </section>

        <div className="report-table-panel">
          <div className="panel-heading">
            <div>
              <h2>Shipment report</h2>
              <p>
                Search, filter, and export the loaded records.
              </p>
            </div>

            <button
              className="management-text-button"
              onClick={exportShipmentReport}
              disabled={filteredReportShipments.length === 0}
            >
              Export CSV <ArrowRight size={15} />
            </button>
          </div>

          <div className="report-filters">
            <div className="management-search">
              <Search size={18} />
              <input
                value={reportSearch}
                onChange={(event) =>
                  setReportSearch(event.target.value)
                }
                placeholder="Search tracking, sender, or route"
                aria-label="Search shipment report"
              />
            </div>

            <select
              value={reportStatus}
              onChange={(event) =>
                setReportStatus(event.target.value)
              }
              aria-label="Filter by shipment status"
            >
              <option value="ALL">All statuses</option>
              {reportStatuses.map((status) => (
                <option value={status} key={status}>
                  {statusLabels[status] || status}
                </option>
              ))}
            </select>
          </div>

          <p className="management-muted">
            Showing {filteredReportShipments.length} of{" "}
            {reportShipments.length} loaded records.
          </p>

          <div className="table-scroll">
            <table className="shipments-table">
              <thead>
                <tr>
                  <th>Tracking number</th>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>View</th>
                </tr>
              </thead>

              <tbody>
                {filteredReportShipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td>
                      <strong>{shipment.tracking_number}</strong>
                    </td>
                    <td>{shipment.origin || "—"}</td>
                    <td>{shipment.destination || "—"}</td>
                    <td>
                      <span
                        className={`status-badge status-${(
                          shipment.status || ""
                        ).toLowerCase()}`}
                      >
                        {statusLabels[shipment.status] ||
                          shipment.status ||
                          "—"}
                      </span>
                    </td>
                    <td>
                      {shipment.created_at
                        ? new Date(
                            shipment.created_at
                          ).toLocaleDateString()
                        : "—"}
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
                        Track <ArrowRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredReportShipments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      No matching shipment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}
  </section>
)}

{location.pathname === "/settings" && (
  <section className="settings-workspace">
    <div className="settings-intro">
      <div className="settings-intro-icon">
        <Settings size={25} />
      </div>

      <div>
        <h2>Account & application settings</h2>
        <p>
          Review your account information and current application setup.
        </p>
      </div>
    </div>

    {profileRefreshError && (
      <div className="dashboard-error" role="alert">
        <CircleAlert size={18} />
        {profileRefreshError}
      </div>
    )}

    {profileRefreshSuccess && (
      <p className="settings-success" role="status">
        {profileRefreshSuccess}
      </p>
    )}

    <div className="settings-grid">
      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-card-icon">
            <Users size={21} />
          </div>
          <div>
            <h3>Account information</h3>
            <p>Your authenticated LogiTrack account</p>
          </div>
        </div>

        <div className="settings-profile">
          <div className="settings-avatar">
            {(profile?.username || profile?.email || "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>
              {profile?.username || "User"}
            </strong>
            <span>Signed-in account</span>
          </div>
        </div>

        <div className="settings-detail">
          <span>Username</span>
          <strong>{profile?.username || "Not available"}</strong>
        </div>

        <div className="settings-detail">
          <span>Email address</span>
          <strong>{profile?.email || "Not provided"}</strong>
        </div>

        <div className="settings-detail">
          <span>Role</span>
          <strong>
            {profile?.role || profile?.user_type || "Not available"}
          </strong>
        </div>

        <button
          className="settings-primary-button"
          onClick={refreshProfile}
          disabled={profileRefreshing}
        >
          <RefreshCw
            size={16}
            className={profileRefreshing ? "settings-spinning" : ""}
          />
          {profileRefreshing ? "Refreshing..." : "Refresh account"}
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-card-icon">
            <Settings size={21} />
          </div>
          <div>
            <h3>Application information</h3>
            <p>Current LogiTrack environment</p>
          </div>
        </div>

        <div className="settings-detail">
          <span>Application</span>
          <strong>LogiTrack</strong>
        </div>

        <div className="settings-detail">
          <span>Frontend</span>
          <strong>React</strong>
        </div>

        <div className="settings-detail">
          <span>Backend</span>
          <strong>Django REST API</strong>
        </div>

        <div className="settings-detail">
          <span>Authentication</span>
          <strong>JWT session</strong>
        </div>

        <div className="settings-info-note">
          <CircleAlert size={18} />
          <p>
            Account access is managed by the existing authentication
            system. Changes to server configuration should be made
            through the appropriate backend settings.
          </p>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-card-icon">
            <CircleAlert size={21} />
          </div>
          <div>
            <h3>Security & access</h3>
            <p>Keep your account secure</p>
          </div>
        </div>

        <div className="settings-security-item">
          <div>
            <strong>Authenticated access</strong>
            <p>
              Your account uses the existing LogiTrack login system.
            </p>
          </div>
          <span className="settings-status">Configured</span>
        </div>

        <div className="settings-security-item">
          <div>
            <strong>Session management</strong>
            <p>
              Sign out when using a shared or public computer.
            </p>
          </div>
        </div>

        <button
          className="settings-secondary-button"
          onClick={logout}
        >
          Sign out of LogiTrack
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-card-icon">
            <Package size={21} />
          </div>
          <div>
            <h3>Data & records</h3>
            <p>Protect your operational information</p>
          </div>
        </div>

        <div className="settings-detail">
          <span>Shipment records</span>
          <strong>Existing records preserved</strong>
        </div>

        <div className="settings-detail">
          <span>Database changes</span>
          <strong>None made by this page</strong>
        </div>

        <div className="settings-info-note">
          <CircleAlert size={18} />
          <p>
            This page does not reset the database, delete records,
            change permissions, or modify passwords. Those actions
            require separate, properly validated functionality.
          </p>
        </div>
      </section>
    </div>
  </section>
)}

{!["/shipments", "/live-tracking", "/settings", "/reports"].includes(
  location.pathname
) && (
  <section className="shipments-panel management-panel">
    <div className="module-placeholder">
      <div className="feature-icon">
        <PageIcon size={26} />
      </div>
      <h2>{page.title} workspace</h2>
      <p>
        This module's page is ready. The next implementation
        step is to add its database model, API endpoints,
        validation, and working management forms.
      </p>
      <span className="management-muted">
        No sample records are being shown as real data.
      </span>
    </div>
  </section>
)}

        <button
          className="refresh-button management-back-button"
          onClick={() => navigate("/dashboard")}
        >
          <RefreshCw size={16} /> Back to dashboard
        </button>
        <PageFooter label={`LogiTrack ${page.title}`} />
      </main>
    </div>
  );
}
