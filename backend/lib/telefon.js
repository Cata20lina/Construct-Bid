const prisma = require('./prisma');

// Un număr de telefon poate fi scris în multe feluri („0721 000 000”,
// „+40721000000”, „0040-721-000-000”). Îl aducem la forma națională, doar
// cifre: 0721000000, ca să-l putem compara și să permitem un singur cont per număr.
function normalizeazaTelefon(telefon) {
  let cifre = String(telefon || '').replace(/\D/g, '');
  if (cifre.startsWith('0040')) cifre = '0' + cifre.slice(4);
  else if (cifre.startsWith('40') && cifre.length === 11) cifre = '0' + cifre.slice(2);
  return cifre;
}

// Număr românesc: 10 cifre, mobil (07…) sau fix (02…/03…)
function telefonValid(normalizat) {
  return /^0[237]\d{8}$/.test(normalizat);
}

// Caută alt cont cu același număr, indiferent de cum a fost salvat (conturile
// mai vechi pot avea spații sau prefixul +40).
async function telefonFolosit(normalizat, exceptUserId = null) {
  const fara0 = normalizat.slice(1);
  const rezultat = await prisma.$queryRaw`
    SELECT id FROM users
    WHERE regexp_replace(telefon, '[^0-9]', '', 'g') IN (${normalizat}, ${'40' + fara0}, ${'0040' + fara0})
      AND (${exceptUserId}::text IS NULL OR id <> ${exceptUserId})
    LIMIT 1`;
  return rezultat.length > 0;
}

// Validează + verifică unicitatea. Întoarce { telefon } normalizat sau { eroare, status }.
async function verificaTelefon(telefon, exceptUserId = null) {
  const normalizat = normalizeazaTelefon(telefon);
  if (!telefonValid(normalizat)) {
    return { eroare: 'Număr de telefon invalid. Folosește un număr românesc de 10 cifre (ex: 0721 000 000).', status: 400 };
  }
  if (await telefonFolosit(normalizat, exceptUserId)) {
    return { eroare: 'Există deja un cont cu acest număr de telefon. Fiecare număr poate fi folosit la un singur cont.', status: 409 };
  }
  return { telefon: normalizat };
}

module.exports = { normalizeazaTelefon, telefonValid, verificaTelefon };
