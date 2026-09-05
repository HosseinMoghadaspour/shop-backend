# Auth architecture

Better Auth is not used.

Authentication is handled by:

- SQL Server / Prisma: finding and validating the existing customer/admin account.
- Redis: OTP state, OTP attempts, rate limits, sessions and session indexes.
- HttpOnly cookie: browser session transport.
- `Authorization: Bearer <token>`: optional transport for mobile/API clients.

## Endpoints

### Customer

- `POST /auth/customer/request-otp`
- `POST /auth/customer/verify-otp`

### Admin

- `POST /auth/admin/request-otp`
- `POST /auth/admin/verify-otp`

### Session

- `GET /auth/me`
- `GET /auth/sessions`
- `DELETE /auth/sessions/:id`
- `POST /auth/sign-out`
- `POST /auth/sign-out-all`

## Redis keys

```text
auth:otp:{kind}:{phone}
auth:otp:attempts:{kind}:{phone}
auth:otp:cooldown:{kind}:{phone}
auth:rate:otp:{kind}:{phone}
auth:rate:verify:{kind}:{phone}

auth:session:{tokenHash}
auth:sessions:{role}:{ownerId}
```

Only hashes of OTPs/session tokens are stored. Raw session tokens are returned to the client only after successful verification.

## Required environment

```env
AUTH_SESSION_SECRET=replace-with-a-long-random-secret
REDIS_URL=redis://127.0.0.1:6379
```

In production `AUTH_SESSION_SECRET` must be set.

## Important

The repository's current `package.json` already has no `better-auth` dependency. The old Better Auth Prisma client/config should also not be present. If your local working tree still has any of these, delete them:

```text
src/lib/auth.ts
src/lib/auth-prisma.ts
src/generated/auth-prisma/
```

Also remove:

```text
BETTER_AUTH_URL
BETTER_AUTH_SECRET
```

from environment files if they still exist.
