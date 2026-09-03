import {
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { env } from "../../config/env.js";

export type AuthKind = "customer" | "admin";

export type SessionRole = "ADMIN" | "CUSTOMER";

const otpLifetimeMs = 3 * 60 * 1000;
const otpCooldownMs = 60 * 1000;

const maxOtpAttempts = 5;

const phoneRateLimitWindowMs = 15 * 60 * 1000;
const phoneRateLimitMax = 5;

const ipRateLimitWindowMs = 15 * 60 * 1000;
const ipRateLimitMax = 20;

const customerSessionAbsoluteMs =
  30 * 24 * 60 * 60 * 1000;

const customerSessionIdleMs =
  7 * 24 * 60 * 60 * 1000;

const adminSessionAbsoluteMs =
  7 * 24 * 60 * 60 * 1000;

const adminSessionIdleMs =
  8 * 60 * 60 * 1000;

const maxUserAgentLength = 512;

export type RedisSessionRecord = {
  id: string;
  tokenHash: string;
  role: SessionRole;

  personId?: number | null;
  userInfoId?: number | null;

  expiresAt: number;
  createdAt: number;
  lastSeenAt: number;

  ipAddress?: string | null;
  userAgent?: string | null;
};

type RedisOtpRecord = {
  phoneNumber: string;
  codeHash: string;
  attempts: number;
  expiresAt: string;
  createdAt: string;
};



const touchSessionScript = `
local raw = redis.call("GET", KEYS[1])

if not raw then
  return { "NOT_FOUND" }
end

local session = cjson.decode(raw)

local now = tonumber(ARGV[1])

local idleMs

if session.role == "ADMIN" then
  idleMs = tonumber(ARGV[2])
elseif session.role == "CUSTOMER" then
  idleMs = tonumber(ARGV[3])
else
  redis.call("DEL", KEYS[1])
  return { "INVALID_ROLE" }
end

local expiresAt = tonumber(session.expiresAt)
local lastSeenAt = tonumber(session.lastSeenAt)

if not expiresAt or not lastSeenAt then
  redis.call("DEL", KEYS[1])
  return { "INVALID_SESSION" }
end

if not idleMs or idleMs <= 0 then
  redis.call("DEL", KEYS[1])
  return { "INVALID_IDLE_TIMEOUT" }
end

if now >= expiresAt then
  redis.call("DEL", KEYS[1])
  return { "ABSOLUTE_EXPIRED" }
end

if now - lastSeenAt >= idleMs then
  redis.call("DEL", KEYS[1])
  return { "IDLE_EXPIRED" }
end

session.lastSeenAt = now

local remainingAbsolute = expiresAt - now
local ttlMs = math.min(remainingAbsolute, idleMs)

if ttlMs <= 0 then
  redis.call("DEL", KEYS[1])
  return { "EXPIRED" }
end

redis.call(
  "SET",
  KEYS[1],
  cjson.encode(session),
  "PX",
  ttlMs
)

return {
  "OK",
  cjson.encode(session)
}
`;


/**
 * =========================================================
 * SECRET
 * =========================================================
 */

function secret() {
  if (env.auth.secret) {
    return env.auth.secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SESSION_SECRET is required"
    );
  }

  return "local-development-auth-secret";
}

/**
 * =========================================================
 * PHONE
 * =========================================================
 */

export function normalizePhone(value: string) {
  return value
    .trim()
    .replace(
      /[\u06F0-\u06F9]/g,
      (digit) =>
        String(
          digit.charCodeAt(0) - 0x06f0
        )
    )
    .replace(
      /[\u0660-\u0669]/g,
      (digit) =>
        String(
          digit.charCodeAt(0) - 0x0660
        )
    )
    .replace(/[^\d+]/g, "");
}

/**
 * =========================================================
 * HASH
 * =========================================================
 */

function hash(value: string) {
  return createHmac("sha256", secret())
    .update(value)
    .digest("hex");
}

function sameHash(
  left: string,
  right: string
) {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");

    return (
      a.length === b.length &&
      timingSafeEqual(a, b)
    );
  } catch {
    return false;
  }
}

/**
 * =========================================================
 * REDIS KEYS
 * =========================================================
 */

function otpKey(
  kind: AuthKind,
  phoneNumber: string
) {
  return `auth:otp:${kind}:${phoneNumber}`;
}

function otpCooldownKey(
  kind: AuthKind,
  phoneNumber: string
) {
  return `auth:otp:cooldown:${kind}:${phoneNumber}`;
}

function otpPhoneRateKey(
  kind: AuthKind,
  phoneNumber: string
) {
  return `auth:otp:rate:phone:${kind}:${phoneNumber}`;
}

function otpIpRateKey(
  kind: AuthKind,
  ipAddress: string
) {
  return `auth:otp:rate:ip:${kind}:${ipAddress}`;
}

function sessionKey(
  tokenHash: string
) {
  return `auth:session:${tokenHash}`;
}

/**
 * Session index.
 *
 * Sorted Set:
 *
 * score  = absolute expiration timestamp
 * member = tokenHash
 *
 * This allows us to revoke every active session
 * belonging to a specific account.
 */

function userSessionsKey(
  kind: AuthKind,
  ownerId: number
) {
  return `auth:sessions:${kind}:${ownerId}`;
}

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function toRedisExpiryMs(
  date: Date
) {
  return Math.max(
    1,
    date.getTime() - Date.now()
  );
}

function normalizeUserAgent(
  userAgent?: string | null
) {
  if (!userAgent) {
    return null;
  }

  return userAgent.slice(
    0,
    maxUserAgentLength
  );
}

function getSessionTimeouts(
  kind: AuthKind
) {
  if (kind === "admin") {
    return {
      absoluteMs:
        adminSessionAbsoluteMs,
      idleMs:
        adminSessionIdleMs,
    };
  }

  return {
    absoluteMs:
      customerSessionAbsoluteMs,
    idleMs:
      customerSessionIdleMs,
  };
}

/**
 * =========================================================
 * OWNER
 * =========================================================
 */

export async function findPhoneOwner(
  kind: AuthKind,
  rawPhone: string
) {
  const phone =
    normalizePhone(rawPhone);

  if (kind === "admin") {
    return prisma.userInfo.findFirst({
      where: {
        Mobile: phone,
        IsActive: true,
        IsAdmin: true,
        AdminSite: true,
      },
    });
  }

  return prisma.person.findFirst({
    where: {
      IsActive: true,
      OR: [
        {
          MobileNumber: phone,
        },
        {
          MobileForSMS: phone,
        },
      ],
    },
  });
}


async function sendOtp(
  phoneNumber: string,
  code: string
) {
  if (
    !env.sms.url ||
    !env.sms.token
  ) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      return;
    }

    throw new Error(
      "SMS provider is not configured"
    );
  }

  const response =
    await fetch(env.sms.url, {
      method: "POST",

      headers: {
        "content-type":
          "application/json",

        authorization:
          `Bearer ${env.sms.token}`,
      },

      body: JSON.stringify({
        to: phoneNumber,
        code,
        sender: env.sms.sender,
      }),
    });

  if (!response.ok) {
    throw new Error(
      "SMS provider rejected the request"
    );
  }
}

/**
 * =========================================================
 * RATE LIMIT
 * =========================================================
 */

async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
) {
  const count =
    await redis.incr(key);

  if (count === 1) {
    await redis.pExpire(
      key,
      windowMs
    );
  }

  return count <= max;
}

/**
 * =========================================================
 * COOLDOWN
 * =========================================================
 */

async function acquireCooldown(
  kind: AuthKind,
  phoneNumber: string
) {
  const key =
    otpCooldownKey(
      kind,
      phoneNumber
    );

  const result =
    await redis.set(
      key,
      "1",
      {
        PX: otpCooldownMs,
        NX: true,
      }
    );

  return result === "OK";
}

async function releaseCooldown(
  kind: AuthKind,
  phoneNumber: string
) {
  await redis.del(
    otpCooldownKey(
      kind,
      phoneNumber
    )
  );
}

/**
 * =========================================================
 * REQUEST OTP
 * =========================================================
 */

export type RequestOtpResult =
  | {
      status: "sent";
      owner: NonNullable<
        Awaited<
          ReturnType<
            typeof findPhoneOwner
          >
        >
      >;
    }
  | {
      status: "rate_limited";
    }
  | {
      status: "cooldown";
    }
  | {
      status: "not_found";
    };

export async function requestOtp(
  kind: AuthKind,
  rawPhone: string,
  ipAddress: string
): Promise<RequestOtpResult> {
  const phoneNumber =
    normalizePhone(rawPhone);

  /**
   * IP rate limit.
   */
  const ipAllowed =
    await checkRateLimit(
      otpIpRateKey(
        kind,
        ipAddress
      ),
      ipRateLimitMax,
      ipRateLimitWindowMs
    );

  if (!ipAllowed) {
    return {
      status: "rate_limited",
    };
  }

  /**
   * Phone rate limit.
   */
  const phoneAllowed =
    await checkRateLimit(
      otpPhoneRateKey(
        kind,
        phoneNumber
      ),
      phoneRateLimitMax,
      phoneRateLimitWindowMs
    );

  if (!phoneAllowed) {
    return {
      status: "rate_limited",
    };
  }

  /**
   * Cooldown.
   */
  const cooldownAcquired =
    await acquireCooldown(
      kind,
      phoneNumber
    );

  if (!cooldownAcquired) {
    return {
      status: "cooldown",
    };
  }

  /**
   * Find owner.
   */
  const owner =
    await findPhoneOwner(
      kind,
      phoneNumber
    );

  if (!owner) {
    /**
     * IMPORTANT:
     *
     * We release the cooldown here.
     *
     * Customer creation is handled by
     * the controller, after which it can
     * call requestOtp again.
     */
    await releaseCooldown(
      kind,
      phoneNumber
    );

    return {
      status: "not_found",
    };
  }

  const code = String(
    randomInt(
      100000,
      1000000
    )
  );

  const expiresAt =
    new Date(
      Date.now() +
        otpLifetimeMs
    );

  const otp: RedisOtpRecord = {
    phoneNumber,

    codeHash:
      hash(code),

    attempts: 0,

    expiresAt:
      expiresAt.toISOString(),

    createdAt:
      new Date().toISOString(),
  };

  const key =
    otpKey(
      kind,
      phoneNumber
    );

  try {
    await redis.set(
      key,
      JSON.stringify(otp),
      {
        PX:
          toRedisExpiryMs(
            expiresAt
          ),
      }
    );

    await sendOtp(
      phoneNumber,
      code
    );

    return {
      status: "sent",
      owner,
    };
  } catch (error) {
    await redis.del(key);

    await releaseCooldown(
      kind,
      phoneNumber
    );

    throw error;
  }
}

/**
 * =========================================================
 * ATOMIC OTP CONSUMPTION
 * =========================================================
 *
 * This Lua script makes OTP verification atomic.
 *
 * Return values:
 *
 * -1 = OTP does not exist
 * -2 = malformed OTP
 * -3 = expired
 * -4 = max attempts reached
 *  0 = wrong OTP
 *  1 = correct OTP
 *
 * IMPORTANT:
 *
 * Redis executes Lua scripts atomically.
 * Therefore two simultaneous requests cannot
 * both successfully consume the same OTP.
 */

const verifyOtpScript = `
local key = KEYS[1]
local incomingHash = ARGV[1]
local maxAttempts = tonumber(ARGV[2])

local raw = redis.call("GET", key)

if not raw then
  return -1
end

local otp = cjson.decode(raw)

if not otp then
  redis.call("DEL", key)
  return -2
end

local attempts = tonumber(otp.attempts or 0)

if attempts >= maxAttempts then
  redis.call("DEL", key)
  return -4
end

if otp.expiresAt then
  local expiresAtMs = 0

  -- ISO date is validated by application layer.
  -- Redis TTL remains the primary expiration mechanism.
end

if otp.codeHash ~= incomingHash then
  attempts = attempts + 1

  if attempts >= maxAttempts then
    redis.call("DEL", key)
    return -4
  end

  otp.attempts = attempts

  local ttl = redis.call("PTTL", key)

  if ttl <= 0 then
    redis.call("DEL", key)
    return -3
  end

  redis.call(
    "SET",
    key,
    cjson.encode(otp),
    "PX",
    ttl
  )

  return 0
end

redis.call("DEL", key)

return 1
`;

/**
 * =========================================================
 * VERIFY OTP
 * =========================================================
 */

export type VerifySessionMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function verifyOtp(
  kind: AuthKind,
  rawPhone: string,
  code: string,
  metadata: VerifySessionMetadata = {}
) {
  const phoneNumber =
    normalizePhone(rawPhone);

  const owner =
    await findPhoneOwner(
      kind,
      phoneNumber
    );

  if (!owner) {
    return null;
  }

  const key =
    otpKey(
      kind,
      phoneNumber
    );

  /**
   * First check the JSON timestamp.
   *
   * This is not the consumption operation.
   * Actual consumption happens atomically
   * in Redis Lua below.
   */
  const storedOtpRaw =
    await redis.get(key);

  if (!storedOtpRaw) {
    return null;
  }

  let otp: RedisOtpRecord;

  try {
    otp =
      JSON.parse(
        storedOtpRaw
      ) as RedisOtpRecord;
  } catch {
    await redis.del(key);
    return null;
  }

  const expiresAt =
    new Date(
      otp.expiresAt
    );

  if (
    Number.isNaN(
      expiresAt.getTime()
    ) ||
    expiresAt <= new Date()
  ) {
    await redis.del(key);
    return null;
  }

  /**
   * Atomic verification.
   *
   * node-redis supports EVAL through eval().
   */
  const result =
    await redis.eval(
      verifyOtpScript,
      {
        keys: [key],

        arguments: [
          hash(code),
          String(
            maxOtpAttempts
          ),
        ],
      }
    );

  const verificationResult =
    Number(result);

  if (
    verificationResult !== 1
  ) {
    return null;
  }

  /**
   * =======================================================
   * CREATE SESSION
   * =======================================================
   */

  const token =
  randomBytes(32)
    .toString("base64url");

const sessionId =
  randomUUID();

const now = Date.now();

const {
  absoluteMs,
  idleMs,
} = getSessionTimeouts(kind);

const sessionExpiry =
  now + absoluteMs;

const sessionRecord: RedisSessionRecord = {
  id: sessionId,

  tokenHash:
    hash(token),

  role:
    kind === "admin"
      ? "ADMIN"
      : "CUSTOMER",

  personId:
    kind === "customer"
      ? owner.RowID
      : null,

  userInfoId:
    kind === "admin"
      ? owner.RowID
      : null,

  expiresAt:
    sessionExpiry,

  createdAt:
    now,

  lastSeenAt:
    now,

  ipAddress:
    metadata.ipAddress ??
    null,

  userAgent:
    normalizeUserAgent(
      metadata.userAgent
    ),
};

const initialTtl =
  Math.min(
    absoluteMs,
    idleMs
  );

const sessionRedisKey =
  sessionKey(
    sessionRecord.tokenHash
  );

await redis.set(
  sessionRedisKey,
  JSON.stringify(
    sessionRecord
  ),
  {
    PX: initialTtl,
  }
);

const ownerId =
  owner.RowID;

await redis.zAdd(
  userSessionsKey(
    kind,
    ownerId
  ),
  {
    score:
      sessionExpiry,

    value:
      sessionRecord.tokenHash,
  }
);

  return {
    token,
    session:
      sessionRecord,
    owner,
  };
}


export async function getSessionByToken(
  token: string,
): Promise<RedisSessionRecord | null> {
  if (!token) {
    return null;
  }

  const tokenHash = hash(token);

  const result = (await redis.eval(
    touchSessionScript,
    {
      keys: [sessionKey(tokenHash)],
      arguments: [
        String(Date.now()),
        String(adminSessionIdleMs),
        String(customerSessionIdleMs),
      ],
    },
  )) as string[];


  if (!result || result[0] !== "OK") {
    return null;
  }
  try {
    const session = JSON.parse(result[1]) as RedisSessionRecord;
    return session;
  } catch (error) {
    return null;
  }
}

/**
 * =========================================================
 * REVOKE SESSION
 * =========================================================
 */

export async function revokeSession(
  token: string
) {
  if (!token) {
    return;
  }

  const tokenHash =
    hash(token);

  const key =
    sessionKey(
      tokenHash
    );

  const raw =
    await redis.get(key);

  /**
   * Remove actual session.
   */
  await redis.del(key);

  /**
   * Remove it from user's index.
   */
  if (raw) {
    try {
      const session =
        JSON.parse(
          raw
        ) as RedisSessionRecord;

      const ownerId =
        session.role ===
        "CUSTOMER"
          ? session.personId
          : session.userInfoId;

      if (
        ownerId !==
          null &&
        ownerId !==
          undefined
      ) {
        const kind =
          session.role ===
          "CUSTOMER"
            ? "customer"
            : "admin";

        await redis.zRem(
          userSessionsKey(
            kind,
            ownerId
          ),
          tokenHash
        );
      }
    } catch {
      /**
       * Session is already deleted.
       * Nothing else is required.
       */
    }
  }
}

/**
 * =========================================================
 * REVOKE ALL SESSIONS
 * =========================================================
 */

export async function revokeAllSessions(
  kind: AuthKind,
  ownerId: number
) {
  const indexKey =
    userSessionsKey(
      kind,
      ownerId
    );

  /**
   * Remove expired entries first.
   */
  await redis.zRemRangeByScore(
    indexKey,
    0,
    Date.now()
  );

  const tokenHashes =
    await redis.zRange(
      indexKey,
      0,
      -1
    );

  if (
    tokenHashes.length === 0
  ) {
    await redis.del(indexKey);
    return 0;
  }

  /**
   * Delete all session keys.
   */
  const sessionKeys =
    tokenHashes.map(
      (tokenHash) =>
        sessionKey(tokenHash)
    );

  await redis.del(
    sessionKeys
  );

  /**
   * Delete index.
   */
  await redis.del(
    indexKey
  );

  return tokenHashes.length;
}
