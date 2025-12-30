import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

// Store in global to prevent multiple instances in both dev and production
// This is safe for Next.js even on bare metal servers because Next.js uses
// request-based execution, not long-lived connections per request
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

export default prisma;

