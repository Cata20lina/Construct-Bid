const prisma = require('./prisma');
const { PLANURI } = require('./planuriAbonament');

// ─── Costuri (în tokenuri) pentru acțiunile din platformă ───────────────────
const COSTURI = {
  POSTARE_ANUNT: 5,              // publicarea unui anunț normal (dezvoltator)
  POSTARE_ANUNT_PROSPECTARE: 3,  // publicarea unui anunț de "prospectare piață" (cost redus)
  RAPORT_PIATA: 8,       // generarea raportului detaliat de cerere/concurență
  OPORTUNITATI: 4,       // calcularea oportunităților personalizate (subcontractor)
};

// ─── Recompense (în tokenuri) acordate automat participanților la licitații ──
const RECOMPENSE = {
  OFERTA_DEPUSA: 2,        // orice ofertă nouă depusă de un subcontractor
  OFERTA_CASTIGATOARE: 15, // bonus când o ofertă e declarată câștigătoare
};

class EroareTokeniInsuficienti extends Error {
  constructor(necesar, disponibil) {
    super(`Tokenuri insuficiente: ai nevoie de ${necesar}, ai disponibil ${disponibil}.`);
    this.name = 'EroareTokeniInsuficienti';
    this.necesar = necesar;
    this.disponibil = disponibil;
  }
}

// ── Alocare lunară gratuită ──
// Dacă utilizatorul nu a mai primit tokenurile lunare ale planului său în
// luna calendaristică curentă, i le acordă acum (idempotent — verificat din
// nou în interiorul tranzacției, ca să evităm dubla alocare la cereri simultane).
// Returnează utilizatorul actualizat, sau `null` dacă nu era nevoie de alocare.
async function asigureTokenuriLunare(user) {
  if (!user) return null;
  const acum = new Date();
  const inAceeasiLuna = (data) => !!data
    && data.getFullYear() === acum.getFullYear()
    && data.getMonth() === acum.getMonth();

  if (inAceeasiLuna(user.ultimaAlocareTokenuri)) return null;

  return prisma.$transaction(async (tx) => {
    const proaspat = await tx.user.findUnique({ where: { id: user.id } });
    if (!proaspat || inAceeasiLuna(proaspat.ultimaAlocareTokenuri)) return null;

    const plan = PLANURI[proaspat.planAbonament] || PLANURI.GRATUIT;
    const nouSold = proaspat.tokenuri + plan.tokenuriLunare;

    const actualizat = await tx.user.update({
      where: { id: user.id },
      data: { tokenuri: nouSold, ultimaAlocareTokenuri: acum },
    });

    await tx.tranzactieToken.create({
      data: {
        userId: user.id,
        tip: 'ALOCARE_ABONAMENT',
        suma: plan.tokenuriLunare,
        soldDupa: nouSold,
        descriere: `Alocare lunară gratuită — plan ${plan.nume}`,
      },
    });

    return actualizat;
  });
}

// ── Creditare (cumpărare, recompensă, ajustare) ──
async function crediteazaTokenuri({ userId, suma, tip, descriere = '', proiectId, ofertaId }) {
  if (!(suma > 0)) throw new Error('Suma de creditat trebuie să fie pozitivă.');

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Utilizatorul nu există.');

    const nouSold = user.tokenuri + suma;
    const actualizat = await tx.user.update({ where: { id: userId }, data: { tokenuri: nouSold } });

    await tx.tranzactieToken.create({
      data: { userId, tip, suma, soldDupa: nouSold, descriere, proiectId, ofertaId },
    });

    return actualizat;
  });
}

// ── Cheltuire tokenuri (ex: publicare anunț, generare raport de prospectare) ──
// Aruncă EroareTokeniInsuficienti dacă soldul nu ajunge.
async function consumaTokenuri({ userId, suma, tip, descriere = '', proiectId, ofertaId }) {
  if (!(suma > 0)) throw new Error('Suma de cheltuit trebuie să fie pozitivă.');

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Utilizatorul nu există.');
    if (user.tokenuri < suma) {
      throw new EroareTokeniInsuficienti(suma, user.tokenuri);
    }

    const nouSold = user.tokenuri - suma;
    const actualizat = await tx.user.update({ where: { id: userId }, data: { tokenuri: nouSold } });

    await tx.tranzactieToken.create({
      data: { userId, tip, suma: -suma, soldDupa: nouSold, descriere, proiectId, ofertaId },
    });

    return actualizat;
  });
}

module.exports = {
  COSTURI,
  RECOMPENSE,
  EroareTokeniInsuficienti,
  asigureTokenuriLunare,
  crediteazaTokenuri,
  consumaTokenuri,
};
