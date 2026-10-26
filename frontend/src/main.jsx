
import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import App from "./App";
import Login from "./Login";
import Dashboard from "./Dashboard";
import TrackingPage from "./TrackingPage";
import ManagementPage from "./ManagementPage";
import ProtectedRoute from "./ProtectedRoute";
import PickupDelivery from "./PickupDelivery";
import Customers from "./Customers";
import Fleet from "./Fleet";
import Warehouses from "./Warehouses";
import Billing from "./Billing";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/track/:trackingNumber"
          element={<TrackingPage />}
        />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/shipments" element={<ManagementPage />} />
          <Route path="/live-tracking" element={<ManagementPage />} />
          <Route path="/pickup-delivery" element={<PickupDelivery />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/warehouses" element={<Warehouses />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/reports" element={<ManagementPage />} />
          <Route path="/settings" element={<ManagementPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
