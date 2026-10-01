const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat } = require('../middleware/auth');
const { serializeReclamatie } = require('../lib/serialize');
const { limiteazaCoduriEmail } = require('../middleware/rateLimit');

const MOTIVE_VALIDE = ['neplata', 'lucrare_nelivrata', 'calitate_necorespunzatoare', 'comportament_abuziv', 'informatii_false', 'altul'];

// ─── POST /api/reclamatii ────────────────────────────────────────────────
// Orice utilizator poate raporta o problemă legată de un proiect/ofertă —
// de obicei cealaltă parte dintr-o colaborare (neplată, lucrare nelivrată,
// comportament abuziv etc.). Reclamația e vizibilă apoi în panoul de admin.
// Refolosim limitatorul de rată de la coduri-email (5 / 15 min) ca să nu
// poată fi folosit pentru spam de reclamații.
router.post('/', protejat, limiteazaCoduriEmail, async (req, res) => {
  try {
    const { motiv, descriere, proiectId, ofertaId, raportatImpotrivaId } = req.body;
    if (!motiv || !MOTIVE_VALIDE.includes(motiv)) {
      return res.status(400).json({ mesaj: 'Motivul reclamației este obligatoriu și trebuie să fie unul valid.' });
    }
    if (!descriere || !descriere.trim()) {
      return res.status(400).json({ mesaj: 'Descrie pe scurt problema.' });
    }

    const reclamatie = await prisma.reclamatie.create({
      data: {
        motiv,
        descriere: descriere.trim().slice(0, 2000),
        proiectId: proiectId || null,
        ofertaId: ofertaId || null,
        raportatDeId: req.utilizator.id,
        raportatImpotrivaId: raportatImpotrivaId || null,
      },
      include: { raportatDe: true, raportatImpotriva: true },
    });

    res.status(201).json(serializeReclamatie(reclamatie));
  } catch (err) {
    console.error('[reclamatii POST /]', err);
    res.status(500).json({ mesaj: 'Eroare la trimiterea reclamației.' });
  }
});

// ─── GET /api/reclamatii/mele ────────────────────────────────────────────
// Reclamațiile depuse de utilizatorul curent, cu statusul lor.
router.get('/mele', protejat, async (req, res) => {
  try {
    const reclamatii = await prisma.reclamatie.findMany({
      where: { raportatDeId: req.utilizator.id },
      include: { raportatDe: true, raportatImpotriva: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reclamatii.map(serializeReclamatie));
  } catch (err) {
    console.error('[reclamatii GET /mele]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea reclamațiilor tale.' });
  }
});

module.exports = router;
module.exports.MOTIVE_VALIDE = MOTIVE_VALIDE;