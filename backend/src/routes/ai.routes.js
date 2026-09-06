const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { analyzeProperty, draftProperty } = require('../controllers/ai.controller');

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ error: 'Too many AI requests. Please wait a bit before trying again.' }),
});

// Tighter than aiLimiter — the AI Form Helper's requests carry more files
// (photos + PDFs + docs) and cost more per call than the description-only
// "Polish with AI" endpoint.
const draftLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ error: 'Too many AI Form Helper requests. Please wait a bit before trying again.' }),
});

const analysisUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

// Global cap is the largest single-field limit (PDFs); images/docs are
// re-checked against their own smaller caps in the controller, same
// approach as the properties upload middleware.
const draftUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 9 },
  fileFilter: (_req, file, cb) => {
    const allowed = {
      images: ['image/jpeg', 'image/png', 'image/webp'],
      pdfs: ['application/pdf'],
      docs: ['text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    };
    const ok = allowed[file.fieldname]?.includes(file.mimetype);
    cb(ok ? null : new Error(`Unsupported file for ${file.fieldname}: ${file.originalname}`), ok);
  },
});

router.post(
  '/analyze-property',
  requireAuth,
  aiLimiter,
  analysisUpload.array('images', 5),
  analyzeProperty
);

router.post(
  '/draft-property',
  requireAuth,
  draftLimiter,
  draftUpload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'pdfs', maxCount: 2 },
    { name: 'docs', maxCount: 2 },
  ]),
  draftProperty
);

module.exports = router;
