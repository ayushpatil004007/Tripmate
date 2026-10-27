// Trip Management REST Routes
const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const ItineraryItem = require('../models/ItineraryItem');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all trip routes with authentication
router.use(authMiddleware);

// @route   GET /api/trips
// @desc    Retrieve all trips for the authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: trips.length, data: trips });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve trips', error: error.message });
  }
});

// @route   GET /api/trips/:id
// @desc    Retrieve a single trip by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized' });
    }
    res.status(200).json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving trip', error: error.message });
  }
});

// @route   POST /api/trips
// @desc    Create a new trip
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { title, destination, startDate, endDate, totalBudget, dailyBudget, notes } = req.body;

    if (!title || !destination || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, destination, start date, and end date are required'
      });
    }

    const trip = await Trip.create({
      user: req.user.id,
      title,
      destination,
      startDate,
      endDate,
      totalBudget: Number(totalBudget) || 0,
      dailyBudget: Number(dailyBudget) || 0,
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      data: trip
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create trip', error: error.message });
  }
});

// @route   PUT /api/trips/:id
// @desc    Update an existing trip
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { title, destination, startDate, endDate, totalBudget, dailyBudget, notes, status } = req.body;

    let trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized' });
    }

    // Update fields
    if (title !== undefined) trip.title = title;
    if (destination !== undefined) trip.destination = destination;
    if (startDate !== undefined) trip.startDate = startDate;
    if (endDate !== undefined) trip.endDate = endDate;
    if (totalBudget !== undefined) trip.totalBudget = Number(totalBudget);
    if (dailyBudget !== undefined) trip.dailyBudget = Number(dailyBudget);
    if (notes !== undefined) trip.notes = notes;
    if (status !== undefined) trip.status = status;

    const updatedTrip = await trip.save();

    res.status(200).json({
      success: true,
      message: 'Trip updated successfully',
      data: updatedTrip
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update trip', error: error.message });
  }
});

// @route   DELETE /api/trips/:id
// @desc    Delete a trip and cascade delete associated expenses and itineraries
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized' });
    }

    // Cascade deletion of dependent documents
    await Expense.deleteMany({ trip: trip._id });
    await ItineraryItem.deleteMany({ trip: trip._id });

    // Delete trip record
    await Trip.deleteOne({ _id: trip._id });

    res.status(200).json({
      success: true,
      message: 'Trip and associated data deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete trip', error: error.message });
  }
});

module.exports = router;
