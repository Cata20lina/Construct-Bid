const rateLimit = require('express-rate-limit');

// ─── Limitatoare de rată — protecție de bază împotriva brute-force și abuzului ──
// Fiecare limitator e pe IP. Răspunsul e uniform (mesaj în română, format
// consecvent cu restul API-ului) ca frontend-ul să-l poată afișa direct.
const raspunsLimitare = (mesaj) => (req, res) => {
  res.status(429).json({ mesaj });
};

// Login/înregistrare: încercări limitate, ca să descurajăm ghicitul parolelor
// sau crearea în masă de conturi.
const limiteazaAutentificare = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: raspunsLimitare('Prea multe încercări. Te rugăm să aștepți câteva minute înainte să încerci din nou.'),
});

// Resetare parolă / retrimitere cod: mai strict, ca să nu poată fi folosit
// pentru a bombarda pe cineva cu emailuri.
const limiteazaCoduriEmail = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: raspunsLimitare('Ai cerut prea multe coduri recent. Te rugăm să aștepți câteva minute.'),
});

// Verificare CUI la ANAF: serviciul extern nu are nevoie să fie bombardat,
// iar fiecare apel e un request extern real.
const limiteazaCui = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: raspunsLimitare('Prea multe verificări CUI recente. Te rugăm să aștepți câteva minute.'),
});

// Mesaje pe chat-ul de suport: suficient pentru o conversație normală,
// dar nu pentru spam automat.
const limiteazaMesajeSuport = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: raspunsLimitare('Trimiți mesaje prea repede. Te rugăm să aștepți un minut.'),
});

module.exports = { limiteazaAutentificare, limiteazaCoduriEmail, limiteazaCui, limiteazaMesajeSuport };
