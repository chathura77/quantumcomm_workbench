# Release checklist

## Quality gates

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

## Product review

- Verify the footer disclaimer and model-limitations links still render.
- Run the route/API smoke coverage locally and confirm no route inventory drift.
- Re-run the manual cases in `docs/ACCEPTANCE_TESTS.md`.
- Re-run the responsive pass in `docs/VISUAL_QA.md` when shared UI changed.

## Domain review

- Confirm new outputs still label assumptions, units, warnings, and non-certified teaching limitations.
- Confirm attack modules remain simulation-only and do not add operational instructions.
- Confirm mock APIs and exports do not expose real secret-key workflows or credentials.

## Release artifacts

- Update `docs/ROADMAP.md` progress notes when a phase meaningfully advances.
- Check that docs describing contracts, routes, and simulator mappings still match the code.
- Confirm the GitHub Actions `CI` workflow is green before triggering `Deploy Hostinger VPS`.
- Record any known gaps or follow-up work before publishing.
