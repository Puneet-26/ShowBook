const request = require('supertest');
const app = require('../src/app');

describe('Authentication & Authorization Suite', () => {
  const uniqueEmail = `testuser_${Date.now()}@example.com`;

  it('should successfully register a new user with valid inputs', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Tester',
      email: uniqueEmail,
      password: 'Password@123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(uniqueEmail);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject registration if email is already taken', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate Guy',
      email: uniqueEmail,
      password: 'Password@123',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with invalid email or short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should login an existing user with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: uniqueEmail,
      password: 'Password@123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: uniqueEmail,
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should deny access to protected profile without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should allow access to profile with valid bearer token', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: uniqueEmail,
      password: 'Password@123',
    });

    const token = loginRes.body.data.token;
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(uniqueEmail);
  });

  it('should forbid a regular USER from accessing ADMIN endpoints', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: uniqueEmail,
      password: 'Password@123',
    });

    const token = loginRes.body.data.token;
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow an ADMIN user to access ADMIN endpoints', async () => {
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@showbook.com',
      password: 'Admin@12345',
    });

    const token = adminLogin.body.data.token;
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.stats).toBeDefined();
  });
});
