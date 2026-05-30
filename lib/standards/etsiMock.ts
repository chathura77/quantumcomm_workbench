import { keyRequestSchema } from "@/lib/validation/schemas";

export const ETSI_MOCK_VERSION = "etsi-qkd-014-mock.simplified.v1";

export type MockKeyDescriptor = {
  keyId: string;
  keyLengthBits: number;
  createdAt: string;
  expiresAt: string;
  keyMaterial: string;
  demoOnly: true;
};

type PoolState = {
  poolId: string;
  availableBits: number;
  capacityBits: number;
  refillRateBitsPerSecond: number;
  lastRefillMs: number;
  createdAtMs: number;
  keys: Map<string, MockKeyDescriptor>;
  counter: number;
};

const globalForPool = globalThis as typeof globalThis & { __quantumCommPool?: PoolState };

function getPool(): PoolState {
  if (!globalForPool.__quantumCommPool) {
    globalForPool.__quantumCommPool = {
      poolId: "demo-pool-alice-bob",
      availableBits: 262144,
      capacityBits: 262144,
      refillRateBitsPerSecond: 512,
      lastRefillMs: Date.now(),
      createdAtMs: Date.now(),
      keys: new Map(),
      counter: 0
    };
  }
  return globalForPool.__quantumCommPool;
}

function refill(pool: PoolState) {
  const now = Date.now();
  const elapsedSeconds = Math.max(0, (now - pool.lastRefillMs) / 1000);
  pool.availableBits = Math.min(pool.capacityBits, Math.floor(pool.availableBits + elapsedSeconds * pool.refillRateBitsPerSecond));
  pool.lastRefillMs = now;
}

export function getKeyPoolStatus() {
  const pool = getPool();
  refill(pool);
  return {
    poolId: pool.poolId,
    availableBits: pool.availableBits,
    capacityBits: pool.capacityBits,
    refillRateBitsPerSecond: pool.refillRateBitsPerSecond,
    oldestKeyAgeSeconds: Math.floor((Date.now() - pool.createdAtMs) / 1000),
    status: pool.availableBits === 0 ? "exhausted" as const : pool.availableBits < pool.capacityBits * 0.2 ? "low" as const : "ready" as const,
    demoOnly: true as const
  };
}

export function requestMockKeys(input: unknown) {
  const parsed = keyRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, status: 400, body: parsed.error };
  const request = parsed.data;
  const pool = getPool();
  refill(pool);
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
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const keys: MockKeyDescriptor[] = Array.from({ length: request.numberOfKeys }, () => {
    pool.counter += 1;
    const keyId = `${request.applicationId}-${pool.counter.toString().padStart(4, "0")}`;
    const descriptor = {
      keyId,
      keyLengthBits: request.keyLengthBits,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      keyMaterial: `DEMO-ONLY-${keyId}-${request.keyLengthBits}b`,
      demoOnly: true as const
    };
    pool.keys.set(keyId, descriptor);
    return descriptor;
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

export function retrieveMockKey(keyId: string) {
  const pool = getPool();
  const key = pool.keys.get(keyId);
  return key ? { ok: true as const, body: key } : { ok: false as const, body: { error: "NotFound", message: "Mock key ID was not found or the development server restarted." } };
}
