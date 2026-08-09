const express = require('express');
const { list, listMine, getById, create } = require('../controllers/properties.controller');
const { create: createLead } = require('../controllers/leads.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', list);
router.get('/mine', requireAuth, listMine);
router.get('/:id', getById);
router.post('/', requireAuth, create);
router.post('/:propertyId/leads', createLead);

module.exports = router;
