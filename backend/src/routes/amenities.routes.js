const express = require('express');
const { list } = require('../controllers/amenities.controller');

const router = express.Router();

router.get('/', list);

module.exports = router;
