const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function signToken(owner) {
  return jwt.sign(
    { sub: owner.id, email: owner.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const [existing] = await pool.query('SELECT id FROM owners WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO owners (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    const owner = { id: result.insertId, name, email };
    const token = signToken(owner);
    res.status(201).json({ token, owner });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash FROM owners WHERE email = ?',
      [email]
    );
    const owner = rows[0];
    if (!owner) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, owner.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(owner);
    res.json({
      token,
      owner: { id: owner.id, name: owner.name, email: owner.email },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM owners WHERE id = ?',
      [req.owner.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }
    res.json({ owner: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
