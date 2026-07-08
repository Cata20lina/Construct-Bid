// ─── Serializare ────────────────────────────────────────────────────────────
// Frontend-ul se aștepta la formatul Mongoose (`_id`, obiecte populate etc.).
// Aceste funcții transformă rândurile Prisma înapoi în EXACT același format,
// ca frontend-ul să nu aibă nevoie de nicio modificare.

function serializeLucrare(l) {
  if (!l) return l;
  return { _id: l.id, titlu: l.titlu, descriere: l.descriere, an: l.an, categorie: l.categorie, createdAt: l.createdAt };
}

function serializeDisponibilitate(d) {
  if (!d) return d;
  return { _id: d.id, start: d.start, end: d.end, nota: d.nota };
}

function serializeRecomandare(r) {
  if (!r) return r;
  return {
    _id: r.id,
    categorie: r.categorie,
    valoareContract: r.valoareContract,
    documentUrl: r.documentUrl || '',
    documentNume: r.documentNume || '',
    descriere: r.descriere || '',
    createdAt: r.createdAt,
  };
}

function serializeEvaluare(e) {
  if (!e) return e;
  return {
    _id: e.id,
    scor: e.scor,
    comentariu: e.comentariu || '',
    proiectTitlu: e.proiectTitlu || '',
    evaluatorNume: e.evaluatorNume || '',
    ofertaId: e.ofertaId,
    proiectId: e.proiectId || undefined,
    createdAt: e.createdAt,
  };
}

// Profilul complet al propriului utilizator (register/login/me/profil)
function serializeUserFull(u) {
  if (!u) return u;
  return {
    id: u.id,
    _id: u.id,
    nume: u.nume,
    email: u.email,
    rol: u.rol,
    judet: u.judet,
    cui: u.cui,
    telefon: u.telefon,
    descriere: u.descriere || '',
    aniExperienta: u.aniExperienta ?? null,
    nrAngajati: u.nrAngajati ?? null,
    categoriiServicii: u.categoriiServicii || [],
    judeteServicii: u.judeteServicii || [],
    lucrari: (u.lucrari || []).map(serializeLucrare),
    disponibilitate: (u.disponibilitati || []).map(serializeDisponibilitate),
    recomandari: (u.recomandari || []).map(serializeRecomandare),
    cuiVerificat: u.cuiVerificat || false,
    cuiDenumireOficiala: u.cuiDenumireOficiala || '',
    tokenuri: typeof u.tokenuri === 'number' ? u.tokenuri : 0,
    planAbonament: u.planAbonament || 'GRATUIT',
    siteWeb: u.siteWeb || '',
    ratingMediu: typeof u.ratingMediu === 'number' ? u.ratingMediu : 0,
    ratingNumarEvaluari: typeof u.ratingNumarEvaluari === 'number' ? u.ratingNumarEvaluari : 0,
  };
}

// Vizibil public pe un profil de subcontractor (fără telefon/email)
function serializeUserPublic(u) {
  if (!u) return u;
  return {
    _id: u.id,
    nume: u.nume,
    judet: u.judet,
    cui: u.cui,
    aniExperienta: u.aniExperienta ?? null,
    nrAngajati: u.nrAngajati ?? null,
    categoriiServicii: u.categoriiServicii || [],
    judeteServicii: u.judeteServicii || [],
    descriere: u.descriere || '',
    siteWeb: u.siteWeb || '',
    ratingMediu: typeof u.ratingMediu === 'number' ? u.ratingMediu : 0,
    ratingNumarEvaluari: typeof u.ratingNumarEvaluari === 'number' ? u.ratingNumarEvaluari : 0,
    lucrari: u.lucrari ? u.lucrari.map(serializeLucrare) : [],
    disponibilitate: u.disponibilitati ? u.disponibilitati.map(serializeDisponibilitate) : [],
    recomandari: u.recomandari ? u.recomandari.map(serializeRecomandare) : [],
    verificat: u.verificat,
  };
}

// 'nume judet cui' — folosit la dezvoltator/castigator în proiecte
function serializeUserMini(u) {
  if (!u) return u;
  return { _id: u.id, nume: u.nume, judet: u.judet, cui: u.cui };
}

// Date de contact dezvăluite doar după câștigarea unei oferte
function serializeUserContact(u) {
  if (!u) return u;
  return { nume: u.nume, email: u.email, telefon: u.telefon, judet: u.judet, cui: u.cui };
}

function serializeOferta(o) {
  if (!o) return o;
  return {
    _id: o.id,
    proiect: o.proiect ? serializeProject(o.proiect) : o.proiectId,
    subcontractor: o.subcontractor ? serializeUserPublic(o.subcontractor) : o.subcontractorId,
    valoare: o.valoare,
    moneda: o.moneda,
    descriere: o.descriere,
    termenExecutie: o.termenExecutie,
    status: o.status,
    documente: o.documente || [],
    activa: o.activa,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function serializeProject(p) {
  if (!p) return p;
  const licitatieActiva = (() => {
    if (p.tipOfertare !== 'dinamica') return false;
    if (!p.licitatieStart || !p.licitatieEnd) return false;
    const acum = Date.now();
    return acum >= new Date(p.licitatieStart).getTime() && acum < new Date(p.licitatieEnd).getTime() && !p.licitatieFinalizata;
  })();

  return {
    _id: p.id,
    titlu: p.titlu,
    descriere: p.descriere,
    locatie: p.locatie,
    judet: p.judet,
    oras: p.oras,
    buget: p.buget,
    bugetValoare: p.bugetValoare,
    latitudine: p.latitudine,
    longitudine: p.longitudine,
    urgent: p.urgent,
    zile: p.zile,
    deadline: p.deadline,
    categorie: p.categorie,
    esteProspectare: !!p.esteProspectare,
    dezvoltator: p.dezvoltator ? serializeUserMini(p.dezvoltator) : p.dezvoltatorId,
    activ: p.activ,
    tipOfertare: p.tipOfertare,
    licitatieStart: p.licitatieStart,
    licitatieEnd: p.licitatieEnd,
    licitatieFinalizata: p.licitatieFinalizata,
    castigator: p.castigator ? serializeUserMini(p.castigator) : p.castigatorId,
    ofertaCastigatoare: p.ofertaCastigatoare ? serializeOferta(p.ofertaCastigatoare) : p.ofertaCastigatoareId,
    oferte: typeof p._count?.oferte === 'number' ? p._count.oferte : undefined,
    licitatieActiva,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function serializeMesaj(m) {
  if (!m) return m;
  return {
    _id: m.id,
    proiect: m.proiectId,
    expeditor: m.expeditor ? { _id: m.expeditor.id, nume: m.expeditor.nume, rol: m.expeditor.rol } : m.expeditorId,
    text: m.text,
    createdAt: m.createdAt,
  };
}

// Format aliniat la ce aștepta deja NotificariView.jsx (era generat local, în
// React, din evenimente de socket) — text/subtitlu/citit/data — ca frontend-ul
// să nu aibă nevoie de nicio schimbare de shape, doar de sursa datelor.
function serializeNotificare(n) {
  if (!n) return n;
  return {
    id: n.id,
    tip: n.tip,
    text: n.titlu,
    titlu: n.titlu,
    subtitlu: n.mesaj || undefined,
    citit: n.citita,
    data: n.createdAt,
    proiectId: n.proiectId || undefined,
    ofertaId: n.ofertaId || undefined,
  };
}

module.exports = {
  serializeLucrare,
  serializeDisponibilitate,
  serializeRecomandare,
  serializeEvaluare,
  serializeUserFull,
  serializeUserPublic,
  serializeUserMini,
  serializeUserContact,
  serializeOferta,
  serializeProject,
  serializeMesaj,
  serializeNotificare,
};
