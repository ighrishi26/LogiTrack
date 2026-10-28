
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  Inbox,
  Package,
  RefreshCw,
} from "lucide-react";
import Sidebar from "./Sidebar";
import PageFooter from "./PageFooter";
import api from "./api";

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString();
}

function getTypeLabel(type) {
  const labels = {
    SHIPMENT_STATUS: "Shipment update",
    DELIVERY_EXCEPTION: "Delivery exception",
    SYSTEM: "System notification",
  };

  return labels[type] || "Notification";
}

export default function Notifications() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login", { replace: true });
  }, [navigate]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (filter === "unread") {
        params.unread = "true";
      } else if (filter === "read") {
        params.unread = "false";
      }

      const [listResult, countResult] = await Promise.allSettled([
        api.get("/notifications/", { params }),
        api.get("/notifications/unread-count/"),
      ]);

      if (listResult.status === "rejected") {
        throw listResult.reason;
      }

      const data = listResult.value.data;
      const items = Array.isArray(data) ? data : data.results;

      setNotifications(Array.isArray(items) ? items : []);

      if (countResult.status === "fulfilled") {
        setUnreadCount(countResult.value.data.unread_count ?? 0);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load notifications. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me/")
      .then((response) => {
        if (!cancelled) {
          setProfile(response.data);
        }
      })
      .catch((err) => {
        if (!cancelled && err.response?.status === 401) {
          logout();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [logout]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        void loadNotifications();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadNotifications]);

  async function markAsRead(notification) {
    if (notification.is_read || busy) return;

    setBusy(true);
    setError("");

    try {
      await api.post(
        `/notifications/${notification.id}/mark-read/`
      );
      await loadNotifications();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to mark this notification as read."
      );
    } finally {
      setBusy(false);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || busy) return;

    setBusy(true);
    setError("");

    try {
      await api.post("/notifications/mark-all-read/");
      await loadNotifications();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to mark all notifications as read."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} onLogout={logout} />

      <main className="dashboard-main notifications-page">
        <header className="notifications-header">
          <div>
            <span className="eyebrow">
              UPDATES &amp; ACTIVITY
            </span>
            <h1>Notifications</h1>
            <p>
              Stay informed about shipment changes and delivery issues.
            </p>
          </div>

          <button
            type="button"
            className="notifications-refresh"
            onClick={loadNotifications}
            disabled={loading || busy}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        <section className="notifications-summary">
          <div className="notifications-summary-icon">
            <Bell size={22} />
          </div>

          <div>
            <span>Unread notifications</span>
            <strong>{unreadCount}</strong>
          </div>

          <button
            type="button"
            className="notifications-mark-all"
            onClick={markAllAsRead}
            disabled={busy || unreadCount === 0}
          >
            <CheckCheck size={17} />
            Mark all as read
          </button>
        </section>

        <section className="notifications-content">
          <div className="notifications-toolbar">
            <div>
              <h2>Recent activity</h2>
              <p>Review your latest updates.</p>
            </div>

            <div className="notifications-filters">
              <button
                type="button"
                className={filter === "all" ? "active" : ""}
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
              >
                All
              </button>

              <button
                type="button"
                className={filter === "unread" ? "active" : ""}
                onClick={() => setFilter("unread")}
                aria-pressed={filter === "unread"}
              >
                Unread
              </button>

              <button
                type="button"
                className={filter === "read" ? "active" : ""}
                onClick={() => setFilter("read")}
                aria-pressed={filter === "read"}
              >
                Read
              </button>
            </div>
          </div>

          {error && (
            <div className="notifications-error" role="alert">
              <CircleAlert size={18} />
              <span>{error}</span>
              <button type="button" onClick={loadNotifications}>
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="notifications-empty">
              <RefreshCw size={24} />
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notifications-empty">
              <Inbox size={30} />
              <h3>No notifications found</h3>
              <p>
                {filter === "unread"
                  ? "You're all caught up. There are no unread notifications."
                  : filter === "read"
                    ? "You haven't read any notifications yet."
                    : "Shipment updates and delivery alerts will appear here."}
              </p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-card ${
                    notification.is_read ? "is-read" : "is-unread"
                  }`}
                >
                  <div className="notification-type-icon">
                    {notification.notification_type ===
                    "DELIVERY_EXCEPTION" ? (
                      <CircleAlert size={21} />
                    ) : notification.notification_type ===
                      "SHIPMENT_STATUS" ? (
                      <Package size={21} />
                    ) : (
                      <Bell size={21} />
                    )}
                  </div>

                  <div className="notification-body">
                    <div className="notification-title-row">
                      <span className="notification-type">
                        {getTypeLabel(notification.notification_type)}
                      </span>

                      {!notification.is_read && (
                        <span
                          className="notification-unread-dot"
                          aria-label="Unread"
                        />
                      )}
                    </div>

                    <h3>{notification.title}</h3>
                    <p>{notification.message}</p>

                    <div className="notification-meta">
                      <span>
                        <Clock3 size={14} />
                        {formatDate(notification.created_at)}
                      </span>

                      {notification.shipment_tracking_number && (
                        <button
                          type="button"
                          className="notification-shipment-link"
                          onClick={() => navigate("/shipments")}
                        >
                          Shipment:{" "}
                          {notification.shipment_tracking_number}
                        </button>
                      )}
                    </div>
                  </div>

                  {!notification.is_read && (
                    <button
                      type="button"
                      className="notification-read-button"
                      onClick={() => markAsRead(notification)}
                      disabled={busy}
                      title="Mark as read"
                      aria-label={`Mark ${notification.title} as read`}
                    >
                      <Check size={18} />
                      <span>Mark read</span>
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <PageFooter label="LogiTrack Notifications" />
      </main>
    </div>
  );
}
