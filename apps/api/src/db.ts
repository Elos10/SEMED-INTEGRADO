import {PrismaClient} from '@prisma/client';

const prismaGlobal=globalThis as unknown as {omrPrisma?:PrismaClient};
export const db=prismaGlobal.omrPrisma??new PrismaClient();
prismaGlobal.omrPrisma=db;
