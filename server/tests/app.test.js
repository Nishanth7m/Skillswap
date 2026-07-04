const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../server');
const User = require('../models/User');
const Skill = require('../models/Skill');
const Match = require('../models/Match');
const Session = require('../models/Session');
const CreditTransaction = require('../models/CreditTransaction');
const matchingService = require('../services/matchingService');
const ledgerService = require('../services/ledgerService');

// Configure test database
beforeAll(async () => {
  // Override MONGODB_URI for testing safety
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/skillswap_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  // Close server listener to avoid hanging handles
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(async () => {
  // Clear collections
  await User.deleteMany({});
  await Skill.deleteMany({});
  await Match.deleteMany({});
  await Session.deleteMany({});
  await CreditTransaction.deleteMany({});
});

describe('Authentication API Endpoints', () => {
  const mockUser = {
    name: 'Test Swapper',
    email: 'test@example.com',
    password: 'password123',
  };

  test('POST /api/auth/register - Should register a new user with 5 credits', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(mockUser)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(mockUser.email);
    expect(res.body.data.creditBalance).toBe(5); // Default start credits
    expect(res.body.tokens).toHaveProperty('accessToken');
    expect(res.body.tokens).toHaveProperty('refreshToken');

    const dbUser = await User.findOne({ email: mockUser.email });
    expect(dbUser).toBeTruthy();
  });

  test('POST /api/auth/register - Should reject duplicate email registrations', async () => {
    await request(app).post('/api/auth/register').send(mockUser).expect(201);
    const res = await request(app)
      .post('/api/auth/register')
      .send(mockUser)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('exists');
  });

  test('POST /api/auth/login - Should authenticate registered users', async () => {
    await request(app).post('/api/auth/register').send(mockUser).expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: mockUser.email,
        password: mockUser.password,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.tokens).toHaveProperty('accessToken');
  });

  test('POST /api/auth/login - Should reject invalid passwords', async () => {
    await request(app).post('/api/auth/register').send(mockUser).expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: mockUser.email,
        password: 'wrongpassword',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});

describe('Matching Engine scoring formula', () => {
  test('Direct scoreMatch validation', async () => {
    // 1. Create Mock Skills
    const skillReact = await Skill.create({ name: 'React', category: 'Technology' });
    const skillSpanish = await Skill.create({ name: 'Spanish', category: 'Languages' });

    // 2. User A: Wants to learn React, teaches Spanish
    const userA = {
      _id: new mongoose.Types.ObjectId(),
      name: 'User A',
      skillsToTeach: [{ skill: skillSpanish._id, proficiency: 'Expert' }],
      skillsToLearn: [{ skill: skillReact._id, desiredLevel: 'Beginner' }],
      availability: { slots: [{ day: 'Monday', startTime: '09:00', endTime: '10:00' }] },
      creditBalance: 5,
      averageRating: 0,
      reviewCount: 0,
    };

    // 3. User B: Teaches React (Intermediate), wants to learn Spanish (Beginner)
    const userB = {
      _id: new mongoose.Types.ObjectId(),
      name: 'User B',
      skillsToTeach: [{ skill: skillReact._id, proficiency: 'Intermediate' }],
      skillsToLearn: [{ skill: skillSpanish._id, desiredLevel: 'Beginner' }],
      availability: { slots: [{ day: 'Monday', startTime: '09:00', endTime: '10:00' }] },
      creditBalance: 1, // Motivates with low credits
      averageRating: 4.5,
      reviewCount: 4,
    };

    // Calculate score
    const result = matchingService.scoreMatch(userA, userB);

    // Assert weights calculation
    // - Skill Match Score: React (Intermediate = 2) * 3.0 = 6.0
    // - Rating Score: 4.5 * 2.0 = 9.0
    // - Avail Overlap: 1 overlapping slot * 1.0 = 1.0
    // - Mutual Match Boost: B wants Spanish, A teaches Spanish = +10.0
    // - Motivation Boost: B has 1 credit (<= 2) = +2.0
    // Expected Total: 6 + 9 + 1 + 10 + 2 = 28.0
    expect(result.score).toBe(28.0);
    expect(result.breakdown.skillScore).toBe(6.0);
    expect(result.breakdown.ratingScore).toBe(9.0);
    expect(result.breakdown.availabilityScore).toBe(1.0);
    expect(result.breakdown.mutualMatchBoost).toBe(10.0);
    expect(result.breakdown.motivationBoost).toBe(2.0);
  });
});

describe('Credit Ledger Concurrency & Double-Spend Prevention', () => {
  test('Concurrent session acceptions should not double-spend or create negative balances', async () => {
    // 1. Seed Skills and Users
    const skill = await Skill.create({ name: 'Web Dev', category: 'Technology' });
    
    // Learner starts with exactly 1 credit
    const learner = await User.create({
      name: 'Learner',
      email: 'learner@example.com',
      password: 'password123',
      creditBalance: 1,
      skillsToLearn: [{ skill: skill._id, desiredLevel: 'Intermediate' }]
    });

    const teacher = await User.create({
      name: 'Teacher',
      email: 'teacher@example.com',
      password: 'password123',
      creditBalance: 0,
      skillsToTeach: [{ skill: skill._id, proficiency: 'Expert' }]
    });

    const match = await Match.create({
      requester: learner._id,
      recipient: teacher._id,
      status: 'ACCEPTED'
    });

    // 2. Create 2 concurrent Session Proposals for the same match
    const session1 = await Session.create({
      match: match._id,
      teacher: teacher._id,
      learner: learner._id,
      skill: skill._id,
      proposedTime: { date: new Date(), startTime: '10:00', endTime: '11:00' },
      status: 'PENDING'
    });

    const session2 = await Session.create({
      match: match._id,
      teacher: teacher._id,
      learner: learner._id,
      skill: skill._id,
      proposedTime: { date: new Date(), startTime: '14:00', endTime: '15:00' },
      status: 'PENDING'
    });

    // 3. Trigger 2 concurrent confirmation requests using Promise.all
    // Since transactions might not be active in local standalone mongodb testing setups, 
    // we call the confirmAndReserve function directly which tests the atomic lock filter query.
    const promises = [
      ledgerService.confirmAndReserve(session1._id, learner._id, teacher._id),
      ledgerService.confirmAndReserve(session2._id, learner._id, teacher._id)
    ];

    const results = await Promise.allSettled(promises);

    // 4. Verify outcomes: One should succeed, one must fail
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason.message).toContain('Insufficient');

    // 5. Verify final balance state
    const finalLearner = await User.findById(learner._id);
    expect(finalLearner.creditBalance).toBe(0); // Spent exactly 1, no double spend or negative balance

    // Verify session states in DB
    const dbSession1 = await Session.findById(session1._id);
    const dbSession2 = await Session.findById(session2._id);
    
    // Exactly one session was confirmed, the other remained pending or failed
    const confirmedCount = [dbSession1.status, dbSession2.status].filter(s => s === 'CONFIRMED').length;
    expect(confirmedCount).toBe(1);

    // Verify ledger has exactly 1 reservation entry
    const transactionsCount = await CreditTransaction.countDocuments({ type: 'SESSION_RESERVATION' });
    expect(transactionsCount).toBe(1);
  });
});
