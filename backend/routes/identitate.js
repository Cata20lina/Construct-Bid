const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const prisma = require('../lib/prisma');
const { protejat } = require('../middleware/auth');
const { serializeUserFull } = require('../lib/serialize');
const { salveazaDocument, caleDocument, jurnalizeaza, stergeDocumenteleContului } = require('../lib/documentePrivate');
const { notificaAdmini } = require('../lib/moderare');

// Fișierele rămân în memorie până trec verificarea de tip; abia apoi se scriu
// pe disc, în folderul privat.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 3 },
});

const campuri = upload.fields([
  { name: 'declaratie', maxCount: 1 },
  { name: 'certificat', maxCount: 1 },
  { name: 'imputernicire', maxCount: 1 },
]);

// multer aruncă erori proprii (fișier prea mare etc.) — le transformăm în mesaje clare
function cuUpload(req, res, next) {
  campuri(req, res, (err) => {
    if (!err) return next();
    const mesaj = err.code === 'LIMIT_FILE_SIZE' ? 'Fiecare fișier poate avea cel mult 10 MB.' : 'Fișierele nu au putut fi încărcate.';
    res.status(400).json({ mesaj });
  });
}

// ─── POST /api/identitate ────────────────────────────────────────────────────
// Firma trimite dovada că persoana care folosește contul o reprezintă:
//  - metoda "semnatura": o declarație PDF semnată electronic calificat de
//    administrator (sau de împuternicit + împuternicirea semnată de administrator);
//  - metoda "documente": certificat constatator ONRC + împuternicire, dacă
//    persoana nu e administrator.
router.post('/', protejat, cuUpload, async (req, res) => {
  const fisiere = req.files || {};
  const declaratie = fisiere.declaratie?.[0];
  const certificat = fisiere.certificat?.[0];
  const imputernicire = fisiere.imputernicire?.[0];

  try {
    const u = req.utilizator;
    if (u.identitateStatus === 'CONFIRMATA') {
      return res.status(400).json({ mesaj: 'Identitatea firmei e deja confirmată.' });
    }
    if (u.identitateStatus === 'IN_VERIFICARE') {
      return res.status(400).json({ mesaj: 'Ai trimis deja documentele. Așteaptă verificarea.' });
    }

    const { metoda, persoana, calitate, acord } = req.body;
    if (!['semnatura', 'documente'].includes(metoda)) return res.status(400).json({ mesaj: 'Alege metoda de confirmare.' });
    if (!String(persoana || '').trim()) return res.status(400).json({ mesaj: 'Scrie numele persoanei care reprezintă firma.' });
    if (!['administrator', 'imputernicit'].includes(calitate)) return res.status(400).json({ mesaj: 'Alege calitatea persoanei (administrator sau împuternicit).' });
    if (acord !== 'true') return res.status(400).json({ mesaj: 'Trebuie să fii de acord cu prelucrarea documentelor pentru verificare.' });

    if (metoda === 'semnatura' && !declaratie) return res.status(400).json({ mesaj: 'Încarcă declarația semnată electronic (PDF).' });
    if (metoda === 'documente' && !certificat) return res.status(400).json({ mesaj: 'Încarcă certificatul constatator.' });
    if (calitate === 'imputernicit' && !imputernicire) return res.status(400).json({ mesaj: 'Încarcă împuternicirea semnată de administrator.' });
    if (metoda === 'semnatura' && declaratie && !declaratie.buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
      return res.status(400).json({ mesaj: 'Declarația semnată electronic trebuie să fie PDF.' });
    }

    // O nouă trimitere (după o respingere) înlocuiește complet documentele vechi
    await stergeDocumenteleContului(u.id, u);

    const deSalvat = [
      metoda === 'semnatura' && ['declaratie_semnata', declaratie],
      metoda === 'documente' && ['certificat_constatator', certificat],
      calitate === 'imputernicit' && ['imputernicire', imputernicire],
    ].filter(Boolean);

    const salvate = deSalvat.map(([tip, f]) => ({ tip, numeOriginal: f.originalname.slice(0, 200), ...salveazaDocument(f) }));

    for (const s of salvate) {
      const doc = await prisma.documentIdentitate.create({ data: { ...s, userId: u.id } });
      await jurnalizeaza({ documentId: doc.id, proprietarId: u.id, actiune: 'incarcat', deCatre: u });
    }

    const actualizat = await prisma.user.update({
      where: { id: u.id },
      data: {
        identitateStatus: 'IN_VERIFICARE',
        identitateMetoda: metoda,
        identitatePersoana: String(persoana).trim().slice(0, 150),
        identitateCalitate: calitate,
        identitateTrimisaLa: new Date(),
        identitateMotivRespingere: '',
      },
      include: { lucrari: true, disponibilitati: true, recomandari: { orderBy: { createdAt: 'desc' } } },
    });

    notificaAdmini({
      titlu: 'Identitate de verificat',
      mesaj: `${u.nume} a trimis documente pentru confirmarea identității.`,
      link: 'admin:identitati',
    });

    res.status(201).json({ utilizator: serializeUserFull(actualizat) });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ mesaj: err.message });
    console.error('[identitate POST /]', err);
    res.status(500).json({ mesaj: 'Eroare la trimiterea documentelor.' });
  }
});

// ─── GET /api/identitate/documente/:id ───────────────────────────────────────
// Descărcare doar pentru firma care a încărcat documentul și pentru admini.
// Fișierul se trimite ca atașament (nu se afișează în pagină) și nu se
// păstrează în cache; fiecare descărcare e trecută în jurnal.
router.get('/documente/:id', protejat, async (req, res) => {
  try {
    const doc = await prisma.documentIdentitate.findUnique({ where: { id: req.params.id } });
    const areAcces = doc && (doc.userId === req.utilizator.id || req.utilizator.rol === 'ADMIN');
    if (!areAcces) return res.status(404).json({ mesaj: 'Documentul nu există.' });

    const cale = caleDocument(doc.numeFisier);
    if (!fs.existsSync(cale)) return res.status(404).json({ mesaj: 'Fișierul nu mai există pe server.' });

    await jurnalizeaza({ documentId: doc.id, proprietarId: doc.userId, actiune: 'descarcat', deCatre: req.utilizator });

    const numeSigur = doc.numeOriginal.replace(/[^\w.\- ]/g, '_');
    res.set({
      'Content-Type': doc.mime,
      'Content-Disposition': `attachment; filename="${numeSigur}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(cale).pipe(res);
  } catch (err) {
    console.error('[identitate GET /documente/:id]', err);
    res.status(500).json({ mesaj: 'Eroare la descărcarea documentului.' });
  }
});

module.exports = router;
