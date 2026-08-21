import sql from "mssql";
import { env } from "../config/env.js";

const config: sql.config = {
  server: env.database.server,

  options: {
    instanceName: env.database.instanceName,
    encrypt: env.database.encrypt,
    trustServerCertificate: env.database.trustServerCertificate
  },

  database: env.database.database,

  user: env.database.user,
  password: env.database.password,

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool: sql.ConnectionPool | null = null;

export async function getDb(): Promise<sql.ConnectionPool> {
  if (pool?.connected) {
    return pool;
  }

  pool = await sql.connect(config);

  console.log("✅ SQL Server connected");

  return pool;
}

export { sql };