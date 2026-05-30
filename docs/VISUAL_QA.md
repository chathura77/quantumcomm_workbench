# Visual QA Checklist

Use this checklist after meaningful UI changes, especially changes to shared layout, calculators, directory pages, or JSON-heavy editors.

## Viewports

- Desktop: 1440 x 900
- Tablet: 1024 x 768
- Mobile: 390 x 844

## Route set

- `/`
- `/tools`
- `/tools/link-budget`
- `/tools/finite-key-bb84`
- `/tools/report-generator`
- `/networks/scenario-builder`
- `/resources`
- `/learn/bb84`

## Checks on each route

- Primary navigation stays visible and wraps cleanly without overlapping the wordmark.
- The skip link remains reachable by keyboard and lands on the main content landmark.
- Cards, forms, tables, and charts stay within the viewport without horizontal page scrolling.
- Labels, helper text, warnings, and button text remain readable against the background.
- The footer keeps the disclaimer, references link, model-limitations link, and source-repository link visible.

## Tool-specific checks

### `/tools/link-budget`

- Input panel stacks below the results panel on mobile and returns to a two-column layout on large screens.
- Distance sweep chart summary remains visible below the chart.
- Metric cards wrap without clipping units or caution text.

### `/tools/finite-key-bb84`

- Long formula and warning sections remain readable on tablet widths.
- Sensitivity sweep and uncertainty-band summaries stay visible without relying on color alone.

### `/tools/report-generator`

- Saved-run controls, compare controls, and the JSON textarea remain keyboard reachable in document order.
- Empty-state and invalid-JSON recovery copy remain visible on mobile.

### `/networks/scenario-builder`

- Node/link tables remain readable on tablet and mobile without clipping action buttons.
- Saved-scenario library controls remain reachable after the import/export section.

## Evidence to capture when practical

- One screenshot per viewport for `/`, `/tools/link-budget`, and `/networks/scenario-builder`.
- Note any overflow, clipped copy, low-contrast text, or inaccessible focus order before merging UI changes.
