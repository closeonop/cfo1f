# People & Pay — frontend (`emp mg1`)

Next.js 15 + TypeScript + Tailwind CSS 4 + shadcn-style UI for the Employee
Management & Compensation Platform. The backend lives in the sibling folder
`emp mg2` (Spring Boot + PostgreSQL).

## Run it

```bash
npm install
cp .env.example .env.local    # API URL (defaults to http://localhost:8080/api)
npm run dev                   # http://localhost:3000
```

The backend must be running (in `emp mg2`: `docker compose up -d db mailpit` +
`mvn spring-boot:run`, or `docker compose --profile app up -d` for everything).

## Quality checks

```bash
npm run build     # production build, strict TypeScript
npm test          # Vitest unit tests (money parsing & locale formatting)
npm run typecheck
```

## Where things live

- `src/app/(app)/` — the signed-in app: dashboard, employees (+ import wizard,
  profile), tiers, roles, compensation (raise wizard), reports, settings,
  my-pay
- `src/components/ui/` — small hand-rolled shadcn-style components (Radix based)
- `src/app/globals.css` — the design system tokens ("Ledger" theme: deep teal
  primary, tabular numerals for money, light/dark paired)
- `src/lib/api.ts` — fetch client: in-memory access token, silent refresh via
  httpOnly cookie, typed errors

## Design rules baked in

- One primary action per screen; money always previewed before it changes
- Tabular numerals for all money columns; locale-aware grouping (lakh/crore via
  the company's `en-IN` setting)
- Salary fields render only when the server says the viewer may see them
- Visible focus rings, labelled inputs, keyboard-friendly dialogs, reduced
  motion respected
