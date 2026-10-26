
import { useCallback, useEffect, useState } from "react";
import {
  CirclePlus,
  Pencil,
  Trash2,
  Search,
  Truck,
  Users,
  X,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  UserRound,
  CalendarDays,
} from "lucide-react";
import api from "./api";
import Sidebar from "./Sidebar";
import PageFooter from "./PageFooter";

const driverDefaults = {
  name: "",
  phone: "",
  email: "",
  license_number: "",
  license_expiry: "",
  address: "",
  availability: "AVAILABLE",
  notes: "",
};

const vehicleDefaults = {
  registration_number: "",
  vehicle_type: "VAN",
  make_model: "",
  capacity_kg: "0",
  status: "AVAILABLE",
  assigned_driver: "",
  notes: "",
};

const driverStatuses = [
  ["AVAILABLE", "Available"],
  ["ON_DELIVERY", "On Delivery"],
  ["ON_LEAVE", "On Leave"],
  ["INACTIVE", "Inactive"],
];

const vehicleStatuses = [
  ["AVAILABLE", "Available"],
  ["IN_USE", "In Use"],
  ["MAINTENANCE", "Maintenance"],
  ["INACTIVE", "Inactive"],
];

const vehicleTypes = [
  ["VAN", "Van"],
  ["TRUCK", "Truck"],
  ["MINI_TRUCK", "Mini Truck"],
  ["BIKE", "Bike"],
  ["OTHER", "Other"],
];

function getErrorMessage(error) {
  const data = error.response?.data;

  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([key, value]) => {
        const message = Array.isArray(value)
          ? value.join(" ")
          : typeof value === "string"
            ? value
            : JSON.stringify(value);
        return `${key}: ${message}`;
      })
      .join(" ");
  }

  return "The request failed. Check your connection and try again.";
}

export default function Fleet() {
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("drivers");
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [driverTotal, setDriverTotal] = useState(0);
  const [vehicleTotal, setVehicleTotal] = useState(0);
  const [driverPage, setDriverPage] = useState(1);
  const [vehiclePage, setVehiclePage] = useState(1);
  const [driverNext, setDriverNext] = useState(null);
  const [driverPrevious, setDriverPrevious] = useState(null);
  const [vehicleNext, setVehicleNext] = useState(null);
  const [vehiclePrevious, setVehiclePrevious] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState({ ...driverDefaults });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState("");

  const loadData = useCallback(
    async (options = {}) => {
      const requestedTab = options.tab || tab;
      const requestedPage =
        options.page || (requestedTab === "drivers" ? driverPage : vehiclePage);
      const requestedSearch =
        options.search !== undefined ? options.search : search;

      setLoading(true);
      setError("");

      try {
        const requests = [
          api.get("/auth/me/"),
          api.get("/drivers/", {
            params: {
              page: requestedTab === "drivers" ? requestedPage : 1,
              search: requestedSearch.trim() || undefined,
              ordering: "name",
            },
          }),
          api.get("/vehicles/", {
            params: {
              page: requestedTab === "vehicles" ? requestedPage : 1,
              search: requestedSearch.trim() || undefined,
              ordering: "registration_number",
            },
          }),
        ];

        const [profileResponse, driverResponse, vehicleResponse] =
          await Promise.all(requests);

        setProfile(profileResponse.data);

        const driverData = driverResponse.data;
        const vehicleData = vehicleResponse.data;

        const driverResults = Array.isArray(driverData)
          ? driverData
          : driverData.results || [];

        const vehicleResults = Array.isArray(vehicleData)
          ? vehicleData
          : vehicleData.results || [];

        setDrivers(driverResults);
        setVehicles(vehicleResults);
        setDriverTotal(driverData.count ?? driverResults.length);
        setVehicleTotal(vehicleData.count ?? vehicleResults.length);
        setDriverNext(driverData.next || null);
        setDriverPrevious(driverData.previous || null);
        setVehicleNext(vehicleData.next || null);
        setVehiclePrevious(vehicleData.previous || null);

        if (requestedTab === "drivers") setDriverPage(requestedPage);
        else setVehiclePage(requestedPage);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [tab, driverPage, vehiclePage, search]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData({ tab: "drivers", page: 1, search: "" });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  function changeTab(nextTab) {
    setTab(nextTab);
    setSearch("");
    setNotice(null);
    loadData({ tab: nextTab, page: 1, search: "" });
  }

  function openAddModal() {
    setEditingRecord(null);
    setForm(
      tab === "drivers" ? { ...driverDefaults } : { ...vehicleDefaults }
    );
    setNotice(null);
    setModalOpen(true);
  }

  function openEditModal(record) {
    setEditingRecord(record);

    if (tab === "drivers") {
      setForm({
        ...driverDefaults,
        ...record,
        license_expiry: record.license_expiry || "",
      });
    } else {
      setForm({
        ...vehicleDefaults,
        ...record,
        capacity_kg: String(record.capacity_kg ?? 0),
        assigned_driver: record.assigned_driver
          ? String(record.assigned_driver)
          : "",
      });
    }

    setNotice(null);
    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    const resource = tab === "drivers" ? "drivers" : "vehicles";
    const payload = { ...form };

    if (tab === "vehicles") {
      payload.capacity_kg = Number(form.capacity_kg);
      payload.assigned_driver = form.assigned_driver
        ? Number(form.assigned_driver)
        : null;
    }

    if (tab === "drivers") {
      payload.name = form.name.trim();
      payload.phone = form.phone.trim();
      payload.email = form.email.trim();
      payload.license_number = form.license_number.trim();
    } else {
      payload.registration_number = form.registration_number
        .trim()
        .toUpperCase();
      payload.make_model = form.make_model.trim();
    }

    try {
      if (editingRecord) {
        await api.patch(`/${resource}/${editingRecord.id}/`, payload);
        setNotice({
          type: "success",
          text: `${tab === "drivers" ? "Driver" : "Vehicle"} updated successfully.`,
        });
      } else {
        await api.post(`/${resource}/`, payload);
        setNotice({
          type: "success",
          text: `${tab === "drivers" ? "Driver" : "Vehicle"} added successfully.`,
        });
      }

      setModalOpen(false);
      setEditingRecord(null);
      setForm(
        tab === "drivers" ? { ...driverDefaults } : { ...vehicleDefaults }
      );

      await loadData({ tab, page: 1, search });
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    const label =
      tab === "drivers" ? record.name : record.registration_number;
    const confirmed = window.confirm(
      `Delete ${label}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(record.id);
    setNotice(null);

    try {
      const resource = tab === "drivers" ? "drivers" : "vehicles";
      await api.delete(`/${resource}/${record.id}/`);

      setNotice({
        type: "success",
        text: `${tab === "drivers" ? "Driver" : "Vehicle"} deleted successfully.`,
      });

      const currentRows = tab === "drivers" ? drivers : vehicles;
      const currentPage = tab === "drivers" ? driverPage : vehiclePage;
      const targetPage =
        currentRows.length === 1 && currentPage > 1
          ? currentPage - 1
          : currentPage;

      await loadData({ tab, page: targetPage, search });
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err) });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    await loadData({ tab, page: 1, search });
  }

  async function clearSearch() {
    setSearch("");
    await loadData({ tab, page: 1, search: "" });
  }

  async function handleLogout() {
    try {
      const refresh = localStorage.getItem("refreshToken");
      if (refresh) await api.post("/auth/logout/", { refresh });
    } catch {
      // Clear the local session even if the logout endpoint is unavailable.
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    }
  }

  const activeTotal = tab === "drivers" ? driverTotal : vehicleTotal;
  const activeRows = tab === "drivers" ? drivers : vehicles;
  const activePage = tab === "drivers" ? driverPage : vehiclePage;
  const hasNext = tab === "drivers" ? driverNext : vehicleNext;
  const hasPrevious = tab === "drivers" ? driverPrevious : vehiclePrevious;
  const startNumber = activeTotal === 0 ? 0 : (activePage - 1) * 10 + 1;
  const endNumber = Math.min(activePage * 10, activeTotal);

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} onLogout={handleLogout} />

      <main className="fleet-main">
        <header className="fleet-header">
          <div>
            <span className="fleet-eyebrow">OPERATIONS MANAGEMENT</span>
            <h1>Drivers & Fleet</h1>
            <p>Manage your delivery team and vehicle resources.</p>
          </div>

          <button className="fleet-primary-button" onClick={openAddModal}>
            <CirclePlus size={18} />
            Add {tab === "drivers" ? "Driver" : "Vehicle"}
          </button>
        </header>

        {notice && (
          <div className={`fleet-notice ${notice.type}`} role="status">
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss">
              <X size={17} />
            </button>
          </div>
        )}

        <section className="fleet-stats">
          <button
            type="button"
            className={`fleet-stat-card ${tab === "drivers" ? "selected" : ""}`}
            onClick={() => changeTab("drivers")}
          >
            <span className="fleet-stat-icon drivers">
              <Users size={22} />
            </span>
            <span className="fleet-stat-text">
              <span>Total drivers</span>
              <strong>{loading ? "—" : driverTotal}</strong>
              <small>Driver directory</small>
            </span>
          </button>

          <button
            type="button"
            className={`fleet-stat-card ${tab === "vehicles" ? "selected" : ""}`}
            onClick={() => changeTab("vehicles")}
          >
            <span className="fleet-stat-icon vehicles">
              <Truck size={22} />
            </span>
            <span className="fleet-stat-text">
              <span>Total vehicles</span>
              <strong>{loading ? "—" : vehicleTotal}</strong>
              <small>Fleet inventory</small>
            </span>
          </button>
        </section>

        <section className="fleet-panel">
          <div className="fleet-tabs">
            <button
              type="button"
              className={tab === "drivers" ? "active" : ""}
              onClick={() => changeTab("drivers")}
            >
              <Users size={17} />
              Drivers
            </button>
            <button
              type="button"
              className={tab === "vehicles" ? "active" : ""}
              onClick={() => changeTab("vehicles")}
            >
              <Truck size={17} />
              Vehicles
            </button>
          </div>

          <div className="fleet-panel-heading">
            <div>
              <h2>{tab === "drivers" ? "Driver directory" : "Vehicle fleet"}</h2>
              <p>
                {tab === "drivers"
                  ? "Manage driver contact details, licenses, and availability."
                  : "Manage registration, capacity, status, and driver assignments."}
              </p>
            </div>
          </div>

          <form className="fleet-search" onSubmit={handleSearch}>
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                tab === "drivers"
                  ? "Search name, phone, email or license..."
                  : "Search registration, model or driver..."
              }
              aria-label={`Search ${tab}`}
            />
            {search && (
              <button type="button" onClick={clearSearch}>
                Clear
              </button>
            )}
            <button className="fleet-search-button" type="submit">
              Search
            </button>
          </form>

          {error && (
            <div className="fleet-error" role="alert">
              <span>{error}</span>
              <button onClick={() => loadData({ tab, page: activePage, search })}>
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="fleet-loading">
              <LoaderCircle className="fleet-spinner" size={25} />
              Loading {tab}...
            </div>
          ) : !error && activeRows.length === 0 ? (
            <div className="fleet-empty">
              {tab === "drivers" ? <Users size={30} /> : <Truck size={30} />}
              <h3>{search ? "No matching records" : `No ${tab} added yet`}</h3>
              <p>
                {search
                  ? "Try another search term."
                  : `Add your first ${tab === "drivers" ? "driver" : "vehicle"} to get started.`}
              </p>
              {search ? (
                <button className="fleet-secondary-button" onClick={clearSearch}>
                  Clear search
                </button>
              ) : (
                <button className="fleet-primary-button" onClick={openAddModal}>
                  <CirclePlus size={17} />
                  Add {tab === "drivers" ? "Driver" : "Vehicle"}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="fleet-table-wrap">
                <table className="fleet-table">
                  <thead>
                    {tab === "drivers" ? (
                      <tr>
                        <th>Driver</th>
                        <th>Contact</th>
                        <th>License</th>
                        <th>Availability</th>
                        <th>Actions</th>
                      </tr>
                    ) : (
                      <tr>
                        <th>Vehicle</th>
                        <th>Type & capacity</th>
                        <th>Assigned driver</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {tab === "drivers"
                      ? drivers.map((driver) => (
                          <tr key={driver.id}>
                            <td>
                              <div className="fleet-person">
                                <span className="fleet-avatar">
                                  {(driver.name || "D")[0].toUpperCase()}
                                </span>
                                <span>
                                  <strong>{driver.name}</strong>
                                  <small>{driver.email || "No email provided"}</small>
                                </span>
                              </div>
                            </td>
                            <td>{driver.phone}</td>
                            <td>
                              <span>{driver.license_number}</span>
                              {driver.license_expiry && (
                                <small className="fleet-subline">
                                  Expires {driver.license_expiry}
                                </small>
                              )}
                            </td>
                            <td>
                              <span
                                className={`fleet-status ${driver.availability.toLowerCase()}`}
                              >
                                {driverStatuses.find(
                                  ([value]) => value === driver.availability
                                )?.[1] || driver.availability}
                              </span>
                            </td>
                            <td>
                              <div className="fleet-actions">
                                <button
                                  className="fleet-icon-button"
                                  title="Edit driver"
                                  aria-label={`Edit ${driver.name}`}
                                  onClick={() => openEditModal(driver)}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  className="fleet-icon-button danger"
                                  title="Delete driver"
                                  aria-label={`Delete ${driver.name}`}
                                  disabled={deletingId === driver.id}
                                  onClick={() => handleDelete(driver)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      : vehicles.map((vehicle) => (
                          <tr key={vehicle.id}>
                            <td>
                              <div className="fleet-person">
                                <span className="fleet-avatar vehicle">
                                  <Truck size={18} />
                                </span>
                                <span>
                                  <strong>{vehicle.registration_number}</strong>
                                  <small>{vehicle.make_model}</small>
                                </span>
                              </div>
                            </td>
                            <td>
                              <span>
                                {vehicleTypes.find(
                                  ([value]) => value === vehicle.vehicle_type
                                )?.[1] || vehicle.vehicle_type}
                              </span>
                              <small className="fleet-subline">
                                {vehicle.capacity_kg} kg capacity
                              </small>
                            </td>
                            <td>
                              <span className="fleet-assigned-driver">
                                <UserRound size={15} />
                                {vehicle.assigned_driver_name || "Unassigned"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`fleet-status ${vehicle.status.toLowerCase()}`}
                              >
                                {vehicleStatuses.find(
                                  ([value]) => value === vehicle.status
                                )?.[1] || vehicle.status}
                              </span>
                            </td>
                            <td>
                              <div className="fleet-actions">
                                <button
                                  className="fleet-icon-button"
                                  title="Edit vehicle"
                                  aria-label={`Edit ${vehicle.registration_number}`}
                                  onClick={() => openEditModal(vehicle)}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  className="fleet-icon-button danger"
                                  title="Delete vehicle"
                                  aria-label={`Delete ${vehicle.registration_number}`}
                                  disabled={deletingId === vehicle.id}
                                  onClick={() => handleDelete(vehicle)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>

              <div className="fleet-pagination">
                <span>
                  Showing {startNumber}–{endNumber} of {activeTotal}
                </span>
                <div>
                  <button
                    disabled={!hasPrevious || loading}
                    onClick={() =>
                      loadData({ tab, page: activePage - 1, search })
                    }
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <strong>{activePage}</strong>
                  <button
                    disabled={!hasNext || loading}
                    onClick={() =>
                      loadData({ tab, page: activePage + 1, search })
                    }
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <PageFooter label="LogiTrack Driver & Fleet Management" />
      </main>

      {modalOpen && (
        <div
          className="fleet-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <section
            className="fleet-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fleet-modal-title"
          >
            <header className="fleet-modal-header">
              <div>
                <h2 id="fleet-modal-title">
                  {editingRecord ? "Edit" : "Add"}{" "}
                  {tab === "drivers" ? "Driver" : "Vehicle"}
                </h2>
                <p>
                  Enter the information below. Fields marked * are required.
                </p>
              </div>
              <button
                className="fleet-close-button"
                type="button"
                aria-label="Close form"
                disabled={saving}
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              {tab === "drivers" ? (
                <div className="fleet-form-grid">
                  <label>
                    Full name *
                    <input
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      required
                      maxLength={150}
                      placeholder="Driver full name"
                    />
                  </label>
                  <label>
                    Phone number *
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={updateField}
                      required
                      minLength={7}
                      maxLength={20}
                      placeholder="Phone number"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={updateField}
                      placeholder="driver@example.com"
                    />
                  </label>
                  <label>
                    License number *
                    <input
                      name="license_number"
                      value={form.license_number}
                      onChange={updateField}
                      required
                      maxLength={50}
                      placeholder="License number"
                    />
                  </label>
                  <label>
                    License expiry
                    <span className="fleet-date-field">
                      <CalendarDays size={16} />
                      <input
                        type="date"
                        name="license_expiry"
                        value={form.license_expiry || ""}
                        onChange={updateField}
                      />
                    </span>
                  </label>
                  <label>
                    Availability
                    <select
                      name="availability"
                      value={form.availability}
                      onChange={updateField}
                    >
                      {driverStatuses.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="fleet-form-full">
                    Address
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={updateField}
                      rows={2}
                    />
                  </label>
                  <label className="fleet-form-full">
                    Notes
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={updateField}
                      rows={2}
                    />
                  </label>
                </div>
              ) : (
                <div className="fleet-form-grid">
                  <label>
                    Registration number *
                    <input
                      name="registration_number"
                      value={form.registration_number}
                      onChange={updateField}
                      required
                      maxLength={30}
                      placeholder="e.g. MH12AB1234"
                    />
                  </label>
                  <label>
                    Vehicle type *
                    <select
                      name="vehicle_type"
                      value={form.vehicle_type}
                      onChange={updateField}
                    >
                      {vehicleTypes.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Make and model *
                    <input
                      name="make_model"
                      value={form.make_model}
                      onChange={updateField}
                      required
                      maxLength={120}
                      placeholder="e.g. Tata Ace"
                    />
                  </label>
                  <label>
                    Capacity (kg) *
                    <input
                      type="number"
                      name="capacity_kg"
                      value={form.capacity_kg}
                      onChange={updateField}
                      min="0"
                      step="0.01"
                      required
                    />
                  </label>
                  <label>
                    Vehicle status
                    <select
                      name="status"
                      value={form.status}
                      onChange={updateField}
                    >
                      {vehicleStatuses.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assigned driver
                    <select
                      name="assigned_driver"
                      value={form.assigned_driver}
                      onChange={updateField}
                    >
                      <option value="">Unassigned</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                    <small className="fleet-field-help">
                      Driver options are from the currently loaded driver list.
                    </small>
                  </label>
                  <label className="fleet-form-full">
                    Notes
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={updateField}
                      rows={3}
                    />
                  </label>
                </div>
              )}

              <footer className="fleet-modal-footer">
                <button
                  type="button"
                  className="fleet-secondary-button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="fleet-primary-button"
                  disabled={saving}
                >
                  {saving && (
                    <LoaderCircle className="fleet-spinner" size={17} />
                  )}
                  {saving
                    ? "Saving..."
                    : editingRecord
                      ? "Save changes"
                      : `Create ${tab === "drivers" ? "driver" : "vehicle"}`}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
