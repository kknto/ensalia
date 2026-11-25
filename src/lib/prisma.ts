import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient();

  // Optimización de concurrencia SQLite (WAL, timeouts, integridad referencial)
  // Permite múltiples lecturas simultáneas y previene bloqueos SQLITE_BUSY con dispositivos externos
  void Promise.allSettled([
    client.$executeRawUnsafe("PRAGMA journal_mode = WAL;"),
    client.$executeRawUnsafe("PRAGMA synchronous = NORMAL;"),
    client.$executeRawUnsafe("PRAGMA busy_timeout = 5000;"),
    client.$executeRawUnsafe("PRAGMA foreign_keys = ON;"),
  ]);

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
