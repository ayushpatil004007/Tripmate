// Explore Destinations & User Trips Dashboard Page
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/dashboard.css';

const ExploreDashboard = ({ user }) => {
  const navigate = useNavigate();

  // Tab & collection state
  const [activeTab, setActiveTab] = useState('trips'); // 'trips' or 'destinations'
  const [destinations, setDestinations] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State for Create & Edit Trip
  const [showModal, setShowModal] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [tripForm, setTripForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    totalBudget: '',
    dailyBudget: '',
    notes: '',
    status: 'Planned'
  });

  // Authorization headers with JWT token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('tripmate_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  // Load initial destinations and trips on mount
  useEffect(() => {
    fetchDestinations();
    fetchUserTrips();
  }, []);

  // Fetch destinations from backend REST API
  const fetchDestinations = async () => {
    try {
      const res = await fetch('/api/destinations');
      const data = await res.json();
      if (data.success) {
        setDestinations(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch destinations:', err);
    }
  };

  // Fetch user's saved trips from backend
  const fetchUserTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trips', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setTrips(data.data);
      }
    } catch (err) {
      setErrorMsg('Failed to load your trips. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Open modal to create a new trip (optionally prefill destination)
  const handleOpenCreateModal = (prefilledDestination = '') => {
    setEditingTripId(null);
    setTripForm({
      title: prefilledDestination ? `Trip to ${prefilledDestination}` : '',
      destination: prefilledDestination || '',
      startDate: '',
      endDate: '',
      totalBudget: '',
      dailyBudget: '',
      notes: '',
      status: 'Planned'
    });
    setErrorMsg('');
    setShowModal(true);
  };

  // Open modal to edit an existing trip
  const handleOpenEditModal = (trip) => {
    setEditingTripId(trip._id);
    setTripForm({
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate ? trip.startDate.split('T')[0] : '',
      endDate: trip.endDate ? trip.endDate.split('T')[0] : '',
      totalBudget: trip.totalBudget || '',
      dailyBudget: trip.dailyBudget || '',
      notes: trip.notes || '',
      status: trip.status || 'Planned'
    });
    setErrorMsg('');
    setShowModal(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTripForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit trip form (create or update)
  const handleTripSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!tripForm.title || !tripForm.destination || !tripForm.startDate || !tripForm.endDate) {
      setErrorMsg('Please fill in title, destination, start date, and end date');
      return;
    }

    try {
      const url = editingTripId ? `/api/trips/${editingTripId}` : '/api/trips';
      const method = editingTripId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(tripForm)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Operation failed');
      }

      setSuccessMsg(editingTripId ? 'Trip updated successfully!' : 'Trip created successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowModal(false);
      fetchUserTrips();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Delete trip and associated records
  const handleDeleteTrip = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will also remove its expenses and itinerary.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete trip');
      }

      setSuccessMsg('Trip deleted successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      setTrips((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="container dashboard-page">
      {/* Dashboard Top Header */}
      <div className="dashboard-header">
        <div>
          <h1>Trip Dashboard</h1>
          <p>Welcome back, <strong>{user?.name}</strong>! Explore destinations and organize your journeys.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenCreateModal('')}>
          + Create New Trip
        </button>
      </div>

      {/* Messages */}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab-btn ${activeTab === 'trips' ? 'active' : ''}`}
          onClick={() => setActiveTab('trips')}
        >
          My Saved Trips ({trips.length})
        </button>
        <button
          className={`dashboard-tab-btn ${activeTab === 'destinations' ? 'active' : ''}`}
          onClick={() => setActiveTab('destinations')}
        >
          Explore Destinations ({destinations.length})
        </button>
      </div>

      {/* TAB 1: SAVED TRIPS */}
      {activeTab === 'trips' && (
        <div>
          {loading ? (
            <div className="spinner" />
          ) : trips.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🗺️</span>
              <h3>No Trips Planned Yet</h3>
              <p>Start by creating your first trip or pick a destination from our explore feed.</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
                onClick={() => handleOpenCreateModal('')}
              >
                Plan Your First Trip
              </button>
            </div>
          ) : (
            <div className="trips-grid">
              {trips.map((trip) => (
                <div key={trip._id} className="trip-card">
                  <div className="trip-card-header">
                    <div>
                      <span className="destination-country">{trip.destination}</span>
                      <h3 className="trip-destination-title">{trip.title}</h3>
                    </div>
                    <span className={`badge ${trip.status === 'Completed' ? 'badge-success' : trip.status === 'Ongoing' ? 'badge-warning' : 'badge-primary'}`}>
                      {trip.status}
                    </span>
                  </div>

                  <div className="trip-dates">
                    <span>📅</span>
                    <span>
                      {new Date(trip.startDate).toLocaleDateString()} — {new Date(trip.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="trip-stats">
                    <div className="trip-stat-item">
                      <span className="trip-stat-label">Total Budget</span>
                      <span className="trip-stat-value">₹{trip.totalBudget?.toLocaleString('en-IN') || 0}</span>
                    </div>
                    <div className="trip-stat-item">
                      <span className="trip-stat-label">Daily Target</span>
                      <span className="trip-stat-value">₹{trip.dailyBudget?.toLocaleString('en-IN') || 0}</span>
                    </div>
                  </div>

                  {trip.notes && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '1.25rem', fontStyle: 'italic' }}>
                      "{trip.notes}"
                    </p>
                  )}

                  <div className="trip-actions">
                    <div className="trip-nav-actions">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/budget?tripId=${trip._id}`)}
                        title="Manage Budget and Expenses"
                      >
                        💳 Budget
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/planner?tripId=${trip._id}`)}
                        title="Manage Day-wise Itinerary"
                      >
                        📅 Planner
                      </button>
                    </div>
                    <div className="trip-manage-actions">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenEditModal(trip)}
                        title="Edit Trip Details"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm trip-delete-btn"
                        onClick={() => handleDeleteTrip(trip._id, trip.title)}
                        title="Delete Trip"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXPLORE DESTINATIONS */}
      {activeTab === 'destinations' && (
        <div className="destinations-grid">
          {destinations.map((dest) => (
            <div key={dest._id} className="destination-card">
              <div className="destination-img-wrapper">
                <img src={dest.imageUrl} alt={dest.name} className="destination-img" />
                <span className="badge destination-badge">{dest.category}</span>
              </div>
              <div className="destination-body">
                <span className="destination-country">{dest.country}</span>
                <h3>{dest.name}</h3>
                <p className="destination-desc">{dest.description}</p>
                <div className="destination-footer">
                  <span className="destination-cost">
                    Avg: <strong>₹{dest.averageCostPerDay?.toLocaleString('en-IN')}/day</strong>
                  </span>
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={() => {
                      handleOpenCreateModal(dest.name);
                    }}
                  >
                    Plan Trip →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CREATE OR EDIT TRIP */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTripId ? 'Edit Trip Details' : 'Create a New Trip'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleTripSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="title">Trip Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  className="form-input"
                  placeholder="e.g. Summer Vacation 2026"
                  value={tripForm.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="destination">Destination</label>
                <input
                  type="text"
                  id="destination"
                  name="destination"
                  className="form-input"
                  placeholder="e.g. Santorini, Kyoto, Bali..."
                  value={tripForm.destination}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="startDate">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    className="form-input"
                    value={tripForm.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="endDate">End Date</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    className="form-input"
                    value={tripForm.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="totalBudget">Total Budget (₹)</label>
                  <input
                    type="number"
                    id="totalBudget"
                    name="totalBudget"
                    className="form-input"
                    placeholder="e.g. 50000"
                    value={tripForm.totalBudget}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="dailyBudget">Daily Budget (₹)</label>
                  <input
                    type="number"
                    id="dailyBudget"
                    name="dailyBudget"
                    className="form-input"
                    placeholder="e.g. 5000"
                    value={tripForm.dailyBudget}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
              </div>

              {editingTripId && (
                <div className="form-group">
                  <label className="form-label" htmlFor="status">Trip Status</label>
                  <select
                    id="status"
                    name="status"
                    className="form-select"
                    value={tripForm.status}
                    onChange={handleInputChange}
                  >
                    <option value="Planned">Planned</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="notes">Notes & Checklist</label>
                <textarea
                  id="notes"
                  name="notes"
                  className="form-textarea"
                  placeholder="Passport reminder, packing list, preferred airline..."
                  value={tripForm.notes}
                  onChange={handleInputChange}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTripId ? 'Save Changes' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExploreDashboard;
