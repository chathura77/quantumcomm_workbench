import { round } from "@/lib/math";
import type { ModelWarning, SimulationResponse } from "@/lib/types";

export const PHASE_ENCODING_VERSION = "phase-encoding.simplified.v1";

export type PhaseEncodingInput = {
  timeBinSeparationPs: number;
  wavelengthNm: number;
  linewidthHz: number;
  effectiveIndex: number;
  physicalLengthMeters: number;
  lengthChangeNm: number;
  deltaTemperatureC: number;
  thermoOpticCoefficient: number;
};

export type PhaseEncodingResult = {
  deltaLengthMeters: number;
  roundTripDelaySeconds: number;
  phaseShiftRadians: number;
  coherenceLengthMeters: number;
  thermalOpticalPathDriftMeters: number;
  thermalPhaseDriftRadians: number;
  coherenceCompatible: boolean;
};

export function calculatePhaseEncoding(input: PhaseEncodingInput): SimulationResponse<PhaseEncodingInput, PhaseEncodingResult> {
  const c = 299792458;
  const deltaTimeSeconds = input.timeBinSeparationPs * 1e-12;
  const wavelengthMeters = input.wavelengthNm * 1e-9;
  const deltaLengthMeters = (c * deltaTimeSeconds) / input.effectiveIndex;
  const roundTripDelaySeconds = (2 * input.effectiveIndex * deltaLengthMeters) / c;
  const phaseShiftRadians = (2 * Math.PI * input.effectiveIndex * input.lengthChangeNm * 1e-9) / wavelengthMeters;
  const coherenceLengthMeters = c / (Math.PI * input.linewidthHz * input.effectiveIndex);
  const thermalOpticalPathDriftMeters = input.physicalLengthMeters * input.thermoOpticCoefficient * input.deltaTemperatureC;
  const thermalPhaseDriftRadians = (2 * Math.PI * thermalOpticalPathDriftMeters) / wavelengthMeters;
  const warnings: ModelWarning[] = [];
  const coherenceCompatible = deltaLengthMeters <= coherenceLengthMeters;

  if (!coherenceCompatible) {
    warnings.push({
      code: "coherence-length",
      severity: "warning",
      message: "The path difference exceeds the simplified coherence-length estimate."
    });
  }
  if (Math.abs(thermalPhaseDriftRadians) > Math.PI) {
    warnings.push({
      code: "thermal-drift",
      severity: "info",
      message: "Thermal phase drift exceeds pi radians; active stabilization would usually be considered."
    });
  }

  return {
    input,
    result: {
      deltaLengthMeters: round(deltaLengthMeters, 9),
      roundTripDelaySeconds,
      phaseShiftRadians,
      coherenceLengthMeters,
      thermalOpticalPathDriftMeters,
      thermalPhaseDriftRadians,
      coherenceCompatible
    },
    assumptions: [
      "Silica fiber group effects are represented by a single effective index.",
      "Coherence length uses c / (pi linewidth n_eff).",
      "Thermal drift is a scalar optical-path proxy."
    ],
    warnings,
    version: PHASE_ENCODING_VERSION
  };
}
