/**
 * Script de populare bază de date cu date de test
 * Rulează cu: npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./lib/prisma');

const seed = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL conectat');

    // Șterge datele vechi (ordinea contează din cauza foreign keys)
    await prisma.oferta.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.disponibilitate.deleteMany({});
    await prisma.lucrare.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('🗑️  Date vechi șterse');

    const parolaHash = await bcrypt.hash('parola123', 10);

    const dezvoltator = await prisma.user.create({
      data: {
        email: 'dezvoltator@test.ro',
        parola: parolaHash,
        nume: 'Imobiliare Construct SRL',
        cui: 'RO12345678',
        telefon: '0721000001',
        judet: 'București',
        rol: 'DEZVOLTATOR',
        verificat: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'subcontractor@test.ro',
        parola: parolaHash,
        nume: 'ProBuild Execuție SRL',
        cui: 'RO87654321',
        telefon: '0721000002',
        judet: 'Ilfov',
        rol: 'SUBCONTRACTOR',
        verificat: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'furnizor@test.ro',
        parola: parolaHash,
        nume: 'MaterialPro Distribuție SRL',
        cui: 'RO11223344',
        telefon: '0721000003',
        judet: 'Cluj',
        rol: 'FURNIZOR',
        verificat: true,
        descriere: 'Furnizor de materiale de construcții și echipamente pentru șantier.',
        categoriiServicii: ['Materiale de construcții', 'Echipamente'],
        judeteServicii: ['Cluj', 'Bihor', 'Sălaj'],
      },
    });

    await prisma.user.create({
      data: {
        email: 'admin@test.ro',
        parola: parolaHash,
        nume: 'Administrator ConstructBid',
        cui: 'RO00000000',
        telefon: '0721000000',
        judet: 'București',
        rol: 'ADMIN',
        verificat: true,
      },
    });

    console.log('👤 Utilizatori creați');

    await prisma.project.createMany({
      data: [
        {
          titlu: 'Construcție Complex Rezidențial P+6 Berceni',
          descriere: 'Execuție structură din beton armat și zidărie exterioară pentru 3 blocuri.',
          locatie: 'București, Sector 4',
          latitudine: 44.4029, longitudine: 26.1224,
          buget: '4.200.000 RON',
          bugetValoare: 4200000,
          zile: 96,
          urgent: true,
          categorie: 'rezidential',
          dezvoltatorId: dezvoltator.id,
          activ: true,
        },
        {
          titlu: 'Reabilitare Termică Bloc 14 Scări',
          descriere: 'Lucrări de izolație exterioară cu vată bazaltică de 15cm.',
          locatie: 'Cluj-Napoca',
          latitudine: 46.7712, longitudine: 23.6236,
          buget: '890.000 RON',
          bugetValoare: 890000,
          zile: 51,
          urgent: false,
          categorie: 'reabilitare',
          dezvoltatorId: dezvoltator.id,
          activ: true,
        },
        {
          titlu: 'Hală Industrială Depozitare 5000 mp',
          descriere: 'Montaj structură metalică prefabricată și închideri panouri sandwich.',
          locatie: 'Ploiești, Prahova',
          latitudine: 44.9367, longitudine: 26.0122,
          buget: '2.750.000 RON',
          bugetValoare: 2750000,
          zile: 141,
          urgent: false,
          categorie: 'industrial',
          dezvoltatorId: dezvoltator.id,
          activ: true,
        },
        {
          titlu: 'Licitație Live: Finisaje Interioare Bloc A',
          descriere: 'Lucrări de finisaje interioare (gleturi, vopsitorii, pardoseli) pentru 40 apartamente. Licitație deschisă.',
          locatie: 'București, Sector 3',
          latitudine: 44.4361, longitudine: 26.1027,
          buget: '650.000 RON',
          bugetValoare: 650000,
          zile: 45,
          urgent: false,
          categorie: 'Finisaje',
          dezvoltatorId: dezvoltator.id,
          activ: true,
          tipOfertare: 'dinamica',
          licitatieStart: new Date(),
          licitatieEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 ore de la rularea seed-ului
        },
      ],
    });

    console.log('🏗️  Proiecte create');
    console.log('\n─────────────────────────────────────────');
    console.log('✅ Date de test inserate cu succes!\n');
    console.log('Conturi de test:');
    console.log('  📧 dezvoltator@test.ro   | 🔑 parola123 | Rol: DEZVOLTATOR');
    console.log('  📧 subcontractor@test.ro | 🔑 parola123 | Rol: SUBCONTRACTOR');
    console.log('  📧 furnizor@test.ro      | 🔑 parola123 | Rol: FURNIZOR');
    console.log('  📧 admin@test.ro         | 🔑 parola123 | Rol: ADMIN');
    console.log('─────────────────────────────────────────\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Eroare seed:', err.message);
    process.exit(1);
  }
};

seed();
