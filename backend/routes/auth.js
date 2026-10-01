const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { serializeUserFull, serializeEvaluare } = require('../lib/serialize');
const { protejat } = require('../middleware/auth');
const { trimiteCodVerificare, trimiteCodResetareParola, genereazaCod } = require('../lib/mailer');
const { verificaCuiLaAnaf, cuiValid } = require('./cui');
const { limiteazaAutentificare, limiteazaCoduriEmail } = require('../middleware/rateLimit');

const DURATA_COD_MS = 15 * 60 * 1000; // 15 minute

const genToken = (user) => jwt.sign(
  { id: user.id, rol: user.rol },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

router.post('/register', limiteazaAutentificare, async (req, res) => {
  try {
    const { nume, email, parola, cui, telefon, judet, rol, termeniAcceptati } = req.body;
    if (!nume || !email || !parola || !cui || !telefon || !judet) {
      return res.status(400).json({ mesaj: 'Toate campurile sunt obligatorii.' });
    }
    if (!termeniAcceptati) {
      return res.status(400).json({ mesaj: 'Trebuie să accepți Termenii și Condițiile și Politica de Confidențialitate pentru a-ți crea un cont.' });
    }
    const exista = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (exista) {
      return res.status(409).json({ mesaj: 'Exista deja un cont cu acest email.' });
    }

    // ── Verificare CUI la ANAF, direct la înregistrare ──────────────────────
    // Blocăm doar dacă ANAF confirmă clar că nu există nicio firmă cu acest
    // CUI (cineva a inventat un cod fiscal). Dacă ANAF nu răspunde (serviciu
    // căzut, timeout), NU blocăm înregistrarea — nu e vina utilizatorului că
    // ANAF e indisponibil, iar contul poate fi verificat ulterior din profil.
    const cuiCurat = String(cui).replace(/[^0-9]/g, '');
    if (!cuiValid(cuiCurat)) {
      return res.status(400).json({ mesaj: `CUI ${cuiCurat || cui} nu este valid (cifra de control nu se potrivește). Verifică dacă l-ai scris corect.` });
    }
    let cuiInfo = { gasit: false };
    try {
      cuiInfo = await verificaCuiLaAnaf(cuiCurat);
      if (!cuiInfo.gasit) {
        return res.status(400).json({ mesaj: `Nu am găsit nicio firmă înregistrată cu CUI ${cuiCurat} la ANAF. Verifică CUI-ul introdus.` });
      }
    } catch (e) {
      console.error('[register] ANAF indisponibil la verificarea CUI, continuăm fără verificare:', e.message);
      cuiInfo = { gasit: false };
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
        rol: ['DEZVOLTATOR', 'FURNIZOR'].includes(rol) ? rol : 'SUBCONTRACTOR',
        codVerificare: cod,
        codVerificareExpira: new Date(Date.now() + DURATA_COD_MS),
        termeniAcceptatiLa: new Date(),
        ...(cuiInfo.gasit ? {
          cuiVerificat: !cuiInfo.stareInactiv,
          cuiDenumireOficiala: cuiInfo.denumire || '',
          cuiVerificatLa: new Date(),
        } : {}),
      },
      include: { lucrari: true, disponibilitati: true, recomandari: { orderBy: { createdAt: 'desc' } } },
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

router.post('/login', limiteazaAutentificare, async (req, res) => {
  try {
    const { email, parola } = req.body;
    if (!email || !parola) {
      return res.status(400).json({ mesaj: 'Email si parola sunt obligatorii.' });
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { lucrari: true, disponibilitati: true, recomandari: { orderBy: { createdAt: 'desc' } } },
    });
    if (!user) {
      return res.status(401).json({ mesaj: 'Email sau parola incorecta.' });
    }
    const ok = await bcrypt.compare(parola, user.parola);
    if (!ok) {
      return res.status(401).json({ mesaj: 'Email sau parola incorecta.' });
    }
    if (user.suspendat) {
      return res.status(403).json({ mesaj: `Contul tău a fost suspendat.${user.suspendatMotiv ? ` Motiv: ${user.suspendatMotiv}` : ''} Contactează-ne dacă crezi că e o greșeală.` });
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
    const { descriere, aniExperienta, nrAngajati, categoriiServicii, judeteServicii, telefon, siteWeb } = req.body;
    const data = {};

    if (descriere !== undefined) data.descriere = String(descriere).slice(0, 1000);
    if (aniExperienta !== undefined) data.aniExperienta = aniExperienta === '' ? null : Number(aniExperienta);
    if (nrAngajati !== undefined) data.nrAngajati = nrAngajati === '' ? null : Number(nrAngajati);
    if (Array.isArray(categoriiServicii)) data.categoriiServicii = categoriiServicii;
    if (Array.isArray(judeteServicii)) data.judeteServicii = judeteServicii;
    if (telefon) data.telefon = telefon;
    if (siteWeb !== undefined) data.siteWeb = String(siteWeb).trim().slice(0, 300);

    const u = await prisma.user.update({
      where: { id: req.utilizator.id },
      data,
      include: { lucrari: true, disponibilitati: true, recomandari: { orderBy: { createdAt: 'desc' } } },
    });
    res.json({ utilizator: serializeUserFull(u) });
  } catch (err) {
    console.error('[profil]', err);
    res.status(500).json({ mesaj: 'Eroare server la actualizarea profilului.' });
  }
});

// ─── PORTOFOLIU — SUBCONTRACTOR (lucrări realizate) și FURNIZOR (catalog de
//     produse/materiale, refolosind același model) ────────────────────────────
router.post('/lucrari', protejat, async (req, res) => {
  try {
    if (!['SUBCONTRACTOR', 'FURNIZOR'].includes(req.utilizator.rol)) {
      return res.status(403).json({ mesaj: 'Doar subcontractorii și furnizorii pot adăuga în portofoliu/catalog.' });
    }
    const { titlu, descriere, an, categorie, pret, unitateMasura } = req.body;
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
        // Relevante doar pentru catalogul unui FURNIZOR — un subcontractor
        // pur și simplu nu le trimite, și rămân null.
        pret: pret !== undefined && pret !== null && pret !== '' ? Number(pret) : null,
        unitateMasura: unitateMasura ? String(unitateMasura).trim().slice(0, 20) : '',
      },
    });
    const u = await prisma.user.findUnique({
      where: { id: req.utilizator.id },
      include: { lucrari: { orderBy: { createdAt: 'desc' } }, disponibilitati: true, recomandari: { orderBy: { createdAt: 'desc' } } },
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
      include: { lucrari: { orderBy: { createdAt: 'desc' } }, disponibilitati: true, recomandari: { orderBy: { createdAt: 'desc' } } },
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
      include: { lucrari: true, disponibilitati: { orderBy: { start: 'asc' } }, recomandari: { orderBy: { createdAt: 'desc' } } },
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
      include: { lucrari: true, disponibilitati: { orderBy: { start: 'asc' } }, recomandari: { orderBy: { createdAt: 'desc' } } },
    });
    res.json({ utilizator: serializeUserFull(u) });
  } catch (err) {
    console.error('[auth DELETE /disponibilitate/:id]', err);
    res.status(500).json({ mesaj: 'Eroare la ștergerea intervalului.' });
  }
});

// ─── RECOMANDĂRI / REFERINȚE (contracte încheiate, cu document justificativ) —
//     SUBCONTRACTOR și FURNIZOR ────────────────────────────────────────────────
router.post('/recomandari', protejat, async (req, res) => {
  try {
    if (!['SUBCONTRACTOR', 'FURNIZOR'].includes(req.utilizator.rol)) {
      return res.status(403).json({ mesaj: 'Doar subcontractorii și furnizorii pot adăuga recomandări.' });
    }
    const { categorie, valoareContract, documentUrl, documentNume, descriere } = req.body;
    if (!categorie || !categorie.trim()) {
      return res.status(400).json({ mesaj: 'Categoria lucrării este obligatorie.' });
    }
    await prisma.recomandare.create({
      data: {
        userId: req.utilizator.id,
        categorie: categorie.trim(),
        valoareContract: valoareContract !== undefined && valoareContract !== null && valoareContract !== ''
          ? Number(valoareContract) : null,
        documentUrl: (documentUrl || '').trim(),
        documentNume: (documentNume || '').trim(),
        descriere: (descriere || '').trim().slice(0, 500),
      },
    });
    const u = await prisma.user.findUnique({
      where: { id: req.utilizator.id },
      include: { lucrari: true, disponibilitati: true, recomandari: { orderBy: { createdAt: 'desc' } } },
    });
    res.status(201).json({ utilizator: serializeUserFull(u) });
  } catch (err) {
    console.error('[auth POST /recomandari]', err);
    res.status(500).json({ mesaj: 'Eroare la adăugarea recomandării.' });
  }
});

router.delete('/recomandari/:recomandareId', protejat, async (req, res) => {
  try {
    await prisma.recomandare.deleteMany({ where: { id: req.params.recomandareId, userId: req.utilizator.id } });
    const u = await prisma.user.findUnique({
      where: { id: req.utilizator.id },
      include: { lucrari: true, disponibilitati: true, recomandari: { orderBy: { createdAt: 'desc' } } },
    });
    res.json({ utilizator: serializeUserFull(u) });
  } catch (err) {
    console.error('[auth DELETE /recomandari/:id]', err);
    res.status(500).json({ mesaj: 'Eroare la ștergerea recomandării.' });
  }
});

// ─── RATING — evaluările primite de contul curent (subcontractor) ────────────
router.get('/evaluari-primite', protejat, async (req, res) => {
  try {
    const evaluari = await prisma.evaluare.findMany({
      where: { evaluatId: req.utilizator.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      evaluari: evaluari.map(serializeEvaluare),
      ratingMediu: req.utilizator.ratingMediu || 0,
      ratingNumarEvaluari: req.utilizator.ratingNumarEvaluari || 0,
    });
  } catch (err) {
    console.error('[auth GET /evaluari-primite]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea evaluărilor.' });
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
      include: { lucrari: true, disponibilitati: true, recomandari: { orderBy: { createdAt: 'desc' } } },
    });
    res.json({ utilizator: serializeUserFull(u) });
  } catch (err) {
    console.error('[auth POST /verifica-cont]', err);
    res.status(500).json({ mesaj: 'Eroare la verificarea contului.' });
  }
});

router.post('/retrimite-cod', protejat, limiteazaCoduriEmail, async (req, res) => {
  try {
    if (req.utilizator.verificat) {
      return res.status(400).json({ mesaj: 'Contul este deja verificat.' });
    }
    const cod = genereazaCod();
    const u = await prisma.user.update({
      where: { id: req.utilizator.id },
      data: { codVerificare: cod, codVerificareExpira: new Date(Date.now() + DURATA_COD_MS) },
    });

    // Codul e deja salvat în baza de date la acest punct — nu lăsăm un eșec
    // de trimitere email (SMTP căzut temporar, rețea etc.) să întoarcă 500,
    // pentru că utilizatorul tot poate cere din nou codul, iar contul nu
    // trebuie să rămână blocat din cauza unei probleme tranzitorii de rețea.
    let emailTrimis = true;
    try {
      await trimiteCodVerificare(u.email, u.nume, cod);
    } catch (e) {
      emailTrimis = false;
      console.error('[auth POST /retrimite-cod] eroare trimitere email:', e.message);
    }

    res.json({
      mesaj: emailTrimis
        ? 'Un cod nou a fost trimis pe email.'
        : 'Codul a fost generat, dar emailul nu a putut fi trimis chiar acum (verifică setările SMTP din .env sau încearcă din nou în câteva secunde).',
      emailTrimis,
    });
  } catch (err) {
    console.error('[auth POST /retrimite-cod]', err);
    res.status(500).json({ mesaj: 'Eroare la retrimiterea codului.' });
  }
});

// ─── Resetare parolă uitată ──────────────────────────────────────────────
// Flux în doi pași, cu cod din 6 cifre (la fel ca verificarea de email) —
// nu link-uri cu token, pentru că frontend-ul e un SPA fără rutare proprie.
//
// POST /auth/solicita-resetare { email } — generează codul și îl trimite.
// Spune explicit dacă emailul nu are cont pe platformă (cerință punctuală) —
// notă: asta face posibilă enumerarea emailurilor înregistrate (cineva poate
// încerca adrese la întâmplare și vede care există). Acceptabil pentru un
// beta cu utilizatori cunoscuți; dacă platforma ajunge publică, ideal ar fi
// revenit la un mesaj generic, identic indiferent dacă emailul există sau nu.
router.post('/solicita-resetare', limiteazaCoduriEmail, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ mesaj: 'Introdu adresa de email.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(404).json({ mesaj: 'Nu există niciun cont cu acest email.' });
    }

    const cod = genereazaCod();
    await prisma.user.update({
      where: { id: user.id },
      data: { codResetareParola: cod, codResetareParolaExpira: new Date(Date.now() + DURATA_COD_MS) },
    });

    let emailTrimis = true;
    try {
      await trimiteCodResetareParola(user.email, user.nume, cod);
    } catch (e) {
      emailTrimis = false;
      console.error('[auth POST /solicita-resetare] eroare trimitere email:', e.message);
    }

    res.json({
      mesaj: emailTrimis
        ? 'Ți-am trimis un cod de resetare pe email.'
        : 'Codul a fost generat, dar emailul nu a putut fi trimis chiar acum. Încearcă din nou în câteva secunde.',
      emailTrimis,
    });
  } catch (err) {
    console.error('[auth POST /solicita-resetare]', err);
    res.status(500).json({ mesaj: 'Eroare la solicitarea resetării parolei.' });
  }
});

// POST /auth/reseteaza-parola { email, cod, parolaNoua } — validează codul
// și schimbă parola. Nu necesită autentificare (utilizatorul tocmai și-a
// uitat parola).
router.post('/reseteaza-parola', limiteazaCoduriEmail, async (req, res) => {
  try {
    const { email, cod, parolaNoua } = req.body;
    if (!email || !cod || !parolaNoua) {
      return res.status(400).json({ mesaj: 'Email, cod și parola nouă sunt obligatorii.' });
    }
    if (parolaNoua.length < 6) {
      return res.status(400).json({ mesaj: 'Parola trebuie să aibă cel puțin 6 caractere.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.codResetareParola || user.codResetareParola !== String(cod).trim()) {
      return res.status(400).json({ mesaj: 'Cod de resetare incorect.' });
    }
    if (!user.codResetareParolaExpira || user.codResetareParolaExpira.getTime() < Date.now()) {
      return res.status(400).json({ mesaj: 'Codul de resetare a expirat. Cere unul nou.' });
    }

    const parolaHash = await bcrypt.hash(parolaNoua, 10);
    const u = await prisma.user.update({
      where: { id: user.id },
      data: { parola: parolaHash, codResetareParola: null, codResetareParolaExpira: null },
      include: { lucrari: true, disponibilitati: true, recomandari: { orderBy: { createdAt: 'desc' } } },
    });

    res.json({ token: genToken(u), utilizator: serializeUserFull(u), mesaj: 'Parola a fost schimbată cu succes.' });
  } catch (err) {
    console.error('[auth POST /reseteaza-parola]', err);
    res.status(500).json({ mesaj: 'Eroare la resetarea parolei.' });
  }
});

module.exports = router;
