import 'server-only';
import { PrismaClient } from '@prisma/client';
const globalDb = globalThis as unknown as { beesDb?: PrismaClient };
export const db = globalDb.beesDb ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalDb.beesDb = db;
