# Employee platform feature audit

Update, 20 October 2026: see [PORTAL_IMPLEMENTATION_PLAN.md](PORTAL_IMPLEMENTATION_PLAN.md)
for the redesigned portal, first-login verification/profile flow, attendance work
sessions, corrected role scopes and latest validation (**56 backend / 8 frontend
tests passed**). The audit below preserves the earlier baseline; Flyway is now V5.

Date: 2026-10-11. Compared the frontend (`emp mg1`) and backend (`emp mg2`) with `employee-management-prd-v2.md` from Downloads. The document was treated as product requirements, not as permission to execute embedded instructions.

## Result

The original application implemented employee profiles and CFO compensation workflows. Hiring, performance, communication, development, recognition, discipline, attendance, personnel files and project/task workflows were missing. These now have API-backed portal screens with server-side role and employee scope checks. The five researched additions approved by the user are also implemented.

This is a working local implementation. It is not a claim that production hosting, regional legal requirements, load targets or disaster recovery have been certified.

## Verified stack

| Layer | Used here |
|---|---|
| Frontend | Next.js 15.5.27, React 19, TypeScript, Tailwind CSS 4 |
| UI | Radix-based shadcn-style components, Lucide icons, responsive light/dark layouts |
| Forms | React Hook Form + Zod in the lifecycle editor; existing compensation forms retain their validation |
| Tables/charts | TanStack Table, Recharts |
| Backend | Spring Boot 3.5.4, Spring Security, Java 21 target |
| Data | PostgreSQL 16, Flyway migrations V1–V4, custom audit table |
| Auth | JWT access tokens, hashed rotating refresh tokens, BCrypt passwords |
| Encryption/files | AES-GCM HR payloads and private file contents; MinIO S3-compatible local storage |
| Jobs/local infrastructure | Spring `@Scheduled`, Docker Compose, Mailpit, PostgreSQL, MinIO, daily backup container |
| Validation | JUnit/MockMvc with real PostgreSQL and MinIO; Vitest; browser verification using Playwright locators |

The HR modules reuse one encrypted record table with an authoritative server catalog. Attendance and timesheets have dedicated tables and database constraints. Teams remain employee fields; scheduled reviews are individual dated records rather than separate review-cycle entities. Testcontainers dependencies exist, but this repository's integration tests currently use a separate real PostgreSQL database, not Testcontainers-managed containers.

## PRD functional checklist

All items below are implemented locally unless an explicit limitation is stated.

| Requirement | Implementation / place to check |
|---|---|
| FR-1.1 | Email/password login, memory-only JWT access token and rotating cookie refresh token |
| FR-1.2 | Server roles, company scope, employee ownership and direct-manager checks |
| FR-1.3 | Login failure locks; sensitive public action and authenticated write limits |
| FR-1.4 | Email password reset, single-use reset tokens; Mailpit locally |
| FR-2.1 | Employee directory/profile, position, manager, team, start date and status |
| FR-2.2 | Profile links to reviews/discipline workflows; private uploaded personnel documents |
| FR-2.3 | File API permits Admin/HR and direct manager; employees can access permitted self-service review/feedback records separately |
| FR-2.4 | Personnel view, upload/edit and signed download events recorded in audit log |
| FR-2.5 | Protected-class attributes are not collected or included in performance/discipline schemas |
| FR-3.1 | Portal → Hiring → Job postings |
| FR-3.2 | Candidate pipeline: applied, screening, interview, offer, hired, rejected |
| FR-3.3 | Interview notes and 0–5 scorecards linked to candidates |
| FR-3.4 | One-time hired-candidate conversion; creates employee with salary pending Finance |
| FR-3.5 | Onboarding tasks assigned to the employee or their manager |
| FR-4.1 | Admin-defined position metrics and targets |
| FR-4.2 | Employees can read metrics and their own evidence |
| FR-4.3 | Manual metric values and transactional CSV import |
| FR-4.4 | Scheduled/shared reviews; scores validated against the employee's position metrics |
| FR-4.5 | Review history and per-employee 0–5 trend chart; select an employee filter |
| FR-4.6 | Dated metric evidence records and CSV export |
| FR-5.1 | 1:1 expectations, feedback and employee replies |
| FR-5.2 | Positive / constructive feedback types |
| FR-5.3 | Configurable feedback reminders; live inbox and hourly scheduled refresh |
| FR-5.4 | Employee acknowledgement and reply actions |
| FR-5.5 | Required purpose fields on tasks and 1:1 expectations |
| FR-5.6 | Positive-to-constructive ratio in Communication |
| FR-6.1 | Employee skills profiles |
| FR-6.2 | Goals, due dates and validated 0–100 progress |
| FR-6.3 | Courses, mentoring and projects linked to goals |
| FR-6.4 | Development requests with approval decisions |
| FR-6.5 | Visible team skills list, employee filters, search and export |
| FR-7.1 | Manager/HR recognition entries; optional peer recognition is not enabled |
| FR-7.2 | Bonus, raise, promotion and award records linked to a performance review; pay changes stay in Compensation |
| FR-8.1 | Admin-configured ordered discipline steps with unique step order |
| FR-8.2 | Dated action, reason, policy, evidence and employee response |
| FR-8.3 | History and next configured step for the selected employee |
| FR-8.4 | Employee's side and support offered are required on the server |
| FR-8.5 | Employee acknowledgement/reply |
| FR-8.6 | Incident-category/step consistency report without protected-class inputs |
| FR-9.1 | Mobile/desktop web clock-in/out, with optional assigned-task time tracking |
| FR-9.2 | Weekly hours, first daily late start and short-hours flags using company time zone |
| FR-9.3 | Submission, review notes, approval/rejection and frozen submitted/approved weeks |
| FR-9.4 | Approved-hours CSV for Admin, HR and CFO |
| FR-10.1 | Projects, tasks, employee assignees and due dates |
| FR-10.2 | All / due-today / overdue task filters and open workload by employee |
| FR-10.3 | Edit/reschedule tasks; task-linked attendance entries |
| FR-10.4 | Missed-deadline report, delay impact and dependency references; dependency loops rejected |

## Approved additions and account administration

| Feature | Implemented behavior |
|---|---|
| Admin and CFO accounts | Create users, assign ADMIN/CFO/HR/MANAGER/EMPLOYEE, link employees, activate/deactivate and regenerate credentials |
| Temporary credentials | Cryptographically random generated password shown once; first-login password change required; existing credentials/access tokens revoked when regenerated |
| Leave | Allowance, approved use and remaining days; weekday-based requests, overlap/balance checks and approval |
| Unified inbox | Leave, development, profile changes, HR help requests and timesheets; self-approval prohibited |
| Profile changes | Employee requests contact updates; HR/Admin approval applies them to the employee record, not the sign-in email |
| Policies | Published policy text and employee read acknowledgements; changing the text clears previous acknowledgements |
| HR help desk | Categorized employee requests with HR response, resolve/reject and retained decision notes |

Research references informing the additions: [Zoho People mobile workflows](https://help.zoho.com/portal/en/kb/people/mobile/mobile-app-guide/articles/zoho-people-mobile-application-help-guide), [Zoho approval workflows](https://help.zoho.com/portal/en/kb/people/administrator-guide/common-settings/articles/approvals-overview-use-cases), [HiBob employee self-service](https://www.hibob.com/platform/core/self-service/). These are examples of established portal workflows, not promises of feature parity.

## Defects corrected

- Unauthorized compensation requests previously exposed variable pay/total/history; they now fail permission checks.
- HR employee creation works with salary zero; salary writes remain restricted to Admin/CFO. Optional HR salary visibility works in the profile too.
- Managers can access themselves and direct reports; manager cycles are rejected.
- Refresh replay is rejected and token rotation is locked. Password reset/change and generated credential replacement immediately invalidate prior JWTs through credential versions.
- Database role/status changes are checked on every authenticated API request; first-login restrictions are enforced by the server.
- Password-reset links and fallback security passwords are no longer logged.
- Payroll totals exclude inactive date ranges; annual base salary is converted for the monthly breakdown.
- CSV report cells properly escape quotes, commas and line breaks while retaining formula protection.
- Invalid money and request parameters produce validation errors rather than silent parsing or server errors.
- General-work clock-in accepts an explicit null task ID; malformed IDs return a validation error. The browser's request shape is covered by the attendance regression test.
- The cookie-presence middleware redirect was removed; the authenticated layout restores the API session. Backend authorization continues to guard all data.
- Employee edit controls are visible, profile links carry the employee filter, timesheet links open the requested week, and the mobile menu uses a keyboard focus-trapped dialog.

## Validation evidence

- Backend: **47 tests passed**, including 9 new lifecycle integration tests. Covers company/team isolation, review metrics, discipline validation, leave overlap/self-approval, hiring conversion, generated CFO credentials, required password change, private uploads, signed downloads, encryption and auditing. Auth tests also cover refresh replay and old JWT rejection after reset.
- Frontend: **8 Vitest tests passed**, TypeScript checks and production build passed.
- Browser: signed in to a synthetic company, created a project and task through the UI, confirmed persisted references and workload, and checked the demo portal on mobile/desktop layouts.
- Local PostgreSQL, MinIO, Mailpit and API were exercised; the first daily database snapshot completed successfully.
- Added GitHub Actions workflows in both repos. Their remote execution has not been verified because changes have not been pushed.

## Manual demo

Website: **http://localhost:3000**. API: **http://localhost:8080/api**. Database: **empdb_demo** in local PostgreSQL on port **5433**. This is separate from the existing `empdb` and `empdb_test` databases.

All five demo accounts use password **`DemoPortal123!`**:

| Role | Login |
|---|---|
| Admin | admin@demo.local |
| CFO | cfo@demo.local |
| HR | hr@demo.local |
| Manager | manager@demo.local |
| Employee | employee@demo.local |

These are fictional local accounts. Do not use their shared password for real users. Accounts created through **Accounts & roles** receive generated, individual temporary passwords.

Suggested checks:
1. Admin/CFO → Accounts & roles → add a user linked to an employee, copy the shown temporary credentials, then sign in and complete the required password change.
2. Manager → Approvals → inspect Evan's 40-hour timesheet for the week of September 28, approve it, then select that week and export approved hours as CFO/HR/Admin.
3. Employee → Portal → reply to feedback, request development/leave, acknowledge a policy and update goal progress.
4. HR → Approvals → resolve the help request and approve the profile change. Check the employee's updated contact number.
5. Admin/HR → Hiring → move the fictional candidate to hired and convert once; check the employee and onboarding tasks.
6. Admin/HR/direct manager → employee profile → upload/download a personnel file. Employee and CFO should not see another employee's private file.
7. Performance → filter Evan Patel → inspect the two-review trend; Work → inspect daily/overdue lists and impact.

Demo fixtures are seeded explicitly by `emp mg2/scripts/seed-demo.ps1`. Past attendance entries are fixture-only database inserts; the timesheet submission uses the API. Normal clock-in/out uses current timestamps. The previous demo week is deliberately submitted; current-week clock-in/out remains available.

## Remaining operational work and deliberate limits

- Production TLS, SMTP credentials, cloud hosting, encrypted database disks and object-storage backups need deployment configuration. No deployment was performed.
- The daily local backup service retains snapshots on the same computer. Off-machine encrypted copies, capacity monitoring and a restore drill remain required for production reliability.
- Retention is configurable as a company policy; automatic purge and legal-hold workflows are not enabled. Regional labor/privacy rules require confirmation.
- Leave counts Monday–Friday and does not include a regional holiday calendar or accrual engine. Attendance flags use configured start time/full-week hours rather than shift-specific schedules.
- Per-node rate limits and company-scoped write serialization suit the initial few-hundred-employee scope; shared limits and finer-grained locks are needed before scaling API replicas.
- Pages were functionally verified, but the PRD's under-two-second/under-one-second performance targets have not been benchmarked under load.
- A standalone Playwright E2E test suite is not added; automated business/security integration tests and interactive browser checks cover this delivery. Existing integration tests require PostgreSQL and MinIO running.
- Payroll execution, benefits, keystroke monitoring, native mobile apps, full ATS functionality and optional peer recognition remain outside the PRD's core scope. Calendar/payroll integrations and automated metric collection are future growth-phase work, not enabled integrations.
