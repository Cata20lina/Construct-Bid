const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const protejat = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ mesaj: 'Token lipsa. Autentifica-te mai intai.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const utilizator = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { lucrari: true, disponibilitati: true },
    });
    if (!utilizator) {
      return res.status(401).json({ mesaj: 'Utilizatorul nu mai exista.' });
    }
    req.utilizator = utilizator;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ mesaj: 'Sesiunea a expirat. Reconecteaza-te.' });
    }
    return res.status(401).json({ mesaj: 'Token invalid.' });
  }
};

const doarRol = (...roluri) => (req, res, next) => {
  if (!roluri.includes(req.utilizator.rol)) {
    return res.status(403).json({ mesaj: 'Acces restrictionat.' });
  }
  next();
};

module.exports = { protejat, doarRol };
