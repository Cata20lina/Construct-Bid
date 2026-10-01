const nodemailer = require('nodemailer');

// ─── Trimitere email ──────────────────────────────────────────────────────
// Config prin variabile de mediu (vezi .env.example):
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
//
// Dacă SMTP nu e configurat (ex: în dezvoltare locală, fără cont de email),
// emailurile sunt afișate în consola serverului în loc să fie trimise real —
// ca să poți testa fluxurile fără să configurezi un SMTP real.

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

const CULOARE_ACCENT = '#2F6FED';

function wrapHtml(titlu, corpHtml) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0f172a;">${titlu}</h2>
      ${corpHtml}
      <p style="color: #94a3b8; font-size: 11px; margin-top: 28px;">ConstructBid — platformă de licitații pentru construcții.</p>
    </div>`;
}

async function trimiteEmail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n📧 [EMAIL SIMULAT — SMTP neconfigurat în .env]`);
    console.log(`   Către: ${to}`);
    console.log(`   Subiect: ${subject}`);
    console.log(`   ${text.replace(/\n/g, '\n   ')}\n`);
    return { simulat: true };
  }
  try {
    const info = await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text, html });
    console.log(`📧 Email trimis către ${to} — subiect: "${subject}" (messageId: ${info.messageId})`);
    return info;
  } catch (err) {
    // Logăm eroarea REALĂ de SMTP (cod de autentificare greșit, host
    // nereachable, timeout etc.) — fără asta, un eșec de trimitere e
    // aproape imposibil de diagnosticat din partea clientului.
    console.error(`📧 EROARE la trimiterea emailului către ${to}: ${err.message}`);
    throw err;
  }
}

// Wrapper "sigur" — nu aruncă erori, doar le loghează. Folosit pentru
// notificări (nu critice pentru fluxul principal al request-ului).
async function trimiteEmailSigur(opts) {
  try {
    await trimiteEmail(opts);
  } catch (err) {
    console.error(`[mailer] eroare trimitere email către ${opts.to}:`, err.message);
  }
}

// ─── Cod de verificare cont ────────────────────────────────────────────────
async function trimiteCodVerificare(email, nume, cod) {
  const subject = 'Codul tău de verificare ConstructBid';
  const text = `Salut, ${nume}!\n\nCodul tău de verificare a contului ConstructBid este: ${cod}\n\nCodul expiră în 15 minute. Dacă nu ai cerut acest cod, poți ignora acest email.`;
  const html = wrapHtml('Verifică-ți contul', `
      <p>Salut, ${nume}!</p>
      <p>Codul tău de verificare a contului ConstructBid este:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: ${CULOARE_ACCENT};">${cod}</p>
      <p style="color: #64748b; font-size: 13px;">Codul expiră în 15 minute. Dacă nu ai cerut acest cod, poți ignora acest email.</p>`);
  return trimiteEmail({ to: email, subject, text, html });
}

// ─── Notificare: ofertă nouă primită (către dezvoltator) ─────────────────
async function notificaOfertaNoua({ dezvoltator, proiect, oferta, subcontractorNume }) {
  const subject = `Ofertă nouă la "${proiect.titlu}"`;
  const text = `Salut, ${dezvoltator.nume}!\n\n${subcontractorNume} a depus o ofertă de ${oferta.valoare} ${oferta.moneda} pentru proiectul "${proiect.titlu}".\n\nVezi detalii pe platformă.`;
  const html = wrapHtml('Ofertă nouă primită', `
      <p>Salut, ${dezvoltator.nume}!</p>
      <p><strong>${subcontractorNume}</strong> a depus o ofertă de <strong>${oferta.valoare} ${oferta.moneda}</strong> pentru proiectul:</p>
      <p style="padding: 12px 16px; background: #f1f5f9; border-radius: 8px;">${proiect.titlu}</p>
      <p>Vezi detalii și restul ofertelor pe platformă.</p>`);
  return trimiteEmailSigur({ to: dezvoltator.email, subject, text, html });
}

// ─── Notificare: ai fost depășit la licitația dinamică ────────────────────
async function notificaOfertaDepasita({ subcontractor, proiect, valoareNoua, moneda }) {
  const subject = `Ai fost depășit la "${proiect.titlu}"`;
  const text = `Salut, ${subcontractor.nume}!\n\nOferta ta pentru "${proiect.titlu}" a fost depășită. Cea mai bună ofertă curentă este ${valoareNoua} ${moneda}. Poți depune o ofertă mai mică dacă licitația e încă activă.`;
  const html = wrapHtml('Ai fost depășit la licitație', `
      <p>Salut, ${subcontractor.nume}!</p>
      <p>Oferta ta pentru proiectul <strong>${proiect.titlu}</strong> a fost depășită.</p>
      <p>Cea mai bună ofertă curentă: <strong>${valoareNoua} ${moneda}</strong>.</p>
      <p>Dacă licitația e încă activă, poți depune o ofertă mai mică direct din platformă.</p>`);
  return trimiteEmailSigur({ to: subcontractor.email, subject, text, html });
}

// ─── Notificare: finalizare licitație dinamică (câștigător + restul) ─────
async function notificaLicitatieFinalizataCastigator({ subcontractor, proiect, oferta }) {
  const subject = `Ai câștigat licitația "${proiect.titlu}"! 🎉`;
  const text = `Felicitări, ${subcontractor.nume}!\n\nAi câștigat licitația pentru "${proiect.titlu}" cu oferta de ${oferta.valoare} ${oferta.moneda}. Datele de contact ale dezvoltatorului sunt acum disponibile pe platformă.`;
  const html = wrapHtml('Ai câștigat licitația! 🎉', `
      <p>Felicitări, ${subcontractor.nume}!</p>
      <p>Ai câștigat licitația pentru <strong>${proiect.titlu}</strong> cu oferta de <strong>${oferta.valoare} ${oferta.moneda}</strong>.</p>
      <p>Datele de contact ale dezvoltatorului sunt acum disponibile pe platformă.</p>`);
  return trimiteEmailSigur({ to: subcontractor.email, subject, text, html });
}

async function notificaLicitatieFinalizataPierduta({ subcontractor, proiect }) {
  const subject = `Licitația "${proiect.titlu}" s-a încheiat`;
  const text = `Salut, ${subcontractor.nume}!\n\nLicitația pentru "${proiect.titlu}" s-a încheiat. Din păcate, oferta ta nu a fost câștigătoare de această dată. Mai sunt proiecte noi pe platformă.`;
  const html = wrapHtml('Licitație încheiată', `
      <p>Salut, ${subcontractor.nume}!</p>
      <p>Licitația pentru <strong>${proiect.titlu}</strong> s-a încheiat. Din păcate, oferta ta nu a fost câștigătoare de această dată.</p>
      <p>Mai sunt proiecte noi pe platformă — nu uita să verifici licitațiile active.</p>`);
  return trimiteEmailSigur({ to: subcontractor.email, subject, text, html });
}

// ─── Notificare: ofertă acceptată/respinsă (licitație statică) ───────────
async function notificaOfertaStaticaAcceptata({ subcontractor, proiect, oferta }) {
  const subject = `Oferta ta pentru "${proiect.titlu}" a fost acceptată! 🎉`;
  const text = `Felicitări, ${subcontractor.nume}!\n\nDezvoltatorul a acceptat oferta ta de ${oferta.valoare} ${oferta.moneda} pentru "${proiect.titlu}". Datele de contact sunt acum disponibile pe platformă.`;
  const html = wrapHtml('Oferta ta a fost acceptată! 🎉', `
      <p>Felicitări, ${subcontractor.nume}!</p>
      <p>Dezvoltatorul a acceptat oferta ta de <strong>${oferta.valoare} ${oferta.moneda}</strong> pentru <strong>${proiect.titlu}</strong>.</p>
      <p>Datele de contact sunt acum disponibile pe platformă.</p>`);
  return trimiteEmailSigur({ to: subcontractor.email, subject, text, html });
}

async function notificaOfertaStaticaRespinsa({ subcontractor, proiect }) {
  const subject = `Actualizare privind oferta ta pentru "${proiect.titlu}"`;
  const text = `Salut, ${subcontractor.nume}!\n\nDezvoltatorul a ales o altă ofertă pentru "${proiect.titlu}". Îți mulțumim pentru interes — mai sunt multe proiecte noi pe platformă.`;
  const html = wrapHtml('Actualizare ofertă', `
      <p>Salut, ${subcontractor.nume}!</p>
      <p>Dezvoltatorul a ales o altă ofertă pentru <strong>${proiect.titlu}</strong>.</p>
      <p>Îți mulțumim pentru interes — mai sunt multe proiecte noi pe platformă.</p>`);
  return trimiteEmailSigur({ to: subcontractor.email, subject, text, html });
}

// ─── Notificare: răspuns nou pe chat-ul de suport ────────────────────────
async function notificaRaspunsSuport({ destinatar, text: continut }) {
  const subject = 'Ai primit un răspuns de la echipa ConstructBid';
  const text = `Salut, ${destinatar.nume}!\n\nEchipa ConstructBid ți-a răspuns la solicitarea de suport:\n\n"${continut}"\n\nPoți continua conversația din chat-ul de suport de pe platformă.`;
  const html = wrapHtml('Răspuns de la suport', `
      <p>Salut, ${destinatar.nume}!</p>
      <p>Echipa ConstructBid ți-a răspuns la solicitarea de suport:</p>
      <p style="padding: 12px 16px; background: #f1f5f9; border-radius: 8px; font-style: italic;">"${continut}"</p>
      <p>Poți continua conversația din chat-ul de suport de pe platformă.</p>`);
  return trimiteEmailSigur({ to: destinatar.email, subject, text, html });
}

// ─── Mesaj inițiat de echipă (avertisment, anunț suspendat etc.) ───────────
async function notificaMesajAdmin({ destinatar, text: continut }) {
  const subject = 'Mesaj de la echipa ConstructBid';
  const text = `Salut, ${destinatar.nume}!

Echipa ConstructBid ți-a trimis un mesaj:

"${continut}"

Poți răspunde din chat-ul de suport de pe platformă.`;
  const html = wrapHtml('Mesaj de la echipa ConstructBid', `
      <p>Salut, ${destinatar.nume}!</p>
      <p>Echipa ConstructBid ți-a trimis un mesaj:</p>
      <p style="padding: 12px 16px; background: #f1f5f9; border-radius: 8px; white-space: pre-wrap;">${continut}</p>
      <p>Poți răspunde din chat-ul de suport de pe platformă.</p>`);
  return trimiteEmailSigur({ to: destinatar.email, subject, text, html });
}

// ─── Cont suspendat — singurul canal prin care firma află motivul, pentru
//    că un cont suspendat nu se mai poate conecta ca să citească chat-ul. ──
async function notificaContSuspendat({ destinatar, motiv }) {
  const subject = 'Contul tău ConstructBid a fost suspendat';
  const text = `Salut, ${destinatar.nume}!

Contul tău ConstructBid a fost suspendat.${motiv ? `

Motiv: ${motiv}` : ''}

Dacă vrei să clarifici situația, răspunde la acest email.`;
  const html = wrapHtml('Cont suspendat', `
      <p>Salut, ${destinatar.nume}!</p>
      <p>Contul tău ConstructBid a fost suspendat.</p>
      ${motiv ? `<p style="padding: 12px 16px; background: #f1f5f9; border-radius: 8px;">Motiv: ${motiv}</p>` : ''}
      <p>Dacă vrei să clarifici situația, răspunde la acest email.</p>`);
  return trimiteEmailSigur({ to: destinatar.email, subject, text, html });
}

// ─── Cod de resetare parolă ────────────────────────────────────────────────
async function trimiteCodResetareParola(email, nume, cod) {
  const subject = 'Codul tău de resetare a parolei — ConstructBid';
  const text = `Salut, ${nume}!\n\nAi cerut resetarea parolei contului tău ConstructBid. Codul tău este: ${cod}\n\nCodul expiră în 15 minute. Dacă nu tu ai cerut acest lucru, poți ignora acest email — parola ta rămâne neschimbată.`;
  const html = wrapHtml('Resetează-ți parola', `
      <p>Salut, ${nume}!</p>
      <p>Ai cerut resetarea parolei contului tău ConstructBid. Codul tău este:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: ${CULOARE_ACCENT};">${cod}</p>
      <p style="color: #64748b; font-size: 13px;">Codul expiră în 15 minute. Dacă nu tu ai cerut acest lucru, poți ignora acest email — parola ta rămâne neschimbată.</p>`);
  return trimiteEmail({ to: email, subject, text, html });
}

function genereazaCod() {
  return String(Math.floor(100000 + Math.random() * 900000)); // cod din 6 cifre
}

module.exports = {
  trimiteCodVerificare,
  trimiteCodResetareParola,
  genereazaCod,
  notificaOfertaNoua,
  notificaOfertaDepasita,
  notificaLicitatieFinalizataCastigator,
  notificaLicitatieFinalizataPierduta,
  notificaOfertaStaticaAcceptata,
  notificaOfertaStaticaRespinsa,
  notificaRaspunsSuport,
  notificaMesajAdmin,
  notificaContSuspendat,
};
