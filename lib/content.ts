export const disclaimer =
  "QuantumComm Workbench provides educational and research-oriented estimates. Simplified models are not a substitute for certified security proofs, calibrated hardware characterization, or production cryptographic validation.";

export const hostBrand = {
  name: "Chathura Sarathchandra",
  homeUrl: "https://www.sarathchandra.com/",
  sandboxUrl: "https://www.sarathchandra.com/the-sandbox/",
  label: "SarathChandra.com Sandbox",
  tagline: "A quantum communication workbench from Chathura Sarathchandra's digital home.",
  personalDisclaimer:
    "All content represents personal views and research-oriented exploration. It does not represent the views, policies, or positions of any employer, collaborator, or affiliated organization."
};

export const hostNav = [
  { href: "https://www.sarathchandra.com/", label: "Home" },
  { href: "https://www.sarathchandra.com/about/", label: "About" },
  { href: "https://www.sarathchandra.com/blog/", label: "Blog" },
  { href: "https://www.sarathchandra.com/the-sandbox/", label: "The Sandbox" }
];

export const mainNav = [
  { href: "/learn", label: "Learn" },
  { href: "/tools", label: "Tools" },
  { href: "/networks", label: "Networks" },
  { href: "/resources", label: "Resources" },
  { href: "/tools/etsi-api-sandbox", label: "API Sandbox" }
];

export const toolGroups = [
  {
    title: "QKD engineering",
    tools: [
      { href: "/tools/qkd-engineering-lab", label: "QKD Engineering Lab", summary: "Integrated link, QBER, post-processing, and risk workflow." },
      { href: "/tools/link-budget", label: "Link Budget", summary: "Distance sweep and simplified secret-key-rate estimate." },
      { href: "/tools/finite-key-bb84", label: "Finite-key BB84", summary: "Explicit epsilon parameters and finite-size teaching penalties." },
      { href: "/tools/mdi-qkd-estimator", label: "MDI-QKD Relay Estimator", summary: "Two-arm relay coincidence, symmetry, and QBER teaching proxy." },
      { href: "/tools/twin-field-qkd-estimator", label: "Twin-field QKD Estimator", summary: "Middle-station interference, phase stability, and long-distance teaching proxy." },
      { href: "/tools/entanglement-qkd-estimator", label: "BBM92 and E91 Estimator", summary: "Entangled-pair coincidence, CHSH-style Bell score, and source-in-the-middle teaching proxy." },
      { href: "/tools/cv-qkd-estimator", label: "CV-QKD Estimator", summary: "SNR, covariance-style observables, and excess-noise teaching proxy." },
      { href: "/tools/qber-forensics", label: "QBER Forensics", summary: "Transparent additive contribution dashboard." },
      { href: "/tools/post-processing", label: "Post-processing", summary: "Sifting, leakage, authentication, and final key accounting." },
      { href: "/tools/attack-explorer", label: "Attack Explorer", summary: "Simulation-only educational disturbance and risk proxies." }
    ]
  },
  {
    title: "Standards and integration",
    tools: [
      { href: "/tools/etsi-api-sandbox", label: "ETSI API Sandbox", summary: "Mock QKD key pool, request, retrieval, and exhaustion behavior." },
      { href: "/tools/kms-simulator", label: "KMS Simulator", summary: "Key generation, consumption, buffers, priorities, and denials." },
      { href: "/tools/hybrid-decision-tool", label: "Hybrid Decision Tool", summary: "Neutral PQC, QKD, and hybrid scorecard." },
      { href: "/tools/standards-conformance", label: "Standards Conformance", summary: "Response-shape checks for the mock key-delivery API." },
      { href: "/tools/openapi-viewer", label: "OpenAPI Viewer", summary: "Contract-backed endpoint and schema reference for the local mock APIs." }
    ]
  },
  {
    title: "Optical and research utilities",
    tools: [
      { href: "/tools/phase-encoding-calculator", label: "Phase Encoding", summary: "Delay length, phase shift, coherence, and thermal drift." },
      { href: "/tools/channel-planner", label: "Channel Planner", summary: "Fiber, free-space, and satellite-style dB accounting." },
      { href: "/tools/paper-parameter-extractor", label: "Paper Extractor", summary: "Rule-based extraction for common QKD paper quantities." },
      { href: "/tools/report-generator", label: "Report Generator", summary: "Reproducible JSON and Markdown reports from tool runs." }
    ]
  }
];

export const networkTools = [
  { href: "/networks/scenario-builder", label: "Scenario Builder", summary: "Structured network scenario import, edit, validation, and export." },
  { href: "/networks/entanglement-routing", label: "Entanglement Routing", summary: "Path ranking by success, fidelity, latency, and memory warnings." },
  { href: "/networks/repeater-optimizer", label: "Repeater Optimizer", summary: "Simplified repeater spacing and fidelity/rate tradeoffs." },
  { href: "/networks/benchmark-hub", label: "Benchmark Hub", summary: "Built-in route benchmark plus concrete simulator export adapters." }
];

export const protocolDetails = {
  bb84: {
    id: "bb84",
    name: "BB84",
    category: "Prepare-and-measure QKD",
    summary: "Alice and Bob use random bases, discard mismatches, estimate QBER, then reconcile and privacy amplify the sifted key.",
    coreIdea: "Security intuition comes from nonorthogonal states: measurement in the wrong basis disturbs correlations and is visible as excess QBER under ideal assumptions.",
    math: "Sifted rate is approximately raw detections times the matching-basis probability. A common asymptotic teaching proxy is R >= q Q_mu [1 - f h2(E) - h2(E)].",
    assumptions: ["Authenticated public discussion", "Calibrated sources and detectors", "Finite-key terms are available in the dedicated finite-key BB84 teaching estimator and omitted from the asymptotic MVP pages"],
    failureModes: ["High QBER", "Detector side channels", "Weak coherent pulse multi-photon risk without decoys", "Authentication failure"],
    relatedTools: ["/tools/link-budget", "/tools/finite-key-bb84", "/tools/qber-forensics", "/tools/post-processing", "/tools/attack-explorer"],
    references: ["Bennett and Brassard, 1984", "ETSI ISG QKD publications"]
  },
  decoy_bb84: {
    id: "decoy_bb84",
    name: "Decoy-state BB84",
    category: "Prepare-and-measure QKD",
    summary: "Decoy intensities help estimate single-photon yields for weak coherent sources.",
    coreIdea: "Signal and decoy pulses reveal whether channel behavior depends suspiciously on photon number.",
    math: "The MVP uses a pedagogical lower-bound proxy for Q1 and e1 rather than a full finite-key decoy analysis.",
    assumptions: ["Intensity settings are characterized", "Decoy statistics are simplified", "Side-channel leakage is not modeled"],
    failureModes: ["Source intensity modulation flaws", "Finite statistics", "Detector side channels"],
    relatedTools: ["/tools/link-budget", "/tools/attack-explorer"],
    references: ["Hwang decoy-state method", "Lo, Ma, and Chen decoy-state QKD"]
  },
  e91: {
    id: "e91",
    name: "E91",
    category: "Entanglement-based QKD",
    summary: "Entangled-pair correlations support key generation and Bell-style disturbance checks under idealized assumptions.",
    coreIdea: "Alice and Bob measure entangled pairs in selected bases; nonclassical correlations can reveal disturbance.",
    math: "The interactive demo uses a simplified CHSH-style score S from four correlation settings; |S| > 2 is a Bell-violation indicator.",
    assumptions: ["Trusted measurement characterization unless using device-independent variants", "Loss and loopholes are simplified", "Classical channel is authenticated"],
    failureModes: ["Source impurity", "Low visibility", "Detector mismatch", "Memory or timing decoherence"],
    relatedTools: ["/tools/entanglement-qkd-estimator", "/networks/entanglement-routing", "/tools/qber-forensics"],
    references: ["Ekert, 1991", "CHSH inequality"]
  },
  bbm92: {
    id: "bbm92",
    name: "BBM92",
    category: "Entanglement-based QKD",
    summary: "An entanglement-based protocol closely related to BB84 with correlated measurement outcomes.",
    coreIdea: "Entangled pairs replace Alice's prepared states; matching-basis outcomes form the sifted key.",
    math: "QBER and privacy amplification accounting can be treated similarly to BB84 in simplified teaching models.",
    assumptions: ["Entanglement source quality is known", "Finite-key terms omitted", "Loss loopholes not modeled"],
    failureModes: ["Visibility loss", "Pair source brightness tradeoffs", "Detector effects"],
    relatedTools: ["/tools/entanglement-qkd-estimator", "/tools/link-budget", "/networks/entanglement-routing"],
    references: ["Bennett, Brassard, and Mermin, 1992"]
  },
  mdi_qkd: {
    id: "mdi_qkd",
    name: "MDI-QKD",
    category: "Measurement-device-independent QKD",
    summary: "Alice and Bob send states to an untrusted relay, reducing detector side-channel assumptions.",
    coreIdea: "A Bell-state measurement at the middle station can be untrusted; security is shifted away from detector trust.",
    math: "The MVP does not implement a full MDI rate formula; use link-budget pages as channel proxies and label the relay assumptions.",
    assumptions: ["Source states are characterized", "Phase/reference alignment is managed", "Relay can be untrusted but must report measurement outcomes"],
    failureModes: ["Source side channels", "Phase drift", "Low two-photon interference visibility"],
    relatedTools: ["/tools/mdi-qkd-estimator", "/tools/channel-planner", "/networks/scenario-builder"],
    references: ["Lo, Curty, and Qi, 2012"]
  },
  tf_qkd: {
    id: "tf_qkd",
    name: "Twin-field QKD",
    category: "Long-distance QKD",
    summary: "Twin-field protocols use single-photon interference at a middle station to improve distance scaling under strict phase control.",
    coreIdea: "Alice and Bob encode phase-related states that interfere at a central measurement node.",
    math: "The key-rate advantage depends on phase stabilization, decoy analysis, and finite-key terms not included in the MVP.",
    assumptions: ["Stable phase reference", "Careful decoy analysis", "Middle-station measurement assumptions labeled"],
    failureModes: ["Phase noise", "Reference leakage", "Interference visibility loss"],
    relatedTools: ["/tools/twin-field-qkd-estimator", "/tools/phase-encoding-calculator", "/tools/channel-planner"],
    references: ["Lucamarini et al., twin-field QKD"]
  },
  cv_qkd: {
    id: "cv_qkd",
    name: "CV-QKD",
    category: "Continuous-variable QKD",
    summary: "Continuous-variable QKD encodes information in optical quadratures and relies on reconciliation under noise constraints.",
    coreIdea: "Instead of single-photon states, Gaussian-modulated quadratures and coherent detection estimate channel noise and correlations.",
    math: "The dedicated estimator reports SNR, covariance-style observables, and a Holevo-style teaching proxy rather than a full symplectic-eigenvalue security proof.",
    assumptions: ["Excess noise is calibrated", "Receiver trust assumptions are explicitly labeled", "Finite-size and full covariance-matrix proofs are omitted"],
    failureModes: ["Excess noise", "Reconciliation inefficiency at low SNR", "Phase-reference drift", "Local oscillator and calibration assumptions"],
    relatedTools: ["/tools/cv-qkd-estimator", "/tools/post-processing", "/tools/report-generator"],
    references: ["Grosshans and Grangier CV-QKD", "Weedbrook et al. review"]
  },
  teleportation: {
    id: "teleportation",
    name: "Quantum teleportation",
    category: "Quantum communication primitive",
    summary: "An unknown quantum state can be transferred using shared entanglement plus classical feed-forward.",
    coreIdea: "A Bell measurement consumes entanglement; two classical bits tell the receiver which correction to apply.",
    math: "Teleportation fidelity depends on entanglement fidelity, Bell measurement quality, and classical latency.",
    assumptions: ["Shared entanglement is available", "Classical communication is authenticated in security settings", "Memory decoherence is simplified"],
    failureModes: ["Entanglement loss", "Bell measurement failure", "Memory lifetime limits"],
    relatedTools: ["/networks/entanglement-routing", "/networks/scenario-builder"],
    references: ["Bennett et al., 1993 teleportation"]
  },
  entanglement_swapping: {
    id: "entanglement_swapping",
    name: "Entanglement swapping",
    category: "Quantum repeater primitive",
    summary: "Intermediate Bell measurements create entanglement between nodes that never directly interacted.",
    coreIdea: "Two shorter entangled links are joined by measuring the middle qubits, with fidelity and success tradeoffs.",
    math: "The MVP route model uses F_swap = F1 F2 + ((1 - F1)(1 - F2))/3 as a Werner-state proxy.",
    assumptions: ["Bell measurements are represented by scalar success/fidelity proxies", "Memory decoherence is simplified", "Classical signaling latency is additive"],
    failureModes: ["Swap failure", "Fidelity decay", "Memory timeout"],
    relatedTools: ["/networks/entanglement-routing", "/networks/repeater-optimizer"],
    references: ["Zukowski et al., entanglement swapping", "Quantum repeater literature"]
  },
  repeaters: {
    id: "repeaters",
    name: "Quantum repeaters",
    category: "Quantum network architecture",
    summary: "Repeaters aim to extend entanglement distribution using memories, swapping, purification, or error correction.",
    coreIdea: "Long channels are divided into shorter segments so loss and memory tradeoffs can be managed.",
    math: "The MVP optimizer uses equal spacing, link transmittance, fixed swap penalty, and fidelity proxies.",
    assumptions: ["No full purification stack", "Memory and swap models are scalar proxies", "Hardware details are not calibrated"],
    failureModes: ["Memory decoherence", "Low swap success", "Accumulated fidelity loss"],
    relatedTools: ["/networks/repeater-optimizer", "/networks/benchmark-hub"],
    references: ["Briegel et al., quantum repeaters"]
  }
} as const;

export const protocolList = Object.values(protocolDetails);
