const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat, doarRol } = require('../middleware/auth');
const { serializeOferta, serializeProject, serializeUserContact, serializeEvaluare } = require('../lib/serialize');
const { notificaOfertaNoua, notificaOfertaDepasita, notificaOfertaStaticaAcceptata, notificaOfertaStaticaRespinsa } = require('../lib/mailer');
const { creeazaNotificare } = require('../lib/notificari');
const { genereazaContractPdf } = require('../lib/pdf');
const { recalculeazaRating } = require('../lib/rating');

const SUBCONTRACTOR_INCLUDE = { lucrari: true, disponibilitati: true };

class ErrValidare extends Error {}

// ─── GET /api/oferte/proiect/:proiectId ───────────────────────────────────────
router.get('/proiect/:proiectId', protejat, async (req, res) => {
  try {
    const proiect = await prisma.project.findUnique({ where: { id: req.params.proiectId } });
    if (!proiect) return res.status(404).json({ mesaj: 'Proiectul nu exista.' });

    const esteDezvoltatorulProiectului = proiect.dezvoltatorId === req.utilizator.id;

    if (!esteDezvoltatorulProiectului && proiect.tipOfertare !== 'dinamica') {
      return res.status(403).json({ mesaj: 'Nu ai acces la ofertele acestui proiect.' });
    }

    const where = { proiectId: req.params.proiectId };
    if (proiect.tipOfertare === 'dinamica' && req.query.toate !== 'true') {
      where.activa = true;
    }

    const oferte = await prisma.oferta.findMany({
      where,
      include: { subcontractor: { include: SUBCONTRACTOR_INCLUDE } },
      orderBy: [{ valoare: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ oferte: oferte.map(serializeOferta), proiect: serializeProject(proiect) });
  } catch (err) {
    console.error('[oferte GET /proiect/:proiectId]', err);
    res.status(500).json({ mesaj: 'Eroare la incarcarea ofertelor.' });
  }
});

// ─── GET /api/oferte/ale-mele ──────────────────────────────────────────────────
router.get('/ale-mele', protejat, doarRol('SUBCONTRACTOR'), async (req, res) => {
  try {
    const oferte = await prisma.oferta.findMany({
      where: { subcontractorId: req.utilizator.id },
      include: {
        proiect: { include: { dezvoltator: { select: { id: true, nume: true, judet: true, cui: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(oferte.map(serializeOferta));
  } catch (err) {
    console.error('[oferte GET /ale-mele]', err);
    res.status(500).json({ mesaj: 'Eroare la incarcarea ofertelor tale.' });
  }
});

// ─── POST /api/oferte ──────────────────────────────────────────────────────────
router.post('/', protejat, doarRol('SUBCONTRACTOR'), async (req, res) => {
  try {
    const { proiect: proiectId, valoare, moneda, descriere, termenExecutie, documente } = req.body;

    if (!proiectId || valoare === undefined || valoare === null || !termenExecutie) {
      return res.status(400).json({ mesaj: 'Campurile proiect, valoare si termenExecutie sunt obligatorii.' });
    }

    const valoareNum = Number(valoare);
    if (Number.isNaN(valoareNum) || valoareNum <= 0) {
      return res.status(400).json({ mesaj: 'Valoarea ofertei trebuie sa fie un numar pozitiv.' });
    }

    const proiectExista = await prisma.project.findUnique({ where: { id: proiectId } });
    if (!proiectExista) {
      return res.status(404).json({ mesaj: 'Proiectul nu exista.' });
    }

    if (proiectExista.tipOfertare === 'dinamica') {
      if (proiectExista.licitatieFinalizata) {
        return res.status(400).json({ mesaj: 'Licitatia s-a incheiat deja.' });
      }
      const acum = Date.now();
      const start = proiectExista.licitatieStart ? new Date(proiectExista.licitatieStart).getTime() : null;
      const end = proiectExista.licitatieEnd ? new Date(proiectExista.licitatieEnd).getTime() : null;

      if (start && acum < start) {
        return res.status(400).json({ mesaj: 'Licitatia nu a inceput inca.' });
      }
      if (end && acum >= end) {
        return res.status(400).json({ mesaj: 'Timpul licitatiei a expirat.' });
      }

      // Transacție: citim starea curentă a licitației și scriem noua ofertă
      // atomic, ca doi subcontractori care ofertează simultan să nu poată
      // amândoi "trece" validarea cu aceeași valoare (condiție de cursă).
      let ofertaNoua;
      let ofertaAntDeposedata = null;
      try {
        ofertaNoua = await prisma.$transaction(async (tx) => {
          const ofertaProprieActiva = await tx.oferta.findFirst({
            where: { proiectId, subcontractorId: req.utilizator.id, activa: true },
          });
          if (ofertaProprieActiva && valoareNum >= ofertaProprieActiva.valoare) {
            throw new ErrValidare(`Noua oferta trebuie sa fie mai mica decat oferta ta curenta (${ofertaProprieActiva.valoare} ${ofertaProprieActiva.moneda}).`);
          }

          const ceaMaiMicaOfertaActiva = await tx.oferta.findFirst({
            where: { proiectId, activa: true },
            orderBy: { valoare: 'asc' },
            include: { subcontractor: true },
          });
          if (ceaMaiMicaOfertaActiva && valoareNum >= ceaMaiMicaOfertaActiva.valoare) {
            throw new ErrValidare(`Oferta ta trebuie sa fie mai mica decat cea mai buna oferta curenta (${ceaMaiMicaOfertaActiva.valoare} ${ceaMaiMicaOfertaActiva.moneda}).`);
          }

          // Dacă cel depășit e alt subcontractor (nu cel care ofertează acum),
          // îl notificăm după ce tranzacția se încheie cu succes.
          if (ceaMaiMicaOfertaActiva && ceaMaiMicaOfertaActiva.subcontractorId !== req.utilizator.id) {
            ofertaAntDeposedata = ceaMaiMicaOfertaActiva;
          }

          if (ofertaProprieActiva) {
            await tx.oferta.update({ where: { id: ofertaProprieActiva.id }, data: { activa: false } });
          }

          return tx.oferta.create({
            data: {
              proiectId,
              subcontractorId: req.utilizator.id,
              valoare: valoareNum,
              moneda: moneda || 'RON',
              descriere: descriere || '',
              termenExecutie: Number(termenExecutie),
              documente: documente || [],
              activa: true,
              status: 'in_asteptare',
            },
            include: { subcontractor: { include: SUBCONTRACTOR_INCLUDE } },
          });
        }, { isolationLevel: 'Serializable' });
      } catch (e) {
        if (e instanceof ErrValidare) return res.status(400).json({ mesaj: e.message });
        throw e;
      }

      const dezvoltatorProiect = await prisma.user.findUnique({ where: { id: proiectExista.dezvoltatorId } });
      notificaOfertaNoua({ dezvoltator: dezvoltatorProiect, proiect: proiectExista, oferta: ofertaNoua, subcontractorNume: ofertaNoua.subcontractor.nume });
      creeazaNotificare({
        userId: dezvoltatorProiect.id,
        tip: 'oferta',
        titlu: `Ai primit o ofertă de ${Number(ofertaNoua.valoare).toLocaleString()} ${ofertaNoua.moneda} de la "${ofertaNoua.subcontractor.nume}"`,
        mesaj: `Proiect: ${proiectExista.titlu}`,
        proiectId: proiectExista.id,
        ofertaId: ofertaNoua.id,
      });
      if (ofertaAntDeposedata) {
        notificaOfertaDepasita({ subcontractor: ofertaAntDeposedata.subcontractor, proiect: proiectExista, valoareNoua: ofertaNoua.valoare, moneda: ofertaNoua.moneda });
        creeazaNotificare({
          userId: ofertaAntDeposedata.subcontractorId,
          tip: 'alerta',
          titlu: `Ai fost depășit la licitația pentru "${proiectExista.titlu}"`,
          mesaj: `Noua ofertă cea mai mică: ${Number(ofertaNoua.valoare).toLocaleString()} ${ofertaNoua.moneda}`,
          proiectId: proiectExista.id,
        });
      }

      try {
        const { getIO } = require('../sockets');
        getIO().to(`proiect_${proiectId}`).emit('oferta_noua', { oferta: serializeOferta(ofertaNoua) });
      } catch (e) { /* socket indisponibil - ignoram */ }

      return res.status(201).json(serializeOferta(ofertaNoua));
    }

    // ── Ofertare STATICĂ: o singură ofertă per subcontractor ──
    if (!proiectExista.activ) {
      return res.status(404).json({ mesaj: 'Proiectul nu mai este activ.' });
    }
    if (!descriere) {
      return res.status(400).json({ mesaj: 'Campul descriere este obligatoriu pentru ofertare statica.' });
    }

    const existenta = await prisma.oferta.findFirst({ where: { proiectId, subcontractorId: req.utilizator.id } });
    if (existenta) {
      return res.status(409).json({ mesaj: 'Ai depus deja o oferta pentru acest proiect.' });
    }

    const oferta = await prisma.oferta.create({
      data: {
        proiectId,
        subcontractorId: req.utilizator.id,
        valoare: valoareNum,
        moneda: moneda || 'RON',
        descriere,
        termenExecutie: Number(termenExecutie),
        documente: documente || [],
      },
      include: { subcontractor: { include: SUBCONTRACTOR_INCLUDE } },
    });

    const dezvoltatorProiectStatic = await prisma.user.findUnique({ where: { id: proiectExista.dezvoltatorId } });
    notificaOfertaNoua({ dezvoltator: dezvoltatorProiectStatic, proiect: proiectExista, oferta, subcontractorNume: oferta.subcontractor.nume });
    creeazaNotificare({
      userId: dezvoltatorProiectStatic.id,
      tip: 'oferta',
      titlu: `Ai primit o ofertă de ${Number(oferta.valoare).toLocaleString()} ${oferta.moneda} de la "${oferta.subcontractor.nume}"`,
      mesaj: `Proiect: ${proiectExista.titlu}`,
      proiectId: proiectExista.id,
      ofertaId: oferta.id,
    });

    try {
      const { getIO } = require('../sockets');
      getIO().to(`proiect_${proiectId}`).emit('oferta_noua', { oferta: serializeOferta(oferta) });
    } catch (e) { /* ignoram */ }

    res.status(201).json(serializeOferta(oferta));
  } catch (err) {
    console.error('[oferte POST /]', err);
    res.status(500).json({ mesaj: 'Eroare la depunerea ofertei.' });
  }
});

// ─── PUT /api/oferte/:id/status ────────────────────────────────────────────────
router.put('/:id/status', protejat, doarRol('DEZVOLTATOR'), async (req, res) => {
  try {
    const { status } = req.body;
    const permise = ['in_asteptare', 'acceptata', 'respinsa', 'in_negociere'];
    if (!permise.includes(status)) {
      return res.status(400).json({ mesaj: 'Status invalid.' });
    }

    const oferta = await prisma.oferta.findUnique({ where: { id: req.params.id }, include: { proiect: true } });
    if (!oferta) return res.status(404).json({ mesaj: 'Oferta nu exista.' });
    if (oferta.proiect.dezvoltatorId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea sa modifici aceasta oferta.' });
    }
    if (oferta.proiect.tipOfertare === 'dinamica') {
      return res.status(400).json({ mesaj: 'Pentru licitatie dinamica, castigatorul este ales automat la finalul licitatiei.' });
    }

    // Colectăm ofertele care vor deveni "respinse" (dacă asta e acceptată)
    // ÎNAINTE de tranzacție, ca să avem datele subcontractorilor pt. email.
    const ofertePentruRespingere = status === 'acceptata'
      ? await prisma.oferta.findMany({
          where: { proiectId: oferta.proiectId, id: { not: oferta.id }, status: 'in_asteptare' },
          include: { subcontractor: true },
        })
      : [];

    const [ofertaActualizata] = await prisma.$transaction(async (tx) => {
      const upd = await tx.oferta.update({ where: { id: oferta.id }, data: { status }, include: { subcontractor: true } });

      if (status === 'acceptata') {
        await tx.project.update({
          where: { id: oferta.proiectId },
          data: { activ: false, castigatorId: oferta.subcontractorId, ofertaCastigatoareId: oferta.id, licitatieFinalizata: true },
        });
        await tx.oferta.updateMany({
          where: { proiectId: oferta.proiectId, id: { not: oferta.id }, status: 'in_asteptare' },
          data: { status: 'respinsa' },
        });
      }

      return [upd];
    });

    if (status === 'acceptata') {
      const proiect = await prisma.project.findUnique({ where: { id: oferta.proiectId } });

      notificaOfertaStaticaAcceptata({ subcontractor: ofertaActualizata.subcontractor, proiect, oferta: ofertaActualizata });
      creeazaNotificare({
        userId: ofertaActualizata.subcontractorId,
        tip: 'castigat',
        titlu: `Oferta ta pentru "${proiect.titlu}" a fost acceptată!`,
        mesaj: `Valoare: ${Number(ofertaActualizata.valoare).toLocaleString()} ${ofertaActualizata.moneda}`,
        proiectId: proiect.id,
        ofertaId: ofertaActualizata.id,
      });
      ofertePentruRespingere.forEach(o => {
        notificaOfertaStaticaRespinsa({ subcontractor: o.subcontractor, proiect });
        creeazaNotificare({
          userId: o.subcontractorId,
          tip: 'alerta',
          titlu: `Oferta ta pentru "${proiect.titlu}" a fost respinsă`,
          mesaj: `Un alt subcontractor a fost ales pentru acest proiect.`,
          proiectId: proiect.id,
          ofertaId: o.id,
        });
      });

      try {
        const { getIO } = require('../sockets');
        getIO().to(`proiect_${oferta.proiectId}`).emit('proiect_finalizat_static', {
          proiect: serializeProject(proiect),
          ofertaCastigatoare: serializeOferta(ofertaActualizata),
        });
      } catch (e) { /* ignoram */ }
    }

    res.json(serializeOferta(ofertaActualizata));
  } catch (err) {
    console.error('[oferte PUT /:id/status]', err);
    res.status(500).json({ mesaj: 'Eroare la actualizarea statusului.' });
  }
});

// ─── GET /api/oferte/:id/contact ────────────────────────────────────────────────
router.get('/:id/contact', protejat, async (req, res) => {
  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: req.params.id },
      include: { proiect: { include: { dezvoltator: true } }, subcontractor: true },
    });
    if (!oferta) return res.status(404).json({ mesaj: 'Oferta nu exista.' });

    const aCastigat = oferta.status === 'acceptata' || oferta.status === 'castigatoare';
    if (!aCastigat) {
      return res.status(403).json({ mesaj: 'Datele de contact se dezvăluie doar după câștigarea ofertei.' });
    }

    const idUtilizator = req.utilizator.id;
    const esteDezvoltatorulProiectului = oferta.proiect.dezvoltatorId === idUtilizator;
    const esteSubcontractorulCastigator = oferta.subcontractorId === idUtilizator;

    if (!esteDezvoltatorulProiectului && !esteSubcontractorulCastigator) {
      return res.status(403).json({ mesaj: 'Nu ai acces la aceste date de contact.' });
    }

    res.json({
      dezvoltator: serializeUserContact(oferta.proiect.dezvoltator),
      subcontractor: serializeUserContact(oferta.subcontractor),
    });
  } catch (err) {
    console.error('[oferte GET /:id/contact]', err);
    res.status(500).json({ mesaj: 'Eroare la preluarea datelor de contact.' });
  }
});

// ─── GET /api/oferte/:id/contract-pdf ────────────────────────────────────────
// Descarcă un PDF cu rezumatul ofertei câștigătoare — disponibil doar
// dezvoltatorului proiectului și subcontractorului câștigător (aceeași
// regulă de acces ca la /:id/contact).
router.get('/:id/contract-pdf', protejat, async (req, res) => {
  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: req.params.id },
      include: { proiect: { include: { dezvoltator: true } }, subcontractor: true },
    });
    if (!oferta) return res.status(404).json({ mesaj: 'Oferta nu exista.' });

    const aCastigat = oferta.status === 'acceptata' || oferta.status === 'castigatoare';
    if (!aCastigat) {
      return res.status(403).json({ mesaj: 'PDF-ul de contract e disponibil doar pentru ofertele câștigătoare.' });
    }

    const idUtilizator = req.utilizator.id;
    const esteDezvoltatorulProiectului = oferta.proiect.dezvoltatorId === idUtilizator;
    const esteSubcontractorulCastigator = oferta.subcontractorId === idUtilizator;
    if (!esteDezvoltatorulProiectului && !esteSubcontractorulCastigator) {
      return res.status(403).json({ mesaj: 'Nu ai acces la acest document.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${oferta.id}.pdf"`);

    const doc = genereazaContractPdf({
      proiect: oferta.proiect,
      oferta,
      dezvoltator: oferta.proiect.dezvoltator,
      subcontractor: oferta.subcontractor,
    });
    doc.pipe(res);
  } catch (err) {
    console.error('[oferte GET /:id/contract-pdf]', err);
    res.status(500).json({ mesaj: 'Eroare la generarea PDF-ului.' });
  }
});

// ─── POST /api/oferte/:id/evaluare ──────────────────────────────────────────
// Dezvoltatorul proiectului lasă o evaluare (1-5 stele + comentariu opțional)
// subcontractorului, DUPĂ ce oferta a fost acceptată/câștigătoare. O singură
// evaluare per ofertă.
router.post('/:id/evaluare', protejat, doarRol('DEZVOLTATOR'), async (req, res) => {
  try {
    const { scor, comentariu } = req.body;
    const scorNum = Number(scor);
    if (!Number.isInteger(scorNum) || scorNum < 1 || scorNum > 5) {
      return res.status(400).json({ mesaj: 'Scorul trebuie să fie un număr întreg între 1 și 5.' });
    }

    const oferta = await prisma.oferta.findUnique({ where: { id: req.params.id }, include: { proiect: true } });
    if (!oferta) return res.status(404).json({ mesaj: 'Oferta nu exista.' });
    if (oferta.proiect.dezvoltatorId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea sa evaluezi aceasta oferta.' });
    }
    const aCastigat = oferta.status === 'acceptata' || oferta.status === 'castigatoare';
    if (!aCastigat) {
      return res.status(400).json({ mesaj: 'Poți evalua doar ofertele acceptate/câștigătoare.' });
    }

    const existenta = await prisma.evaluare.findUnique({ where: { ofertaId: oferta.id } });
    if (existenta) {
      return res.status(409).json({ mesaj: 'Ai evaluat deja această ofertă.' });
    }

    const evaluare = await prisma.$transaction(async (tx) => {
      const noua = await tx.evaluare.create({
        data: {
          scor: scorNum,
          comentariu: (comentariu || '').trim().slice(0, 500),
          proiectTitlu: oferta.proiect.titlu,
          evaluatorNume: req.utilizator.nume,
          ofertaId: oferta.id,
          proiectId: oferta.proiectId,
          evaluatorId: req.utilizator.id,
          evaluatId: oferta.subcontractorId,
        },
      });
      await recalculeazaRating(tx, oferta.subcontractorId);
      return noua;
    });

    creeazaNotificare({
      userId: oferta.subcontractorId,
      tip: 'alerta',
      titlu: `Ai primit o evaluare de ${scorNum}★ pentru "${oferta.proiect.titlu}"`,
      mesaj: comentariu ? comentariu.slice(0, 140) : 'Vezi evaluarea în profilul tău.',
      proiectId: oferta.proiectId,
      ofertaId: oferta.id,
    });

    res.status(201).json(serializeEvaluare(evaluare));
  } catch (err) {
    console.error('[oferte POST /:id/evaluare]', err);
    res.status(500).json({ mesaj: 'Eroare la salvarea evaluării.' });
  }
});

// ─── GET /api/oferte/:id/evaluare ───────────────────────────────────────────
// Verifică dacă o ofertă a fost deja evaluată (folosit ca să nu arătăm din nou
// formularul de evaluare dezvoltatorului care a evaluat deja).
router.get('/:id/evaluare', protejat, async (req, res) => {
  try {
    const evaluare = await prisma.evaluare.findUnique({ where: { ofertaId: req.params.id } });
    res.json({ evaluare: evaluare ? serializeEvaluare(evaluare) : null });
  } catch (err) {
    console.error('[oferte GET /:id/evaluare]', err);
    res.status(500).json({ mesaj: 'Eroare la verificarea evaluării.' });
  }
});

// ─── DELETE /api/oferte/:id ─────────────────────────────────────────────────────
router.delete('/:id', protejat, doarRol('SUBCONTRACTOR'), async (req, res) => {
  try {
    const oferta = await prisma.oferta.findUnique({ where: { id: req.params.id } });
    if (!oferta) return res.status(404).json({ mesaj: 'Oferta nu exista.' });
    if (oferta.subcontractorId !== req.utilizator.id) {
      return res.status(403).json({ mesaj: 'Nu ai permisiunea sa retragi aceasta oferta.' });
    }
    if (oferta.status !== 'in_asteptare') {
      return res.status(400).json({ mesaj: 'Poti retrage doar ofertele in asteptare.' });
    }
    await prisma.oferta.delete({ where: { id: req.params.id } });
    res.json({ mesaj: 'Oferta retrasa cu succes.' });
  } catch (err) {
    console.error('[oferte DELETE /:id]', err);
    res.status(500).json({ mesaj: 'Eroare la retragerea ofertei.' });
  }
});

module.exports = router;
