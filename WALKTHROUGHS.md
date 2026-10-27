# Guided walkthroughs

See [WALKTHROUGH_PLAN.md](WALKTHROUGH_PLAN.md) for the project inventory, actual
controls, role distinctions and implementation plan. The portal uses Driver.js
1.10.2, pinned in npm. Its JavaScript loads only when a tour starts; CSS matches the
existing paper/ink/violet/lime theme and supports dark mode and reduced motion.

## Behavior

- Each of 16 signed-in areas and 26 HR modules has a separate completion key.
- Steps and explanations follow Admin/CFO/HR/Manager/Employee permissions and
  whether the account is linked to an employee. Missing conditional controls are
  omitted; no sample elements or records are fabricated.
- New visits start a tour after the page data is ready. Mandatory password/email/
  profile setup completes first. An already-open form is not interrupted.
- Next/Back navigate, Skip/close/Esc finish the tour, and a progress counter is
  always visible. The profile menu offers **Take the tour again**.
- Finishing or skipping appends the page key to the authenticated user's database
  preference. Replay does not erase saved completion. Route changes, module
  changes and logout cancel the current tour without marking it complete.
- Modals and async fields have bounded, cancellable DOM waits. Failure closes the
  tour with a retry message rather than spotlighting a fake or absent element.
- Tours are previews: only explicitly configured Add/open controls can activate.
  Pointer/keyboard form submission, editing, file selection and business actions
  are blocked while active. Skipping restores normal interactions. Blank forms
  opened by the tour are closed when returning to the page or exiting.
- If saving completion fails, the tour stays closed in the current session and a
  toast offers **Retry saving**. Without a successful save, a fresh login/reload
  can show it again. Retry callbacks are invalidated on logout/account changes.

Job Roles intentionally teaches suggested pay bands instead of an invented
permissions field. Actual login permissions are taught in **Accounts & roles**.

## Data and API

Backend migration: `V6__user_tours.sql`. `users.tours_completed` is a non-null JSONB
array, defaulting to `[]`; existing users receive their first tour on their next
eligible page visit. Login, refresh and `/api/auth/me` include `user.toursCompleted`.

| Endpoint | Purpose |
|---|---|
| `GET /api/user/tours` | Current authenticated user's completed keys |
| `POST /api/user/tours/{tourKey}/complete` | Idempotently append a known key; return completed keys |

There is no target user/company ID and no arbitrary array update endpoint. The
server allowlists page/module keys, uses prepared SQL, scopes writes to the JWT's
current user/company, and atomically appends without lost concurrent updates.
Existing authentication, first-login restrictions and authenticated-write rate
limits apply. Completion does not grant page access or change any permissions.

Descriptions are rendered as escaped text before reaching Driver's HTML popover.
No credentials, personnel data or record text are copied into tour configuration;
there is no external tour analytics service or additional session storage.

## Adding a page tour

1. Give the real page root `data-tour-page="example"` and
   `data-tour-ready={loaded && !error}`. Add unique, stable `data-tour="..."`
   anchors to the actual controls; keep empty list containers present.
2. Add `example` to `src/tours/tourConfig.ts`, with its permitted roles and steps.
   Each step has `element` (the anchor value), `title`, and `description`.
   `descriptionByRole`, `roles`, `linked` and `optional` customize the walkthrough.
3. For a modal, tag its `DialogContent`. Use the existing `form(opener, root,
   fields, save)` helper, and put `close: root` on the return-to-list step. Set
   `activate` only on safe UI-open buttons, never on Save, approval, upload,
   attendance or other mutation controls. The common Dialog close anchor is used
   for cleanup. Existing Radix modal behavior remains unchanged outside tours.
4. Register the key in backend `TourController.PAGES`. For HR modules, keep the
   static `portalModules` labels/fields/scoped metadata aligned with `HrCatalog`;
   the backend already derives allowed module keys from that catalog.
5. Extend the selector/role contract tests and the expected key count; verify
   Next/Back/Skip/replay and real modal targets in the browser.

No new migration is needed when adding another allowed tour key.

## Validation and manual checklist

Automated: 67 backend tests and 18 frontend tests pass. Coverage includes saved
session state, idempotence, concurrent completions, company/account isolation,
unauthenticated requests, unknown keys, role filtering, HTML escaping and selector
contracts against the real TSX controls. The optimized production build and its
TypeScript checks also pass.

- [x] Fresh synthetic user receives an automatic tour.
- [x] Roles: real Add button opens the modal; name/band/range/save/list work.
- [x] Next opens the form when the highlighted Add button is not clicked.
- [x] Back closes/reopens tour-owned blank forms correctly.
- [x] Done persists completion; reload does not repeat the tour.
- [x] Escape and visible Skip close and persist completion.
- [x] Profile-menu replay starts a completed tour.
- [x] A 390px viewport keeps the modal popover and controls within the screen.
- [x] Role contract tests exclude admin/finance forms from manager/employee tours.
- [x] Browser sweep across Admin, CFO, HR, Manager and Employee role variants.
- [x] Main-page spotlights, including accounts/employee/tier/raise/component forms,
  reports, audit, settings, imports, dashboard, personal details and own pay.
- [x] Representative HR module forms: position metrics, interviews, development
  goals and employee leave requests; manager interviews omit creation controls.
- [x] Running attendance and pending approval dialogs wait for their real fields.
- [x] Clicking previewed finish/decision Save controls does not submit a mutation.
- [x] Leaving a tour by navigation does not persist completion.

Browser checks used isolated fictional accounts and the production frontend.
The full 26-module catalog is covered by the shared configuration/selector
contracts; the browser form sweep sampled the modules listed above rather than
every record/state combination. The sweep caught and fixed a dashboard anchor on
a loading placeholder and attendance form cleanup occurring one step too late.
API reads confirmed that the synthetic running session remained open and the
synthetic help request remained pending after clicking their previewed Save
controls. Test attendance sessions were subsequently closed through the API.

The synthetic Roles walkthrough left the company with zero job roles, confirming
that it did not submit the sample form. No existing demo salaries were modified.

## Files delivered

New frontend files:

- `src/tours/tourConfig.ts`
- `src/tours/tourRunner.ts`
- `src/tours/tour-provider.tsx`
- `src/tours/tour-context.ts`
- `src/tours/tourConfig.test.ts`
- `WALKTHROUGH_PLAN.md`, `WALKTHROUGHS.md`

Modified frontend files:

- `package.json`, `package-lock.json`, `README.md`
- `src/app/layout.tsx`, `src/app/globals.css`, `src/app/(app)/layout.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/employees/page.tsx`
- `src/app/(app)/employees/[id]/page.tsx`
- `src/app/(app)/employees/import/page.tsx`
- `src/app/(app)/portal/page.tsx`
- `src/app/(app)/portal/profile/page.tsx`
- `src/app/(app)/attendance/page.tsx`
- `src/app/(app)/approvals/page.tsx`
- `src/app/(app)/tiers/page.tsx`
- `src/app/(app)/roles/page.tsx`
- `src/app/(app)/compensation/page.tsx`
- `src/app/(app)/reports/page.tsx`
- `src/app/(app)/accounts/page.tsx`
- `src/app/(app)/audit/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/my-compensation/page.tsx`
- `src/components/app-shell.tsx`, `src/components/auth-provider.tsx`
- `src/components/ui/dialog.tsx`, `src/components/action-disclosure.tsx`
- `src/components/finance-workspace.tsx`, `src/components/hr-workspace.tsx`
- `src/components/private-profile.tsx`, `src/components/personnel-files.tsx`
- `src/lib/types.ts`, `src/lib/use-portal-sync.ts`

New backend files:

- `src/main/resources/db/migration/V6__user_tours.sql`
- `src/main/java/com/empmg/platform/user/TourController.java`
- `src/test/java/com/empmg/platform/auth/TourFlowIT.java`

Modified backend files:

- `src/main/java/com/empmg/platform/user/domain/User.java`
- `src/main/java/com/empmg/platform/auth/dto/TokenResponse.java`
- `src/main/java/com/empmg/platform/auth/AuthController.java`
- `README.md`, `SECURITY.md`

Library reference: [Driver.js interactive tours](https://driverjs.com/docs/interactive-tours).
