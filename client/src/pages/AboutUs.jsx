// client/src/pages/AboutUs.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import '../css/AboutUs.css';

const values = [
  {
    icon: '🌍',
    title: 'Explore Freely',
    description:
      'Discover new destinations, hidden gems, and experiences that take you beyond the ordinary.',
  },
  {
    icon: '🧭',
    title: 'Travel with Purpose',
    description:
      'Plan meaningful journeys with organized itineraries, thoughtful budgeting, and less stress.',
  },
  {
    icon: '🤝',
    title: 'Built for Travellers',
    description:
      'We believe every traveller deserves a simpler, smarter way to turn travel dreams into reality.',
  },
];

const AboutUs = () => {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero-overlay" />

        <div className="about-hero-content">
          <span className="about-eyebrow">THE STORY BEHIND TRIPMATE</span>
          <h1>
            Every journey
            <br />
            tells a <span>story.</span>
          </h1>
          <p>
            We help you spend less time worrying about the details
            and more time making memories around the world.
          </p>
          <Link to="/dashboard" className="about-primary-btn">
            Start Exploring <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="about-hero-note">
          <span className="about-note-dot" />
          Your next adventure starts here
        </div>
      </section>

      <section className="about-intro">
        <div className="about-section-label">
          <span /> WHO WE ARE
        </div>

        <div className="about-intro-grid">
          <h2>
            More than a trip planner.
            <br />
            Your <span>travel companion.</span>
          </h2>

          <div className="about-intro-copy">
            <p>
              TripMate is designed to make travel planning feel exciting
              instead of overwhelming. From choosing destinations to
              organizing budgets and day-by-day itineraries, we bring
              your travel essentials together in one place.
            </p>
            <p>
              Whether you are planning a spontaneous weekend escape,
              a solo adventure, or a long-awaited holiday, TripMate
              helps you move from “someday” to “let's go.”
            </p>
          </div>
        </div>
      </section>

      <section className="about-values">
        <div className="about-values-heading">
          <div className="about-section-label">
            <span /> WHAT DRIVES US
          </div>
          <h2>
            Travel better.
            <br />
            <span>Experience more.</span>
          </h2>
          <p>
            Great journeys begin with great planning. Here is what guides us.
          </p>
        </div>

        <div className="about-values-grid">
          {values.map((value, index) => (
            <article className="about-value-card" key={value.title}>
              <div className="about-value-top">
                <span className="about-value-icon" aria-hidden="true">
                  {value.icon}
                </span>
                <span className="about-value-number">
                  0{index + 1}
                </span>
              </div>
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-journey">
        <div className="about-journey-image">
          <img
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85"
            alt="Majestic mountain landscape waiting to be explored"
            loading="lazy"
          />
          <div className="about-image-caption">
            <span>THE WORLD IS YOURS</span>
            <p>Go where curiosity takes you.</p>
          </div>
        </div>

        <div className="about-journey-content">
          <div className="about-section-label">
            <span /> OUR PROMISE
          </div>
          <h2>
            Less planning stress.
            <br />
            <span>More living in the moment.</span>
          </h2>
          <p>
            Keep your plans organized, track your travel budget, and
            structure your itinerary in a way that works for you.
            TripMate puts the essentials within reach so you can focus
            on what makes every trip special: the experience itself.
          </p>

          <Link to="/dashboard" className="about-text-link">
            Plan your next journey <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section className="about-cta">
        <div className="about-cta-decoration" aria-hidden="true">
          ✳
        </div>
        <span className="about-eyebrow">YOUR NEXT CHAPTER AWAITS</span>
        <h2>
          The world won't
          <br />
          <span>explore itself.</span>
        </h2>
        <p>Pick a destination. Make a plan. Create a story worth telling.</p>
        <Link to="/dashboard" className="about-primary-btn">
          Let's Get Going <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
};

export default AboutUs;