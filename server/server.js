// ====================================================================
// TripMate - REST API Server Entry Point
// ====================================================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const tripRoutes = require('./routes/tripRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const itineraryRoutes = require('./routes/itineraryRoutes');

// Import Model & Seed Data for Auto-Seeding
const Destination = require('./models/Destination');
const seedDestinations = require('./data/seedDestinations');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tripmate';

// Global Middleware
app.use(cors());
app.use(express.json()); // Parse incoming JSON request bodies

// Database Connection via Mongoose
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');

    // Auto-seed destination catalog if database is fresh
    try {
      const count = await Destination.countDocuments();
      if (count === 0) {
        await Destination.insertMany(seedDestinations);
        console.log(`Auto-seeded ${seedDestinations.length} destinations into MongoDB`);
      }
    } catch (seedErr) {
      console.error('Error during destination seeding:', seedErr.message);
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

// REST API Route Registrations
app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/itinerary', itineraryRoutes);

// Health check endpoint (does not expose raw credentials)
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: isConnected ? 'OK' : 'DEGRADED',
    app: 'TripMate Backend API',
    database: isConnected ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// Root welcome endpoint
app.get('/', (req, res) => {
  res.send('TripMate REST API Server is running. Access API endpoints under /api/*');
});

// Fallback 404 handler for unknown API routes - ensures JSON response instead of HTML
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handling middleware - ensures all server errors return JSON
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request'
    });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start the Express Server
let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`TripMate server is listening on port ${PORT}`);
    console.log(`API Health: http://localhost:${PORT}/api/health`);
  });
}

module.exports = { app, server };
