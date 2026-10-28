// Destination Detail Modal Component
import React from 'react';
import DestinationGallery from './DestinationGallery';
import { useCountry } from '../context/CountryContext';
import { formatDualCurrency, formatCurrency } from '../utils/currency';

const DestinationDetailModal = ({ destination, onClose, onPlanTrip }) => {
  const { homeCountry, displayCurrency, isDomestic } = useCountry();

  if (!destination) return null;

  const destDomestic = isDomestic(destination.country);
  const destCurrency = destination.currency || 'INR';
  const destBudget = destination.estimatedBudget || destination.averageCostPerDay || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content destination-detail-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <span className="destination-country">{destination.country}</span>
              {destination.state && (
                <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>
                  • {destination.state}
                </span>
              )}
              <span className={`badge ${destDomestic ? 'badge-success' : 'badge-primary'}`}>
                {destDomestic ? '🏠 Domestic' : '✈️ International'}
              </span>
              {destination.featured && <span className="badge badge-accent">⭐ Featured</span>}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{destination.name}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </div>

        <div className="destination-detail-body">
          {/* Responsive Gallery */}
          <DestinationGallery
            coverImage={destination.coverImage || destination.imageUrl}
            gallery={destination.gallery}
            title={destination.name}
          />

          {/* Quick Metrics Strip */}
          <div className="dest-metrics-grid">
            <div className="dest-metric-card">
              <span className="metric-icon">💰</span>
              <div>
                <span className="metric-label">Estimated Budget</span>
                <span className="metric-val">
                  {formatDualCurrency(destBudget, destCurrency, displayCurrency)} / day
                </span>
              </div>
            </div>

            <div className="dest-metric-card">
              <span className="metric-icon">⏱️</span>
              <div>
                <span className="metric-label">Ideal Duration</span>
                <span className="metric-val">{destination.duration || '3-5 Days'}</span>
              </div>
            </div>

            <div className="dest-metric-card">
              <span className="metric-icon">🌤️</span>
              <div>
                <span className="metric-label">Best Time to Visit</span>
                <span className="metric-val">{destination.bestVisitingTime || 'Year-round'}</span>
              </div>
            </div>

            {destination.coordinates && (destination.coordinates.lat !== 0 || destination.coordinates.lng !== 0) && (
              <div className="dest-metric-card">
                <span className="metric-icon">📍</span>
                <div>
                  <span className="metric-label">Coordinates</span>
                  <span className="metric-val">
                    {destination.coordinates.lat.toFixed(2)}°, {destination.coordinates.lng.toFixed(2)}°
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Categories */}
          {destination.categories && destination.categories.length > 0 && (
            <div style={{ margin: '1.25rem 0 1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {destination.categories.map((cat, i) => (
                  <span key={i} className="badge badge-accent" style={{ fontSize: '0.8rem' }}>
                    🏷️ {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>About Destination</h4>
            <p style={{ color: 'var(--slate)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              {destination.description}
            </p>
          </div>

          {/* Highlights */}
          {destination.highlights && destination.highlights.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Key Highlights & Top Sights</h4>
              <ul className="dest-highlights-list">
                {destination.highlights.map((h, idx) => (
                  <li key={idx} className="dest-highlight-item">
                    <span className="dest-highlight-check">✓</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Footer */}
          <div className="destination-detail-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onPlanTrip(destination.name);
              }}
            >
              Plan Trip to {destination.name} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationDetailModal;
