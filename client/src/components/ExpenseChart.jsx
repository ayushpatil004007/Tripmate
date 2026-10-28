// Donut Breakdown Chart Component (Pure SVG & CSS) with Dynamic Currency Formatting
import React from 'react';
import { formatCurrency } from '../utils/currency';

const CATEGORY_COLORS = {
  Food: '#f97316',    // Coral / Orange
  Travel: '#0284c7',  // Ocean Teal
  Hotels: '#10b981',  // Emerald Green
  Other: '#8b5cf6'    // Purple
};

const ExpenseChart = ({ categoryTotals = {}, totalSpent = 0, currency = 'INR' }) => {
  const categories = ['Food', 'Travel', 'Hotels', 'Other'];

  const radius = 70;
  const circumference = 2 * Math.PI * radius; // 2 * PI * r ~= 439.82

  let accumulatedPercent = 0;

  // Compute SVG stroke geometry for donut segments
  const segments = categories.map((cat) => {
    const amount = categoryTotals[cat] || 0;
    const percentage = totalSpent > 0 ? (amount / totalSpent) : 0;
    const strokeDasharray = `${percentage * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percentage;

    return {
      category: cat,
      amount,
      percentage: Math.round(percentage * 100),
      color: CATEGORY_COLORS[cat],
      strokeDasharray,
      strokeDashoffset
    };
  });

  return (
    <div className="chart-container-inner">
      {/* SVG Donut Chart */}
      <div style={{ position: 'relative', width: '220px', height: '220px' }}>
        <svg
          width="220"
          height="220"
          viewBox="0 0 200 200"
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          {/* Base track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="24"
          />

          {/* Dynamic category segments */}
          {totalSpent > 0 &&
            segments.map((seg) => (
              <circle
                key={seg.category}
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth="24"
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
              />
            ))}
        </svg>

        {/* Center Summary Label */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center',
            padding: '0 10px'
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase' }}>
            Total Spent
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark)', wordBreak: 'break-all' }}>
            {formatCurrency(totalSpent, currency)}
          </span>
        </div>
      </div>

      {/* Progress Breakdown Bars */}
      <div className="category-bars">
        {segments.map((seg) => (
          <div key={seg.category} className="cat-bar-item">
            <div className="cat-bar-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: seg.color
                  }}
                />
                {seg.category}
              </span>
              <span>
                {formatCurrency(seg.amount, currency)} ({seg.percentage}%)
              </span>
            </div>
            <div className="cat-bar-track">
              <div
                className="cat-bar-fill"
                style={{
                  width: `${seg.percentage}%`,
                  backgroundColor: seg.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpenseChart;
