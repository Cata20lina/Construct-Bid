const prisma = require('../lib/prisma');
const { serializeProject, serializeOferta } = require('../lib/serialize');
const { notificaLicitatieFinalizataCastigator, notificaLicitatieFinalizataPierduta } = require('../lib/mailer');
const { creeazaNotificare } = require('../lib/notificari');

// Ținem evidența timer-elor active per proiect, ca să nu programăm de două ori
// același proiect (de exemplu la restart de server + apel manual).
const timereActive = new Map();

/**
 * Determină și salvează câștigătorul unei licitații dinamice:
 * cea mai mică ofertă ACTIVĂ (ultima depusă de fiecare subcontractor) câștigă automat.
 * Marchează proiectul ca finalizat și actualizează statusurile ofertelor.
 */
async function finalizeazaLicitatie(proiectId) {
  const proiect = await prisma.project.findUnique({ where: { id: proiectId } });
  if (!proiect) return null;
  if (proiect.tipOfertare !== 'dinamica') return null;
  if (proiect.licitatieFinalizata) return proiect; // deja finalizat, evităm dubla procesare

  let ofertaCastigatoare = null;

  // Toți ofertanții activi, capturați ÎNAINTE de tranzacție, ca să avem
  // datele lor (email) pentru notificările de câștig/pierdere de mai jos.
  const oferteActiveOriginale = await prisma.oferta.findMany({
    where: { proiectId, activa: true },
    include: { subcontractor: true },
    orderBy: { valoare: 'asc' },
  });

  await prisma.$transaction(async (tx) => {
    const oferteActive = await tx.oferta.findMany({
      where: { proiectId, activa: true },
      orderBy: { valoare: 'asc' },
    });

    if (oferteActive.length > 0) {
      ofertaCastigatoare = await tx.oferta.update({
        where: { id: oferteActive[0].id },
        data: { status: 'castigatoare' },
      });

      await tx.oferta.updateMany({
        where: { proiectId, activa: true, id: { not: ofertaCastigatoare.id } },
        data: { status: 'depasita' },
      });
    }

    await tx.project.update({
      where: { id: proiectId },
      data: {
        licitatieFinalizata: true,
        activ: false,
        castigatorId: ofertaCastigatoare ? ofertaCastigatoare.subcontractorId : null,
        ofertaCastigatoareId: ofertaCastigatoare ? ofertaCastigatoare.id : null,
      },
    });
  });

  timereActive.delete(String(proiectId));

  if (oferteActiveOriginale.length > 0) {
    const castigatoareId = ofertaCastigatoare ? ofertaCastigatoare.id : null;
    oferteActiveOriginale.forEach(o => {
      if (o.id === castigatoareId) {
        notificaLicitatieFinalizataCastigator({ subcontractor: o.subcontractor, proiect, oferta: o });
        creeazaNotificare({
          userId: o.subcontractorId,
          tip: 'castigat',
          titlu: `Ai câștigat licitația pentru "${proiect.titlu}"!`,
          mesaj: `Ofertă câștigătoare: ${Number(o.valoare).toLocaleString()} ${o.moneda}`,
          proiectId: proiect.id,
          ofertaId: o.id,
        });
      } else {
        notificaLicitatieFinalizataPierduta({ subcontractor: o.subcontractor, proiect });
        creeazaNotificare({
          userId: o.subcontractorId,
          tip: 'alerta',
          titlu: `Licitația pentru "${proiect.titlu}" s-a încheiat`,
          mesaj: 'Din păcate oferta ta nu a fost câștigătoare de data asta.',
          proiectId: proiect.id,
          ofertaId: o.id,
        });
      }
    });

    creeazaNotificare({
      userId: proiect.dezvoltatorId,
      tip: 'proiect',
      titlu: `Licitația pentru "${proiect.titlu}" s-a finalizat`,
      mesaj: castigatoareId
        ? `Câștigător: oferta de ${Number(ofertaCastigatoare.valoare).toLocaleString()} ${ofertaCastigatoare.moneda}.`
        : 'Nu a fost depusă nicio ofertă activă.',
      proiectId: proiect.id,
    });
  }

  try {
    const { getIO } = require('../sockets');
    const io = getIO();
    const proiectPopulat = await prisma.project.findUnique({
      where: { id: proiectId },
      include: {
        dezvoltator: { select: { id: true, nume: true, email: true, judet: true, telefon: true } },
        castigator: { select: { id: true, nume: true, email: true, telefon: true, judet: true, cui: true } },
      },
    });
    io.to(`proiect_${proiectId}`).emit('licitatie_finalizata', {
      proiect: serializeProject(proiectPopulat),
      ofertaCastigatoare: serializeOferta(ofertaCastigatoare),
    });
  } catch (e) {
    // io poate să nu fie inițializat în contexte de test — ignorăm silențios
  }

  return proiect;
}

/**
 * Programează finalizarea automată a licitației la momentul `licitatieEnd`.
 * Idempotent: dacă proiectul e deja finalizat sau nu e de tip dinamic, nu face nimic.
 */
function programeazaFinalizare(proiect) {
  if (!proiect || proiect.tipOfertare !== 'dinamica') return;
  if (proiect.licitatieFinalizata) return;
  if (!proiect.licitatieEnd) return;

  const id = String(proiect.id);
  if (timereActive.has(id)) {
    clearTimeout(timereActive.get(id));
  }

  const msRamase = new Date(proiect.licitatieEnd).getTime() - Date.now();

  if (msRamase <= 0) {
    finalizeazaLicitatie(id).catch(err => console.error('[licitatie] eroare finalizare imediata:', err));
    return;
  }

  const timer = setTimeout(() => {
    finalizeazaLicitatie(id).catch(err => console.error('[licitatie] eroare finalizare programata:', err));
  }, msRamase);

  timereActive.set(id, timer);
}

/**
 * La pornirea serverului, reprogramăm finalizarea pentru toate licitațiile
 * dinamice active/neînchise încă (asigură consistență după un restart).
 */
async function reporneșteTimerele() {
  const proiecte = await prisma.project.findMany({
    where: { tipOfertare: 'dinamica', licitatieFinalizata: false, licitatieEnd: { not: null } },
  });
  proiecte.forEach(programeazaFinalizare);
  console.log(`⏱️  ${proiecte.length} licitații dinamice reprogramate pentru finalizare automată.`);
}

module.exports = { finalizeazaLicitatie, programeazaFinalizare, reporneșteTimerele };
