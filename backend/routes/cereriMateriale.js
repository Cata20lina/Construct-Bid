const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat, doarRol } = require('../middleware/auth');
const {
  serializeCerereMateriale, serializeOfertaMateriale, serializeUserContact,
} = require('../lib/serialize');
const { creeazaNotificare } = require('../lib/notificari');
const { notificaAdmini } = require('../lib/moderare');
const {
  consumaTokenuri, crediteazaTokenuri, EroareTokeniInsuficienti, COSTURI, RECOMPENSE,
} = require('../lib/tokenEconomie');

const CERERE_INCLUDE = {
  articole: { orderBy: { createdAt: 'asc' } },
  creatDe: { select: { id: true, nume: true, judet: true, cui: true } },
  proiect: { select: { id: true, titlu: true, dezvoltatorId: true } },
  _count: { select: { oferte: true } },
};

const OFERTA_INCLUDE = {
  furnizor: { include: { lucrari: true, disponibilitati: true } },
  articole: true,
};

// ─── GET /api/cereri-materiale ──────────────────────────────────────────────
// Listă publică de cereri deschise — pentru furnizori care caută la ce să
// ofertez. Filtre: judet, cauta (titlu/descriere).
router.get('/', protejat, async (req, res) => {
  try {
    const { judet, cauta } = req.query;
    const where = { status: 'deschisa', suspendat: false, creatDe: { suspendat: false } };
    if (judet) where.judet = judet;
    if (cauta) {
      where.OR = [
        { titlu: { contains: cauta, mode: 'insensitive' } },
        { descriere: { contains: cauta, mode: 'insensitive' } },
      ];
    }

    const cereri = await prisma.cerereMateriale.findMany({
      where,
      include: CERERE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(cereri.map(serializeCerereMateriale));
  } catch (err) {
    console.error('[cereriMateriale GET /]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea cererilor de materiale.' });
  }
});

// ─── GET /api/cereri-materiale/mele ─────────────────────────────────────────
// Cererile create de utilizatorul curent (dezvoltator sau subcontractor).
router.get('/mele', protejat, doarRol('DEZVOLTATOR', 'SUBCONTRACTOR'), async (req, res) => {
  try {
    const cereri = await prisma.cerereMateriale.findMany({
      where: { creatDeId: req.utilizator.id },
      include: CERERE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(cereri.map(serializeCerereMateriale));
  } catch (err) {
    console.error('[cereriMateriale GET /mele]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea cererilor tale.' });
  }
});

// ─── GET /api/cereri-materiale/ofertele-mele ────────────────────────────────
// Ofertele (de materiale) depuse de furnizorul curent, cu cererea aferentă.
router.get('/ofertele-mele', protejat, doarRol('FURNIZOR'), async (req, res) => {
  try {
    const oferte = await prisma.ofertaMateriale.findMany({
      where: { furnizorId: req.utilizator.id },
      include: { ...OFERTA_INCLUDE, cerere: { include: CERERE_INCLUDE } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(oferte.map(o => ({ ...serializeOfertaMateriale(o), cerere: serializeCerereMateriale(o.cerere) })));
  } catch (err) {
    console.error('[cereriMateriale GET /ofertele-mele]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea ofertelor tale.' });
  }
});

// ─── GET /api/cereri-materiale/:id ──────────────────────────────────────────
// Detaliu cerere + articole. Ofertele: creatorul vede TOATE ofertele primite;
// un furnizor vede DOAR oferta lui; oricine altcineva nu vede oferte.
router.get('/:id', protejat, async (req, res) => {
  try {
    const cerere = await prisma.cerereMateriale.findUnique({
      where: { id: req.params.id },
      include: CERERE_INCLUDE,
    });
    if (!cerere) return res.status(404).json({ mesaj: 'Cererea nu există.' });

    const esteCreator = cerere.creatDeId === req.utilizator.id;
    const esteFurnizor = req.utilizator.rol === 'FURNIZOR';

    let oferte = [];
    if (esteCreator) {
      oferte = await prisma.ofertaMateriale.findMany({
        where: { cerereId: cerere.id },
        include: OFERTA_INCLUDE,
        orderBy: { createdAt: 'asc' },
      });
    } else if (esteFurnizor) {
      oferte = await prisma.ofertaMateriale.findMany({
        where: { cerereId: cerere.id, furnizorId: req.utilizator.id },
        include: OFERTA_INCLUDE,
        orderBy: { createdAt: 'asc' },
      });
    }

    res.json({
      cerere: serializeCerereMateriale(cerere),
      oferte: oferte.map(serializeOfertaMateriale),
      esteCreator,
    });
  } catch (err) {
    console.error('[cereriMateriale GET /:id]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea cererii.' });
  }
});

// ─── POST /api/cereri-materiale ─────────────────────────────────────────────
// Creează o cerere de materiale, cu una sau mai multe articole.
// proiectId e opțional — dacă e dat, trebuie ca cel care creează cererea să
// fie fie dezvoltatorul proiectului, fie subcontractorul câștigător al lui.
router.post('/', protejat, doarRol('DEZVOLTATOR', 'SUBCONTRACTOR'), async (req, res) => {
  try {
    const {
      titlu, descriere, judet, oras, termenLimita, proiectId, articole,
    } = req.body;

    if (!titlu || !judet) {
      return res.status(400).json({ mesaj: 'Titlul și județul sunt obligatorii.' });
    }
    if (!Array.isArray(articole) || articole.length === 0) {
      return res.status(400).json({ mesaj: 'Adaugă cel puțin un articol în cerere.' });
    }
    const articolePregatite = [];
    for (const a of articole) {
      const denumire = (a?.denumire || '').trim();
      const cantitate = Number(a?.cantitate);
      if (!denumire) return res.status(400).json({ mesaj: 'Fiecare articol are nevoie de o denumire.' });
      if (Number.isNaN(cantitate) || cantitate <= 0) {
        return res.status(400).json({ mesaj: `Cantitatea pentru "${denumire}" trebuie să fie un număr pozitiv.` });
      }
      articolePregatite.push({
        denumire,
        cantitate,
        unitateMasura: (a?.unitateMasura || 'buc').trim() || 'buc',
        specificatii: (a?.specificatii || '').trim(),
      });
    }

    let proiectValid = null;
    if (proiectId) {
      const proiect = await prisma.project.findUnique({ where: { id: proiectId } });
      if (!proiect) return res.status(404).json({ mesaj: 'Proiectul indicat nu există.' });

      const esteDezvoltatorulProiectului = proiect.dezvoltatorId === req.utilizator.id;
      const esteCastigatorulProiectului = proiect.castigatorId === req.utilizator.id;
      if (!esteDezvoltatorulProiectului && !esteCastigatorulProiectului) {
        return res.status(403).json({ mesaj: 'Poți lega o cerere de materiale doar de un proiect al tău (ca dezvoltator) sau pe care l-ai câștigat (ca subcontractor).' });
      }
      proiectValid = proiect;
    }

    // Consumăm tokenurile ÎNTÂI (tranzacție proprie în lib/tokenEconomie);
    // dacă publicarea cererii eșuează după asta, e o eroare 500 reală, nu o
    // condiție normală — riscul e același ca la publicarea unui proiect.
    await consumaTokenuri({
      userId: req.utilizator.id,
      suma: COSTURI.POSTARE_CERERE_MATERIALE,
      tip: 'POSTARE_CERERE_MATERIALE',
      descriere: `Publicare cerere de materiale: "${titlu}"`,
    });

    const cerere = await prisma.cerereMateriale.create({
      data: {
        titlu: titlu.trim(),
        descriere: (descriere || '').trim(),
        judet,
        oras: (oras || '').trim(),
        termenLimita: termenLimita ? new Date(termenLimita) : null,
        proiectId: proiectValid ? proiectValid.id : null,
        creatDeId: req.utilizator.id,
        articole: { create: articolePregatite },
      },
      include: CERERE_INCLUDE,
    });

    res.status(201).json(serializeCerereMateriale(cerere));
  } catch (err) {
    if (err instanceof EroareTokeniInsuficienti) {
      return res.status(402).json({ mesaj: err.message });
    }
    console.error('[cereriMateriale POST /]', err);
    res.status(500).json({ mesaj: 'Eroare la crearea cererii de materiale.' });
  }
});

// ─── PUT /api/cereri-materiale/:id ──────────────────────────────────────────
// Editarea datelor generale ale cererii (nu și a articolelor, care pot avea
// deja oferte legate de ele).
router.put('/:id', protejat, async (req, res) => {
  try {
    const cerere = await prisma.cerereMateriale.findUnique({ where: { id: req.params.id } });
    if (!cerere) return res.status(404).json({ mesaj: 'Cererea nu există.' });
    if (cerere.creatDeId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea să editezi această cerere.' });
    }

    const { titlu, descriere, judet, oras, termenLimita } = req.body;
    const data = {};
    if (titlu !== undefined) {
      if (!String(titlu).trim()) return res.status(400).json({ mesaj: 'Titlul nu poate fi gol.' });
      data.titlu = String(titlu).trim();
    }
    if (descriere !== undefined) data.descriere = String(descriere).trim();
    if (judet !== undefined) {
      if (!String(judet).trim()) return res.status(400).json({ mesaj: 'Județul nu poate fi gol.' });
      data.judet = String(judet).trim();
    }
    if (oras !== undefined) data.oras = String(oras).trim();
    if (termenLimita !== undefined) data.termenLimita = termenLimita ? new Date(termenLimita) : null;

    const actualizata = await prisma.cerereMateriale.update({ where: { id: cerere.id }, data, include: CERERE_INCLUDE });
    res.json(serializeCerereMateriale(actualizata));
  } catch (err) {
    console.error('[cereriMateriale PUT /:id]', err);
    res.status(500).json({ mesaj: 'Eroare la actualizarea cererii.' });
  }
});

// ─── POST /api/cereri-materiale/:id/trimite-modificari ──────────────────────
router.post('/:id/trimite-modificari', protejat, async (req, res) => {
  try {
    const cerere = await prisma.cerereMateriale.findUnique({ where: { id: req.params.id } });
    if (!cerere) return res.status(404).json({ mesaj: 'Cererea nu există.' });
    if (cerere.creatDeId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea să modifici această cerere.' });
    }
    if (!cerere.suspendat) return res.status(400).json({ mesaj: 'Cererea nu este suspendată.' });

    const actualizata = await prisma.cerereMateriale.update({
      where: { id: cerere.id },
      data: { modificariTrimiseLa: new Date() },
      include: CERERE_INCLUDE,
    });
    notificaAdmini({
      titlu: 'Modificări trimise spre verificare',
      mesaj: `${req.utilizator.nume} a modificat cererea de materiale „${actualizata.titlu}”.`,
    });
    res.json(serializeCerereMateriale(actualizata));
  } catch (err) {
    console.error('[cereriMateriale POST /:id/trimite-modificari]', err);
    res.status(500).json({ mesaj: 'Eroare la trimiterea modificărilor.' });
  }
});

// ─── POST /api/cereri-materiale/:id/anuleaza ────────────────────────────────
router.post('/:id/anuleaza', protejat, async (req, res) => {
  try {
    const cerere = await prisma.cerereMateriale.findUnique({ where: { id: req.params.id } });
    if (!cerere) return res.status(404).json({ mesaj: 'Cererea nu există.' });
    if (cerere.creatDeId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea să anulezi această cerere.' });
    }
    if (cerere.status !== 'deschisa') {
      return res.status(400).json({ mesaj: 'Doar cererile deschise pot fi anulate.' });
    }
    const actualizata = await prisma.cerereMateriale.update({
      where: { id: cerere.id },
      data: { status: 'anulata' },
      include: CERERE_INCLUDE,
    });
    res.json(serializeCerereMateriale(actualizata));
  } catch (err) {
    console.error('[cereriMateriale POST /:id/anuleaza]', err);
    res.status(500).json({ mesaj: 'Eroare la anularea cererii.' });
  }
});

// ─── POST /api/cereri-materiale/:id/oferte ──────────────────────────────────
// Un furnizor trimite prețuri pe unul sau mai multe articole din cerere.
router.post('/:id/oferte', protejat, doarRol('FURNIZOR'), async (req, res) => {
  try {
    const { mesaj, termenLivrare, articole } = req.body;
    const termenNum = Number(termenLivrare);
    if (!termenNum || termenNum <= 0) {
      return res.status(400).json({ mesaj: 'Termenul de livrare trebuie să fie un număr pozitiv de zile.' });
    }
    if (!Array.isArray(articole) || articole.length === 0) {
      return res.status(400).json({ mesaj: 'Alege cel puțin un articol pentru care oferi preț.' });
    }

    const cerere = await prisma.cerereMateriale.findUnique({
      where: { id: req.params.id },
      include: { articole: true },
    });
    if (!cerere) return res.status(404).json({ mesaj: 'Cererea nu există.' });
    if (cerere.status !== 'deschisa') {
      return res.status(400).json({ mesaj: 'Această cerere nu mai este deschisă pentru oferte.' });
    }
    if (cerere.suspendat) {
      return res.status(403).json({ mesaj: 'Cererea este suspendată temporar de administrator și nu primește oferte.' });
    }

    const idArticoleCerere = new Set(cerere.articole.map(a => a.id));
    const articolePregatite = [];
    for (const a of articole) {
      if (!idArticoleCerere.has(a?.cerereArticolId)) {
        return res.status(400).json({ mesaj: 'Unul dintre articolele trimise nu aparține acestei cereri.' });
      }
      const pretUnitar = Number(a?.pretUnitar);
      if (Number.isNaN(pretUnitar) || pretUnitar <= 0) {
        return res.status(400).json({ mesaj: 'Fiecare articol trebuie să aibă un preț unitar pozitiv.' });
      }
      articolePregatite.push({
        cerereArticolId: a.cerereArticolId,
        pretUnitar,
        cantitateOfertata: a?.cantitateOfertata != null && a.cantitateOfertata !== '' ? Number(a.cantitateOfertata) : null,
      });
    }

    const existenta = await prisma.ofertaMateriale.findFirst({
      where: { cerereId: cerere.id, furnizorId: req.utilizator.id },
    });
    if (existenta) {
      return res.status(409).json({ mesaj: 'Ai depus deja o ofertă pentru această cerere. Retrage-o dacă vrei să o refaci.' });
    }

    const oferta = await prisma.ofertaMateriale.create({
      data: {
        cerereId: cerere.id,
        furnizorId: req.utilizator.id,
        mesaj: (mesaj || '').trim(),
        termenLivrare: termenNum,
        articole: { create: articolePregatite },
      },
      include: OFERTA_INCLUDE,
    });

    try {
      await crediteazaTokenuri({
        userId: req.utilizator.id,
        suma: RECOMPENSE.OFERTA_DEPUSA,
        tip: 'RECOMPENSA_OFERTA_MATERIALE',
        descriere: `Recompensă pentru oferta depusă la cererea "${cerere.titlu}"`,
      });
    } catch (eRecompensa) {
      console.error('[cereriMateriale POST /:id/oferte] eroare la acordarea recompensei:', eRecompensa.message);
    }

    creeazaNotificare({
      userId: cerere.creatDeId,
      tip: 'oferta',
      titlu: `Ai primit o ofertă de materiale de la "${oferta.furnizor.nume}"`,
      mesaj: `Cerere: ${cerere.titlu}`,
      link: `cerere:${cerere.id}`,
    });

    res.status(201).json(serializeOfertaMateriale(oferta));
  } catch (err) {
    console.error('[cereriMateriale POST /:id/oferte]', err);
    res.status(500).json({ mesaj: 'Eroare la depunerea ofertei.' });
  }
});

// ─── DELETE /api/cereri-materiale/:id/oferte/:ofertaId ──────────────────────
// Furnizorul își retrage oferta (doar dacă niciun articol nu a fost deja acceptat).
router.delete('/:id/oferte/:ofertaId', protejat, doarRol('FURNIZOR'), async (req, res) => {
  try {
    const oferta = await prisma.ofertaMateriale.findUnique({
      where: { id: req.params.ofertaId },
      include: { articole: true },
    });
    if (!oferta || oferta.cerereId !== req.params.id) return res.status(404).json({ mesaj: 'Oferta nu există.' });
    if (oferta.furnizorId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea să retragi această ofertă.' });
    }
    if (oferta.articole.some(a => a.acceptat)) {
      return res.status(400).json({ mesaj: 'Nu poți retrage o ofertă cu articole deja acceptate.' });
    }
    await prisma.ofertaMateriale.delete({ where: { id: oferta.id } });
    res.json({ mesaj: 'Ofertă retrasă cu succes.' });
  } catch (err) {
    console.error('[cereriMateriale DELETE /:id/oferte/:ofertaId]', err);
    res.status(500).json({ mesaj: 'Eroare la retragerea ofertei.' });
  }
});

// ─── PUT /api/cereri-materiale/:id/articole/:articolId/accepta ─────────────
// Creatorul cererii acceptă oferta unui furnizor PENTRU UN ANUME ARTICOL.
// Articole diferite din aceeași cerere pot avea câștigători diferiți.
router.put('/:id/articole/:articolId/accepta', protejat, async (req, res) => {
  try {
    const { ofertaArticolId } = req.body;
    if (!ofertaArticolId) return res.status(400).json({ mesaj: 'Lipsește ofertaArticolId.' });

    const cerere = await prisma.cerereMateriale.findUnique({
      where: { id: req.params.id },
      include: { articole: true },
    });
    if (!cerere) return res.status(404).json({ mesaj: 'Cererea nu există.' });
    if (cerere.creatDeId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea să accepți oferte pe această cerere.' });
    }
    if (cerere.status !== 'deschisa') {
      return res.status(400).json({ mesaj: 'Cererea nu mai este deschisă.' });
    }

    const articolCerere = cerere.articole.find(a => a.id === req.params.articolId);
    if (!articolCerere) return res.status(404).json({ mesaj: 'Articolul nu aparține acestei cereri.' });
    if (articolCerere.ofertaArticolCastigatoareId) {
      return res.status(409).json({ mesaj: 'Acest articol are deja un furnizor acceptat.' });
    }

    const ofertaArticol = await prisma.ofertaArticol.findUnique({
      where: { id: ofertaArticolId },
      include: { oferta: true },
    });
    if (!ofertaArticol || ofertaArticol.cerereArticolId !== articolCerere.id) {
      return res.status(404).json({ mesaj: 'Oferta indicată nu corespunde acestui articol.' });
    }

    const { articolActualizat, cerereFinalizata } = await prisma.$transaction(async (tx) => {
      await tx.ofertaArticol.update({ where: { id: ofertaArticol.id }, data: { acceptat: true } });
      const art = await tx.cerereArticol.update({
        where: { id: articolCerere.id },
        data: { ofertaArticolCastigatoareId: ofertaArticol.id },
      });

      // Dacă toate articolele cererii au acum câștigător, marcăm cererea finalizată.
      const articoleActuale = await tx.cerereArticol.findMany({ where: { cerereId: cerere.id } });
      const toateAtribuite = articoleActuale.every(a => a.id === art.id ? true : !!a.ofertaArticolCastigatoareId);
      let finalizata = false;
      if (toateAtribuite) {
        await tx.cerereMateriale.update({ where: { id: cerere.id }, data: { status: 'finalizata' } });
        finalizata = true;
      }

      return { articolActualizat: art, cerereFinalizata: finalizata };
    });

    try {
      await crediteazaTokenuri({
        userId: ofertaArticol.oferta.furnizorId,
        suma: RECOMPENSE.OFERTA_CASTIGATOARE,
        tip: 'RECOMPENSA_ARTICOL_CASTIGATOR',
        descriere: `Articol acceptat la cererea "${cerere.titlu}": ${articolCerere.denumire}`,
      });
    } catch (eRecompensa) {
      console.error('[cereriMateriale PUT /:id/articole/:articolId/accepta] eroare la acordarea recompensei:', eRecompensa.message);
    }

    creeazaNotificare({
      userId: ofertaArticol.oferta.furnizorId,
      tip: 'castigat',
      titlu: `Oferta ta pentru "${articolCerere.denumire}" a fost acceptată!`,
      mesaj: `Cerere: ${cerere.titlu}`,
      link: `cerere:${cerere.id}`,
    });

    res.json({
      articol: articolActualizat,
      cerereFinalizata,
    });
  } catch (err) {
    console.error('[cereriMateriale PUT /:id/articole/:articolId/accepta]', err);
    res.status(500).json({ mesaj: 'Eroare la acceptarea ofertei.' });
  }
});

// ─── GET /api/cereri-materiale/:id/contact/:furnizorId ──────────────────────
// Date de contact ale unui furnizor — dezvăluite doar dacă a câștigat cel
// puțin un articol din această cerere. Accesibil creatorului cererii SAU
// furnizorului însuși.
router.get('/:id/contact/:furnizorId', protejat, async (req, res) => {
  try {
    const cerere = await prisma.cerereMateriale.findUnique({ where: { id: req.params.id } });
    if (!cerere) return res.status(404).json({ mesaj: 'Cererea nu există.' });

    const idUtilizator = req.utilizator.id;
    const esteCreator = cerere.creatDeId === idUtilizator;
    const esteFurnizorulVizat = req.params.furnizorId === idUtilizator;
    if (!esteCreator && !esteFurnizorulVizat) {
      return res.status(403).json({ mesaj: 'Nu ai acces la aceste date de contact.' });
    }

    const aCastigatCeva = await prisma.cerereArticol.findFirst({
      where: {
        cerereId: cerere.id,
        ofertaArticolCastigatoare: { oferta: { furnizorId: req.params.furnizorId } },
      },
    });
    if (!aCastigatCeva) {
      return res.status(403).json({ mesaj: 'Datele de contact se dezvăluie doar după acceptarea unei oferte a acestui furnizor.' });
    }

    const [furnizor, creator] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.params.furnizorId } }),
      prisma.user.findUnique({ where: { id: cerere.creatDeId } }),
    ]);

    res.json({
      furnizor: serializeUserContact(furnizor),
      creator: serializeUserContact(creator),
    });
  } catch (err) {
    console.error('[cereriMateriale GET /:id/contact/:furnizorId]', err);
    res.status(500).json({ mesaj: 'Eroare la preluarea datelor de contact.' });
  }
});

module.exports = router;
