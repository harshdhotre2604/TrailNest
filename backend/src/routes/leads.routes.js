const express = require('express');
const { listForOwner, updateStatus } = require('../controllers/leads.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listForOwner);
router.patch('/:id', requireAuth, updateStatus);

module.exports = router;
