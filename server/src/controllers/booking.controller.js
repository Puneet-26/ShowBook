const bookingService = require('../services/booking.service');

class BookingController {
  async confirmBooking(req, res, next) {
    try {
      const { id } = req.params; // reservationId
      const { idempotencyKey, simulatePaymentStatus } = req.body;

      const booking = await bookingService.confirmBookingAndSimulatePayment({
        userId: req.user.id,
        reservationId: id,
        idempotencyKey,
        simulatePaymentStatus,
      });

      res.status(200).json({
        success: true,
        message: 'Booking confirmed successfully!',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyBookings(req, res, next) {
    try {
      const bookings = await bookingService.getUserBookings(req.user.id);
      res.status(200).json({
        success: true,
        count: bookings.length,
        data: { bookings },
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req, res, next) {
    try {
      const booking = await bookingService.getBookingById({
        bookingId: req.params.id,
        userId: req.user.id,
        isAdmin: req.user.role === 'ADMIN',
      });

      res.status(200).json({
        success: true,
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const result = await bookingService.cancelBooking({
        bookingId: req.params.id,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingController();
