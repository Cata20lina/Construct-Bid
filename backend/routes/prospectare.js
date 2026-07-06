const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat, doarRol } = require('../middleware/auth');
const { serializeProject } = require('../lib/serialize');

const MINI_SELECT = { id: true, nume: true, judet: true, cui: true };

// ─── GET /api/prospectare/oportunitati ─────────────────────────────────────────
// Doar pentru subcontractori: proiecte REALE (nu anunțuri de prospectare piață),
// active, pe care încă NU au ofertat — punctate după cât de bine se potrivesc
// cu profilul lor: categorii de servicii, județe acoperite, experiență reală
// din portofoliu, disponibilitate în timp și anvergura firmei vs bugetul proiectului.
router.get('/oportunitati', protejat, doarRol('SUBCONTRACTOR'), async (req, res) => {
  try {
    const user = req.utilizator;

    const oferteProprii = await prisma.oferta.findMany({
      where: { subcontractorId: user.id },
      select: { proiectId: true },
    });
    const proiecteOfertate = new Set(oferteProprii.map(o => o.proiectId));

    // Doar proiecte "adevărate" — anunțurile de prospectare piață au propria
    // secțiune dedicată (nu presupun o comandă fermă) și nu trebuie recomandate
    // aici ca oportunități de subcontractare.
    const proiecte = await prisma.project.findMany({
      where: { activ: true, esteProspectare: false },
      include: {
        dezvoltator: { select: MINI_SELECT },
        _count: { select: { oferte: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const candidate = proiecte.filter(p => !proiecteOfertate.has(p.id));

    const areProfilConfigurat = (user.categoriiServicii?.length > 0) || (user.judeteServicii?.length > 0);

    // ── Portofoliu real: câte lucrări anterioare are pe fiecare categorie ──
    // Semnal mai puternic decât simpla bifă din profil, pentru că e experiență dovedită.
    const lucrariPeCategorie = {};
    (user.lucrari || []).forEach(l => {
      if (!l.categorie) return;
      lucrariPeCategorie[l.categorie] = (lucrariPeCategorie[l.categorie] || 0) + 1;
    });

    // ── Disponibilitate declarată — intervale viitoare, folosite ca să vedem
    // dacă subcontractorul e liber în perioada estimată de execuție a proiectului. ──
    const acum = Date.now();
    const disponibilitati = (user.disponibilitati || [])
      .map(d => ({ start: new Date(d.start).getTime(), end: new Date(d.end).getTime() }))
      .filter(d => !Number.isNaN(d.start) && !Number.isNaN(d.end) && d.end >= acum);

    const rezultate = candidate.map(p => {
      let scor = 10; // punctaj de bază — orice proiect real, activ, nelicitat, e o oportunitate minimă
      const motive = [];

      // Categorie declarată în profil
      if (user.categoriiServicii?.includes(p.categorie)) {
        scor += 30;
        motive.push(`Categorie potrivită: ${p.categorie}`);
      }

      // Experiență REALĂ din portofoliu, pe aceeași categorie
      const nrLucrariCategorie = lucrariPeCategorie[p.categorie] || 0;
      if (nrLucrariCategorie > 0) {
        scor += Math.min(20, nrLucrariCategorie * 10);
        motive.push(`${nrLucrariCategorie} ${nrLucrariCategorie === 1 ? 'lucrare similară' : 'lucrări similare'} în portofoliul tău`);
      }

      // Județ acoperit (fie declarat explicit, fie sediul firmei)
      const judetPotrivit = user.judeteServicii?.includes(p.judet) || (p.judet && p.judet === user.judet);
      if (judetPotrivit) {
        scor += 20;
        motive.push(`Acoperă județul ${p.judet}`);
      }

      // Disponibilitate — se suprapune vreun interval liber declarat cu
      // fereastra estimată de execuție a proiectului (până la deadline, sau
      // "acum + zile execuție" dacă nu are deadline fix)?
      if (disponibilitati.length > 0) {
        const executieStart = acum;
        const executieEnd = p.deadline
          ? new Date(p.deadline).getTime()
          : acum + (p.zile || 30) * 24 * 3_600_000;
        const seSuprapunDisponibilitate = disponibilitati.some(d => d.start <= executieEnd && d.end >= executieStart);
        if (seSuprapunDisponibilitate) {
          scor += 10;
          motive.push('Se potrivește cu o perioadă de disponibilitate declarată');
        }
      }

      // Concurență redusă
      const nrOferte = p._count?.oferte || 0;
      if (nrOferte === 0) {
        scor += 15;
        motive.push('Fără nicio ofertă depusă încă');
      } else if (nrOferte <= 2) {
        scor += 8;
        motive.push(`Concurență redusă (${nrOferte} ${nrOferte === 1 ? 'ofertă' : 'oferte'})`);
      }

      if (p.urgent) {
        scor += 5;
        motive.push('Proiect urgent');
      }

      if (p.tipOfertare === 'dinamica' && p.licitatieEnd && !p.licitatieFinalizata) {
        const oreRamase = (new Date(p.licitatieEnd).getTime() - acum) / 3_600_000;
        if (oreRamase > 0 && oreRamase < 48) {
          scor += 5;
          motive.push('Licitație aproape de final — decide repede');
        }
      }

      // Anvergura firmei (ani experiență / nr. angajați) vs bugetul proiectului
      if (typeof p.bugetValoare === 'number' && p.bugetValoare > 0) {
        if (p.bugetValoare >= 100000 && (user.aniExperienta || 0) >= 5) {
          scor += 5;
          motive.push('Experiența ta se potrivește cu un proiect de anvergură mare');
        } else if (p.bugetValoare < 30000 && user.nrAngajati > 0 && user.nrAngajati <= 5) {
          scor += 3;
          motive.push('Potrivit ca dimensiune pentru echipa ta');
        }
      }

      return {
        proiect: serializeProject(p),
        scorPotrivire: Math.min(scor, 100),
        motive,
        nrOferteActuale: nrOferte,
      };
    });

    // Dacă profilul e configurat, arătăm doar oportunitățile cu potrivire reală
    // (categorie, portofoliu sau județ); altfel arătăm tot, sortat după cele mai "libere".
    const filtrate = areProfilConfigurat
      ? rezultate.filter(r => r.scorPotrivire > 10)
      : rezultate;

    filtrate.sort((a, b) => b.scorPotrivire - a.scorPotrivire);

    res.json({
      profilConfigurat: areProfilConfigurat,
      oportunitati: filtrate.slice(0, 50),
    });
  } catch (err) {
    console.error('[prospectare GET /oportunitati]', err);
    res.status(500).json({ mesaj: 'Eroare la calcularea oportunităților.' });
  }
});

// ─── GET /api/prospectare/piata ────────────────────────────────────────────────
// Pentru orice utilizator autentificat: statistici agregate despre piață —
// cerere și concurență pe categorie/județ, valori medii, tendință lunară.
router.get('/piata', protejat, async (req, res) => {
  try {
    const proiecte = await prisma.project.findMany({
      select: {
        id: true,
        categorie: true,
        judet: true,
        bugetValoare: true,
        activ: true,
        createdAt: true,
        _count: { select: { oferte: true } },
      },
    });

    const oferteCastigatoare = await prisma.oferta.findMany({
      where: { status: { in: ['acceptata', 'castigatoare'] } },
      select: {
        valoare: true,
        proiect: { select: { categorie: true } },
      },
    });

    // ── Agregare per categorie ──
    const categoriiMap = {};
    const getCategorie = (cheie) => {
      if (!categoriiMap[cheie]) {
        categoriiMap[cheie] = {
          categorie: cheie, proiecteActive: 0, proiecteTotal: 0,
          bugetSum: 0, bugetCount: 0, oferteSum: 0, castigSum: 0, castigCount: 0,
        };
      }
      return categoriiMap[cheie];
    };
    // ── Agregare per județ ──
    const judeteMap = {};
    const getJudet = (cheie) => {
      if (!judeteMap[cheie]) {
        judeteMap[cheie] = { judet: cheie, proiecteActive: 0, proiecteTotal: 0, bugetSum: 0, bugetCount: 0 };
      }
      return judeteMap[cheie];
    };

    for (const p of proiecte) {
      const c = getCategorie(p.categorie || 'Altele');
      c.proiecteTotal += 1;
      if (p.activ) c.proiecteActive += 1;
      if (typeof p.bugetValoare === 'number') { c.bugetSum += p.bugetValoare; c.bugetCount += 1; }
      c.oferteSum += p._count?.oferte || 0;

      if (p.judet) {
        const j = getJudet(p.judet);
        j.proiecteTotal += 1;
        if (p.activ) j.proiecteActive += 1;
        if (typeof p.bugetValoare === 'number') { j.bugetSum += p.bugetValoare; j.bugetCount += 1; }
      }
    }
    for (const o of oferteCastigatoare) {
      const cheie = o.proiect?.categorie || 'Altele';
      const c = getCategorie(cheie);
      c.castigSum += o.valoare;
      c.castigCount += 1;
    }

    const categorii = Object.values(categoriiMap).map(c => ({
      categorie: c.categorie,
      proiecteActive: c.proiecteActive,
      proiecteTotal: c.proiecteTotal,
      bugetMediu: c.bugetCount ? Math.round(c.bugetSum / c.bugetCount) : null,
      concurentaMedie: c.proiecteTotal ? +(c.oferteSum / c.proiecteTotal).toFixed(1) : 0,
      valoareMedieCastigatoare: c.castigCount ? Math.round(c.castigSum / c.castigCount) : null,
    })).sort((a, b) => b.proiecteActive - a.proiecteActive);

    const judete = Object.values(judeteMap).map(j => ({
      judet: j.judet,
      proiecteActive: j.proiecteActive,
      proiecteTotal: j.proiecteTotal,
      bugetMediu: j.bugetCount ? Math.round(j.bugetSum / j.bugetCount) : null,
    })).sort((a, b) => b.proiecteActive - a.proiecteActive).slice(0, 12);

    // ── Tendință lunară (ultimele 6 luni) ──
    const acum = new Date();
    const tendintaLunara = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(acum.getFullYear(), acum.getMonth() - i, 1);
      tendintaLunara.push({
        cheie: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        eticheta: d.toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' }),
        nrProiecte: 0,
      });
    }
    proiecte.forEach(p => {
      const d = new Date(p.createdAt);
      const cheie = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const slot = tendintaLunara.find(l => l.cheie === cheie);
      if (slot) slot.nrProiecte += 1;
    });

    // ── Categorii "de oportunitate": cerere activă mare, concurență mică ──
    const categoriiOportunitate = [...categorii]
      .filter(c => c.proiecteActive > 0)
      .sort((a, b) => (a.concurentaMedie - b.concurentaMedie) || (b.proiecteActive - a.proiecteActive))
      .slice(0, 3)
      .map(c => c.categorie);

    res.json({
      totalProiecteActive: proiecte.filter(p => p.activ).length,
      totalProiecte: proiecte.length,
      categorii,
      judete,
      tendintaLunara,
      categoriiOportunitate,
    });
  } catch (err) {
    console.error('[prospectare GET /piata]', err);
    res.status(500).json({ mesaj: 'Eroare la calcularea analizei de piață.' });
  }
});

module.exports = router;
