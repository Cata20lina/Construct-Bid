// ─── Client Stripe ──────────────────────────────────────────────────────────
// Config prin STRIPE_SECRET_KEY (vezi .env.example). Dacă nu e setată, plățile
// reale sunt dezactivate — rutele care depind de Stripe răspund explicit că
// plata cu cardul nu e configurată încă, în loc să eșueze obscur.

let stripe = null;

function getStripe() {
  if (stripe) return stripe;
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

module.exports = { getStripe };
