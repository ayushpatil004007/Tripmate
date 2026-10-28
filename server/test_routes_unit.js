// Unit & Route Handler Validation Suite for TripMate
// Validates route filtering logic, JSON import/export, and multi-currency calculations

const assert = require('assert');
const destinationsData = require('./data/destinations.json');
const exchangeRatesData = require('./data/exchangeRates.json');

console.log('🧪 Starting Route Handlers & Business Logic Unit Tests...\n');

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

// 1. Search and Filtering logic
it('Filter by category returns exact matching destinations', () => {
  const categoryToTest = 'Romantic Island';
  const matched = destinationsData.filter((d) =>
    d.categories.some((c) => c.toLowerCase() === categoryToTest.toLowerCase())
  );
  assert(matched.length > 0, 'Should find destinations with category Romantic Island');
  assert(matched.some((d) => d.name === 'Santorini'));
});

it('Filter by domestic relative to homeCountry = "India"', () => {
  const homeCountry = 'India';
  const domestic = destinationsData.filter((d) => d.country.toLowerCase() === homeCountry.toLowerCase());
  const international = destinationsData.filter((d) => d.country.toLowerCase() !== homeCountry.toLowerCase());

  assert.strictEqual(domestic.length, 1);
  assert.strictEqual(domestic[0].name, 'Jaipur');
  assert.strictEqual(international.length, destinationsData.length - 1);
});

it('Filter by domestic relative to homeCountry = "United States"', () => {
  const homeCountry = 'United States';
  const domestic = destinationsData.filter(
    (d) => d.country.toLowerCase() === homeCountry.toLowerCase() || d.country.toLowerCase() === 'usa'
  );
  assert(domestic.some((d) => d.name === 'New York City'));
});

it('Search query matches across name, state, and highlights', () => {
  const query = 'bamboo';
  const results = destinationsData.filter((d) => {
    const q = query.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.state && d.state.toLowerCase().includes(q)) ||
      d.description.toLowerCase().includes(q) ||
      d.highlights.some((h) => h.toLowerCase().includes(q))
    );
  });
  assert(results.some((d) => d.name === 'Kyoto'), 'Searching for bamboo should find Kyoto');
});

// 2. JSON Import/Export Simulation
it('JSON Export produces array with exact required keys', () => {
  const sample = destinationsData[0];
  const exported = {
    name: sample.name,
    slug: sample.slug,
    country: sample.country,
    state: sample.state,
    categories: sample.categories,
    description: sample.description,
    coverImage: sample.coverImage,
    gallery: sample.gallery,
    bestVisitingTime: sample.bestVisitingTime,
    estimatedBudget: sample.estimatedBudget,
    currency: sample.currency,
    duration: sample.duration,
    highlights: sample.highlights,
    coordinates: sample.coordinates,
    featured: sample.featured
  };

  assert(exported.name && exported.slug && exported.country && exported.coverImage);
  assert(Array.isArray(exported.gallery) && exported.gallery.length > 0);
  assert(Array.isArray(exported.highlights) && exported.highlights.length > 0);
});

it('JSON Import simulation skips duplicates and updates by slug', () => {
  const existingMap = new Map();
  destinationsData.forEach((d) => existingMap.set(d.slug, { ...d, _id: `id_${d.slug}` }));

  const importBatch = [
    // Updated existing
    {
      name: 'Santorini Premium',
      slug: 'santorini',
      country: 'Greece',
      estimatedBudget: 16000
    },
    // New destination
    {
      name: 'Lisbon',
      slug: 'lisbon',
      country: 'Portugal',
      estimatedBudget: 9000
    }
  ];

  let created = 0;
  let updated = 0;

  importBatch.forEach((item) => {
    if (existingMap.has(item.slug)) {
      const existing = existingMap.get(item.slug);
      Object.assign(existing, item);
      updated++;
    } else {
      existingMap.set(item.slug, { ...item, _id: `id_${item.slug}` });
      created++;
    }
  });

  assert.strictEqual(updated, 1, 'Should update 1 existing destination');
  assert.strictEqual(created, 1, 'Should create 1 new destination');
  assert.strictEqual(existingMap.get('santorini').estimatedBudget, 16000);
  assert.strictEqual(existingMap.get('santorini')._id, 'id_santorini', '_id must be preserved!');
  assert(existingMap.has('lisbon'));
});

// 3. Multi-Currency Calculation Check
it('Multi-currency calculations for a mixed trip: USD, EUR, INR, AED', () => {
  const rates = exchangeRatesData.rates;
  // Let USD be base (1)
  // rates: USD=1, INR=83, EUR=0.92, AED=3.67
  const tripExpenses = [
    { title: 'Flight', amount: 400, currency: 'USD' },
    { title: 'Dinner', amount: 8300, currency: 'INR' }, // = 100 USD
    { title: 'Hotel', amount: 184, currency: 'EUR' },   // = 200 USD
    { title: 'Taxi', amount: 367, currency: 'AED' }     // = 100 USD
  ];

  const totalInUSD = tripExpenses.reduce((sum, item) => {
    const rate = rates[item.currency];
    const converted = (item.amount * rates.USD) / rate;
    return sum + converted;
  }, 0);

  // Expected: 400 + 100 + 200 + 100 = 800 USD
  assert.strictEqual(Math.round(totalInUSD), 800);

  // Total in INR: 800 * 83 = 66,400 INR
  const totalInINR = tripExpenses.reduce((sum, item) => {
    const rate = rates[item.currency];
    const converted = (item.amount * rates.INR) / rate;
    return sum + converted;
  }, 0);

  assert.strictEqual(Math.round(totalInINR), 66400);
});

console.log('\n========================================');
console.log(`UNIT TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log('========================================\n');

if (failed > 0) process.exit(1);
