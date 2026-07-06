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
    // notificări (vezi lib/notificari.js), indiferent ce proiect vizitează.
    socket.on('join_user', (userId) => {
      if (userId) socket.join(`user_${userId}`);
    });

    socket.on('leave_user', (userId) => {
      if (userId) socket.leave(`user_${userId}`);
    });
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) throw new Error('Socket.io nu a fost inițializat încă.');
  return ioInstance;
}

module.exports = { initSockets, getIO };
