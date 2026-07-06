// ─── Planuri de abonament ───────────────────────────────────────────────────
// Configurație statică (nu în DB) — fiecare plan alocă un pachet lunar de
// tokenuri gratuite, plus limite/beneficii afișate în UI. Plata reală (card)
// nu e implementată încă: `pretLunar` e doar informativ, urmează să fie legat
// la Stripe Checkout / Billing. Până atunci, /api/tokenuri/upgrade schimbă
// planul direct (fără proces de plată) — util pentru demo și dezvoltare.

const PLANURI = {
  GRATUIT: {
    id: 'GRATUIT',
    nume: 'Gratuit',
    pretLunar: 0,
    moneda: 'RON',
    tokenuriLunare: 20,
    beneficii: [
      '20 tokenuri gratuite / lună',
      'Acces la proiectele disponibile și ofertare',
      'Analiză de piață de bază',
    ],
  },
  PRO: {
    id: 'PRO',
    nume: 'Pro',
    pretLunar: 199,
    moneda: 'RON',
    tokenuriLunare: 150,
    beneficii: [
      '150 tokenuri gratuite / lună',
      'Rapoarte de prospectare piață nelimitate ca frecvență (plătite din tokenuri)',
      'Oportunități personalizate pentru subcontractori',
      'Suport prioritar prin chat',
    ],
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    nume: 'Enterprise',
    pretLunar: 799,
    moneda: 'RON',
    tokenuriLunare: 600,
    beneficii: [
      '600 tokenuri gratuite / lună',
      'Toate beneficiile planului Pro',
      'Rapoarte de piață avansate pentru echipe',
      'Manager de cont dedicat',
    ],
  },
};

const PACHETE_TOKENURI = [
  { id: 'mic', tokenuri: 50, pret: 49 },
  { id: 'mediu', tokenuri: 150, pret: 129 },
  { id: 'mare', tokenuri: 500, pret: 399 },
];

function planValid(plan) {
  return Object.prototype.hasOwnProperty.call(PLANURI, plan);
}

module.exports = { PLANURI, PACHETE_TOKENURI, planValid };
