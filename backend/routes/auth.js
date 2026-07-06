const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { serializeUserFull } = require('../lib/serialize');
const { protejat } = require('../middleware/auth');
const { trimiteCodVerificare, genereazaCod } = require('../lib/mailer');

const DURATA_COD_MS = 15 * 60 * 1000; // 15 minute

const genToken = (user) => jwt.sign(
  { id: user.id, rol: user.rol },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

router.post('/register', async (req, res) => {
  try {
    const { nume, email, parola, cui, telefon, judet, rol } = req.body;
    if (!nume || !email || !parola || !cui || !telefon || !judet) {
      return res.status(400).json({ mesaj: 'Toate campurile sunt obligatorii.' });
    }
    const exista = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (exista) {
      return res.status(409).json({ mesaj: 'Exista deja un cont cu acest email.' });
    }
    const parolaHash = await bcrypt.hash(parola, 10);
    const cod = genereazaCod();
    const user = await prisma.user.create({
      data: {
        nume: nume.trim(),
        email: email.toLowerCase().trim(),
        parola: parolaHash,
        cui: cui.trim(),
        telefon: telefon.trim(),
        judet,
        rol: rol === 'DEZVOLTATOR' ? 'DEZVOLTATOR' : 'SUBCONTRACTOR',
        codVerificare: cod,
        codVerificareExpira: new Date(Date.now() + DURATA_COD_MS),
      },
      include: { lucrari: true, disponibilitati: true },
    });

    try {
      await trimiteCodVerificare(user.email, user.nume, cod);
    } catch (e) {
      // Nu blocăm înregistrarea dacă emailul nu poate fi trimis — contul
      // rămâne creat, iar utilizatorul poate cere un cod nou din /retrimite-cod.
      console.error('[register] eroare trimitere email verificare:', e.message);
    }

    res.status(201).json({ token: genToken(user), utilizator: serializeUserFull(user) });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ mesaj: 'Eroare server la inregistrare.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, parola } = req.body;
    if (!email || !parola) {
      return res.status(400).json({ mesaj: 'Email si parola sunt obligatorii.' });
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { lucrari: true, disponibilitati: true },
    });
    if (!user) {
      return res.status(401).json({ mesaj: 'Email sau parola incorecta.' });
    }
    const ok = await bcrypt.compare(parola, user.parola);
    if (!ok) {
      return res.status(401).json({ mesaj: 'Email sau parola incorecta.' });
    }
    res.json({ token: genToken(user), utilizator: serializeUserFull(user) });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ mesaj: 'Eroare server la autentificare.' });
  }
});

router.get('/me', protejat, (req, res) => {
  res.json({ utilizator: serializeUserFull(req.utilizator) });
});

router.put('/profil', protejat, async (req, res) => {
  try {
    const { descriere, aniExperienta, nrAngajati, categoriiServicii, judeteServicii, telefon } = req.body;
    const data = {};

    if (descriere !== undefined) data.descriere = String(descriere).slice(0, 1000);
    if (aniExperienta !== undefined) data.aniExperienta = aniExperienta === '' ? null : Number(aniExperienta);
    if (nrAngajati !== undefined) data.nrAngajati = nrAngajati === '' ? null : Number(nrAngajati);
    if (Array.isArray(categoriiServicii)) data.categoriiServicii = categoriiServicii;
    if (Array.isArray(judeteServicii)) data.judeteServicii = judeteServicii;
    if (telefon) data.telefon = telefon;

    const u = await prisma.user.update({
      where: { id: req.utilizator.id },
      data,
      include: { lucrari: true, disponibilitati: true },
    });
    res.json({ utilizator: serializeUserFull(u) });
  } catch (err) {
    console.error('[profil]', err);
    res.status(500).json({ mesaj: 'Eroare server la actualizarea profilului.' });
  }
});

// ─── PORTOFOLIU (lucrări realizate) — doar SUBCONTRACTOR ─────────────────────
router.post('/lucrari', protejat, async (req, res) => {
  try {
    if (req.utilizator.rol !== 'SUBCONTRACTOR') {
      return res.status(403).json({ mesaj: 'Doar subcontractorii pot adăuga lucrări în portofoliu.' });
    }
    const { titlu, descriere, an, categorie } = req.body;
    if (!titlu || !titlu.trim()) {
      return res.status(400).json({ mesaj: 'Titlul lucrării este obligatoriu.' });
    }
    await prisma.lucrare.create({
      data: {
        userId: req.utilizator.id,
        titlu: titlu.trim().slice(0, 140),
        descriere: (descriere || '').trim().slice(0, 600),
        an: an ? Number(an) : null,
        categorie: categorie || '',
      },
    });
    const u = await prisma.user.findUnique({
      where: { id: req.utilizator.id },
      include: { lucrari: { orderBy: { createdAt: 'desc' } }, disponibilitati: true },
    });
    res.status(201).json({ utilizator: serializeUserFull(u) });
  } catch (err) {
    console.error('[auth POST /lucrari]', err);
    res.status(500).json({ mesaj: 'Eroare la adăugarea lucrării.' });
  }
});

router.delete('/lucrari/:lucrareId', protejat, async (req, res) => {
  try {
    await prisma.lucrare.deleteMany({ where: { id: req.params.lucrareId, userId: req.utilizator.id } });
    const u = await prisma.user.findUnique({
      where: { id: req.utilizator.id },
      include: { lucrari: { orderBy: { createdAt: 'desc' } }, disponibilitati: true },
    });
    res.json({ utilizator: serializeUserFull(u) });
  } catch (err) {
    console.error('[auth DELETE /lucrari/:id]', err);
    res.status(500).json({ mesaj: 'Eroare la ștergerea lucrării.' });
  }
});

// ─── DISPONIBILITATE (perioade libere) — doar SUBCONTRACTOR ──────────────────
router.post('/disponibilitate', protejat, async (req, res) => {
  try {
    if (req.utilizator.rol !== 'SUBCONTRACTOR') {
      return res.status(403).json({ mesaj: 'Doar subcontractorii pot seta disponibilitate.' });
    }
    const { start, end, nota } = req.body;
    if (!start || !end) {
      return res.status(400).json({ mesaj: 'Datele de start și final sunt obligatorii.' });
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return res.status(400).json({ mesaj: 'Interval de date invalid.' });
    }
    await prisma.disponibilitate.create({
      data: { userId: req.utilizator.id, start: startDate, end: endDate, nota: (nota || '').slice(0, 200) },
    });
    const u = await prisma.user.findUnique({
      where: { id: req.utilizator.id },
      include: { lucrari: true, disponibilitati: { orderBy: { start: 'asc' } } },
    });
    res.status(201).json({ utilizator: serializeUserFull(u) });
  } catch (err) {
    console.error('[auth POST /disponibilitate]', err);
    res.status(500).json({ mesaj: 'Eroare la adăugarea intervalului de disponibilitate.' });
  }
});

router.delete('/disponibilitate/:intervalId', protejat, async (req, res) => {
  try {
    await prisma.disponibilitate.deleteMany({ where: { id: req.params.intervalId, userId: req.utilizator.id } });
    const u = await prisma.user.findUnique({
      where: { id: req.utilizator.id },
      include: { lucrari: true, disponibilitati: { orderBy: { start: 'asc' } } },
    });
    res.json({ utilizator: serializeUserFull(u) });
  } catch (err) {
    console.error('[auth DELETE /disponibilitate/:id]', err);
    res.status(500).json({ mesaj: 'Eroare la ștergerea intervalului.' });
  }
});

// ─── VERIFICARE CONT PRIN COD TRIMIS PE EMAIL ─────────────────────────────────
router.post('/verifica-cont', protejat, async (req, res) => {
  try {
    if (req.utilizator.verificat) {
      return res.json({ utilizator: serializeUserFull(req.utilizator) });
    }
    const { cod } = req.body;
    if (!cod) {
      return res.status(400).json({ mesaj: 'Codul de verificare este obligatoriu.' });
    }
    if (!req.utilizator.codVerificare || req.utilizator.codVerificare !== String(cod).trim()) {
      return res.status(400).json({ mesaj: 'Cod de verificare incorect.' });
    }
    if (!req.utilizator.codVerificareExpira || req.utilizator.codVerificareExpira.getTime() < Date.now()) {
      return res.status(400).json({ mesaj: 'Codul de verificare a expirat. Cere unul nou.' });
    }

    const u = await prisma.user.update({
      where: { id: req.utilizator.id },
      data: { verificat: true, codVerificare: null, codVerificareExpira: null },
      include: { lucrari: true, disponibilitati: true },
    });
    res.json({ utilizator: serializeUserFull(u) });
  } catch (err) {
    console.error('[auth POST /verifica-cont]', err);
    res.status(500).json({ mesaj: 'Eroare la verificarea contului.' });
  }
});

router.post('/retrimite-cod', protejat, async (req, res) => {
  try {
    if (req.utilizator.verificat) {
      return res.status(400).json({ mesaj: 'Contul este deja verificat.' });
    }
    const cod = genereazaCod();
    const u = await prisma.user.update({
      where: { id: req.utilizator.id },
      data: { codVerificare: cod, codVerificareExpira: new Date(Date.now() + DURATA_COD_MS) },
    });
    await trimiteCodVerificare(u.email, u.nume, cod);
    res.json({ mesaj: 'Un cod nou a fost trimis pe email.' });
  } catch (err) {
    console.error('[auth POST /retrimite-cod]', err);
    res.status(500).json({ mesaj: 'Eroare la retrimiterea codului.' });
  }
});

module.exports = router;
