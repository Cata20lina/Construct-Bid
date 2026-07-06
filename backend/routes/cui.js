const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const { protejat } = require('../middleware/auth');
const { serializeUserFull } = require('../lib/serialize');

// ─── Interogare ANAF (extrasă ca funcție, folosită de ambele rute de mai jos) ──
// Documentație: https://webservicesp.anaf.ro/PlatitorTvaRest/api/v9/ws/tva
async function verificaCuiLaAnaf(cuiCurat) {
  const astazi = new Date().toISOString().slice(0, 10);

  const raspunsAnaf = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v9/ws/tva', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ cui: Number(cuiCurat), data: astazi }]),
  });

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

  return {
    gasit: true,
    cui: dateGenerale.cui,
    denumire: dateGenerale.denumire || '',
    adresa: dateGenerale.adresa || '',
    nrRegCom: dateGenerale.nrRegCom || '',
    stareInactiv: !!dateGenerale.statusInactivi,
    platitorTva: !!dateTva.scpTVA,
    telefon: dateGenerale.telefon || '',
  };
}

// ─── GET /api/cui/:cui ──────────────────────────────────────────────────────
// Verificare publică, fără persistare — folosită la înregistrare (Auth.jsx)
// pentru a confirma că firma există în registrul fiscal și a auto-completa
// denumirea oficială, înainte să existe vreun cont creat.
router.get('/:cui', async (req, res) => {
  try {
    const cuiCurat = String(req.params.cui).replace(/[^0-9]/g, '');
    if (!cuiCurat) {
      return res.status(400).json({ mesaj: 'CUI invalid. Introdu doar cifrele codului fiscal.' });
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
router.post('/verifica', protejat, async (req, res) => {
  try {
    const cuiCurat = String(req.utilizator.cui || '').replace(/[^0-9]/g, '');
    if (!cuiCurat) {
      return res.status(400).json({ mesaj: 'Nu ai un CUI valid setat pe profil.' });
    }

    const rezultat = await verificaCuiLaAnaf(cuiCurat);
    if (!rezultat.gasit) {
      return res.status(404).json({ mesaj: `Nu am găsit nicio firmă înregistrată cu CUI ${cuiCurat} la ANAF.`, gasit: false });
    }

    const u = await prisma.user.update({
      where: { id: req.utilizator.id },
      data: {
        cuiVerificat: !rezultat.stareInactiv,
        cuiDenumireOficiala: rezultat.denumire,
        cuiVerificatLa: new Date(),
      },
      include: { lucrari: true, disponibilitati: true },
    });

    res.json({ ...rezultat, utilizator: serializeUserFull(u) });
  } catch (err) {
    if (err.message === 'ANAF_INDISPONIBIL') {
      return res.status(502).json({ mesaj: 'Serviciul ANAF nu a răspuns. Încearcă din nou mai târziu.' });
    }
    console.error('[cui POST /verifica]', err);
    res.status(500).json({ mesaj: 'Eroare la verificarea CUI-ului.' });
  }
});

module.exports = router;
