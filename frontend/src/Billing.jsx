
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  FileText,
  IndianRupee,
  CircleCheck,
  Clock,
  X,
  Eye,
  Pencil,
  CreditCard,
  History,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import Sidebar from "./Sidebar";
import PageFooter from "./PageFooter";

const emptyForm = {
  shipment: "",
  customer: "",
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  status: "DRAFT",
  shipping_fee: "0.00",
  tax_amount: "0.00",
  discount: "0.00",
  amount_paid: "0.00",
  notes: "",
  lines: [{ description: "Shipping service", quantity: "1", unit_price: "0.00" }],
};

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN") : "—";

function errorMessage(error) {
  const data = error?.response?.data;
  if (!data) return "Could not connect to the server. Check that Django is running.";
  if (typeof data === "string") return data;
  return Object.entries(data)
    .map(([key, value]) => {
      const message = Array.isArray(value) ? value.join(" ") : typeof value === "object" ? JSON.stringify(value) : value;
      return `${key}: ${message}`;
    })
    .join(" | ");
}

export default function Billing() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentHistoryInvoice, setPaymentHistoryInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
  amount: "",
  payment_date: new Date().toLocaleDateString("en-CA"),
  payment_method: "UPI",
  reference_number: "",
  notes: "",
});
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, ordering: "-created_at" };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const [invoiceResponse, statsResponse, shipmentResponse, customerResponse] =
        await Promise.all([
          api.get("/invoices/", { params }),
          api.get("/invoices/stats/"),
          api.get("/shipments/", { params: { page: 1, ordering: "-created_at" } }),
          api.get("/customers/", { params: { page: 1, ordering: "name" } }),
        ]);

      const invoiceData = invoiceResponse.data;
      setInvoices(Array.isArray(invoiceData) ? invoiceData : invoiceData.results || []);
      setHasNext(Boolean(invoiceData.next));
      setHasPrevious(Boolean(invoiceData.previous));
      setStats(statsResponse.data || {});

      const shipmentData = shipmentResponse.data;
      setShipments(Array.isArray(shipmentData) ? shipmentData : shipmentData.results || []);

      const customerData = customerResponse.data;
      setCustomers(Array.isArray(customerData) ? customerData : customerData.results || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    api.get("/auth/me/")
      .then((response) => setProfile(response.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const updateField = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const updateLine = (index, key, value) =>
    setForm((previous) => ({
      ...previous,
      lines: previous.lines.map((line, i) =>
        i === index ? { ...line, [key]: value } : line
      ),
    }));

  const openCreate = () => {
    setEditingInvoice(null);
    setForm({
      ...emptyForm,
      issue_date: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (invoice) => {
    setEditingInvoice(invoice);
    setForm({
      shipment: String(invoice.shipment || ""),
      customer: invoice.customer ? String(invoice.customer) : "",
      issue_date: invoice.issue_date || "",
      due_date: invoice.due_date || "",
      status: invoice.status || "DRAFT",
      shipping_fee: String(invoice.shipping_fee ?? "0.00"),
      tax_amount: String(invoice.tax_amount ?? "0.00"),
      discount: String(invoice.discount ?? "0.00"),
      amount_paid: String(invoice.amount_paid ?? "0.00"),
      notes: invoice.notes || "",
      lines: invoice.lines?.length
        ? invoice.lines.map((line) => ({
            description: line.description,
            quantity: String(line.quantity),
            unit_price: String(line.unit_price),
          }))
        : [{ description: "Shipping service", quantity: "1", unit_price: "0.00" }],
    });
    setError("");
    setModalOpen(true);
  };

  const calculatedSubtotal = form.lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0),
    0
  );
  const calculatedTotal =
    calculatedSubtotal +
    Number(form.shipping_fee || 0) +
    Number(form.tax_amount || 0) -
    Number(form.discount || 0);

  const saveInvoice = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    if (!form.shipment || !form.due_date || !form.lines.length) {
      setError("Select a shipment, due date, and at least one invoice line.");
      setSaving(false);
      return;
    }

    if (calculatedTotal < 0) {
  setError("The invoice total cannot be negative.");
  setSaving(false);
  return;
}

    const payload = {
      shipment: Number(form.shipment),
      customer: form.customer ? Number(form.customer) : null,
      issue_date: form.issue_date,
      due_date: form.due_date,
      status: form.status,
      shipping_fee: form.shipping_fee,
      tax_amount: form.tax_amount,
      discount: form.discount,
      notes: form.notes,
      lines: form.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
      })),
    };

    try {
      if (editingInvoice) {
        await api.patch(`/invoices/${editingInvoice.id}/`, payload);
        setNotice("Invoice updated successfully.");
      } else {
        await api.post("/invoices/", payload);
        setNotice("Invoice created successfully.");
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteInvoice = async (invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      await api.delete(`/invoices/${invoice.id}/`);
      setNotice("Invoice deleted.");
      setDetailInvoice(null);
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  
const openPaymentForm = (invoice) => {
  setError("");
  setNotice("");
  setPaymentInvoice(invoice);
  setPaymentForm({
    amount: "",
    payment_date: new Date().toLocaleDateString("en-CA"),
    payment_method: "UPI",
    reference_number: "",
    notes: "",
  });
};

const recordPayment = async (event) => {
  event.preventDefault();

  if (!paymentInvoice) return;

  const amount = Number(paymentForm.amount);
  const balance = Number(paymentInvoice.balance_due);

  if (!Number.isFinite(amount) || amount <= 0) {
    setError("Enter a payment amount greater than zero.");
    return;
  }

  if (amount > balance) {
    setError("Payment cannot exceed the outstanding balance.");
    return;
  }

  setPaymentSaving(true);
  setError("");
  setNotice("");

  try {
    await api.post(`/invoices/${paymentInvoice.id}/payments/`, {
      amount: amount.toFixed(2),
      payment_date: paymentForm.payment_date,
      payment_method: paymentForm.payment_method,
      reference_number: paymentForm.reference_number,
      notes: paymentForm.notes,
    });

    setPaymentInvoice(null);
    setNotice("Payment recorded successfully.");
    await loadData();
  } catch (err) {
    setError(errorMessage(err));
  } finally {
    setPaymentSaving(false);
  }
};

const openPaymentHistory = async (invoice) => {
  setError("");
  setNotice("");

  try {
    const response = await api.get(
      `/invoices/${invoice.id}/payments/`
    );

    setPayments(response.data);
    setPaymentHistoryInvoice(invoice);
  } catch (err) {
    setError(errorMessage(err));
  }
};


  const statusClass = (status) =>
    `billing-status billing-status-${String(status || "").toLowerCase().replaceAll("_", "-")}`;

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} onLogout={logout} />

      <main className="billing-main">
        <header className="billing-header">
          <div>
            <span className="billing-eyebrow">FINANCE MANAGEMENT</span>
            <h1>Billing &amp; Invoices</h1>
            <p>Create invoices, track payments, and manage outstanding balances.</p>
          </div>
          <button className="billing-primary-button" onClick={openCreate}>
            <Plus size={18} /> Create Invoice
          </button>
        </header>

        {error && <div className="billing-alert billing-alert-error">{error}</div>}
        {notice && <div className="billing-alert billing-alert-success">{notice}</div>}

        <section className="billing-stats">
          <article className="billing-stat-card">
            <span>Total invoices</span>
            <FileText size={20} />
            <strong>{stats.total_invoices ?? "—"}</strong>
          </article>
          <article className="billing-stat-card">
            <span>Issued</span>
            <Clock size={20} />
            <strong>{stats.issued ?? "—"}</strong>
          </article>
          <article className="billing-stat-card">
            <span>Paid</span>
            <CircleCheck size={20} />
            <strong>{stats.paid ?? "—"}</strong>
          </article>
          <article className="billing-stat-card">
            <span>Overdue</span>
            <IndianRupee size={20} />
            <strong>{stats.overdue ?? "—"}</strong>
          </article>
        </section>

        <section className="billing-panel">
          <form
            className="billing-toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
          >
            <div className="billing-search">
              <Search size={18} />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search invoice, tracking number, customer..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="PARTIALLY_PAID">Partially paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button type="button" className="billing-secondary-button" onClick={loadData}>
              <RefreshCw size={16} /> Refresh
            </button>
          </form>

          <div className="billing-table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Shipment</th>
                  <th>Customer</th>
                  <th>Due date</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="billing-empty">Loading invoices...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="billing-empty">
                      <FileText size={32} />
                      <strong>No invoices found</strong>
                      <span>Create an invoice to get started.</span>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <strong>{invoice.invoice_number}</strong>
                        <small>{formatDate(invoice.issue_date)}</small>
                      </td>
                      <td>{invoice.shipment_tracking_number || `Shipment #${invoice.shipment}`}</td>
                      <td>{invoice.customer_name || "—"}</td>
                      <td>{formatDate(invoice.due_date)}</td>
                      <td>{currency(invoice.total_amount)}</td>
                      <td>{currency(invoice.balance_due)}</td>
                      <td><span className={statusClass(invoice.status)}>{invoice.status?.replaceAll("_", " ")}</span></td>
                      <td>
                        
<div className="billing-actions">
  <button
    title="View invoice"
    onClick={() => setDetailInvoice(invoice)}
  >
    <Eye size={16} />
  </button>

  <button
    title="Edit invoice"
    onClick={() => openEdit(invoice)}
  >
    <Pencil size={16} />
  </button>

  <button
    title="Record payment"
    disabled={
      ["DRAFT", "CANCELLED", "PAID"].includes(invoice.status) ||
      Number(invoice.balance_due) <= 0
    }
    onClick={() => openPaymentForm(invoice)}
  >
    <CreditCard size={16} />
  </button>

  <button
    title="Payment history"
    onClick={() => openPaymentHistory(invoice)}
  >
    <History size={16} />
  </button>

  <button
    title="Delete invoice"
    onClick={() => deleteInvoice(invoice)}
  >
    <X size={16} />
  </button>
</div>

                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="billing-pagination">
            <button disabled={!hasPrevious || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
            <span>Page {page}</span>
            <button disabled={!hasNext || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </section>

        {modalOpen && (
          <div className="billing-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}>
            <section className="billing-modal">
              <header className="billing-modal-header">
                <div>
                  <h2>{editingInvoice ? "Edit invoice" : "Create invoice"}</h2>
                  <p>Choose a shipment and enter the invoice details.</p>
                </div>
                <button type="button" onClick={() => setModalOpen(false)}><X /></button>
              </header>

              <form className="billing-form" onSubmit={saveInvoice}>
                <label>
                  Shipment *
                  <select required value={form.shipment} onChange={(event) => {
                    const shipmentId = event.target.value;
                    const selectedShipment = shipments.find((item) => String(item.id) === shipmentId);
                    setForm((previous) => ({
                      ...previous,
                      shipment: shipmentId,
                      shipping_fee: selectedShipment?.shipping_cost != null
                        ? String(selectedShipment.shipping_cost)
                        : previous.shipping_fee,
                    }));
                  }}>
                    <option value="">Select shipment</option>
                    {shipments.map((shipment) => (
                      <option key={shipment.id} value={shipment.id}>
                        {shipment.tracking_number} — {shipment.sender_name} to {shipment.receiver_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Customer
                  <select value={form.customer} onChange={(event) => updateField("customer", event.target.value)}>
                    <option value="">No customer linked</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}{customer.company ? ` — ${customer.company}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="billing-form-grid">
                  <label>Issue date *<input required type="date" value={form.issue_date} onChange={(event) => updateField("issue_date", event.target.value)} /></label>
                  <label>Due date *<input required type="date" min={form.issue_date} value={form.due_date} onChange={(event) => updateField("due_date", event.target.value)} /></label>
                </div>

                <label>
                  Status
                  <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                    <option value="DRAFT">Draft</option>
                    <option value="ISSUED">Issued</option>
                    <option value="PARTIALLY_PAID">Partially paid</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </label>

                <div className="billing-line-items">
                  <div className="billing-line-items-heading">
                    <strong>Invoice line items</strong>
                    <button type="button" className="billing-text-button" onClick={() => setForm((previous) => ({
                      ...previous,
                      lines: [...previous.lines, { description: "", quantity: "1", unit_price: "0.00" }],
                    }))}><Plus size={15} /> Add line</button>
                  </div>
                  {form.lines.map((line, index) => (
                    <div className="billing-line-row" key={index}>
                      <input aria-label="Description" required placeholder="Description" value={line.description} onChange={(event) => updateLine(index, "description", event.target.value)} />
                      <input aria-label="Quantity" required min="0.01" step="0.01" type="number" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} />
                      <input aria-label="Unit price" required min="0" step="0.01" type="number" value={line.unit_price} onChange={(event) => updateLine(index, "unit_price", event.target.value)} />
                      <button type="button" title="Remove line" disabled={form.lines.length === 1} onClick={() => setForm((previous) => ({
                        ...previous,
                        lines: previous.lines.filter((_, i) => i !== index),
                      }))}><X size={16} /></button>
                    </div>
                  ))}
                  <div className="billing-form-grid">
                    <label>Shipping fee (₹)<input type="number" min="0" step="0.01" value={form.shipping_fee} onChange={(event) => updateField("shipping_fee", event.target.value)} /></label>
                    <label>Tax (₹)<input type="number" min="0" step="0.01" value={form.tax_amount} onChange={(event) => updateField("tax_amount", event.target.value)} /></label>
                    <label>Discount (₹)<input type="number" min="0" step="0.01" value={form.discount} onChange={(event) => updateField("discount", event.target.value)} /></label>
                    <label>
  Amount paid (₹)
  <input
    type="number"
    value={form.amount_paid}
    readOnly
  />
</label>
                  </div>
                  <div className="billing-total-preview">
                    <span>Subtotal: {currency(calculatedSubtotal)}</span>
                    <strong>Total: {currency(calculatedTotal)}</strong>
                    <span>Balance: {currency(calculatedTotal - Number(form.amount_paid || 0))}</span>
                  </div>
                </div>

                <label>
                  Notes
                  <textarea rows="3" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Optional invoice notes" />
                </label>

                <div className="billing-modal-footer">
                  <button type="button" className="billing-secondary-button" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="billing-primary-button" disabled={saving}>
                    {saving ? "Saving..." : editingInvoice ? "Save changes" : "Create invoice"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {detailInvoice && (
          <div className="billing-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailInvoice(null);
          }}>
            <section className="billing-modal billing-detail-modal">
              <header className="billing-modal-header">
                <div>
                  <h2>{detailInvoice.invoice_number}</h2>
                  <p>Invoice details</p>
                </div>
                <button type="button" onClick={() => setDetailInvoice(null)}><X /></button>
              </header>
              <div className="billing-detail-content">
                <p><strong>Shipment:</strong> {detailInvoice.shipment_tracking_number || detailInvoice.shipment}</p>
                <p><strong>Customer:</strong> {detailInvoice.customer_name || "—"}</p>
                <p><strong>Issue date:</strong> {formatDate(detailInvoice.issue_date)}</p>
                <p><strong>Due date:</strong> {formatDate(detailInvoice.due_date)}</p>
                <p><strong>Status:</strong> {detailInvoice.status?.replaceAll("_", " ")}</p>
                <hr />
                <div className="billing-detail-lines">
                  {(detailInvoice.lines || []).map((line) => (
                    <div key={line.id}>
                      <span>{line.description} × {line.quantity}</span>
                      <strong>{currency(line.line_total)}</strong>
                    </div>
                  ))}
                </div>
                <hr />
                <p><strong>Subtotal:</strong> {currency(detailInvoice.subtotal)}</p>
                <p><strong>Shipping:</strong> {currency(detailInvoice.shipping_fee)}</p>
                <p><strong>Tax:</strong> {currency(detailInvoice.tax_amount)}</p>
                <p><strong>Discount:</strong> {currency(detailInvoice.discount)}</p>
                <h3>Total: {currency(detailInvoice.total_amount)}</h3>
                <p><strong>Paid:</strong> {currency(detailInvoice.amount_paid)}</p>
                <h3>Balance due: {currency(detailInvoice.balance_due)}</h3>
                {detailInvoice.notes && <p><strong>Notes:</strong> {detailInvoice.notes}</p>}
              </div>
              <footer className="billing-modal-footer">
                <button className="billing-secondary-button" onClick={() => setDetailInvoice(null)}>Close</button>
                <button className="billing-primary-button" onClick={() => {
                  setDetailInvoice(null);
                  openEdit(detailInvoice);
                }}><Pencil size={16} /> Edit invoice</button>
              </footer>
            </section>
          </div>
        )}

        
{paymentInvoice && (
  <div
    className="billing-modal-backdrop"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        setPaymentInvoice(null);
      }
    }}
  >
    <section className="billing-modal">
      <header className="billing-modal-header">
        <div>
          <h2>Record Payment</h2>
          <p>{paymentInvoice.invoice_number}</p>
        </div>
        <button
          type="button"
          onClick={() => setPaymentInvoice(null)}
        >
          <X />
        </button>
      </header>

      <div className="billing-detail-content">
        <p>
          <strong>Invoice total:</strong>{" "}
          {currency(paymentInvoice.total_amount)}
        </p>
        <p>
          <strong>Already paid:</strong>{" "}
          {currency(paymentInvoice.amount_paid)}
        </p>
        <h3>
          Balance due: {currency(paymentInvoice.balance_due)}
        </h3>
      </div>

      <form className="billing-form" onSubmit={recordPayment}>
        <label>
          Payment amount (₹) *
          <input
            required
            type="number"
            min="0.01"
            max={paymentInvoice.balance_due}
            step="0.01"
            value={paymentForm.amount}
            onChange={(event) =>
              setPaymentForm((previous) => ({
                ...previous,
                amount: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Payment date *
          <input
            required
            type="date"
            value={paymentForm.payment_date}
            onChange={(event) =>
              setPaymentForm((previous) => ({
                ...previous,
                payment_date: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Payment method *
          <select
            required
            value={paymentForm.payment_method}
            onChange={(event) =>
              setPaymentForm((previous) => ({
                ...previous,
                payment_method: event.target.value,
              }))
            }
          >
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CARD">Card</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label>
          Transaction reference
          <input
            value={paymentForm.reference_number}
            onChange={(event) =>
              setPaymentForm((previous) => ({
                ...previous,
                reference_number: event.target.value,
              }))
            }
            placeholder="Actual transaction reference, if available"
          />
        </label>

        <label>
          Notes
          <textarea
            rows="3"
            value={paymentForm.notes}
            onChange={(event) =>
              setPaymentForm((previous) => ({
                ...previous,
                notes: event.target.value,
              }))
            }
            placeholder="Optional payment notes"
          />
        </label>

        <div className="billing-modal-footer">
          <button
            type="button"
            className="billing-secondary-button"
            onClick={() => setPaymentInvoice(null)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="billing-primary-button"
            disabled={paymentSaving}
          >
            {paymentSaving ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </form>
    </section>
  </div>
)}

{paymentHistoryInvoice && (
  <div
    className="billing-modal-backdrop"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        setPaymentHistoryInvoice(null);
      }
    }}
  >
    <section className="billing-modal">
      <header className="billing-modal-header">
        <div>
          <h2>Payment History</h2>
          <p>{paymentHistoryInvoice.invoice_number}</p>
        </div>
        <button
          type="button"
          onClick={() => setPaymentHistoryInvoice(null)}
        >
          <X />
        </button>
      </header>

      <div className="billing-table-wrap">
        <table className="billing-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="4" className="billing-empty">
                  No payment records for this invoice.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatDate(payment.payment_date)}</td>
                  <td>{currency(payment.amount)}</td>
                  <td>{payment.payment_method.replaceAll("_", " ")}</td>
                  <td>{payment.reference_number || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="billing-modal-footer">
        <button
          className="billing-secondary-button"
          onClick={() => setPaymentHistoryInvoice(null)}
        >
          Close
        </button>
      </div>
    </section>
  </div>
)}


        <PageFooter label="LogiTrack Billing & Invoices" />
      </main>
    </div>
  );
}
