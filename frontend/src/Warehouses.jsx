import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import Sidebar from "./Sidebar";
import PageFooter from "./PageFooter";

const emptyForm = {
  facility_code: "",
  name: "",
  operator: "",
  address: "",
  city: "",
  district: "",
  state: "Maharashtra",
  postal_code: "",
  capacity_mt: "",
  public_phone: "",
  public_email: "",
  source_url: "",
  is_logitrack_operated: false,
};

function getErrorMessage(error) {
  const data = error.response?.data;

  if (!data) {
    return "Unable to connect to the server. Check that Django is running.";
  }

  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  return Object.entries(data)
    .map(([field, messages]) => {
      const value = Array.isArray(messages)
        ? messages.join(", ")
        : String(messages);
      return `${field}: ${value}`;
    })
    .join(" | ");
}

function formatCapacity(value) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }
  return `${Number(value).toLocaleString()} MT`;
}

export default function Warehouses() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  };

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/warehouses/", {
        params: {
          page,
          search: search || undefined,
          ordering: "name",
        },
      });

      const data = response.data;

      if (Array.isArray(data)) {
        setWarehouses(data);
        setTotal(data.length);
        setHasNext(false);
        setHasPrevious(false);
      } else {
        setWarehouses(data.results || []);
        setTotal(data.count ?? data.results?.length ?? 0);
        setHasNext(Boolean(data.next));
        setHasPrevious(Boolean(data.previous));
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setWarehouses([]);
      setTotal(0);
      setHasNext(false);
      setHasPrevious(false);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    api.get("/auth/me/")
      .then((response) => setProfile(response.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) loadWarehouses();
    });

    return () => {
      cancelled = true;
    };
  }, [loadWarehouses]);

  const openAddModal = () => {
    setEditingWarehouse(null);
    setForm({ ...emptyForm });
    setError("");
    setNotice("");
    setModalOpen(true);
  };

  const openEditModal = (warehouse) => {
    setEditingWarehouse(warehouse);
    setForm({
      facility_code: warehouse.facility_code || "",
      name: warehouse.name || "",
      operator: warehouse.operator || "",
      address: warehouse.address || "",
      city: warehouse.city || "",
      district: warehouse.district || "",
      state: warehouse.state || "Maharashtra",
      postal_code: warehouse.postal_code || "",
      capacity_mt: warehouse.capacity_mt ?? "",
      public_phone: warehouse.public_phone || "",
      public_email: warehouse.public_email || "",
      source_url: warehouse.source_url || "",
      is_logitrack_operated: Boolean(warehouse.is_logitrack_operated),
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  };

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...form,
      capacity_mt:
        form.capacity_mt === "" ? null : form.capacity_mt,
    };

    try {
      if (editingWarehouse) {
        await api.patch(
          `/warehouses/${editingWarehouse.id}/`,
          payload
        );
        setNotice("Warehouse updated successfully.");
      } else {
        await api.post("/warehouses/", payload);
        setNotice("Warehouse added successfully.");
        setPage(1);
      }

      setModalOpen(false);
      await loadWarehouses();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (warehouse) => {
    const confirmed = window.confirm(
      `Delete "${warehouse.name}" (${warehouse.facility_code})? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await api.delete(`/warehouses/${warehouse.id}/`);
      setNotice("Warehouse deleted successfully.");

      if (warehouses.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadWarehouses();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} onLogout={handleLogout} />

      <main className="warehouse-page">
        <header className="warehouse-header">
          <div>
            <div className="warehouse-eyebrow">
              MANAGEMENT / FACILITIES
            </div>
            <h1>Warehouses</h1>
            <p>
              Manage warehouse locations, operators, capacity and
              contact information.
            </p>
          </div>

          <button
            className="warehouse-primary-button"
            type="button"
            onClick={openAddModal}
          >
            <Plus size={18} />
            Add Warehouse
          </button>
        </header>

        {error && !modalOpen && (
          <div className="warehouse-alert warehouse-alert-error">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadWarehouses}
              aria-label="Retry loading warehouses"
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        )}

        {notice && !modalOpen && (
          <div className="warehouse-alert warehouse-alert-success">
            {notice}
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="warehouse-stat-grid">
          <article className="warehouse-stat-card">
            <div className="warehouse-stat-icon">
              <WarehouseIcon size={22} />
            </div>
            <div>
              <span>Total warehouses</span>
              <strong>{total}</strong>
              <small>Matching database records</small>
            </div>
          </article>

          <article className="warehouse-stat-card">
            <div className="warehouse-stat-icon">
              <Building2 size={22} />
            </div>
            <div>
              <span>LogiTrack-operated</span>
              <strong>
                {warehouses.filter((item) => item.is_logitrack_operated).length}
              </strong>
              <small>On this page</small>
            </div>
          </article>

          <article className="warehouse-stat-card">
            <div className="warehouse-stat-icon">
              <MapPin size={22} />
            </div>
            <div>
              <span>External facilities</span>
              <strong>
                {warehouses.filter((item) => !item.is_logitrack_operated).length}
              </strong>
              <small>On this page</small>
            </div>
          </article>
        </section>

        <section className="warehouse-table-card">
          <div className="warehouse-table-toolbar">
            <div>
              <h2>Warehouse directory</h2>
              <p>Search by facility, operator, city or facility code.</p>
            </div>

            <form className="warehouse-search" onSubmit={handleSearch}>
              <Search size={18} />
              <input
                type="search"
                placeholder="Search warehouses..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="Search warehouses"
              />
              <button type="submit">Search</button>
            </form>
          </div>

          <div className="warehouse-table-scroll">
            <table className="warehouse-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Location</th>
                  <th>Operator</th>
                  <th>Capacity</th>
                  <th>Facility type</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="warehouse-empty">
                      Loading warehouses...
                    </td>
                  </tr>
                ) : warehouses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="warehouse-empty">
                      <WarehouseIcon size={34} />
                      <strong>No warehouses found</strong>
                      <span>
                        Add a warehouse or try another search.
                      </span>
                      {!search && (
                        <button
                          type="button"
                          onClick={openAddModal}
                          className="warehouse-secondary-button"
                        >
                          <Plus size={16} />
                          Add your first warehouse
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  warehouses.map((warehouse) => (
                    <tr key={warehouse.id}>
                      <td>
                        <div className="warehouse-facility-name">
                          <span className="warehouse-row-icon">
                            <WarehouseIcon size={18} />
                          </span>
                          <div>
                            <strong>{warehouse.name}</strong>
                            <small>{warehouse.facility_code}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="warehouse-location">
                          <strong>
                            {[warehouse.city, warehouse.district]
                              .filter(Boolean)
                              .join(", ") || "Location not specified"}
                          </strong>
                          <small>
                            {[warehouse.state, warehouse.postal_code]
                              .filter(Boolean)
                              .join(" ")}
                          </small>
                        </div>
                      </td>

                      <td>{warehouse.operator || "Not specified"}</td>
                      <td>{formatCapacity(warehouse.capacity_mt)}</td>

                      <td>
                        <span
                          className={
                            warehouse.is_logitrack_operated
                              ? "warehouse-badge warehouse-badge-owned"
                              : "warehouse-badge warehouse-badge-external"
                          }
                        >
                          {warehouse.is_logitrack_operated
                            ? "LogiTrack"
                            : "External"}
                        </span>
                      </td>

                      <td>
                        <div className="warehouse-contact">
                          <span>
                            {warehouse.public_phone || "No phone"}
                          </span>
                          {warehouse.public_email && (
                            <small>{warehouse.public_email}</small>
                          )}
                          {warehouse.source_url && (
                            <a
                              href={warehouse.source_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Open source"
                            >
                              <ExternalLink size={13} />
                              Source
                            </a>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="warehouse-actions">
                          <button
                            type="button"
                            onClick={() => openEditModal(warehouse)}
                            aria-label={`Edit ${warehouse.name}`}
                            title="Edit warehouse"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="warehouse-delete-button"
                            onClick={() => handleDelete(warehouse)}
                            aria-label={`Delete ${warehouse.name}`}
                            title="Delete warehouse"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="warehouse-pagination">
            <span>
              {total === 0
                ? "0 warehouses"
                : `${total} warehouse${total === 1 ? "" : "s"} found`}
            </span>

            <div>
              <button
                type="button"
                disabled={!hasPrevious || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft size={17} />
                Previous
              </button>
              <span>Page {page}</span>
              <button
                type="button"
                disabled={!hasNext || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
                <ChevronRight size={17} />
              </button>
            </div>
          </footer>
        </section>

        <PageFooter label="LogiTrack Warehouse Management" />

        {modalOpen && (
          <div
            className="warehouse-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) {
                setModalOpen(false);
                setError("");
              }
            }}
          >
            <section
              className="warehouse-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="warehouse-modal-title"
            >
              <header className="warehouse-modal-header">
                <div>
                  <span>FACILITY MANAGEMENT</span>
                  <h2 id="warehouse-modal-title">
                    {editingWarehouse ? "Edit warehouse" : "Add warehouse"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setError("");
                  }}
                  disabled={saving}
                  aria-label="Close form"
                >
                  <X size={21} />
                </button>
              </header>

              {error && (
                <div className="warehouse-alert warehouse-alert-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSave}>
                <div className="warehouse-form-grid">
                  <label>
                    Facility code *
                    <input
                      name="facility_code"
                      value={form.facility_code}
                      onChange={updateField}
                      placeholder="e.g. WH-PUN-001"
                      maxLength={30}
                      required
                    />
                  </label>

                  <label>
                    Warehouse name *
                    <input
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      placeholder="Enter facility name"
                      maxLength={200}
                      required
                    />
                  </label>

                  <label>
                    Operator *
                    <input
                      name="operator"
                      value={form.operator}
                      onChange={updateField}
                      placeholder="Enter operator"
                      maxLength={200}
                      required
                    />
                  </label>

                  <label>
                    City
                    <input
                      name="city"
                      value={form.city}
                      onChange={updateField}
                      placeholder="City"
                      maxLength={100}
                    />
                  </label>

                  <label>
                    District
                    <input
                      name="district"
                      value={form.district}
                      onChange={updateField}
                      placeholder="District"
                      maxLength={100}
                    />
                  </label>

                  <label>
                    State
                    <input
                      name="state"
                      value={form.state}
                      onChange={updateField}
                      placeholder="State"
                      maxLength={100}
                    />
                  </label>

                  <label>
                    Postal code
                    <input
                      name="postal_code"
                      value={form.postal_code}
                      onChange={updateField}
                      placeholder="Postal code"
                      maxLength={20}
                    />
                  </label>

                  <label>
                    Capacity (metric tonnes)
                    <input
                      name="capacity_mt"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.capacity_mt}
                      onChange={updateField}
                      placeholder="Leave blank if unknown"
                    />
                  </label>

                  <label>
                    Public phone
                    <input
                      name="public_phone"
                      value={form.public_phone}
                      onChange={updateField}
                      placeholder="Public contact number"
                      maxLength={30}
                    />
                  </label>

                  <label>
                    Public email
                    <input
                      name="public_email"
                      type="email"
                      value={form.public_email}
                      onChange={updateField}
                      placeholder="contact@example.com"
                    />
                  </label>

                  <label className="warehouse-full-width">
                    Address
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={updateField}
                      placeholder="Street address or facility location"
                      rows={2}
                    />
                  </label>

                  <label className="warehouse-full-width">
                    Source URL
                    <input
                      name="source_url"
                      type="url"
                      value={form.source_url}
                      onChange={updateField}
                      placeholder="https://..."
                      maxLength={500}
                      required
                    />
                    <small>
                      Enter a source URL or official facility reference.
                    </small>
                  </label>

                  <label className="warehouse-checkbox warehouse-full-width">
                    <input
                      type="checkbox"
                      name="is_logitrack_operated"
                      checked={form.is_logitrack_operated}
                      onChange={updateField}
                    />
                    <span>
                      <strong>Operated by LogiTrack</strong>
                      <small>
                        Select only if LogiTrack genuinely operates this facility.
                      </small>
                    </span>
                  </label>
                </div>

                <footer className="warehouse-modal-actions">
                  <button
                    type="button"
                    className="warehouse-cancel-button"
                    onClick={() => {
                      setModalOpen(false);
                      setError("");
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="warehouse-primary-button"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingWarehouse
                        ? "Save Changes"
                        : "Create Warehouse"}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}