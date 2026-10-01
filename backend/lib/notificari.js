const prisma = require('./prisma');
const { serializeNotificare } = require('./serialize');

/**
 * Creează o notificare persistentă în DB pentru un utilizator și o trimite
 * live prin socket.io (dacă e conectat). E "best effort" — nu aruncă erori,
 * ca să nu blocheze fluxul principal al request-ului care a declanșat-o
 * (aceeași filozofie ca la emailurile din lib/mailer.js).
 *
 * @param {Object} opts
 * @param {string} opts.userId
 * @param {'oferta'|'castigat'|'proiect'|'alerta'} opts.tip
 * @param {string} opts.titlu
 * @param {string} opts.mesaj
 * @param {string} [opts.proiectId]
 * @param {string} [opts.ofertaId]
 * @param {string} [opts.link] unde duce click-ul (vezi câmpul `link` din schema)
 */
async function creeazaNotificare({ userId, tip, titlu, mesaj, proiectId, ofertaId, link }) {
  try {
    const notificare = await prisma.notificare.create({
      data: { userId, tip, titlu, mesaj, proiectId: proiectId || null, ofertaId: ofertaId || null, link: link || '' },
    });

    try {
      const { getIO } = require('../sockets');
      getIO().to(`user_${userId}`).emit('notificare_noua', serializeNotificare(notificare));
    } catch (e) {
      // socket indisponibil (ex. server pornit fără initSockets, sau test) - ignorăm
    }

    return notificare;
  } catch (err) {
    console.error('[notificari] eroare la creare notificare:', err.message);
    return null;
  }
}

module.exports = { creeazaNotificare };
