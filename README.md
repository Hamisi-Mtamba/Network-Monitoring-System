# Network Monitoring System

A centralized internet distribution and network management platform for ISPs and local internet service providers.

The system helps administrators manage companies, customers, internet packages, subscriptions, payments, and MikroTik network devices from a centralized platform.

## 🚀 Overview

The **Network Monitoring System** is designed to automate the management of internet distribution services.

Instead of manually activating or disconnecting customers, administrators can manage subscriptions and network access through the platform.

The system connects:

* 🌐 Customer Portal
* 🖥️ Admin Dashboard
* ⚙️ Backend API
* 🗄️ PostgreSQL Database
* 📡 MikroTik Routers
* 💳 Payment Services

### Main Workflow

```text
Customer
   ↓
Customer Portal
   ↓
Select Internet Package
   ↓
Make Payment
   ↓
Backend API
   ↓
Subscription Activated
   ↓
MikroTik Router
   ↓
Internet Access
```

When a subscription expires or is suspended, the system can automatically update the customer's network access.

---

# ✨ Features

## Customer Portal

Customers do not need to create accounts.

They can:

* View available internet packages
* Select a package
* Enter their phone number
* Select a payment method
* Complete payment
* Receive internet access after successful payment

## Admin Management

Administrators can manage:

* Companies
* Customers
* Internet packages
* Subscriptions
* Payments
* Network devices
* System users
* Company settings
* Customer internet access

## Company Management

The platform supports multiple companies.

Each company can have its own:

* Company name
* Logo
* Customers
* Packages
* Network devices
* Administrators
* Subscriptions
* Payments
* Configuration

This allows the platform to operate as a multi-tenant system.

## MikroTik Integration

The system is designed to communicate with MikroTik routers to automate network access.

Possible operations include:

* Customer activation
* Customer suspension
* Customer disconnection
* Router monitoring
* Network access management

## Payment Management

The backend supports payment processing workflows where a payment is created and verified before activating a subscription.

The system tracks payment states such as:

```text
PENDING
SUCCESSFUL
FAILED
```

## Authentication & Authorization

Administrative users authenticate through the backend API.

The system uses:

* JWT authentication
* Password hashing
* Role-based access control
* Protected API routes

---

# 👥 System Roles

The system supports different administrative roles.

| Role                  | Responsibility                                    |
| --------------------- | ------------------------------------------------- |
| Super Administrator   | Manages the overall platform and companies        |
| System Administrator  | Manages company operations and system settings    |
| Network Administrator | Manages network devices and connectivity          |
| Cashier               | Manages payments and customer transactions        |
| Customer              | Purchases internet packages and accesses services |

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │      Customer       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Customer Portal   │
                    │      Angular        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Backend API    │
                    │   Node.js/Express   │
                    └──────┬───────┬──────┘
                           │       │
              ┌────────────┘       └─────────────┐
              ▼                                  ▼
    ┌──────────────────┐                ┌─────────────────┐
    │   PostgreSQL     │                │    MikroTik     │
    │    Database      │                │     Router      │
    └──────────────────┘                └─────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   Admin Portal  │
                  │ Angular + Ionic │
                  └─────────────────┘
```

---

# 🛠️ Technology Stack

### Frontend

* Angular
* TypeScript
* HTML5
* CSS3

### Admin Application

* Angular
* Ionic
* TypeScript
* Capacitor

### Backend

* Node.js
* Express.js
* JavaScript

### Database

* PostgreSQL

### Networking

* MikroTik RouterOS
* MikroTik API

### Authentication

* JSON Web Tokens (JWT)
* Password hashing

### Version Control

* Git
* GitHub

---

# 📁 Project Structure

```text
network-monitoring-system/
│
├── customer-portal/
│   └── Angular customer application
│
├── admin-page/
│   └── Angular + Ionic administrator application
│
├── backend/
│   └── Node.js + Express backend API
│
├── README.md
└── .gitignore
```

---

# ⚙️ Installation

## 1. Clone the Repository

```bash
git clone https://github.com/Hamisi-Mtamba/Network-Monitoring-System.git
```

```bash
cd Network-Monitoring-System
```

---

# 🔧 Backend Setup

Navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create the environment file:

```bash
.env
```

Configure the required environment variables.

Example:

```env
PORT=3000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secure_jwt_secret
```

Start the development server:

```bash
npm run dev
```

The backend should run on:

```text
http://localhost:3000
```

---

# 🌐 Customer Portal Setup

Open a new terminal:

```bash
cd customer-portal
```

Install dependencies:

```bash
npm install
```

Start Angular development server:

```bash
ng serve
```

Open:

```text
http://localhost:4200
```

---

# 🖥️ Admin Application Setup

Open another terminal:

```bash
cd admin-page
```

Install dependencies:

```bash
npm install
```

Start the application:

```bash
ionic serve
```

The Ionic development server will provide the local URL.

---

# 🗄️ Database

The system uses **PostgreSQL** for persistent application data.

The database stores information such as:

* Companies
* Administrators
* Customers
* Internet packages
* Subscriptions
* Payments
* Network devices
* System configuration

For production deployments, use a secure PostgreSQL instance and keep database credentials inside environment variables.

---

# 🔐 Environment Variables

Never commit secrets to GitHub.

Sensitive configuration should be stored in `.env`.

Example:

```env
PORT=3000

DATABASE_URL=your_database_url

JWT_SECRET=your_jwt_secret

MIKROTIK_HOST=your_router_address
MIKROTIK_USERNAME=your_router_username
MIKROTIK_PASSWORD=your_router_password
```

Use strong credentials in production.

---

# 📡 Network Integration

The platform is designed to work with MikroTik-based internet distribution networks.

A typical deployment looks like:

```text
Internet/ISP
     │
     ▼
 MikroTik Router
     │
     ├──────── Wi-Fi Access Point
     │
     ├──────── Customer Devices
     │
     └──────── Network Infrastructure
     
     ▲
     │
Network Monitoring System
```

The backend communicates with the network infrastructure and applies customer subscription rules.

---

# 💳 Payment Flow

```text
Customer selects package
          ↓
Customer enters phone number
          ↓
Payment request created
          ↓
Payment processed
          ↓
Payment confirmed
          ↓
Subscription created
          ↓
Customer activated
          ↓
Internet access granted
```

If payment fails, the subscription is not activated.

---

# 🔒 Security

The system is designed with security as a core requirement.

Security considerations include:

* JWT-based authentication
* Password hashing
* Role-based authorization
* Protected API endpoints
* Environment-based secrets
* Input validation
* SQL injection protection
* XSS protection
* HTTPS for production
* Secure MikroTik credentials
* Database backups
* Activity logging

---

# 🚀 Production Deployment

For production, the system can be deployed using a VPS or cloud infrastructure.

A typical deployment:

```text
                    Internet
                       │
                       ▼
                  ┌─────────┐
                  │  HTTPS  │
                  └────┬────┘
                       │
              ┌────────▼────────┐
              │      VPS        │
              │                 │
              │  Backend API    │
              │  Web Servers    │
              └───────┬─────────┘
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
       PostgreSQL           MikroTik
        Database              Router
```

Recommended production components:

* VPS
* Nginx
* Node.js
* PostgreSQL
* HTTPS/SSL
* Process manager
* Firewall
* Automated backups

---

# 🧪 Development

Start the backend:

```bash
cd backend
npm run dev
```

Start the customer portal:

```bash
cd customer-portal
ng serve
```

Start the admin application:

```bash
cd admin-page
ionic serve
```

---

# 📱 Future Development

Planned improvements include:

* Android application
* iOS application
* Advanced network monitoring
* Real-time router statistics
* Customer notifications
* SMS integration
* More payment providers
* Automated subscription renewal
* Detailed financial reports
* Advanced analytics
* Improved MikroTik automation
* Mobile administrator application

---

# 🤝 Contributing

Contributions are welcome.

To contribute:

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Commit your changes.

```bash
git commit -m "Add your feature"
```

5. Push the branch.

```bash
git push origin feature/your-feature
```

6. Create a Pull Request.

---

# 📄 License

This project is currently under development.

License information will be added when the project is officially released.

---

# 👨‍💻 Project

**Network Monitoring System**

A centralized platform for managing internet distribution, customers, subscriptions, payments, and network infrastructure.

**Repository:** `Hamisi-Mtamba/Network-Monitoring-System`
