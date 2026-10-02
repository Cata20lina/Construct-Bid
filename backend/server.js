require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

const prisma = require('./lib/prisma');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const ofertaRoutes = require('./routes/oferte');
const uploadRoutes = require('./routes/upload');
const cuiRoutes = require('./routes/cui');
const utileRoutes = require('./routes/utile');
const notificariRoutes = require('./routes/notificari');
const prospectareRoutes = require('./routes/prospectare');
const tokenuriRoutes = require('./routes/tokenuri');
const { manipuleazaWebhookStripe } = require('./routes/tokenuri');
const clarificariRoutes = require('./routes/clarificari');
const reclamatiiRoutes = require('./routes/reclamatii');
const suportRoutes = require('./routes/suport');
const adminRoutes = require('./routes/admin');
const cereriMaterialeRoutes = require('./routes/cereriMateriale');
const catalogRoutes = require('./routes/catalog');
const modificariRoutes = require('./routes/modificari');
const identitateRoutes = require('./routes/identitate');

const { initSockets } = require('./sockets');
const { reporneșteTimerele } = require('./services/licitatie');

const app = express();
const server = http.createServer(app);

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
// În producție, setează FRONTEND_URL (poți pune mai multe, separate prin
// virgulă) la adresa unde e găzduit frontend-ul (ex: https://constructbid.vercel.app).
const originuriProductie = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000', ...originuriProductie],
  credentials: true,
};
app.use(cors(corsOptions));

// ── Webhook Stripe — MONTAT ÎNAINTE de express.json(), cu body RAW.
//    Stripe verifică semnătura pe bytes-ul exact al body-ului; dacă am lăsa
//    express.json() să-l parseze mai întâi, verificarea de semnătură ar eșua
//    mereu. De asta ruta asta nu trece prin router-ul normal de tokenuri. ──
app.post('/api/tokenuri/webhook-stripe', express.raw({ type: 'application/json' }), manipuleazaWebhookStripe);

app.use(express.json());

// Fișierele atașate la oferte (documente, PDF-uri etc.) sunt servite static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── RUTE ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/oferte', ofertaRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cui', cuiRoutes);
app.use('/api/utile', utileRoutes);
app.use('/api/notificari', notificariRoutes);
app.use('/api/prospectare', prospectareRoutes);
app.use('/api/tokenuri', tokenuriRoutes);
app.use('/api/clarificari', clarificariRoutes);
app.use('/api/reclamatii', reclamatiiRoutes);
app.use('/api/suport', suportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cereri-materiale', cereriMaterialeRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/modificari', modificariRoutes);
app.use('/api/identitate', identitateRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
initSockets(server, corsOptions);

// ─── CONECTARE POSTGRESQL (via Prisma) + PORNIRE SERVER ───────────────────────
const PORT = process.env.PORT || 5000;

prisma.$connect()
  .then(async () => {
    console.log('✅ PostgreSQL conectat cu succes (Prisma)');

    await reporneșteTimerele(); // reia cronometrele pentru licitațiile dinamice neîncheiate
    server.listen(PORT, () => console.log(`🚀 Server pornit pe http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ Eroare conectare PostgreSQL:', err.message);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
