const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const { protejat } = require('../middleware/auth');
const { serializeUserFull } = require('../lib/serialize');
const { limiteazaCui } = require('../middleware/rateLimit');

// ─── Validare locală a CUI-ului (cifra de control) ─────────────────────────
// Algoritmul oficial: cheia 753217532 se aplică cifrelor fără ultima
// (aliniate la dreapta), suma × 10 mod 11 (10 → 0) trebuie să fie ultima cifră.
// Respinge pe loc CUI-urile tastate greșit, fără un drum până la ANAF.
function cuiValid(cuiCurat) {
  if (!/^[0-9]{2,10}$/.test(cuiCurat)) return false;
  const cheie = '753217532';
  const corp = cuiCurat.slice(0, -1).padStart(9, '0');
  let suma = 0;
  for (let i = 0; i < 9; i++) suma += Number(corp[i]) * Number(cheie[i]);
  const control = (suma * 10) % 11 % 10;
  return control === Number(cuiCurat.slice(-1));
}

// ─── Interogare ANAF (extrasă ca funcție, folosită de ambele rute de mai jos) ──
// Documentație: https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt
// (ANAF a mutat serviciul de pe /PlatitorTvaRest/api/v9/ws/tva, care dă acum 404.)
async function verificaCuiLaAnaf(cuiCurat) {
  const astazi = new Date().toISOString().slice(0, 10);

  let raspunsAnaf;
  try {
    raspunsAnaf = await fetch('https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ cui: Number(cuiCurat), data: astazi }]),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    const eroare = new Error('ANAF_INDISPONIBIL');
    eroare.status = 502;
    throw eroare;
  }

  if (!raspunsAnaf.ok) {
    const eroare = new Error('ANAF_INDISPONIBIL');
    eroare.status = 502;
    throw eroare;
  }

  const data = await raspunsAnaf.json();
  const rezultat = data?.found?.[0];
  if (!rezultat) return { gasit: false };

  const dateGenerale = rezultat.date_generale || {};
  const dateTva = rezultat.inregistrare_scop_Tva || {};
  const stareInactiv = rezultat.stare_inactiv || {};
  const sediu = rezultat.adresa_sediu_social || {};

  return {
    gasit: true,
    cui: dateGenerale.cui,
    denumire: dateGenerale.denumire || '',
    adresa: dateGenerale.adresa || '',
    judet: sediu.sdenumire_Judet || '',
    nrRegCom: dateGenerale.nrRegCom || '',
    stareInregistrare: dateGenerale.stare_inregistrare || '',
    // Firmă declarată inactivă fiscal sau radiată → nu o considerăm verificată
    stareInactiv: !!stareInactiv.statusInactivi || !!stareInactiv.dataRadiere,
    radiata: !!stareInactiv.dataRadiere,
    platitorTva: !!dateTva.scpTVA,
    telefon: dateGenerale.telefon || '',
  };
}

// ─── Interogare ANAF — bilanț anual (situație financiară) ──────────────────
// Documentație: https://webservicesp.anaf.ro/bilant?an=AAAA&cui=XXXXXXXX
// API public, gratuit, fără autentificare. Firmele depun bilanțul anual cu
// întârziere (de obicei pe la mijlocul anului următor), deci încercăm cel
// mai recent an plauzibil și coborâm câte un an dacă nu găsim date, până la
// `anMinim` ani în urmă.
async function verificaBilantLaAnaf(cuiCurat) {
  const anCurent = new Date().getFullYear();
  const anMinim = anCurent - 4;

  for (let an = anCurent - 1; an >= anMinim; an--) {
    let raspuns;
    try {
      raspuns = await fetch(`https://webservicesp.anaf.ro/bilant?an=${an}&cui=${cuiCurat}`);
    } catch (e) {
      continue; // problemă de rețea pentru acest an — încercăm anul anterior
    }
    if (!raspuns.ok) continue;

    let data;
    try {
      data = await raspuns.json();
    } catch (e) {
      continue;
    }

    const indicatori = Array.isArray(data?.i) ? data.i : [];
    if (indicatori.length === 0) continue; // niciun bilanț depus pentru acest an

    const gasesteIndicator = (denumire) =>
      indicatori.find((x) => x.val_den_indicator?.trim().toLowerCase() === denumire.toLowerCase())?.val_indicator;

    return {
      gasit: true,
      an,
      cifraAfaceri: gasesteIndicator('Cifra de afaceri neta') ?? null,
      profitNet: gasesteIndicator('Profit net') ?? null,
      pierdereNeta: gasesteIndicator('Pierdere neta') ?? null,
      numarAngajati: gasesteIndicator('Numar mediu de salariati') ?? null,
    };
  }

  return { gasit: false };
}

// ─── GET /api/cui/:cui ──────────────────────────────────────────────────────
// Verificare publică, fără persistare — folosită la înregistrare (Auth.jsx)
// pentru a confirma că firma există în registrul fiscal și a auto-completa
// denumirea oficială, înainte să existe vreun cont creat.
router.get('/:cui', limiteazaCui, async (req, res) => {
  try {
    const cuiCurat = String(req.params.cui).replace(/[^0-9]/g, '');
    if (!cuiCurat) {
      return res.status(400).json({ mesaj: 'CUI invalid. Introdu doar cifrele codului fiscal.' });
    }
    if (!cuiValid(cuiCurat)) {
      return res.status(400).json({ mesaj: `CUI ${cuiCurat} nu este valid (cifra de control nu se potrivește). Verifică dacă l-ai scris corect.`, gasit: false });
    }

    const rezultat = await verificaCuiLaAnaf(cuiCurat);
    if (!rezultat.gasit) {
      return res.status(404).json({ mesaj: `Nu am găsit nicio firmă înregistrată cu CUI ${cuiCurat}.`, gasit: false });
    }
    res.json(rezultat);
  } catch (err) {
    if (err.message === 'ANAF_INDISPONIBIL') {
      return res.status(502).json({ mesaj: 'Serviciul ANAF nu a răspuns. Încearcă din nou mai târziu.' });
    }
    console.error('[cui GET /:cui]', err);
    res.status(500).json({ mesaj: 'Eroare la verificarea CUI-ului. Serviciul ANAF poate fi indisponibil momentan.' });
  }
});

// ─── POST /api/cui/verifica ──────────────────────────────────────────────────
// Verificare pentru un cont deja existent (folosită din pagina de Profil):
// interoghează ANAF pentru CUI-ul din profilul utilizatorului autentificat și,
// dacă firma e găsită (și activă fiscal), salvează rezultatul pe profil —
// setează `cuiVerificat`, `cuiDenumireOficiala` și `cuiVerificatLa`.
// Verifică CUI-ul unui cont la ANAF și salvează rezultatul (+ bilanțul) pe
// profil. Folosită de utilizator (din Profil) și de admin (pentru orice cont).
// Întoarce { status, corp } gata de trimis ca răspuns HTTP.
async function verificaSiSalveaza(utilizator) {
  const cuiCurat = String(utilizator.cui || '').replace(/[^0-9]/g, '');
  if (!cuiCurat) {
    return { status: 400, corp: { mesaj: 'Contul nu are un CUI setat pe profil.' } };
  }
  if (!cuiValid(cuiCurat)) {
    return { status: 400, corp: { mesaj: `CUI ${cuiCurat} nu este valid (cifra de control nu se potrivește).`, gasit: false } };
  }

  const rezultat = await verificaCuiLaAnaf(cuiCurat);
  if (!rezultat.gasit) {
    return { status: 404, corp: { mesaj: `Nu am găsit nicio firmă înregistrată cu CUI ${cuiCurat} la ANAF.`, gasit: false } };
  }

  // Situația financiară e un „bonus" — dacă interogarea de bilanț eșuează
  // sau nu găsește niciun bilanț depus, nu blocăm verificarea CUI-ului
  // (care rămâne valabilă și utilă de una singură).
  let bilant = { gasit: false };
  try {
    bilant = await verificaBilantLaAnaf(cuiCurat);
  } catch (e) {
    console.error('[cui] eroare la interogarea bilanțului ANAF:', e.message);
  }

  const u = await prisma.user.update({
    where: { id: utilizator.id },
    data: {
      cuiVerificat: !rezultat.stareInactiv,
      cuiDenumireOficiala: rezultat.denumire,
      cuiVerificatLa: new Date(),
      ...(bilant.gasit ? {
        bilantAn: bilant.an,
        bilantCifraAfaceri: bilant.cifraAfaceri,
        bilantProfitNet: bilant.profitNet,
        bilantPierdereNeta: bilant.pierdereNeta,
        bilantNumarAngajati: bilant.numarAngajati,
        bilantVerificatLa: new Date(),
      } : {}),
    },
    include: { lucrari: true, disponibilitati: true },
  });

  return { status: 200, corp: { ...rezultat, bilant }, utilizator: u };
}

router.post('/verifica', protejat, limiteazaCui, async (req, res) => {
  try {
    const r = await verificaSiSalveaza(req.utilizator);
    if (r.status !== 200) return res.status(r.status).json(r.corp);
    res.json({ ...r.corp, utilizator: serializeUserFull(r.utilizator) });
  } catch (err) {
    if (err.message === 'ANAF_INDISPONIBIL') {
      return res.status(502).json({ mesaj: 'Serviciul ANAF nu a răspuns. Încearcă din nou mai târziu.' });
    }
    console.error('[cui POST /verifica]', err);
    res.status(500).json({ mesaj: 'Eroare la verificarea CUI-ului.' });
  }
});

module.exports = router;
module.exports.verificaSiSalveaza = verificaSiSalveaza;
module.exports.verificaCuiLaAnaf = verificaCuiLaAnaf;
module.exports.verificaBilantLaAnaf = verificaBilantLaAnaf;
module.exports.cuiValid = cuiValid;
