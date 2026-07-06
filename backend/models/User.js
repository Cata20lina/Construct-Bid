const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email:   { type: String, required: true, unique: true, lowercase: true, trim: true },
  parola:  { type: String, required: true, minlength: 6 },
  nume:    { type: String, required: true, trim: true },
  cui:     { type: String, required: true, trim: true },
  telefon: { type: String, required: true, trim: true },
  judet:   { type: String, required: true },
  rol:     { type: String, enum: ['SUBCONTRACTOR', 'DEZVOLTATOR'], default: 'SUBCONTRACTOR' },
  verificat: { type: Boolean, default: false },

  // ── Profil extins (folosit mai ales de subcontractori, pe pagina de Profil) ──
  descriere:         { type: String, trim: true, default: '' },
  aniExperienta:     { type: Number, default: null },
  nrAngajati:        { type: Number, default: null },
  categoriiServicii: { type: [String], default: [] },
  judeteServicii:    { type: [String], default: [] },

  // ── Portofoliu de lucrări (subcontractor) — afișat public pe profil, ajută
  //    dezvoltatorul să evalueze o firmă înainte de a alege câștigătorul ──
  lucrari: [{
    titlu:     { type: String, required: true, trim: true },
    descriere: { type: String, default: '', trim: true },
    an:        { type: Number },
    categorie: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  }],

  // ── Perioade de disponibilitate (subcontractor) — public, ajută la planificare ──
  disponibilitate: [{
    start: { type: Date, required: true },
    end:   { type: Date, required: true },
    nota:  { type: String, default: '', trim: true },
  }],

  // ── Verificare CUI (ANAF) — rezultatul ultimei verificări, cache ──
  cuiVerificat:      { type: Boolean, default: false },
  cuiDenumireOficiala: { type: String, default: '' },
  cuiVerificatLa:    { type: Date, default: null },
}, { timestamps: true });

// Hash parolă înainte de salvare
userSchema.pre('save', async function () {
  if (!this.isModified('parola')) return;
  const salt = await bcrypt.genSalt(10);
  this.parola = await bcrypt.hash(this.parola, salt);
});

// Metodă pentru verificarea parolei
userSchema.methods.verificaParola = async function (parolaIntrodusa) {
  return bcrypt.compare(parolaIntrodusa, this.parola);
};

module.exports = mongoose.model('User', userSchema);
