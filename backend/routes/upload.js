const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { protejat } = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const numeUnic = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, numeUnic);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB / fisier
});

// ─── POST /api/upload ──────────────────────────────────────────────────────────
// Upload generic de documente (folosit la depunerea ofertelor). Returnează
// numele fișierelor salvate pe disc, ce pot fi atașate apoi unei oferte.
router.post('/', protejat, upload.array('fisiere', 10), (req, res) => {
  const fisiere = (req.files || []).map(f => ({
    nume: f.originalname,
    numeFisier: f.filename,
  }));
  res.status(201).json({ fisiere });
});

module.exports = router;
