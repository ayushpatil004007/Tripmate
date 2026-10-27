// Expense Tracking REST Routes
const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Trip = require('../models/Trip');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all expense routes with authentication
router.use(authMiddleware);

// @route   GET /api/expenses
// @desc    Retrieve all expenses for a given trip
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { tripId } = req.query;

    if (!tripId) {
      return res.status(400).json({ success: false, message: 'tripId query parameter is required' });
    }

    // Verify user owns the trip
    const trip = await Trip.findOne({ _id: tripId, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized' });
    }

    const expenses = await Expense.find({ trip: tripId, user: req.user.id }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve expenses', error: error.message });
  }
});

// @route   GET /api/expenses/summary/:tripId
// @desc    Calculate budget totals and category breakdowns for visual charts
// @access  Private
router.get('/summary/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findOne({ _id: tripId, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized' });
    }

    const expenses = await Expense.find({ trip: tripId, user: req.user.id });

    // Aggregate category totals and total spending
    const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalBudget = trip.totalBudget || 0;
    const remainingBalance = totalBudget - totalSpent;

    const categories = ['Food', 'Travel', 'Hotels', 'Other'];
    const categoryTotals = categories.reduce((acc, cat) => {
      acc[cat] = expenses
        .filter((item) => item.category === cat)
        .reduce((sum, item) => sum + item.amount, 0);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        tripId: trip._id,
        tripTitle: trip.title,
        totalBudget,
        dailyBudget: trip.dailyBudget || 0,
        totalSpent,
        remainingBalance,
        categoryTotals,
        expenseCount: expenses.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate summary', error: error.message });
  }
});

// @route   POST /api/expenses
// @desc    Record a new expense
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { tripId, title, amount, category, date, note } = req.body;

    if (!tripId || !title || amount === undefined || !category) {
      return res.status(400).json({
        success: false,
        message: 'Trip ID, title, amount, and category are required'
      });
    }

    const trip = await Trip.findOne({ _id: tripId, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized' });
    }

    const expense = await Expense.create({
      trip: tripId,
      user: req.user.id,
      title,
      amount: Number(amount),
      category,
      date: date || new Date(),
      note: note || ''
    });

    res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      data: expense
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add expense', error: error.message });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update an expense entry
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { title, amount, category, date, note } = req.body;

    let expense = await Expense.findOne({ _id: req.params.id, user: req.user.id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found or unauthorized' });
    }

    if (title !== undefined) expense.title = title;
    if (amount !== undefined) expense.amount = Number(amount);
    if (category !== undefined) expense.category = category;
    if (date !== undefined) expense.date = date;
    if (note !== undefined) expense.note = note;

    const updatedExpense = await expense.save();

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: updatedExpense
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update expense', error: error.message });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Remove an expense entry
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user.id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found or unauthorized' });
    }

    await Expense.deleteOne({ _id: expense._id });

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete expense', error: error.message });
  }
});

module.exports = router;
