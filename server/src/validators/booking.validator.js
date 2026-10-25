const { z } = require('zod');

const createReservationSchema = z.object({
  showId: z.string().uuid('Invalid show ID'),
  seatIds: z
    .array(z.string().uuid('Invalid seat ID'))
    .min(1, 'Please select at least 1 seat')
    .max(10, 'You cannot reserve more than 10 seats at once'),
});

const confirmReservationSchema = z.object({
  idempotencyKey: z.string().min(10, 'Idempotency key is required to prevent duplicate bookings'),
  simulatePaymentStatus: z.enum(['SUCCESS', 'FAILED']).default('SUCCESS'),
});

module.exports = {
  createReservationSchema,
  confirmReservationSchema,
};
