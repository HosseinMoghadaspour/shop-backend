import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

const adapter = new PrismaMssql({
  server: env.database.server,
  database: env.database.database,
  user: env.database.user,
  password: env.database.password,

  options: {
    instanceName: env.database.instanceName,
    encrypt: env.database.encrypt,
    trustServerCertificate:
      env.database.trustServerCertificate,
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
});

export const prisma = new PrismaClient({
  adapter,
});