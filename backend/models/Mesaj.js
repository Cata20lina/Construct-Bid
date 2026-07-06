const mongoose = require('mongoose');

const mesajSchema = new mongoose.Schema({
  proiect:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  expeditor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, trim: true },
}, { timestamps: true });

mesajSchema.index({ proiect: 1, createdAt: 1 });

module.exports = mongoose.model('Mesaj', mesajSchema);
