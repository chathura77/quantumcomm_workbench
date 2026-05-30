import {
  expiredKeyErrorSchema,
  insufficientKeyMaterialSchema,
  keyDescriptorSchema,
  keyPoolStatusSchema,
  keyRequestResponseSchema,
  unauthorizedApplicationSchema
} from "@/lib/validation/schemas";

export type ConformanceKind =
  | "status"
  | "key-request-success"
  | "key-request-error"
  | "key-descriptor"
  | "authorization-error"
  | "expired-key-error";

export function checkMockQkdConformance(kind: ConformanceKind, payload: unknown) {
  const schema = kind === "status"
    ? keyPoolStatusSchema
    : kind === "key-request-success"
      ? keyRequestResponseSchema
      : kind === "key-request-error"
        ? insufficientKeyMaterialSchema
        : kind === "authorization-error"
          ? unauthorizedApplicationSchema
          : kind === "expired-key-error"
            ? expiredKeyErrorSchema
            : keyDescriptorSchema;
  const parsed = schema.safeParse(payload);
  const issues = parsed.success ? [] : parsed.error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`);

  if (parsed.success) {
    if (kind === "status") {
      const statusPayload = keyPoolStatusSchema.parse(payload);
      if (statusPayload.activeKeyCount + statusPayload.expiredKeyCount < 0) {
        issues.push("payload: key lifecycle counters must be non-negative.");
      }
    }

    if (kind === "key-descriptor") {
      const descriptorPayload = keyDescriptorSchema.parse(payload);
      if (Date.parse(descriptorPayload.expiresAt) <= Date.parse(descriptorPayload.createdAt)) {
        issues.push("payload.expiresAt: expiry must be later than creation time.");
      }
    }
  }

  return {
    ok: issues.length === 0,
    kind,
    issues,
    lifecycleNotes: [
      "Mock key material must be marked demoOnly.",
      "Successful requests must reduce remainingPoolBits.",
      "Insufficient material must return availableBits and requestedBits.",
      "Key descriptors must include applicationId plus createdAt/expiresAt to support authorization and TTL-oriented lifecycle checks.",
      "Expired keys should move out of the active pool and return an ExpiredKey error on retrieval.",
      "Authorization failures are demo-only teaching checks and must not imply production credential handling."
    ]
  };
}
