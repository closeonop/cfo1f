# Portal walkthrough plan and inventory — 21 October 2026

## Project

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS and Radix-based UI.
JWT access tokens stay in memory; HTTP-only SameSite refresh cookies rotate.
Spring Boot 3.5 / Java 21 target, PostgreSQL + Flyway, MinIO private files, local
Docker infrastructure. npm is the frontend package manager.

## Page inventory

| Signed-in page | Real controls and features |
|---|---|
| Dashboard | Role-aware summary, payroll when permitted, upcoming raises, portal links |
| Employees | Search/filter/export/import, Add employee; name/email, role, tier, manager, team, start date, permitted salary; save |
| Employee profile | Identity/reporting line, HR links, permitted compensation/components/history, private profile, audited files |
| Employee import | Template/download, CSV upload, duplicate policy, mapping, preview, confirm and undo |
| Employee portal | Role-aware next steps, requests/review queue, workspace links |
| Attendance | Start/finish/switch, task/focus, work summary/outcome, week/employee filter, submit/correction/review/export |
| Approvals | Pending requests/timesheets, decision note, confirmation, reminders; no self-approval |
| Tiers | Band search, create name/min/max/colour, save, assign, edit, reorder, archive/restore |
| Job Roles | Name, suggested band/pay range, Save, search, archive/restore. No permission field |
| Compensation | Monthly cost/grouping, raise scope/type/value/date/cap/reason, preview/confirm, history/review |
| Reports | Six report choices, history date filters, refresh, CSV export |
| Accounts & roles | Create/edit account: email, actual access role, employee link, status; generated credentials |
| Audit | Exact-action filter, read-only events, pagination |
| Settings | Company name/currency/locale, salary period/rounding, HR salary visibility, Save |
| My pay | Own monthly breakdown and recorded history |
| Personal details | Explicit audited reveal, masked account data, contact correction guidance |

## Employee portal sections

Each catalog module receives its own completion key and role-filtered tour.

| Section | Module | Fields |
|---|---|---|
| Hiring | Job postings | Job title, Position, Description, Status |
| Hiring | Candidates | Candidate name, Email, Job posting, Stage, Notes |
| Hiring | Interviews | Interview title, Candidate, Interview date, Interviewer, Start time, Interview status, Score (0-5), Interview notes |
| Hiring | Onboarding checklist | Checklist item, Responsible person, Due date, Status |
| Performance | Position metrics | Metric name, Position, Unit, Target, Better when |
| Performance | Metric values | Evidence summary, Metric, Measured on, Value, Evidence |
| Performance | Performance reviews | Review name, Review due, Status, Metric scores, Review comments |
| Communication | 1:1 meetings | Meeting title, Meeting date, Expectations, Why this matters, Feedback |
| Communication | Feedback | Feedback summary, Feedback type, Date, Feedback |
| Development | Skills | Skill, Level |
| Development | Development goals | Goal, Due date, Progress (%), Success criteria |
| Development | Training items | Training item, Goal, Type, Status |
| Development | Development requests | Opportunity, How it helps, Requested by |
| Rewards | Recognition | Recognition, Date, Contribution |
| Rewards | Reward records | Reward, Type, Performance review, Date, Reward details |
| Discipline | Discipline policy | Policy step, Step order, Policy / rule |
| Discipline | Disciplinary actions | Incident category, Policy step, Incident date, Reason, Policy violated, Evidence, Employee’s side, Support offered |
| Work | Projects | Project name, Purpose, Due date, Status |
| Work | Tasks | Task, Project, Due date, Why this matters, Impact if delayed, Depends on task, Status |
| Leave | Leave balances | Leave type, Year, Allowance (days) |
| Leave | Leave requests | Leave type, First day, Last day, Reason |
| Self service | Profile changes | Change summary, New phone, New email |
| Self service | Time corrections | Correction summary, Existing session ID (leave blank for missing time), Correct start (company time), Correct finish (company time), Reason |
| Self service | Company policies | Policy name, Policy text |
| Self service | HR help desk | Subject, Category, Request |
| Administration | HR settings | Configuration name, Company time zone, Expected weekly hours, Workday starts, Feedback reminder after (days), HR record retention (days) |

## Plan and design

1. Build Job Roles first: Add → name → suggested band → pay range → Save preview → list.
2. Reuse Driver.js for other pages, using stable data-tour anchors and a single typed config.
3. Follow actual account permissions in Accounts & roles; never invent a permissions field on Job Roles.
4. Persist completion/skip per user in PostgreSQL; allowlist keys and scope writes to the authenticated user. Use atomic idempotent updates.
5. Add replay to the profile menu, bounded waits for async targets, route/logout cleanup, visible Skip/progress/Back/Next, keyboard and mobile support.
6. Preview controls only: no submissions, file uploads, credential generation, approvals, attendance writes or business changes. Mandatory /welcome setup stays separate; tours begin only after it is complete.
7. Test new/completed/skipped/replayed tours, role differences, modal steps, keyboard/mobile, persistence, tenant/account isolation and input validation.

Art direction: calm guidance within the warm paper/ink/violet/lime theme. Existing
font, compact readable popovers, native-focus styling, rounded spotlight and
minimal motion respecting reduced-motion preferences. No decorative animation.
