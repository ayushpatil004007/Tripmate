// Full System End-to-End Test Runner
const mongoose = require('mongoose');
const { app } = require('./server');

const PORT = 5001;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tripmate';

async function runFullSystemTest() {
  console.log('🚀 Starting TripMate Full End-to-End Integration Suite...\n');

  // Connect to MongoDB if not connected
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI);
    console.log('📦 Connected to MongoDB');
  }

  // Start test server
  const server = app.listen(PORT, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  console.log(`🌐 Server listening on http://127.0.0.1:${PORT}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    console.log('Test 1: Health Check GET /api/health and /health');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    assert(healthRes.status === 200, 'Status 200 on /api/health');
    assert(health.status === 'OK', `Health status is OK (${health.status})`);
    assert(health.database === 'connected', 'Database is reported as connected');

    const rootHealthRes = await fetch(`http://127.0.0.1:${PORT}/health`);
    const rootHealth = await rootHealthRes.json();
    assert(rootHealthRes.status === 200, 'Status 200 on root /health');

    // 2. Fetch Destinations
    console.log('\nTest 2: Destinations Catalog GET /api/destinations');
    const destRes = await fetch(`${BASE_URL}/destinations`);
    const destData = await destRes.json();
    assert(destRes.status === 200, 'Destinations endpoint returned 200');
    assert(destData.success === true, 'Destinations returned success: true');
    assert(destData.count >= 10, `Destinations count is >= 10 (got ${destData.count})`);

    // 3. User Registration
    console.log('\nTest 3: User Registration POST /api/auth/register');
    const testEmail = `traveler_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Avrojit Dutta',
        email: testEmail,
        password: 'password123'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'User registration returned 201');
    assert(regData.success === true, 'Registration succeeded');
    assert(typeof regData.token === 'string', 'Received JWT token');
    const token = regData.token;

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // 4. Verify /api/auth/me
    console.log('\nTest 4: Verify Session GET /api/auth/me');
    const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Session verification returned 200');
    assert(meData.user.email === testEmail.toLowerCase(), 'Profile matches authenticated user');

    // 5. Create Trip (POST /api/trips)
    console.log('\nTest 5: Create Trip POST /api/trips');
    const tripRes = await fetch(`${BASE_URL}/trips`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Kyoto Autumn Journey',
        destination: 'Kyoto',
        startDate: '2026-11-01',
        endDate: '2026-11-08',
        totalBudget: 85000,
        dailyBudget: 12000,
        notes: 'JR Pass, photography tour'
      })
    });
    const tripData = await tripRes.json();
    assert(tripRes.status === 201, 'Trip created with status 201');
    assert(tripData.success === true, 'Trip created successfully');
    const tripId = tripData.data._id;

    // 6. Fetch Trips (GET /api/trips)
    console.log('\nTest 6: Retrieve Trips GET /api/trips');
    const tripsRes = await fetch(`${BASE_URL}/trips`, { headers: authHeaders });
    const tripsList = await tripsRes.json();
    assert(tripsRes.status === 200, 'Trips retrieved with status 200');
    assert(tripsList.count >= 1, 'Trips count >= 1');

    // 7. Update Trip (PUT /api/trips/:id)
    console.log('\nTest 7: Update Trip PUT /api/trips/:id');
    const updateTripRes = await fetch(`${BASE_URL}/trips/${tripId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        totalBudget: 90000,
        status: 'Ongoing'
      })
    });
    const updatedTripData = await updateTripRes.json();
    assert(updateTripRes.status === 200, 'Trip updated with status 200');
    assert(updatedTripData.data.totalBudget === 90000, 'Total budget updated to 90000');
    assert(updatedTripData.data.status === 'Ongoing', 'Trip status updated to Ongoing');

    // 8. Add Expenses (POST /api/expenses)
    console.log('\nTest 8: Add Expenses POST /api/expenses');
    const exp1 = await fetch(`${BASE_URL}/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tripId,
        title: 'Traditional Kaiseki Dinner',
        amount: 4500,
        category: 'Food',
        date: '2026-11-02',
        note: 'Gion district specialty'
      })
    });
    const exp1Data = await exp1.json();
    assert(exp1.status === 201, 'Expense 1 created with status 201');
    assert(exp1Data.data.amount === 4500, 'Expense 1 amount is 4500');
    const expenseId = exp1Data.data._id;

    const exp2 = await fetch(`${BASE_URL}/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tripId,
        title: 'Ryokan Stay 3 Nights',
        amount: 25000,
        category: 'Hotels',
        date: '2026-11-01',
        note: 'Onsen hot spring ryokan'
      })
    });
    const exp2Data = await exp2.json();
    assert(exp2.status === 201, 'Expense 2 created with status 201');

    // 9. Expense Summary Calculation (GET /api/expenses/summary/:tripId)
    console.log('\nTest 9: Expense Summary Calculation GET /api/expenses/summary/:tripId');
    const sumRes = await fetch(`${BASE_URL}/expenses/summary/${tripId}`, { headers: authHeaders });
    const sumData = await sumRes.json();
    assert(sumRes.status === 200, 'Summary endpoint returned 200');
    assert(sumData.data.totalSpent === 29500, `Total spent matches sum (got ${sumData.data.totalSpent})`);
    assert(sumData.data.remainingBalance === 90000 - 29500, `Remaining balance matches (got ${sumData.data.remainingBalance})`);
    assert(sumData.data.categoryTotals.Food === 4500, 'Category Food total matches 4500');
    assert(sumData.data.categoryTotals.Hotels === 25000, 'Category Hotels total matches 25000');

    // 10. Update & Delete Expense
    console.log('\nTest 10: Update & Delete Expense');
    const updateExpRes = await fetch(`${BASE_URL}/expenses/${expenseId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 5000
      })
    });
    assert(updateExpRes.status === 200, 'Expense updated with 200');

    // 11. Add Itinerary Items (POST /api/itinerary)
    console.log('\nTest 11: Add Itinerary Items POST /api/itinerary');
    const itin1 = await fetch(`${BASE_URL}/itinerary`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tripId,
        dayNumber: 1,
        placeName: 'Fushimi Inari Taisha',
        activity: 'Hike through thousands of torii gates up the sacred mountain.',
        time: '08:30 AM',
        visitOrder: 1,
        notes: 'Arrive early to avoid crowds'
      })
    });
    const itin1Data = await itin1.json();
    assert(itin1.status === 201, 'Itinerary item 1 added with 201');
    const itinId = itin1Data.data._id;

    const itin2 = await fetch(`${BASE_URL}/itinerary`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tripId,
        dayNumber: 1,
        placeName: 'Kiyomizu-dera Temple',
        activity: 'Visit wooden stage overlooking autumn leaves.',
        time: '02:00 PM',
        visitOrder: 2,
        notes: 'Sample fresh matcha ice cream'
      })
    });
    assert(itin2.status === 201, 'Itinerary item 2 added with 201');

    // 12. Fetch Itinerary Items (GET /api/itinerary?tripId=...)
    console.log('\nTest 12: Fetch Itinerary Items GET /api/itinerary?tripId=...');
    const itinListRes = await fetch(`${BASE_URL}/itinerary?tripId=${tripId}`, { headers: authHeaders });
    const itinList = await itinListRes.json();
    assert(itinListRes.status === 200, 'Itinerary retrieved with status 200');
    assert(itinList.count === 2, `Expected 2 itinerary items, got ${itinList.count}`);

    // 13. Update Itinerary Item (PUT /api/itinerary/:id)
    console.log('\nTest 13: Update Itinerary Item PUT /api/itinerary/:id');
    const updateItinRes = await fetch(`${BASE_URL}/itinerary/${itinId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        time: '08:00 AM'
      })
    });
    assert(updateItinRes.status === 200, 'Itinerary item updated with status 200');

    // 14. Cascade Delete Trip (DELETE /api/trips/:id)
    console.log('\nTest 14: Delete Trip with Cascade (DELETE /api/trips/:id)');
    const delTripRes = await fetch(`${BASE_URL}/trips/${tripId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    assert(delTripRes.status === 200, 'Trip deleted successfully');

    // Verify expenses and itinerary were cascaded
    const verifyExpRes = await fetch(`${BASE_URL}/expenses?tripId=${tripId}`, { headers: authHeaders });
    assert(verifyExpRes.status === 404, 'Cascaded expenses query returns 404 because trip is gone');

    const verifyItinRes = await fetch(`${BASE_URL}/itinerary?tripId=${tripId}`, { headers: authHeaders });
    assert(verifyItinRes.status === 404, 'Cascaded itinerary query returns 404 because trip is gone');

    // 15. Catch-All 404 JSON Test
    console.log('\nTest 15: Global Catch-All 404 returns JSON (never HTML)');
    const nonExistentRes = await fetch(`http://127.0.0.1:${PORT}/completely-unknown-route`);
    const nonExistentData = await nonExistentRes.json();
    assert(nonExistentRes.status === 404, 'Unknown route returns status 404');
    assert(nonExistentData.success === false, 'Unknown route response has success: false');
    assert(typeof nonExistentData.message === 'string', 'Unknown route returns JSON message');

    console.log('\n========================================');
    console.log(`FULL E2E TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runFullSystemTest().catch((err) => {
  console.error('Fatal E2E test error:', err);
  process.exit(1);
});
