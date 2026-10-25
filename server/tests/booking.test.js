const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Booking Confirmation, Payment Simulation & Cancellation Suite', () => {
  let user1Token;
  let user2Token;
  let testShow;
  let testSeats;

  beforeAll(async () => {
    // Register two users
    const u1 = await request(app).post('/api/auth/register').send({
      name: 'Booking User 1',
      email: `book_u1_${Date.now()}@test.com`,
      password: 'Password@123',
    });
    user1Token = u1.body.data.token;

    const u2 = await request(app).post('/api/auth/register').send({
      name: 'Booking User 2',
      email: `book_u2_${Date.now()}@test.com`,
      password: 'Password@123',
    });
    user2Token = u2.body.data.token;

    // Find a show in the future
    testShow = await prisma.show.findFirst({
      where: {
        status: 'OPEN',
        startTime: { gte: new Date(Date.now() + 4 * 3600000) }, // 4 hours in future (safe for cancellation test)
      },
      include: {
        screen: {
          include: {
            seats: { take: 3 },
          },
        },
      },
    });

    testSeats = testShow.screen.seats;

    // Reset these seat allocations to AVAILABLE
    await prisma.showSeatAllocation.updateMany({
      where: {
        showId: testShow.id,
        seatId: { in: testSeats.map((s) => s.id) },
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

  it('should reserve a seat, simulate payment failure, and allow retry', async () => {
    // 1. Reserve seat 0
    const resRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        showId: testShow.id,
        seatIds: [testSeats[0].id],
      });

    expect(resRes.status).toBe(201);
    const reservationId = resRes.body.data.reservation.id;

    // 2. Simulate failed payment
    const failPayment = await request(app)
      .post(`/api/bookings/reservations/${reservationId}/confirm`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        idempotencyKey: `fail_key_${Date.now()}`,
        simulatePaymentStatus: 'FAILED',
      });

    expect(failPayment.status).toBe(402);
    expect(failPayment.body.success).toBe(false);

    // 3. Retry with SUCCESS payment
    const successPayment = await request(app)
      .post(`/api/bookings/reservations/${reservationId}/confirm`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        idempotencyKey: `success_key_${Date.now()}`,
        simulatePaymentStatus: 'SUCCESS',
      });

    expect(successPayment.status).toBe(200);
    expect(successPayment.body.success).toBe(true);
    expect(successPayment.body.data.booking.bookingRef).toBeDefined();
    expect(successPayment.body.data.booking.status).toBe('CONFIRMED');
  });

  it('should enforce idempotency on payment confirmation to avoid duplicate bookings', async () => {
    // Reserve seat 1
    const resRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        showId: testShow.id,
        seatIds: [testSeats[1].id],
      });

    const reservationId = resRes.body.data.reservation.id;
    const sameIdempotencyKey = `idem_key_${Date.now()}`;

    // First attempt
    const attempt1 = await request(app)
      .post(`/api/bookings/reservations/${reservationId}/confirm`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        idempotencyKey: sameIdempotencyKey,
        simulatePaymentStatus: 'SUCCESS',
      });

    expect(attempt1.status).toBe(200);
    const bookingRef1 = attempt1.body.data.booking.bookingRef;

    // Second repeated attempt with identical idempotencyKey
    const attempt2 = await request(app)
      .post(`/api/bookings/reservations/${reservationId}/confirm`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        idempotencyKey: sameIdempotencyKey,
        simulatePaymentStatus: 'SUCCESS',
      });

    expect(attempt2.status).toBe(200);
    const bookingRef2 = attempt2.body.data.booking.bookingRef;

    // Must return the exact same booking reference without creating duplicate records
    expect(bookingRef1).toBe(bookingRef2);
  });

  it('CRITICAL: Should prevent User 2 from accessing or viewing User 1 booking by ID', async () => {
    // Reserve seat 2 and confirm by User 1
    const resRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        showId: testShow.id,
        seatIds: [testSeats[2].id],
      });

    const reservationId = resRes.body.data.reservation.id;

    const confirmRes = await request(app)
      .post(`/api/bookings/reservations/${reservationId}/confirm`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        idempotencyKey: `user1_book_${Date.now()}`,
        simulatePaymentStatus: 'SUCCESS',
      });

    const bookingId = confirmRes.body.data.booking.id;

    // User 2 attempts to fetch User 1's booking
    const unauthorizedAccess = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(unauthorizedAccess.status).toBe(403);
    expect(unauthorizedAccess.body.success).toBe(false);

    // User 1 fetching their own booking must succeed
    const authorizedAccess = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(authorizedAccess.status).toBe(200);
    expect(authorizedAccess.body.data.booking.id).toBe(bookingId);
  });

  it('should successfully cancel a confirmed booking and release seats back to AVAILABLE', async () => {
    // Get user 1 bookings
    const myBookings = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', `Bearer ${user1Token}`);

    const bookingToCancel = myBookings.body.data.bookings.find(
      (b) => b.isCancellable && b.status === 'CONFIRMED'
    );

    expect(bookingToCancel).toBeDefined();

    // Cancel the booking
    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingToCancel.id}/cancel`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);

    // Verify booking status is CANCELLED in DB
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingToCancel.id },
    });
    expect(updatedBooking.status).toBe('CANCELLED');
    expect(updatedBooking.cancelledAt).toBeTruthy();

    // Verify seats for this booking are now back to AVAILABLE
    const bookingSeats = await prisma.bookingSeat.findMany({
      where: { bookingId: bookingToCancel.id },
    });

    const allocations = await prisma.showSeatAllocation.findMany({
      where: {
        showId: updatedBooking.showId,
        seatId: { in: bookingSeats.map((bs) => bs.seatId) },
      },
    });

    for (const alloc of allocations) {
      expect(alloc.status).toBe('AVAILABLE');
      expect(alloc.bookingId).toBeNull();
    }
  });
});
