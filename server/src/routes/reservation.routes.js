const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservation.controller');
const { verifyAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createReservationSchema } = require('../validators/booking.validator');

// All reservation endpoints require authenticated user
router.use(verifyAuth);

router.post('/', validate(createReservationSchema), reservationController.createReservation);
router.get('/:id', reservationController.getReservation);
router.post('/:id/cancel', reservationController.cancelReservation);

module.exports = router;
