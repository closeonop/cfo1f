# People & Pay — frontend (`emp mg1`)

Portal AI help: see [ASSISTANT.md](ASSISTANT.md) for server-only Groq setup,
the role-aware feature map, security boundaries and test checklist.

The full lifecycle portal and the five approved self-service additions are now implemented. See [FEATURE_AUDIT.md](FEATURE_AUDIT.md) for the PRD checklist, validation, demo logins and operational limitations.

Next.js 15 + TypeScript + Tailwind CSS 4 + shadcn-style UI for the Employee
Management & Compensation Platform. The backend lives in the sibling folder
`emp mg2` (Spring Boot + PostgreSQL).

## Run it

Use Node.js 22 or newer for the app and patched Vitest test runner.

```bash
npm install
cp .env.example .env.local    # API URL (defaults to http://localhost:8080/api)
npm run dev                   # http://localhost:3000
```

The backend must be running (in `emp mg2`: `docker compose up -d db mailpit minio` +
`mvn spring-boot:run`, or `docker compose --profile app up -d` for everything).

## Guided walkthroughs

First visits to signed-in pages start role-aware Driver.js tours. Completion and
Skip are saved per user in PostgreSQL; use the profile menu's **Take the tour again**
to replay the current page. Finish mandatory account setup before tours begin.
See [WALKTHROUGHS.md](WALKTHROUGHS.md) for API details, how to add a tour, security
controls, the manual checklist and the complete file list.

## Quality checks

```bash
npm run build     # production build, strict TypeScript
npm test          # Vitest unit tests (money parsing & locale formatting)
npm run typecheck
```

## Where things live

- `src/app/(app)/` — the signed-in app: dashboard, employees (+ import wizard,
  profile), tiers, roles, compensation (raise wizard), reports, settings,
  my-pay, portal workspaces, attendance, approvals, accounts and audit
- `src/components/ui/` — small hand-rolled shadcn-style components (Radix based)
- `src/app/globals.css` — warm paper, violet actions, lime highlights and ink
  navigation; paired light/dark tokens and tabular numerals for money
- `src/lib/api.ts` — fetch client: in-memory access token, silent refresh via
  httpOnly cookie, typed errors

## Design rules baked in

- One primary action per screen; money always previewed before it changes
- Tabular numerals for all money columns; locale-aware grouping (lakh/crore via
  the company's `en-IN` setting)
- Salary fields render only when the server says the viewer may see them
- Visible focus rings, labelled inputs, keyboard-friendly dialogs, reduced
  motion respected

## UI refresh — 20 October 2026

People & finance now has redesigned pay bands, job roles, compensation and reports.
See [PEOPLE_FINANCE_PLAN.md](PEOPLE_FINANCE_PLAN.md) for the design, corrected
calculations/permissions and latest checks (63 backend / 11 frontend tests).

See [UI_REFRESH_PLAN.md](UI_REFRESH_PLAN.md) for the design direction and verification notes.
The sign-in screen, grouped navigation, dashboard and portal use the same visual
system. Secondary actions expand from labelled chevrons; workspace sections use
a native selector. Native disclosures and the existing Radix components keep
keyboard support without another UI or animation dependency.

Browser hardening lives in `next.config.ts`: no framing, no MIME sniffing, no
referrer transmission, and a limited CSP for framing, objects and base URLs.
This is not a complete script CSP. API requests explicitly opt out of caching.
The Next.js PostCSS override pins 8.5.31 to address dependency advisories without
a framework upgrade. Vitest is updated to the patched 4.1.11 release.

The focused security source review covered session handling, current-user role
checks, HR tenant/employee scoping, salary visibility, confidential downloads and
unsafe HTML rendering. It does not certify deployment security or replace backend
integration tests. The backend now ignores forwarded headers by default. Enabling
them requires an edge proxy that strips untrusted client headers and a backend
that cannot be reached around that proxy. Confirm this in the deployed environment;
see [Spring's proxy guidance](https://docs.spring.io/spring-security/reference/7.0/features/exploits/http.html).

See [PORTAL_IMPLEMENTATION_PLAN.md](PORTAL_IMPLEMENTATION_PLAN.md) for the role
matrix, research and completed checks. Generated employee credentials open the
first-login setup wizard. The local API currently enables demo OTP `123456`;
`DEMO_OTP_ENABLED` defaults to false for other runs. No verification email is sent.
The default local API URL uses the browser's hostname so refresh cookies work
when opening either localhost or 127.0.0.1. Hosted browsers default to `/_backend`.
On Vercel set `API_INTERNAL_URL=https://<your-backend-host>/api` before building;
the Next.js rewrite forwards `/_backend/*` to that server. If setting
`NEXT_PUBLIC_API_URL` in production, use `/_backend`, never localhost or port 8080.
Login and signup requests time out after 15 seconds with a retryable message;
startup session checks time out after 8 seconds. Requests are never automatically
retried after a network failure, because signup may already have reached the API.
