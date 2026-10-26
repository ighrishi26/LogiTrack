
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import api from "./api";

const STATUS_COLORS = {
  PENDING: "#c28a35",
  CONFIRMED: "#557b9b",
  PICKED_UP: "#8068a0",
  IN_TRANSIT: "#33828a",
  OUT_FOR_DELIVERY: "#5275a1",
  DELIVERED: "#35805b",
  CANCELLED: "#b05d56",
  UNKNOWN: "#7b8580",
};

export default function ShipmentAnalytics() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadShipments() {
      try {
        const response = await api.get("/shipments/", {
          params: { page_size: 100 },
        });

        const data = response.data;
        setShipments(Array.isArray(data) ? data : data.results || []);
      } catch {
        setError("Could not load shipment analytics.");
      } finally {
        setLoading(false);
      }
    }

    loadShipments();
  }, []);

  if (loading) {
    return (
      <section className="analytics-section analytics-state">
        <p className="analytics-state-message">Loading shipment analytics...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="analytics-section analytics-state">
        <p className="analytics-state-message" role="alert">{error}</p>
      </section>
    );
  }

  const statusCounts = shipments.reduce((counts, shipment) => {
    const status = shipment.status || "UNKNOWN";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    key: status,
    status: status.replaceAll("_", " "),
    count,
    color: STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN,
  }));

  const totalShippingCost = shipments.reduce(
    (total, shipment) => total + Number(shipment.shipping_cost || 0),
    0
  );

  const deliveredCount = shipments.filter(
    (shipment) => shipment.status === "DELIVERED"
  ).length;

  const deliveryRate = shipments.length
    ? Math.round((deliveredCount / shipments.length) * 100)
    : 0;

  return (
    <section className="analytics-section">
      <div className="analytics-heading">
        <div>
          <h2>Shipment Analytics</h2>
          <p>Overview of your current shipment records</p>
        </div>
      </div>

      <div className="analytics-metrics">
        <article className="analytics-card">
          <span>Total Shipments</span>
          <strong>{shipments.length}</strong>
        </article>

        <article className="analytics-card">
          <span>Delivered</span>
          <strong>{deliveredCount}</strong>
        </article>

        <article className="analytics-card">
          <span>Delivery Rate</span>
          <strong>{deliveryRate}%</strong>
        </article>

        <article className="analytics-card">
          <span>Total Shipping Cost</span>
          <strong>
            {totalShippingCost.toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 2,
            })}
          </strong>
        </article>
      </div>

      <div className="analytics-charts">
        <article className="analytics-chart-card">
          <h3>Shipments by Status</h3>
          {statusData.length ? (
            <ResponsiveContainer width="100%" height={310}>
              <BarChart
                data={statusData}
                layout="vertical"
                margin={{ top: 8, right: 18, bottom: 8, left: 4 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="#e8eee9"
                  strokeDasharray="3 5"
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#78857d", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="status"
                  width={118}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#59685f", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "#f3f7f4" }}
                  contentStyle={{
                    border: "1px solid #dfe8e1",
                    borderRadius: 10,
                    boxShadow: "0 8px 24px #183c2918",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#26372c", fontWeight: 700 }}
                  itemStyle={{ color: "#526258" }}
                />
                <Bar dataKey="count" name="Shipments" radius={[0, 6, 6, 0]}>
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>No shipment data yet.</p>
          )}
        </article>

        <article className="analytics-chart-card">
          <h3>Status Distribution</h3>
          {statusData.length ? (
            <ResponsiveContainer width="100%" height={310}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="46%"
                  innerRadius={52}
                  outerRadius={84}
                  paddingAngle={3}
                  stroke="#ffffff"
                  strokeWidth={3}
                >
                  {statusData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    border: "1px solid #dfe8e1",
                    borderRadius: 10,
                    boxShadow: "0 8px 24px #183c2918",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#26372c", fontWeight: 700 }}
                  itemStyle={{ color: "#526258" }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  height={48}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: "#59685f" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p>No shipment data yet.</p>
          )}
        </article>
      </div>
    </section>
  );
}
