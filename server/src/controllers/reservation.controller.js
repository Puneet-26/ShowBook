const reservationService = require('../services/reservation.service');

class ReservationController {
  async createReservation(req, res, next) {
    try {
      const { showId, seatIds } = req.body;
      const reservation = await reservationService.createReservation({
        userId: req.user.id,
        showId,
        seatIds,
      });

      res.status(201).json({
        success: true,
        message: 'Seats temporarily reserved for 5 minutes.',
        data: { reservation },
      });
    } catch (error) {
      next(error);
    }
  }

  async getReservation(req, res, next) {
    try {
      const reservation = await reservationService.getReservationById({
        reservationId: req.params.id,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: { reservation },
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelReservation(req, res, next) {
    try {
      const result = await reservationService.cancelReservation({
        reservationId: req.params.id,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReservationController();
