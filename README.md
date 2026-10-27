# ✈️ TripMate - Travel Planning & Expense Management Web App

A modern travel planning Single Page Application (SPA) built on the MERN stack with JWT authentication and real-time expense analytics.

**Currency:** Indian Rupees (₹)

---

## 📌 Project Overview

**TripMate** is an all-in-one companion for modern travelers. It allows users to create accounts, explore hand-curated destinations with real-time cost estimates, manage custom trips, track daily and total budgets, visualize spending through interactive SVG breakdown charts, and organize detailed day-by-day itineraries.

### 🌟 Key Features
1. **Explore Destinations**: Browse popular destinations with descriptions, average daily costs, and category tags.
2. **Trip Management**: Full lifecycle management (create, view, update, delete) for custom trips with start/end dates, destinations, and status.
3. **Budget & Expense Tracker**: Set trip budgets, log categorized expenses (Food, Travel, Hotels, Other), monitor remaining balances, and analyze spending breakdowns via lightweight SVG charts.
4. **Day-wise Itinerary Planner**: Structure schedules day by day, organize sightseeing stops, set scheduled timings, and track visit orders.
5. **Secure Authentication**: User registration and login powered by bcrypt password hashing and JSON Web Tokens (JWT) stored in browser storage.

---

## 💻 Tech Stack

### Frontend
- **React.js 18** (Functional components, hooks, SPA architecture)
- **React Router 6** (Client-side routing, protected navigation guards)
- **Vite** (Next-generation frontend tooling and bundler)
- **Modular Vanilla CSS & SVG** (Custom responsive design system, zero external UI libraries)

### Backend
- **Node.js & Express.js** (RESTful API architecture, modular routers)
- **MongoDB & Mongoose** (NoSQL schema models, cascading deletions, auto-seeding)
- **JWT (JSON Web Token)** (Stateless authentication & route authorization)
- **bcryptjs** (Salted password hashing)
- **CORS & dotenv** (Cross-origin configuration and environment management)

---

## 📁 Project Structure

```text
Tripmate/
├── client/                     # Frontend React Application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, Footer, ProtectedRoute, ExpenseChart)
│   │   ├── css/                # Component and global style sheets
│   │   ├── pages/              # Main view pages (Home, Auth, ExploreDashboard, BudgetTracker, DayPlanner)
│   │   ├── App.jsx             # Main routing and auth state
│   │   └── main.jsx            # Application entry point
│   ├── package.json
│   └── vite.config.js          # Vite config & API reverse proxy
│
├── server/                     # Backend Express REST API
│   ├── data/                   # Initial seed data for destinations
│   ├── middleware/             # JWT authentication middleware
│   ├── models/                 # Mongoose schemas (User, Destination, Trip, Expense, ItineraryItem)
│   ├── routes/                 # Express endpoint routes
│   ├── server.js               # Express application entry point
│   ├── test_e2e.js             # Automated API test suite
│   ├── .env                    # Environment configuration
│   └── package.json
└── README.md
```

---

## ⚙️ Installation & Setup Guide

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **MongoDB** running locally on default port `27017`

To verify MongoDB service status on Windows:
```powershell
Get-Service -Name *mongo*
# If stopped, start it:
net start MongoDB
```

### 2. Configure Environment (`server/.env`)
Ensure `server/.env` contains your desired configuration:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/tripmate
JWT_SECRET=tripmate_secret_key
```

### 3. Start Backend Server
```bash
cd server
npm install
npm run dev
```
The server will start at `http://localhost:5000` and automatically seed initial destinations if the database is fresh.

### 4. Start Frontend Client
In a separate terminal:
```bash
cd client
npm install
npm run dev
```
Access the application at **`http://localhost:3000`**.

---

## 🔍 Database Schema Overview

When connected to `mongodb://localhost:27017/tripmate`, the following collections manage the application state:
- **`users`**: Registered user profiles with hashed credentials.
- **`destinations`**: Curated travel destinations with photos and average daily costs.
- **`trips`**: User trips with dates, budget targets, and status (`Planned`, `Ongoing`, `Completed`).
- **`expenses`**: Categorized transactions linked to specific trips.
- **`itineraryitems`**: Day-wise activities with scheduled times and order of visit.

---

## 🧪 Automated End-to-End Validation

An automated verification script is included to test all endpoints:
```bash
cd server
node test_e2e.js
```
This validates:
- System Health (`GET /api/health`)
- Destination catalog (`GET /api/destinations`)
- User registration and JWT issuance (`POST /api/auth/register`)
- Token authentication (`GET /api/auth/me`)
- Trip creation, retrieval, and updates (`/api/trips`)
- Expense tracking and aggregate summaries (`/api/expenses`)
- Day-wise itinerary planning (`/api/itinerary`)
