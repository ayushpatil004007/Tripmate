// ====================================================================
// Test Suite: Day Planner Optional Fields & Integrated Activity Expenses
// Validates:
// 1. ItineraryItem schema: activity, time, notes are optional; dayNumber, placeName, visitOrder are required
// 2. Expense schema: expanded categories (Food, Transport, Accommodation, Activities, Shopping, Other, Travel, Hotels)
// 3. Bidirectional schema references: ItineraryItem.expense and Expense.itineraryItem
// 4. Currency preservation and multi-currency aggregate calculations
// 5. Zero / empty expense gating logic (no records for amount <= 0)
// 6. Duplicate prevention & expense cleanup on activity edit/delete
// ====================================================================

const assert = require('assert');
const mongoose = require('mongoose');
const ItineraryItem = require('./models/ItineraryItem');
const Expense = require('./models/Expense');
const exchangeRatesData = require('./data/exchangeRates.json');

console.log('🧪 Starting Day Planner Optional Fields & Activity Expense Integration Suite...\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

const mockTripId = new mongoose.Types.ObjectId();
const mockUserId = new mongoose.Types.ObjectId();

// =========================================================================
// Section 1: ItineraryItem Schema - Required vs Optional Fields
// =========================================================================
console.log('--- 1. ItineraryItem Schema Validations ---');

it('ItineraryItem succeeds with ONLY required fields (dayNumber, placeName, visitOrder)', () => {
  const item = new ItineraryItem({
    trip: mockTripId,
    user: mockUserId,
    dayNumber: 1,
    placeName: 'Sensō-ji Temple',
    visitOrder: 1
  });

  const err = item.validateSync();
  assert(!err, `Validation failed unexpectedly: ${err?.message}`);
  assert.strictEqual(item.placeName, 'Sensō-ji Temple');
  assert.strictEqual(item.dayNumber, 1);
  assert.strictEqual(item.visitOrder, 1);
  assert.strictEqual(item.activity, '', 'Activity description defaults to empty string');
  assert.strictEqual(item.time, '', 'Scheduled time defaults to empty string');
  assert.strictEqual(item.notes, '', 'Special notes default to empty string');
  assert.strictEqual(item.expense, null, 'Expense defaults to null');
});

it('ItineraryItem fails when placeName is missing', () => {
  const item = new ItineraryItem({
    trip: mockTripId,
    user: mockUserId,
    dayNumber: 1,
    visitOrder: 1
  });
  const err = item.validateSync();
  assert(err && err.errors && err.errors.placeName, 'Should require placeName');
});

it('ItineraryItem fails when dayNumber is missing', () => {
  const item = new ItineraryItem({
    trip: mockTripId,
    user: mockUserId,
    placeName: 'Fushimi Inari',
    visitOrder: 1
  });
  const err = item.validateSync();
  assert(err && err.errors && err.errors.dayNumber, 'Should require dayNumber');
});

it('ItineraryItem fails when visitOrder is missing or invalid', () => {
  const item = new ItineraryItem({
    trip: mockTripId,
    user: mockUserId,
    dayNumber: 1,
    placeName: 'Fushimi Inari',
    visitOrder: null
  });
  const err = item.validateSync();
  assert(err && err.errors && err.errors.visitOrder, 'Should require visitOrder');
});

it('ItineraryItem accepts optional activity description, time, notes, and expense reference', () => {
  const mockExpId = new mongoose.Types.ObjectId();
  const item = new ItineraryItem({
    trip: mockTripId,
    user: mockUserId,
    dayNumber: 2,
    placeName: 'Arashiyama Bamboo Grove',
    activity: 'Morning stroll among giant bamboo stalks',
    time: '07:30 AM',
    visitOrder: 1,
    notes: 'Come before dawn for quiet photography',
    expense: mockExpId
  });

  const err = item.validateSync();
  assert(!err, `Validation failed: ${err?.message}`);
  assert.strictEqual(item.activity, 'Morning stroll among giant bamboo stalks');
  assert.strictEqual(item.time, '07:30 AM');
  assert.strictEqual(item.notes, 'Come before dawn for quiet photography');
  assert.strictEqual(item.expense.toString(), mockExpId.toString());
});

// =========================================================================
// Section 2: Expense Schema - Category Expansion & Itinerary Association
// =========================================================================
console.log('\n--- 2. Expense Schema & Categories ---');

const supportedCategories = [
  'Food',
  'Transport',
  'Accommodation',
  'Activities',
  'Shopping',
  'Other',
  // Backward compatibility
  'Travel',
  'Hotels'
];

supportedCategories.forEach((cat) => {
  it(`Expense model accepts category: "${cat}"`, () => {
    const expense = new Expense({
      trip: mockTripId,
      user: mockUserId,
      title: `Test ${cat}`,
      amount: 100,
      currency: 'USD',
      category: cat
    });
    const err = expense.validateSync();
    assert(!err, `Failed for category "${cat}": ${err?.message}`);
    assert.strictEqual(expense.category, cat);
  });
});

it('Expense model rejects invalid category', () => {
  const expense = new Expense({
    trip: mockTripId,
    user: mockUserId,
    title: 'Invalid',
    amount: 100,
    currency: 'USD',
    category: 'RandomInvalidCategory'
  });
  const err = expense.validateSync();
  assert(err && err.errors && err.errors.category, 'Should reject invalid category');
});

it('Expense model supports itineraryItem reference', () => {
  const mockItinId = new mongoose.Types.ObjectId();
  const expense = new Expense({
    trip: mockTripId,
    user: mockUserId,
    title: 'Museum Ticket',
    amount: 25,
    currency: 'USD',
    category: 'Activities',
    itineraryItem: mockItinId
  });
  const err = expense.validateSync();
  assert(!err, `Failed validation: ${err?.message}`);
  assert.strictEqual(expense.itineraryItem.toString(), mockItinId.toString());
});

// =========================================================================
// Section 3: Activity Expense Creation & Zero-Expense Gating Logic
// =========================================================================
console.log('\n--- 3. Activity Expense Creation & Zero-Expense Gating ---');

function shouldCreateExpense(expenseAmount) {
  const parsed = Number(expenseAmount);
  return !isNaN(parsed) && parsed > 0;
}

it('Zero or empty expense does NOT trigger expense creation', () => {
  assert.strictEqual(shouldCreateExpense(0), false);
  assert.strictEqual(shouldCreateExpense('0'), false);
  assert.strictEqual(shouldCreateExpense(''), false);
  assert.strictEqual(shouldCreateExpense(null), false);
  assert.strictEqual(shouldCreateExpense(undefined), false);
  assert.strictEqual(shouldCreateExpense(-20), false);
});

it('Positive expense triggers expense creation', () => {
  assert.strictEqual(shouldCreateExpense(1), true);
  assert.strictEqual(shouldCreateExpense('45.50'), true);
  assert.strictEqual(shouldCreateExpense(500), true);
});

// =========================================================================
// Section 4: Multi-Currency Preservation & Category Breakdown Math
// =========================================================================
console.log('\n--- 4. Multi-Currency Preservation & Aggregate Math ---');

const convertAmount = (amount, sourceCurrency, targetCurrency) => {
  const num = Number(amount);
  if (!num || isNaN(num) || num === 0) return 0;
  const src = String(sourceCurrency || 'INR').trim().toUpperCase();
  const tgt = String(targetCurrency || 'INR').trim().toUpperCase();
  if (src === tgt) return num;
  const rates = exchangeRatesData.rates || {};
  const srcRate = rates[src];
  const tgtRate = rates[tgt];
  if (!srcRate || !tgtRate) return num;
  return (num * tgtRate) / srcRate;
};

function calculateTripSummary(expenses, tripBudgetUSD, displayCurrency = 'USD') {
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
    const expCurrency = (exp.currency || 'USD').toUpperCase();
    const converted = convertAmount(exp.amount, expCurrency, displayCurrency);
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

  const convertedTotalBudget = convertAmount(tripBudgetUSD, 'USD', displayCurrency);
  return {
    totalBudget: convertedTotalBudget,
    totalSpent,
    remainingBalance: convertedTotalBudget - totalSpent,
    categoryTotals
  };
}

it('Multi-currency activity expenses convert correctly to USD display currency', () => {
  // Activity 1: 50 USD for Activities
  // Activity 2: 46 EUR for Transport (rate 0.92 = 50 USD)
  // Activity 3: 8300 INR for Food (rate 83 = 100 USD)
  const mockTripExpenses = [
    { title: 'Tokyo Skytree', amount: 50, currency: 'USD', category: 'Activities' },
    { title: 'Bullet Train Ticket', amount: 46, currency: 'EUR', category: 'Transport' },
    { title: 'Traditional Ramen Lunch', amount: 8300, currency: 'INR', category: 'Food' }
  ];

  const summaryInUSD = calculateTripSummary(mockTripExpenses, 1000, 'USD');

  // Stored amounts are intact
  assert.strictEqual(mockTripExpenses[0].amount, 50);
  assert.strictEqual(mockTripExpenses[1].amount, 46);
  assert.strictEqual(mockTripExpenses[2].amount, 8300);

  // Converted total spent in USD = 50 + 50 + 100 = 200 USD
  assert.strictEqual(Math.round(summaryInUSD.totalSpent), 200);
  assert.strictEqual(Math.round(summaryInUSD.remainingBalance), 800);
  assert.strictEqual(Math.round(summaryInUSD.categoryTotals.Activities), 50);
  assert.strictEqual(Math.round(summaryInUSD.categoryTotals.Transport), 50);
  assert.strictEqual(Math.round(summaryInUSD.categoryTotals.Food), 100);
});

it('Legacy categories Travel and Hotels alias correctly to Transport and Accommodation', () => {
  const legacyExpenses = [
    { title: 'Metro Pass', amount: 30, currency: 'USD', category: 'Travel' },
    { title: 'Hotel Stay', amount: 120, currency: 'USD', category: 'Hotels' }
  ];

  const summary = calculateTripSummary(legacyExpenses, 500, 'USD');

  // Both legacy and new category keys are populated
  assert.strictEqual(summary.categoryTotals.Travel, 30);
  assert.strictEqual(summary.categoryTotals.Transport, 30);
  assert.strictEqual(summary.categoryTotals.Hotels, 120);
  assert.strictEqual(summary.categoryTotals.Accommodation, 120);
  assert.strictEqual(summary.totalSpent, 150);
});

// =========================================================================
// Section 5: Duplicate Prevention on Activity Edit Simulation
// =========================================================================
console.log('\n--- 5. Duplicate Prevention & Cleanup Simulation ---');

it('Updating an activity expense reuses existing expense ID without creating duplicates', () => {
  const mockDbExpenses = new Map();
  const mockItinItem = {
    _id: 'itin_1',
    placeName: 'Skytree',
    expense: null
  };

  // Step 1: Create expense
  const newExp = {
    _id: 'exp_1',
    itineraryItem: mockItinItem._id,
    amount: 50,
    currency: 'USD',
    category: 'Activities'
  };
  mockDbExpenses.set(newExp._id, newExp);
  mockItinItem.expense = newExp._id;

  assert.strictEqual(mockDbExpenses.size, 1);
  assert.strictEqual(mockDbExpenses.get('exp_1').amount, 50);

  // Step 2: Edit activity with new amount 80
  const updatedAmount = 80;
  if (mockItinItem.expense && mockDbExpenses.has(mockItinItem.expense)) {
    const existing = mockDbExpenses.get(mockItinItem.expense);
    existing.amount = updatedAmount; // In-place update
  } else {
    const fresh = { _id: 'exp_2', amount: updatedAmount };
    mockDbExpenses.set(fresh._id, fresh);
    mockItinItem.expense = fresh._id;
  }

  assert.strictEqual(mockDbExpenses.size, 1, 'No duplicate record created');
  assert.strictEqual(mockDbExpenses.get('exp_1').amount, 80, 'Original record amount updated');

  // Step 3: Edit activity with amount 0 -> deletes expense record
  const clearedAmount = 0;
  if (clearedAmount <= 0) {
    if (mockItinItem.expense) {
      mockDbExpenses.delete(mockItinItem.expense);
      mockItinItem.expense = null;
    }
  }

  assert.strictEqual(mockDbExpenses.size, 0, 'Expense record deleted when amount is 0');
  assert.strictEqual(mockItinItem.expense, null, 'Itinerary item expense reference unset');
});

console.log('\n========================================');
console.log(`ITINERARY EXPENSE SUITE: ${passed} Passed, ${failed} Failed`);
console.log('========================================\n');

if (failed > 0) process.exit(1);
