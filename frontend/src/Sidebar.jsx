import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Package,
  MapPin,
  ReceiptText,
  Route,
  Settings,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

const navigationGroups = [
  {
    label: "WORKSPACE",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Shipments", path: "/shipments", icon: Package },
      { label: "Live Tracking", path: "/live-tracking", icon: MapPin },
      {
        label: "Pickup & Delivery",
        path: "/pickup-delivery",
        icon: CalendarCheck,
      },
      { label: "Route Planner", path: "/routes", icon: Route },
    ],
  },
  {
  label: "MANAGEMENT",
  items: [
    { label: "Customers", path: "/customers", icon: Users },
    { label: "Drivers & Fleet", path: "/fleet", icon: Truck },
    { label: "Warehouses", path: "/warehouses", icon: Warehouse },
    {
      label: "Warehouse Inventory",
      path: "/warehouse-inventory",
      icon: Boxes,
    },
    { label: "Billing & Invoices", path: "/billing", icon: ReceiptText },
  ],
},
  {
    label: "INSIGHTS & SYSTEM",
    items: [
      { label: "Analytics & Reports", path: "/reports", icon: BarChart3 },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ profile, onLogout }) {
  return (
    <aside className="sidebar">
      <NavLink to="/dashboard" className="brand sidebar-brand">
        <span className="brand-icon">
          <Truck size={22} />
        </span>
        LogiTrack
      </NavLink>

      <nav className="sidebar-navigation" aria-label="Main navigation">
        {navigationGroups.map((group) => (
          <div className="sidebar-group" key={group.label}>
            <span className="sidebar-label">{group.label}</span>

            {group.items.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/dashboard"}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " active" : ""}`
                }
              >
                <Icon size={19} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="avatar">
            {(profile?.username || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="sidebar-user-text">
            <strong>{profile?.username || "Staff user"}</strong>
            <span>{profile?.role || "Staff"}</span>
          </div>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
}
