const express = require('express');
const router = express.Router();
const theatreController = require('../controllers/theatre.controller');

router.get('/', theatreController.getTheatres);
router.get('/:id', theatreController.getTheatreById);

module.exports = router;
