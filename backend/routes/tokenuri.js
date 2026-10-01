const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat } = require('../middleware/auth');
const { PLANURI, PACHETE_TOKENURI, planValid } = require('../lib/planuriAbonament');
const { crediteazaTokenuri, crediteazaDinPlataStripe, COSTURI } = require('../lib/tokenEconomie');
const { getStripe } = require('../lib/stripeClient');
const { genereazaFacturaPdf } = require('../lib/pdf');

// URL-ul frontend-ului, folosit pentru redirect după Checkout Stripe. SPA-ul
// nu are rutare proprie, deci folosim un query param pe care App.jsx îl poate
// citi la încărcare (?plata=succes / ?plata=anulata) pentru a afișa un mesaj.
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();

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

    // Planurile plătite trec prin Stripe Checkout (plată reală cu cardul) —
    // schimbarea instantă rămâne valabilă doar pentru revenirea la planul
    // Gratuit, care nu implică nicio plată.
    if (planNou.pretLunar > 0 && getStripe()) {
      return res.status(400).json({ mesaj: `Planul ${planNou.nume} necesită plată — folosește "Treci la ${planNou.nume}" pentru a plăti cu cardul.` });
    }

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
    if (getStripe()) {
      return res.status(400).json({ mesaj: 'Achiziția de tokenuri se face acum prin plată reală cu cardul — folosește un pachet din pagina de Abonament.' });
    }
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

// ─── POST /api/tokenuri/checkout-pachet ─────────────────────────────────────
// Creează o sesiune Stripe Checkout (plată unică) pentru un pachet de tokenuri.
// Întoarce URL-ul către care frontend-ul redirecționează utilizatorul.
router.post('/checkout-pachet', protejat, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ mesaj: 'Plata cu cardul nu este configurată încă pe platformă (lipsește cheia Stripe).' });
    }
    const { pachetId } = req.body;
    const pachet = PACHETE_TOKENURI.find(p => p.id === pachetId);
    if (!pachet) return res.status(400).json({ mesaj: 'Pachet de tokenuri invalid.' });

    const sesiune = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'ron',
          product_data: { name: `ConstructBid — pachet ${pachet.tokenuri} tokenuri` },
          unit_amount: Math.round(pachet.pret * 100),
        },
        quantity: 1,
      }],
      metadata: { userId: req.utilizator.id, tipPlata: 'pachet_tokenuri', pachetId: pachet.id },
      success_url: `${FRONTEND_URL}/?plata=succes`,
      cancel_url: `${FRONTEND_URL}/?plata=anulata`,
    });

    res.json({ url: sesiune.url });
  } catch (err) {
    console.error('[tokenuri POST /checkout-pachet]', err);
    res.status(500).json({ mesaj: 'Eroare la inițierea plății.' });
  }
});

// ─── POST /api/tokenuri/checkout-abonament ──────────────────────────────────
// Creează o sesiune Stripe Checkout (abonament recurent lunar) pentru un plan
// plătit. Alocarea lunară gratuită de tokenuri a planului continuă să
// funcționeze ca până acum (asigureTokenuriLunare) — webhook-ul de aici doar
// confirmă prima plată, activează planul și emite factura.
router.post('/checkout-abonament', protejat, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ mesaj: 'Plata cu cardul nu este configurată încă pe platformă (lipsește cheia Stripe).' });
    }
    const { plan } = req.body;
    if (!planValid(plan) || PLANURI[plan].pretLunar <= 0) {
      return res.status(400).json({ mesaj: 'Plan invalid pentru plată.' });
    }
    const planNou = PLANURI[plan];

    const sesiune = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'ron',
          product_data: { name: `ConstructBid — Plan ${planNou.nume}` },
          unit_amount: Math.round(planNou.pretLunar * 100),
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: { userId: req.utilizator.id, tipPlata: 'abonament', plan: planNou.id },
      success_url: `${FRONTEND_URL}/?plata=succes`,
      cancel_url: `${FRONTEND_URL}/?plata=anulata`,
    });

    res.json({ url: sesiune.url });
  } catch (err) {
    console.error('[tokenuri POST /checkout-abonament]', err);
    res.status(500).json({ mesaj: 'Eroare la inițierea plății.' });
  }
});

// ─── GET /api/tokenuri/facturi ───────────────────────────────────────────────
router.get('/facturi', protejat, async (req, res) => {
  try {
    const facturi = await prisma.factura.findMany({
      where: { userId: req.utilizator.id },
      orderBy: { numar: 'desc' },
    });
    res.json({
      facturi: facturi.map(f => ({
        numar: f.numar, serie: f.serie, suma: f.suma, descriere: f.descriere, createdAt: f.createdAt,
      })),
    });
  } catch (err) {
    console.error('[tokenuri GET /facturi]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea facturilor.' });
  }
});

// ─── GET /api/tokenuri/facturi/:numar/pdf ────────────────────────────────────
router.get('/facturi/:numar/pdf', protejat, async (req, res) => {
  try {
    const numar = Number(req.params.numar);
    const factura = await prisma.factura.findUnique({ where: { numar } });
    if (!factura || factura.userId !== req.utilizator.id) {
      return res.status(404).json({ mesaj: 'Factura nu există.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${factura.serie}-${factura.numar}.pdf"`);
    const doc = genereazaFacturaPdf({ factura, utilizator: req.utilizator });
    doc.pipe(res);
  } catch (err) {
    console.error('[tokenuri GET /facturi/:numar/pdf]', err);
    res.status(500).json({ mesaj: 'Eroare la generarea facturii.' });
  }
});

// ─── Webhook Stripe — NU e un middleware `protejat` (Stripe nu trimite JWT-ul
// nostru), semnătura request-ului e verificată cu STRIPE_WEBHOOK_SECRET.
// Exportată separat pentru că trebuie montată în server.js CU body RAW
// (express.raw), înainte de express.json() global — altfel verificarea de
// semnătură eșuează, pentru că Stripe semnează bytes-ul exact al body-ului. ──
async function manipuleazaWebhookStripe(req, res) {
  const stripe = getStripe();
  if (!stripe) return res.status(503).send('Stripe indisponibil.');

  const semnatura = req.headers['stripe-signature'];
  let event;
  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, semnatura, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // Fără secret de webhook configurat, avem încredere în body-ul parsat —
      // acceptabil doar temporar/în dezvoltare; în producție STRIPE_WEBHOOK_SECRET
      // e obligatoriu, altfel oricine ne poate trimite evenimente false.
      event = JSON.parse(req.body.toString('utf8'));
      console.warn('[stripe webhook] STRIPE_WEBHOOK_SECRET nesetat — semnătura NU e verificată. Setează-l în producție.');
    }
  } catch (err) {
    console.error('[stripe webhook] semnătură invalidă:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const sesiune = event.data.object;
      const meta = sesiune.metadata || {};
      const sumaPlatitaRon = (sesiune.amount_total || 0) / 100;

      if (meta.tipPlata === 'pachet_tokenuri') {
        const pachet = PACHETE_TOKENURI.find(p => p.id === meta.pachetId);
        if (pachet) {
          await crediteazaDinPlataStripe({
            userId: meta.userId,
            suma: pachet.tokenuri,
            tip: 'CUMPARARE',
            descriere: `Cumpărare pachet "${pachet.id}" (${pachet.tokenuri} tokenuri) — plată card`,
            stripeSessionId: sesiune.id,
            sumaPlatitaRon,
          });
        }
      } else if (meta.tipPlata === 'abonament' && planValid(meta.plan)) {
        const planNou = PLANURI[meta.plan];
        await crediteazaDinPlataStripe({
          userId: meta.userId,
          suma: planNou.tokenuriLunare,
          tip: 'ALOCARE_ABONAMENT',
          descriere: `Activare plan ${planNou.nume} — plată card`,
          stripeSessionId: sesiune.id,
          sumaPlatitaRon,
          planAbonament: planNou.id,
        });
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[stripe webhook] eroare la procesare:', err);
    // Răspundem tot 200 către Stripe ca să nu reîncerce la nesfârșit un
    // eveniment care va eșua identic — eroarea rămâne logată pentru noi.
    res.json({ received: true, eroareInterna: true });
  }
}

module.exports = router;
module.exports.manipuleazaWebhookStripe = manipuleazaWebhookStripe;
