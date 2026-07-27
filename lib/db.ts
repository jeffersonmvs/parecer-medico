import { PrismaClient } from "@prisma/client";
import { DATABASE_URL } from "./server-secrets";

// Reuse the Prisma client across hot-reloads in development so we don't
// exhaust database connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Fall back to the schema's env("DATABASE_URL") when not provided here.
    datasourceUrl: DATABASE_URL || undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
