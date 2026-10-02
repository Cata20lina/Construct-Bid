const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat, doarRol } = require('../middleware/auth');
const { serializeUserAdmin, serializeReclamatie, serializeProject, serializeCerereMateriale } = require('../lib/serialize');
const { trimiteMesajAdmin } = require('../lib/moderare');
const { notificaContSuspendat } = require('../lib/mailer');
const { creeazaNotificare } = require('../lib/notificari');
const { recalculeazaRating } = require('../lib/rating');
const { verificaSiSalveaza } = require('./cui');
const { stergeDocumenteleContului } = require('../lib/documentePrivate');
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
    const [utilizatori, proiecte, oferte, reclamatiiDeschise, proiecteSuspendate, cereriSuspendate, deVerificatProiecte, deVerificatCereri] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.oferta.count(),
      prisma.reclamatie.count({ where: { status: 'deschisa' } }),
      prisma.project.count({ where: { suspendat: true } }),
      prisma.cerereMateriale.count({ where: { suspendat: true } }),
      prisma.project.count({ where: { suspendat: true, modificariTrimiseLa: { not: null } } }),
      prisma.cerereMateriale.count({ where: { suspendat: true, modificariTrimiseLa: { not: null } } }),
    ]);
    res.json({
      utilizatori, proiecte, oferte, reclamatiiDeschise,
      suspendate: proiecteSuspendate + cereriSuspendate,
      deVerificat: deVerificatProiecte + deVerificatCereri,
    });
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
    notificaContSuspendat({ destinatar: u, motiv: u.suspendatMotiv });
    // Deconectează pe loc firma, în toate taburile deschise
    try {
      const { getIO } = require('../sockets');
      getIO().to(`user_${u.id}`).emit('cont_suspendat', { motiv: u.suspendatMotiv });
    } catch (e) { /* socket indisponibil - ignoram */ }
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
    if (cui !== undefined) {
      data.cui = String(cui).trim().slice(0, 30);
      const existent = await prisma.user.findUnique({ where: { id: req.params.id }, select: { cui: true } });
      // Alt CUI = altă firmă: verificarea ANAF și confirmarea identității nu mai sunt valabile
      if (existent && existent.cui.replace(/[^0-9]/g, '') !== data.cui.replace(/[^0-9]/g, '')) {
        Object.assign(data, {
          cuiVerificat: false, cuiDenumireOficiala: '', cuiVerificatLa: null,
          identitateStatus: 'NECONFIRMATA', identitateMetoda: '', identitatePersoana: '', identitateCalitate: '',
          identitateTrimisaLa: null, identitateConfirmataLa: null, identitateConfirmataDe: '', identitateMotivRespingere: '',
        });
        await stergeDocumenteleContului(req.params.id, req.utilizator);
      }
    }
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
    if (req.query.suspendat === 'true') where.suspendat = true;
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

// ─── POST /api/admin/utilizatori/:id/verifica-cui ──────────────────────────
// Verifică la ANAF CUI-ul de pe profilul oricărui cont și salvează rezultatul
// (inclusiv bilanțul), la fel ca verificarea făcută de firmă din Profil.
router.post('/utilizatori/:id/verifica-cui', async (req, res) => {
  try {
    const utilizator = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!utilizator) return res.status(404).json({ mesaj: 'Utilizatorul nu există.' });

    const r = await verificaSiSalveaza(utilizator);
    if (r.status !== 200) return res.status(r.status).json(r.corp);
    res.json({ ...r.corp, utilizator: serializeUserAdmin(r.utilizator) });
  } catch (err) {
    if (err.message === 'ANAF_INDISPONIBIL') {
      return res.status(502).json({ mesaj: 'Serviciul ANAF nu a răspuns. Încearcă din nou mai târziu.' });
    }
    console.error('[admin POST /utilizatori/:id/verifica-cui]', err);
    res.status(500).json({ mesaj: 'Eroare la verificarea CUI-ului.' });
  }
});

// ═══ Mesaje către firme ════════════════════════════════════════════════════

// ─── POST /api/admin/utilizatori/:id/mesaj ─────────────────────────────────
// Mesajul ajunge în chat-ul de suport al firmei, ca notificare și pe email.
router.post('/utilizatori/:id/mesaj', async (req, res) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ mesaj: 'Mesajul nu poate fi gol.' });
    const destinatar = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!destinatar) return res.status(404).json({ mesaj: 'Utilizatorul nu există.' });

    await trimiteMesajAdmin({ adminId: req.utilizator.id, userId: destinatar.id, text });
    res.json({ mesaj: 'Mesaj trimis.' });
  } catch (err) {
    console.error('[admin POST /utilizatori/:id/mesaj]', err);
    res.status(500).json({ mesaj: 'Eroare la trimiterea mesajului.' });
  }
});

// ═══ Suspendare până la modificări ═════════════════════════════════════════
// Anunțul/cererea dispare din liste și nu mai primește oferte. Firma vede
// motivul, face modificările și le trimite spre verificare; adminul aprobă
// (reactivează) sau o lasă suspendată cu un mesaj nou.

function textSuspendare(tip, titlu, motiv) {
  return `Am suspendat ${tip} „${titlu}” până faci câteva modificări.\n\nCe trebuie corectat: ${motiv}\n\n`
    + 'După ce faci modificările, apasă „Am făcut modificările” pe pagina anunțului și îl verificăm.';
}

router.post('/proiecte/:id/suspenda', async (req, res) => {
  try {
    const motiv = (req.body.motiv || '').trim().slice(0, 1000);
    if (!motiv) return res.status(400).json({ mesaj: 'Scrie ce trebuie modificat.' });
    const p = await prisma.project.update({
      where: { id: req.params.id },
      data: { suspendat: true, motivSuspendare: motiv, modificariTrimiseLa: null },
    });
    await trimiteMesajAdmin({
      adminId: req.utilizator.id, userId: p.dezvoltatorId, proiectId: p.id,
      titluNotificare: 'Anunț suspendat până la modificări',
      link: 'modificari',
      text: textSuspendare('anunțul', p.titlu, motiv),
    });
    res.json(serializeProject(p));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ mesaj: 'Proiectul nu există.' });
    console.error('[admin POST /proiecte/:id/suspenda]', err);
    res.status(500).json({ mesaj: 'Eroare la suspendarea proiectului.' });
  }
});

router.post('/proiecte/:id/aproba', async (req, res) => {
  try {
    const p = await prisma.project.update({
      where: { id: req.params.id },
      data: { suspendat: false, motivSuspendare: '', modificariTrimiseLa: null },
    });
    creeazaNotificare({
      userId: p.dezvoltatorId, tip: 'proiect', proiectId: p.id,
      titlu: 'Anunț reactivat',
      link: `proiect:${p.id}`,
      mesaj: `Modificările la „${p.titlu}” au fost aprobate. Anunțul e din nou vizibil.`,
    });
    res.json(serializeProject(p));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ mesaj: 'Proiectul nu există.' });
    console.error('[admin POST /proiecte/:id/aproba]', err);
    res.status(500).json({ mesaj: 'Eroare la reactivarea proiectului.' });
  }
});

// ─── Cereri de materiale ────────────────────────────────────────────────────
const CERERE_INCLUDE_ADMIN = {
  articole: true,
  creatDe: { select: { id: true, nume: true, judet: true, cui: true } },
  _count: { select: { oferte: true } },
};

// Filtre opționale: ?suspendat=true, ?cauta= (titlu/descriere)
router.get('/cereri', async (req, res) => {
  try {
    const { suspendat, cauta } = req.query;
    const where = {};
    if (suspendat === 'true') where.suspendat = true;
    if (cauta) {
      where.OR = [
        { titlu: { contains: cauta, mode: 'insensitive' } },
        { descriere: { contains: cauta, mode: 'insensitive' } },
      ];
    }
    const cereri = await prisma.cerereMateriale.findMany({
      where, include: CERERE_INCLUDE_ADMIN, orderBy: { createdAt: 'desc' }, take: 200,
    });
    res.json(cereri.map(serializeCerereMateriale));
  } catch (err) {
    console.error('[admin GET /cereri]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea cererilor.' });
  }
});

router.post('/cereri/:id/suspenda', async (req, res) => {
  try {
    const motiv = (req.body.motiv || '').trim().slice(0, 1000);
    if (!motiv) return res.status(400).json({ mesaj: 'Scrie ce trebuie modificat.' });
    const c = await prisma.cerereMateriale.update({
      where: { id: req.params.id },
      data: { suspendat: true, motivSuspendare: motiv, modificariTrimiseLa: null },
      include: CERERE_INCLUDE_ADMIN,
    });
    await trimiteMesajAdmin({
      adminId: req.utilizator.id, userId: c.creatDeId,
      titluNotificare: 'Cerere suspendată până la modificări',
      link: 'modificari',
      text: textSuspendare('cererea de materiale', c.titlu, motiv),
    });
    res.json(serializeCerereMateriale(c));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ mesaj: 'Cererea nu există.' });
    console.error('[admin POST /cereri/:id/suspenda]', err);
    res.status(500).json({ mesaj: 'Eroare la suspendarea cererii.' });
  }
});

router.post('/cereri/:id/aproba', async (req, res) => {
  try {
    const c = await prisma.cerereMateriale.update({
      where: { id: req.params.id },
      data: { suspendat: false, motivSuspendare: '', modificariTrimiseLa: null },
      include: CERERE_INCLUDE_ADMIN,
    });
    creeazaNotificare({
      userId: c.creatDeId, tip: 'alerta',
      titlu: 'Cerere reactivată',
      link: `cerere:${c.id}`,
      mesaj: `Modificările la „${c.titlu}” au fost aprobate. Cererea e din nou vizibilă furnizorilor.`,
    });
    res.json(serializeCerereMateriale(c));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ mesaj: 'Cererea nu există.' });
    console.error('[admin POST /cereri/:id/aproba]', err);
    res.status(500).json({ mesaj: 'Eroare la reactivarea cererii.' });
  }
});

// ─── GET /api/admin/de-verificat ───────────────────────────────────────────
// Tot ce e suspendat până la modificări: întâi ce a fost retrimis de firme
// (cel mai vechi primul, ca să nu aștepte nimeni prea mult), apoi ce încă
// așteaptă corectura firmei.
router.get('/de-verificat', async (req, res) => {
  try {
    const [proiecte, cereri] = await Promise.all([
      prisma.project.findMany({
        where: { suspendat: true },
        include: { dezvoltator: true, castigator: true, _count: { select: { oferte: true } } },
      }),
      prisma.cerereMateriale.findMany({ where: { suspendat: true }, include: CERERE_INCLUDE_ADMIN }),
    ]);
    const ordine = (a, b) => {
      if (!!a.modificariTrimiseLa !== !!b.modificariTrimiseLa) return a.modificariTrimiseLa ? -1 : 1;
      if (a.modificariTrimiseLa) return new Date(a.modificariTrimiseLa) - new Date(b.modificariTrimiseLa);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    };
    const elemente = [
      ...proiecte.map(p => ({ tip: 'proiect', ...serializeProject(p), autor: p.dezvoltator ? { _id: p.dezvoltator.id, nume: p.dezvoltator.nume } : null })),
      ...cereri.map(c => ({ tip: 'cerere', ...serializeCerereMateriale(c), autor: c.creatDe ? { _id: c.creatDe.id, nume: c.creatDe.nume } : null })),
    ].sort(ordine);
    res.json(elemente);
  } catch (err) {
    console.error('[admin GET /de-verificat]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea listei de verificat.' });
  }
});

// ═══ Confirmarea identității firmelor ══════════════════════════════════════

// ─── GET /api/admin/identitati?status= ─────────────────────────────────────
// Implicit: cererile în verificare, cele mai vechi primele.
router.get('/identitati', async (req, res) => {
  try {
    const status = req.query.status || 'IN_VERIFICARE';
    const conturi = await prisma.user.findMany({
      where: { identitateStatus: status },
      include: { documenteIdentitate: { orderBy: { createdAt: 'asc' } } },
      orderBy: { identitateTrimisaLa: 'asc' },
      take: 200,
    });
    res.json(conturi.map(u => ({
      ...serializeUserAdmin(u),
      documente: u.documenteIdentitate.map(d => ({ _id: d.id, tip: d.tip, numeOriginal: d.numeOriginal, mime: d.mime, marime: d.marime })),
    })));
  } catch (err) {
    console.error('[admin GET /identitati]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea cererilor de confirmare.' });
  }
});

// Decizia adminului: documentele se șterg imediat, rămâne doar rezultatul.
async function decideIdentitate(req, res, confirmata) {
  try {
    const motiv = (req.body?.motiv || '').trim().slice(0, 1000);
    if (!confirmata && !motiv) return res.status(400).json({ mesaj: 'Scrie motivul respingerii, ca firma să știe ce să corecteze.' });

    const u = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!u) return res.status(404).json({ mesaj: 'Utilizatorul nu există.' });
    if (u.identitateStatus !== 'IN_VERIFICARE') return res.status(400).json({ mesaj: 'Contul nu are o cerere de confirmare în verificare.' });

    await stergeDocumenteleContului(u.id, req.utilizator);
    const actualizat = await prisma.user.update({
      where: { id: u.id },
      data: {
        identitateStatus: confirmata ? 'CONFIRMATA' : 'RESPINSA',
        identitateConfirmataLa: confirmata ? new Date() : null,
        identitateConfirmataDe: req.utilizator.nume,
        identitateMotivRespingere: confirmata ? '' : motiv,
      },
    });

    creeazaNotificare({
      userId: u.id,
      tip: 'alerta',
      link: 'profil',
      titlu: confirmata ? 'Identitatea firmei a fost confirmată' : 'Confirmarea identității a fost respinsă',
      mesaj: confirmata
        ? 'Profilul tău afișează acum „Identitate confirmată”.'
        : `Motiv: ${motiv}. Poți trimite din nou documentele din profil.`,
    });

    res.json(serializeUserAdmin(actualizat));
  } catch (err) {
    console.error('[admin identitati decizie]', err);
    res.status(500).json({ mesaj: 'Eroare la salvarea deciziei.' });
  }
}

router.post('/identitati/:id/confirma', (req, res) => decideIdentitate(req, res, true));
router.post('/identitati/:id/respinge', (req, res) => decideIdentitate(req, res, false));

// ═══ Ștergere ══════════════════════════════════════════════════════════════

// ─── GET /api/admin/utilizatori/:id/continut ───────────────────────────────
// Tot ce a publicat un utilizator, ca adminul să poată șterge bucăți separate.
router.get('/utilizatori/:id/continut', async (req, res) => {
  try {
    const id = req.params.id;
    const [proiecte, oferte, cereri, oferteMateriale, lucrari, recomandari, evaluariPrimite, evaluariDate, clarificari, comenzi] = await Promise.all([
      prisma.project.findMany({ where: { dezvoltatorId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.oferta.findMany({ where: { subcontractorId: id }, include: { proiect: { select: { titlu: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.cerereMateriale.findMany({ where: { creatDeId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.ofertaMateriale.findMany({ where: { furnizorId: id }, include: { cerere: { select: { titlu: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.lucrare.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.recomandare.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.evaluare.findMany({ where: { evaluatId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.evaluare.findMany({ where: { evaluatorId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.clarificare.findMany({ where: { autorId: id }, include: { proiect: { select: { titlu: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.comandaCatalog.findMany({ where: { OR: [{ cumparatorId: id }, { furnizorId: id }] }, orderBy: { createdAt: 'desc' } }),
    ]);

    const element = (tip, x, titlu, detalii) => ({ tip, _id: x.id, titlu, detalii, createdAt: x.createdAt });
    res.json([
      ...proiecte.map(p => element('proiect', p, p.titlu, `${p.locatie} · ${p.buget}${p.suspendat ? ' · suspendat' : ''}`)),
      ...oferte.map(o => element('oferta', o, `Ofertă la „${o.proiect?.titlu || '—'}”`, `${o.valoare} ${o.moneda} · ${o.status}`)),
      ...cereri.map(c => element('cerere', c, c.titlu, `${c.judet} · ${c.status}${c.suspendat ? ' · suspendată' : ''}`)),
      ...oferteMateriale.map(o => element('oferta-materiale', o, `Ofertă materiale la „${o.cerere?.titlu || '—'}”`, `livrare ${o.termenLivrare} zile`)),
      ...lucrari.map(l => element('lucrare', l, l.titlu, l.pret != null ? `${l.pret} RON / ${l.unitateMasura || 'buc'}` : (l.categorie || 'lucrare în portofoliu'))),
      ...recomandari.map(r => element('recomandare', r, `Recomandare: ${r.categorie}`, r.descriere.slice(0, 80))),
      ...evaluariPrimite.map(e => element('evaluare', e, `Evaluare primită: ${e.scor}/5`, e.comentariu.slice(0, 80))),
      ...evaluariDate.map(e => element('evaluare', e, `Evaluare dată: ${e.scor}/5`, e.comentariu.slice(0, 80))),
      ...clarificari.map(c => element('clarificare', c, `Întrebare la „${c.proiect?.titlu || '—'}”`, c.intrebare.slice(0, 80))),
      ...comenzi.map(c => element('comanda', c, `Comandă: ${c.denumireProdus}`, `${c.cantitate} ${c.unitateMasura} · ${c.status}`)),
    ]);
  } catch (err) {
    console.error('[admin GET /utilizatori/:id/continut]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea conținutului.' });
  }
});

// ─── DELETE /api/admin/continut/:tip/:id ───────────────────────────────────
// Ștergere definitivă a unui singur element. Ce depinde de el (oferte pe un
// proiect, articole pe o cerere etc.) se șterge în cascadă, conform schemei.
const STERGERE = {
  proiect: (id) => prisma.project.delete({ where: { id } }),
  oferta: (id) => prisma.oferta.delete({ where: { id } }),
  cerere: (id) => prisma.cerereMateriale.delete({ where: { id } }),
  'oferta-materiale': (id) => prisma.ofertaMateriale.delete({ where: { id } }),
  lucrare: (id) => prisma.lucrare.delete({ where: { id } }),
  recomandare: (id) => prisma.recomandare.delete({ where: { id } }),
  clarificare: (id) => prisma.clarificare.delete({ where: { id } }),
  comanda: (id) => prisma.comandaCatalog.delete({ where: { id } }),
  // Ratingul firmei evaluate e stocat agregat, deci îl recalculăm.
  evaluare: (id) => prisma.$transaction(async (tx) => {
    const e = await tx.evaluare.delete({ where: { id } });
    await recalculeazaRating(tx, e.evaluatId);
  }),
};

router.delete('/continut/:tip/:id', async (req, res) => {
  const sterge = STERGERE[req.params.tip];
  if (!sterge) return res.status(400).json({ mesaj: 'Tip de conținut necunoscut.' });
  try {
    await sterge(req.params.id);
    res.json({ mesaj: 'Șters definitiv.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ mesaj: 'Elementul nu mai există.' });
    console.error(`[admin DELETE /continut/${req.params.tip}/:id]`, err);
    res.status(500).json({ mesaj: 'Eroare la ștergere.' });
  }
});

// ─── DELETE /api/admin/utilizatori/:id ─────────────────────────────────────
// Ștergere definitivă a contului și a tot ce a publicat. Unele legături nu
// se șterg singure în cascadă (proiecte, oferte, oferte de materiale,
// comenzi primite), așa că le ștergem explicit, în ordine, într-o tranzacție.
router.delete('/utilizatori/:id', async (req, res) => {
  const id = req.params.id;
  if (id === req.utilizator.id) {
    return res.status(400).json({ mesaj: 'Nu îți poți șterge propriul cont.' });
  }
  try {
    // Documentele de identitate de pe disc nu dispar odată cu rândurile din
    // baza de date, deci le ștergem explicit înainte.
    await stergeDocumenteleContului(id, req.utilizator);

    await prisma.$transaction(async (tx) => {
      await tx.project.updateMany({ where: { castigatorId: id }, data: { castigatorId: null } });
      await tx.oferta.deleteMany({ where: { subcontractorId: id } });
      await tx.ofertaMateriale.deleteMany({ where: { furnizorId: id } });
      await tx.comandaCatalog.deleteMany({ where: { furnizorId: id } });
      await tx.project.deleteMany({ where: { dezvoltatorId: id } });

      // Ratingul firmelor evaluate de acest cont rămâne valid: evaluările
      // date de el rămân, doar fără autor (onDelete: SetNull).
      await tx.user.delete({ where: { id } });
    });
    res.json({ mesaj: 'Cont șters definitiv.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ mesaj: 'Utilizatorul nu există.' });
    console.error('[admin DELETE /utilizatori/:id]', err);
    res.status(500).json({ mesaj: 'Eroare la ștergerea contului.' });
  }
});

module.exports = router;