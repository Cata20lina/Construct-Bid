const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat, doarRol } = require('../middleware/auth');
const { serializeUserAdmin, serializeReclamatie, serializeProject } = require('../lib/serialize');
const { crediteazaTokenuri, consumaTokenuri, EroareTokeniInsuficienti } = require('../lib/tokenEconomie');

const ROLURI_VALIDE = ['SUBCONTRACTOR', 'DEZVOLTATOR', 'FURNIZOR', 'ADMIN'];

// Toate rutele de aici sunt disponibile doar contului(rilor) cu rol ADMIN.
// Nu există un flux de auto-promovare la ADMIN din UI — un cont devine admin
// doar printr-o actualizare directă în baza de date (vezi nota din README/
// mesajul de livrare), exact ca să nu poată fi obținut din greșeală sau abuz.
router.use(protejat, doarRol('ADMIN'));

// ─── GET /api/admin/statistici ───────────────────────────────────────────
router.get('/statistici', async (req, res) => {
  try {
    const [utilizatori, proiecte, oferte, reclamatiiDeschise] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.oferta.count(),
      prisma.reclamatie.count({ where: { status: 'deschisa' } }),
    ]);
    res.json({ utilizatori, proiecte, oferte, reclamatiiDeschise });
  } catch (err) {
    console.error('[admin GET /statistici]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea statisticilor.' });
  }
});

// ─── GET /api/admin/utilizatori ──────────────────────────────────────────
// Filtre opționale: ?rol=, ?suspendat=true/false, ?cauta= (nume/email/CUI)
router.get('/utilizatori', async (req, res) => {
  try {
    const { rol, suspendat, cauta } = req.query;
    const where = {};
    if (rol) where.rol = rol;
    if (suspendat === 'true') where.suspendat = true;
    if (suspendat === 'false') where.suspendat = false;
    if (cauta) {
      where.OR = [
        { nume: { contains: cauta, mode: 'insensitive' } },
        { email: { contains: cauta, mode: 'insensitive' } },
        { cui: { contains: cauta, mode: 'insensitive' } },
      ];
    }

    const utilizatori = await prisma.user.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 200,
    });
    res.json(utilizatori.map(serializeUserAdmin));
  } catch (err) {
    console.error('[admin GET /utilizatori]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea utilizatorilor.' });
  }
});

// ─── POST /api/admin/utilizatori/:id/suspenda ────────────────────────────
router.post('/utilizatori/:id/suspenda', async (req, res) => {
  try {
    if (req.params.id === req.utilizator.id) {
      return res.status(400).json({ mesaj: 'Nu îți poți suspenda propriul cont.' });
    }
    const { motiv } = req.body;
    const u = await prisma.user.update({
      where: { id: req.params.id },
      data: { suspendat: true, suspendatMotiv: (motiv || '').trim().slice(0, 300) },
    });
    res.json(serializeUserAdmin(u));
  } catch (err) {
    console.error('[admin POST /utilizatori/:id/suspenda]', err);
    res.status(500).json({ mesaj: 'Eroare la suspendarea contului.' });
  }
});

// ─── POST /api/admin/utilizatori/:id/reactiveaza ─────────────────────────
router.post('/utilizatori/:id/reactiveaza', async (req, res) => {
  try {
    const u = await prisma.user.update({
      where: { id: req.params.id },
      data: { suspendat: false, suspendatMotiv: '' },
    });
    res.json(serializeUserAdmin(u));
  } catch (err) {
    console.error('[admin POST /utilizatori/:id/reactiveaza]', err);
    res.status(500).json({ mesaj: 'Eroare la reactivarea contului.' });
  }
});

// ─── GET /api/admin/reclamatii ────────────────────────────────────────────
// Filtru opțional: ?status=deschisa|in_lucru|rezolvata|respinsa
router.get('/reclamatii', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const reclamatii = await prisma.reclamatie.findMany({
      where,
      include: { raportatDe: true, raportatImpotriva: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(reclamatii.map(serializeReclamatie));
  } catch (err) {
    console.error('[admin GET /reclamatii]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea reclamațiilor.' });
  }
});

// ─── PUT /api/admin/reclamatii/:id ────────────────────────────────────────
router.put('/reclamatii/:id', async (req, res) => {
  try {
    const { status, raspunsAdmin } = req.body;
    const STATUSURI_VALIDE = ['deschisa', 'in_lucru', 'rezolvata', 'respinsa'];
    const data = {};
    if (status !== undefined) {
      if (!STATUSURI_VALIDE.includes(status)) return res.status(400).json({ mesaj: 'Status invalid.' });
      data.status = status;
    }
    if (raspunsAdmin !== undefined) data.raspunsAdmin = String(raspunsAdmin).trim().slice(0, 2000);

    const reclamatie = await prisma.reclamatie.update({
      where: { id: req.params.id },
      data,
      include: { raportatDe: true, raportatImpotriva: true },
    });
    res.json(serializeReclamatie(reclamatie));
  } catch (err) {
    console.error('[admin PUT /reclamatii/:id]', err);
    res.status(500).json({ mesaj: 'Eroare la actualizarea reclamației.' });
  }
});

// ─── PUT /api/admin/utilizatori/:id ────────────────────────────────────────
// Editare date de bază + schimbare rol. Nu permite schimbarea parolei/emailului
// de aici (utilizatorul își gestionează asta singur, sau prin resetare parolă).
router.put('/utilizatori/:id', async (req, res) => {
  try {
    const { nume, cui, telefon, judet, rol } = req.body;
    const data = {};
    if (nume !== undefined) {
      if (!nume.trim()) return res.status(400).json({ mesaj: 'Denumirea firmei nu poate fi goală.' });
      data.nume = nume.trim().slice(0, 200);
    }
    if (cui !== undefined) data.cui = String(cui).trim().slice(0, 30);
    if (telefon !== undefined) data.telefon = String(telefon).trim().slice(0, 30);
    if (judet !== undefined) data.judet = String(judet).trim().slice(0, 60);
    if (rol !== undefined) {
      if (!ROLURI_VALIDE.includes(rol)) return res.status(400).json({ mesaj: 'Rol invalid.' });
      if (rol !== 'ADMIN' && req.params.id === req.utilizator.id) {
        return res.status(400).json({ mesaj: 'Nu îți poți retrage singur rolul de admin.' });
      }
      data.rol = rol;
    }

    const u = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json(serializeUserAdmin(u));
  } catch (err) {
    console.error('[admin PUT /utilizatori/:id]', err);
    res.status(500).json({ mesaj: 'Eroare la actualizarea utilizatorului.' });
  }
});

// ─── POST /api/admin/utilizatori/:id/ajusteaza-tokenuri ───────────────────
// `suma` poate fi pozitivă (bonus/corecție) sau negativă (retragere) — orice
// ajustare manuală apare în istoricul de tokenuri al utilizatorului cu
// tipul AJUSTARE_ADMIN, ca să fie clar de unde a apărut.
router.post('/utilizatori/:id/ajusteaza-tokenuri', async (req, res) => {
  try {
    const suma = Number(req.body.suma);
    const motiv = (req.body.motiv || '').trim().slice(0, 300);
    if (!Number.isFinite(suma) || suma === 0) {
      return res.status(400).json({ mesaj: 'Introdu o sumă de ajustare validă (diferită de 0).' });
    }

    const descriere = `Ajustare admin${motiv ? `: ${motiv}` : ''} (de către ${req.utilizator.nume})`;
    let actualizat;
    if (suma > 0) {
      actualizat = await crediteazaTokenuri({ userId: req.params.id, suma, tip: 'AJUSTARE_ADMIN', descriere });
    } else {
      actualizat = await consumaTokenuri({ userId: req.params.id, suma: Math.abs(suma), tip: 'AJUSTARE_ADMIN', descriere });
    }

    res.json(serializeUserAdmin(actualizat));
  } catch (err) {
    if (err instanceof EroareTokeniInsuficienti) {
      return res.status(400).json({ mesaj: `Utilizatorul are doar ${err.disponibil} tokenuri — nu poți retrage ${err.necesar}.` });
    }
    console.error('[admin POST /utilizatori/:id/ajusteaza-tokenuri]', err);
    res.status(500).json({ mesaj: 'Eroare la ajustarea tokenurilor.' });
  }
});

// ─── GET /api/admin/proiecte ────────────────────────────────────────────────
// Filtre opționale: ?activ=true/false, ?cauta= (titlu/locație)
router.get('/proiecte', async (req, res) => {
  try {
    const { activ, cauta } = req.query;
    const where = {};
    if (activ === 'true') where.activ = true;
    if (activ === 'false') where.activ = false;
    if (cauta) {
      where.OR = [
        { titlu: { contains: cauta, mode: 'insensitive' } },
        { locatie: { contains: cauta, mode: 'insensitive' } },
      ];
    }
    const proiecte = await prisma.project.findMany({
      where,
      include: { dezvoltator: true, castigator: true, _count: { select: { oferte: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(proiecte.map(serializeProject));
  } catch (err) {
    console.error('[admin GET /proiecte]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea proiectelor.' });
  }
});

// ─── POST /api/admin/proiecte/:id/dezactiveaza ─────────────────────────────
// Moderare "blândă" — ascunde anunțul din listele publice fără să șteargă
// ofertele/mesajele legate de el (util dacă e o investigație în curs).
router.post('/proiecte/:id/dezactiveaza', async (req, res) => {
  try {
    const p = await prisma.project.update({ where: { id: req.params.id }, data: { activ: false } });
    res.json(serializeProject(p));
  } catch (err) {
    console.error('[admin POST /proiecte/:id/dezactiveaza]', err);
    res.status(500).json({ mesaj: 'Eroare la dezactivarea proiectului.' });
  }
});

router.post('/proiecte/:id/activeaza', async (req, res) => {
  try {
    const p = await prisma.project.update({ where: { id: req.params.id }, data: { activ: true } });
    res.json(serializeProject(p));
  } catch (err) {
    console.error('[admin POST /proiecte/:id/activeaza]', err);
    res.status(500).json({ mesaj: 'Eroare la reactivarea proiectului.' });
  }
});

// ─── DELETE /api/admin/proiecte/:id ─────────────────────────────────────────
// Ștergere definitivă — pentru spam/anunțuri false. Cascade pe oferte/mesaje/
// clarificări (definit în schema Prisma), deci se șterge tot ce ține de el.
router.delete('/proiecte/:id', async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ mesaj: 'Proiect șters definitiv.' });
  } catch (err) {
    console.error('[admin DELETE /proiecte/:id]', err);
    res.status(500).json({ mesaj: 'Eroare la ștergerea proiectului.' });
  }
});

module.exports = router;