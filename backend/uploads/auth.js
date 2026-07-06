const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { nume, email, parola, rol } = req.body;

    if (!nume || !email || !parola) {
      return res.status(400).json({ mesaj: 'Toate câmpurile sunt obligatorii.' });
    }

    const exista = await User.findOne({ email });
    if (exista) {
      return res.status(409).json({ mesaj: 'Există deja un cont cu acest email.' });
    }

    const hash = await bcrypt.hash(parola, 10);
    const user = await User.create({ nume, email, parola: hash, rol: rol || 'client' });

    const token = jwt.sign(
      { id: user._id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      utilizator: { id: user._id, nume: user.nume, email: user.email, rol: user.rol }
    });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ mesaj: 'Eroare server la înregistrare.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, parola } = req.body;

    if (!email || !parola) {
      return res.status(400).json({ mesaj: 'Email și parola sunt obligatorii.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ mesaj: 'Email sau parolă incorectă.' });
    }

    const potrivire = await bcrypt.compare(parola, user.parola);
    if (!potrivire) {
      return res.status(401).json({ mesaj: 'Email sau parolă incorectă.' });
    }

    const token = jwt.sign(
      { id: user._id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      utilizator: { id: user._id, nume: user.nume, email: user.email, rol: user.rol }
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ mesaj: 'Eroare server la autentificare.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Returnează utilizatorul curent (necesită token)
router.get('/me', require('../middleware/auth').protejat, async (req, res) => {
  res.json({
    utilizator: {
      id: req.utilizator._id,
      nume: req.utilizator.nume,
      email: req.utilizator.email,
      rol: req.utilizator.rol
    }
  });
});

module.exports = router;