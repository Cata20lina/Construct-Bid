const mongoose = require('mongoose');

const ofertaSchema = new mongoose.Schema({
  proiect:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  subcontractor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  valoare:      { type: Number, required: true },
  moneda:       { type: String, default: 'RON' },
  descriere:    { type: String, default: '' },
  termenExecutie: { type: Number, required: true },
  status: {
    type: String,
    enum: ['in_asteptare', 'acceptata', 'respinsa', 'in_negociere', 'castigatoare', 'depasita'],
    default: 'in_asteptare',
  },
  documente: [{ type: String }],

  // La ofertare dinamică, un subcontractor poate trimite mai multe oferte succesive.
  // Doar ultima ofertă a fiecărui subcontractor rămâne `activa: true` — celelalte
  // sunt păstrate ca istoric (`activa: false`) pentru transparență/audit.
  activa: { type: Boolean, default: true },

}, { timestamps: true });

// Index pentru găsirea rapidă a ofertelor unui proiect, ordonate după valoare
ofertaSchema.index({ proiect: 1, valoare: 1 });
ofertaSchema.index({ proiect: 1, subcontractor: 1, activa: 1 });

module.exports = mongoose.model('Oferta', ofertaSchema);
