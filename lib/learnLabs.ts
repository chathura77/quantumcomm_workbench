import { clamp, formatId, round } from "@/lib/math";

export type TeachingLabQuestion = {
  id: string;
  prompt: string;
  expectedObservation: string;
};

export type TeachingLabAnswer = {
  id: string;
  response: string;
};

export type TeachingLabWorksheet = {
  labId: string;
  title: string;
  scenario: string;
  objective: string;
  metrics: Array<{ label: string; value: string }>;
  steps: string[];
  questions: TeachingLabQuestion[];
  assumptions: string[];
  caution: string;
  references: string[];
};

export type TeachingLabExport = {
  content: string;
  filename: string;
  mimeType: "application/json" | "text/markdown";
};

export type Bb84LabInput = {
  eveFraction: number;
  sampleSize?: number;
};

export type Bb84LabRow = {
  index: number;
  aliceBit: number;
  aliceBasis: "+" | "x";
  bobBasis: "+" | "x";
  bobBit: number;
  kept: boolean;
  error: boolean;
  eveTouches: boolean;
};

export type Bb84LabSummary = {
  rows: Bb84LabRow[];
  siftedLength: number;
  qber: number;
  disturbanceCount: number;
};

export type E91LabInput = {
  visibility: number;
  noiseFraction: number;
};

export type E91LabSummary = {
  visibility: number;
  noiseFraction: number;
  chshScore: number;
  bellViolationMargin: number;
  indicator: "above 2" | "not above 2";
};

function seededBit(index: number, salt: number) {
  return ((index * 1103515245 + salt * 12345) >>> 4) % 2;
}

export function buildBb84LabSummary(input: Bb84LabInput): Bb84LabSummary {
  const sampleSize = Math.max(8, Math.floor(input.sampleSize ?? 16));
  const eveFraction = clamp(input.eveFraction, 0, 1);
  const rows = Array.from({ length: sampleSize }, (_, index) => {
    const aliceBit = seededBit(index, 3);
    const aliceBasis = seededBit(index, 7) === 0 ? "+" : "x";
    const bobBasis = seededBit(index, 11) === 0 ? "+" : "x";
    const eveTouches = index / sampleSize < eveFraction;
    const disturbed = eveTouches && aliceBasis !== bobBasis;
    const bobBit = bobBasis === aliceBasis ? aliceBit : seededBit(index, 19);
    const finalBit = disturbed ? 1 - bobBit : bobBit;
    return {
      index,
      aliceBit,
      aliceBasis,
      bobBasis,
      bobBit: finalBit,
      kept: aliceBasis === bobBasis,
      error: aliceBasis === bobBasis && finalBit !== aliceBit,
      eveTouches
    } satisfies Bb84LabRow;
  });

  const kept = rows.filter((row) => row.kept);
  const errors = kept.filter((row) => row.error);

  return {
    rows,
    siftedLength: kept.length,
    qber: kept.length ? errors.length / kept.length : 0,
    disturbanceCount: rows.filter((row) => row.eveTouches).length
  };
}

export function buildBb84TeachingLab(input: Bb84LabInput): TeachingLabWorksheet {
  const summary = buildBb84LabSummary(input);
  const qberPercent = round(summary.qber * 100, 1);
  const evePercent = round(clamp(input.eveFraction, 0, 1) * 100, 0);

  return {
    labId: "bb84-guided-lab",
    title: "Guided BB84 disturbance lab",
    scenario: `A ${summary.rows.length}-pulse BB84 teaching run with Eve intercepting about ${evePercent}% of pulses before Alice and Bob compare bases.`,
    objective: "Relate basis mismatch, sifting, and visible disturbance without claiming a composable security proof.",
    metrics: [
      { label: "Intercepted pulses", value: `${summary.disturbanceCount}/${summary.rows.length}` },
      { label: "Sifted key length", value: `${summary.siftedLength} bits` },
      { label: "Observed QBER", value: `${qberPercent}%` }
    ],
    steps: [
      "Inspect Alice and Bob basis choices and mark which rows survive sifting.",
      "Compare the kept rows only and note which ones turn into visible bit errors.",
      "Explain how the observed QBER changes when Eve touches a larger fraction of pulses."
    ],
    questions: [
      {
        id: "sifting",
        prompt: "Which rows survive basis sifting, and why are the others discarded before key generation?",
        expectedObservation: `Exactly ${summary.siftedLength} rows remain because only matching-basis rows contribute to the sifted key in this teaching run.`
      },
      {
        id: "disturbance",
        prompt: "What evidence of disturbance appears after sifting when Eve intercepts part of the traffic?",
        expectedObservation: `The kept rows show about ${qberPercent}% QBER, so disturbance becomes visible only after Alice and Bob compare a sample of their sifted outcomes.`
      },
      {
        id: "limitations",
        prompt: "Why is this lab still only an educational model rather than a certified BB84 security analysis?",
        expectedObservation: "The worksheet ignores finite-key proof terms, detector side channels, authentication costs, and calibrated hardware imperfections beyond the simple disturbance story."
      }
    ],
    assumptions: [
      "Pulse generation and basis choices are deterministic for teaching repeatability.",
      "Intercept-resend is compressed into a visible disturbance proxy rather than an operational attack recipe.",
      "Finite-key, decoy-state, and device-imperfection proofs remain outside this mini-lab."
    ],
    caution: "Use this worksheet to build intuition about disturbance and sifting. It does not certify secure key generation or model real QKD hardware in detail.",
    references: ["Bennett and Brassard, 1984", "ETSI ISG QKD publications"]
  };
}

export function buildE91LabSummary(input: E91LabInput): E91LabSummary {
  const visibility = clamp(input.visibility, 0, 1);
  const noiseFraction = clamp(input.noiseFraction, 0, 1);
  const chshScore = Math.max(0, 2 * Math.SQRT2 * visibility * (1 - noiseFraction));

  return {
    visibility,
    noiseFraction,
    chshScore: round(chshScore, 4),
    bellViolationMargin: round(chshScore - 2, 4),
    indicator: chshScore > 2 ? "above 2" : "not above 2"
  };
}

export function buildE91TeachingLab(input: E91LabInput): TeachingLabWorksheet {
  const summary = buildE91LabSummary(input);

  return {
    labId: "e91-guided-lab",
    title: "Guided E91 Bell-correlation lab",
    scenario: `A simplified CHSH-style E91 lesson with visibility ${round(summary.visibility * 100, 1)}% and noise ${round(summary.noiseFraction * 100, 1)}%.`,
    objective: "Relate correlation quality to the Bell-style indicator while keeping loopholes and implementation caveats explicit.",
    metrics: [
      { label: "CHSH S proxy", value: summary.chshScore.toFixed(3) },
      { label: "Bell margin", value: summary.bellViolationMargin.toFixed(3) },
      { label: "Indicator", value: summary.indicator }
    ],
    steps: [
      "Adjust visibility and noise, then observe how the CHSH-style score changes.",
      "Check whether the score stays above the classical threshold of 2.",
      "Explain what a reduced Bell margin means for correlation quality and lab confidence."
    ],
    questions: [
      {
        id: "threshold",
        prompt: "Does the current setting stay above the classical CHSH threshold, and what does that imply in this teaching model?",
        expectedObservation: `The current score is ${summary.chshScore.toFixed(3)}, which is ${summary.indicator}; that indicates whether the simplified lesson still shows Bell-style nonclassical correlation.`
      },
      {
        id: "sensitivity",
        prompt: "How do visibility loss and added noise move the Bell indicator?",
        expectedObservation: "Both lower visibility and higher noise shrink the CHSH score, reducing or removing the Bell-violation margin."
      },
      {
        id: "limitations",
        prompt: "Why is the Bell indicator here not a device-independent security proof?",
        expectedObservation: "The lab compresses sampling, detection efficiency, timing, memory effects, and loophole closure into two scalar sliders, so it is only a correlation-intuition worksheet."
      }
    ],
    assumptions: [
      "The CHSH score is a direct visibility-times-noise proxy rather than a full measurement-statistics reconstruction.",
      "Detection, locality, and memory loopholes are not closed in this simplified lab.",
      "Classical authentication and finite statistics are not modeled."
    ],
    caution: "This Bell-style worksheet is instructional only. It should not be read as a loophole-free E91 or device-independent security claim.",
    references: ["Ekert, 1991", "CHSH inequality"]
  };
}

export function buildTeachingLabExport(
  worksheet: TeachingLabWorksheet,
  answers: TeachingLabAnswer[],
  format: "json" | "markdown",
  createdAt = new Date().toISOString()
): TeachingLabExport {
  const payload = {
    labId: worksheet.labId,
    title: worksheet.title,
    createdAt,
    objective: worksheet.objective,
    scenario: worksheet.scenario,
    metrics: worksheet.metrics,
    steps: worksheet.steps,
    assumptions: worksheet.assumptions,
    caution: worksheet.caution,
    questions: worksheet.questions.map((question) => ({
      ...question,
      response: answers.find((answer) => answer.id === question.id)?.response ?? ""
    })),
    references: worksheet.references
  };

  if (format === "json") {
    return {
      content: JSON.stringify(payload, null, 2),
      filename: `${formatId(worksheet.title)}.json`,
      mimeType: "application/json"
    };
  }

  const questionBlock = payload.questions
    .map((question, index) => `### Question ${index + 1}\n\n- Prompt: ${question.prompt}\n- Expected observation: ${question.expectedObservation}\n- Student response: ${question.response || "[left blank]"}`)
    .join("\n\n");

  return {
    content: `# ${payload.title}

- Created at: ${payload.createdAt}
- Lab ID: ${payload.labId}

## Objective

${payload.objective}

## Scenario

${payload.scenario}

## Metrics

${payload.metrics.map((metric) => `- ${metric.label}: ${metric.value}`).join("\n")}

## Steps

${payload.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## Worksheet

${questionBlock}

## Assumptions

${payload.assumptions.map((assumption) => `- ${assumption}`).join("\n")}

## Caution

${payload.caution}

## References

${payload.references.map((reference) => `- ${reference}`).join("\n")}
`,
    filename: `${formatId(worksheet.title)}.md`,
    mimeType: "text/markdown"
  };
}
