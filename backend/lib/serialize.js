// ─── Serializare ────────────────────────────────────────────────────────────
// Frontend-ul se aștepta la formatul Mongoose (`_id`, obiecte populate etc.).
// Aceste funcții transformă rândurile Prisma înapoi în EXACT același format,
// ca frontend-ul să nu aibă nevoie de nicio modificare.

function serializeLucrare(l) {
  if (!l) return l;
  return {
    _id: l.id, titlu: l.titlu, descriere: l.descriere, an: l.an, categorie: l.categorie,
    pret: l.pret ?? null, unitateMasura: l.unitateMasura || '',
    createdAt: l.createdAt,
  };
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

// Situație financiară (bilanț ANAF) — null dacă nu a fost încă verificată sau
// dacă firma nu are niciun bilanț depus găsit.
function serializeBilant(u) {
  if (!u || !u.bilantVerificatLa) return null;
  return {
    an: u.bilantAn ?? null,
    cifraAfaceri: u.bilantCifraAfaceri ?? null,
    profitNet: u.bilantProfitNet ?? null,
    pierdereNeta: u.bilantPierdereNeta ?? null,
    numarAngajati: u.bilantNumarAngajati ?? null,
    verificatLa: u.bilantVerificatLa,
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
    identitate: {
      status: u.identitateStatus || 'NECONFIRMATA',
      metoda: u.identitateMetoda || '',
      persoana: u.identitatePersoana || '',
      calitate: u.identitateCalitate || '',
      trimisaLa: u.identitateTrimisaLa || null,
      confirmataLa: u.identitateConfirmataLa || null,
      motivRespingere: u.identitateMotivRespingere || '',
    },
    bilant: serializeBilant(u),
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
    rol: u.rol,
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
    cuiVerificat: u.cuiVerificat || false,
    identitateConfirmata: u.identitateStatus === 'CONFIRMATA',
    bilant: serializeBilant(u),
  };
}

// Vedere pentru panoul de admin — mai completă decât cea publică (email,
// telefon, status suspendare), dar tot fără parolă.
function serializeUserAdmin(u) {
  if (!u) return u;
  return {
    _id: u.id,
    nume: u.nume,
    email: u.email,
    rol: u.rol,
    judet: u.judet,
    cui: u.cui,
    telefon: u.telefon,
    verificat: u.verificat,
    cuiVerificat: u.cuiVerificat || false,
    cuiDenumireOficiala: u.cuiDenumireOficiala || '',
    cuiVerificatLa: u.cuiVerificatLa || null,
    identitateStatus: u.identitateStatus || 'NECONFIRMATA',
    identitatePersoana: u.identitatePersoana || '',
    identitateCalitate: u.identitateCalitate || '',
    identitateMetoda: u.identitateMetoda || '',
    identitateTrimisaLa: u.identitateTrimisaLa || null,
    suspendat: u.suspendat || false,
    suspendatMotiv: u.suspendatMotiv || '',
    tokenuri: typeof u.tokenuri === 'number' ? u.tokenuri : 0,
    planAbonament: u.planAbonament || 'GRATUIT',
    ratingMediu: typeof u.ratingMediu === 'number' ? u.ratingMediu : 0,
    ratingNumarEvaluari: typeof u.ratingNumarEvaluari === 'number' ? u.ratingNumarEvaluari : 0,
    createdAt: u.createdAt,
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
    termenLimitaOferta: p.termenLimitaOferta,
    avansProcent: p.avansProcent,
    garantii: p.garantii || '',
    experientaMinima: p.experientaMinima || '',
    dezvoltator: p.dezvoltator ? serializeUserMini(p.dezvoltator) : p.dezvoltatorId,
    activ: p.activ,
    suspendat: !!p.suspendat,
    motivSuspendare: p.motivSuspendare || '',
    modificariTrimiseLa: p.modificariTrimiseLa || null,
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
    link: n.link || undefined,
  };
}

// Clarificare (întrebare publică + răspuns opțional de la dezvoltator)
function serializeClarificare(c) {
  if (!c) return c;
  return {
    _id: c.id,
    intrebare: c.intrebare,
    raspuns: c.raspuns || null,
    raspunsLa: c.raspunsLa || null,
    proiectId: c.proiectId,
    autor: c.autor ? serializeUserMini(c.autor) : c.autorId,
    createdAt: c.createdAt,
  };
}

// Reclamație (raportare problemă) — pentru utilizatorul care a depus-o și
// pentru admin (care vede și partea raportată).
function serializeReclamatie(r) {
  if (!r) return r;
  return {
    _id: r.id,
    motiv: r.motiv,
    descriere: r.descriere || '',
    status: r.status,
    raspunsAdmin: r.raspunsAdmin || '',
    proiectId: r.proiectId || null,
    ofertaId: r.ofertaId || null,
    raportatDe: r.raportatDe ? serializeUserMini(r.raportatDe) : r.raportatDeId,
    raportatImpotriva: r.raportatImpotriva ? serializeUserMini(r.raportatImpotriva) : (r.raportatImpotrivaId || null),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// ═══ Chat de suport ═══════════════════════════════════════════════════

function serializeMesajSuport(m) {
  if (!m) return m;
  return {
    _id: m.id,
    conversatie: m.conversatieId,
    text: m.text,
    deLaSuport: m.deLaSuport,
    autor: m.autor ? { _id: m.autor.id, nume: m.autor.nume } : m.autorId,
    createdAt: m.createdAt,
  };
}

// Pentru lista din panoul de admin: `ultimulMesaj` și `necitite` sunt
// calculate de rută și atașate pe obiect înainte de serializare.
function serializeConversatieSuport(c) {
  if (!c) return c;
  return {
    _id: c.id,
    status: c.status,
    user: c.user ? { _id: c.user.id, nume: c.user.nume, email: c.user.email, rol: c.user.rol } : c.userId,
    ultimulMesaj: c.ultimulMesaj ? serializeMesajSuport(c.ultimulMesaj) : null,
    necitite: c.necitite ?? 0,
    ultimulMesajLa: c.ultimulMesajLa,
    createdAt: c.createdAt,
  };
}

// ═══ Cereri de materiale ═══════════════════════════════════════════════

function serializeOfertaArticol(oa) {
  if (!oa) return oa;
  return {
    _id: oa.id,
    cerereArticolId: oa.cerereArticolId,
    pretUnitar: oa.pretUnitar,
    cantitateOfertata: oa.cantitateOfertata ?? null,
    acceptat: oa.acceptat,
    createdAt: oa.createdAt,
  };
}

function serializeOfertaMateriale(o) {
  if (!o) return o;
  return {
    _id: o.id,
    cerereId: o.cerereId,
    furnizor: o.furnizor ? serializeUserPublic(o.furnizor) : o.furnizorId,
    mesaj: o.mesaj || '',
    termenLivrare: o.termenLivrare,
    activa: o.activa,
    articole: (o.articole || []).map(serializeOfertaArticol),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function serializeCerereArticol(a) {
  if (!a) return a;
  return {
    _id: a.id,
    denumire: a.denumire,
    cantitate: a.cantitate,
    unitateMasura: a.unitateMasura,
    specificatii: a.specificatii || '',
    ofertaArticolCastigatoareId: a.ofertaArticolCastigatoareId || null,
    createdAt: a.createdAt,
  };
}

function serializeCerereMateriale(c) {
  if (!c) return c;
  return {
    _id: c.id,
    titlu: c.titlu,
    descriere: c.descriere || '',
    judet: c.judet,
    oras: c.oras || '',
    termenLimita: c.termenLimita || null,
    status: c.status,
    suspendat: !!c.suspendat,
    motivSuspendare: c.motivSuspendare || '',
    modificariTrimiseLa: c.modificariTrimiseLa || null,
    proiect: c.proiect ? serializeProject(c.proiect) : (c.proiectId || null),
    creatDe: c.creatDe ? serializeUserMini(c.creatDe) : c.creatDeId,
    articole: (c.articole || []).map(serializeCerereArticol),
    numarOferte: typeof c._count?.oferte === 'number' ? c._count.oferte : undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// Produs de catalog — reutilizează Lucrare (deja are pret/unitateMasura
// pentru FURNIZOR), afișat public cu info minimă despre furnizor.
function serializeCatalogItem(l) {
  if (!l) return l;
  return {
    _id: l.id,
    titlu: l.titlu,
    descriere: l.descriere || '',
    categorie: l.categorie || '',
    pret: l.pret ?? null,
    unitateMasura: l.unitateMasura || '',
    furnizor: l.user ? {
      _id: l.user.id,
      nume: l.user.nume,
      judet: l.user.judet,
      judeteServicii: l.user.judeteServicii || [],
      ratingMediu: typeof l.user.ratingMediu === 'number' ? l.user.ratingMediu : 0,
      ratingNumarEvaluari: typeof l.user.ratingNumarEvaluari === 'number' ? l.user.ratingNumarEvaluari : 0,
      cuiVerificat: l.user.cuiVerificat || false,
    } : l.userId,
    createdAt: l.createdAt,
  };
}

// Comandă directă din catalog — vizibilă cumpărătorului și furnizorului.
function serializeComandaCatalog(c) {
  if (!c) return c;
  return {
    _id: c.id,
    denumireProdus: c.denumireProdus,
    pretUnitar: c.pretUnitar,
    unitateMasura: c.unitateMasura,
    cantitate: c.cantitate,
    mesaj: c.mesaj || '',
    status: c.status,
    motivRefuz: c.motivRefuz || '',
    produsId: c.produsId || null,
    cumparator: c.cumparator ? serializeUserMini(c.cumparator) : c.cumparatorId,
    furnizor: c.furnizor ? serializeUserMini(c.furnizor) : c.furnizorId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

module.exports = {
  serializeLucrare,
  serializeReclamatie,
  serializeMesajSuport,
  serializeConversatieSuport,
  serializeDisponibilitate,
  serializeRecomandare,
  serializeEvaluare,
  serializeUserFull,
  serializeUserPublic,
  serializeUserAdmin,
  serializeUserMini,
  serializeUserContact,
  serializeOferta,
  serializeProject,
  serializeNotificare,
  serializeClarificare,
  serializeCerereMateriale,
  serializeCerereArticol,
  serializeOfertaMateriale,
  serializeOfertaArticol,
  serializeCatalogItem,
  serializeComandaCatalog,
};
