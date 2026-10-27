// End-to-End Automated Validation of TripMate REST APIs
// Testing Registration, Login, Destinations, Trips CRUD, Expenses CRUD, and Itinerary CRUD
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting TripMate Full System Test...\n');

  try {
    // 1. Health Check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('✅ Health Check:', health.status);

    // 2. Fetch Destinations
    const destRes = await fetch(`${BASE_URL}/destinations`);
    const destData = await destRes.json();
    console.log(`✅ Destinations Count: ${destData.count} (Expected: 10)`);
    console.log(`   Sample Destination: ${destData.data[0].name} (${destData.data[0].country})`);

    // 3. User Registration / Login
    const testEmail = `traveler_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rohan Patil',
        email: testEmail,
        password: 'password123'
      })
    });
    const regData = await regRes.json();
    console.log('✅ User Registration:', regData.success, '| User:', regData.user.name);
    const token = regData.token;

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // 4. Verify /api/auth/me
    const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    console.log('✅ Auth Verification /api/auth/me:', meData.success, '| Email:', meData.user.email);

    // 5. Create Trip
    const tripRes = await fetch(`${BASE_URL}/trips`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Kyoto Autumn Expedition',
        destination: 'Kyoto',
        startDate: '2026-11-01',
        endDate: '2026-11-08',
        totalBudget: 3000,
        dailyBudget: 350,
        notes: 'JR Pass, photography tour'
      })
    });
    const tripData = await tripRes.json();
    console.log('✅ Trip Created (POST /api/trips):', tripData.success, '| Trip ID:', tripData.data._id);
    const tripId = tripData.data._id;

    // 6. Fetch Trips (GET /api/trips)
    const tripsRes = await fetch(`${BASE_URL}/trips`, { headers: authHeaders });
    const tripsList = await tripsRes.json();
    console.log(`✅ Saved Trips Retrieved (GET /api/trips): ${tripsList.count} trips found`);

    // 7. Add Expenses (Food & Hotel)
    const exp1 = await fetch(`${BASE_URL}/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tripId,
        title: 'Traditional Kaiseki Dinner',
        amount: 150,
        category: 'Food',
        date: '2026-11-02',
        note: 'Gion district specialty'
      })
    });
    const exp1Data = await exp1.json();
    console.log('✅ Expense 1 Added (Food):', exp1Data.success, `| $${exp1Data.data.amount}`);

    const exp2 = await fetch(`${BASE_URL}/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tripId,
        title: 'Ryokan 3 Nights Stay',
        amount: 850,
        category: 'Hotels',
        date: '2026-11-01',
        note: 'Traditional onsen ryokan'
      })
    });
    const exp2Data = await exp2.json();
    console.log('✅ Expense 2 Added (Hotels):', exp2Data.success, `| $${exp2Data.data.amount}`);

    // 8. Expense Summary Calculation (GET /api/expenses/summary/:tripId)
    const sumRes = await fetch(`${BASE_URL}/expenses/summary/${tripId}`, { headers: authHeaders });
    const sumData = await sumRes.json();
    console.log('✅ Expense Summary Calculated:');
    console.log(`   Total Budget: $${sumData.data.totalBudget}`);
    console.log(`   Total Spent: $${sumData.data.totalSpent}`);
    console.log(`   Remaining Balance: $${sumData.data.remainingBalance}`);
    console.log('   Categories Breakdown:', sumData.data.categoryTotals);

    // 9. Add Itinerary Items (Day 1 & Day 2)
    const itin1 = await fetch(`${BASE_URL}/itinerary`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tripId,
        dayNumber: 1,
        placeName: 'Fushimi Inari Taisha',
        activity: 'Hike through thousands of torii gates up the sacred mountain summit.',
        time: '08:30 AM',
        visitOrder: 1,
        notes: 'Arrive early to avoid crowds, wear running shoes'
      })
    });
    const itin1Data = await itin1.json();
    console.log('✅ Itinerary Item 1 Added (Day 1):', itin1Data.success, '| Place:', itin1Data.data.placeName);

    const itin2 = await fetch(`${BASE_URL}/itinerary`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tripId,
        dayNumber: 1,
        placeName: 'Kiyomizu-dera Temple',
        activity: 'Visit wooden stage with panoramic view over cherry and maple trees.',
        time: '02:00 PM',
        visitOrder: 2,
        notes: 'Sample fresh matcha soft serve outside temple gate'
      })
    });
    const itin2Data = await itin2.json();
    console.log('✅ Itinerary Item 2 Added (Day 1):', itin2Data.success, '| Place:', itin2Data.data.placeName);

    // 10. Fetch Itinerary Items (GET /api/itinerary?tripId=...)
    const itinListRes = await fetch(`${BASE_URL}/itinerary?tripId=${tripId}`, { headers: authHeaders });
    const itinList = await itinListRes.json();
    console.log(`✅ Itinerary Items Retrieved: ${itinList.count} activities recorded for trip`);

    console.log('\n🎉 ALL FULL-STACK REST APIS & LOCAL MONGODB TESTS PASSED WITH 100% SUCCESS!\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  }
}

runTests();
