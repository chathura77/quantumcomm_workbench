import { keyRequestSchema } from "@/lib/validation/schemas";

export const ETSI_MOCK_VERSION = "etsi-qkd-014-mock.lifecycle.v2";
export const DEMO_AUTH_HEADER = "x-qkd-app-token";
export const DEMO_APP_ID_HEADER = "x-qkd-application-id";

const AUTHORIZED_APPLICATIONS = {
  "demo-app": "demo-token-alice",
  "lab-app": "lab-token-bob",
  "smoke-suite": "smoke-suite-token"
} as const;

export type AuthorizedApplicationId = keyof typeof AUTHORIZED_APPLICATIONS;

export type MockKeyDescriptor = {
  keyId: string;
  applicationId: string;
  keyLengthBits: number;
  createdAt: string;
  expiresAt: string;
  keyMaterial: string;
  demoOnly: true;
};

type StoredKeyDescriptor = MockKeyDescriptor & {
  createdAtMs: number;
  expiresAtMs: number;
  priority: number;
};

type AuthorizationContext = {
  applicationId?: string;
  token?: string;
};

type PoolState = {
  poolId: string;
  availableBits: number;
  capacityBits: number;
  refillRateBitsPerSecond: number;
  lastRefillMs: number;
  lastCleanupMs: number;
  keys: Map<string, StoredKeyDescriptor>;
  expiredKeys: Map<string, StoredKeyDescriptor>;
  counter: number;
  clockOffsetMs: number;
};

const globalForPool = globalThis as typeof globalThis & { __quantumCommPool?: PoolState };

function getNowMs(pool: PoolState) {
  return Date.now() + pool.clockOffsetMs;
}

function getPool(): PoolState {
  if (!globalForPool.__quantumCommPool) {
    const now = Date.now();
    globalForPool.__quantumCommPool = {
      poolId: "demo-pool-alice-bob",
      availableBits: 262144,
      capacityBits: 262144,
      refillRateBitsPerSecond: 512,
      lastRefillMs: now,
      lastCleanupMs: now,
      keys: new Map(),
      expiredKeys: new Map(),
      counter: 0,
      clockOffsetMs: 0
    };
  }
  return globalForPool.__quantumCommPool;
}

function refill(pool: PoolState) {
  const now = getNowMs(pool);
  const elapsedSeconds = Math.max(0, (now - pool.lastRefillMs) / 1000);
  pool.availableBits = Math.min(pool.capacityBits, Math.floor(pool.availableBits + elapsedSeconds * pool.refillRateBitsPerSecond));
  pool.lastRefillMs = now;
}

function cleanupExpiredKeys(pool: PoolState) {
  const now = getNowMs(pool);
  for (const [keyId, key] of pool.keys.entries()) {
    if (key.expiresAtMs <= now) {
      pool.keys.delete(keyId);
      pool.expiredKeys.set(keyId, key);
    }
  }
  pool.lastCleanupMs = now;
}

function currentOldestKeyAgeSeconds(pool: PoolState) {
  const now = getNowMs(pool);
  let oldestCreatedAtMs: number | null = null;
  for (const key of pool.keys.values()) {
    if (oldestCreatedAtMs === null || key.createdAtMs < oldestCreatedAtMs) {
      oldestCreatedAtMs = key.createdAtMs;
    }
  }
  return oldestCreatedAtMs === null ? 0 : Math.max(0, Math.floor((now - oldestCreatedAtMs) / 1000));
}

function currentStatus(pool: PoolState) {
  return pool.availableBits === 0 ? "exhausted" as const : pool.availableBits < pool.capacityBits * 0.2 ? "low" as const : "ready" as const;
}

function authorizedApplicationIds() {
  return Object.keys(AUTHORIZED_APPLICATIONS);
}

function unauthorizedBody(applicationId: string | undefined) {
  return {
    error: "UnauthorizedApplication" as const,
    applicationId: applicationId ?? "unknown",
    message: `Provide a recognized demo application ID and matching ${DEMO_AUTH_HEADER} header. This mock never uses production credentials or real secret keys.`,
    authorizedApplications: authorizedApplicationIds(),
    demoOnly: true as const
  };
}

function authorizeRequest(applicationId: string, token: string | undefined) {
  const expectedToken = AUTHORIZED_APPLICATIONS[applicationId as AuthorizedApplicationId];
  if (!expectedToken || token !== expectedToken) {
    return {
      ok: false as const,
      status: 403,
      body: unauthorizedBody(applicationId)
    };
  }

  return { ok: true as const };
}

export function parseMockAuthorizationHeaders(headers: Headers): AuthorizationContext {
  return {
    applicationId: headers.get(DEMO_APP_ID_HEADER) ?? undefined,
    token: headers.get(DEMO_AUTH_HEADER) ?? undefined
  };
}

export function getKeyPoolStatus() {
  const pool = getPool();
  refill(pool);
  cleanupExpiredKeys(pool);
  return {
    poolId: pool.poolId,
    availableBits: pool.availableBits,
    capacityBits: pool.capacityBits,
    refillRateBitsPerSecond: pool.refillRateBitsPerSecond,
    oldestKeyAgeSeconds: currentOldestKeyAgeSeconds(pool),
    activeKeyCount: pool.keys.size,
    expiredKeyCount: pool.expiredKeys.size,
    lastRefillAt: new Date(pool.lastRefillMs).toISOString(),
    lastCleanupAt: new Date(pool.lastCleanupMs).toISOString(),
    authorizationMode: "header_token_demo" as const,
    authorizedApplications: authorizedApplicationIds(),
    status: currentStatus(pool),
    demoOnly: true as const
  };
}

export function requestMockKeys(input: unknown, auth: AuthorizationContext = {}) {
  const parsed = keyRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, status: 400, body: parsed.error };
  const request = parsed.data;
  const authorization = authorizeRequest(request.applicationId, auth.token);
  if (!authorization.ok) {
    return authorization;
  }

  const pool = getPool();
  refill(pool);
  cleanupExpiredKeys(pool);
  const requestedBits = request.keyLengthBits * request.numberOfKeys;
  if (requestedBits > pool.availableBits) {
    return {
      ok: false as const,
      status: 409,
      body: {
        error: "InsufficientKeyMaterial" as const,
        availableBits: pool.availableBits,
        requestedBits
      }
    };
  }

  pool.availableBits -= requestedBits;
  const nowMs = getNowMs(pool);
  const createdAt = new Date(nowMs).toISOString();
  const expiresAtMs = nowMs + 60 * 60 * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const keys: MockKeyDescriptor[] = Array.from({ length: request.numberOfKeys }, () => {
    pool.counter += 1;
    const keyId = `${request.applicationId}-${pool.counter.toString().padStart(4, "0")}`;
    const descriptor: StoredKeyDescriptor = {
      keyId,
      applicationId: request.applicationId,
      keyLengthBits: request.keyLengthBits,
      createdAt,
      createdAtMs: nowMs,
      expiresAt,
      expiresAtMs,
      priority: request.priority,
      keyMaterial: `DEMO-ONLY-${keyId}-${request.keyLengthBits}b`,
      demoOnly: true
    };
    pool.keys.set(keyId, descriptor);
    return {
      keyId: descriptor.keyId,
      applicationId: descriptor.applicationId,
      keyLengthBits: descriptor.keyLengthBits,
      createdAt: descriptor.createdAt,
      expiresAt: descriptor.expiresAt,
      keyMaterial: descriptor.keyMaterial,
      demoOnly: descriptor.demoOnly
    };
  });

  return {
    ok: true as const,
    status: 200,
    body: {
      keys,
      remainingPoolBits: pool.availableBits,
      demoOnly: true as const
    }
  };
}

export function retrieveMockKey(keyId: string, auth: AuthorizationContext = {}) {
  const pool = getPool();
  refill(pool);
  cleanupExpiredKeys(pool);

  const activeKey = pool.keys.get(keyId);
  if (activeKey) {
    const applicationId = auth.applicationId ?? "unknown";
    const authorization = authorizeRequest(applicationId, auth.token);
    if (!authorization.ok) {
      return authorization;
    }
    if (activeKey.applicationId !== applicationId) {
      return {
        ok: false as const,
        status: 403,
        body: unauthorizedBody(applicationId)
      };
    }

    return {
      ok: true as const,
      status: 200,
      body: {
        keyId: activeKey.keyId,
        applicationId: activeKey.applicationId,
        keyLengthBits: activeKey.keyLengthBits,
        createdAt: activeKey.createdAt,
        expiresAt: activeKey.expiresAt,
        keyMaterial: activeKey.keyMaterial,
        demoOnly: activeKey.demoOnly
      }
    };
  }

  const expiredKey = pool.expiredKeys.get(keyId);
  if (expiredKey) {
    return {
      ok: false as const,
      status: 410,
      body: {
        error: "ExpiredKey" as const,
        message: "This demo key expired and was cleaned from the active pool. Request fresh material instead of reusing stale mock keys.",
        keyId: expiredKey.keyId,
        expiredAt: expiredKey.expiresAt,
        demoOnly: true as const
      }
    };
  }

  return {
    ok: false as const,
    status: 404,
    body: {
      error: "NotFound" as const,
      message: "Mock key ID was not found or the development server restarted."
    }
  };
}

export function __resetMockPoolForTests() {
  globalForPool.__quantumCommPool = undefined;
}

export function __advanceMockPoolClockForTests(milliseconds: number) {
  const pool = getPool();
  pool.clockOffsetMs += milliseconds;
}
