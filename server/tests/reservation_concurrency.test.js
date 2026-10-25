const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Seat Reservation & Concurrency Stress Test', () => {
  let user1Token;
  let user2Token;
  let testShow;
  let testSeat;

  beforeAll(async () => {
    // 1. Create two test users
    const u1Email = `concurrent_u1_${Date.now()}@test.com`;
    const u2Email = `concurrent_u2_${Date.now()}@test.com`;

    const u1Res = await request(app).post('/api/auth/register').send({
      name: 'Concurrent User 1',
      email: u1Email,
      password: 'Password@123',
    });
    user1Token = u1Res.body.data.token;

    const u2Res = await request(app).post('/api/auth/register').send({
      name: 'Concurrent User 2',
      email: u2Email,
      password: 'Password@123',
    });
    user2Token = u2Res.body.data.token;

    // 2. Fetch an active show from seed data with available seats
    testShow = await prisma.show.findFirst({
      where: {
        status: 'OPEN',
        startTime: { gte: new Date() },
      },
      include: {
        screen: {
          include: {
            seats: { take: 2 },
          },
        },
      },
    });

    testSeat = testShow.screen.seats[0];

    // Ensure the test seat allocation is completely clean
    await prisma.reservationSeat.deleteMany({
      where: {
        seatId: testSeat.id,
        reservation: { showId: testShow.id },
      },
    });

    await prisma.reservation.deleteMany({
      where: {
        showId: testShow.id,
        userId: { in: [u1Res.body.data.user.id, u2Res.body.data.user.id] },
      },
    });

    await prisma.showSeatAllocation.update({
      where: {
        showId_seatId: {
          showId: testShow.id,
          seatId: testSeat.id,
        },
      },
      data: {
        status: 'AVAILABLE',
        reservationId: null,
        bookingId: null,
        reservedUntil: null,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('CRITICAL: Should prevent double booking when two users simultaneously try to reserve the exact same seat', async () => {
    // Launch two simultaneous reservation requests for the exact same seat on the exact same show
    const req1 = request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        showId: testShow.id,
        seatIds: [testSeat.id],
      });

    const req2 = request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        showId: testShow.id,
        seatIds: [testSeat.id],
      });

    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.status, res2.status];
    // Exactly ONE request must succeed (201 Created), and the other must fail with conflict (409 Conflict)
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    // Verify in database: Seat allocation must have status RESERVED and exactly one active reservation
    const allocation = await prisma.showSeatAllocation.findUnique({
      where: {
        showId_seatId: {
          showId: testShow.id,
          seatId: testSeat.id,
        },
      },
    });

    expect(allocation.status).toBe('RESERVED');
    expect(allocation.reservationId).toBeTruthy();
    expect(new Date(allocation.reservedUntil) > new Date()).toBe(true);

    // Verify exactly one active reservation exists for this seat
    const reservationSeats = await prisma.reservationSeat.count({
      where: {
        seatId: testSeat.id,
        reservation: {
          showId: testShow.id,
          status: 'PENDING',
        },
      },
    });

    expect(reservationSeats).toBe(1);
  });

  it('should reject reservation if a seat is already reserved', async () => {
    // Both user1 and user2 try again for the same seat
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        showId: testShow.id,
        seatIds: [testSeat.id],
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('unavailable');
  });

  it('should automatically release expired reservations and allow re-booking', async () => {
    // Artificially expire the active reservation in the database
    const allocation = await prisma.showSeatAllocation.findUnique({
      where: {
        showId_seatId: {
          showId: testShow.id,
          seatId: testSeat.id,
        },
      },
    });

    const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    await prisma.reservation.update({
      where: { id: allocation.reservationId },
      data: { expiresAt: pastDate },
    });

    await prisma.showSeatAllocation.update({
      where: { id: allocation.id },
      data: { reservedUntil: pastDate },
    });

    // Now user 2 attempts to reserve the expired seat
    const rebookRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        showId: testShow.id,
        seatIds: [testSeat.id],
      });

    expect(rebookRes.status).toBe(201);
    expect(rebookRes.body.success).toBe(true);
    expect(rebookRes.body.data.reservation.id).toBeDefined();
  });
});
