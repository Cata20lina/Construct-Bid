const express = require('express');
const router  = express.Router();

// ─── Cache simplu în memorie (evită să lovim API-urile externe la fiecare request) ──
let cacheCurs = { data: null, expira: 0 };
const cacheVreme = new Map(); // cheie: "judet|oras" -> { data, expira }

// ─── GET /api/utile/curs-valutar ────────────────────────────────────────────
// Cursul zilnic RON ↔ EUR/USD publicat de Banca Națională a României (BNR),
// serviciu public, gratuit, fără cheie de acces. Util pentru proiecte/oferte
// exprimate în valută sau pentru compararea bugetelor.
router.get('/curs-valutar', async (req, res) => {
  try {
    if (cacheCurs.data && Date.now() < cacheCurs.expira) {
      return res.json(cacheCurs.data);
    }

    const raspuns = await fetch('https://www.bnr.ro/nbrfxrates.xml');
    if (!raspuns.ok) {
      return res.status(502).json({ mesaj: 'Serviciul BNR nu a răspuns.' });
    }
    const xml = await raspuns.text();

    const dataMatch = xml.match(/<Cube date="([\d-]+)"/);
    const extrage = (moneda) => {
      const m = xml.match(new RegExp(`<Rate currency="${moneda}"[^>]*>([\\d.]+)</Rate>`));
      return m ? Number(m[1]) : null;
    };

    const rezultat = {
      data: dataMatch ? dataMatch[1] : astaziISO(),
      EUR: extrage('EUR'),
      USD: extrage('USD'),
      sursa: 'Banca Națională a României (BNR)',
    };

    cacheCurs = { data: rezultat, expira: Date.now() + 60 * 60 * 1000 }; // 1h
    res.json(rezultat);
  } catch (err) {
    console.error('[utile GET /curs-valutar]', err);
    res.status(500).json({ mesaj: 'Eroare la preluarea cursului valutar.' });
  }
});

// ─── GET /api/utile/vreme?oras=&judet= ──────────────────────────────────────
// Prognoză meteo pe 5 zile pentru localitatea unui șantier, via Open-Meteo
// (gratuit, fără cheie). Ajută la planificarea lucrărilor și a intervalelor
// de disponibilitate declarate de subcontractori.
router.get('/vreme', async (req, res) => {
  try {
    const oras = (req.query.oras || '').trim();
    const judet = (req.query.judet || '').trim();
    if (!oras && !judet) {
      return res.status(400).json({ mesaj: 'Specifică cel puțin orașul sau județul.' });
    }

    const cheie = `${judet}|${oras}`.toLowerCase();
    const cached = cacheVreme.get(cheie);
    if (cached && Date.now() < cached.expira) {
      return res.json(cached.data);
    }

    const numeCautare = oras || judet;
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(numeCautare)}&count=1&language=ro&country=RO`);
    const geoData = await geo.json();
    const loc = geoData?.results?.[0];
    if (!loc) {
      return res.status(404).json({ mesaj: `Nu am putut localiza "${numeCautare}" pentru prognoză meteo.` });
    }

    const prognoza = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=Europe%2FBucharest&forecast_days=5`);
    const prognozaData = await prognoza.json();

    const rezultat = {
      localitate: loc.name,
      judet: loc.admin2 || loc.admin1 || judet,
      zile: (prognozaData?.daily?.time || []).map((data, i) => ({
        data,
        maxC: prognozaData.daily.temperature_2m_max[i],
        minC: prognozaData.daily.temperature_2m_min[i],
        sansaPloaie: prognozaData.daily.precipitation_probability_max[i],
        cod: prognozaData.daily.weathercode[i],
      })),
      sursa: 'Open-Meteo',
    };

    cacheVreme.set(cheie, { data: rezultat, expira: Date.now() + 30 * 60 * 1000 }); // 30 min
    res.json(rezultat);
  } catch (err) {
    console.error('[utile GET /vreme]', err);
    res.status(500).json({ mesaj: 'Eroare la preluarea prognozei meteo.' });
  }
});

function astaziISO() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = router;
