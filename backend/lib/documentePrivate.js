const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('./prisma');

// Documentele de identitate stau într-un folder care NU e servit static
// (spre deosebire de /uploads). Se citesc doar prin rutele autentificate din
// routes/identitate.js și se șterg după decizia adminului.
const DIR_IDENTITATE = path.join(__dirname, '..', 'private', 'identitate');
fs.mkdirSync(DIR_IDENTITATE, { recursive: true });

// Tipul real se stabilește după primii octeți ai fișierului, nu după
// extensie sau după ce declară browserul — un .html redenumit în .pdf e respins.
const SEMNATURI = [
  { mime: 'application/pdf', ext: '.pdf', octeti: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'image/jpeg', ext: '.jpg', octeti: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', ext: '.png', octeti: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

function detecteazaTip(buffer) {
  return SEMNATURI.find(s => s.octeti.every((b, i) => buffer[i] === b)) || null;
}

// Salvează un fișier (din multer, în memorie) sub un nume aleatoriu criptografic.
function salveazaDocument(fisier) {
  const tip = detecteazaTip(fisier.buffer);
  if (!tip) {
    const eroare = new Error(`„${fisier.originalname}” nu e PDF, JPG sau PNG.`);
    eroare.status = 400;
    throw eroare;
  }
  const numeFisier = `${crypto.randomUUID()}${tip.ext}`;
  fs.writeFileSync(path.join(DIR_IDENTITATE, numeFisier), fisier.buffer, { mode: 0o600 });
  return { numeFisier, mime: tip.mime, marime: fisier.size };
}

function caleDocument(numeFisier) {
  // numeFisier vine din baza de date (UUID generat de noi); basename e doar o plasă de siguranță
  return path.join(DIR_IDENTITATE, path.basename(numeFisier));
}

function jurnalizeaza({ documentId, proprietarId, actiune, deCatre }) {
  return prisma.jurnalAccesDocument.create({
    data: { documentId, proprietarId, actiune, deCatreId: deCatre.id, deCatreNume: deCatre.nume },
  }).catch(err => console.error('[documentePrivate] jurnal:', err.message));
}

// Șterge de pe disc și din baza de date toate documentele unui cont.
async function stergeDocumenteleContului(userId, deCatre) {
  const documente = await prisma.documentIdentitate.findMany({ where: { userId } });
  for (const d of documente) {
    try { fs.unlinkSync(caleDocument(d.numeFisier)); } catch (e) { /* deja șters */ }
    if (deCatre) await jurnalizeaza({ documentId: d.id, proprietarId: userId, actiune: 'sters', deCatre });
  }
  await prisma.documentIdentitate.deleteMany({ where: { userId } });
  return documente.length;
}

module.exports = { salveazaDocument, caleDocument, jurnalizeaza, stergeDocumenteleContului };
