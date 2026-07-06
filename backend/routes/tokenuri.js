const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat } = require('../middleware/auth');
const { PLANURI, PACHETE_TOKENURI, planValid } = require('../lib/planuriAbonament');
const { crediteazaTokenuri, COSTURI } = require('../lib/tokenEconomie');

function serializeTranzactie(tz) {
  return {
    id: tz.id,
    tip: tz.tip,
    suma: tz.suma,
    soldDupa: tz.soldDupa,
    descriere: tz.descriere,
    proiectId: tz.proiectId || undefined,
    ofertaId: tz.ofertaId || undefined,
    createdAt: tz.createdAt,
  };
}

// ─── GET /api/tokenuri/planuri ─────────────────────────────────────────────────
// Public: lista planurilor de abonament disponibile (pentru pagina de prețuri).
router.get('/planuri', (req, res) => {
  res.json({ planuri: Object.values(PLANURI), pachete: PACHETE_TOKENURI });
});

// ─── GET /api/tokenuri/sold ─────────────────────────────────────────────────────
router.get('/sold', protejat, (req, res) => {
  res.json({
    tokenuri: req.utilizator.tokenuri,
    planAbonament: req.utilizator.planAbonament,
    plan: PLANURI[req.utilizator.planAbonament] || PLANURI.GRATUIT,
    costuri: COSTURI,
  });
});

// ─── GET /api/tokenuri/istoric ──────────────────────────────────────────────────
router.get('/istoric', protejat, async (req, res) => {
  try {
    const tranzactii = await prisma.tranzactieToken.findMany({
      where: { userId: req.utilizator.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ tranzactii: tranzactii.map(serializeTranzactie) });
  } catch (err) {
    console.error('[tokenuri GET /istoric]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea istoricului de tokenuri.' });
  }
});

// ─── POST /api/tokenuri/upgrade ─────────────────────────────────────────────────
// Schimbă planul de abonament. NOTĂ: nu procesează nicio plată reală încă —
// urmează să fie legat la Stripe Checkout/Billing. Până atunci, schimbarea e
// instantă și acordă imediat pachetul lunar de tokenuri al noului plan.
router.post('/upgrade', protejat, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!planValid(plan)) {
      return res.status(400).json({ mesaj: 'Plan invalid.' });
    }
    if (plan === req.utilizator.planAbonament) {
      return res.status(400).json({ mesaj: 'Ești deja pe acest plan.' });
    }

    const planNou = PLANURI[plan];

    await prisma.user.update({
      where: { id: req.utilizator.id },
      data: { planAbonament: plan, ultimaAlocareTokenuri: new Date() },
    });

    const actualizat = await crediteazaTokenuri({
      userId: req.utilizator.id,
      suma: planNou.tokenuriLunare,
      tip: 'ALOCARE_ABONAMENT',
      descriere: `Activare plan ${planNou.nume} — pachet lunar de tokenuri`,
    });

    res.json({
      mesaj: `Plan actualizat la ${planNou.nume}.`,
      planAbonament: actualizat.planAbonament,
      tokenuri: actualizat.tokenuri,
    });
  } catch (err) {
    console.error('[tokenuri POST /upgrade]', err);
    res.status(500).json({ mesaj: 'Eroare la schimbarea planului.' });
  }
});

// ─── POST /api/tokenuri/cumpara ─────────────────────────────────────────────────
// MOCK — simulează o achiziție de tokenuri reușită. Nu ia niciun card în calcul;
// urmează să fie înlocuit cu un webhook Stripe care apelează aceeași logică de
// creditare după o plată confirmată. Acceptă fie un `pachetId` predefinit, fie
// o `cantitate` custom (folosită doar pentru testare/demo).
router.post('/cumpara', protejat, async (req, res) => {
  try {
    const { pachetId, cantitate } = req.body;
    let tokenuri = 0;
    let descriere = '';

    if (pachetId) {
      const pachet = PACHETE_TOKENURI.find(p => p.id === pachetId);
      if (!pachet) return res.status(400).json({ mesaj: 'Pachet de tokenuri invalid.' });
      tokenuri = pachet.tokenuri;
      descriere = `Cumpărare pachet "${pachet.id}" (${pachet.tokenuri} tokenuri, ${pachet.pret} RON) — plată simulată`;
    } else {
      tokenuri = Number(cantitate);
      if (!Number.isFinite(tokenuri) || tokenuri <= 0) {
        return res.status(400).json({ mesaj: 'Cantitate invalidă.' });
      }
      descriere = `Cumpărare ${tokenuri} tokenuri — plată simulată`;
    }

    const actualizat = await crediteazaTokenuri({
      userId: req.utilizator.id,
      suma: tokenuri,
      tip: 'CUMPARARE',
      descriere,
    });

    res.json({ mesaj: `${tokenuri} tokenuri adăugate.`, tokenuri: actualizat.tokenuri });
  } catch (err) {
    console.error('[tokenuri POST /cumpara]', err);
    res.status(500).json({ mesaj: 'Eroare la cumpărarea tokenurilor.' });
  }
});

module.exports = router;
