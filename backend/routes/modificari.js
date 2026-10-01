const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protejat } = require('../middleware/auth');
const { serializeProject, serializeCerereMateriale } = require('../lib/serialize');

// ─── GET /api/modificari ─────────────────────────────────────────────────────
// Anunțurile și cererile utilizatorului curent suspendate de admin până la
// modificări. Alimentează pagina „Modificări cerute”, care apare în meniu doar
// cât timp lista nu e goală.
router.get('/', protejat, async (req, res) => {
  try {
    const [proiecte, cereri] = await Promise.all([
      prisma.project.findMany({
        where: { dezvoltatorId: req.utilizator.id, suspendat: true },
        include: { dezvoltator: { select: { id: true, nume: true, judet: true, cui: true } }, _count: { select: { oferte: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.cerereMateriale.findMany({
        where: { creatDeId: req.utilizator.id, suspendat: true },
        include: { articole: true, creatDe: { select: { id: true, nume: true, judet: true, cui: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    res.json({ proiecte: proiecte.map(serializeProject), cereri: cereri.map(serializeCerereMateriale) });
  } catch (err) {
    console.error('[modificari GET /]', err);
    res.status(500).json({ mesaj: 'Eroare la încărcarea modificărilor cerute.' });
  }
});

module.exports = router;
