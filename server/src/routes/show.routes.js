const express = require('express');
const router = express.Router();
const showController = require('../controllers/show.controller');

router.get('/', showController.getShows);
router.get('/:id', showController.getShowById);

module.exports = router;
