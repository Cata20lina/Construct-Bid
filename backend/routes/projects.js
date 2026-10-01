const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');
const { protejat, doarRol } = require('../middleware/auth');
const { notificaAdmini } = require('../lib/moderare');
const { programeazaFinalizare } = require('../services/licitatie');
const { serializeProject } = require('../lib/serialize');
const { geocodeazaAdresa } = require('../lib/geocode');

const MINI_SELECT = { id: true, nume: true, judet: true, cui: true };

const COST_ANUNT_NORMAL = 5;
const COST_ANUNT_PROSPECTARE = 3;

// Lista de proiecte e publică, dar dezvoltatorul trebuie să-și vadă și
// anunțurile suspendate — așa că citim token-ul dacă există, fără să-l cerem.
function idUtilizatorOptional(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id;
  } catch {
    return null;
  }
}

// ─── GET /api/projects ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { categorie, urgent, judet, tipOfertare, prospectare } = req.query;
    const where = {};
    if (categorie) where.categorie = categorie;
    if (urgent) where.urgent = urgent === 'true';
    if (judet) where.judet = judet;
    if (tipOfertare) where.tipOfertare = tipOfertare;
    if (req.query.activ !== 'false') where.activ = true;

    const idUtilizator = idUtilizatorOptional(req);
    where.AND = [{ OR: idUtilizator ? [{ suspendat: false }, { dezvoltatorId: idUtilizator }] : [{ suspendat: false }] }];
    // Anunțurile unui cont suspendat nu mai apar nimănui
    where.dezvoltator = { suspendat: false };

    // Anunțurile de "prospectare piață" apar DOAR când sunt cerute explicit
    // (pagina Prospectare Piață) — lista normală de șantiere le exclude implicit.
    if (prospectare === 'true') where.esteProspectare = true;
    else if (prospectare !== 'all') where.esteProspectare = false;

    const proiecte = await prisma.project.findMany({
      where,
      include: {
        dezvoltator: { select: MINI_SELECT },
        castigator: { select: MINI_SELECT },
        _count: { select: { oferte: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(proiecte.map(serializeProject));
  } catch (err) {
    console.error('[projects GET /]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea proiectelor.' });
  }
});

// ─── GET /api/projects/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const proiect = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        dezvoltator: { select: MINI_SELECT },
        castigator: { select: MINI_SELECT },
        ofertaCastigatoare: { include: { subcontractor: true } },
        _count: { select: { oferte: true } },
      },
    });

    if (!proiect) return res.status(404).json({ mesaj: 'Proiectul nu există.' });
    res.json(serializeProject(proiect));
  } catch (err) {
    console.error('[projects GET /:id]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea proiectului.' });
  }
});

// ─── POST /api/projects ───────────────────────────────────────────────────────
router.post('/', protejat, doarRol('DEZVOLTATOR'), async (req, res) => {
  try {
    const {
      titlu, descriere, locatie, judet, oras, buget, bugetValoare,
      urgent, zile, deadline, categorie,
      tipOfertare, licitatieStart, licitatieEnd,
      esteProspectare,
      termenLimitaOferta, avansProcent, garantii, experientaMinima,
    } = req.body;

    if (!titlu || !descriere || !locatie || !buget || !zile) {
      return res.status(400).json({ mesaj: 'Câmpurile titlu, descriere, locatie, buget și zile sunt obligatorii.' });
    }

    // ── Condiții de participare (opționale) ──
    let termenLimitaOfertaData = null;
    if (termenLimitaOferta) {
      termenLimitaOfertaData = new Date(termenLimitaOferta);
      if (Number.isNaN(termenLimitaOfertaData.getTime())) {
        return res.status(400).json({ mesaj: 'Termenul limită de depunere a ofertei este invalid.' });
      }
    }
    let avansProcentData = null;
    if (avansProcent !== undefined && avansProcent !== null && avansProcent !== '') {
      avansProcentData = Math.max(0, Math.min(100, Number(avansProcent) || 0));
    }

    const prospectareFlag = !!esteProspectare;
    const costTokenuri = prospectareFlag ? COST_ANUNT_PROSPECTARE : COST_ANUNT_NORMAL;

    if ((req.utilizator.tokenuri ?? 0) < costTokenuri) {
      return res.status(402).json({
        mesaj: `Nu ai suficiente token-uri pentru a publica acest anunț. Necesare: ${costTokenuri}, disponibile: ${req.utilizator.tokenuri ?? 0}.`,
      });
    }

    const tip = tipOfertare === 'dinamica' ? 'dinamica' : 'statica';

    let startDate = null;
    let endDate = null;

    if (tip === 'dinamica') {
      if (!licitatieEnd) {
        return res.status(400).json({ mesaj: 'Pentru ofertare dinamica trebuie specificat momentul de final al licitatiei (licitatieEnd).' });
      }
      startDate = licitatieStart ? new Date(licitatieStart) : new Date();
      endDate = new Date(licitatieEnd);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ mesaj: 'Datele licitatiei sunt invalide.' });
      }
      if (endDate.getTime() <= startDate.getTime()) {
        return res.status(400).json({ mesaj: 'Data de final a licitatiei trebuie sa fie dupa data de start.' });
      }
    }

    const coordonate = await geocodeazaAdresa(`${locatie}${judet ? ', ' + judet : ''}, România`);

    // Scădem token-urile și creăm anunțul atomic — dacă unul eșuează, nu se
    // consumă token-uri fără să existe anunțul, și invers.
    const [utilizatorActualizat, proiect] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.utilizator.id },
        data: { tokenuri: { decrement: costTokenuri } },
      }),
      prisma.project.create({
        data: {
          titlu, descriere, locatie, judet, oras, buget,
          bugetValoare: bugetValoare !== undefined && bugetValoare !== null && bugetValoare !== '' ? Number(bugetValoare) : null,
          latitudine: coordonate?.latitudine ?? null,
          longitudine: coordonate?.longitudine ?? null,
          urgent: !!urgent,
          zile: Number(zile),
          deadline: deadline ? new Date(deadline) : null,
          categorie: categorie || 'rezidential',
          esteProspectare: prospectareFlag,
          dezvoltatorId: req.utilizator.id,
          tipOfertare: tip,
          licitatieStart: startDate,
          licitatieEnd: endDate,
          termenLimitaOferta: termenLimitaOfertaData,
          avansProcent: avansProcentData,
          garantii: garantii ? String(garantii).slice(0, 500) : '',
          experientaMinima: experientaMinima ? String(experientaMinima).slice(0, 300) : '',
        },
        include: { dezvoltator: { select: MINI_SELECT } },
      }),
    ]);

    if (tip === 'dinamica') {
      programeazaFinalizare(proiect);
    }

    res.status(201).json({
      ...serializeProject(proiect),
      tokenuriRamase: utilizatorActualizat.tokenuri,
    });
  } catch (err) {
    console.error('[projects POST /]', err);
    res.status(500).json({ mesaj: 'Eroare la crearea proiectului.' });
  }
});

// ─── PUT /api/projects/:id ────────────────────────────────────────────────────
router.put('/:id', protejat, doarRol('DEZVOLTATOR'), async (req, res) => {
  try {
    const existent = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existent) return res.status(404).json({ mesaj: 'Proiectul nu există.' });

    if (existent.dezvoltatorId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea să editezi acest proiect.' });
    }

    const data = {};
    const campuriPermise = [
      'titlu', 'descriere', 'locatie', 'judet', 'oras', 'buget', 'bugetValoare', 'urgent', 'zile', 'deadline', 'categorie', 'activ',
      'termenLimitaOferta', 'avansProcent', 'garantii', 'experientaMinima',
    ];
    campuriPermise.forEach(camp => {
      // Un anunț suspendat de admin se reactivează doar prin aprobarea adminului.
      if (camp === 'activ' && existent.suspendat) return;
      if (req.body[camp] !== undefined) {
        if (camp === 'deadline' || camp === 'termenLimitaOferta') {
          data[camp] = req.body[camp] ? new Date(req.body[camp]) : null;
        } else if (camp === 'bugetValoare') data.bugetValoare = req.body.bugetValoare === '' ? null : Number(req.body.bugetValoare);
        else if (camp === 'zile') data.zile = Number(req.body.zile);
        else if (camp === 'avansProcent') {
          data.avansProcent = req.body.avansProcent === '' || req.body.avansProcent === null
            ? null
            : Math.max(0, Math.min(100, Number(req.body.avansProcent) || 0));
        }
        else data[camp] = req.body[camp];
      }
    });

    if (existent.tipOfertare === 'dinamica' && !existent.licitatieFinalizata) {
      if (req.body.licitatieEnd !== undefined) data.licitatieEnd = new Date(req.body.licitatieEnd);
      if (req.body.licitatieStart !== undefined) data.licitatieStart = new Date(req.body.licitatieStart);
    }

    if (data.locatie !== undefined || data.judet !== undefined) {
      const locatieNoua = data.locatie ?? existent.locatie;
      const judetNou = data.judet ?? existent.judet;
      const coordonate = await geocodeazaAdresa(`${locatieNoua}${judetNou ? ', ' + judetNou : ''}, România`);
      data.latitudine = coordonate?.latitudine ?? null;
      data.longitudine = coordonate?.longitudine ?? null;
    }

    const proiect = await prisma.project.update({
      where: { id: req.params.id },
      data,
      include: { dezvoltator: { select: MINI_SELECT }, castigator: { select: MINI_SELECT }, _count: { select: { oferte: true } } },
    });

    if (proiect.tipOfertare === 'dinamica') {
      programeazaFinalizare(proiect);
    }

    res.json(serializeProject(proiect));
  } catch (err) {
    console.error('[projects PUT /:id]', err);
    res.status(500).json({ mesaj: 'Eroare la actualizarea proiectului.' });
  }
});

// ─── POST /api/projects/:id/trimite-modificari ───────────────────────────────
// Dezvoltatorul anunță că a corectat un anunț suspendat; adminul îl verifică
// și îl reactivează (sau îl lasă suspendat cu un mesaj nou).
router.post('/:id/trimite-modificari', protejat, doarRol('DEZVOLTATOR'), async (req, res) => {
  try {
    const existent = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existent) return res.status(404).json({ mesaj: 'Proiectul nu există.' });
    if (existent.dezvoltatorId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea să modifici acest proiect.' });
    }
    if (!existent.suspendat) return res.status(400).json({ mesaj: 'Proiectul nu este suspendat.' });

    const proiect = await prisma.project.update({
      where: { id: existent.id },
      data: { modificariTrimiseLa: new Date() },
      include: { dezvoltator: { select: MINI_SELECT }, castigator: { select: MINI_SELECT }, _count: { select: { oferte: true } } },
    });
    notificaAdmini({
      titlu: 'Modificări trimise spre verificare',
      mesaj: `${req.utilizator.nume} a modificat proiectul „${proiect.titlu}”.`,
      proiectId: proiect.id,
    });
    res.json(serializeProject(proiect));
  } catch (err) {
    console.error('[projects POST /:id/trimite-modificari]', err);
    res.status(500).json({ mesaj: 'Eroare la trimiterea modificărilor.' });
  }
});

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────
router.delete('/:id', protejat, doarRol('DEZVOLTATOR'), async (req, res) => {
  try {
    const proiect = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!proiect) return res.status(404).json({ mesaj: 'Proiectul nu există.' });

    if (proiect.dezvoltatorId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea să ștergi acest proiect.' });
    }

    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ mesaj: 'Proiect șters cu succes.' });
  } catch (err) {
    console.error('[projects DELETE /:id]', err);
    res.status(500).json({ mesaj: 'Eroare la ștergerea proiectului.' });
  }
});

module.exports = router;
