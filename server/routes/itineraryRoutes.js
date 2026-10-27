// Day Planner Itinerary REST Routes
const express = require('express');
const router = express.Router();
const ItineraryItem = require('../models/ItineraryItem');
const Trip = require('../models/Trip');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all itinerary routes with authentication
router.use(authMiddleware);

// @route   GET /api/itinerary
// @desc    Retrieve all itinerary items for a trip sorted by day and visit order
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { tripId } = req.query;

    if (!tripId) {
      return res.status(400).json({ success: false, message: 'tripId is required' });
    }

    // Verify trip ownership
    const trip = await Trip.findOne({ _id: tripId, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized' });
    }

    const items = await ItineraryItem.find({ trip: tripId, user: req.user.id }).sort({
      dayNumber: 1,
      visitOrder: 1,
      createdAt: 1
    });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve itinerary', error: error.message });
  }
});

// @route   POST /api/itinerary
// @desc    Create a new itinerary activity
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { tripId, dayNumber, placeName, activity, time, visitOrder, notes } = req.body;

    if (!tripId || !dayNumber || !placeName || !activity) {
      return res.status(400).json({
        success: false,
        message: 'Trip ID, day number, place name, and activity are required'
      });
    }

    const trip = await Trip.findOne({ _id: tripId, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized' });
    }

    const newItem = await ItineraryItem.create({
      trip: tripId,
      user: req.user.id,
      dayNumber: Number(dayNumber),
      placeName,
      activity,
      time: time || '09:00 AM',
      visitOrder: Number(visitOrder) || 1,
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: 'Itinerary activity added',
      data: newItem
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add itinerary item', error: error.message });
  }
});

// @route   PUT /api/itinerary/:id
// @desc    Update an itinerary activity
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { dayNumber, placeName, activity, time, visitOrder, notes } = req.body;

    let item = await ItineraryItem.findOne({ _id: req.params.id, user: req.user.id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Itinerary item not found or unauthorized' });
    }

    if (dayNumber !== undefined) item.dayNumber = Number(dayNumber);
    if (placeName !== undefined) item.placeName = placeName;
    if (activity !== undefined) item.activity = activity;
    if (time !== undefined) item.time = time;
    if (visitOrder !== undefined) item.visitOrder = Number(visitOrder);
    if (notes !== undefined) item.notes = notes;

    const updatedItem = await item.save();

    res.status(200).json({
      success: true,
      message: 'Itinerary activity updated',
      data: updatedItem
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update itinerary item', error: error.message });
  }
});

// @route   DELETE /api/itinerary/:id
// @desc    Delete an itinerary activity
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const item = await ItineraryItem.findOne({ _id: req.params.id, user: req.user.id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Itinerary item not found or unauthorized' });
    }

    await ItineraryItem.deleteOne({ _id: item._id });

    res.status(200).json({
      success: true,
      message: 'Itinerary activity removed successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete itinerary item', error: error.message });
  }
});

module.exports = router;
