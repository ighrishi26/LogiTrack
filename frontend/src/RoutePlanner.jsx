
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Plus,
  RefreshCw,
  Route,
  Truck,
} from "lucide-react";
import api from "./api";
import Sidebar from "./Sidebar";
import PageFooter from "./PageFooter";

function getResults(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

function getErrorMessage(error) {
  const data = error.response?.data;

  if (data?.detail) return data.detail;

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([key, value]) => {
        const message = Array.isArray(value) ? value.join(" ") : String(value);
        return `${key}: ${message}`;
      })
      .join(" ");
  }

  return "Unable to complete the request. Please try again.";
}

export default function RoutePlanner() {
  const [profile, setProfile] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    name: "",
    route_date: new Date().toLocaleDateString("en-CA"),
    driver: "",
    vehicle: "",
  });

  const [stopForm, setStopForm] = useState({
    shipment: "",
    stop_order: "1",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        profileResponse,
        routesResponse,
        driversResponse,
        vehiclesResponse,
        shipmentsResponse,
      ] = await Promise.all([
        api.get("/auth/me/"),
        api.get("/routes/"),
        api.get("/drivers/"),
        api.get("/vehicles/"),
        api.get("/shipments/"),
      ]);

      setProfile(profileResponse.data);
      setRoutes(getResults(routesResponse.data));
      setDrivers(getResults(driversResponse.data));
      setVehicles(getResults(vehiclesResponse.data));
      setShipments(getResults(shipmentsResponse.data));
    } catch (err) {
  console.error("Route Planner API Error:", {
    message: err.message,
    url: err.config?.url,
    status: err.response?.status,
    response: err.response?.data,
  });

  setError(
    err.response?.data?.detail ||
    `Request failed: ${err.config?.url || "Unknown API"} - ${
      err.response?.status || err.message
    }`
  );
} finally {
  setLoading(false);
}
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function createRoute(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");

    try {
      const response = await api.post("/routes/", {
        ...form,
        driver: Number(form.driver),
        vehicle: Number(form.vehicle),
      });

      setSelectedRoute(response.data);
      setNotice("Delivery route created successfully.");

      setForm({
        name: "",
        route_date: new Date().toLocaleDateString("en-CA"),
        driver: "",
        vehicle: "",
      });

      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function addStop(event) {
    event.preventDefault();
    if (!selectedRoute) return;

    setSaving(true);
    setNotice("");
    setError("");

    try {
      await api.post(`/routes/${selectedRoute.id}/stops/`, {
        shipment: Number(stopForm.shipment),
        stop_order: Number(stopForm.stop_order),
      });

      const response = await api.get(`/routes/${selectedRoute.id}/`);

      setSelectedRoute(response.data);
      setNotice("Shipment added to the route.");

      setStopForm({
        shipment: "",
        stop_order: String((response.data.stops?.length || 0) + 1),
      });

      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function updateProgress(event) {
    const status = event.target.value;
    if (!selectedRoute) return;

    setSaving(true);
    setNotice("");
    setError("");

    try {
      const response = await api.patch(
        `/routes/${selectedRoute.id}/progress/`,
        { status },
      );

      setSelectedRoute(response.data);
      setNotice("Route status updated.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function selectRoute(route) {
    setError("");

    try {
      const response = await api.get(`/routes/${route.id}/`);

      setSelectedRoute(response.data);
      setStopForm({
        shipment: "",
        stop_order: String((response.data.stops?.length || 0) + 1),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  }

  const availableDrivers = drivers.filter(
    (driver) => driver.availability === "AVAILABLE",
  );

  const availableVehicles = vehicles.filter(
    (vehicle) => vehicle.status === "AVAILABLE",
  );

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} onLogout={handleLogout} />

      <main className="dashboard-main route-planner-main">
        <header className="route-planner-header">
          <div>
            <span className="route-planner-eyebrow">
              LOGISTICS OPERATIONS
            </span>
            <h1>Delivery Route Planner</h1>
            <p>
              Assign drivers, allocate vehicles, and organize shipment stops.
            </p>
          </div>

          <button
            type="button"
            className="route-planner-secondary-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="route-planner-message error" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="route-planner-message success" role="status">
            {notice}
          </div>
        )}

        <section className="route-planner-stats">
          <article className="route-planner-stat">
            <Route size={23} />
            <div>
              <span>Total routes</span>
              <strong>{routes.length}</strong>
            </div>
          </article>

          <article className="route-planner-stat">
            <Truck size={23} />
            <div>
              <span>Available drivers</span>
              <strong>{availableDrivers.length}</strong>
            </div>
          </article>

          <article className="route-planner-stat">
            <MapPin size={23} />
            <div>
              <span>Available vehicles</span>
              <strong>{availableVehicles.length}</strong>
            </div>
          </article>
        </section>

        <div className="route-planner-grid">
          <section className="route-planner-panel">
            <h2>Create a delivery route</h2>
            <p>Choose the driver and vehicle for this delivery run.</p>

            <form
              onSubmit={createRoute}
              className="route-planner-form"
            >
              <label>
                Route name
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="e.g. Pune to Mumbai"
                  maxLength={150}
                  required
                />
              </label>

              <label>
                Route date
                <span className="route-planner-input-icon">
                  <CalendarDays size={17} />
                  <input
                    type="date"
                    name="route_date"
                    value={form.route_date}
                    onChange={updateField}
                    required
                  />
                </span>
              </label>

              <label>
                Driver
                <select
                  name="driver"
                  value={form.driver}
                  onChange={updateField}
                  required
                >
                  <option value="">Select a driver</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Vehicle
                <select
                  name="vehicle"
                  value={form.vehicle}
                  onChange={updateField}
                  required
                >
                  <option value="">Select a vehicle</option>
                  {availableVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration_number} — {vehicle.make_model}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="route-planner-primary-button"
                disabled={saving}
              >
                <Plus size={18} />
                {saving ? "Saving..." : "Create route"}
              </button>
            </form>
          </section>

          <section className="route-planner-panel">
            <h2>Delivery routes</h2>
            <p>Select a route to inspect its stops and progress.</p>

            {loading ? (
              <p>Loading routes...</p>
            ) : routes.length === 0 ? (
              <div className="route-planner-empty">
                <Route size={30} />
                <h3>No routes yet</h3>
                <p>Create your first delivery route using the form.</p>
              </div>
            ) : (
              <div className="route-planner-list">
                {routes.map((route) => (
                  <button
                    type="button"
                    key={route.id}
                    className={`route-planner-list-item ${
                      selectedRoute?.id === route.id ? "selected" : ""
                    }`}
                    onClick={() => selectRoute(route)}
                  >
                    <span>
                      <strong>{route.name}</strong>
                      <small>
                        {route.route_date} · {route.driver_name}
                      </small>
                      <small>
                        {route.stops?.length || 0} stops
                      </small>
                    </span>

                    <span className="route-planner-status">
                      {route.status}
                    </span>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {selectedRoute && (
          <section className="route-planner-panel route-planner-details">
            <div className="route-planner-details-header">
              <div>
                <span className="route-planner-eyebrow">
                  ROUTE DETAILS
                </span>
                <h2>{selectedRoute.name}</h2>
                <p>
                  {selectedRoute.route_date} ·{" "}
                  {selectedRoute.driver_name} ·{" "}
                  {selectedRoute.vehicle_registration}
                </p>
              </div>

              <label>
                Route status
                <select
                  value={selectedRoute.status}
                  onChange={updateProgress}
                  disabled={saving}
                >
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
            </div>

            <h3>Shipment stops</h3>

            {selectedRoute.stops?.length ? (
              <ol className="route-planner-stops">
                {selectedRoute.stops.map((stop) => (
                  <li key={stop.id}>
                    <span className="route-planner-stop-number">
                      {stop.stop_order}
                    </span>
                    <div>
                      <strong>
                        {stop.shipment_tracking_number ||
                          `Shipment #${stop.shipment}`}
                      </strong>
                      <small>Stop status: {stop.status}</small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p>
                No shipments have been assigned to this route yet.
              </p>
            )}

            <form
              onSubmit={addStop}
              className="route-planner-stop-form"
            >
              <label>
                Existing shipment
                <select
                  value={stopForm.shipment}
                  onChange={(event) =>
                    setStopForm((current) => ({
                      ...current,
                      shipment: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select a shipment</option>
                  {shipments.map((shipment) => (
                    <option key={shipment.id} value={shipment.id}>
                      {shipment.tracking_number} —{" "}
                      {shipment.origin} to {shipment.destination}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Stop order
                <input
                  type="number"
                  min="1"
                  value={stopForm.stop_order}
                  onChange={(event) =>
                    setStopForm((current) => ({
                      ...current,
                      stop_order: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <button
                type="submit"
                className="route-planner-primary-button"
                disabled={saving}
              >
                <Plus size={18} />
                Add stop
              </button>
            </form>
          </section>
        )}

        <PageFooter label="LogiTrack · Delivery Route Planning" />
      </main>
    </div>
  );
}
