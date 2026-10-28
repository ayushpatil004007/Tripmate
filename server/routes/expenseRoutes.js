// Expense Tracking REST Routes with Multi-Currency Calculations
const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Trip = require('../models/Trip');
const ItineraryItem = require('../models/ItineraryItem');
const authMiddleware = require('../middleware/authMiddleware');
const exchangeRatesData = require('../data/exchangeRates.json');

// Protect all expense routes with authentication
router.use(authMiddleware);

// Helper for currency conversion using static rates
const convertAmount = (amount, sourceCurrency, targetCurrency) => {
  const num = Number(amount);
  if (!num || isNaN(num) || num === 0) return 0;

  const src = String(sourceCurrency || 'INR').trim().toUpperCase();
  const tgt = String(targetCurrency || 'INR').trim().toUpperCase();

  if (src === tgt) return num;

  const rates = exchangeRatesData.rates || {};
  const srcRate = rates[src];
  const tgtRate = rates[tgt];

  if (!srcRate || !tgtRate) {
    // If either rate is unknown, return unchanged
    return num;
  }

  // Formula: convertedAmount = amount × targetRate ÷ sourceRate
  return (num * tgtRate) / srcRate;
};

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
// @desc    Calculate multi-currency budget totals and category breakdowns
// @access  Private
router.get('/summary/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { displayCurrency } = req.query;

    const trip = await Trip.findOne({ _id: tripId, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized' });
    }

    const expenses = await Expense.find({ trip: tripId, user: req.user.id });

    // Target currency for aggregate reporting
    const tripCurrency = (trip.currency || 'INR').toUpperCase();
    const activeCurrency = (displayCurrency || tripCurrency).toUpperCase();

    // Convert trip total and daily budgets to active display currency
    const convertedTotalBudget = convertAmount(trip.totalBudget || 0, tripCurrency, activeCurrency);
    const convertedDailyBudget = convertAmount(trip.dailyBudget || 0, tripCurrency, activeCurrency);

    // Sum all expenses converted to active display currency
    let totalSpent = 0;
    const categoryTotals = {
      Food: 0,
      Transport: 0,
      Accommodation: 0,
      Activities: 0,
      Shopping: 0,
      Other: 0,
      Travel: 0,
      Hotels: 0
    };

    for (const exp of expenses) {
      const expCurrency = (exp.currency || 'INR').toUpperCase();
      const converted = convertAmount(exp.amount, expCurrency, activeCurrency);
      totalSpent += converted;

      const cat = exp.category;
      if (cat === 'Travel') {
        categoryTotals.Travel += converted;
        categoryTotals.Transport += converted;
      } else if (cat === 'Transport') {
        categoryTotals.Transport += converted;
        categoryTotals.Travel += converted;
      } else if (cat === 'Hotels') {
        categoryTotals.Hotels += converted;
        categoryTotals.Accommodation += converted;
      } else if (cat === 'Accommodation') {
        categoryTotals.Accommodation += converted;
        categoryTotals.Hotels += converted;
      } else if (categoryTotals[cat] !== undefined) {
        categoryTotals[cat] += converted;
      } else {
        categoryTotals['Other'] += converted;
      }
    }

    const remainingBalance = convertedTotalBudget - totalSpent;

    res.status(200).json({
      success: true,
      data: {
        tripId: trip._id,
        tripTitle: trip.title,
        tripCurrency,
        displayCurrency: activeCurrency,
        rawTotalBudget: trip.totalBudget || 0,
        rawDailyBudget: trip.dailyBudget || 0,
        totalBudget: convertedTotalBudget,
        dailyBudget: convertedDailyBudget,
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
// @desc    Record a new expense with currency preservation
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { tripId, title, amount, currency, category, date, note, itineraryItemId } = req.body;

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

    const expenseCurrency = currency ? String(currency).trim().toUpperCase() : (trip.currency || 'INR');

    const expense = await Expense.create({
      trip: tripId,
      user: req.user.id,
      title: String(title).trim(),
      amount: Number(amount),
      currency: expenseCurrency,
      category,
      date: date || new Date(),
      note: note ? String(note).trim() : '',
      itineraryItem: itineraryItemId || null
    });

    if (itineraryItemId) {
      await ItineraryItem.updateOne(
        { _id: itineraryItemId, user: req.user.id },
        { expense: expense._id }
      );
    }

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
    const { title, amount, currency, category, date, note } = req.body;

    let expense = await Expense.findOne({ _id: req.params.id, user: req.user.id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found or unauthorized' });
    }

    if (title !== undefined) expense.title = String(title).trim();
    if (amount !== undefined) expense.amount = Number(amount);
    if (currency !== undefined) expense.currency = String(currency).trim().toUpperCase();
    if (category !== undefined) expense.category = category;
    if (date !== undefined) expense.date = date;
    if (note !== undefined) expense.note = String(note).trim();

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

    if (expense.itineraryItem) {
      await ItineraryItem.updateOne(
        { _id: expense.itineraryItem, user: req.user.id },
        { expense: null }
      );
    }
    await ItineraryItem.updateMany(
      { expense: expense._id, user: req.user.id },
      { expense: null }
    );

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
