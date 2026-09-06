const pool = require('../config/db');

async function list(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT id, name, type FROM amenities ORDER BY type, name');
    res.json({ amenities: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
