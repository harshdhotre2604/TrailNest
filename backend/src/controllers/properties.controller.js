const pool = require('../config/db');

const PROPERTY_TYPES = ['cabin', 'cottage', 'farmstay', 'villa', 'treehouse', 'apartment'];

async function list(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, owner_id, name, type, location, price_per_night, cover_image_url, description, created_at
       FROM properties
       ORDER BY created_at DESC`
    );
    res.json({ properties: rows });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, owner_id, name, type, location, price_per_night, cover_image_url, description, created_at
       FROM properties
       WHERE owner_id = ?
       ORDER BY created_at DESC`,
      [req.owner.id]
    );
    res.json({ properties: rows });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, owner_id, name, type, location, price_per_night, cover_image_url, description, created_at
       FROM properties
       WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json({ property: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, type, location, price_per_night, cover_image_url, description } = req.body;

    if (!name || !type || !location || !price_per_night) {
      return res.status(400).json({
        error: 'name, type, location, and price_per_night are required',
      });
    }
    if (!PROPERTY_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${PROPERTY_TYPES.join(', ')}` });
    }
    if (Number.isNaN(Number(price_per_night)) || Number(price_per_night) <= 0) {
      return res.status(400).json({ error: 'price_per_night must be a positive number' });
    }

    const [result] = await pool.query(
      `INSERT INTO properties (owner_id, name, type, location, price_per_night, cover_image_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.owner.id,
        name,
        type,
        location,
        price_per_night,
        cover_image_url || null,
        description || null,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM properties WHERE id = ?', [result.insertId]);
    res.status(201).json({ property: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, listMine, getById, create, PROPERTY_TYPES };
