
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  History,
  Plus,
  RefreshCw,
} from "lucide-react";
import api from "./api";
import Sidebar from "./Sidebar";
import PageFooter from "./PageFooter";

const emptyItem = {
  warehouse: "",
  sku: "",
  name: "",
  description: "",
  reorder_level: "10",
  unit: "pcs",
};

const emptyMovement = {
  item: "",
  movement_type: "STOCK_IN",
  quantity: "",
  notes: "",
};

function getResults(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

function getError(error) {
  const data = error.response?.data;

  if (!data) {
    return "Unable to connect to Django.";
  }

  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  return Object.entries(data)
    .map(([key, value]) => {
      const message = Array.isArray(value)
        ? value.join(", ")
        : String(value);

      return `${key}: ${message}`;
    })
    .join(" | ");
}

async function getAllPages(url) {
  const results = [];
  let next = url;

  while (next) {
    const response = await api.get(next);
    const data = response.data;

    results.push(...getResults(data));

    if (Array.isArray(data)) break;

    if (data.next) {
      const nextUrl = new URL(
        data.next,
        new URL(api.defaults.baseURL, window.location.origin)
      );

      const apiOrigin = new URL(
        api.defaults.baseURL,
        window.location.origin
      ).origin;

      if (nextUrl.origin !== apiOrigin) {
        throw new Error("Unexpected pagination URL.");
      }

      next = nextUrl.pathname + nextUrl.search;
    } else {
      next = null;
    }
  }

  return results;
}

export default function WarehouseInventory() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [formMode, setFormMode] = useState("");

  const [itemForm, setItemForm] = useState(emptyItem);
  const [movementForm, setMovementForm] = useState(emptyMovement);

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [profileResponse, warehouseData, itemData, movementData] =
        await Promise.all([
          api.get("/auth/me/"),
          getAllPages("/warehouses/"),
          getAllPages("/inventory/items/"),
          getAllPages("/inventory/movements/"),
        ]);

      setProfile(profileResponse.data);
      setWarehouses(warehouseData);
      setItems(itemData);
      setMovements(movementData);
    } catch (err) {
  console.error("Inventory loading failed:", {
    url: err.config?.url,
    status: err.response?.status,
    response: err.response?.data,
    message: err.message,
  });

  setError(
    `Failed to load ${err.config?.url || "inventory data"}: ` +
    getError(err)
  );
} finally {
  setLoading(false);
}
  }, []);

  useEffect(() => {
  loadData();
}, [loadData]);

  const visibleItems = items.filter((item) => {
    const matchesWarehouse =
      !warehouseFilter ||
      String(item.warehouse) === warehouseFilter;

    const text = `${item.name} ${item.sku}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());

    return matchesWarehouse && matchesSearch;
  });

  const lowStock = items.filter((item) => item.is_low_stock);

  const submitItem = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api.post("/inventory/items/", {
        ...itemForm,
        warehouse: Number(itemForm.warehouse),
        reorder_level: Number(itemForm.reorder_level),
      });

      setNotice("Inventory item created successfully.");
      setItemForm(emptyItem);
      setFormMode("");
      await loadData();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const submitMovement = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api.post("/inventory/movements/", {
        ...movementForm,
        item: Number(movementForm.item),
        quantity: Number(movementForm.quantity),
      });

      setNotice("Stock movement recorded successfully.");
      setMovementForm(emptyMovement);
      setFormMode("");
      await loadData();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-layout inventory-layout">
      <Sidebar profile={profile} onLogout={logout} />

      <div className="dashboard-main inventory-main">
  <main className="inventory-page">
          <div className="dashboard-header inventory-header">
            <div>
              <span className="inventory-eyebrow">
                WAREHOUSE OPERATIONS
              </span>
              <h1>Warehouse Inventory</h1>
              <p>
                Monitor stock, manage inventory items,
                and review stock movements.
              </p>
            </div>

            <div className="inventory-actions">
              <button
  type="button"
  className="refresh-button"
  onClick={loadData}
  disabled={loading}
>
                <RefreshCw size={17} /> Refresh
              </button>

              <button
  type="button"
  className="create-shipment-button inventory-primary"
  onClick={() => setFormMode("item")}
>
                <Plus size={17} /> Add Item
              </button>

              <button
  type="button"
  className="export-csv-button"
  onClick={() => setFormMode("movement")}
>
                <History size={17} /> Stock Movement
              </button>
            </div>
          </div>

          {error && (
            <div className="inventory-error" role="alert">
              {error}
            </div>
          )}

          {notice && (
            <div className="inventory-notice" role="status">
              {notice}
            </div>
          )}

          <section className="inventory-stats">
            <article className="inventory-stat">
              <Boxes size={23} />
              <span>Total Items</span>
              <strong>{items.length}</strong>
            </article>

            <article className="inventory-stat">
              <ArrowDownToLine size={23} />
              <span>Total Stock Units</span>
              <strong>
                {items.reduce(
                  (sum, item) => sum + Number(item.quantity),
                  0
                )}
              </strong>
            </article>

            <article className="inventory-stat">
              <AlertTriangle size={23} />
              <span>Low Stock Items</span>
              <strong>{lowStock.length}</strong>
            </article>

            <article className="inventory-stat">
              <ArrowUpFromLine size={23} />
              <span>Stock Movements</span>
              <strong>{movements.length}</strong>
            </article>
          </section>

          <section className="inventory-panel">
            <div className="inventory-section-header">
              <h2>Inventory Items</h2>
              <span>{visibleItems.length} items</span>
            </div>

            <div className="inventory-filters">
              <input
                placeholder="Search item name or SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                <option value="">All Warehouses</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Item</th>
                    <th>Warehouse</th>
                    <th>Quantity</th>
                    <th>Reorder Level</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.sku}</td>
                      <td>{item.name}</td>
                      <td>{item.warehouse_name}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{item.reorder_level}</td>
                      <td>
                        <span
                          className={
                            item.is_low_stock
                              ? "inventory-badge inventory-badge-low"
                              : "inventory-badge inventory-badge-ok"
                          }
                        >
                          {item.is_low_stock
                            ? "Low Stock"
                            : "In Stock"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!loading && visibleItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="inventory-empty">
                        No inventory items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="inventory-panel">
            <div className="inventory-section-header">
              <h2>Recent Stock Movements</h2>
              <span>{movements.length} records</span>
            </div>

            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Previous</th>
                    <th>New</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {movements.slice(0, 20).map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.item_name}</td>
                      <td>
                        {movement.movement_type === "STOCK_IN"
                          ? "Stock In"
                          : movement.movement_type === "STOCK_OUT"
                          ? "Stock Out"
                          : "Adjustment"}
                      </td>
                      <td>{movement.quantity}</td>
                      <td>{movement.previous_quantity}</td>
                      <td>{movement.new_quantity}</td>
                      <td>
                        {new Date(
                          movement.created_at
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {!loading && movements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="inventory-empty">
                        No stock movements recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {formMode && (
            <div className="inventory-modal-backdrop">
              <div
                className="inventory-modal"
                role="dialog"
                aria-modal="true"
                aria-label={
                  formMode === "item"
                    ? "Add inventory item"
                    : "Record stock movement"
                }
              >
                <div className="inventory-section-header">
                  <h2>
                    {formMode === "item"
                      ? "Add Inventory Item"
                      : "Record Stock Movement"}
                  </h2>

                  <button
                    type="button"
                    onClick={() => setFormMode("")}
                  >
                    Close
                  </button>
                </div>

                {formMode === "item" ? (
                  <form
                    className="inventory-form"
                    onSubmit={submitItem}
                  >
                    <label>
                      Warehouse
                      <select
                        required
                        value={itemForm.warehouse}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            warehouse: e.target.value,
                          })
                        }
                      >
                        <option value="">Select warehouse</option>
                        {warehouses.map((warehouse) => (
                          <option
                            key={warehouse.id}
                            value={warehouse.id}
                          >
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      SKU
                      <input
                        required
                        value={itemForm.sku}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            sku: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Item Name
                      <input
                        required
                        value={itemForm.name}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            name: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Description
                      <textarea
                        value={itemForm.description}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            description: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Reorder Level
                      <input
                        type="number"
                        min="0"
                        required
                        value={itemForm.reorder_level}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            reorder_level: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Unit
                      <input
                        required
                        value={itemForm.unit}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            unit: e.target.value,
                          })
                        }
                      />
                    </label>

                    <button
                      className="inventory-primary"
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Create Item"}
                    </button>
                  </form>
                ) : (
                  <form
                    className="inventory-form"
                    onSubmit={submitMovement}
                  >
                    <label>
                      Inventory Item
                      <select
                        required
                        value={movementForm.item}
                        onChange={(e) =>
                          setMovementForm({
                            ...movementForm,
                            item: e.target.value,
                          })
                        }
                      >
                        <option value="">Select item</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.sku}) —
                            Available: {item.quantity}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Movement Type
                      <select
                        value={movementForm.movement_type}
                        onChange={(e) =>
                          setMovementForm({
                            ...movementForm,
                            movement_type: e.target.value,
                          })
                        }
                      >
                        <option value="STOCK_IN">Stock In</option>
                        <option value="STOCK_OUT">Stock Out</option>
                      </select>
                    </label>

                    <label>
                      Quantity
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={movementForm.quantity}
                        onChange={(e) =>
                          setMovementForm({
                            ...movementForm,
                            quantity: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Notes
                      <textarea
                        value={movementForm.notes}
                        onChange={(e) =>
                          setMovementForm({
                            ...movementForm,
                            notes: e.target.value,
                          })
                        }
                      />
                    </label>

                    <button
                      className="inventory-primary"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : "Record Movement"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {loading && <p>Loading inventory data...</p>}
        </main>

        <PageFooter label="LogiTrack Warehouse Inventory" />
      </div>
    </div>
  );
}
