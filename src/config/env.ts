import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),

  auth: {
    secret: process.env.AUTH_SESSION_SECRET,
  },

  sms: {
    url: process.env.SMS_PROVIDER_URL,
    token: process.env.SMS_PROVIDER_TOKEN,
    sender: process.env.SMS_SENDER,
  },

  database: {
    server: required("DB_SERVER"),
    instanceName: required("DB_INSTANCE"),
    database: required("DB_DATABASE"),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),

    encrypt: process.env.DB_ENCRYPT === "true",

    trustServerCertificate:
      process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
  },
};