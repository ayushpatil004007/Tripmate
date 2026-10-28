// Comprehensive Feature Validation Suite:
// Currency Converter, Multi-Currency Aggregations, Destination Data Architecture,
// Domestic/International Classification, JSON Import/Export, and Model Validation

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load Data & Models
const destinationsData = require('./data/destinations.json');
const exchangeRatesData = require('./data/exchangeRates.json');
const Destination = require('./models/Destination');
const Expense = require('./models/Expense');
const Trip = require('./models/Trip');
const User = require('./models/User');

// Currency Conversion Logic (mirroring client/src/utils/currency.js)
const RATES = exchangeRatesData.rates;
const convertCurrency = (amount, sourceCurrency, targetCurrency) => {
  const num = Number(amount);
  if (!num || isNaN(num) || num === 0) return 0;
  const src = String(sourceCurrency || 'USD').trim().toUpperCase();
  const tgt = String(targetCurrency || 'USD').trim().toUpperCase();
  if (src === tgt) return num;
  const srcRate = RATES[src];
  const tgtRate = RATES[tgt];
  if (!srcRate || !tgtRate) return num;
  return (num * tgtRate) / srcRate;
};

const classifyDestination = (destCountry, homeCountry) => {
  if (!destCountry || !homeCountry) return 'international';
  const normDest = String(destCountry).trim().toLowerCase();
  const normHome = String(homeCountry).trim().toLowerCase();
  const isMatch =
    normDest === normHome ||
    (normDest === 'usa' && normHome === 'united states') ||
    (normDest === 'united states' && normHome === 'usa') ||
    (normDest === 'uk' && normHome === 'united kingdom') ||
    (normDest === 'united kingdom' && normHome === 'uk') ||
    (normDest === 'uae' && normHome === 'united arab emirates') ||
    (normDest === 'united arab emirates' && normHome === 'uae');
  return isMatch ? 'domestic' : 'international';
};

const formatDualCurrency = (amount, origCurr, dispCurr) => {
  if (origCurr === dispCurr) return `${dispCurr} ${amount}`;
  const converted = convertCurrency(amount, origCurr, dispCurr);
  return `${dispCurr} ${Math.round(converted)} (≈ ${origCurr} ${amount})`;
};

async function runSuite() {
  console.log('🧪 Starting TripMate Feature Verification Suite...\n');

  let passed = 0;
  let failed = 0;

  function test(desc, fn) {
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

  // =========================================================================
  // Section 1: Exchange Rates & Currency Conversion Math
  // =========================================================================
  console.log('--- 1. Static Currency Converter & Math ---');

  test('Base currency is USD in exchangeRates.json', () => {
    assert.strictEqual(exchangeRatesData.baseCurrency, 'USD');
    assert.strictEqual(exchangeRatesData.rates.USD, 1);
  });

  test('Supported rates include USD, INR, EUR, GBP, AED, IDR', () => {
    const required = ['USD', 'INR', 'EUR', 'GBP', 'AED', 'IDR'];
    required.forEach((code) => {
      assert(RATES[code] !== undefined, `Missing currency rate for ${code}`);
      assert(RATES[code] > 0, `Rate for ${code} must be positive`);
    });
  });

  test('Formula: convertedAmount = amount × targetRate ÷ sourceRate', () => {
    // 100 USD to INR: 100 * 83 / 1 = 8300
    const inr = convertCurrency(100, 'USD', 'INR');
    assert.strictEqual(inr, 8300);

    // 8300 INR to USD: 8300 * 1 / 83 = 100
    const usd = convertCurrency(8300, 'INR', 'USD');
    assert.strictEqual(usd, 100);

    // Swap back and forth gives exact original amount
    const swapped = convertCurrency(convertCurrency(500, 'USD', 'EUR'), 'EUR', 'USD');
    assert(Math.abs(swapped - 500) < 0.0001);
  });

  test('Multi-currency conversion: EUR to INR', () => {
    // 100 EUR -> USD: 100 / 0.92 = 108.6956... -> INR: 108.6956 * 83 = 9021.739...
    const eurToInr = convertCurrency(100, 'EUR', 'INR');
    const expected = (100 * 83) / 0.92;
    assert.strictEqual(eurToInr, expected);
  });

  test('Zero and negative amounts handling', () => {
    assert.strictEqual(convertCurrency(0, 'USD', 'INR'), 0);
    assert.strictEqual(convertCurrency(null, 'USD', 'INR'), 0);
    assert.strictEqual(convertCurrency('', 'USD', 'INR'), 0);
    assert.strictEqual(convertCurrency(-50, 'USD', 'INR'), -50 * 83);
  });

  test('Unsupported or missing currencies return original amount gracefully', () => {
    const res = convertCurrency(100, 'FAKE_CURRENCY', 'USD');
    assert.strictEqual(res, 100);

    const res2 = convertCurrency(100, 'USD', 'UNKNOWN');
    assert.strictEqual(res2, 100);
  });

  test('Dual currency display formatting: e.g. ₹4,150 (≈ $50 USD)', () => {
    const formatted = formatDualCurrency(50, 'USD', 'INR');
    assert(formatted.includes('INR 4150'));
    assert(formatted.includes('USD 50'));
  });

  // =========================================================================
  // Section 2: Home Country & Domestic/International Classification
  // =========================================================================
  console.log('\n--- 2. Home Country & Classification ---');

  test('India as home country classifies Jaipur as domestic and Kyoto as international', () => {
    assert.strictEqual(classifyDestination('India', 'India'), 'domestic');
    assert.strictEqual(classifyDestination('Japan', 'India'), 'international');
    assert.strictEqual(classifyDestination('Greece', 'India'), 'international');
    assert.strictEqual(classifyDestination('France', 'India'), 'international');
  });

  test('United States as home country classifies New York as domestic and Bali as international', () => {
    assert.strictEqual(classifyDestination('United States', 'United States'), 'domestic');
    assert.strictEqual(classifyDestination('USA', 'United States'), 'domestic');
    assert.strictEqual(classifyDestination('Indonesia', 'United States'), 'international');
  });

  test('United Arab Emirates aliases match correctly', () => {
    assert.strictEqual(classifyDestination('United Arab Emirates', 'UAE'), 'domestic');
    assert.strictEqual(classifyDestination('UAE', 'United Arab Emirates'), 'domestic');
  });

  // =========================================================================
  // Section 3: Destination Data Architecture & Schema Validation
  // =========================================================================
  console.log('\n--- 3. Destination Schema & JSON Data Architecture ---');

  test('destinations.json contains at least 10 rich destination records', () => {
    assert(Array.isArray(destinationsData), 'destinations.json must be an array');
    assert(destinationsData.length >= 10, `Expected at least 10, got ${destinationsData.length}`);
  });

  test('Every destination in destinations.json contains all required schema fields', () => {
    const requiredFields = [
      'name',
      'slug',
      'country',
      'state',
      'categories',
      'description',
      'coverImage',
      'gallery',
      'bestVisitingTime',
      'estimatedBudget',
      'currency',
      'duration',
      'highlights',
      'coordinates',
      'featured'
    ];

    destinationsData.forEach((d) => {
      requiredFields.forEach((field) => {
        assert(d[field] !== undefined, `Destination "${d.name}" missing required field "${field}"`);
      });
      assert(Array.isArray(d.categories) && d.categories.length > 0, `Destination "${d.name}" categories must be non-empty array`);
      assert(Array.isArray(d.gallery) && d.gallery.length > 0, `Destination "${d.name}" gallery must be non-empty array`);
      assert(Array.isArray(d.highlights) && d.highlights.length > 0, `Destination "${d.name}" highlights must be non-empty array`);
      assert(typeof d.coordinates.lat === 'number', `Destination "${d.name}" lat must be a number`);
      assert(typeof d.coordinates.lng === 'number', `Destination "${d.name}" lng must be a number`);
      assert(typeof d.estimatedBudget === 'number' && d.estimatedBudget > 0, `Destination "${d.name}" estimatedBudget must be positive number`);
    });
  });

  test('All slugs in destinations.json are unique and lowercase', () => {
    const slugs = new Set();
    destinationsData.forEach((d) => {
      assert.strictEqual(d.slug, d.slug.toLowerCase(), `Slug "${d.slug}" must be lowercase`);
      assert(!slugs.has(d.slug), `Duplicate slug detected: ${d.slug}`);
      slugs.add(d.slug);
    });
  });

  test('Destination Mongoose model validates schema and backward compatibility virtuals', () => {
    const destDoc = new Destination({
      name: 'Test Destination',
      country: 'Testland',
      description: 'A beautiful test destination',
      coverImage: 'https://images.unsplash.com/test-cover.jpg',
      estimatedBudget: 4200,
      currency: 'EUR'
    });

    // Validate auto-slug generation
    const validationError = destDoc.validateSync();
    assert(!validationError, `Validation failed: ${validationError?.message}`);
    assert.strictEqual(destDoc.slug, 'test-destination');

    // Virtual backward compatibility check
    assert.strictEqual(destDoc.imageUrl, 'https://images.unsplash.com/test-cover.jpg');
    assert.strictEqual(destDoc.averageCostPerDay, 4200);
    assert.strictEqual(destDoc.category, 'Adventure');

    // Setter backward compatibility check
    destDoc.imageUrl = 'https://images.unsplash.com/updated.jpg';
    assert.strictEqual(destDoc.coverImage, 'https://images.unsplash.com/updated.jpg');
    destDoc.averageCostPerDay = 9000;
    assert.strictEqual(destDoc.estimatedBudget, 9000);
  });

  test('Local destination asset folders exist on disk for each destination', () => {
    destinationsData.forEach((d) => {
      const dir = path.join(__dirname, '..', 'client', 'public', 'destinations', d.slug);
      assert(fs.existsSync(dir), `Local directory client/public/destinations/${d.slug} must exist`);
      assert(fs.existsSync(path.join(dir, 'cover.svg')), `cover.svg must exist in ${d.slug}`);
      assert(fs.existsSync(path.join(dir, 'info.json')), `info.json must exist in ${d.slug}`);
    });
  });

  // =========================================================================
  // Section 4: Multi-Currency Expense Model & Multi-Currency Sum Calculations
  // =========================================================================
  console.log('\n--- 4. Multi-Currency Budget & Expense Calculations ---');

  test('Expense model supports and validates currency field', () => {
    const expense = new Expense({
      trip: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      title: 'Dinner at Tokyo',
      amount: 4500,
      currency: 'JPY',
      category: 'Food'
    });
    const err = expense.validateSync();
    assert(!err, `Expense validation error: ${err?.message}`);
    assert.strictEqual(expense.currency, 'JPY');
    assert.strictEqual(expense.amount, 4500);
  });

  test('Multi-currency expenses do NOT add raw amounts directly; converted consistently', () => {
    // Scenario: A trip with expenses recorded in different currencies:
    // Expense 1: 50 USD
    // Expense 2: 4150 INR (at rate 83 INR/USD = exactly 50 USD)
    // Expense 3: 46 EUR (at rate 0.92 EUR/USD = exactly 50 USD)
    // Total should be 150 USD, or in INR: 150 * 83 = 12450 INR.
    const mockExpenses = [
      { amount: 50, currency: 'USD', category: 'Food' },
      { amount: 4150, currency: 'INR', category: 'Hotels' },
      { amount: 46, currency: 'EUR', category: 'Travel' }
    ];

    // Raw naive sum would be 50 + 4150 + 46 = 4246 (COMPLETELY WRONG!)
    const rawSum = mockExpenses.reduce((s, e) => s + e.amount, 0);
    assert.strictEqual(rawSum, 4246);

    // Correct sum in USD:
    const sumUSD = mockExpenses.reduce((s, e) => s + convertCurrency(e.amount, e.currency, 'USD'), 0);
    assert.strictEqual(Math.round(sumUSD), 150);

    // Correct sum in INR:
    const sumINR = mockExpenses.reduce((s, e) => s + convertCurrency(e.amount, e.currency, 'INR'), 0);
    assert.strictEqual(Math.round(sumINR), 12450);

    // Stored amounts are NEVER mutated by currency conversion
    assert.strictEqual(mockExpenses[0].amount, 50);
    assert.strictEqual(mockExpenses[1].amount, 4150);
    assert.strictEqual(mockExpenses[2].amount, 46);
  });

  test('Destination budget comparison converts estimated budget before comparison', () => {
    const destBudgetInINR = 14500; // Santorini estimated budget: ₹14,500 INR
    const userPlannedDailyInUSD = 200; // User planned $200 USD per day

    // Compare in USD:
    const destBudgetInUSD = convertCurrency(destBudgetInINR, 'INR', 'USD');
    const expectedUSD = 14500 / 83; // ~174.69 USD
    assert(Math.abs(destBudgetInUSD - expectedUSD) < 0.01);

    // Comparison in USD: User has $200/day vs destination average ~$175/day
    const diff = userPlannedDailyInUSD - destBudgetInUSD;
    assert(diff > 0, 'User daily target is above destination estimate');

    // Compare in INR:
    const userPlannedDailyInINR = convertCurrency(userPlannedDailyInUSD, 'USD', 'INR');
    assert.strictEqual(userPlannedDailyInINR, 16600);
    const diffINR = userPlannedDailyInINR - destBudgetInINR;
    assert.strictEqual(diffINR, 16600 - 14500);
  });

  // =========================================================================
  // Section 5: User Model & Preferences Persistence
  // =========================================================================
  console.log('\n--- 5. User Model & Preferences Architecture ---');

  test('User model supports homeCountry, preferredCurrency, and role', () => {
    const user = new User({
      name: 'Avrojit',
      email: 'avro@example.com',
      password: 'password123',
      homeCountry: 'United Kingdom',
      preferredCurrency: 'GBP',
      role: 'admin'
    });
    const err = user.validateSync();
    assert(!err, `User validation failed: ${err?.message}`);
    assert.strictEqual(user.homeCountry, 'United Kingdom');
    assert.strictEqual(user.preferredCurrency, 'GBP');
    assert.strictEqual(user.role, 'admin');
  });

  // =========================================================================
  // Section 6: JSON Import/Export Idempotence Check
  // =========================================================================
  console.log('\n--- 6. JSON Export & Import Architecture ---');

  test('Export payload structure conforms exactly to import requirements', () => {
    const sampleExport = destinationsData.map((d) => ({
      name: d.name,
      slug: d.slug,
      country: d.country,
      state: d.state,
      categories: d.categories,
      description: d.description,
      coverImage: d.coverImage,
      gallery: d.gallery,
      bestVisitingTime: d.bestVisitingTime,
      estimatedBudget: d.estimatedBudget,
      currency: d.currency,
      duration: d.duration,
      highlights: d.highlights,
      coordinates: d.coordinates,
      featured: d.featured
    }));

    // Verify it is serializable and deserializable without loss
    const serialized = JSON.stringify(sampleExport);
    const deserialized = JSON.parse(serialized);
    assert.strictEqual(deserialized.length, destinationsData.length);
    assert.strictEqual(deserialized[0].name, 'Santorini');
    assert.strictEqual(deserialized[0].slug, 'santorini');
    assert.strictEqual(deserialized[0].currency, 'INR');
  });

  console.log('\n========================================');
  console.log(`SUITE RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
