// ─── Recalculare rating agregat ──────────────────────────────────────────────
// Apelat după fiecare evaluare nouă, în aceeași tranzacție. Recalculează media
// și numărul de evaluări primite de un subcontractor și le salvează denormalizat
// pe rândul lui de User, ca restul aplicației să nu facă agregări la citire.
async function recalculeazaRating(tx, evaluatId) {
  const agregat = await tx.evaluare.aggregate({
    where: { evaluatId },
    _avg: { scor: true },
    _count: { scor: true },
  });

  const medie = agregat._avg.scor || 0;
  const numar = agregat._count.scor || 0;

  await tx.user.update({
    where: { id: evaluatId },
    data: {
      ratingMediu: Math.round(medie * 10) / 10,
      ratingNumarEvaluari: numar,
    },
  });
}

module.exports = { recalculeazaRating };
