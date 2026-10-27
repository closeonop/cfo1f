# People & finance refresh

## Art direction

Trust, clarity and control. Warm editorial surfaces with ink panels, violet actions
and lime highlights, using the existing font and colour tokens. Fluid headings,
tabular amounts and labelled controls. Pay bands become readable cards; finance
uses one full-width breakdown instead of three cramped tables. CSS-only hover and
focus feedback with reduced-motion support. No new dependencies.

## Work

1. Tiers: show pay period, active/archived states, assignment coverage, salary bands
   and readable statistics. Fold assign/edit/reorder/archive into labelled actions.
2. Roles: distinguish job roles from login permissions, show default pay bands and
   active headcount, add search and archive/restore controls.
3. Compensation: monthly base/variable/total summary, switchable cost grouping,
   clear raise status and review details before decisions. Keep preview and final
   cap policy consistent; HR proposals must work when salary visibility is disabled.
4. Reports: repair cost-report URLs, prevent stale request results, validate date
   ranges, keep CSV filters aligned, format percentages as percentages, and show
   understandable report descriptions and honest empty/error states.
5. Correct related server validation/calculation defects, add focused integration
   regressions, then run frontend tests/types/build and browser checks.

## Scope

Keep existing APIs, database and access rules. Tiers do not automatically change
anyone's salary. Role defaults are suggestions in the employee form. Payroll
reports are estimates/snapshots, not payroll transfers or prorated payslips.

## Completed checks

All four pages use the shared finance navigation and visual system, with existing
components and no new packages. Tiers and roles have search, archived views,
labelled expanders, clear pay-period labels and live employee counts. Compensation
has monthly summaries, one selectable grouping, status filters, raise details and
an explicit review step for decisions. Report choices explain the meaning of each
snapshot, expose visible date filters and distinguish failure from empty data.

Corrected functional defects:

- JSON cost reports now call `/reports/cost-by?group=...`; CSV uses its supported named endpoint. Hidden date filters do not affect unrelated reports. Stale responses cannot replace a newer report selection.
- Tier monthly base and raise monthly totals normalize annual salaries. Average band pay remains in the configured base-pay period and is labelled accordingly.
- A capped raise cannot lower existing pay or round above the maximum. The cap policy is chosen before preview; changing it requires returning to setup and previewing again.
- HR without salary access receives no individual salary, effective percentage, or total cost in raise preview/create/detail/cancel responses. HR still submits proposals for Finance. Managers/employees cannot open raise details.
- Pay band and role requests validate blank/long names, negative/malformed ranges, precision and archived default references. Tier assignments reject invalid/foreign/inactive employees atomically; reordering requires each active band once. Restore rejects conflicting active names.
- Job roles expose archive/restore and retain default-component payloads when editing unrelated fields. Existing employee assignments are preserved on archive.
- Payroll snapshots include prior employment and exclude months after the latest inactive update. Variable-pay reports omit future/expired components; percentage rates display as percentages, with currency only on amounts/monthly equivalents.
- Report date ranges are validated server-side, and CSV month requests are bounded to 36. Variable components now validate required input/date order and disallow ambiguous one-time percentages.
- The unfinished legacy MOVE cap option is rejected by the API: band assignment is handled explicitly through Tiers rather than mutating an employee during a raise preview/proposal.

Verification: **63 backend tests passed**, including seven new integration/regression
tests; **11 frontend tests passed**, TypeScript and production build passed.
Browser checks covered the saved band editor, expandable actions, job-role cards,
cost grouping, preview-only raises, every report, date filtering and CSV downloads.
Tests use a separate database and synthetic companies; no demo salaries were changed
by manual verification.

Responsive checks passed on all four pages at 390px (no page-level horizontal
overflow) and at the 1280px desktop breakpoint. Navigation scrolls within its own
row on mobile; tables keep their own horizontal scrolling. Final screenshots:
`artifacts/finance-tiers-final.png` and `artifacts/finance-compensation-final.png`.

Deliberate limits: historical employment status uses the latest inactive-update
timestamp because the existing model has no dated employment-status history.
Payroll snapshots are month-end base estimates, without proration/taxes/deductions.
This is functional regression evidence, not production or load-test certification.
