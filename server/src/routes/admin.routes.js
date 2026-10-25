const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyAuth, requireRole } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { movieSchema, updateMovieSchema } = require('../validators/movie.validator');
const { createShowSchema } = require('../validators/show.validator');

// All admin routes require ADMIN role
router.use(verifyAuth, requireRole('ADMIN'));

// Dashboard stats & global booking inspection
router.get('/dashboard', adminController.getDashboardStats);
router.get('/bookings', adminController.getAllBookings);

// Movie management
router.post('/movies', validate(movieSchema), adminController.createMovie);
router.patch('/movies/:id', validate(updateMovieSchema), adminController.updateMovie);
router.delete('/movies/:id', adminController.deleteMovie);

// Theatre and Screen management
router.post('/theatres', adminController.createTheatre);
router.post('/theatres/:theatreId/screens', adminController.createScreen);

// Show scheduling and emergency cancellation
router.post('/shows', validate(createShowSchema), adminController.createShow);
router.post('/shows/:id/cancel', adminController.cancelShow);

module.exports = router;
