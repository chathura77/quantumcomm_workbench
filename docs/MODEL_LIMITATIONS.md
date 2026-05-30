# Model limitations

QuantumComm Workbench MVP models are transparent educational and research estimates. They are not certified security proofs, hardware calibration results, or production cryptographic validation.

## General limitations

- Most calculators use asymptotic or scalar proxy formulas.
- Finite-key security terms and composable security proofs remain simplified teaching bounds rather than certified security claims.
- Detector dead time, afterpulsing, and basis bias now have explicit coarse proxy controls in the BB84 estimators, but they are not calibrated hardware submodels.
- Calibration drift, timing jitter, full decoy-state estimation/optimization, and side-channel models remain omitted. The decoy-state pages expose a single-photon lower-bound teaching proxy, not a deployable proof.
- Attack explorer modules are simulation-only educational models and do not provide operational attack instructions.
- Network tools use route, fidelity, and rate proxies suitable for scenario comparison, not a full discrete-event quantum network simulator.
- Mock QKD API keys are visibly demo-only strings and must not be used as production secrets.

## Intended use

Use the workbench to compare assumptions, teach protocols, draft scenarios, and prepare reproducible parameter sets for deeper tools. Treat all outputs as starting points for specialist review.
