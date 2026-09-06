const pool = require('../config/db');
const aiService = require('../services/ai_service');
const { fetchPageText, UnsafeUrlError } = require('../services/safeFetch');
const { extractDocText } = require('../services/docText');

async function analyzeProperty(req, res, next) {
  try {
    const { name, type, location, description } = req.body;
    const files = req.files || [];

    if (!description?.trim() && files.length === 0) {
      return res.status(400).json({ error: 'Provide a description or at least one photo.' });
    }

    let availableAmenities = [];
    try {
      const [rows] = await pool.query("SELECT name FROM amenities WHERE type = 'property' ORDER BY id");
      availableAmenities = rows.map((r) => r.name);
    } catch (dbErr) {
      console.error('[AiController] amenity lookup failed, proceeding with empty vocabulary:', dbErr.message);
    }

    const images = files.map((f) => ({
      mimeType: f.mimetype,
      base64: f.buffer.toString('base64'),
    }));

    const result = await aiService.polishDescription({
      name,
      type,
      location,
      description,
      images,
      availableAmenities,
    });

    res.json(result);
  } catch (err) {
    console.error('[AiController] analyzeProperty error:', err);
    const wrapped = new Error('AI assist is temporarily unavailable. You can keep writing manually.');
    wrapped.status = 502;
    next(wrapped);
  }
}

async function loadAmenityVocab() {
  try {
    const [rows] = await pool.query('SELECT name, type FROM amenities ORDER BY id');
    return {
      availableAmenities: rows.filter((r) => r.type === 'property').map((r) => r.name),
      availableRoomAmenities: rows.filter((r) => r.type === 'room').map((r) => r.name),
    };
  } catch (dbErr) {
    console.error('[AiController] amenity lookup failed, proceeding with empty vocabulary:', dbErr.message);
    return { availableAmenities: [], availableRoomAmenities: [] };
  }
}

// Note: only ever reads req.body.text/link and req.files.images/pdfs/docs —
// deliberately has no path to owner_kyc/owner_bank/commission/pricing
// fields, which the wizard never even sends to this endpoint.
async function draftProperty(req, res, next) {
  try {
    const text = (req.body.text || '').trim();
    const link = (req.body.link || '').trim();
    const files = req.files || {};
    const imageFiles = files.images || [];
    const pdfFiles = files.pdfs || [];
    const docFiles = files.docs || [];

    if (!text && !link && imageFiles.length === 0 && pdfFiles.length === 0 && docFiles.length === 0) {
      return res.status(400).json({ error: 'Share at least one of: a description, a link, photos, a PDF, or a document.' });
    }

    const oversizedImage = imageFiles.find((f) => f.size > 5 * 1024 * 1024);
    if (oversizedImage) return res.status(400).json({ error: `${oversizedImage.originalname} is over 5MB.` });
    const oversizedDoc = docFiles.find((f) => f.size > 2 * 1024 * 1024);
    if (oversizedDoc) return res.status(400).json({ error: `${oversizedDoc.originalname} is over 2MB.` });
    // PDFs already sit at the multer-wide 10MB cap, nothing extra to check.

    const warnings = [];

    let linkText = null;
    if (link) {
      try {
        linkText = await fetchPageText(link);
        if (!linkText) warnings.push('The link loaded, but no readable text was found on that page.');
      } catch (err) {
        warnings.push(err instanceof UnsafeUrlError ? err.message : 'Could not read that link — continuing without it.');
      }
    }

    const docTexts = [];
    for (const file of docFiles) {
      try {
        docTexts.push(await extractDocText(file));
      } catch {
        warnings.push(`Could not read ${file.originalname} — continuing without it.`);
      }
    }

    if (!text && !linkText && docTexts.length === 0 && imageFiles.length === 0 && pdfFiles.length === 0) {
      return res.status(422).json({ error: 'Could not read anything usable from what was provided.', warnings });
    }

    const { availableAmenities, availableRoomAmenities } = await loadAmenityVocab();

    const result = await aiService.draftProperty({
      text,
      images: imageFiles.map((f) => ({ mimeType: f.mimetype, base64: f.buffer.toString('base64') })),
      pdfs: pdfFiles.map((f) => ({ base64: f.buffer.toString('base64') })),
      docTexts,
      linkText,
      availableAmenities,
      availableRoomAmenities,
    });

    res.json({ ...result, warnings: [...warnings, ...(result.warnings || [])] });
  } catch (err) {
    console.error('[AiController] draftProperty error:', err);
    const wrapped = new Error('AI Form Helper is temporarily unavailable. You can fill in the form manually.');
    wrapped.status = 502;
    next(wrapped);
  }
}

module.exports = { analyzeProperty, draftProperty };
