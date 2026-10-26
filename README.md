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

### Warehouse Management
- Warehouse records and location information
- Warehouse management operations

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

## Project Structure

```text
LogiTrack/
├── backend/
│   ├── accounts/
│   ├── billing/
│   ├── config/
│   ├── customers/
│   ├── fleet/
│   ├── shipments/
│   ├── warehouses/
│   └── manage.py
├── frontend/
│   ├── public/
│   ├── src/
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
git clone https://github.com/YOUR_USERNAME/LogiTrack.git
cd LogiTrack
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Backend Setup

Open a terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers django-filter
```

Configure your Django environment settings before running the server.

Apply database migrations:

```powershell
python manage.py migrate
```

Start the Django server:

```powershell
python manage.py runserver
```

Backend URL:

`http://127.0.0.1:8000/`

### 3. Frontend Setup

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

`http://localhost:5173/`

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

Protected endpoints require valid authentication and appropriate permissions.

## Security

- JWT-based authentication
- Role-based API access
- Sensitive environment files excluded from Git
- Local SQLite database excluded from the repository
- Validation for shipment and billing operations

**Important:** Do not commit database files, credentials, JWT tokens, or production secrets.

## Development Status

LogiTrack is under active development. Features and documentation may evolve as additional modules are completed and tested.

## Future Enhancements

- Delivery exception management interface
- Improved real-time shipment tracking
- Notification and alert system
- Advanced analytics and reporting
- Deployment and production configuration

## License

No license has been selected yet.

---

Built with React.js and Django REST Framework.
