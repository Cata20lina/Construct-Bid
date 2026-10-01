const prisma = require('./prisma');
const { serializeMesajSuport, serializeConversatieSuport } = require('./serialize');
const { notificaMesajAdmin } = require('./mailer');
const { creeazaNotificare } = require('./notificari');

function emite(camera, eveniment, date) {
  try {
    const { getIO } = require('../sockets');
    getIO().to(camera).emit(eveniment, date);
  } catch (e) { /* socket indisponibil - ignoram */ }
}

/**
 * Trimite un mesaj din partea echipei către un utilizator, în firul lui de
 * suport (creat dacă nu există). Ajunge și ca notificare + email, ca firma
 * să-l vadă chiar dacă nu e conectată. Folosit de admin pentru avertismente
 * și pentru motivul unei suspendări.
 */
async function trimiteMesajAdmin({ adminId, userId, text, titluNotificare = 'Mesaj de la echipa ConstructBid', proiectId, link = 'suport' }) {
  const acum = new Date();
  const conversatie = await prisma.conversatieSuport.upsert({
    where: { userId },
    create: { userId, cititAdminLa: acum, ultimulMesajLa: acum },
    update: { status: 'deschisa', cititAdminLa: acum, ultimulMesajLa: acum },
    include: { user: true },
  });

  const mesaj = await prisma.mesajSuport.create({
    data: { conversatieId: conversatie.id, autorId: adminId, text: text.slice(0, 4000), deLaSuport: true },
    include: { autor: { select: { id: true, nume: true } } },
  });

  const mesajSerializat = serializeMesajSuport(mesaj);
  emite(`user_${userId}`, 'suport_mesaj_nou', mesajSerializat);
  emite(`user_${userId}`, 'suport_status', { status: 'deschisa' });
  emite('suport_admin', 'suport_admin_mesaj', {
    conversatie: serializeConversatieSuport({ ...conversatie, ultimulMesaj: mesaj, necitite: 0 }),
    mesaj: mesajSerializat,
  });

  notificaMesajAdmin({ destinatar: conversatie.user, text: mesaj.text });
  creeazaNotificare({ userId, tip: 'alerta', titlu: titluNotificare, mesaj: mesaj.text.slice(0, 120), proiectId, link });

  return mesajSerializat;
}

// Anunță toți adminii (de ex. când o firmă a trimis modificările cerute).
async function notificaAdmini({ titlu, mesaj, proiectId, link = 'admin:verificare' }) {
  const admini = await prisma.user.findMany({ where: { rol: 'ADMIN' }, select: { id: true } });
  admini.forEach(a => creeazaNotificare({ userId: a.id, tip: 'alerta', titlu, mesaj, proiectId, link }));
}

module.exports = { trimiteMesajAdmin, notificaAdmini };
