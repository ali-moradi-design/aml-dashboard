import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

export type Db = PrismaClient;

export const createDb = (databaseUrl: string): Db =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
