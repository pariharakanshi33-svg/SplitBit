/**
 * Prisma Database Client — Singleton
 * 
 * Ensures we only create one PrismaClient instance across the app,
 * preventing connection pool exhaustion during development with hot reload.
 */

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, reuse the same client across hot reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
