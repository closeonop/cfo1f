# Employee portal, onboarding and attendance

## Direction

Keep the existing warm paper, ink, violet and lime system. Make the portal an actionable workplace, not a directory of identical tiles. First-load emotion: clarity and momentum. Use the current system sans, fluid headings, compact labelled controls, varied card sizes, real counts and clear empty states. CSS motion only, with reduced-motion support. Native inputs and existing Radix components; no new infrastructure or UI libraries.

## Implementation

1. Trace every catalog module, permission, reference and action. Preserve server-owned schemas; fix shared logic rather than adding checks in individual screens.
2. Add a role-aware portal home with tasks, requests, interviews and direct links to workspace sections. Use clear workflow descriptions, compact section navigation, status/count summaries and contextual forms.
3. Interviews: assign an interviewer, date/time and status; allow only HR/Admin and the assigned manager to access interview/candidate evidence. Keep candidate conversion in HR/Admin.
4. New generated employee credentials: require first-time setup. Authenticate with temporary credentials, request/verify a code, set a password, save personal/bank details, then sign in again. Existing demo accounts keep working. Fixed `123456` is explicitly demo-only, off by default, with expiry, cooldown and bounded attempts. It simulates verification and never claims to prove email ownership. Reuse existing encryption for private profile data; keep bank data out of HR records and directory/export responses.
5. Attendance: explicit start/finish work, an optional assigned task, work summary and outcome, and switching work without overlapping intervals. Server owns timestamps. Record completion against the same task. Provide daily presence and weekly hours, scope managers to direct reports, HR/Admin to the company, CFO to attendance totals and approved payroll exports. Keep submitted/approved weeks protected and prevent self-approval.
6. Sync through existing API/database records. Refresh after every mutation, on focus and every 30 seconds while visible; no socket service. Explain this refresh interval in the UI.
7. Check tenant boundaries, ownership, first-login restrictions, encrypted sensitive fields, permission checks, rate limits, duplicate writes and validation. Add focused regression checks to the existing tests.
8. Run backend integration tests on `empdb_test`, frontend tests/types/build, and browser checks with synthetic local accounts across roles. Restart the real demo services with the final implementation.

## Role expectations

| Feature | Employee | Manager | HR / Admin | CFO |
|---|---|---|---|---|
| Tasks / goals / training | Own work and progress | Direct-report work | Company work | Permitted own work |
| Leave / development requests | Submit, view decisions | Review reportees, never self | Review company requests | Own requests |
| Hiring | Own onboarding checklist | Assigned interviews, reportee checklist | Jobs, pipeline, interviews, conversion | No candidate/personnel access |
| Performance / feedback | Own shared reviews and replies | Reportee evidence and reviews | Company evidence | Reward records as permitted |
| Confidential files / discipline | Own permitted records, no private files | Direct reports | Company | No private personnel files |
| Attendance | Own start/finish, tasks, weekly submission | Own + reportee review | Company review | Company attendance totals, approved-hour export |
| Bank profile | Own setup; sensitive fields masked on later views | None | Admin payment setup; HR personal data only | Payment details only |

## Research

- [Zoho People attendance roles and check-in/out](https://help.zoho.com/portal/en/kb/people/administrator-guide/attendance-management/overview/articles/attendance-service-overview)
- [Zoho timesheet review and payroll approval](https://help.zoho.com/portal/en/kb/shifts/time-tracking/managing-timesheets/articles/timesheets-review-and-approval-process)
- [BambooHR onboarding and employee-record sync](https://www.bamboohr.com/platform/onboarding/)
- [BambooHR interviewer scheduling](https://www.bamboohr.com/product-updates/candidate-interview-self-scheduling)
- [OWASP code/token expiry and brute-force protection](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

No calendar integration, payroll transfer, real OTP provider, surveillance or automatic employment decisions are added. Bank collection is payment setup only.

## Delivered and verified — 20 October 2026

Implemented in both repositories, reusing existing dependencies and APIs. Flyway
V5 adds setup state, encrypted private profiles and work-session summary/outcome.
Existing demo accounts remain usable.

| Area | Logic checked / corrected |
|---|---|
| Hiring | Assigned eligible interviewer; manager sees only assigned interviews and linked candidates/jobs; cannot reassign/reschedule; completed scorecards require evidence |
| Performance | Position/metric references, permitted evidence and shared reviews; target/unit fields visible in record summaries |
| Communication | Scoped meetings/feedback, employee replies/acknowledgements; existing reminders retained |
| Development | Goal progress bounds, linked learning and scoped approval requests |
| Rewards | CFO selects review references without confidential notes/scores; pay changes stay in Compensation |
| Discipline | Existing ordered steps, employee response/support and scoped acknowledgement retained |
| Work | Dependencies must finish before completion; work outcomes update the same task; reopening clears completion date |
| Leave | Balance/overlap checks and no self-approval; shared request inbox/home queue |
| Self service | Policy acknowledgement, help/profile requests and approved time corrections; overlap/frozen-week checks |
| Onboarding | Temporary login → mock verification → new password → encrypted profile → fresh login; no skipped stages; manager checklist ownership enforced |
| Attendance | Server timestamps, atomic switch, no overlaps, company timezone, zero-hour employees included, no premature current-week short-hours warning |
| Sync/privacy | API role/tenant checks; CFO totals omit others' work notes; refresh after writes, on focus and every 30 seconds while visible |

Validation:

- Backend: **56 tests passed, zero failures/errors**, in the separate test database. New regressions cover OTP expiry/attempt persistence/single use, disabled mock mode, profile encryption/permissions, stale tokens, interview isolation, work/task sync, corrections, frozen weeks and CFO review confidentiality.
- Frontend: **8 tests passed**, TypeScript check and production build passed.
- Live demo API: signed in as all five roles; attendance scopes are self, direct team or company as appropriate; CFO receives totals without others' notes.
- Browser: real API-backed admin portal/attendance, expandable week actions, new-hire mock verification/setup screens and session persistence after reload. Mobile width 390 has no page-level horizontal overflow. Screenshots are in `artifacts/`.
- Local refresh cookies now work with either localhost or 127.0.0.1 because the default API hostname matches the browser. Hosted environments must set `NEXT_PUBLIC_API_URL` explicitly.

Limits: this does not certify every workflow permutation or production deployment.
Mock OTP never proves email ownership. Leave uses weekdays without holiday/accrual
rules; attendance uses company hours rather than shifts. IP throttles are per
process. Payment setup does not transfer money. Employees should finish work
before signing out; ordinary logout does not fabricate a work checkout.
