// ====================================================================
// TripMate Destination Management & Role Authorization Security Test Suite
// ====================================================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware & Utilities
const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');
const initAdmin = require('./utils/initAdmin');
const User = require('./models/User');
const Destination = require('./models/Destination');

// Standard 24-character hexadecimal MongoDB ObjectIds for test fixtures
const ID_REGULAR_USER = '507f1f77bcf86cd799439011';
const ID_ADMIN_USER = '507f191e810c19729de860ea';
const ID_DELETED_USER = '507f191e810c19729de860eb';
const ID_DESTINATION = '507f191e810c19729de860ec';

// Consistent secret used for JWT signing & verification in tests
const JWT_SECRET = process.env.JWT_SECRET || 'tripmate_secret_key';

// Mock request / response utilities
function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    }
  };
}

function createMockReq({
  method = 'GET',
  url = '/',
  headers = {},
  body = {},
  params = {},
  query = {},
  user = null
} = {}) {
  return {
    method,
    url,
    originalUrl: url,
    header(name) {
      const lower = name.toLowerCase();
      for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === lower) return v;
      }
      return undefined;
    },
    headers,
    body,
    params,
    query,
    user
  };
}

async function runSecuritySuite() {
  console.log('🔒 Starting TripMate Destination & Auth Security Test Suite...\n');

  let passed = 0;
  let failed = 0;

  async function test(desc, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${desc}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // Preserve original Mongoose User and Destination methods
  const originalUserFindById = User.findById;
  const originalUserFindOne = User.findOne;
  const originalUserCreate = User.create;
  const originalDestFind = Destination.find;
  const originalDestFindById = Destination.findById;
  const originalDestFindOne = Destination.findOne;
  const originalDestCreate = Destination.create;
  const originalDestDeleteOne = Destination.deleteOne;

  // =========================================================================
  // Section 1: Server-Side adminMiddleware Authorization & Backdoor Elimination
  // =========================================================================
  console.log('--- 1. Admin Authorization Middleware (adminMiddleware.js) ---');

  await test('Rejects unauthenticated request with 401 when req.user is missing', async () => {
    const req = createMockReq({ user: null });
    const res = createMockRes();
    let nextCalled = false;

    await adminMiddleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 401, 'Must return 401');
    assert.strictEqual(res.body?.success, false);
    assert(!nextCalled, 'next() must NOT be called');
  });

  await test('Rejects unauthenticated request with 401 when req.user has no id', async () => {
    const req = createMockReq({ user: { email: 'anon@example.com' } });
    const res = createMockRes();
    let nextCalled = false;

    await adminMiddleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
    assert(!nextCalled);
  });

  await test('Rejects request with 401 when req.user id is not a valid ObjectId', async () => {
    const req = createMockReq({ user: { id: 'invalid_malformed_id', role: 'admin' } });
    const res = createMockRes();
    let nextCalled = false;

    await adminMiddleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
    assert(!nextCalled);
  });

  await test('Rejects request with 401 when user is not found in MongoDB', async () => {
    User.findById = async () => null;

    const req = createMockReq({ user: { id: ID_DELETED_USER, role: 'admin' } });
    const res = createMockRes();
    let nextCalled = false;

    await adminMiddleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
    assert(!nextCalled);
  });

  await test('Rejects regular user with 403 Forbidden', async () => {
    User.findById = async (id) => ({
      _id: id,
      name: 'Regular Explorer',
      email: 'traveler@example.com',
      role: 'user'
    });

    const req = createMockReq({ user: { id: ID_REGULAR_USER, role: 'user' } });
    const res = createMockRes();
    let nextCalled = false;

    await adminMiddleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 403, 'Regular user must be forbidden with 403');
    assert.strictEqual(res.body?.success, false);
    assert(res.body?.message?.toLowerCase().includes('admin'), 'Must state admin required');
    assert(!nextCalled);
  });

  await test('Eliminates x-admin-key header backdoor for unauthenticated requests', async () => {
    const req = createMockReq({
      headers: { 'x-admin-key': 'tripmate_admin_secret' },
      user: null
    });
    const res = createMockRes();
    let nextCalled = false;

    await adminMiddleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 401, 'x-admin-key must not bypass authentication');
    assert(!nextCalled);
  });

  await test('Eliminates x-admin-key header backdoor for regular user requests', async () => {
    User.findById = async (id) => ({
      _id: id,
      name: 'Sneaky User',
      email: 'sneaky@example.com',
      role: 'user'
    });

    const req = createMockReq({
      headers: { 'x-admin-key': 'tripmate_admin_secret' },
      user: { id: ID_REGULAR_USER, role: 'user' }
    });
    const res = createMockRes();
    let nextCalled = false;

    await adminMiddleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 403, 'x-admin-key must not bypass admin authorization');
    assert(!nextCalled);
  });

  await test('Prevents client role spoofing (token role="admin" but MongoDB role="user")', async () => {
    User.findById = async (id) => ({
      _id: id,
      name: 'Spoofed User',
      email: 'spoofed@example.com',
      role: 'user'
    });

    const req = createMockReq({
      user: { id: ID_REGULAR_USER, role: 'admin' }
    });
    const res = createMockRes();
    let nextCalled = false;

    await adminMiddleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 403, 'Must return 403 because MongoDB is the single source of truth');
    assert(!nextCalled);
  });

  await test('Allows verified administrator (MongoDB role="admin")', async () => {
    const adminUser = {
      _id: ID_ADMIN_USER,
      name: 'Administrator',
      email: 'admin@tripmate.com',
      role: 'admin'
    };
    User.findById = async () => adminUser;

    const req = createMockReq({
      user: { id: ID_ADMIN_USER, role: 'admin' }
    });
    const res = createMockRes();
    let nextCalled = false;

    await adminMiddleware(req, res, () => { nextCalled = true; });

    assert(nextCalled, 'next() must be called for verified admin');
    assert.strictEqual(req.user.role, 'admin');
    assert.strictEqual(req.adminUser._id, ID_ADMIN_USER);
  });

  // =========================================================================
  // Section 2: Self-Registration Privilege Escalation Prevention
  // =========================================================================
  console.log('\n--- 2. Public Self-Registration & Privilege Escalation ---');

  await test('POST /api/auth/register ignores client role and strictly sets role="user"', async () => {
    let createdPayload = null;
    User.findOne = async () => null;
    User.create = async (payload) => {
      createdPayload = payload;
      return {
        _id: ID_REGULAR_USER,
        ...payload
      };
    };

    const authRoutes = require('./routes/authRoutes');
    const registerLayer = authRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/register' && layer.route.methods.post
    );
    assert(registerLayer, 'Register route exists');
    const registerHandler = registerLayer.route.stack[0].handle;

    const req = createMockReq({
      method: 'POST',
      url: '/register',
      body: {
        name: 'Malicious Attacker',
        email: 'attacker@example.com',
        password: 'password123',
        role: 'admin' // Attempting to register as admin!
      }
    });
    const res = createMockRes();

    const mongoose = require('mongoose');
    const origState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    await registerHandler(req, res);

    Object.defineProperty(mongoose.connection, 'readyState', { value: origState, configurable: true });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body?.user?.role, 'user', 'Client response must have role="user"');
    assert.strictEqual(createdPayload?.role, 'user', 'MongoDB record must strictly have role="user"');
  });

  // =========================================================================
  // Section 3: Admin Account Initialization
  // =========================================================================
  console.log('\n--- 3. Administrator Credential Initialization (initAdmin.js) ---');

  await test('initAdmin creates admin account if not present', async () => {
    let createdUser = null;
    User.findOne = async () => null;
    User.create = async (userData) => {
      createdUser = userData;
      return { _id: ID_ADMIN_USER, ...userData };
    };

    process.env.ADMIN_EMAIL = 'admin@tripmate.com';
    process.env.ADMIN_PASSWORD = 'admin@tripmate';

    const result = await initAdmin();

    assert(result !== null);
    assert.strictEqual(createdUser.email, 'admin@tripmate.com');
    assert.strictEqual(createdUser.role, 'admin');
    const match = await bcrypt.compare('admin@tripmate', createdUser.password);
    assert(match, 'Password must be properly hashed with bcrypt');
  });

  await test('initAdmin upgrades existing account to role="admin" if needed', async () => {
    let saved = false;
    const existing = {
      _id: ID_ADMIN_USER,
      email: 'admin@tripmate.com',
      password: await bcrypt.hash('admin@tripmate', 10),
      role: 'user',
      save: async function () {
        saved = true;
        return this;
      }
    };
    User.findOne = async () => existing;

    await initAdmin();

    assert.strictEqual(existing.role, 'admin');
    assert(saved, 'User must be saved with role="admin"');
  });

  // =========================================================================
  // Section 4: Destination Routes - Protection of All Write & Export Endpoints
  // =========================================================================
  console.log('\n--- 4. Destination Mutation Endpoints Security ---');

  const destinationRoutes = require('./routes/destinationRoutes');

  // Helper to test a destination route by path and method
  async function testDestRoute(path, method, user, body = {}, params = {}) {
    const layer = destinationRoutes.stack.find(
      (l) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]
    );
    assert(layer, `Route ${method} ${path} must exist in destinationRoutes`);

    const headers = {};
    if (user) {
      const token = jwt.sign(
        { id: user.id || user._id, role: user.role, name: user.name || 'User', email: user.email || 'user@example.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      headers.Authorization = `Bearer ${token}`;
    }

    const req = createMockReq({
      method,
      url: path,
      headers,
      body,
      params,
      user: null
    });
    const res = createMockRes();

    // Execute middleware chain sequentially
    for (const subLayer of layer.route.stack) {
      let nextCalled = false;
      let nextError = null;

      await subLayer.handle(req, res, (err) => {
        nextCalled = true;
        nextError = err;
      });

      if (!nextCalled || nextError || res.body) {
        break;
      }
    }

    return res;
  }

  // 4A. Unauthenticated requests -> 401
  await test('Unauthenticated POST /api/destinations returns 401', async () => {
    const res = await testDestRoute('/', 'POST', null, { name: 'Test Dest', country: 'Test' });
    assert.strictEqual(res.statusCode, 401, 'Must return 401');
    assert.strictEqual(res.body?.success, false);
  });

  await test('Unauthenticated PUT /api/destinations/:id returns 401', async () => {
    const res = await testDestRoute('/:id', 'PUT', null, { name: 'Update Dest' }, { id: ID_DESTINATION });
    assert.strictEqual(res.statusCode, 401);
  });

  await test('Unauthenticated PATCH /api/destinations/:id returns 401', async () => {
    const res = await testDestRoute('/:id', 'PATCH', null, { name: 'Patch Dest' }, { id: ID_DESTINATION });
    assert.strictEqual(res.statusCode, 401);
  });

  await test('Unauthenticated DELETE /api/destinations/:id returns 401', async () => {
    const res = await testDestRoute('/:id', 'DELETE', null, {}, { id: ID_DESTINATION });
    assert.strictEqual(res.statusCode, 401);
  });

  await test('Unauthenticated POST /api/destinations/import/json returns 401', async () => {
    const res = await testDestRoute('/import/json', 'POST', null, [{ name: 'Import' }]);
    assert.strictEqual(res.statusCode, 401);
  });

  await test('Unauthenticated GET /api/destinations/export/json returns 401', async () => {
    const res = await testDestRoute('/export/json', 'GET', null);
    assert.strictEqual(res.statusCode, 401);
  });

  // 4B. Regular User requests -> 403 Forbidden
  const regularUser = { id: ID_REGULAR_USER, role: 'user' };

  await test('Regular user POST /api/destinations returns 403', async () => {
    User.findById = async () => ({ _id: ID_REGULAR_USER, role: 'user' });
    const res = await testDestRoute('/', 'POST', regularUser, { name: 'Unauthorized Dest' });
    assert.strictEqual(res.statusCode, 403, 'Regular user must receive 403 Forbidden');
    assert.strictEqual(res.body?.success, false);
  });

  await test('Regular user PUT /api/destinations/:id returns 403', async () => {
    User.findById = async () => ({ _id: ID_REGULAR_USER, role: 'user' });
    const res = await testDestRoute('/:id', 'PUT', regularUser, { name: 'Unauthorized Update' }, { id: ID_DESTINATION });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Regular user PATCH /api/destinations/:id returns 403', async () => {
    User.findById = async () => ({ _id: ID_REGULAR_USER, role: 'user' });
    const res = await testDestRoute('/:id', 'PATCH', regularUser, { name: 'Unauthorized Patch' }, { id: ID_DESTINATION });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Regular user DELETE /api/destinations/:id returns 403', async () => {
    User.findById = async () => ({ _id: ID_REGULAR_USER, role: 'user' });
    const res = await testDestRoute('/:id', 'DELETE', regularUser, {}, { id: ID_DESTINATION });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Regular user POST /api/destinations/import/json returns 403', async () => {
    User.findById = async () => ({ _id: ID_REGULAR_USER, role: 'user' });
    const res = await testDestRoute('/import/json', 'POST', regularUser, [{ name: 'Unauthorized Import' }]);
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Regular user GET /api/destinations/export/json returns 403', async () => {
    User.findById = async () => ({ _id: ID_REGULAR_USER, role: 'user' });
    const res = await testDestRoute('/export/json', 'GET', regularUser);
    assert.strictEqual(res.statusCode, 403);
  });

  // 4C. Administrator requests -> 200 / 201 Success
  const adminUser = { id: ID_ADMIN_USER, role: 'admin' };

  await test('Administrator POST /api/destinations successfully creates destination (201)', async () => {
    User.findById = async () => ({ _id: ID_ADMIN_USER, role: 'admin' });
    Destination.findOne = async () => null; // No duplicate
    Destination.create = async (data) => ({ _id: ID_DESTINATION, ...data });

    const newDest = {
      name: 'Santorini Sunset',
      country: 'Greece',
      description: 'Iconic volcanic island in the Aegean Sea'
    };
    const res = await testDestRoute('/', 'POST', adminUser, newDest);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.data?.name, 'Santorini Sunset');
  });

  await test('Administrator PUT /api/destinations/:id successfully updates destination (200)', async () => {
    User.findById = async () => ({ _id: ID_ADMIN_USER, role: 'admin' });
    const existing = {
      _id: ID_DESTINATION,
      name: 'Old Name',
      country: 'Old Country',
      save: async function () { return this; }
    };
    Destination.findById = async () => existing;
    Destination.findOne = async () => existing;

    const res = await testDestRoute('/:id', 'PUT', adminUser, { name: 'New Name' }, { id: ID_DESTINATION });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(existing.name, 'New Name');
  });

  await test('Administrator PATCH /api/destinations/:id successfully partially updates destination (200)', async () => {
    User.findById = async () => ({ _id: ID_ADMIN_USER, role: 'admin' });
    const existing = {
      _id: ID_DESTINATION,
      name: 'Jaipur',
      country: 'India',
      estimatedBudget: 4000,
      save: async function () { return this; }
    };
    Destination.findById = async () => existing;
    Destination.findOne = async () => existing;

    const res = await testDestRoute('/:id', 'PATCH', adminUser, { estimatedBudget: 6500 }, { id: ID_DESTINATION });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(existing.estimatedBudget, 6500);
  });

  await test('Administrator GET /api/destinations/export/json successfully exports destinations (200)', async () => {
    User.findById = async () => ({ _id: ID_ADMIN_USER, role: 'admin' });
    Destination.find = () => ({
      sort: async () => [
        {
          name: 'Kyoto',
          slug: 'kyoto',
          country: 'Japan',
          state: 'Kansai',
          categories: ['Culture'],
          description: 'Historic temples and gardens',
          coverImage: 'https://images.unsplash.com/kyoto',
          gallery: [],
          bestVisitingTime: 'Spring',
          estimatedBudget: 8000,
          currency: 'JPY',
          duration: '4-5 Days',
          highlights: ['Fushimi Inari'],
          coordinates: { lat: 35.01, lng: 135.76 },
          featured: true
        }
      ]
    });

    const res = await testDestRoute('/export/json', 'GET', adminUser);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.count, 1);
    assert(Array.isArray(res.body?.data));
    assert.strictEqual(res.body?.data[0]?.name, 'Kyoto');
  });

  await test('Administrator POST /api/destinations/import/json successfully imports destinations (200)', async () => {
    User.findById = async () => ({ _id: ID_ADMIN_USER, role: 'admin' });
    Destination.findOne = async () => null; // New records
    Destination.create = async (d) => ({ _id: 'imported_1', ...d });

    const importPayload = [
      {
        name: 'Lisbon',
        country: 'Portugal',
        description: 'Coastal capital of Portugal'
      }
    ];

    const res = await testDestRoute('/import/json', 'POST', adminUser, importPayload);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.createdCount, 1);
  });

  await test('Administrator DELETE /api/destinations/:id successfully deletes destination (200)', async () => {
    User.findById = async () => ({ _id: ID_ADMIN_USER, role: 'admin' });
    let deletedId = null;
    const existing = {
      _id: ID_DESTINATION,
      name: 'Destination to Delete'
    };
    Destination.findById = async () => existing;
    Destination.findOne = async () => existing;
    Destination.deleteOne = async (filter) => {
      deletedId = filter._id;
      return { deletedCount: 1 };
    };

    const res = await testDestRoute('/:id', 'DELETE', adminUser, {}, { id: ID_DESTINATION });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(deletedId, ID_DESTINATION);
  });

  // =========================================================================
  // Section 5: Public Read-Only Access
  // =========================================================================
  console.log('\n--- 5. Public Browsing Read-Only Endpoints ---');

  await test('Public GET /api/destinations returns 200 without any authentication token', async () => {
    Destination.find = () => ({
      sort: async () => [{ name: 'Paris', country: 'France' }, { name: 'Rome', country: 'Italy' }]
    });

    const res = await testDestRoute('/', 'GET', null);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.count, 2);
  });

  await test('Public GET /api/destinations/featured returns 200 without token', async () => {
    Destination.find = () => ({
      sort: async () => [{ name: 'Bali', featured: true }]
    });

    const res = await testDestRoute('/featured', 'GET', null);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.count, 1);
  });

  await test('Public GET /api/destinations/:idOrSlug returns 200 without token', async () => {
    const dest = { _id: ID_DESTINATION, name: 'Paris', slug: 'paris', country: 'France' };
    Destination.findById = async () => null;
    Destination.findOne = async () => dest;

    const res = await testDestRoute('/:idOrSlug', 'GET', null, {}, { idOrSlug: 'paris' });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.data?.name, 'Paris');
  });

  // Restore original methods
  User.findById = originalUserFindById;
  User.findOne = originalUserFindOne;
  User.create = originalUserCreate;
  Destination.find = originalDestFind;
  Destination.findById = originalDestFindById;
  Destination.findOne = originalDestFindOne;
  Destination.create = originalDestCreate;
  Destination.deleteOne = originalDestDeleteOne;

  console.log('\n========================================');
  console.log(`SECURITY TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runSecuritySuite().catch((err) => {
  console.error('Test suite failed unexpectedly:', err);
  process.exit(1);
});
