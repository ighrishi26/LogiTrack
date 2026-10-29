# LogiTrack — Logistics Management System

A full-stack logistics management system built with **React.js** and **Django REST Framework** to manage shipments, track deliveries, coordinate logistics operations, and monitor business activities through a centralized dashboard.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Vite, JavaScript, CSS |
| Backend | Python, Django, Django REST Framework |
| Database | SQLite |
| Authentication | JWT Authentication |
| API Communication | Axios |
| Version Control | Git & GitHub |

## Features

### Dashboard
- Shipment statistics and operational overview
- Shipment status summaries
- Search and filter functionality
- Shipment analytics and CSV export

### Shipment Management
- Create and manage shipments
- View shipment details
- Edit shipment information
- Update shipment delivery status
- Delete shipments with confirmation
- Automatic shipment tracking numbers

### Shipment Tracking
- Public shipment tracking
- Shipment status history
- Tracking updates and delivery progress

### Pickup & Delivery
- Manage pickup and delivery operations
- Monitor shipment progress

### Customer Management
- Manage customer information
- View customer-related records

### Drivers & Fleet
- Driver and vehicle management
- Fleet information and operational records

### Warehouse Management & Inventory
- Warehouse records and location information
- Warehouse management operations
- Inventory module for warehouse stock management

### Billing & Invoices
- Create and manage invoices
- Edit invoice information
- Track invoice payment history
- Record payments with validation
- Search invoices and export CSV reports

### Delivery Exceptions API
- Report delivery-related issues
- Categorize exceptions by type and severity
- Track exception resolution status
- Record resolution notes
- Role-based access restrictions

### Delivery Route Planner
- Dedicated Route Planner page integrated with the dashboard sidebar
- Create delivery routes with a route name and date
- Assign drivers and vehicles from available records
- View existing routes and their details
- Add existing shipments as ordered delivery stops
- Update route progress/status
- Django REST Framework route API under `/api/routes/`

### Notifications & Alerts
- Dedicated Notifications page integrated with the dashboard sidebar
- View notifications associated with the signed-in user
- Filter notifications by **All**, **Unread**, and **Read**
- View unread notification counts
- Mark individual notifications or all notifications as read
- Notification categories: shipment status, delivery exception, and system
- Django REST Framework notifications API under `/api/notifications/`

> **Sample data note:** Eight demonstration notifications were created in a local SQLite database for UI testing. These are **not** real shipment events and are **not included in the GitHub source-code repository**. A fresh installation starts with its own database contents.

## Project Structure

```text
LogiTrack/
├── backend/
│   ├── accounts/
│   ├── alerts/              # Notifications API and models
│   ├── billing/
│   ├── config/
│   ├── customers/
│   ├── fleet/
│   ├── inventory/           # Warehouse inventory
│   ├── routes/              # Delivery route planning API
│   ├── shipments/
│   ├── warehouses/
│   └── manage.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── RoutePlanner.jsx
│   │   ├── Notifications.jsx
│   │   ├── Sidebar.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   └── api.js
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Installation and Setup

### Prerequisites

Install:
- Python
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/ighrishi26/LogiTrack.git
cd LogiTrack
```

### 2. Backend Setup

Open a PowerShell terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers django-filter
```

Install any additional dependencies required by the project's backend configuration. Configure Django environment settings and secrets for your local environment before running the server.

Apply database migrations:

```powershell
python manage.py migrate
```

Start the Django server:

```powershell
python manage.py runserver
```

Backend URL: `http://127.0.0.1:8000/`

### 3. Frontend Setup

Open another terminal from the project root:

```powershell
cd frontend
npm install
```

Set the frontend API base URL in `frontend/.env` (or the environment configuration you use):

```dotenv
VITE_API_URL=http://127.0.0.1:8000/api
```

Then run:

```powershell
npm run dev
```

Frontend URL: `http://localhost:5173/` (or the port shown by Vite).

### 4. Main Application Pages

| Page | Frontend route |
|---|---|
| Route Planner | `/routes` |
| Notifications | `/notifications` |

Both pages use the authenticated dashboard layout and sidebar navigation.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | User authentication |
| GET | `/api/auth/me/` | Current user profile |
| GET | `/api/shipments/` | List shipments |
| POST | `/api/shipments/` | Create a shipment |
| GET | `/api/shipments/stats/` | Shipment statistics |
| GET | `/api/delivery-exceptions/` | List delivery exceptions |
| POST | `/api/delivery-exceptions/` | Report a delivery exception |
| POST | `/api/delivery-exceptions/{id}/resolve/` | Resolve a delivery exception |
| GET | `/api/routes/` | List delivery routes |
| POST | `/api/routes/` | Create a delivery route |
| GET | `/api/routes/{id}/` | Retrieve route details |
| POST | `/api/routes/{id}/stops/` | Add a shipment stop (frontend integration; verify action in viewset) |
| PATCH | `/api/routes/{id}/progress/` | Update route progress (frontend integration; verify action in viewset) |
| GET | `/api/notifications/` | List notifications |
| GET | `/api/notifications/unread-count/` | Get unread count (frontend integration; verify action in viewset) |
| POST | `/api/notifications/{id}/mark-read/` | Mark notification as read (frontend integration; verify action in viewset) |
| POST | `/api/notifications/mark-all-read/` | Mark all notifications as read (frontend integration; verify action in viewset) |

Protected endpoints require valid authentication and appropriate permissions. Custom action paths should be checked against the corresponding Django ViewSet definitions when deploying.

## Security

- JWT-based authentication
- Role-based API access
- Sensitive environment files excluded from Git
- Local SQLite database excluded from the repository
- Validation for shipment and billing operations

**Important:** Do not commit database files, credentials, JWT tokens, or production secrets.

## Recent Updates

- Integrated the Route Planner and Notifications pages into the main application navigation.
- Registered the `alerts` application in Django's `INSTALLED_APPS`.
- Updated dashboard-related navigation and frontend routing.
- Added documentation for route and notification APIs, inventory, and page setup.
- Latest confirmed GitHub push: commit [`8dfa9d7`](https://github.com/ighrishi26/LogiTrack/commit/8dfa9d7) on `main`.

## Development Status

LogiTrack is under active development. Features and documentation may evolve as additional modules are completed and tested. Route Planner and Notifications pages are integrated; their functionality depends on the corresponding backend routes, migrations, and API actions being available in the running environment.

## Future Enhancements

- Delivery exception management interface
- Improved real-time shipment tracking
- Automatic event-driven notifications for real shipment updates
- Advanced analytics and reporting
- Deployment and production configuration

## License

No license has been selected yet.

---

Built with React.js and Django REST Framework.
