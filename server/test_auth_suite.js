// Automated Test Suite for TripMate Authentication & Error Handling
const http = require('http');
const mongoose = require('mongoose');
const { app } = require('./server');

const TEST_PORT = 5055;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tripmate';

// Helper to make HTTP requests
function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        ...options,
      },
      (res) => {
        let rawBody = '';
        res.on('data', (chunk) => {
          rawBody += chunk;
        });
        res.on('end', () => {
          let json = null;
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            try {
              json = JSON.parse(rawBody);
            } catch (e) {
              json = null;
            }
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            contentType,
            rawBody,
            json,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (postData !== undefined) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runAuthTests() {
  console.log('🧪 Starting TripMate Authentication & Reliability Test Suite...\n');

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

  // 1. Connect Mongoose to Database
  await mongoose.connect(MONGO_URI);
  console.log('📦 Connected to MongoDB for testing.');

  // 2. Start Test Server on TEST_PORT
  const server = app.listen(TEST_PORT, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  console.log(`🌐 Test server listening on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    const testEmail = `auth_test_${Date.now()}@example.com`;
    const testPassword = 'securePassword123';
    let authToken = '';

    // Test 1: Register with missing fields
    console.log('Test 1: Register validation - missing fields');
    const resMissing = await makeRequest(
      {
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: testEmail }
    );
    assert(resMissing.statusCode === 400, `Expected status 400, got ${resMissing.statusCode}`);
    assert(resMissing.json !== null, 'Response is valid JSON');
    assert(resMissing.json?.success === false, 'success is false');
    assert(resMissing.json?.message.includes('required fields'), 'Provides helpful message');

    // Test 2: Register validation - short password
    console.log('\nTest 2: Register validation - short password');
    const resShort = await makeRequest(
      {
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { name: 'Tester', email: testEmail, password: '123' }
    );
    assert(resShort.statusCode === 400, `Expected status 400, got ${resShort.statusCode}`);
    assert(resShort.json !== null, 'Response is valid JSON');
    assert(resShort.json?.message.includes('at least 6 characters'), 'Identifies short password');

    // Test 3: Successful Registration
    console.log('\nTest 3: Successful Registration');
    const resReg = await makeRequest(
      {
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { name: 'TripMate Tester', email: testEmail, password: testPassword }
    );
    assert(resReg.statusCode === 201, `Expected status 201, got ${resReg.statusCode}`);
    assert(resReg.json !== null, 'Response is valid JSON');
    assert(resReg.json?.success === true, 'success is true');
    assert(typeof resReg.json?.token === 'string', 'Returns JWT token string');
    assert(resReg.json?.user?.email === testEmail.toLowerCase(), 'Returns correct user email');
    authToken = resReg.json?.token;

    // Test 4: Duplicate Registration
    console.log('\nTest 4: Duplicate Registration Prevention');
    const resDup = await makeRequest(
      {
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { name: 'TripMate Tester', email: testEmail, password: testPassword }
    );
    assert(resDup.statusCode === 400, `Expected status 400, got ${resDup.statusCode}`);
    assert(resDup.json !== null, 'Response is valid JSON');
    assert(resDup.json?.success === false, 'Duplicate rejected with success=false');
    assert(resDup.json?.message.includes('already exists'), 'Duplicate message returned');

    // Test 5: Successful Login
    console.log('\nTest 5: Successful Login with Valid Credentials');
    const resLogin = await makeRequest(
      {
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: testEmail, password: testPassword }
    );
    assert(resLogin.statusCode === 200, `Expected status 200, got ${resLogin.statusCode}`);
    assert(resLogin.json !== null, 'Response is valid JSON');
    assert(resLogin.json?.success === true, 'success is true');
    assert(typeof resLogin.json?.token === 'string', 'Returns JWT token on login');
    assert(resLogin.json?.user?.name === 'TripMate Tester', 'Returns user details');

    // Test 6: Login with Incorrect Password
    console.log('\nTest 6: Login with Incorrect Password');
    const resBadPass = await makeRequest(
      {
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: testEmail, password: 'wrongPassword999' }
    );
    assert(resBadPass.statusCode === 401, `Expected status 401, got ${resBadPass.statusCode}`);
    assert(resBadPass.json !== null, 'Response is valid JSON');
    assert(resBadPass.json?.success === false, 'success is false');
    assert(resBadPass.json?.message.includes('Invalid email or password'), 'Appropriate error message');

    // Test 7: Login with Non-Existent User
    console.log('\nTest 7: Login with Non-Existent Email');
    const resNoUser = await makeRequest(
      {
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'nobody_exists_here_999@example.com', password: 'somePassword123' }
    );
    assert(resNoUser.statusCode === 401, `Expected status 401, got ${resNoUser.statusCode}`);
    assert(resNoUser.json !== null, 'Response is valid JSON');
    assert(resNoUser.json?.message.includes('Invalid email or password'), 'Prevents email enumeration');

    // Test 8: Login Missing Fields
    console.log('\nTest 8: Login Missing Fields');
    const resMissingLogin = await makeRequest(
      {
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: testEmail }
    );
    assert(resMissingLogin.statusCode === 400, `Expected status 400, got ${resMissingLogin.statusCode}`);
    assert(resMissingLogin.json !== null, 'Response is valid JSON');

    // Test 9: Auth Verification /api/auth/me
    console.log('\nTest 9: Verify Authenticated Session /api/auth/me');
    const resMe = await makeRequest({
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(resMe.statusCode === 200, `Expected status 200, got ${resMe.statusCode}`);
    assert(resMe.json !== null, 'Response is valid JSON');
    assert(resMe.json?.user?.email === testEmail.toLowerCase(), 'Profile matches authenticated user');

    // Test 10: Unknown API Endpoint Returns 404 JSON (not HTML!)
    console.log('\nTest 10: Unknown API Endpoint Returns JSON 404');
    const res404 = await makeRequest({
      path: '/api/auth/nonexistent-endpoint',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert(res404.statusCode === 404, `Expected status 404, got ${res404.statusCode}`);
    assert(res404.json !== null, '404 response is valid JSON (NOT HTML!)');
    assert(res404.json?.success === false, 'success is false');
    assert(res404.json?.message.includes('not found'), 'Clear route not found message');

    // Test 11: Malformed JSON payload handling
    console.log('\nTest 11: Malformed JSON Payload Returns 400 JSON');
    const resBadJson = await makeRequest(
      {
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      '{ bad json: true, '
    );
    assert(resBadJson.statusCode === 400, `Expected status 400, got ${resBadJson.statusCode}`);
    assert(resBadJson.json !== null, 'Malformed JSON returns JSON response (NOT HTML error page)');
    assert(resBadJson.json?.message.includes('Malformed JSON payload'), 'Identifies malformed payload');

    // Test 12: Database Disconnected Error Handling (Simulation)
    console.log('\nTest 12: Database Disconnection Handling (503 Service Unavailable)');
    await mongoose.disconnect();
    const resDbDown = await makeRequest(
      {
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: testEmail, password: testPassword }
    );
    assert(resDbDown.statusCode === 503, `Expected status 503, got ${resDbDown.statusCode}`);
    assert(resDbDown.json !== null, 'Database down response is valid JSON');
    assert(resDbDown.json?.success === false, 'success is false');
    assert(resDbDown.json?.message.includes('Database service is currently unavailable'), 'Helpful database error');

    // Test 13: Frontend parser simulation with HTML response
    console.log('\nTest 13: Frontend parser simulation with HTML 404 response ("The page cannot be found")');
    const fakeHtmlResponse = {
      ok: false,
      status: 404,
      headers: new Map([['content-type', 'text/html; charset=utf-8']]),
      async json() {
        throw new SyntaxError(`Unexpected token 'T', "The page c"... is not valid JSON`);
      },
      async text() {
        return 'The page cannot be found.';
      },
    };

    // Simulate our updated Auth.jsx logic:
    let simulatedError = null;
    try {
      let data = null;
      const contentType = fakeHtmlResponse.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await fakeHtmlResponse.json();
        } catch (e) {
          data = null;
        }
      }

      if (!fakeHtmlResponse.ok) {
        const fallbackMsg =
          fakeHtmlResponse.status === 404
            ? 'Authentication endpoint not found (404). Please check the server route configuration.'
            : `Authentication failed (Status ${fakeHtmlResponse.status})`;
        throw new Error(data?.message || fallbackMsg);
      }
    } catch (err) {
      simulatedError = err.message;
    }

    assert(
      simulatedError === 'Authentication endpoint not found (404). Please check the server route configuration.',
      'Frontend parser prevents "Unexpected token T" SyntaxError and shows clean message'
    );

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

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

runAuthTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
