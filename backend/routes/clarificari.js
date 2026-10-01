const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat, doarRol } = require('../middleware/auth');
const { serializeClarificare } = require('../lib/serialize');
const { creeazaNotificare } = require('../lib/notificari');

const AUTOR_SELECT = { id: true, nume: true, judet: true, cui: true };

// ─── GET /api/clarificari/proiect/:proiectId ───────────────────────────────
// Lista publică de întrebări & răspunsuri pentru un proiect — vizibilă
// oricărui utilizator autentificat (dezvoltator sau ofertanți).
router.get('/proiect/:proiectId', protejat, async (req, res) => {
  try {
    const clarificari = await prisma.clarificare.findMany({
      where: { proiectId: req.params.proiectId },
      include: { autor: { select: AUTOR_SELECT } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(clarificari.map(serializeClarificare));
  } catch (err) {
    console.error('[clarificari GET /proiect/:proiectId]', err);
    res.status(500).json({ mesaj: 'Eroare la incarcarea clarificarilor.' });
  }
});

// ─── POST /api/clarificari ──────────────────────────────────────────────────
// O nouă întrebare, pusă de un ofertant (subcontractor sau furnizor) pe
// pagina unui proiect. Dezvoltatorul proiectului e notificat.
router.post('/', protejat, doarRol('SUBCONTRACTOR', 'FURNIZOR'), async (req, res) => {
  try {
    const { proiectId, intrebare } = req.body;
    if (!proiectId || !intrebare || !intrebare.trim()) {
      return res.status(400).json({ mesaj: 'Campurile proiectId si intrebare sunt obligatorii.' });
    }

    const proiect = await prisma.project.findUnique({ where: { id: proiectId } });
    if (!proiect) return res.status(404).json({ mesaj: 'Proiectul nu exista.' });

    const clarificare = await prisma.clarificare.create({
      data: {
        proiectId,
        autorId: req.utilizator.id,
        intrebare: intrebare.trim().slice(0, 1000),
      },
      include: { autor: { select: AUTOR_SELECT } },
    });

    creeazaNotificare({
      userId: proiect.dezvoltatorId,
      tip: 'proiect',
      titlu: `Întrebare nouă de la ${req.utilizator.nume}`,
      mesaj: `${proiect.titlu}: ${intrebare.trim().slice(0, 80)}`,
      proiectId: proiect.id,
    });

    res.status(201).json(serializeClarificare(clarificare));
  } catch (err) {
    console.error('[clarificari POST /]', err);
    res.status(500).json({ mesaj: 'Eroare la trimiterea intrebarii.' });
  }
});

// ─── PUT /api/clarificari/:id/raspuns ───────────────────────────────────────
// Răspunsul oficial, doar de la dezvoltatorul proiectului respectiv.
router.put('/:id/raspuns', protejat, doarRol('DEZVOLTATOR'), async (req, res) => {
  try {
    const { raspuns } = req.body;
    if (!raspuns || !raspuns.trim()) {
      return res.status(400).json({ mesaj: 'Campul raspuns este obligatoriu.' });
    }

    const clarificare = await prisma.clarificare.findUnique({
      where: { id: req.params.id },
      include: { proiect: true },
    });
    if (!clarificare) return res.status(404).json({ mesaj: 'Clarificarea nu exista.' });
    if (clarificare.proiect.dezvoltatorId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Poti raspunde doar la intrebarile de pe proiectele tale.' });
    }

    const actualizata = await prisma.clarificare.update({
      where: { id: req.params.id },
      data: { raspuns: raspuns.trim().slice(0, 2000), raspunsLa: new Date() },
      include: { autor: { select: AUTOR_SELECT } },
    });

    creeazaNotificare({
      userId: clarificare.autorId,
      tip: 'proiect',
      titlu: `Ai primit un răspuns la întrebarea ta`,
      mesaj: `${clarificare.proiect.titlu}: ${raspuns.trim().slice(0, 80)}`,
      proiectId: clarificare.proiectId,
    });

    res.json(serializeClarificare(actualizata));
  } catch (err) {
    console.error('[clarificari PUT /:id/raspuns]', err);
    res.status(500).json({ mesaj: 'Eroare la salvarea raspunsului.' });
  }
});

module.exports = router;
