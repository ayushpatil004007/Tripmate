// Explore Destinations & User Trips Dashboard Page
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useCountry } from '../context/CountryContext';
import { formatDualCurrency, formatCurrency } from '../utils/currency';
import DestinationDetailModal from '../components/DestinationDetailModal';
import DestinationAdminModal from '../components/DestinationAdminModal';
import '../css/dashboard.css';

const ExploreDashboard = ({ user }) => {
  const navigate = useNavigate();
  const { homeCountry, displayCurrency, preferredCurrency, isDomestic } = useCountry();

  // Tab & collection state
  const [activeTab, setActiveTab] = useState('trips'); // 'trips' or 'destinations'
  const [destinations, setDestinations] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Destination Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [classificationFilter, setClassificationFilter] = useState('all'); // 'all', 'domestic', 'international'
  const [featuredOnly, setFeaturedOnly] = useState(false);

  // Modals State
  const [selectedDestinationForDetails, setSelectedDestinationForDetails] = useState(null);
  const [destinationToEdit, setDestinationToEdit] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Modal State for Create & Edit Trip
  const [showTripModal, setShowTripModal] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [tripForm, setTripForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    totalBudget: '',
    dailyBudget: '',
    currency: preferredCurrency || 'INR',
    notes: '',
    status: 'Planned'
  });

  const isAdmin = user?.role === 'admin';

  // Load initial destinations and trips on mount
  useEffect(() => {
    fetchDestinations();
    fetchUserTrips();
  }, []);

  // Fetch destinations from backend REST API
  const fetchDestinations = async () => {
    try {
      const data = await apiFetch('/api/destinations');
      if (data?.success) {
        setDestinations(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch destinations:', err.message);
    }
  };

  // Fetch user's saved trips from backend
  const fetchUserTrips = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/trips');
      if (data?.success) {
        setTrips(data.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load your trips. Please refresh.');
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
      currency: preferredCurrency || 'INR',
      notes: '',
      status: 'Planned'
    });
    setErrorMsg('');
    setShowTripModal(true);
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
      currency: trip.currency || preferredCurrency || 'INR',
      notes: trip.notes || '',
      status: trip.status || 'Planned'
    });
    setErrorMsg('');
    setShowTripModal(true);
  };

  // Handle trip form input changes
  const handleTripInputChange = (e) => {
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

      await apiFetch(url, {
        method,
        body: JSON.stringify(tripForm)
      });

      setSuccessMsg(editingTripId ? 'Trip updated successfully!' : 'Trip created successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowTripModal(false);
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
      await apiFetch(`/api/trips/${id}`, {
        method: 'DELETE'
      });

      setSuccessMsg('Trip deleted successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      setTrips((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Delete destination (Admin)
  const handleDeleteDestination = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete destination "${name}"?`)) {
      return;
    }

    try {
      await apiFetch(`/api/destinations/${id}`, {
        method: 'DELETE'
      });
      setSuccessMsg(`Destination "${name}" removed`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchDestinations();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Extract unique categories and countries for filter dropdowns
  const allCategories = React.useMemo(() => {
    const cats = new Set();
    destinations.forEach((d) => {
      if (Array.isArray(d.categories)) {
        d.categories.forEach((c) => cats.add(c));
      } else if (d.category) {
        cats.add(d.category);
      }
    });
    return ['All', ...Array.from(cats).sort()];
  }, [destinations]);

  const allCountries = React.useMemo(() => {
    const countries = new Set();
    destinations.forEach((d) => {
      if (d.country) countries.add(d.country);
    });
    return ['All', ...Array.from(countries).sort()];
  }, [destinations]);

  // Client-side filtering
  const filteredDestinations = React.useMemo(() => {
    return destinations.filter((dest) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = dest.name?.toLowerCase().includes(q);
        const matchCountry = dest.country?.toLowerCase().includes(q);
        const matchState = dest.state?.toLowerCase().includes(q);
        const matchDesc = dest.description?.toLowerCase().includes(q);
        const matchHighlights = dest.highlights?.some((h) => h.toLowerCase().includes(q));
        if (!matchName && !matchCountry && !matchState && !matchDesc && !matchHighlights) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'All') {
        const destCats = Array.isArray(dest.categories) ? dest.categories : [dest.category];
        if (!destCats.some((c) => c?.toLowerCase() === selectedCategory.toLowerCase())) {
          return false;
        }
      }

      // Country filter
      if (selectedCountry !== 'All') {
        if (dest.country?.toLowerCase() !== selectedCountry.toLowerCase()) {
          return false;
        }
      }

      // Classification filter (Domestic vs International based on homeCountry)
      if (classificationFilter !== 'all') {
        const isDom = isDomestic(dest.country);
        if (classificationFilter === 'domestic' && !isDom) return false;
        if (classificationFilter === 'international' && isDom) return false;
      }

      // Featured filter
      if (featuredOnly && !dest.featured) {
        return false;
      }

      return true;
    });
  }, [destinations, searchQuery, selectedCategory, selectedCountry, classificationFilter, featuredOnly, homeCountry]);

  // Featured destinations for spotlight
  const featuredList = destinations.filter((d) => d.featured);

  return (
    <div className="container dashboard-page">
      {/* Dashboard Top Header */}
      <div className="dashboard-header">
        <div>
          <h1>Trip Dashboard</h1>
          <p>
            Welcome back, <strong>{user?.name}</strong>! Home Country: <strong>{homeCountry}</strong> • Currency: <strong>{preferredCurrency}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => handleOpenCreateModal('')}>
            + Create New Trip
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              setDestinationToEdit(null);
              setShowAdminModal(true);
            }}
            title="Manage Destination Catalog or Import/Export JSON"
          >
            ⚙️ Destination Admin & JSON
          </button>
        </div>
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
              {trips.map((trip) => {
                const tripCurr = trip.currency || 'INR';
                return (
                  <div key={trip._id} className="trip-card">
                    <div className="trip-card-header">
                      <div>
                        <span className="destination-country">{trip.destination}</span>
                        <h3 className="trip-destination-title">{trip.title}</h3>
                      </div>
                      <span
                        className={`badge ${
                          trip.status === 'Completed'
                            ? 'badge-success'
                            : trip.status === 'Ongoing'
                            ? 'badge-warning'
                            : 'badge-primary'
                        }`}
                      >
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
                        <span className="trip-stat-value">
                          {formatDualCurrency(trip.totalBudget || 0, tripCurr, displayCurrency)}
                        </span>
                      </div>
                      <div className="trip-stat-item">
                        <span className="trip-stat-label">Daily Target</span>
                        <span className="trip-stat-value">
                          {formatDualCurrency(trip.dailyBudget || 0, tripCurr, displayCurrency)}
                        </span>
                      </div>
                    </div>

                    {trip.notes && (
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--slate)',
                          marginBottom: '1.25rem',
                          fontStyle: 'italic'
                        }}
                      >
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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXPLORE DESTINATIONS */}
      {activeTab === 'destinations' && (
        <div>
          {/* Featured Spotlight Banner */}
          {featuredList.length > 0 && !searchQuery && selectedCategory === 'All' && selectedCountry === 'All' && classificationFilter === 'all' && (
            <div className="featured-spotlight-section" style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <span>⭐</span> Featured World Highlights
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>
                  Hand-picked iconic travel experiences
                </span>
              </div>
              <div className="featured-scroll-container">
                {featuredList.map((f) => {
                  const fDomestic = isDomestic(f.country);
                  return (
                    <div
                      key={f._id}
                      className="featured-mini-card"
                      onClick={() => setSelectedDestinationForDetails(f)}
                    >
                      <img
                        src={f.coverImage || f.imageUrl}
                        alt={f.name}
                        className="featured-mini-img"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800';
                        }}
                      />
                      <div className="featured-mini-overlay">
                        <span className={`badge ${fDomestic ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '0.7rem' }}>
                          {fDomestic ? '🏠 Domestic' : '✈️ International'}
                        </span>
                        <h4>{f.name}</h4>
                        <span>{f.country}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search & Multi-Filters Toolbar */}
          <div className="destinations-filter-toolbar">
            <div className="filter-search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search destinations, highlights, country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                  ✕
                </button>
              )}
            </div>

            {/* Classification Filter: All / Domestic / International */}
            <div className="classification-pills">
              <button
                type="button"
                className={`pill-btn ${classificationFilter === 'all' ? 'active' : ''}`}
                onClick={() => setClassificationFilter('all')}
              >
                All Destinations
              </button>
              <button
                type="button"
                className={`pill-btn ${classificationFilter === 'domestic' ? 'active' : ''}`}
                onClick={() => setClassificationFilter('domestic')}
                title={`Destinations within ${homeCountry}`}
              >
                🏠 Domestic ({homeCountry})
              </button>
              <button
                type="button"
                className={`pill-btn ${classificationFilter === 'international' ? 'active' : ''}`}
                onClick={() => setClassificationFilter('international')}
                title={`Destinations outside ${homeCountry}`}
              >
                ✈️ International
              </button>
            </div>

            {/* Dropdown Filters */}
            <div className="filter-selects-group">
              <div className="filter-select-wrapper">
                <label className="filter-label">Category:</label>
                <select
                  className="form-select filter-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-select-wrapper">
                <label className="filter-label">Country:</label>
                <select
                  className="form-select filter-select"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                >
                  {allCountries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <label className="featured-toggle-label">
                <input
                  type="checkbox"
                  checked={featuredOnly}
                  onChange={(e) => setFeaturedOnly(e.target.checked)}
                />
                ⭐ Featured Only
              </label>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', color: 'var(--slate)', fontSize: '0.9rem' }}>
            <span>
              Showing <strong>{filteredDestinations.length}</strong> of {destinations.length} destinations
              {homeCountry && (
                <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>
                  (Relative to home country: {homeCountry})
                </span>
              )}
            </span>
            {(searchQuery || selectedCategory !== 'All' || selectedCountry !== 'All' || classificationFilter !== 'all' || featuredOnly) && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedCountry('All');
                  setClassificationFilter('all');
                  setFeaturedOnly(false);
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Destinations Grid */}
          {filteredDestinations.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <h3>No Destinations Found</h3>
              <p>Try adjusting your search criteria, category, or country filters.</p>
            </div>
          ) : (
            <div className="destinations-grid">
              {filteredDestinations.map((dest) => {
                const destDomestic = isDomestic(dest.country);
                const destBudget = dest.estimatedBudget || dest.averageCostPerDay || 0;
                const destCurrency = dest.currency || 'INR';

                return (
                  <div key={dest._id} className="destination-card">
                    <div
                      className="destination-img-wrapper"
                      onClick={() => setSelectedDestinationForDetails(dest)}
                      style={{ cursor: 'pointer' }}
                    >
                      <img
                        src={dest.coverImage || dest.imageUrl}
                        alt={dest.name}
                        className="destination-img"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800';
                        }}
                      />

                      {/* Top Badges */}
                      <div className="destination-badges-strip">
                        <span className={`badge ${destDomestic ? 'badge-success' : 'badge-primary'}`}>
                          {destDomestic ? '🏠 Domestic' : '✈️ International'}
                        </span>
                        {dest.featured && <span className="badge badge-accent">⭐ Featured</span>}
                      </div>

                      <span className="badge destination-badge">
                        {dest.categories && dest.categories.length > 0 ? dest.categories[0] : dest.category || 'Adventure'}
                      </span>
                    </div>

                    <div className="destination-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="destination-country">{dest.country}</span>
                        {dest.state && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--slate-light)' }}>
                            {dest.state}
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => setSelectedDestinationForDetails(dest)}
                        style={{ cursor: 'pointer' }}
                      >
                        {dest.name}
                      </h3>

                      <p className="destination-desc">{dest.description}</p>

                      {/* Highlights summary pills */}
                      {dest.highlights && dest.highlights.length > 0 && (
                        <div className="destination-mini-highlights">
                          {dest.highlights.slice(0, 2).map((h, i) => (
                            <span key={i} className="mini-highlight-tag">
                              • {h}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="destination-footer">
                        <div className="destination-cost">
                          <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--slate)' }}>
                            Est. Budget
                          </span>
                          <strong>
                            {formatDualCurrency(destBudget, destCurrency, displayCurrency)}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--slate)' }}> / day</span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setSelectedDestinationForDetails(dest)}
                            title="View Photo Gallery & Full Details"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn btn-accent btn-sm"
                            onClick={() => handleOpenCreateModal(dest.name)}
                          >
                            Plan Trip →
                          </button>
                        </div>
                      </div>

                      {/* Admin Quick Action Controls */}
                      <div className="dest-admin-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                          onClick={() => {
                            setDestinationToEdit(dest);
                            setShowAdminModal(true);
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                          onClick={() => handleDeleteDestination(dest._id, dest.name)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: DESTINATION FULL DETAILS & RESPONSIVE GALLERY */}
      {selectedDestinationForDetails && (
        <DestinationDetailModal
          destination={selectedDestinationForDetails}
          onClose={() => setSelectedDestinationForDetails(null)}
          onPlanTrip={(name) => handleOpenCreateModal(name)}
        />
      )}

      {/* MODAL 2: DESTINATION ADMIN & JSON IMPORT/EXPORT */}
      {showAdminModal && (
        <DestinationAdminModal
          destinationToEdit={destinationToEdit}
          onClose={() => {
            setShowAdminModal(false);
            setDestinationToEdit(null);
          }}
          onSuccess={() => {
            fetchDestinations();
          }}
        />
      )}

      {/* MODAL 3: CREATE OR EDIT TRIP */}
      {showTripModal && (
        <div className="modal-overlay" onClick={() => setShowTripModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTripId ? 'Edit Trip Details' : 'Create a New Trip'}</h3>
              <button className="modal-close-btn" onClick={() => setShowTripModal(false)}>
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
                  onChange={handleTripInputChange}
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
                  onChange={handleTripInputChange}
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
                    onChange={handleTripInputChange}
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
                    onChange={handleTripInputChange}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="totalBudget">Total Budget</label>
                  <input
                    type="number"
                    id="totalBudget"
                    name="totalBudget"
                    className="form-input"
                    placeholder="e.g. 50000"
                    value={tripForm.totalBudget}
                    onChange={handleTripInputChange}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="dailyBudget">Daily Budget</label>
                  <input
                    type="number"
                    id="dailyBudget"
                    name="dailyBudget"
                    className="form-input"
                    placeholder="e.g. 5000"
                    value={tripForm.dailyBudget}
                    onChange={handleTripInputChange}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="tripCurrency">Budget Currency</label>
                  <select
                    id="tripCurrency"
                    name="currency"
                    className="form-select"
                    value={tripForm.currency}
                    onChange={handleTripInputChange}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED</option>
                    <option value="IDR">IDR (Rp)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="SGD">SGD (S$)</option>
                    <option value="CHF">CHF</option>
                    <option value="ZAR">ZAR (R)</option>
                  </select>
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
                    onChange={handleTripInputChange}
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
                  onChange={handleTripInputChange}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowTripModal(false)}
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
