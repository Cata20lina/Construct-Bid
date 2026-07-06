/**
 * Script de diagnostic + reparare pentru indexurile colecției "oferte".
 *
 * Problemă tipică: dacă aplicația a rulat vreodată cu o versiune mai veche a
 * schemei Oferta (care avea un index UNIC pe proiect+subcontractor), acel
 * index rămâne în MongoDB chiar și după ce schema e actualizată — Mongoose nu
 * șterge automat indexuri vechi. Rezultatul: la licitația dinamică, a doua
 * ofertă a aceluiași subcontractor pică cu eroarea
 * "Ai depus deja o oferta pentru acest proiect" (cod MongoDB E11000),
 * chiar dacă codul curent permite explicit oferte multiple.
 *
 * Rulează cu: node fix-indexes.js
 *
 * Notă: server.js face deja această sincronizare automat la fiecare pornire,
 * deci în mod normal NU trebuie să rulezi acest script manual. E util doar
 * pentru diagnostic sau dacă vrei să vezi exact ce indexuri existau înainte.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Oferta = require('./models/Oferta');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB conectat\n');

    const indexuriInainte = await Oferta.collection.indexes();
    console.log('📋 Indexuri existente pe colecția "oferte" ÎNAINTE de sincronizare:');
    indexuriInainte.forEach(idx => console.log('   -', idx.name, JSON.stringify(idx.key), idx.unique ? '(UNIC)' : ''));

    const { toDrop, toCreate } = await Oferta.diffIndexes();
    console.log('\n🔍 Indexuri care vor fi ȘTERSE (nu mai sunt în schemă):', toDrop.length ? toDrop : 'niciunul');
    console.log('🔍 Indexuri care vor fi CREATE (lipsesc din DB):', toCreate.length ? toCreate.map(i => JSON.stringify(i)) : 'niciunul');

    await Oferta.syncIndexes();

    const indexuriDupa = await Oferta.collection.indexes();
    console.log('\n✅ Indexuri existente pe colecția "oferte" DUPĂ sincronizare:');
    indexuriDupa.forEach(idx => console.log('   -', idx.name, JSON.stringify(idx.key), idx.unique ? '(UNIC)' : ''));

    console.log('\n🎉 Sincronizare finalizată. Ofertarea repetată la licitația dinamică ar trebui să funcționeze acum.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Eroare:', err.message);
    process.exit(1);
  }
})();
