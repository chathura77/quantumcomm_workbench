# UI spec

## Visual direction

Use a clean technical interface. Avoid sci-fi clutter. The product should feel like a research workbench.

Suggested layout patterns:

- Left input panel, right result panel for calculators.
- Formula/assumption accordion below results.
- Preset selector at top of each tool.
- Export/share buttons near results.
- Warning banners for invalid model regimes.

## Core components

### `ToolShell`

Reusable layout for calculators.

Props:

- `title`
- `description`
- `children` for input form
- `results`
- `formulaPanel`
- `references`

### `ParameterField`

Reusable numeric input with unit and help text.

Features:

- Label.
- Unit suffix.
- Min/max validation.
- Tooltip/help text.

### `PresetSelector`

Dropdown or cards for presets. Selecting a preset fills the form.

### `ResultMetricCard`

Displays a metric with value, unit, precision, and short explanation.

### `FormulaPanel`

Shows equations and assumptions in a readable way. Avoid raw walls of math.

### `WarningPanel`

Shows warnings with severity.

### `ExportRunButton`

Exports reproducible JSON and Markdown.

### `SimpleLineChart`

For sweeps and timelines.

### `ContributionBar`

For QBER contribution breakdown.

### `ScenarioEditor`

MVP can be table-based:

- Node table.
- Link table.
- Import/export JSON.
- Validate scenario.

A graph canvas can be added later.

## Accessibility

- All controls must have labels.
- Use semantic buttons and forms.
- Charts should include textual summaries.
- Color should not be the only indicator for warnings or categories.
- Inputs should be keyboard navigable.

## Content guidelines

Each tool page must include:

1. What this tool estimates.
2. What the input parameters mean.
3. The numerical result.
4. The formulas/assumptions.
5. Model limitations.
6. Export button.

## Example result copy

Good:

"The estimated secret-key rate is 1.8 kb/s under an asymptotic BB84 approximation with detector dark counts and basis sifting. This estimate does not include finite-key security proof terms or hardware side-channel leakage."

Bad:

"This link is secure and produces 1.8 kb/s."
