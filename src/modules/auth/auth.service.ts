import crypto from "node:crypto";

import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type AuthKind = "customer" | "admin";

export type SessionRole = "CUSTOMER" | "ADMIN";

export interface SessionRecord {
  sessionId: string;
  userId: number;
  kind: AuthKind;
  createdAt: number;
  lastActivityAt: number;
  absoluteExpiresAt: number;
  idleExpiresAt: number;
  expiresAt: number;
  ip?: string;
  userAgent?: string;
}

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

export const SESSION_COOKIE_NAME = "shop_session";

export const CUSTOMER_SESSION_TTL_SECONDS =
  60 * 60 * 24 * 30;

export const SESSION_TTL_SECONDS =
  CUSTOMER_SESSION_TTL_SECONDS;

const OTP_TTL_SECONDS = 60 * 3;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

const OTP_PHONE_LIMIT = 5;
const OTP_PHONE_WINDOW_SECONDS = 60 * 15;

const OTP_IP_LIMIT = 20;
const OTP_IP_WINDOW_SECONDS = 60 * 15;

const CUSTOMER_ABSOLUTE_SECONDS =
  60 * 60 * 24 * 30;

const CUSTOMER_IDLE_SECONDS =
  60 * 60 * 24 * 7;

const ADMIN_ABSOLUTE_SECONDS =
  60 * 60 * 24 * 7;

const ADMIN_IDLE_SECONDS =
  60 * 60 * 8;

const MAX_USER_AGENT_LENGTH = 512;

/* -------------------------------------------------------------------------- */
/* Redis Keys                                                                 */
/* -------------------------------------------------------------------------- */

function otpKey(
  kind: AuthKind,
  phone: string,
) {
  return `auth:otp:${kind}:${phone}`;
}

function otpCooldownKey(
  kind: AuthKind,
  phone: string,
) {
  return `auth:otp:cooldown:${kind}:${phone}`;
}

function otpPhoneRateKey(
  kind: AuthKind,
  phone: string,
) {
  return `auth:otp:rate:phone:${kind}:${phone}`;
}

function otpIpRateKey(
  kind: AuthKind,
  ip: string,
) {
  return `auth:otp:rate:ip:${kind}:${ip}`;
}

function sessionKey(
  tokenHash: string,
) {
  return `auth:session:${tokenHash}`;
}

function sessionOwnerKey(
  kind: AuthKind,
  userId: number,
) {
  return `auth:sessions:${kind}:${userId}`;
}

/* -------------------------------------------------------------------------- */
/* Secret                                                                     */
/* -------------------------------------------------------------------------- */

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is required in production.",
      );
    }

    return "development-only-auth-secret-change-me";
  }

  return secret;
}

/* -------------------------------------------------------------------------- */
/* Crypto                                                                     */
/* -------------------------------------------------------------------------- */

function hashToken(
  token: string,
): string {
  return crypto
    .createHmac(
      "sha256",
      getAuthSecret(),
    )
    .update(token)
    .digest("hex");
}

function hashOtp(
  kind: AuthKind,
  phone: string,
  otp: string,
): string {
  return crypto
    .createHmac(
      "sha256",
      getAuthSecret(),
    )
    .update(`${kind}:${phone}:${otp}`)
    .digest("hex");
}

function safeEqual(
  a: string,
  b: string,
): boolean {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");

  if (aa.length !== bb.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    aa,
    bb,
  );
}

function generateSessionToken(): string {
  return crypto
    .randomBytes(32)
    .toString("base64url");
}

function generateSessionId(): string {
  return crypto
    .randomBytes(16)
    .toString("hex");
}

function generateOtp(): string {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export function normalizePhone(
  phone: string,
): string {
  return phone
    .trim()
    .replace(/\s+/g, "");
}

function normalizeUserAgent(
  userAgent?: string,
): string | undefined {
  if (!userAgent) {
    return undefined;
  }

  return userAgent.slice(
    0,
    MAX_USER_AGENT_LENGTH,
  );
}

function getSessionConfig(
  kind: AuthKind,
) {
  if (kind === "admin") {
    return {
      absoluteSeconds:
        ADMIN_ABSOLUTE_SECONDS,
      idleSeconds:
        ADMIN_IDLE_SECONDS,
    };
  }

  return {
    absoluteSeconds:
      CUSTOMER_ABSOLUTE_SECONDS,
    idleSeconds:
      CUSTOMER_IDLE_SECONDS,
  };
}

/* -------------------------------------------------------------------------- */
/* Customer / Admin Lookup                                                    */
/* -------------------------------------------------------------------------- */

export async function findCustomer(
  phone: string,
) {
  const normalizedPhone =
    normalizePhone(phone);

  return prisma.person.findFirst({
    where: {
      IsActive: true,

      OR: [
        {
          MobileNumber:
            normalizedPhone,
        },
        {
          MobileForSMS:
            normalizedPhone,
        },
      ],
    },
  });
}

export async function findAdmin(
  phone: string,
) {
  const normalizedPhone =
    normalizePhone(phone);

  return prisma.userInfo.findFirst({
    where: {
      Mobile:
        normalizedPhone,

      IsActive:
        true,

      IsAdmin:
        true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* OTP Rate Limit                                                             */
/* -------------------------------------------------------------------------- */

async function checkOtpRateLimit(
  kind: AuthKind,
  phone: string,
  ip: string,
) {
  const phoneKey =
    otpPhoneRateKey(
      kind,
      phone,
    );

  const ipKey =
    otpIpRateKey(
      kind,
      ip,
    );

  const phoneCount =
    await redis.incr(phoneKey);

  if (phoneCount === 1) {
    await redis.expire(
      phoneKey,
      OTP_PHONE_WINDOW_SECONDS,
    );
  }

  if (
    phoneCount >
    OTP_PHONE_LIMIT
  ) {
    throw new Error(
      "تعداد درخواست کد تأیید برای این شماره بیش از حد مجاز است.",
    );
  }

  const ipCount =
    await redis.incr(ipKey);

  if (ipCount === 1) {
    await redis.expire(
      ipKey,
      OTP_IP_WINDOW_SECONDS,
    );
  }

  if (
    ipCount >
    OTP_IP_LIMIT
  ) {
    throw new Error(
      "تعداد درخواست کد تأیید از این IP بیش از حد مجاز است.",
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Request OTP                                                                */
/* -------------------------------------------------------------------------- */

export async function requestOtp(
  kind: AuthKind,
  phone: string,
  ip: string,
) {
  const normalizedPhone =
    normalizePhone(phone);

  if (!normalizedPhone) {
    throw new Error(
      "شماره موبایل الزامی است.",
    );
  }

  const user =
    kind === "customer"
      ? await findCustomer(
          normalizedPhone,
        )
      : await findAdmin(
          normalizedPhone,
        );

  /**
   * Do not reveal account existence.
   */
  if (!user) {
    return {
      success: true,
      message:
        "اگر این شماره قابل استفاده باشد، کد تأیید ارسال خواهد شد.",
    };
  }

  const cooldownKey =
    otpCooldownKey(
      kind,
      normalizedPhone,
    );

  const cooldownExists =
    await redis.exists(
      cooldownKey,
    );

  if (cooldownExists) {
    throw new Error(
      "لطفاً قبل از درخواست کد جدید کمی صبر کنید.",
    );
  }

  await checkOtpRateLimit(
    kind,
    normalizedPhone,
    ip,
  );

  const otp =
    generateOtp();

  const otpHash =
    hashOtp(
      kind,
      normalizedPhone,
      otp,
    );

  const key =
    otpKey(
      kind,
      normalizedPhone,
    );

  const payload =
    JSON.stringify({
      hash: otpHash,
      attempts: 0,
      createdAt: Date.now(),
    });

  /**
   * node-redis v4:
   *
   * set(key, value, { EX: seconds })
   */
  await redis.set(
    key,
    payload,
    {
      EX: OTP_TTL_SECONDS,
    },
  );

  await redis.set(
    cooldownKey,
    "1",
    {
      EX: OTP_COOLDOWN_SECONDS,
    },
  );

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    console.log(
      `[AUTH OTP] ${kind} ${normalizedPhone}: ${otp}`,
    );

    return {
      success: true,
      message:
        "کد تأیید ایجاد شد.",
      developmentOtp:
        otp,
    };
  }

  /**
   * TODO:
   * SMS provider.
   */
  return {
    success: true,
    message:
      "کد تأیید ارسال شد.",
  };
}

/* -------------------------------------------------------------------------- */
/* Verify OTP                                                                 */
/* -------------------------------------------------------------------------- */

export async function verifyOtp(
  kind: AuthKind,
  phone: string,
  otp: string,
  ip?: string,
  userAgent?: string,
) {
  const normalizedPhone =
    normalizePhone(phone);

  if (!normalizedPhone) {
    throw new Error(
      "شماره موبایل الزامی است.",
    );
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new Error(
      "کد تأیید نامعتبر است.",
    );
  }

  const key =
    otpKey(
      kind,
      normalizedPhone,
    );

  const raw =
    await redis.get(key);

  if (!raw) {
    throw new Error(
      "کد تأیید منقضی شده یا وجود ندارد.",
    );
  }

  let data: {
    hash: string;
    attempts: number;
    createdAt: number;
  };

  try {
    data =
      JSON.parse(raw);
  } catch {
    await redis.del(key);

    throw new Error(
      "اطلاعات کد تأیید نامعتبر است.",
    );
  }

  if (
    data.attempts >=
    OTP_MAX_ATTEMPTS
  ) {
    await redis.del(key);

    throw new Error(
      "تعداد تلاش‌های مجاز برای این کد به پایان رسیده است.",
    );
  }

  const incomingHash =
    hashOtp(
      kind,
      normalizedPhone,
      otp,
    );

  const valid =
    safeEqual(
      data.hash,
      incomingHash,
    );

  if (!valid) {
    data.attempts += 1;

    const ttl =
      await redis.ttl(key);

    if (ttl > 0) {
      await redis.set(
        key,
        JSON.stringify(data),
        {
          EX: ttl,
        },
      );
    }

    if (
      data.attempts >=
      OTP_MAX_ATTEMPTS
    ) {
      await redis.del(key);

      throw new Error(
        "تعداد تلاش‌های مجاز برای این کد به پایان رسیده است.",
      );
    }

    throw new Error(
      "کد تأیید اشتباه است.",
    );
  }

  /**
   * OTP is one-time.
   */
  await redis.del(key);

  const user =
    kind === "customer"
      ? await findCustomer(
          normalizedPhone,
        )
      : await findAdmin(
          normalizedPhone,
        );

  if (!user) {
    throw new Error(
      "کاربر فعال پیدا نشد.",
    );
  }

  const token =
    generateSessionToken();

  const tokenHash =
    hashToken(token);

  const sessionId =
    generateSessionId();

  const now =
    Date.now();

  const config =
    getSessionConfig(kind);

  const absoluteExpiresAt =
    now +
    config.absoluteSeconds *
      1000;

  const idleExpiresAt =
    Math.min(
      now +
        config.idleSeconds *
          1000,
      absoluteExpiresAt,
    );

  const session: SessionRecord = {
    sessionId,

    userId:
      user.RowID,

    kind,

    createdAt:
      now,

    lastActivityAt:
      now,

    absoluteExpiresAt,

    idleExpiresAt,

    /**
     * Compatibility with old controller.
     */
    expiresAt:
      absoluteExpiresAt,

    ip,

    userAgent:
      normalizeUserAgent(
        userAgent,
      ),
  };

  const ttlSeconds =
    Math.max(
      1,
      Math.ceil(
        (idleExpiresAt - now) /
          1000,
      ),
    );

  /* ---------------------------------------------------------------------- */
  /* Store session                                                           */
  /* ---------------------------------------------------------------------- */

  await redis.set(
    sessionKey(tokenHash),
    JSON.stringify(session),
    {
      EX: ttlSeconds,
    },
  );

  /* ---------------------------------------------------------------------- */
  /* Add session to owner index                                              */
  /* ---------------------------------------------------------------------- */

  const ownerKey =
    sessionOwnerKey(
      kind,
      user.RowID,
    );

  await redis.zAdd(
    ownerKey,
    {
      score:
        absoluteExpiresAt,
      value:
        tokenHash,
    },
  );

  await redis.expire(
    ownerKey,
    config.absoluteSeconds +
      60 * 60,
  );

  return {
    token,
    session,
    user,
  };
}

/* -------------------------------------------------------------------------- */
/* Get Session                                                                */
/* -------------------------------------------------------------------------- */

export async function getSession(
  token: string,
): Promise<SessionRecord | null> {
  if (!token) {
    return null;
  }

  const tokenHash =
    hashToken(token);

  const raw =
    await redis.get(
      sessionKey(tokenHash),
    );

  if (!raw) {
    return null;
  }

  let session: SessionRecord;

  try {
    session =
      JSON.parse(raw);
  } catch {
    await redis.del(
      sessionKey(tokenHash),
    );

    return null;
  }

  const now =
    Date.now();

  if (
    now >=
    session.absoluteExpiresAt
  ) {
    await revokeSession(
      token,
    );

    return null;
  }

  if (
    now >=
    session.idleExpiresAt
  ) {
    await revokeSession(
      token,
    );

    return null;
  }

  /**
   * Compatibility:
   * old controller expects expiresAt.
   */
  session.expiresAt =
    session.absoluteExpiresAt;

  return session;
}

/* -------------------------------------------------------------------------- */
/* Refresh Session                                                            */
/* -------------------------------------------------------------------------- */

export async function refreshSession(
  token: string,
): Promise<SessionRecord | null> {
  const session =
    await getSession(token);

  if (!session) {
    return null;
  }

  const now =
    Date.now();

  const config =
    getSessionConfig(
      session.kind,
    );

  const newIdleExpiresAt =
    Math.min(
      now +
        config.idleSeconds *
          1000,
      session.absoluteExpiresAt,
    );

  session.lastActivityAt =
    now;

  session.idleExpiresAt =
    newIdleExpiresAt;

  session.expiresAt =
    session.absoluteExpiresAt;

  const remainingAbsolute =
    Math.max(
      1,
      Math.ceil(
        (session.absoluteExpiresAt -
          now) /
          1000,
      ),
    );

  const remainingIdle =
    Math.max(
      1,
      Math.ceil(
        (session.idleExpiresAt -
          now) /
          1000,
      ),
    );

  const ttlSeconds =
    Math.min(
      remainingAbsolute,
      remainingIdle,
    );

  const tokenHash =
    hashToken(token);

  await redis.set(
    sessionKey(tokenHash),
    JSON.stringify(session),
    {
      EX: ttlSeconds,
    },
  );

  return session;
}

/* -------------------------------------------------------------------------- */
/* Logout                                                                     */
/* -------------------------------------------------------------------------- */

export async function logout(
  token: string,
): Promise<void> {
  await revokeSession(
    token,
  );
}

/* -------------------------------------------------------------------------- */
/* Revoke Session                                                             */
/* -------------------------------------------------------------------------- */

export async function revokeSession(
  tokenOrSession:
    | string
    | SessionRecord,
): Promise<void> {
  let tokenHash: string;
  let session:
    | SessionRecord
    | null = null;

  if (
    typeof tokenOrSession ===
    "string"
  ) {
    tokenHash =
      hashToken(
        tokenOrSession,
      );

    const raw =
      await redis.get(
        sessionKey(
          tokenHash,
        ),
      );

    if (raw) {
      try {
        session =
          JSON.parse(raw);
      } catch {
        session = null;
      }
    }
  } else {
    session =
      tokenOrSession;

    /**
     * revokeSession normally receives
     * a token, but accepting a session
     * object makes the function safer
     * for internal usage.
     *
     * The session object itself does not
     * contain the token hash, so there is
     * nothing to delete from Redis here.
     */
    return;
  }

  if (session) {
    await redis.zRem(
      sessionOwnerKey(
        session.kind,
        session.userId,
      ),
      tokenHash,
    );
  }

  await redis.del(
    sessionKey(tokenHash),
  );
}

/* -------------------------------------------------------------------------- */
/* Revoke All Sessions                                                        */
/* -------------------------------------------------------------------------- */

export async function revokeAllSessions(
  kind: AuthKind,
  userId: number,
): Promise<void> {
  const ownerKey =
    sessionOwnerKey(
      kind,
      userId,
    );

  const tokenHashes =
    await redis.zRange(
      ownerKey,
      0,
      -1,
    );

  if (
    tokenHashes.length === 0
  ) {
    await redis.del(
      ownerKey,
    );

    return;
  }

  const multi =
    redis.multi();

  for (
    const tokenHash of
      tokenHashes
  ) {
    multi.del(
      sessionKey(
        tokenHash,
      ),
    );
  }

  multi.del(ownerKey);

  await multi.exec();
}

/* -------------------------------------------------------------------------- */
/* List Sessions                                                              */
/* -------------------------------------------------------------------------- */

export async function listSessions(
  kind: AuthKind,
  userId: number,
): Promise<SessionRecord[]> {
  const ownerKey =
    sessionOwnerKey(
      kind,
      userId,
    );

  const tokenHashes =
    await redis.zRange(
      ownerKey,
      0,
      -1,
    );

  if (
    tokenHashes.length === 0
  ) {
    return [];
  }

  const multi =
    redis.multi();

  for (
    const tokenHash of
      tokenHashes
  ) {
    multi.get(
      sessionKey(
        tokenHash,
      ),
    );
  }

  const results =
    await multi.exec();

  const sessions:
    SessionRecord[] = [];

  const expiredHashes:
    string[] = [];

  const now =
    Date.now();

  for (
    let i = 0;
    i < results.length;
    i++
  ) {
    const raw =
      results[i];

    const tokenHash =
      tokenHashes[i];

    if (
      typeof raw !==
        "string" ||
      !raw
    ) {
      expiredHashes.push(
        tokenHash,
      );

      continue;
    }

    try {
      const session:
        SessionRecord =
        JSON.parse(raw);

      if (
        now >=
          session.absoluteExpiresAt ||
        now >=
          session.idleExpiresAt
      ) {
        expiredHashes.push(
          tokenHash,
        );

        continue;
      }

      session.expiresAt =
        session.absoluteExpiresAt;

      sessions.push(
        session,
      );
    } catch {
      expiredHashes.push(
        tokenHash,
      );
    }
  }

  if (
    expiredHashes.length > 0
  ) {
    const cleanup =
      redis.multi();

    for (
      const hash of
        expiredHashes
    ) {
      cleanup.del(
        sessionKey(hash),
      );

      cleanup.zRem(
        ownerKey,
        hash,
      );
    }

    await cleanup.exec();
  }

  return sessions;
}

/* -------------------------------------------------------------------------- */
/* Current User                                                               */
/* -------------------------------------------------------------------------- */

export async function getCurrentUser(
  session: SessionRecord,
) {
  if (
    session.kind ===
    "customer"
  ) {
    const customer =
      await prisma.person.findUnique(
        {
          where: {
            RowID:
              session.userId,
          },
        },
      );

    if (
      !customer ||
      !customer.IsActive
    ) {
      return null;
    }

    return {
      kind:
        "customer" as const,

      user:
        customer,
    };
  }

  const admin =
    await prisma.userInfo.findUnique(
      {
        where: {
          RowID:
            session.userId,
        },
      },
    );

  if (
    !admin ||
    !admin.IsActive ||
    !admin.IsAdmin
  ) {
    return null;
  }

  return {
    kind:
      "admin" as const,

    user:
      admin,
  };
}


export {
  hashToken,
};
