const { PrismaClient } = require('@prisma/client');

// Un singur PrismaClient partajat în toată aplicația (evită epuizarea
// conexiunilor la baza de date în dev, unde modulele se pot reîncărca).
const prisma = global.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

module.exports = prisma;
