import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Clock,
  FileCheck,
  FileText,
  Image as ImageIcon,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  UploadCloud,
  UserCheck,
  X,
} from "lucide-react";
import api from "./api";
import Sidebar from "./Sidebar";
import PageFooter from "./PageFooter";

const relationshipOptions = [
  { value: "RECIPIENT", label: "Direct Recipient" },
  { value: "FAMILY_MEMBER", label: "Family Member" },
  { value: "COLLEAGUE", label: "Colleague / Coworker" },
  { value: "FRONT_DESK", label: "Reception / Front Desk" },
  { value: "SECURITY", label: "Security Personnel" },
  { value: "NEIGHBOR", label: "Neighbor" },
  { value: "OTHER", label: "Other" },
];

const relationshipMap = Object.fromEntries(
  relationshipOptions.map((opt) => [opt.value, opt.label])
);

function formatDateTime(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not scheduled"
    : date.toLocaleDateString();
}

export default function ProofOfDelivery() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [tabFilter, setTabFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Record POD Modal state
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [activeShipment, setActiveShipment] = useState(null);
  const [recipientName, setRecipientName] = useState("");
  const [relationship, setRelationship] = useState("RECIPIENT");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // View POD Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewPodData, setViewPodData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const canRecordPod =
    profile?.role && ["ADMIN", "MANAGER", "DRIVER"].includes(profile.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [profileResult, shipmentResult] = await Promise.allSettled([
        api.get("/auth/me/"),
        api.get("/shipments/", {
          params: {
            search: search.trim() || undefined,
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
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not load shipments. Please check connection and permissions."
      );
    } finally {
      setLoading(false);
    }
  }, [search, page]);

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

  function openRecordModal(shipment) {
    setActiveShipment(shipment);
    setRecipientName(shipment.receiver_name || "");
    setRelationship("RECIPIENT");
    setDeliveryNotes("");
    setEvidenceFile(null);
    setPreviewUrl(null);
    setConfirmStep(false);
    setFormError("");
    setRecordModalOpen(true);
  }

  function closeRecordModal() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordModalOpen(false);
    setActiveShipment(null);
    setEvidenceFile(null);
    setPreviewUrl(null);
    setConfirmStep(false);
    setFormError("");
  }

  async function openViewModal(shipment) {
    setActiveShipment(shipment);
    setViewModalOpen(true);
    setViewLoading(true);

    try {
      if (shipment.proof_of_delivery) {
        setViewPodData(shipment.proof_of_delivery);
      } else {
        const res = await api.get(`/shipments/${shipment.id}/proof/`);
        setViewPodData(res.data);
      }
    } catch (err) {
      setViewPodData(null);
      setError(
        err.response?.data?.detail ||
          "Could not load proof of delivery details."
      );
    } finally {
      setViewLoading(false);
    }
  }

  function closeViewModal() {
    setViewModalOpen(false);
    setViewPodData(null);
    setActiveShipment(null);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError("File size cannot exceed 5 MB.");
      return;
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      setFormError("Only JPG, PNG, WEBP, and PDF files are supported.");
      return;
    }

    setFormError("");
    setEvidenceFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  function removeFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setEvidenceFile(null);
    setPreviewUrl(null);
  }

  async function handleSubmitPod(event) {
    event.preventDefault();

    if (!recipientName.trim()) {
      setFormError("Recipient name is required.");
      return;
    }

    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const formData = new FormData();
      formData.append("shipment", activeShipment.id);
      formData.append("recipient_name", recipientName.trim());
      formData.append("recipient_relationship", relationship);
      formData.append("delivery_notes", deliveryNotes.trim());
      formData.append(
        "tracking_location",
        activeShipment.destination || ""
      );

      if (evidenceFile) {
        formData.append("photo", evidenceFile);
      }

      await api.post("/proof-of-delivery/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setNotice(
        `Proof of delivery recorded for ${activeShipment.tracking_number}! Shipment marked as DELIVERED.`
      );
      closeRecordModal();
      await loadData();
    } catch (err) {
      const resp = err.response?.data;
      if (resp) {
        if (typeof resp === "string") setFormError(resp);
        else if (resp.detail) setFormError(resp.detail);
        else {
          const messages = Object.entries(resp)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ");
          setFormError(messages);
        }
      } else {
        setFormError("Failed to record proof of delivery. Please retry.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const filteredShipments = shipments.filter((item) => {
    const hasPod = Boolean(
      item.proof_of_delivery || item.status === "DELIVERED"
    );
    if (tabFilter === "pending_pod") {
      return item.status !== "DELIVERED" && item.status !== "CANCELLED";
    }
    if (tabFilter === "delivered_pod") {
      return hasPod;
    }
    return true;
  });

  const stats = {
    total: shipments.length,
    awaiting: shipments.filter((s) =>
      ["OUT_FOR_DELIVERY", "IN_TRANSIT", "PICKED_UP"].includes(s.status)
    ).length,
    delivered: shipments.filter((s) => s.status === "DELIVERED").length,
    podRecorded: shipments.filter(
      (s) => s.proof_of_delivery || s.status === "DELIVERED"
    ).length,
  };

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} onLogout={logout} />

      <main className="dashboard-main management-main pod-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">PROOF OF DELIVERY</span>
            <h1>Delivery Confirmation & Evidence</h1>
            <p>
              Verify handover, record recipient confirmation, and store delivery evidence securely.
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

        <section className="pickup-stats-grid pod-stats-grid">
          <article className="stat-card">
            <div className="stat-top">
              <span>Awaiting Delivery</span>
              <span className="stat-icon amber">
                <Truck size={20} />
              </span>
            </div>
            <strong>{stats.awaiting}</strong>
            <small>Active in delivery transit</small>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Delivered</span>
              <span className="stat-icon green">
                <CheckCircle2 size={20} />
              </span>
            </div>
            <strong>{stats.delivered}</strong>
            <small>Marked as delivered</small>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Verified POD</span>
              <span className="stat-icon blue">
                <ShieldCheck size={20} />
              </span>
            </div>
            <strong>{stats.podRecorded}</strong>
            <small>Delivery evidence on file</small>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Total Shipments</span>
              <span className="stat-icon blue">
                <Package size={20} />
              </span>
            </div>
            <strong>{stats.total}</strong>
            <small>Current shipment batch</small>
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
            <span>{notice}</span>
          </div>
        )}

        <section className="shipments-panel management-panel pod-panel">
          <div className="panel-heading">
            <div>
              <h2>Shipment Delivery Queue</h2>
              <p>
                Select a shipment to document receipt or review submitted delivery confirmation.
              </p>
            </div>

            <div className="pod-filter-tabs">
              <button
                type="button"
                className={`pod-tab-btn ${tabFilter === "all" ? "active" : ""}`}
                onClick={() => setTabFilter("all")}
              >
                All Shipments
              </button>
              <button
                type="button"
                className={`pod-tab-btn ${
                  tabFilter === "pending_pod" ? "active" : ""
                }`}
                onClick={() => setTabFilter("pending_pod")}
              >
                Pending Delivery ({stats.awaiting})
              </button>
              <button
                type="button"
                className={`pod-tab-btn ${
                  tabFilter === "delivered_pod" ? "active" : ""
                }`}
                onClick={() => setTabFilter("delivered_pod")}
              >
                Completed POD ({stats.delivered})
              </button>
            </div>
          </div>

          <div className="pickup-filters">
            <div className="management-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by tracking number, recipient, or destination..."
                aria-label="Search shipments for proof of delivery"
              />
            </div>
          </div>

          <div className="table-scroll">
            <table className="shipments-table pod-table">
              <thead>
                <tr>
                  <th>Tracking Number</th>
                  <th>Recipient / Route</th>
                  <th>Est. Delivery</th>
                  <th>Shipment Status</th>
                  <th>POD Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment) => {
                  const hasPod = Boolean(
                    shipment.proof_of_delivery || shipment.status === "DELIVERED"
                  );
                  const isCancelled = shipment.status === "CANCELLED";

                  return (
                    <tr key={shipment.id}>
                      <td>
                        <strong>{shipment.tracking_number}</strong>
                        <div className="pod-meta-sub">
                          <small>Sender: {shipment.sender_name}</small>
                        </div>
                      </td>

                      <td>
                        <div className="pod-recipient-info">
                          <UserCheck size={14} className="pod-recipient-icon" />
                          <span>{shipment.receiver_name}</span>
                        </div>
                        <div className="pickup-route">
                          <span>{shipment.origin}</span>
                          <ArrowRight size={13} />
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
                          {shipment.status?.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td>
                        {hasPod ? (
                          <span className="pod-status-badge pod-badge-verified">
                            <ShieldCheck size={14} /> Confirmed
                          </span>
                        ) : isCancelled ? (
                          <span className="pod-status-badge pod-badge-cancelled">
                            Cancelled
                          </span>
                        ) : (
                          <span className="pod-status-badge pod-badge-pending">
                            <Clock size={14} /> Pending
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="pod-actions-cell">
                          {hasPod && (
                            <button
                              type="button"
                              className="management-text-button pod-btn-view"
                              onClick={() => openViewModal(shipment)}
                              title="View delivery proof details"
                            >
                              <FileCheck size={15} /> View Proof
                            </button>
                          )}

                          {!hasPod && !isCancelled && canRecordPod && (
                            <button
                              type="button"
                              className="pod-btn-record"
                              onClick={() => openRecordModal(shipment)}
                              title="Record proof of delivery"
                            >
                              <ClipboardCheck size={15} /> Record POD
                            </button>
                          )}

                          <button
                            type="button"
                            className="management-text-button"
                            onClick={() =>
                              navigate(
                                `/track/${encodeURIComponent(
                                  shipment.tracking_number
                                )}`
                              )
                            }
                            title="Public Tracking"
                          >
                            <Package size={14} /> Track
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filteredShipments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      No shipments found matching the selected filter.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      Loading proof of delivery records...
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
                onClick={() => setPage((c) => Math.max(1, c - 1))}
              >
                Previous
              </button>
              <button
                disabled={!hasNext || loading}
                onClick={() => setPage((c) => c + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {/* RECORD PROOF OF DELIVERY MODAL */}
        {recordModalOpen && activeShipment && (
          <div className="pod-modal-overlay" role="dialog" aria-modal="true">
            <div className="pod-modal-content">
              <div className="pod-modal-header">
                <div>
                  <h3>Record Proof of Delivery</h3>
                  <span className="pod-modal-sub">
                    Shipment <strong>{activeShipment.tracking_number}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="pod-modal-close"
                  onClick={closeRecordModal}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="pod-shipment-summary">
                <div className="pod-summary-col">
                  <small>Receiver Expected</small>
                  <strong>{activeShipment.receiver_name}</strong>
                </div>
                <div className="pod-summary-col">
                  <small>Destination</small>
                  <strong>{activeShipment.destination}</strong>
                </div>
                <div className="pod-summary-col">
                  <small>Weight & Cost</small>
                  <strong>
                    {activeShipment.weight_kg} kg | ${activeShipment.shipping_cost}
                  </strong>
                </div>
              </div>

              {formError && (
                <div className="dashboard-error pod-form-error" role="alert">
                  <CircleAlert size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitPod} className="pod-form">
                <div className="pod-form-group">
                  <label htmlFor="pod-recipient-name">
                    Recipient Full Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="pod-recipient-name"
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Enter name of person who received package"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="pod-form-group">
                  <label htmlFor="pod-relationship">
                    Recipient Relationship
                  </label>
                  <select
                    id="pod-relationship"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    disabled={submitting}
                  >
                    {relationshipOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pod-form-group">
                  <label htmlFor="pod-notes">Delivery Notes (Optional)</label>
                  <textarea
                    id="pod-notes"
                    rows={2}
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Notes regarding handover, gate code, reception drop-off..."
                    disabled={submitting}
                  />
                </div>

                <div className="pod-form-group">
                  <label>
                    Delivery Photo / Signature Evidence (Optional)
                  </label>
                  {!evidenceFile ? (
                    <label className="pod-file-dropzone">
                      <UploadCloud size={28} className="pod-upload-icon" />
                      <span>Upload photo or signature file</span>
                      <small>JPG, PNG, WEBP, or PDF up to 5 MB</small>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileChange}
                        disabled={submitting}
                        style={{ display: "none" }}
                      />
                    </label>
                  ) : (
                    <div className="pod-file-selected">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Evidence preview"
                          className="pod-preview-thumb"
                        />
                      ) : (
                        <FileText size={32} className="pod-file-icon" />
                      )}
                      <div className="pod-file-meta">
                        <strong>{evidenceFile.name}</strong>
                        <small>
                          {(evidenceFile.size / 1024).toFixed(1)} KB
                        </small>
                      </div>
                      <button
                        type="button"
                        className="pod-remove-file-btn"
                        onClick={removeFile}
                        disabled={submitting}
                        aria-label="Remove uploaded file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {confirmStep ? (
                  <div className="pod-confirm-box">
                    <ShieldCheck size={22} className="pod-confirm-icon" />
                    <div>
                      <strong>Final Confirmation</strong>
                      <p>
                        Are you sure you want to confirm handover to{" "}
                        <em>{recipientName}</em>? This will officially mark shipment{" "}
                        <strong>{activeShipment.tracking_number}</strong> as{" "}
                        <strong>DELIVERED</strong>.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="pod-modal-actions">
                  <button
                    type="button"
                    className="pod-btn-cancel"
                    onClick={closeRecordModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  {!confirmStep ? (
                    <button
                      type="button"
                      className="pod-btn-proceed"
                      onClick={() => {
                        if (!recipientName.trim()) {
                          setFormError("Recipient name is required.");
                          return;
                        }
                        setFormError("");
                        setConfirmStep(true);
                      }}
                      disabled={submitting}
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="pod-btn-submit"
                      disabled={submitting}
                    >
                      {submitting ? "Recording..." : "Confirm & Deliver"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW PROOF OF DELIVERY MODAL */}
        {viewModalOpen && activeShipment && (
          <div className="pod-modal-overlay" role="dialog" aria-modal="true">
            <div className="pod-modal-content pod-view-modal">
              <div className="pod-modal-header">
                <div>
                  <h3>Delivery Evidence & Confirmation</h3>
                  <span className="pod-modal-sub">
                    Tracking: <strong>{activeShipment.tracking_number}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="pod-modal-close"
                  onClick={closeViewModal}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {viewLoading ? (
                <div className="pod-view-loading">
                  <RefreshCw size={24} className="spin" />
                  <p>Loading proof of delivery details...</p>
                </div>
              ) : viewPodData ? (
                <div className="pod-view-body">
                  <div className="pod-view-grid">
                    <div className="pod-view-item">
                      <span className="pod-view-label">Received By</span>
                      <strong>{viewPodData.recipient_name}</strong>
                    </div>

                    <div className="pod-view-item">
                      <span className="pod-view-label">Relationship</span>
                      <span>
                        {viewPodData.recipient_relationship_display ||
                          relationshipMap[viewPodData.recipient_relationship] ||
                          viewPodData.recipient_relationship ||
                          "Direct Recipient"}
                      </span>
                    </div>

                    <div className="pod-view-item">
                      <span className="pod-view-label">Delivery Date & Time</span>
                      <span>{formatDateTime(viewPodData.actual_delivery)}</span>
                    </div>

                    <div className="pod-view-item">
                      <span className="pod-view-label">Recorded By</span>
                      <span>
                        {viewPodData.recorded_by_username || "Staff User"}
                      </span>
                    </div>
                  </div>

                  {viewPodData.delivery_notes && (
                    <div className="pod-view-notes">
                      <span className="pod-view-label">Delivery Notes</span>
                      <p>{viewPodData.delivery_notes}</p>
                    </div>
                  )}

                  <div className="pod-view-evidence">
                    <span className="pod-view-label">Attached Evidence</span>
                    {viewPodData.photo_url || viewPodData.photo ? (
                      <div className="pod-evidence-preview-card">
                        {String(viewPodData.photo_url || viewPodData.photo).match(
                          /\.(pdf)$/i
                        ) ? (
                          <div className="pod-evidence-doc">
                            <FileText size={36} />
                            <a
                              href={viewPodData.photo_url || viewPodData.photo}
                              target="_blank"
                              rel="noreferrer"
                              className="pod-doc-link"
                            >
                              Open Delivery Document (PDF)
                            </a>
                          </div>
                        ) : (
                          <div className="pod-evidence-img-wrap">
                            <img
                              src={viewPodData.photo_url || viewPodData.photo}
                              alt="Proof of Delivery Evidence"
                              className="pod-evidence-image"
                            />
                            <a
                              href={viewPodData.photo_url || viewPodData.photo}
                              target="_blank"
                              rel="noreferrer"
                              className="pod-img-zoom-btn"
                            >
                              View Full Size
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pod-no-evidence">
                        <ImageIcon size={24} />
                        <span>No photo or signature file was attached.</span>
                      </div>
                    )}
                  </div>

                  <div className="pod-modal-actions">
                    <button
                      type="button"
                      className="pod-btn-cancel"
                      onClick={closeViewModal}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pod-no-evidence">
                  <CircleAlert size={24} />
                  <span>No delivery proof recorded yet for this shipment.</span>
                </div>
              )}
            </div>
          </div>
        )}

        <PageFooter label="LogiTrack Proof of Delivery" />
      </main>
    </div>
  );
}
