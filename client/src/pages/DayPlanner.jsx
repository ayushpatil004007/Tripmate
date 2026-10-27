// Day Planner Itinerary Page
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../css/planner.css';

const DayPlanner = () => {
  const location = useLocation();

  // Trips and Active Trip State
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [activeDay, setActiveDay] = useState(1);
  const [itineraryItems, setItineraryItems] = useState([]);
  const [maxDay, setMaxDay] = useState(3); // Default 3 days, expandable

  // Status and Alerts
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add / Edit Activity Form State
  const [activityForm, setActivityForm] = useState({
    dayNumber: 1,
    placeName: '',
    activity: '',
    time: '09:00 AM',
    visitOrder: 1,
    notes: ''
  });
  const [editingItemId, setEditingItemId] = useState(null);

  // Request headers with authentication token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('tripmate_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  // Initial Load - Fetch user's trips
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await fetch('/api/trips', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setTrips(data.data);

          // Check if URL specifies tripId query param
          const queryParams = new URLSearchParams(location.search);
          const paramTripId = queryParams.get('tripId');

          if (paramTripId && data.data.some((t) => t._id === paramTripId)) {
            setSelectedTripId(paramTripId);
          } else {
            setSelectedTripId(data.data[0]._id);
          }
        }
      } catch (err) {
        setErrorMsg('Failed to load trips');
      }
    };

    fetchTrips();
  }, [location.search]);

  // When selectedTripId changes, fetch itinerary items
  useEffect(() => {
    if (selectedTripId) {
      loadItinerary(selectedTripId);
    }
  }, [selectedTripId]);

  const loadItinerary = async (tripId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/itinerary?tripId=${tripId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setItineraryItems(data.data);

        // Determine highest day number recorded or default to 3
        const days = data.data.map((item) => item.dayNumber);
        const highest = days.length > 0 ? Math.max(...days, 3) : 3;
        setMaxDay(highest);
      }
    } catch (err) {
      setErrorMsg('Failed to fetch itinerary');
    } finally {
      setLoading(false);
    }
  };

  // Filter itinerary items for the selected day tab
  const dayItems = itineraryItems
    .filter((item) => item.dayNumber === activeDay)
    .sort((a, b) => a.visitOrder - b.visitOrder);

  // Handle Form Input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setActivityForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Add / Edit Activity Submit
  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!activityForm.placeName || !activityForm.activity) {
      setErrorMsg('Place name and activity description are required');
      return;
    }

    try {
      const url = editingItemId ? `/api/itinerary/${editingItemId}` : '/api/itinerary';
      const method = editingItemId ? 'PUT' : 'POST';

      const payload = {
        ...activityForm,
        tripId: selectedTripId,
        dayNumber: Number(activityForm.dayNumber),
        visitOrder: Number(activityForm.visitOrder)
      };

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');

      setSuccessMsg(editingItemId ? 'Activity updated!' : 'Activity added to itinerary!');
      setTimeout(() => setSuccessMsg(''), 3000);

      // Reset form
      setActivityForm({
        dayNumber: activeDay,
        placeName: '',
        activity: '',
        time: '10:00 AM',
        visitOrder: dayItems.length + (editingItemId ? 1 : 2),
        notes: ''
      });
      setEditingItemId(null);

      // Refresh itinerary from MongoDB
      loadItinerary(selectedTripId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Start Editing Item
  const handleStartEdit = (item) => {
    setEditingItemId(item._id);
    setActivityForm({
      dayNumber: item.dayNumber,
      placeName: item.placeName,
      activity: item.activity,
      time: item.time,
      visitOrder: item.visitOrder,
      notes: item.notes || ''
    });
  };

  // Delete Activity
  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Remove this activity from itinerary?')) return;

    try {
      const res = await fetch(`/api/itinerary/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove');

      setSuccessMsg('Activity removed');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadItinerary(selectedTripId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Add another day to the itinerary
  const handleAddDay = () => {
    const nextDay = maxDay + 1;
    setMaxDay(nextDay);
    setActiveDay(nextDay);
    setActivityForm((prev) => ({
      ...prev,
      dayNumber: nextDay,
      visitOrder: 1
    }));
  };

  const selectedTrip = trips.find((t) => t._id === selectedTripId);

  return (
    <div className="container planner-page">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1>Day-Wise Itinerary Planner</h1>
        <p>Plan each day of your journey, schedule visit order, timings, and sightseeing activities.</p>
      </div>

      {/* Messages */}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

      {/* Trip Selector Controls */}
      <div className="planner-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label className="form-label" style={{ marginBottom: 0, fontSize: '1rem' }}>
            Select Trip:
          </label>
          {trips.length > 0 ? (
            <select
              className="form-select"
              style={{ minWidth: '280px' }}
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
            >
              {trips.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title} ({t.destination})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ color: 'var(--slate)' }}>No trips found. Create a trip first in Dashboard!</span>
          )}
        </div>

        {selectedTrip && (
          <span className="badge badge-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
            📅 {new Date(selectedTrip.startDate).toLocaleDateString()} — {new Date(selectedTrip.endDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {selectedTripId ? (
        <>
          {/* Day Navigation Tabs */}
          <div className="day-tabs-container">
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((dayNum) => (
              <button
                key={dayNum}
                className={`day-tab-btn ${activeDay === dayNum ? 'active' : ''}`}
                onClick={() => {
                  setActiveDay(dayNum);
                  setActivityForm((prev) => ({ ...prev, dayNumber: dayNum }));
                }}
              >
                <span>Day {dayNum}</span>
                <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>
                  ({itineraryItems.filter((it) => it.dayNumber === dayNum).length})
                </span>
              </button>
            ))}
            <button className="btn btn-outline-primary btn-sm" onClick={handleAddDay}>
              + Add Day {maxDay + 1}
            </button>
          </div>

          {/* Main Layout: Day Timeline vs Add Activity Form */}
          <div className="planner-layout">
            {/* Timeline View */}
            <div className="timeline-card">
              <div className="timeline-header">
                <h3>
                  Day {activeDay} Schedule ({dayItems.length} activities)
                </h3>
                <span className="badge badge-accent">
                  Trip: {selectedTrip?.destination}
                </span>
              </div>

              {dayItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--slate)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📍</div>
                  <h4 style={{ marginBottom: '0.5rem' }}>No Activities Scheduled for Day {activeDay}</h4>
                  <p>Use the form on the right to add your first place, sight, or tour!</p>
                </div>
              ) : (
                <div className="timeline-list">
                  {dayItems.map((item) => (
                    <div key={item._id} className="timeline-item">
                      <div className="timeline-order-badge">#{item.visitOrder}</div>
                      <div className="timeline-content-box">
                        <div className="timeline-item-top">
                          <h4 className="timeline-place-name">{item.placeName}</h4>
                          <span className="timeline-time-badge">
                            ⏰ {item.time}
                          </span>
                        </div>
                        <p className="timeline-activity-desc">{item.activity}</p>
                        {item.notes && (
                          <div className="timeline-notes">
                            <strong>Note:</strong> {item.notes}
                          </div>
                        )}
                        <div className="timeline-item-actions">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleStartEdit(item)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteActivity(item._id)}
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

            {/* Add / Edit Form Card */}
            <div className="planner-form-card">
              <h3 style={{ marginBottom: '1.25rem' }}>
                {editingItemId ? `✏️ Edit Activity` : `+ Add Activity (Day ${activeDay})`}
              </h3>
              <form onSubmit={handleActivitySubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="dayNumber">Day Number</label>
                  <select
                    id="dayNumber"
                    name="dayNumber"
                    className="form-select"
                    value={activityForm.dayNumber}
                    onChange={handleInputChange}
                  >
                    {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="placeName">Place / Location Name</label>
                  <input
                    type="text"
                    id="placeName"
                    name="placeName"
                    className="form-input"
                    placeholder="e.g. Fushimi Inari Shrine"
                    value={activityForm.placeName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="activity">Activity Description</label>
                  <textarea
                    id="activity"
                    name="activity"
                    className="form-textarea"
                    placeholder="e.g. Hike through the iconic thousand vermilion torii gates to the mountain summit."
                    value={activityForm.activity}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="time">Scheduled Time</label>
                    <input
                      type="text"
                      id="time"
                      name="time"
                      className="form-input"
                      placeholder="e.g. 08:30 AM"
                      value={activityForm.time}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="visitOrder">Visit Order</label>
                    <input
                      type="number"
                      id="visitOrder"
                      name="visitOrder"
                      className="form-input"
                      placeholder="1"
                      value={activityForm.visitOrder}
                      onChange={handleInputChange}
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="notes">Special Notes</label>
                  <input
                    type="text"
                    id="notes"
                    name="notes"
                    className="form-input"
                    placeholder="e.g. Wear comfortable hiking shoes, entry is free"
                    value={activityForm.notes}
                    onChange={handleInputChange}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    {editingItemId ? 'Save Changes' : '+ Add to Itinerary'}
                  </button>
                  {editingItemId && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        setEditingItemId(null);
                        setActivityForm({
                          dayNumber: activeDay,
                          placeName: '',
                          activity: '',
                          time: '10:00 AM',
                          visitOrder: dayItems.length + 1,
                          notes: ''
                        });
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DayPlanner;
