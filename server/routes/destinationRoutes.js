// Destination Catalog Routes
const express = require('express');
const router = express.Router();
const Destination = require('../models/Destination');
const seedDestinations = require('../data/seedDestinations');

// @route   GET /api/destinations
// @desc    Retrieve all destinations
// @access  Public
router.get('/', async (req, res) => {
  try {
    let destinations = await Destination.find().sort({ createdAt: -1 });

    // Seed automatically if collection is empty
    if (destinations.length === 0) {
      await Destination.insertMany(seedDestinations);
      destinations = await Destination.find().sort({ createdAt: -1 });
    }

    res.status(200).json({
      success: true,
      count: destinations.length,
      data: destinations
    });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch destinations',
      error: error.message
    });
  }
});

// @route   POST /api/destinations/seed
// @desc    Reset and re-seed destinations catalog
// @access  Public
router.post('/seed', async (req, res) => {
  try {
    await Destination.deleteMany({});
    const created = await Destination.insertMany(seedDestinations);
    res.status(201).json({
      success: true,
      message: `Seeded ${created.length} destinations into MongoDB`,
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Seeding failed', error: error.message });
  }
});

module.exports = router;
