// Navbar Component with Required Home-Country Selector & Quick Currency Converter
import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCountry } from "../context/CountryContext";
import CurrencyConverter from "./CurrencyConverter";
import "../css/navbar.css";

const Navbar = ({ user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  const navigate = useNavigate();

  const {
    homeCountry,
    preferredCurrency,
    countriesList,
    setHomeCountry
  } = useCountry();

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

  const handleCountryChange = (e) => {
    setHomeCountry(e.target.value);
  };

  return (
    <>
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

            {/* Mobile Country Selector & Converter Button */}
            <li className="mobile-country-item" style={{ padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--slate)', fontWeight: 600 }}>
                  Home Country & Currency:
                </label>
                <select
                  className="form-select nav-country-select"
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
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setShowConverterModal(true);
                    setMobileMenuOpen(false);
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <span>💱</span> Converter
                </button>
              </div>
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

          {/* Desktop Controls: Country Picker, Currency Converter Button & Auth */}
          <div className="navbar-auth">
            {/* Required Home-Country Selector */}
            <div className="nav-country-wrapper" title="Select your home country">
              <span className="nav-country-label">Home:</span>
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
              title="Open Travel Currency Converter"
            >
              <span>💱</span> Converter
            </button>

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

      {/* Currency Converter Modal */}
      {showConverterModal && (
        <div className="modal-overlay" onClick={() => setShowConverterModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', padding: 0, overflow: 'hidden' }}
          >
            <CurrencyConverter onClose={() => setShowConverterModal(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
