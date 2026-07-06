const PDFDocument = require('pdfkit');

// ─── Generare PDF — rezumat ofertă câștigătoare / "contract" ─────────────
// Document informativ generat din datele platformei; nu e un contract produs
// juridic semnat, dar rezumă tot ce ar trebui să apară într-un contract
// (părți, valoare, termen, obiect) și poate fi descărcat de ambele părți.
function genereazaContractPdf({ proiect, oferta, dezvoltator, subcontractor }) {
  const doc = new PDFDocument({ margin: 56, size: 'A4' });

  doc.fontSize(20).fillColor('#0f172a').text('ConstructBid', { continued: true })
     .fillColor('#2F6FED').text(' — Rezumat Ofertă Câștigătoare');
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#64748b').text(`Document generat automat la ${new Date().toLocaleString('ro-RO')}`);
  doc.moveDown(1.2);
  doc.strokeColor('#e2e8f0').moveTo(56, doc.y).lineTo(539, doc.y).stroke();
  doc.moveDown(1);

  sectiune(doc, 'Proiect', [
    ['Titlu', proiect.titlu],
    ['Locație', proiect.locatie],
    ['Buget estimat', proiect.buget],
    ['Categorie', proiect.categorie],
    ['Tip ofertare', proiect.tipOfertare === 'dinamica' ? 'Licitație dinamică (live)' : 'Ofertare statică'],
  ]);

  sectiune(doc, 'Ofertă câștigătoare', [
    ['Valoare', `${oferta.valoare} ${oferta.moneda}`],
    ['Termen de execuție', `${oferta.termenExecutie} zile`],
    ...(oferta.descriere ? [['Descriere', oferta.descriere]] : []),
  ]);

  sectiune(doc, 'Dezvoltator (beneficiar)', [
    ['Denumire', `${dezvoltator.nume} (CUI ${dezvoltator.cui})`],
    ['Contact', `${dezvoltator.email} · ${dezvoltator.telefon}`],
    ['Județ', dezvoltator.judet],
  ]);

  sectiune(doc, 'Subcontractor (executant)', [
    ['Denumire', `${subcontractor.nume} (CUI ${subcontractor.cui})`],
    ['Contact', `${subcontractor.email} · ${subcontractor.telefon}`],
    ['Județ', subcontractor.judet],
  ]);

  doc.moveDown(1);
  doc.fontSize(8.5).fillColor('#94a3b8').text(
    'Acest document este generat automat pe baza datelor introduse în platforma ConstructBid și are rol strict '
    + 'informativ / rezumativ. Nu constituie, prin el însuși, un contract legal semnat de părți — pentru un '
    + 'angajament juridic, părțile trebuie să încheie un contract separat, semnat conform legislației aplicabile.',
    { align: 'left' }
  );

  doc.end();
  return doc;
}

function sectiune(doc, titlu, randuri) {
  doc.fontSize(13).fillColor('#0f172a').text(titlu);
  doc.moveDown(0.4);
  randuri.forEach(([label, valoare]) => {
    doc.fontSize(10).fillColor('#64748b').text(label, { continued: true, width: 140 });
    doc.fillColor('#0f172a').text(`   ${valoare ?? '—'}`);
  });
  doc.moveDown(1);
}

module.exports = { genereazaContractPdf };
