const jwt = require('jsonwebtoken');

let ioInstance = null;

/**
 * Inițializează Socket.io pe serverul HTTP existent.
 * Camerele sunt denumite `proiect_<id>` — fiecare client se alătură camerei
 * proiectului pe care îl vizualizează, pentru a primi actualizările licitației live.
 */
function initSockets(server, corsOptions) {
  const { Server } = require('socket.io');
  ioInstance = new Server(server, {
    cors: corsOptions,
  });

  ioInstance.on('connection', (socket) => {
    socket.on('join_proiect', (proiectId) => {
      if (proiectId) socket.join(`proiect_${proiectId}`);
    });

    socket.on('leave_proiect', (proiectId) => {
      if (proiectId) socket.leave(`proiect_${proiectId}`);
    });

    // Camera personală a utilizatorului — folosită pentru push live de
    // notificări (vezi lib/notificari.js) și răspunsurile de la suport,
    // indiferent ce proiect vizitează. ID-ul se ia din token-ul JWT, nu din
    // ce trimite clientul, ca nimeni să nu poată asculta camera altcuiva.
    socket.on('join_user', (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.join(`user_${decoded.id}`);
      } catch (e) { /* token invalid - ignoram */ }
    });

    socket.on('leave_user', () => {
      [...socket.rooms].filter(r => r.startsWith('user_')).forEach(r => socket.leave(r));
    });

    // Camera echipei de suport — primește mesajele noi din chat-ul de suport.
    // Spre deosebire de celelalte camere, cere token-ul JWT și rolul ADMIN,
    // pentru că mesajele de suport pot conține date private ale utilizatorilor.
    socket.on('join_suport_admin', (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.rol === 'ADMIN') socket.join('suport_admin');
      } catch (e) { /* token invalid - ignoram */ }
    });

    socket.on('leave_suport_admin', () => {
      socket.leave('suport_admin');
    });
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) throw new Error('Socket.io nu a fost inițializat încă.');
  return ioInstance;
}

module.exports = { initSockets, getIO };
