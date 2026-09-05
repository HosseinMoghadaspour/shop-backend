import crypto from "node:crypto";
import {prisma} from "../../lib/prisma.js";
import {redis} from "../../lib/redis.js";

export type AuthKind = "customer" | "admin";

type OtpRecord = {
  codeHash: string;
  attempts: number;
  createdAt: number;
  expiresAt: number;
};

export type SessionRecord = {
  userId: number;
  kind: AuthKind;
  createdAt: number;
  expiresAt: number;
  ip?: string;
  userAgent?: string;
};

const OTP_TTL_SECONDS = 3 * 60;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const MAX_OTP_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60;

const SESSION_COOKIE_NAME = "shop_session";

function otpKey(kind: AuthKind, mobile: string) {
  return `auth:otp:${kind}:${mobile}`;
}

function otpCooldownKey(kind: AuthKind, mobile: string) {
  return `auth:otp:cooldown:${kind}:${mobile}`;
}

function sessionKey(token: string) {
  return `auth:session:${token}`;
}

function normalizeMobile(mobile: string) {
  return mobile.trim().replace(/\s+/g, "");
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(code: string) {
  return crypto
    .createHmac(
      "sha256",
      process.env.AUTH_SECRET ?? "change-this-secret",
    )
    .update(code)
    .digest("hex");
}

function generateSessionToken() {
  return crypto.randomBytes(48).toString("hex");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Find customer by mobile number.
 */
async function findCustomer(mobile: string) {
  return prisma.person.findFirst({
    where: {
      OR: [
        {
          MobileNumber: mobile,
        },
        {
          MobileForSMS: mobile,
        },
      ],
      IsActive: true,
    },
    select: {
      RowID: true,
      MobileNumber: true,
      MobileForSMS: true,
      IsActive: true,
    },
  });
}

/**
 * Find admin by mobile number.
 */
async function findAdmin(mobile: string) {
  return prisma.userInfo.findFirst({
    where: {
      Mobile: mobile,
      IsActive: true,
    },
    select: {
      RowID: true,
      Mobile: true,
      IsAdmin: true,
      IsActive: true,
    },
  });
}

/**
 * Check whether a user exists.
 */
export async function findUser(
  kind: AuthKind,
  mobile: string,
) {
  const normalizedMobile = normalizeMobile(mobile);

  if (kind === "customer") {
    return findCustomer(normalizedMobile);
  }

  return findAdmin(normalizedMobile);
}

/**
 * Request OTP.
 *
 * IMPORTANT:
 * For production, replace console.log with your SMS provider.
 */
export async function requestOtp(
  kind: AuthKind,
  mobile: string,
) {
  const normalizedMobile = normalizeMobile(mobile);

  if (!normalizedMobile) {
    throw new Error("شماره موبایل الزامی است.");
  }

  const user = await findUser(kind, normalizedMobile);

  if (!user) {
    throw new Error(
      kind === "customer"
        ? "کاربری با این شماره موبایل پیدا نشد."
        : "مدیر با این شماره موبایل پیدا نشد.",
    );
  }

  const cooldownKey = otpCooldownKey(
    kind,
    normalizedMobile,
  );

  const cooldown = await redis.get(cooldownKey);

  if (cooldown) {
    throw new Error(
      "لطفاً قبل از درخواست کد جدید کمی صبر کنید.",
    );
  }

  const code = generateOtp();

  const record: OtpRecord = {
    codeHash: hashOtp(code),
    attempts: 0,
    createdAt: Date.now(),
    expiresAt:
      Date.now() + OTP_TTL_SECONDS * 1000,
  };

  await redis.set(
    otpKey(kind, normalizedMobile),
    JSON.stringify(record),
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

  /**
   * TODO:
   * اینجا SMS provider خودت را صدا بزن.
   */
  console.log(
    `[AUTH OTP] ${kind} ${normalizedMobile}: ${code}`,
  );

  return {
    success: true,
    expiresIn: OTP_TTL_SECONDS,
    cooldown: OTP_COOLDOWN_SECONDS,

    /**
     * فقط برای development.
     *
     * در production این مقدار را حذف کن.
     */
    ...(process.env.NODE_ENV !== "production"
      ? {
          developmentOtp: code,
        }
      : {}),
  };
}

/**
 * Verify OTP and create session.
 */
export async function verifyOtp(params: {
  kind: AuthKind;
  mobile: string;
  code: string;
  ip?: string;
  userAgent?: string;
}) {
  const {
    kind,
    code,
    ip,
    userAgent,
  } = params;

  const mobile = normalizeMobile(params.mobile);

  if (!mobile || !code) {
    throw new Error(
      "شماره موبایل و کد تایید الزامی است.",
    );
  }

  const user = await findUser(kind, mobile);

  if (!user) {
    throw new Error(
      kind === "customer"
        ? "کاربر پیدا نشد."
        : "مدیر پیدا نشد.",
    );
  }

  const key = otpKey(kind, mobile);

  const raw = await redis.get(key);

  if (!raw) {
    throw new Error(
      "کد تایید منقضی شده یا وجود ندارد.",
    );
  }

  const otp: OtpRecord = JSON.parse(raw);

  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    await redis.del(key);

    throw new Error(
      "تعداد تلاش‌های مجاز تمام شده است.",
    );
  }

  const receivedHash = hashOtp(code);

  if (!safeEqual(receivedHash, otp.codeHash)) {
    otp.attempts += 1;

    await redis.set(
      key,
      JSON.stringify(otp),
      {
        EX: Math.max(
          1,
          Math.ceil(
            (otp.expiresAt - Date.now()) / 1000,
          ),
        ),
      },
    );

    throw new Error("کد تایید اشتباه است.");
  }

  await redis.del(key);

  const userId = user.RowID;

  const token = generateSessionToken();

  const now = Date.now();

  const session: SessionRecord = {
    userId,
    kind,
    createdAt: now,
    expiresAt:
      now + SESSION_TTL_SECONDS * 1000,
    ip,
    userAgent,
  };

  await redis.set(
    sessionKey(token),
    JSON.stringify(session),
    {
      EX: SESSION_TTL_SECONDS,
    },
  );

  return {
    token,
    session,
    user,
  };
}

/**
 * Get session from Redis.
 */
export async function getSession(
  token: string,
): Promise<SessionRecord | null> {
  if (!token) {
    return null;
  }

  const raw = await redis.get(
    sessionKey(token),
  );

  if (!raw) {
    return null;
  }

  try {
    const session: SessionRecord =
      JSON.parse(raw);

    if (
      !session.userId ||
      !session.kind ||
      session.expiresAt <= Date.now()
    ) {
      await redis.del(sessionKey(token));
      return null;
    }

    return session;
  } catch {
    await redis.del(sessionKey(token));
    return null;
  }
}

/**
 * Delete session.
 */
export async function logout(
  token: string,
) {
  if (!token) {
    return;
  }

  await redis.del(sessionKey(token));
}

/**
 * Get currently authenticated user.
 */
export async function getCurrentUser(
  token: string,
) {
  const session = await getSession(token);

  if (!session) {
    return null;
  }

  if (session.kind === "customer") {
    return prisma.person.findUnique({
      where: {
        RowID: session.userId,
      },
      select: {
        RowID: true,
        MobileNumber: true,
        MobileForSMS: true,
        IsActive: true,
      },
    });
  }

  return prisma.userInfo.findUnique({
    where: {
      RowID: session.userId,
    },
    select: {
      RowID: true,
      Mobile: true,
      IsAdmin: true,
      IsActive: true,
    },
  });
}

export {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
};
