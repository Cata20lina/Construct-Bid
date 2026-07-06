const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat } = require('../middleware/auth');
const { serializeNotificare } = require('../lib/serialize');

// ─── GET /api/notificari — ultimele notificări ale utilizatorului curent ──────
router.get('/', protejat, async (req, res) => {
  try {
    const notificari = await prisma.notificare.findMany({
      where: { userId: req.utilizator.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(notificari.map(serializeNotificare));
  } catch (err) {
    console.error('[notificari GET /]', err);
    res.status(500).json({ mesaj: 'Eroare la incarcarea notificarilor.' });
  }
});

// ─── PUT /api/notificari/:id/citeste — marcheaza o notificare ca citita ───────
router.put('/:id/citeste', protejat, async (req, res) => {
  try {
    const notificare = await prisma.notificare.findUnique({ where: { id: req.params.id } });
    if (!notificare || notificare.userId !== req.utilizator.id) {
      return res.status(404).json({ mesaj: 'Notificarea nu exista.' });
    }
    const actualizata = await prisma.notificare.update({ where: { id: req.params.id }, data: { citita: true } });
    res.json(serializeNotificare(actualizata));
  } catch (err) {
    console.error('[notificari PUT /:id/citeste]', err);
    res.status(500).json({ mesaj: 'Eroare la actualizarea notificarii.' });
  }
});

// ─── PUT /api/notificari/citeste-toate — marcheaza toate notificarile ca citite ──
router.put('/citeste-toate', protejat, async (req, res) => {
  try {
    await prisma.notificare.updateMany({
      where: { userId: req.utilizator.id, citita: false },
      data: { citita: true },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[notificari PUT /citeste-toate]', err);
    res.status(500).json({ mesaj: 'Eroare la actualizarea notificarilor.' });
  }
});

// ─── DELETE /api/notificari/:id ────────────────────────────────────────────────
router.delete('/:id', protejat, async (req, res) => {
  try {
    const notificare = await prisma.notificare.findUnique({ where: { id: req.params.id } });
    if (!notificare || notificare.userId !== req.utilizator.id) {
      return res.status(404).json({ mesaj: 'Notificarea nu exista.' });
    }
    await prisma.notificare.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[notificari DELETE /:id]', err);
    res.status(500).json({ mesaj: 'Eroare la stergerea notificarii.' });
  }
});

// ─── DELETE /api/notificari — sterge toate notificarile utilizatorului curent ──
router.delete('/', protejat, async (req, res) => {
  try {
    await prisma.notificare.deleteMany({ where: { userId: req.utilizator.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[notificari DELETE /]', err);
    res.status(500).json({ mesaj: 'Eroare la stergerea notificarilor.' });
  }
});

module.exports = router;
