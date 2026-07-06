const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat } = require('../middleware/auth');
const { serializeMesaj } = require('../lib/serialize');
const { notificaMesajNou } = require('../lib/mailer');
const { creeazaNotificare } = require('../lib/notificari');

// ─── GET /api/chat/:proiectId ──────────────────────────────────────────────────
router.get('/:proiectId', protejat, async (req, res) => {
  try {
    const mesaje = await prisma.mesaj.findMany({
      where: { proiectId: req.params.proiectId },
      include: { expeditor: { select: { id: true, nume: true, rol: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(mesaje.map(serializeMesaj));
  } catch (err) {
    console.error('[chat GET /:proiectId]', err);
    res.status(500).json({ mesaj: 'Eroare la incarcarea mesajelor.' });
  }
});

// ─── POST /api/chat ─────────────────────────────────────────────────────────────
router.post('/', protejat, async (req, res) => {
  try {
    const { proiectId, text } = req.body;
    if (!proiectId || !text || !text.trim()) {
      return res.status(400).json({ mesaj: 'Campurile proiectId si text sunt obligatorii.' });
    }

    const proiect = await prisma.project.findUnique({ where: { id: proiectId }, include: { dezvoltator: true } });
    if (!proiect) return res.status(404).json({ mesaj: 'Proiectul nu exista.' });

    const mesaj = await prisma.mesaj.create({
      data: { proiectId, expeditorId: req.utilizator.id, text: text.trim() },
      include: { expeditor: { select: { id: true, nume: true, rol: true } } },
    });

    try {
      const { getIO } = require('../sockets');
      getIO().to(`chat_${proiectId}`).emit('mesaj_nou', serializeMesaj(mesaj));
    } catch (e) { /* socket indisponibil - ignoram */ }

    // ── Notificare email pentru celălalt/ceilalți participanți ──
    // Camera de chat e per proiect: dacă expeditorul e dezvoltatorul,
    // notificăm subcontractorii care au mai scris în acea cameră; altfel
    // notificăm direct dezvoltatorul proiectului.
    if (req.utilizator.id === proiect.dezvoltatorId) {
      const altiParticipanti = await prisma.mesaj.findMany({
        where: { proiectId, expeditorId: { not: proiect.dezvoltatorId } },
        distinct: ['expeditorId'],
        include: { expeditor: true },
      });
      altiParticipanti.forEach(m => {
        notificaMesajNou({ destinatar: m.expeditor, expeditorNume: req.utilizator.nume, proiect, text: text.trim() });
        creeazaNotificare({
          userId: m.expeditorId,
          tip: 'proiect',
          titlu: `Mesaj nou de la ${req.utilizator.nume}`,
          mesaj: `${proiect.titlu}: ${text.trim().slice(0, 80)}`,
          proiectId: proiect.id,
        });
      });
    } else {
      notificaMesajNou({ destinatar: proiect.dezvoltator, expeditorNume: req.utilizator.nume, proiect, text: text.trim() });
      creeazaNotificare({
        userId: proiect.dezvoltatorId,
        tip: 'proiect',
        titlu: `Mesaj nou de la ${req.utilizator.nume}`,
        mesaj: `${proiect.titlu}: ${text.trim().slice(0, 80)}`,
        proiectId: proiect.id,
      });
    }

    res.status(201).json(serializeMesaj(mesaj));
  } catch (err) {
    console.error('[chat POST /]', err);
    res.status(500).json({ mesaj: 'Eroare la trimiterea mesajului.' });
  }
});

module.exports = router;
