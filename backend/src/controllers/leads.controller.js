const pool = require('../config/db');

const LEAD_STATUSES = ['new', 'contacted', 'closed'];

async function create(req, res, next) {
  try {
    const propertyId = req.params.propertyId;
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email, and message are required' });
    }

    const [properties] = await pool.query('SELECT id FROM properties WHERE id = ?', [propertyId]);
    if (properties.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const [result] = await pool.query(
      `INSERT INTO leads (property_id, name, email, message, status)
       VALUES (?, ?, ?, ?, 'new')`,
      [propertyId, name, email, message]
    );

    const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
    res.status(201).json({ lead: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function listForOwner(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT l.id, l.property_id, l.name, l.email, l.message, l.status, l.created_at,
              p.name AS property_name
       FROM leads l
       JOIN properties p ON p.id = l.property_id
       WHERE p.owner_id = ?
       ORDER BY l.created_at DESC`,
      [req.owner.id]
    );
    res.json({ leads: rows });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!LEAD_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${LEAD_STATUSES.join(', ')}` });
    }

    const [rows] = await pool.query(
      `SELECT l.id FROM leads l
       JOIN properties p ON p.id = l.property_id
       WHERE l.id = ? AND p.owner_id = ?`,
      [req.params.id, req.owner.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await pool.query('UPDATE leads SET status = ? WHERE id = ?', [status, req.params.id]);
    const [updated] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    res.json({ lead: updated[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listForOwner, updateStatus, LEAD_STATUSES };
