// Home Page - TripMate Travel Planning Web Application
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCountry } from '../context/CountryContext';
import '../css/home.css';

const Home = ({ user }) => {
  const navigate = useNavigate();
  const { homeCountry, preferredCurrency } = useCountry();

  // Navigation interceptor: If not logged in, always redirect to Login/Register (/auth)
  const handleProtectedNav = (targetPath) => {
    if (user) {
      navigate(targetPath);
    } else {
      navigate('/auth');
    }
  };

  return (
    <div>
      {/* Semantic Hero Section with Background and CTA */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span>✨</span> Plan • Budget • Explore
          </div>
          <h1 className="hero-title">
            Start your exciting journey to explore the world
          </h1>
          <p className="hero-subtitle">
            TripMate is your all-in-one travel companion. Discover domestic and international destinations, organize your custom trip timeline, manage multi-currency travel budgets, and track expenses effortlessly.
          </p>
          <div className="hero-actions">
            {/* If unauthenticated, sends to /auth; if authenticated, sends to /dashboard */}
            <button
              className="btn btn-accent"
              onClick={() => handleProtectedNav('/dashboard')}
              style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }}
            >
              Start Planning Now →
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleProtectedNav('/dashboard')}
              style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.4)', padding: '0.85rem 1.8rem' }}
            >
              Explore Destinations
            </button>
          </div>
        </div>
      </section>

      {/* Grid Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Everything You Need</span>
            <h2 className="section-title">Designed for Effortless Travel Planning</h2>
            <p>
              From initial wanderlust to daily itineraries and real-time expense management, TripMate keeps your journey organized.
            </p>
          </div>

          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper">🌍</div>
              <h3>Explore & Trip Dashboard</h3>
              <p>
                Browse hand-curated global destinations with responsive photo galleries, cost estimates, and domestic/international filters relative to your home country ({homeCountry}).
              </p>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => handleProtectedNav('/dashboard')}
                style={{ width: 'fit-content' }}
              >
                View Dashboard →
              </button>
            </div>

            {/* Feature 2 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper">💳</div>
              <h3>Multi-Currency Expense Tracker</h3>
              <p>
                Set trip budgets in any currency ({preferredCurrency}, USD, EUR, etc.). Log categorized expenditures, convert currencies on the fly, and view visual breakdown charts.
              </p>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => handleProtectedNav('/budget')}
                style={{ width: 'fit-content' }}
              >
                Track Budget →
              </button>
            </div>

            {/* Feature 3 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper">📅</div>
              <h3>Day-Wise Itinerary Planner</h3>
              <p>
                Structure your journey day by day (Day 1, Day 2...). Schedule sight visits, timings, activities, and custom travel notes.
              </p>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => handleProtectedNav('/planner')}
                style={{ width: 'fit-content' }}
              >
                Build Itinerary →
              </button>
            </div>
          </div>

          {/* Call to Action Banner */}
          <div className="cta-banner" style={{ marginTop: '4rem', padding: '2.5rem', borderRadius: '16px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Ready to Plan Your Next Great Adventure?</h3>
            <p style={{ maxWidth: '650px', margin: '0 auto 1.5rem', fontSize: '1rem', color: '#cbd5e1' }}>
              Create custom itineraries, manage multi-currency travel budgets, and explore world-class destinations effortlessly.
            </p>
            <button
              className="btn btn-accent"
              onClick={() => handleProtectedNav('/dashboard')}
              style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}
            >
              Get Started for Free →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
