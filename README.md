# ✈️ TripMate - Travel Planning & Multi-Currency Expense Management Web App

A modern travel planning Single Page Application (SPA) built on the MERN stack with JWT authentication, destination discovery, responsive image galleries, static currency conversion, and real-time multi-currency expense analytics.

---

## 📌 Project Overview

**TripMate** is an all-in-one companion for modern travelers. It allows users to:
1. **Explore Curated Destinations**: Browse global destinations with responsive photo galleries, highlights, best visiting times, and daily cost estimates.
2. **Home-Country & Domestic/International Classification**: Automatically classify destinations as **Domestic 🏠** or **International ✈️** relative to the user's selected home country.
3. **Static Travel Currency Converter**: Convert seamlessly between currencies (USD, INR, EUR, GBP, AED, IDR, JPY, etc.) using centralized illustrative travel exchange rates with zero external API dependencies.
4. **Multi-Currency Budget & Expense Integration**: Record expenses in any local currency, preserve original amounts in MongoDB, and display converted totals and SVG breakdown charts in your chosen display currency without double conversion or rounding discrepancies.
5. **Destination Budget Comparison**: Compare your trip's planned daily budget directly against destination average benchmarks in your active display currency.
6. **Day-wise Itinerary Planner**: Structure schedules day by day, organize sightseeing stops, set scheduled timings, and track visit orders.
7. **Destination Management & JSON Import/Export**: Manage destinations with protected admin CRUD endpoints and import/export the entire catalog as structured JSON without losing custom records or IDs.

---

## 💻 Tech Stack

### Frontend
- **React.js 18** (Functional components, hooks, Context API)
- **React Router 6** (Client-side routing, protected navigation guards)
- **Vite** (Next-generation frontend tooling and bundler)
- **Modular Vanilla CSS & SVG** (Custom responsive design system, zero external UI libraries)

### Backend
- **Node.js & Express.js** (RESTful API architecture, modular routers)
- **MongoDB & Mongoose** (Comprehensive destination schemas, cascading deletions, idempotent migrations)
- **JWT (JSON Web Token)** (Stateless authentication & route authorization)
- **bcryptjs** (Salted password hashing)
- **CORS & dotenv** (Cross-origin configuration and environment management)

---

## 📁 Project Structure

```text
Tripmate/
├── client/                               # Frontend React + Vite Application
│   ├── public/
│   │   └── destinations/                 # Organized destination asset folders (<slug>/cover.svg, gallery-*.svg, info.json)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CurrencyConverter.jsx     # Dedicated static currency conversion component
│   │   │   ├── DestinationAdminModal.jsx # Admin CRUD & JSON import/export modal
│   │   │   ├── DestinationDetailModal.jsx# Full destination detail view with metrics & highlights
│   │   │   ├── DestinationGallery.jsx    # Responsive gallery with thumbnails, lightbox & fallbacks
│   │   │   ├── ExpenseChart.jsx          # Pure SVG multi-currency donut breakdown chart
│   │   │   ├── Footer.jsx
│   │   │   ├── Navbar.jsx                # Responsive navbar with home-country dropdown & converter trigger
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── CountryContext.jsx        # Home country, preferred currency & display currency state
│   │   ├── css/                          # Component and global style sheets
│   │   ├── data/
│   │   │   ├── destinations.json         # Master destination catalog
│   │   │   └── exchangeRates.json        # Centralized static exchange rates
│   │   ├── pages/                        # Main view pages (Home, Auth, ExploreDashboard, BudgetTracker, DayPlanner)
│   │   ├── utils/
│   │   │   ├── api.js                    # Centralized API fetch wrapper with URL normalization
│   │   │   └── currency.js               # Conversion formula, formatting & country mappings
│   │   ├── App.jsx                       # Root routing with CountryProvider wrapper
│   │   └── main.jsx
│   ├── package.json
│   ├── vercel.json                       # Client-level SPA rewrites
│   └── vite.config.js                    # Vite reverse proxy config
│
├── server/                               # Backend Express REST API
│   ├── data/
│   │   ├── destinations.json             # Source of truth destination master file
│   │   └── exchangeRates.json            # Static exchange rates (USD base)
│   ├── middleware/
│   │   ├── adminMiddleware.js            # Protected admin authorization middleware
│   │   └── authMiddleware.js             # JWT verification middleware
│   ├── models/
│   │   ├── Destination.js                # Full destination schema with virtuals and slug generator
│   │   ├── Expense.js                    # Expense model with currency preservation
│   │   ├── ItineraryItem.js              # Day-wise itinerary activities
│   │   ├── Trip.js                       # Trip model with currency & destinationId references
│   │   └── User.js                       # User model with homeCountry, preferredCurrency, role
│   ├── routes/
│   │   ├── authRoutes.js                 # Registration, login, profile & preference endpoints
│   │   ├── destinationRoutes.js          # Search, filter, CRUD, and JSON import/export routes
│   │   ├── expenseRoutes.js              # Multi-currency expense CRUD & summary calculations
│   │   ├── itineraryRoutes.js            # Itinerary activity management
│   │   └── tripRoutes.js                 # Trip lifecycle endpoints
│   ├── scripts/
│   │   ├── createDestinationFolders.js   # Local destination asset generator
│   │   └── migrateDestinations.js        # Safe, idempotent MongoDB destination migration
│   ├── server.js                         # Express entry point (MongoDB source of truth)
│   ├── test_feature_suite.js             # Comprehensive feature verification suite (20 tests)
│   ├── test_routes_unit.js               # Route filtering & multi-currency unit tests (7 tests)
│   ├── .env                              # Environment configuration
│   └── package.json
├── package.json                          # Root monorepo scripts
├── vercel.json                           # Root deployment config for Vercel
└── README.md
```

---

## 💱 Currency Conversion Architecture

Exchange rates are stored centrally in `client/src/data/exchangeRates.json` and `server/data/exchangeRates.json`.

- **Base Currency:** `USD` (Rate = 1.0)
- **Conversion Formula:**
  $$\text{convertedAmount} = \frac{\text{amount} \times \text{targetRate}}{\text{sourceRate}}$$
- **Supported Initial Currencies:**
  - `USD`: US Dollar ($)
  - `INR`: Indian Rupee (₹) [Rate: 83]
  - `EUR`: Euro (€) [Rate: 0.92]
  - `GBP`: British Pound (£) [Rate: 0.79]
  - `AED`: UAE Dirham (AED) [Rate: 3.67]
  - `IDR`: Indonesian Rupiah (Rp) [Rate: 16,000]
  - `JPY`: Japanese Yen (¥) [Rate: 155]
  - `AUD`, `CAD`, `SGD`, `CHF`, `ZAR`
- **Notice:** These are illustrative static rates for travel budget planning, not live market rates. External rate APIs are never called.

### Multi-Currency Expense Calculation Rules:
1. Every expense stores its **original amount** and **original currency** in MongoDB.
2. In `BudgetTracker.jsx`, all expenses are converted to the **active display currency** before calculating totals or category breakdowns.
3. Expenses recorded in different currencies are never added together raw.
4. Changing the user's home country or preferred display currency updates views dynamically without modifying stored database records.

---

## 🏛️ Destination Data Architecture

The Destination schema contains:
- `name` (String, required)
- `slug` (String, unique, lowercase, auto-generated from name)
- `country` (String, required)
- `state` (String)
- `categories` (Array of Strings, e.g. `["Culture & Heritage", "Historical"]`)
- `description` (String, required)
- `coverImage` (String, URL/path)
- `gallery` (Array of objects: `[{ url, caption }]`)
- `bestVisitingTime` (String, e.g. `"October to March"`)
- `estimatedBudget` (Number, daily benchmark cost)
- `currency` (String, e.g. `"INR"`, `"USD"`)
- `duration` (String, e.g. `"4-6 Days"`)
- `highlights` (Array of Strings)
- `coordinates` (`{ lat: Number, lng: Number }`)
- `featured` (Boolean)

**Backward Compatibility:** Virtual getters and setters for `imageUrl`, `category`, and `averageCostPerDay` ensure legacy code continues to work without changes.

---

## ⚙️ Installation & Setup Guide

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **MongoDB** running locally on default port `27017` (or MongoDB Atlas URI)

### 2. Configure Environment (`server/.env`)
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/tripmate
JWT_SECRET=tripmate_local_secret_dev_key
ADMIN_SECRET=tripmate_admin_secret
```

### 3. Migrate / Bootstrap Destinations
To populate or safely upgrade existing destinations without losing records:
```bash
npm run migrate:destinations
# Or from server:
cd server && npm run migrate:destinations
```

### 4. Run Test Suites
```bash
npm test
```
Runs 27 automated tests validating currency math, edge cases, schema virtuals, domestic/international classification, and multi-currency calculations.

### 5. Start Development Servers
From root:
```bash
# Terminal 1: Backend API
npm run server

# Terminal 2: Frontend Client
npm run client
```
Access the application at `http://localhost:3000`.

---

## 🚀 Deployment Instructions

### Vercel (Frontend Deployment)
1. Import repository on Vercel.
2. Root Directory: leave as `./` (or `client`).
3. Build Command: `npm --prefix client run build` (configured in `vercel.json`).
4. Output Directory: `client/dist`.
5. Environment Variable:
   - `VITE_API_URL`: Your deployed Render backend URL (e.g. `https://tripmate-api-sjni.onrender.com`).

### Render (Backend Deployment)
1. Create a Web Service connected to your repository.
2. Root Directory: `server`.
3. Build Command: `npm install`.
4. Start Command: `node server.js`.
5. Health Check Path: `/health` or `/api/health`.
6. Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGO_URI`: Your MongoDB Atlas connection string (`mongodb+srv://...`).
   - `JWT_SECRET`: A secure random secret key.
   - `ADMIN_SECRET`: Secret key for administrative imports/exports.
