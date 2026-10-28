// Day Planner Itinerary REST Routes
const express = require('express');
const router = express.Router();
const ItineraryItem = require('../models/ItineraryItem');
const Expense = require('../models/Expense');
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

    const items = await ItineraryItem.find({ trip: tripId, user: req.user.id })
      .populate('expense')
      .sort({
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
// @desc    Create a new itinerary activity (optionally with an expense)
// @access  Private
router.post('/', async (req, res) => {
  try {
    const {
      tripId,
      dayNumber,
      placeName,
      activity,
      time,
      visitOrder,
      notes,
      expenseAmount,
      expenseCurrency,
      expenseCategory,
      expenseDescription
    } = req.body;

    if (!tripId || dayNumber === undefined || dayNumber === null || !String(placeName || '').trim() || visitOrder === undefined || visitOrder === null || String(visitOrder).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Trip ID, day number, place name, and visit order are required'
      });
    }

    const trip = await Trip.findOne({ _id: tripId, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized' });
    }

    const newItem = new ItineraryItem({
      trip: tripId,
      user: req.user.id,
      dayNumber: Number(dayNumber),
      placeName: String(placeName).trim(),
      activity: activity ? String(activity).trim() : '',
      time: time ? String(time).trim() : '',
      visitOrder: Number(visitOrder),
      notes: notes ? String(notes).trim() : ''
    });

    const parsedExpenseAmount = Number(expenseAmount);
    if (!isNaN(parsedExpenseAmount) && parsedExpenseAmount > 0) {
      const expCurrency = expenseCurrency ? String(expenseCurrency).trim().toUpperCase() : (trip.currency || 'INR');
      const newExpense = await Expense.create({
        trip: tripId,
        user: req.user.id,
        title: expenseDescription ? String(expenseDescription).trim() : `${String(placeName).trim()} (Activity)`,
        amount: parsedExpenseAmount,
        currency: expCurrency,
        category: expenseCategory || 'Activities',
        date: new Date(),
        note: expenseDescription ? String(expenseDescription).trim() : '',
        itineraryItem: newItem._id
      });
      newItem.expense = newExpense._id;
    }

    await newItem.save();
    await newItem.populate('expense');

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
    const {
      dayNumber,
      placeName,
      activity,
      time,
      visitOrder,
      notes,
      expenseAmount,
      expenseCurrency,
      expenseCategory,
      expenseDescription
    } = req.body;

    let item = await ItineraryItem.findOne({ _id: req.params.id, user: req.user.id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Itinerary item not found or unauthorized' });
    }

    if (dayNumber !== undefined) item.dayNumber = Number(dayNumber);
    if (placeName !== undefined) item.placeName = String(placeName).trim();
    if (activity !== undefined) item.activity = String(activity).trim();
    if (time !== undefined) item.time = String(time).trim();
    if (visitOrder !== undefined) item.visitOrder = Number(visitOrder);
    if (notes !== undefined) item.notes = String(notes).trim();

    // Handle linked expense update if expenseAmount is provided in body
    if (expenseAmount !== undefined) {
      const parsedAmount = Number(expenseAmount);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        let expense = item.expense ? await Expense.findOne({ _id: item.expense, user: req.user.id }) : null;
        if (!expense) {
          expense = await Expense.findOne({ itineraryItem: item._id, user: req.user.id });
        }

        const expCurrency = expenseCurrency ? String(expenseCurrency).trim().toUpperCase() : undefined;
        const expTitle = expenseDescription ? String(expenseDescription).trim() : `${item.placeName} (Activity)`;
        const expCategory = expenseCategory || 'Activities';
        const expNote = expenseDescription !== undefined ? String(expenseDescription).trim() : '';

        if (expense) {
          expense.amount = parsedAmount;
          if (expCurrency) expense.currency = expCurrency;
          expense.category = expCategory;
          expense.title = expTitle;
          expense.note = expNote;
          await expense.save();
          item.expense = expense._id;
        } else {
          const trip = await Trip.findOne({ _id: item.trip, user: req.user.id });
          const newExpense = await Expense.create({
            trip: item.trip,
            user: req.user.id,
            title: expTitle,
            amount: parsedAmount,
            currency: expCurrency || (trip?.currency || 'INR'),
            category: expCategory,
            date: new Date(),
            note: expNote,
            itineraryItem: item._id
          });
          item.expense = newExpense._id;
        }
      } else {
        if (item.expense) {
          await Expense.deleteOne({ _id: item.expense, user: req.user.id });
        }
        await Expense.deleteMany({ itineraryItem: item._id, user: req.user.id });
        item.expense = null;
      }
    }

    const updatedItem = await item.save();
    await updatedItem.populate('expense');

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
// @desc    Delete an itinerary activity and cascade delete linked expense
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const item = await ItineraryItem.findOne({ _id: req.params.id, user: req.user.id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Itinerary item not found or unauthorized' });
    }

    if (item.expense) {
      await Expense.deleteOne({ _id: item.expense, user: req.user.id });
    }
    await Expense.deleteMany({ itineraryItem: item._id, user: req.user.id });

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
