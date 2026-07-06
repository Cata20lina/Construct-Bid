const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  titlu:      { type: String, required: true, trim: true },
  descriere:  { type: String, required: true },
  locatie:    { type: String, required: true },
  judet:      { type: String },
  oras:       { type: String },
  buget:      { type: String, required: true },
  bugetValoare: { type: Number },
  urgent:     { type: Boolean, default: false },
  zile:       { type: Number, required: true },
  deadline:   { type: Date },
  categorie:  { type: String, enum: ['rezidential', 'industrial', 'comercial', 'infrastructura', 'reabilitare', 'Structuri', 'Instalații', 'Electrice', 'Finisaje'], default: 'rezidential' },
  dezvoltator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activ:      { type: Boolean, default: true },

  // ─── MODUL DE OFERTARE ───────────────────────────────────────────────────
  // 'statica'  -> fiecare subcontractor poate depune o singură ofertă; dezvoltatorul alege manual câștigătorul
  // 'dinamica' -> licitație live într-o fereastră de timp; subcontractorii pot oferta repetat,
  //               văd ofertele concurenței, iar la final câștigă automat cea mai mică valoare
  tipOfertare: { type: String, enum: ['statica', 'dinamica'], default: 'statica' },

  // Folosite doar pentru tipOfertare === 'dinamica'
  licitatieStart: { type: Date },   // momentul de start al licitației live
  licitatieEnd:   { type: Date },   // momentul exact la care licitația se închide automat

  licitatieFinalizata: { type: Boolean, default: false }, // setat true odată ce a fost determinat câștigătorul
  castigator:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ofertaCastigatoare: { type: mongoose.Schema.Types.ObjectId, ref: 'Oferta', default: null },

}, { timestamps: true });

// Count rapid (folosit în liste, nu necesită populate complet) — numărul de oferte primite de proiect
projectSchema.virtual('oferte', {
  ref: 'Oferta',
  localField: '_id',
  foreignField: 'proiect',
  count: true,
});

projectSchema.virtual('licitatieActiva').get(function () {
  if (this.tipOfertare !== 'dinamica') return false;
  if (!this.licitatieStart || !this.licitatieEnd) return false;
  const acum = Date.now();
  return acum >= new Date(this.licitatieStart).getTime() && acum < new Date(this.licitatieEnd).getTime() && !this.licitatieFinalizata;
});

projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Project', projectSchema);
