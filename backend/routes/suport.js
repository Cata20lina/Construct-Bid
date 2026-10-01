const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat, doarRol } = require('../middleware/auth');
const { limiteazaMesajeSuport } = require('../middleware/rateLimit');
const { serializeMesajSuport, serializeConversatieSuport } = require('../lib/serialize');
const { notificaRaspunsSuport } = require('../lib/mailer');
const { creeazaNotificare } = require('../lib/notificari');

// Chat-ul de suport: fiecare utilizator are un singur fir de conversație cu
// echipa platformei (conturile ADMIN). Firul poate fi marcat „rezolvat” din
// panoul de admin și se redeschide automat la următorul mesaj al utilizatorului.
//
// Live: mesajele utilizatorului ajung în camera `suport_admin` (la care se
// alătură doar socket-urile autentificate ca ADMIN — vezi sockets.js), iar
// răspunsurile echipei în camera personală `user_<id>`.

const LUNGIME_MAXIMA = 4000;
const INCLUDE_AUTOR = { autor: { select: { id: true, nume: true } } };

function emite(camera, eveniment, date) {
  try {
    const { getIO } = require('../sockets');
    getIO().to(camera).emit(eveniment, date);
  } catch (e) { /* socket indisponibil - ignoram */ }
}

function textValid(text) {
  return typeof text === 'string' && text.trim().length > 0;
}

// Mesajele trimise de cealaltă parte după ultima citire
function numaraNecitite(conversatie, pentruAdmin) {
  const cititLa = pentruAdmin ? conversatie.cititAdminLa : conversatie.cititUserLa;
  return prisma.mesajSuport.count({
    where: {
      conversatieId: conversatie.id,
      deLaSuport: !pentruAdmin,
      ...(cititLa ? { createdAt: { gt: cititLa } } : {}),
    },
  });
}

// ═══ Partea utilizatorului ═══════════════════════════════════════════════

// ─── GET /api/suport ─────────────────────────────────────────────────────
// Firul propriu de suport (sau gol, dacă utilizatorul n-a scris încă nimic).
router.get('/', protejat, async (req, res) => {
  try {
    const conversatie = await prisma.conversatieSuport.findUnique({
      where: { userId: req.utilizator.id },
      include: { mesaje: { include: INCLUDE_AUTOR, orderBy: { createdAt: 'asc' } } },
    });
    if (!conversatie) return res.json({ status: null, mesaje: [], necitite: 0 });

    res.json({
      status: conversatie.status,
      mesaje: conversatie.mesaje.map(serializeMesajSuport),
      necitite: await numaraNecitite(conversatie, false),
    });
  } catch (err) {
    console.error('[suport GET /]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea conversației de suport.' });
  }
});

// ─── POST /api/suport/mesaje ─────────────────────────────────────────────
router.post('/mesaje', protejat, limiteazaMesajeSuport, async (req, res) => {
  try {
    const { text } = req.body;
    if (!textValid(text)) return res.status(400).json({ mesaj: 'Mesajul nu poate fi gol.' });

    const acum = new Date();
    const existenta = await prisma.conversatieSuport.findUnique({ where: { userId: req.utilizator.id } });
    const conversatie = await prisma.conversatieSuport.upsert({
      where: { userId: req.utilizator.id },
      create: { userId: req.utilizator.id, cititUserLa: acum, ultimulMesajLa: acum },
      update: { status: 'deschisa', cititUserLa: acum, ultimulMesajLa: acum },
      include: { user: true },
    });

    const mesaj = await prisma.mesajSuport.create({
      data: { conversatieId: conversatie.id, autorId: req.utilizator.id, text: text.trim().slice(0, LUNGIME_MAXIMA) },
      include: INCLUDE_AUTOR,
    });

    const mesajSerializat = serializeMesajSuport(mesaj);
    emite(`user_${req.utilizator.id}`, 'suport_mesaj_nou', mesajSerializat); // alte file deschise ale utilizatorului
    emite('suport_admin', 'suport_admin_mesaj', {
      conversatie: serializeConversatieSuport({
        ...conversatie,
        ultimulMesaj: mesaj,
        necitite: await numaraNecitite(conversatie, true),
      }),
      mesaj: mesajSerializat,
    });

    // Conversație nouă sau redeschisă → anunțăm adminii și prin notificare
    // persistentă (restul mesajelor dintr-un fir deja deschis nu mai generează
    // notificări, ca să nu umple lista).
    if (!existenta || existenta.status === 'rezolvata') {
      const admini = await prisma.user.findMany({ where: { rol: 'ADMIN' }, select: { id: true } });
      admini.forEach(a => creeazaNotificare({
        userId: a.id,
        tip: 'alerta',
        titlu: `Solicitare de suport de la ${req.utilizator.nume}`,
        link: 'admin:suport',
        mesaj: mesaj.text.slice(0, 120),
      }));
    }

    res.status(201).json(mesajSerializat);
  } catch (err) {
    console.error('[suport POST /mesaje]', err);
    res.status(500).json({ mesaj: 'Eroare la trimiterea mesajului.' });
  }
});

// ─── POST /api/suport/citit ──────────────────────────────────────────────
router.post('/citit', protejat, async (req, res) => {
  try {
    await prisma.conversatieSuport.updateMany({
      where: { userId: req.utilizator.id },
      data: { cititUserLa: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[suport POST /citit]', err);
    res.status(500).json({ mesaj: 'Eroare la marcarea mesajelor ca citite.' });
  }
});

// ═══ Partea echipei (ADMIN) ══════════════════════════════════════════════

const doarAdmin = [protejat, doarRol('ADMIN')];

// ─── GET /api/suport/admin/conversatii?status= ───────────────────────────
router.get('/admin/conversatii', doarAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const conversatii = await prisma.conversatieSuport.findMany({
      where: status ? { status } : {},
      include: {
        user: { select: { id: true, nume: true, email: true, rol: true } },
        mesaje: { include: INCLUDE_AUTOR, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { ultimulMesajLa: 'desc' },
      take: 200,
    });

    const rezultat = await Promise.all(conversatii.map(async c => serializeConversatieSuport({
      ...c,
      ultimulMesaj: c.mesaje[0] || null,
      necitite: await numaraNecitite(c, true),
    })));
    res.json(rezultat);
  } catch (err) {
    console.error('[suport GET /admin/conversatii]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea conversațiilor de suport.' });
  }
});

// ─── GET /api/suport/admin/conversatii/:id ───────────────────────────────
// Deschiderea unui fir îl marchează ca citit de echipă.
router.get('/admin/conversatii/:id', doarAdmin, async (req, res) => {
  try {
    const conversatie = await prisma.conversatieSuport.update({
      where: { id: req.params.id },
      data: { cititAdminLa: new Date() },
      include: {
        user: { select: { id: true, nume: true, email: true, rol: true } },
        mesaje: { include: INCLUDE_AUTOR, orderBy: { createdAt: 'asc' } },
      },
    });
    res.json({
      conversatie: serializeConversatieSuport({ ...conversatie, ultimulMesaj: conversatie.mesaje.at(-1) || null, necitite: 0 }),
      mesaje: conversatie.mesaje.map(serializeMesajSuport),
    });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ mesaj: 'Conversația nu există.' });
    console.error('[suport GET /admin/conversatii/:id]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea conversației.' });
  }
});

// ─── POST /api/suport/admin/conversatii/:id/mesaje ───────────────────────
router.post('/admin/conversatii/:id/mesaje', doarAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!textValid(text)) return res.status(400).json({ mesaj: 'Mesajul nu poate fi gol.' });

    const acum = new Date();
    const conversatie = await prisma.conversatieSuport.update({
      where: { id: req.params.id },
      data: { cititAdminLa: acum, ultimulMesajLa: acum },
      include: { user: true },
    });

    const mesaj = await prisma.mesajSuport.create({
      data: { conversatieId: conversatie.id, autorId: req.utilizator.id, text: text.trim().slice(0, LUNGIME_MAXIMA), deLaSuport: true },
      include: INCLUDE_AUTOR,
    });

    const mesajSerializat = serializeMesajSuport(mesaj);
    emite(`user_${conversatie.userId}`, 'suport_mesaj_nou', mesajSerializat);
    emite('suport_admin', 'suport_admin_mesaj', {
      conversatie: serializeConversatieSuport({ ...conversatie, ultimulMesaj: mesaj, necitite: 0 }),
      mesaj: mesajSerializat,
    });

    notificaRaspunsSuport({ destinatar: conversatie.user, text: mesaj.text });
    creeazaNotificare({
      userId: conversatie.userId,
      tip: 'alerta',
      titlu: 'Răspuns de la echipa de suport',
      link: 'suport',
      mesaj: mesaj.text.slice(0, 120),
    });

    res.status(201).json(mesajSerializat);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ mesaj: 'Conversația nu există.' });
    console.error('[suport POST /admin/conversatii/:id/mesaje]', err);
    res.status(500).json({ mesaj: 'Eroare la trimiterea răspunsului.' });
  }
});

// ─── POST /api/suport/admin/conversatii/:id/citit ────────────────────────
router.post('/admin/conversatii/:id/citit', doarAdmin, async (req, res) => {
  try {
    await prisma.conversatieSuport.updateMany({
      where: { id: req.params.id },
      data: { cititAdminLa: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[suport POST /admin/conversatii/:id/citit]', err);
    res.status(500).json({ mesaj: 'Eroare la marcarea mesajelor ca citite.' });
  }
});

// ─── PATCH /api/suport/admin/conversatii/:id ─────────────────────────────
// { status: 'deschisa' | 'rezolvata' }
router.patch('/admin/conversatii/:id', doarAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['deschisa', 'rezolvata'].includes(status)) {
      return res.status(400).json({ mesaj: 'Status invalid.' });
    }
    const conversatie = await prisma.conversatieSuport.update({
      where: { id: req.params.id },
      data: { status },
    });
    emite(`user_${conversatie.userId}`, 'suport_status', { status });
    res.json({ status: conversatie.status });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ mesaj: 'Conversația nu există.' });
    console.error('[suport PATCH /admin/conversatii/:id]', err);
    res.status(500).json({ mesaj: 'Eroare la actualizarea conversației.' });
  }
});

module.exports = router;
