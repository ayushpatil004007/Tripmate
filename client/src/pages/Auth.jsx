// Authentication Page (Sign In & Sign Up)
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import '../css/auth.css';

const Auth = ({ user, onLoginSuccess }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // State for toggling between 'login' and 'register'
  const [isLogin, setIsLogin] = useState(true);

  // Controlled form input values
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Read URL query parameter "?mode=register" if navigated from Sign Up button
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'register') {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
  }, [location.search]);

  // If already authenticated, redirect to Dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Handle form field change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit credentials to authentication API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Input validation
    if (!formData.email || !formData.password) {
      setErrorMsg('Please enter email and password');
      return;
    }

    if (!isLogin && !formData.name) {
      setErrorMsg('Please enter your full name');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const data = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (!data || !data.token || !data.user) {
        throw new Error('Invalid response received from authentication server.');
      }

      // Persist auth token in storage and update application state
      localStorage.setItem('tripmate_token', data.token);
      onLoginSuccess(data.user);

      // Navigate to main dashboard
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {/* Left Side: Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-header">
            <h2>{isLogin ? 'Welcome Back!' : 'Start Your Adventure'}</h2>
            <p>{isLogin ? 'Enter your credentials to access your trips' : 'Create an account to begin planning your dream journey'}</p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="auth-toggle-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(true);
                setErrorMsg('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(false);
                setErrorMsg('');
              }}
            >
              Create Account
            </button>
          </div>

          {/* Error notification */}
          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-input"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In to TripMate' : 'Create Free Account'}
            </button>
          </form>

          {/* Switch link */}
          <div className="auth-switch-text">
            {isLogin ? (
              <>
                Don't have an account yet?
                <button type="button" onClick={() => setIsLogin(false)}>
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already registered?
                <button type="button" onClick={() => setIsLogin(true)}>
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Showcase Panel */}
        <div className="auth-image-panel">
          <div className="auth-image-overlay-content">
            <span className="auth-image-tag">Wanderlust Awaits</span>
            <h3>Explore over 10+ dream destinations around the globe.</h3>
            <p>
              Join thousands of travelers planning itineraries, tracking expenses, and making memories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
