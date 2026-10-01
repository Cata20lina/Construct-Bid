const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat, doarRol } = require('../middleware/auth');
const { serializeCatalogItem, serializeComandaCatalog, serializeUserContact } = require('../lib/serialize');
const { creeazaNotificare } = require('../lib/notificari');

const COMANDA_INCLUDE = {
  cumparator: { select: { id: true, nume: true, judet: true, cui: true } },
  furnizor: { select: { id: true, nume: true, judet: true, cui: true } },
};

// ─── GET /api/catalog ────────────────────────────────────────────────────
// Catalog public de produse/materiale — reutilizează Lucrare (rândurile cu
// pret != null, care aparțin unui utilizator FURNIZOR). Nu e legat de nicio
// cerere anume — e locul unde oricine poate răsfoi ce oferă furnizorii
// înscriși, ca inspirație înainte de a crea o cerere de materiale.
router.get('/', protejat, async (req, res) => {
  try {
    const { categorie, judet, cauta } = req.query;

    const where = {
      pret: { not: null },
      user: { rol: 'FURNIZOR' },
    };
    if (categorie) where.categorie = categorie;
    if (judet) {
      where.user = { ...where.user, OR: [{ judet }, { judeteServicii: { has: judet } }] };
    }
    if (cauta) {
      where.OR = [
        { titlu: { contains: cauta, mode: 'insensitive' } },
        { descriere: { contains: cauta, mode: 'insensitive' } },
      ];
    }

    const produse = await prisma.lucrare.findMany({
      where,
      include: {
        user: {
          select: {
            id: true, nume: true, judet: true, judeteServicii: true,
            ratingMediu: true, ratingNumarEvaluari: true, cuiVerificat: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(produse.map(serializeCatalogItem));
  } catch (err) {
    console.error('[catalog GET /]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea catalogului.' });
  }
});

// ─── POST /api/catalog/:produsId/comanda ────────────────────────────────
// Comandă directă la furnizorul care a listat produsul — nu e o licitație,
// se trimite direct și furnizorul confirmă sau refuză. Prețul/denumirea se
// salvează ca "instantaneu" la momentul comenzii.
router.post('/:produsId/comanda', protejat, doarRol('DEZVOLTATOR', 'SUBCONTRACTOR'), async (req, res) => {
  try {
    const { cantitate, mesaj } = req.body;
    const cantitateNum = Number(cantitate);
    if (Number.isNaN(cantitateNum) || cantitateNum <= 0) {
      return res.status(400).json({ mesaj: 'Cantitatea trebuie să fie un număr pozitiv.' });
    }

    const produs = await prisma.lucrare.findUnique({
      where: { id: req.params.produsId },
      include: { user: { select: { id: true, rol: true, nume: true } } },
    });
    if (!produs || produs.pret == null || produs.user?.rol !== 'FURNIZOR') {
      return res.status(404).json({ mesaj: 'Produsul nu există în catalog.' });
    }

    const comanda = await prisma.comandaCatalog.create({
      data: {
        denumireProdus: produs.titlu,
        pretUnitar: produs.pret,
        unitateMasura: produs.unitateMasura || 'buc',
        cantitate: cantitateNum,
        mesaj: (mesaj || '').trim(),
        produsId: produs.id,
        cumparatorId: req.utilizator.id,
        furnizorId: produs.user.id,
      },
      include: COMANDA_INCLUDE,
    });

    creeazaNotificare({
      userId: produs.user.id,
      tip: 'oferta',
      titlu: `Ai primit o comandă pentru "${produs.titlu}"`,
      mesaj: `${cantitateNum} ${comanda.unitateMasura} — de la ${req.utilizator.nume}`,
    });

    res.status(201).json(serializeComandaCatalog(comanda));
  } catch (err) {
    console.error('[catalog POST /:produsId/comanda]', err);
    res.status(500).json({ mesaj: 'Eroare la trimiterea comenzii.' });
  }
});

// ─── GET /api/catalog/comenzile-mele ─────────────────────────────────────
// Comenzile trimise de utilizatorul curent (cumpărător).
router.get('/comenzile-mele', protejat, doarRol('DEZVOLTATOR', 'SUBCONTRACTOR'), async (req, res) => {
  try {
    const comenzi = await prisma.comandaCatalog.findMany({
      where: { cumparatorId: req.utilizator.id },
      include: COMANDA_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(comenzi.map(serializeComandaCatalog));
  } catch (err) {
    console.error('[catalog GET /comenzile-mele]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea comenzilor tale.' });
  }
});

// ─── GET /api/catalog/comenzi-primite ────────────────────────────────────
// Comenzile primite de furnizorul curent.
router.get('/comenzi-primite', protejat, doarRol('FURNIZOR'), async (req, res) => {
  try {
    const comenzi = await prisma.comandaCatalog.findMany({
      where: { furnizorId: req.utilizator.id },
      include: COMANDA_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(comenzi.map(serializeComandaCatalog));
  } catch (err) {
    console.error('[catalog GET /comenzi-primite]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea comenzilor primite.' });
  }
});

// ─── PUT /api/catalog/comenzi/:id/confirma ───────────────────────────────
router.put('/comenzi/:id/confirma', protejat, doarRol('FURNIZOR'), async (req, res) => {
  try {
    const comanda = await prisma.comandaCatalog.findUnique({ where: { id: req.params.id } });
    if (!comanda) return res.status(404).json({ mesaj: 'Comanda nu există.' });
    if (comanda.furnizorId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea să confirmi această comandă.' });
    }
    if (comanda.status !== 'in_asteptare') {
      return res.status(400).json({ mesaj: 'Doar comenzile în așteptare pot fi confirmate.' });
    }
    const actualizata = await prisma.comandaCatalog.update({
      where: { id: comanda.id },
      data: { status: 'confirmata' },
      include: COMANDA_INCLUDE,
    });
    creeazaNotificare({
      userId: comanda.cumparatorId,
      tip: 'castigat',
      titlu: `Comanda ta pentru "${comanda.denumireProdus}" a fost confirmată!`,
      mesaj: `Furnizor: ${actualizata.furnizor.nume}`,
    });
    res.json(serializeComandaCatalog(actualizata));
  } catch (err) {
    console.error('[catalog PUT /comenzi/:id/confirma]', err);
    res.status(500).json({ mesaj: 'Eroare la confirmarea comenzii.' });
  }
});

// ─── PUT /api/catalog/comenzi/:id/refuza ─────────────────────────────────
router.put('/comenzi/:id/refuza', protejat, doarRol('FURNIZOR'), async (req, res) => {
  try {
    const { motiv } = req.body;
    const comanda = await prisma.comandaCatalog.findUnique({ where: { id: req.params.id } });
    if (!comanda) return res.status(404).json({ mesaj: 'Comanda nu există.' });
    if (comanda.furnizorId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea să refuzi această comandă.' });
    }
    if (comanda.status !== 'in_asteptare') {
      return res.status(400).json({ mesaj: 'Doar comenzile în așteptare pot fi refuzate.' });
    }
    const actualizata = await prisma.comandaCatalog.update({
      where: { id: comanda.id },
      data: { status: 'refuzata', motivRefuz: (motiv || '').trim().slice(0, 300) },
      include: COMANDA_INCLUDE,
    });
    creeazaNotificare({
      userId: comanda.cumparatorId,
      tip: 'alerta',
      titlu: `Comanda ta pentru "${comanda.denumireProdus}" a fost refuzată`,
      mesaj: actualizata.motivRefuz || 'Furnizorul nu a specificat un motiv.',
    });
    res.json(serializeComandaCatalog(actualizata));
  } catch (err) {
    console.error('[catalog PUT /comenzi/:id/refuza]', err);
    res.status(500).json({ mesaj: 'Eroare la refuzarea comenzii.' });
  }
});

// ─── POST /api/catalog/comenzi/:id/anuleaza ──────────────────────────────
// Cumpărătorul își retrage comanda, cât timp e încă în așteptare.
router.post('/comenzi/:id/anuleaza', protejat, async (req, res) => {
  try {
    const comanda = await prisma.comandaCatalog.findUnique({ where: { id: req.params.id } });
    if (!comanda) return res.status(404).json({ mesaj: 'Comanda nu există.' });
    if (comanda.cumparatorId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea să anulezi această comandă.' });
    }
    if (comanda.status !== 'in_asteptare') {
      return res.status(400).json({ mesaj: 'Doar comenzile în așteptare pot fi anulate.' });
    }
    const actualizata = await prisma.comandaCatalog.update({
      where: { id: comanda.id },
      data: { status: 'anulata' },
      include: COMANDA_INCLUDE,
    });
    res.json(serializeComandaCatalog(actualizata));
  } catch (err) {
    console.error('[catalog POST /comenzi/:id/anuleaza]', err);
    res.status(500).json({ mesaj: 'Eroare la anularea comenzii.' });
  }
});

// ─── GET /api/catalog/comenzi/:id/contact ────────────────────────────────
// Date de contact — dezvăluite doar după confirmare, doar celor doi implicați.
router.get('/comenzi/:id/contact', protejat, async (req, res) => {
  try {
    const comanda = await prisma.comandaCatalog.findUnique({ where: { id: req.params.id } });
    if (!comanda) return res.status(404).json({ mesaj: 'Comanda nu există.' });

    const idUtilizator = req.utilizator.id;
    const parteImplicata = comanda.cumparatorId === idUtilizator || comanda.furnizorId === idUtilizator;
    if (!parteImplicata) return res.status(403).json({ mesaj: 'Nu ai acces la aceste date de contact.' });
    if (comanda.status !== 'confirmata') {
      return res.status(403).json({ mesaj: 'Datele de contact se dezvăluie doar după confirmarea comenzii.' });
    }

    const [cumparator, furnizor] = await Promise.all([
      prisma.user.findUnique({ where: { id: comanda.cumparatorId } }),
      prisma.user.findUnique({ where: { id: comanda.furnizorId } }),
    ]);

    res.json({
      cumparator: serializeUserContact(cumparator),
      furnizor: serializeUserContact(furnizor),
    });
  } catch (err) {
    console.error('[catalog GET /comenzi/:id/contact]', err);
    res.status(500).json({ mesaj: 'Eroare la preluarea datelor de contact.' });
  }
});

module.exports = router;
