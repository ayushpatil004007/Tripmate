// Navbar Component - Renovated 3-Zone Responsive Layout
import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useCountry } from "../context/CountryContext";
import CurrencyConverter from "./CurrencyConverter";
import "../css/navbar.css";

const Navbar = ({ user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const toolsDropdownRef = useRef(null);

  const {
    homeCountry,
    preferredCurrency,
    countriesList,
    setHomeCountry
  } = useCountry();

  // Find active country details for compact badge
  const activeCountry =
    countriesList.find((c) => c.name === homeCountry) || countriesList[0];

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
  }, [location.pathname]);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        toolsDropdownRef.current &&
        !toolsDropdownRef.current.contains(e.target)
      ) {
        setToolsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setToolsDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogoutClick = () => {
    onLogout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  // Prevent navigation to protected pages if not logged in; redirect to /auth
  const handleNavClick = (e, path) => {
    setMobileMenuOpen(false);
    if (!user && path !== "/" && path !== "/about") {
      e.preventDefault();
      navigate("/auth");
    }
  };

  const handleCountryChange = (e) => {
    setHomeCountry(e.target.value);
  };

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main Navigation">
        <div className="navbar-container">
          {/* ========================================================= */}
          {/* ZONE 1: Left - Brand Logo                                 */}
          {/* ========================================================= */}
          <div className="navbar-left">
            <Link
              to="/"
              className="navbar-brand"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="TripMate Home"
            >
              <span className="brand-icon" aria-hidden="true">✈️</span>
              <span className="brand-text">
                Trip<span className="brand-accent">Mate</span>
              </span>
            </Link>
          </div>

          {/* ========================================================= */}
          {/* ZONE 2: Center - Main Nav Links (Desktop & Tablet)        */}
          {/* ========================================================= */}
          <div className="navbar-center">
            <ul className="navbar-nav">
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
            </ul>
          </div>

          {/* ========================================================= */}
          {/* ZONE 3: Right - Tools & Auth Actions                      */}
          {/* ========================================================= */}
          <div className="navbar-right">
            {/* Desktop Inline Tools (>=1200px) */}
            <div className="nav-tools-inline">
              {/* Home-Country Selector */}
              <div className="nav-country-wrapper" title="Select your home country">
                <span className="nav-country-label">HOME:</span>
                <select
                  className="nav-country-select"
                  value={homeCountry}
                  onChange={handleCountryChange}
                  aria-label="Home country selector"
                >
                  {countriesList.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.flag} {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Currency Converter Button */}
              <button
                type="button"
                className="btn btn-outline btn-sm nav-converter-btn"
                onClick={() => setShowConverterModal(true)}
                title="Open Currency Converter"
              >
                <span className="btn-icon" aria-hidden="true">💱</span>
                <span>Converter</span>
              </button>
            </div>

            {/* Tablet Compact Dropdown Tools (768px - 1199px) */}
            <div className="nav-tools-dropdown-container" ref={toolsDropdownRef}>
              <button
                type="button"
                className={`btn btn-outline btn-sm nav-tools-toggle-btn ${
                  toolsDropdownOpen ? "active" : ""
                }`}
                onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                aria-label="Country and Currency preferences"
                aria-expanded={toolsDropdownOpen}
              >
                <span aria-hidden="true">{activeCountry?.flag || "🌐"}</span>
                <span className="nav-tools-badge-text">
                  {activeCountry?.currency || "INR"}
                </span>
                <span className="dropdown-arrow" aria-hidden="true">▾</span>
              </button>

              {toolsDropdownOpen && (
                <div className="nav-tools-dropdown-menu">
                  <div className="tools-menu-header">
                    <span className="tools-menu-title">Home & Currency</span>
                    <span className="tools-menu-subtitle">
                      Sets domestic trips & base rates
                    </span>
                  </div>

                  <div className="tools-menu-item">
                    <label htmlFor="nav-tools-country-select" className="tools-item-label">
                      Home Country:
                    </label>
                    <select
                      id="nav-tools-country-select"
                      className="form-select tools-select"
                      value={homeCountry}
                      onChange={handleCountryChange}
                    >
                      {countriesList.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.flag} {c.name} ({c.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tools-menu-divider" />

                  <button
                    type="button"
                    className="btn btn-outline btn-sm tools-converter-trigger"
                    onClick={() => {
                      setShowConverterModal(true);
                      setToolsDropdownOpen(false);
                    }}
                  >
                    <span>💱</span> Quick Converter
                  </button>
                </div>
              )}
            </div>

            {/* Auth Actions (Login / Sign Up or User Greeting / Logout) */}
            <div className="nav-auth-group">
              {user ? (
                <>
                  <div className="user-greeting" title={`Signed in as ${user.name}`}>
                    <span className="user-avatar-circle" aria-hidden="true">
                      {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </span>
                    <span className="user-name-text">{user.name}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm nav-auth-btn"
                    onClick={handleLogoutClick}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth"
                    className="btn btn-outline btn-sm nav-auth-btn nav-login-btn"
                  >
                    Login
                  </Link>
                  <Link
                    to="/auth?mode=register"
                    className="btn btn-primary btn-sm nav-auth-btn nav-signup-btn"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Hamburger Button (<768px) */}
            <button
              type="button"
              className={`mobile-toggle ${mobileMenuOpen ? "open" : ""}`}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="hamburger-box">
                <span className="hamburger-inner" />
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MOBILE SLIDE-DOWN DRAWER (<768px)                         */}
        {/* ========================================================= */}
        <div className={`mobile-nav-drawer ${mobileMenuOpen ? "open" : ""}`}>
          <div className="mobile-nav-inner">
            {/* Nav Links List */}
            <ul className="mobile-nav-links">
              <li>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                  onClick={(e) => handleNavClick(e, "/")}
                >
                  <span className="mobile-link-icon">🏠</span> Home
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                  onClick={(e) => handleNavClick(e, "/about")}
                >
                  <span className="mobile-link-icon">ℹ️</span> About Us
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                  onClick={(e) => handleNavClick(e, "/dashboard")}
                >
                  <span className="mobile-link-icon">🗺️</span> Explore & Trips
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/budget"
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                  onClick={(e) => handleNavClick(e, "/budget")}
                >
                  <span className="mobile-link-icon">💰</span> Budget & Expenses
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/planner"
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                  onClick={(e) => handleNavClick(e, "/planner")}
                >
                  <span className="mobile-link-icon">📅</span> Day Planner
                </NavLink>
              </li>
            </ul>

            {/* Mobile Country Selector & Converter */}
            <div className="mobile-nav-section">
              <div className="mobile-section-label">Home Country & Currency</div>
              <select
                className="form-select mobile-country-select"
                value={homeCountry}
                onChange={handleCountryChange}
                aria-label="Select home country"
              >
                {countriesList.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {c.name} ({c.currency})
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btn btn-outline btn-sm mobile-converter-btn"
                onClick={() => {
                  setShowConverterModal(true);
                  setMobileMenuOpen(false);
                }}
              >
                <span>💱</span> Quick Currency Converter
              </button>
            </div>

            {/* Mobile Auth Actions */}
            <div className="mobile-nav-auth">
              {user ? (
                <>
                  <div className="mobile-user-card">
                    <span className="user-avatar-circle">
                      {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </span>
                    <div className="mobile-user-details">
                      <span className="mobile-user-name">{user.name}</span>
                      <span className="mobile-user-email">{user.email || ""}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm mobile-auth-full"
                    onClick={handleLogoutClick}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="mobile-auth-buttons">
                  <Link
                    to="/auth"
                    className="btn btn-outline btn-sm mobile-auth-btn"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/auth?mode=register"
                    className="btn btn-primary btn-sm mobile-auth-btn"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Backdrop overlay */}
        {mobileMenuOpen && (
          <div
            className="mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </nav>

      {/* Currency Converter Modal */}
      {showConverterModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowConverterModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "580px", padding: 0, overflow: "hidden" }}
          >
            <CurrencyConverter onClose={() => setShowConverterModal(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
