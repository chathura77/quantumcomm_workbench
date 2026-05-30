import {
  insufficientKeyMaterialSchema,
  keyDescriptorSchema,
  keyPoolStatusSchema,
  keyRequestResponseSchema
} from "@/lib/validation/schemas";

export type ConformanceKind = "status" | "key-request-success" | "key-request-error" | "key-descriptor";

export function checkMockQkdConformance(kind: ConformanceKind, payload: unknown) {
  const schema = kind === "status"
    ? keyPoolStatusSchema
    : kind === "key-request-success"
      ? keyRequestResponseSchema
      : kind === "key-request-error"
        ? insufficientKeyMaterialSchema
        : keyDescriptorSchema;
  const parsed = schema.safeParse(payload);
  return {
    ok: parsed.success,
    kind,
    issues: parsed.success ? [] : parsed.error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`),
    lifecycleNotes: [
      "Mock key material must be marked demoOnly.",
      "Successful requests must reduce remainingPoolBits.",
      "Insufficient material must return availableBits and requestedBits.",
      "Key descriptors must include createdAt and expiresAt to support TTL-oriented lifecycle checks."
    ]
  };
}
