// Navbar Component - TripMate
import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "../css/navbar.css";

const Navbar = ({ user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  // Prevent navigation to protected pages if not logged in; redirect to /auth
  const handleNavClick = (e, path) => {
    setMobileMenuOpen(false);
    if (!user && path !== "/") {
      e.preventDefault();
      navigate("/auth");
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        {/* Brand Logo */}
        <Link
          to="/"
          className="navbar-brand"
          onClick={() => setMobileMenuOpen(false)}
        >
          <span className="brand-icon">✈️</span>
          Trip<span>Mate</span>
        </Link>

        {/* Navigation Links */}
        <ul className={`navbar-links ${mobileMenuOpen ? "open" : ""}`}>
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={(e) => handleNavClick(e, "/")}
            >
              Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={(e) => handleNavClick(e, "/about")}
            >
              About Us
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={(e) => handleNavClick(e, "/dashboard")}
            >
              Explore & Trips
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/budget"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={(e) => handleNavClick(e, "/budget")}
            >
              Budget & Expenses
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/planner"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={(e) => handleNavClick(e, "/planner")}
            >
              Day Planner
            </NavLink>
          </li>

          {/* Mobile Auth actions */}
          <li className="mobile-auth">
            {user ? (
              <>
                <span className="user-greeting">
                  <span className="user-avatar-circle">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </span>
                  {user.name}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleLogoutClick}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="btn btn-outline btn-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/auth?mode=register"
                  className="btn btn-primary btn-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </li>
        </ul>

        {/* Desktop Auth Controls */}
        <div className="navbar-auth">
          {user ? (
            <>
              <div className="user-greeting">
                <span className="user-avatar-circle">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </span>
                <span>{user.name}</span>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleLogoutClick}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="btn btn-outline btn-sm">
                Login
              </Link>
              <Link to="/auth?mode=register" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className="mobile-toggle"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
