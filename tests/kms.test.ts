import { describe, expect, it } from "vitest";
import { runKmsSimulation } from "../lib/kms/simulator";

describe("KMS simulator", () => {
  it("increases buffer when generation exceeds consumption", () => {
    const response = runKmsSimulation({
      durationSeconds: 20,
      timeStepSeconds: 10,
      initialBufferBits: 1000,
      bufferCapacityBits: 10000,
      generationRateBitsPerSecond: 200,
      keyTtlSeconds: 1000,
      services: [{ id: "svc", name: "Service", priority: 1, requestRatePerSecond: 0.1, bitsPerRequest: 100 }]
    });
    expect(response.result.finalBufferBits).toBeGreaterThan(1000);
    expect(response.result.finalBufferBits).toBeLessThanOrEqual(10000);
  });

  it("denies requests when consumption exceeds available buffer", () => {
    const response = runKmsSimulation({
      durationSeconds: 20,
      timeStepSeconds: 10,
      initialBufferBits: 100,
      bufferCapacityBits: 1000,
      generationRateBitsPerSecond: 0,
      keyTtlSeconds: 1000,
      services: [{ id: "svc", name: "Service", priority: 1, requestRatePerSecond: 1, bitsPerRequest: 256 }]
    });
    expect(response.result.totalDeniedRequests).toBeGreaterThan(0);
    expect(response.result.finalBufferBits).toBeGreaterThanOrEqual(0);
  });
});
