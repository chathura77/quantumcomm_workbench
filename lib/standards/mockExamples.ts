import type { ConformanceKind } from "@/lib/standards/conformance";

export type MockApiExample = {
  id: string;
  title: string;
  method: "GET" | "POST";
  endpoint: string;
  status: number;
  description: string;
  requestBody?: Record<string, unknown>;
  responseBody: Record<string, unknown>;
};

export type ConformanceExampleCase = {
  id: string;
  title: string;
  kind: ConformanceKind;
  expectedOk: boolean;
  summary: string;
  payload: Record<string, unknown>;
};

const mockKeyDescriptor = {
  keyId: "demo-app-0001",
  applicationId: "demo-app",
  keyLengthBits: 256,
  createdAt: "2026-05-30T00:00:00.000Z",
  expiresAt: "2026-05-30T01:00:00.000Z",
  keyMaterial: "DEMO-ONLY-demo-app-0001-256b",
  demoOnly: true as const
};

export const mockApiExamples: MockApiExample[] = [
  {
    id: "status-ready",
    title: "Ready pool snapshot",
    method: "GET",
    endpoint: "/api/qkd-mock/status",
    status: 200,
    description: "Represents a healthy demo-only pool with refill metadata and no production secret material.",
    responseBody: {
      poolId: "demo-pool-alice-bob",
      availableBits: 262144,
      capacityBits: 262144,
      refillRateBitsPerSecond: 512,
      oldestKeyAgeSeconds: 14,
      activeKeyCount: 2,
      expiredKeyCount: 1,
      lastRefillAt: "2026-05-30T00:00:20.000Z",
      lastCleanupAt: "2026-05-30T00:00:15.000Z",
      authorizationMode: "header_token_demo",
      authorizedApplications: ["demo-app", "lab-app", "smoke-suite"],
      status: "ready",
      demoOnly: true
    }
  },
  {
    id: "keys-request-success",
    title: "Successful key request",
    method: "POST",
    endpoint: "/api/qkd-mock/keys/request",
    status: 200,
    description: "A request that consumes pool capacity and returns demo-only descriptors with explicit expiry timestamps.",
    requestBody: {
      applicationId: "demo-app",
      keyLengthBits: 256,
      numberOfKeys: 2,
      priority: 1
    },
    responseBody: {
      keys: [
        mockKeyDescriptor,
        {
          ...mockKeyDescriptor,
          keyId: "demo-app-0002",
          keyMaterial: "DEMO-ONLY-demo-app-0002-256b"
        }
      ],
      remainingPoolBits: 261632,
      demoOnly: true
    }
  },
  {
    id: "keys-request-insufficient",
    title: "Insufficient material error",
    method: "POST",
    endpoint: "/api/qkd-mock/keys/request",
    status: 409,
    description: "A refusal path that preserves scientific caution by reporting only aggregate pool availability and requested demand.",
    requestBody: {
      applicationId: "demo-app",
      keyLengthBits: 1048576,
      numberOfKeys: 100,
      priority: 1
    },
    responseBody: {
      error: "InsufficientKeyMaterial",
      availableBits: 262144,
      requestedBits: 104857600
    }
  },
  {
    id: "keys-request-unauthorized",
    title: "Unauthorized application error",
    method: "POST",
    endpoint: "/api/qkd-mock/keys/request",
    status: 403,
    description: "A demo-only authorization refusal for a missing or mismatched application token.",
    requestBody: {
      applicationId: "demo-app",
      keyLengthBits: 256,
      numberOfKeys: 1,
      priority: 1
    },
    responseBody: {
      error: "UnauthorizedApplication",
      applicationId: "demo-app",
      message: "Provide a recognized demo application ID and matching x-qkd-app-token header. This mock never uses production credentials or real secret keys.",
      authorizedApplications: ["demo-app", "lab-app", "smoke-suite"],
      demoOnly: true
    }
  },
  {
    id: "key-retrieve-success",
    title: "Retrieve one descriptor",
    method: "GET",
    endpoint: "/api/qkd-mock/keys/demo-app-0001",
    status: 200,
    description: "A descriptor lookup that returns the same demo-only marker instead of operational key escrow behavior.",
    responseBody: mockKeyDescriptor
  },
  {
    id: "key-retrieve-expired",
    title: "Expired key retrieval",
    method: "GET",
    endpoint: "/api/qkd-mock/keys/demo-app-0001",
    status: 410,
    description: "An expired key is removed from the active pool and cannot be reused after its TTL window closes.",
    responseBody: {
      error: "ExpiredKey",
      message: "This demo key expired and was cleaned from the active pool. Request fresh material instead of reusing stale mock keys.",
      keyId: "demo-app-0001",
      expiredAt: "2026-05-30T01:00:00.000Z",
      demoOnly: true
    }
  }
];

export const conformanceExampleCases: ConformanceExampleCase[] = [
  {
    id: "status-valid",
    title: "Valid ready status",
    kind: "status",
    expectedOk: true,
    summary: "Includes pool totals, refill metadata, and the demo-only lifecycle marker.",
    payload: {
      poolId: "demo-pool-alice-bob",
      availableBits: 4096,
      capacityBits: 16384,
      refillRateBitsPerSecond: 512,
      oldestKeyAgeSeconds: 42,
      activeKeyCount: 2,
      expiredKeyCount: 1,
      lastRefillAt: "2026-05-30T00:00:20.000Z",
      lastCleanupAt: "2026-05-30T00:00:15.000Z",
      authorizationMode: "header_token_demo",
      authorizedApplications: ["demo-app", "lab-app", "smoke-suite"],
      status: "ready",
      demoOnly: true
    }
  },
  {
    id: "status-missing-demo-flag",
    title: "Invalid status missing demo flag",
    kind: "status",
    expectedOk: false,
    summary: "Fails because demo-only material must be labeled explicitly in every exposed shape.",
    payload: {
      poolId: "demo-pool-alice-bob",
      availableBits: 4096,
      capacityBits: 16384,
      refillRateBitsPerSecond: 512,
      oldestKeyAgeSeconds: 42,
      activeKeyCount: 2,
      expiredKeyCount: 1,
      lastRefillAt: "2026-05-30T00:00:20.000Z",
      lastCleanupAt: "2026-05-30T00:00:15.000Z",
      authorizationMode: "header_token_demo",
      authorizedApplications: ["demo-app", "lab-app", "smoke-suite"],
      status: "ready"
    }
  },
  {
    id: "key-request-success-valid",
    title: "Valid request success",
    kind: "key-request-success",
    expectedOk: true,
    summary: "Provides key descriptors, remaining pool bits, and the demo-only marker.",
    payload: {
      keys: [mockKeyDescriptor],
      remainingPoolBits: 4080,
      demoOnly: true
    }
  },
  {
    id: "key-request-success-invalid",
    title: "Invalid request success",
    kind: "key-request-success",
    expectedOk: false,
    summary: "Fails because each descriptor must include explicit expiry metadata.",
    payload: {
      keys: [
        {
          keyId: "demo-app-0003",
          applicationId: "demo-app",
          keyLengthBits: 256,
          createdAt: "2026-05-30T00:00:00.000Z",
          keyMaterial: "DEMO-ONLY-demo-app-0003-256b",
          demoOnly: true
        }
      ],
      remainingPoolBits: 3824,
      demoOnly: true
    }
  },
  {
    id: "insufficient-material-valid",
    title: "Valid insufficient-material error",
    kind: "key-request-error",
    expectedOk: true,
    summary: "Confirms the exhaustion path reports available and requested bits for transparent debugging.",
    payload: {
      error: "InsufficientKeyMaterial",
      availableBits: 128,
      requestedBits: 1024
    }
  },
  {
    id: "authorization-error-valid",
    title: "Valid authorization error",
    kind: "authorization-error",
    expectedOk: true,
    summary: "Confirms demo-only application authorization failures return the allowed application list and no secret material.",
    payload: {
      error: "UnauthorizedApplication",
      applicationId: "demo-app",
      message: "Provide a recognized demo application ID and matching x-qkd-app-token header. This mock never uses production credentials or real secret keys.",
      authorizedApplications: ["demo-app", "lab-app", "smoke-suite"],
      demoOnly: true
    }
  },
  {
    id: "key-descriptor-valid",
    title: "Valid descriptor",
    kind: "key-descriptor",
    expectedOk: true,
    summary: "Provides fixed-length metadata plus a demo-only string instead of real cryptographic material.",
    payload: mockKeyDescriptor
  },
  {
    id: "key-descriptor-invalid",
    title: "Invalid descriptor missing expiry",
    kind: "key-descriptor",
    expectedOk: false,
    summary: "Fails because TTL-style expiry metadata is required for lifecycle-oriented checks.",
    payload: {
      keyId: "demo-app-0004",
      applicationId: "demo-app",
      keyLengthBits: 256,
      createdAt: "2026-05-30T00:00:00.000Z",
      keyMaterial: "DEMO-ONLY-demo-app-0004-256b",
      demoOnly: true
    }
  },
  {
    id: "expired-key-valid",
    title: "Valid expired-key error",
    kind: "expired-key-error",
    expectedOk: true,
    summary: "Confirms expired key retrieval reports the cleaned-up key ID and its expiry timestamp.",
    payload: {
      error: "ExpiredKey",
      message: "This demo key expired and was cleaned from the active pool. Request fresh material instead of reusing stale mock keys.",
      keyId: "demo-app-0001",
      expiredAt: "2026-05-30T01:00:00.000Z",
      demoOnly: true
    }
  }
];

export function listConformanceExamples(kind?: ConformanceKind) {
  return typeof kind === "string"
    ? conformanceExampleCases.filter((example) => example.kind === kind)
    : conformanceExampleCases;
}

export function serializeMockApiExampleBundle() {
  return JSON.stringify({
    version: "etsi-qkd-014-mock.examples.v1",
    demoOnly: true,
    disclaimer: "Educational mock payloads only. These examples never represent certified ETSI conformance or production secret-key delivery.",
    examples: mockApiExamples
  }, null, 2);
}
