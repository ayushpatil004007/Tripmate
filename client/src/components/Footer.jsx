// Footer Component
import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      backgroundColor: '#0f172a',
      color: '#94a3b8',
      padding: '2.5rem 0',
      marginTop: 'auto',
      borderTop: '1px solid #1e293b',
      fontSize: '0.875rem'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
            ✈️ TripMate
          </div>
          <div>Your all-in-one companion for seamless travel planning & budgeting.</div>
        </div>
        <div>
          <div style={{ color: '#38bdf8', fontWeight: '500' }}>© {new Date().getFullYear()} TripMate. All rights reserved.</div>
          <div>Explore destinations • Track budgets • Plan daily itineraries</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
