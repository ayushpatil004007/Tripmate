import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Global Stylesheet
import "./css/global.css";

// Layout & Security Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

// Page Views
import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";
import Auth from "./pages/Auth";
import ExploreDashboard from "./pages/ExploreDashboard";
import BudgetTracker from "./pages/BudgetTracker";
import DayPlanner from "./pages/DayPlanner";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify authentication token on initial load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("tripmate_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
        } else {
          localStorage.removeItem("tripmate_token");
          setUser(null);
        }
      } catch (err) {
        console.error("Auth verification error:", err);
        localStorage.removeItem("tripmate_token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Update authenticated user state
  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  // Sign out user and remove token
  const handleLogout = () => {
    localStorage.removeItem("tripmate_token");
    setUser(null);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Router>
      <Navbar user={user} onLogout={handleLogout} />
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home user={user} />} />
          <Route path="/about" element={<AboutUs />} />
          <Route
            path="/auth"
            element={<Auth user={user} onLoginSuccess={handleLoginSuccess} />}
          />
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <ExploreDashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budget"
            element={
              <ProtectedRoute user={user}>
                <BudgetTracker user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner"
            element={
              <ProtectedRoute user={user}>
                <DayPlanner user={user} />
              </ProtectedRoute>
            }
          />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
