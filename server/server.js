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

// Import Destination Model, Master JSON Data, and Admin Initializer
const Destination = require('./models/Destination');
const destinationsData = require('./data/destinations.json');
const initAdmin = require('./utils/initAdmin');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tripmate';

// Global Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '10mb' })); // Parse incoming JSON request bodies with ample limit for JSON import/export

// Check for JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn(
    '⚠️ [SECURITY WARNING] JWT_SECRET environment variable is not defined in production. Using fallback secret. Please configure JWT_SECRET in your Render dashboard.'
  );
}

// Database Connection via Mongoose
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');

    // Safe initial bootstrap if MongoDB collection is completely fresh
    try {
      const count = await Destination.countDocuments();
      if (count === 0) {
        await Destination.insertMany(destinationsData);
        console.log(`Bootstrapped ${destinationsData.length} destinations into MongoDB from destinations.json`);
      }
    } catch (bootstrapErr) {
      console.error('Error during initial destination bootstrap:', bootstrapErr.message);
    }

    // Initialize or verify system administrator account
    try {
      await initAdmin();
    } catch (adminErr) {
      console.error('Error during admin account initialization:', adminErr.message);
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

// Database connectivity verification middleware for data routes
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable. Please verify MongoDB is running and MONGO_URI is configured.'
    });
  }
  next();
};

// REST API Route Registrations
app.use('/api/auth', authRoutes);
app.use('/api/destinations', checkDbConnection, destinationRoutes);
app.use('/api/trips', checkDbConnection, tripRoutes);
app.use('/api/expenses', checkDbConnection, expenseRoutes);
app.use('/api/itinerary', checkDbConnection, itineraryRoutes);

// Health check endpoints (supported on both /api/health and /health for Render checks)
const healthCheckHandler = (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: isConnected ? 'OK' : 'DEGRADED',
    app: 'TripMate Backend API',
    database: isConnected ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
};
app.get('/api/health', healthCheckHandler);
app.get('/health', healthCheckHandler);

// Root welcome endpoint
app.get('/', (req, res) => {
  res.send('TripMate REST API Server is running. Access API endpoints under /api/*');
});

// Fallback 404 handler for any unmatched route - guarantees 100% JSON response, never HTML
app.use((req, res) => {
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
