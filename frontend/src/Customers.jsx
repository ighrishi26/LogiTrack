
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  LoaderCircle,
  MapPin,
  Pencil,
  Phone,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import api from "./api";
import Sidebar from "./Sidebar";
import PageFooter from "./PageFooter";

const emptyForm = {
  name: "",
  customer_type: "INDIVIDUAL",
  email: "",
  phone: "",
  company: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  notes: "",
};

export default function Customers() {
  const [profile, setProfile] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [previousPage, setPreviousPage] = useState(null);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState("");

  const loadCustomers = useCallback(async (pageNumber = 1, query = "") => {
    setLoading(true);
    setError("");

    try {
      const [profileResponse, customerResponse] = await Promise.all([
        api.get("/auth/me/"),
        api.get("/customers/", {
          params: {
            page: pageNumber,
            search: query.trim() || undefined,
            ordering: "-created_at",
          },
        }),
      ]);

      setProfile(profileResponse.data);

      const data = customerResponse.data;
      const results = Array.isArray(data) ? data : data.results || [];

      setCustomers(results);
      setTotal(data.count ?? results.length);
      setNextPage(data.next || null);
      setPreviousPage(data.previous || null);
      setPage(pageNumber);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not load customers. Check your login and backend server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) loadCustomers(1, "");
    });

    return () => {
      active = false;
    };
  }, [loadCustomers]);

  function openAddModal() {
    setEditingCustomer(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
    setNotice(null);
  }

  function openEditModal(customer) {
    setEditingCustomer(customer);
    setForm({
      ...emptyForm,
      ...customer,
      email: customer.email || "",
      company: customer.company || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      postal_code: customer.postal_code || "",
      notes: customer.notes || "",
    });
    setModalOpen(true);
    setNotice(null);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    const payload = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      postal_code: form.postal_code.trim(),
      notes: form.notes.trim(),
    };

    try {
      if (editingCustomer) {
        await api.patch(`/customers/${editingCustomer.id}/`, payload);
        setNotice({ type: "success", text: "Customer updated successfully." });
      } else {
        await api.post("/customers/", payload);
        setNotice({ type: "success", text: "Customer added successfully." });
      }

      setModalOpen(false);
      setEditingCustomer(null);
      setForm({ ...emptyForm });
      await loadCustomers(1, search);
    } catch (err) {
      const data = err.response?.data;
      const detail =
        typeof data === "string"
          ? data
          : data
            ? Object.entries(data)
                .map(([key, value]) => {
                  const message = Array.isArray(value)
                    ? value.join(" ")
                    : typeof value === "string"
                      ? value
                      : JSON.stringify(value);
                  return `${key}: ${message}`;
                })
                .join(" ")
            : "Could not save the customer. Please try again.";

      setNotice({ type: "error", text: detail });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer) {
    const confirmed = window.confirm(
      `Delete ${customer.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(customer.id);
    setNotice(null);

    try {
      await api.delete(`/customers/${customer.id}/`);
      setNotice({
        type: "success",
        text: `${customer.name} was deleted successfully.`,
      });

      const remainingCustomers = customers.length - 1;
      const targetPage =
        remainingCustomers === 0 && page > 1 ? page - 1 : page;

      await loadCustomers(targetPage, search);
    } catch (err) {
      setNotice({
        type: "error",
        text:
          err.response?.data?.detail ||
          "Could not delete this customer. Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    loadCustomers(1, search);
  }

  function handleClearSearch() {
    setSearch("");
    loadCustomers(1, "");
  }

  async function handleLogout() {
    try {
      const refresh = localStorage.getItem("refreshToken");

      if (refresh) {
        await api.post("/auth/logout/", { refresh });
      }
    } catch {
      // Clear the local session even if the logout endpoint is unavailable.
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    }
  }

  const startNumber = total === 0 ? 0 : (page - 1) * 10 + 1;
  const endNumber = Math.min(page * 10, total);

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} onLogout={handleLogout} />

      <main className="customers-main">
        <header className="customers-header">
          <div>
            <div className="customers-eyebrow">MANAGEMENT</div>
            <h1>Customers</h1>
            <p>Manage your customer directory and contact information.</p>
          </div>

          <button className="customers-primary-button" onClick={openAddModal}>
            <CirclePlus size={18} />
            Add Customer
          </button>
        </header>

        {notice && (
          <div
            className={`customers-notice ${notice.type}`}
            role="status"
          >
            <span>{notice.text}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setNotice(null)}
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="customers-summary">
          <div className="customers-summary-icon">
            <Users size={23} />
          </div>
          <div>
            <span>Total customers</span>
            <strong>{loading ? "—" : total}</strong>
            <small>Customer records in your directory</small>
          </div>
        </section>

        <section className="customers-panel">
          <div className="customers-panel-heading">
            <div>
              <h2>Customer directory</h2>
              <p>Search and manage registered customers.</p>
            </div>
          </div>

          <form className="customers-search" onSubmit={handleSearch}>
            <Search size={19} />
            <input
              type="search"
              placeholder="Search name, company, phone, email or city..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search customers"
            />
            {search && (
              <button type="button" onClick={handleClearSearch}>
                Clear
              </button>
            )}
            <button className="customers-search-button" type="submit">
              Search
            </button>
          </form>

          {error && (
            <div className="customers-error" role="alert">
              <p>{error}</p>
              <button onClick={() => loadCustomers(page, search)}>
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="customers-loading">
              <LoaderCircle className="customers-spinner" size={26} />
              <span>Loading customers...</span>
            </div>
          ) : !error && customers.length === 0 ? (
            <div className="customers-empty">
              <div className="customers-empty-icon">
                <Users size={28} />
              </div>
              <h3>{search ? "No matching customers" : "No customers yet"}</h3>
              <p>
                {search
                  ? "Try another search term."
                  : "Add your first customer to start building your directory."}
              </p>
              {search ? (
                <button
                  className="customers-secondary-button"
                  onClick={handleClearSearch}
                >
                  Clear search
                </button>
              ) : (
                <button
                  className="customers-primary-button"
                  onClick={openAddModal}
                >
                  <CirclePlus size={17} />
                  Add Customer
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="customers-table-wrap">
                <table className="customers-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact details</th>
                      <th>Location</th>
                      <th>Type</th>
                      <th className="customers-actions-heading">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <div className="customers-person">
                            <div className="customers-avatar">
                              {(customer.name || "C")
                                .slice(0, 1)
                                .toUpperCase()}
                            </div>
                            <div>
                              <strong>{customer.name}</strong>
                              <span>
                                {customer.company || "Independent customer"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="customers-contact">
                            <span>
                              <Phone size={14} />
                              {customer.phone}
                            </span>
                            {customer.email && (
                              <span className="customers-email">
                                {customer.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="customers-location">
                            <MapPin size={15} />
                            <span>
                              {[customer.city, customer.state]
                                .filter(Boolean)
                                .join(", ") || "Not provided"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`customers-type ${
                              customer.customer_type === "BUSINESS"
                                ? "business"
                                : "individual"
                            }`}
                          >
                            {customer.customer_type === "BUSINESS"
                              ? "Business"
                              : "Individual"}
                          </span>
                        </td>
                        <td>
                          <div className="customers-row-actions">
                            <button
                              type="button"
                              className="customers-icon-button edit"
                              title="Edit customer"
                              aria-label={`Edit ${customer.name}`}
                              onClick={() => openEditModal(customer)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="customers-icon-button delete"
                              title="Delete customer"
                              aria-label={`Delete ${customer.name}`}
                              disabled={deletingId === customer.id}
                              onClick={() => handleDelete(customer)}
                            >
                              {deletingId === customer.id ? (
                                <LoaderCircle
                                  className="customers-spinner"
                                  size={16}
                                />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="customers-pagination">
                <span>
                  Showing {startNumber}–{endNumber} of {total} customers
                </span>
                <div>
                  <button
                    type="button"
                    disabled={!previousPage || loading}
                    onClick={() => loadCustomers(page - 1, search)}
                  >
                    <ChevronLeft size={17} />
                    Previous
                  </button>
                  <span className="customers-page-number">{page}</span>
                  <button
                    type="button"
                    disabled={!nextPage || loading}
                    onClick={() => loadCustomers(page + 1, search)}
                  >
                    Next
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <PageFooter label="LogiTrack Customer Management" />
      </main>

      {modalOpen && (
        <div
          className="customers-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <section
            className="customers-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customers-modal-title"
          >
            <header className="customers-modal-header">
              <div>
                <h2 id="customers-modal-title">
                  {editingCustomer ? "Edit customer" : "Add customer"}
                </h2>
                <p>
                  {editingCustomer
                    ? "Update the customer's contact information."
                    : "Enter the customer's details below."}
                </p>
              </div>
              <button
                type="button"
                className="customers-modal-close"
                aria-label="Close form"
                disabled={saving}
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="customers-form-grid">
                <label className="customers-form-field">
                  Full name *
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    required
                    maxLength={150}
                    placeholder="Enter full name"
                  />
                </label>

                <label className="customers-form-field">
                  Customer type *
                  <select
                    name="customer_type"
                    value={form.customer_type}
                    onChange={updateField}
                    required
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </label>

                <label className="customers-form-field">
                  Phone number *
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={updateField}
                    required
                    minLength={7}
                    maxLength={20}
                    placeholder="Enter phone number"
                  />
                </label>

                <label className="customers-form-field">
                  Email address
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={updateField}
                    maxLength={254}
                    placeholder="name@example.com"
                  />
                </label>

                <label className="customers-form-field customers-form-full">
                  Company
                  <input
                    name="company"
                    value={form.company}
                    onChange={updateField}
                    maxLength={150}
                    placeholder="Company name (optional)"
                  />
                </label>

                <label className="customers-form-field customers-form-full">
                  Street address
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={updateField}
                    rows={2}
                    placeholder="Building, street, area"
                  />
                </label>

                <label className="customers-form-field">
                  City
                  <input
                    name="city"
                    value={form.city}
                    onChange={updateField}
                    maxLength={100}
                    placeholder="City"
                  />
                </label>

                <label className="customers-form-field">
                  State
                  <input
                    name="state"
                    value={form.state}
                    onChange={updateField}
                    maxLength={100}
                    placeholder="State"
                  />
                </label>

                <label className="customers-form-field customers-form-full">
                  Postal code
                  <input
                    name="postal_code"
                    value={form.postal_code}
                    onChange={updateField}
                    maxLength={20}
                    placeholder="Postal / PIN code"
                  />
                </label>

                <label className="customers-form-field customers-form-full">
                  Notes
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={updateField}
                    rows={3}
                    placeholder="Additional customer information (optional)"
                  />
                </label>
              </div>

              <footer className="customers-modal-footer">
                <button
                  type="button"
                  className="customers-secondary-button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="customers-primary-button"
                  disabled={saving}
                >
                  {saving && (
                    <LoaderCircle
                      className="customers-spinner"
                      size={17}
                    />
                  )}
                  {saving
                    ? "Saving..."
                    : editingCustomer
                      ? "Save changes"
                      : "Create customer"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
