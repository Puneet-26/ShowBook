const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { verifyAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { confirmReservationSchema } = require('../validators/booking.validator');

// All booking endpoints require authenticated user
router.use(verifyAuth);

router.post(
  '/reservations/:id/confirm',
  validate(confirmReservationSchema),
  bookingController.confirmBooking
);
router.get('/my', bookingController.getMyBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/:id/cancel', bookingController.cancelBooking);

module.exports = router;
