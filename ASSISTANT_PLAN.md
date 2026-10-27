# Portal assistant implementation plan

Next.js 15 App Router / React 19 / TypeScript, Tailwind and Radix UI. Spring Boot
owns authentication and data (PostgreSQL/Flyway, MinIO private files). The browser
uses an in-memory bearer token and rotating HTTP-only refresh cookie. Frontend
configuration is in ignored `.env.local`; committed placeholders are in
`.env.example`. Provider secrets must have no `NEXT_PUBLIC_` prefix.

The page inventory is in `WALKTHROUGH_PLAN.md`. The assistant's complete, actionable
feature inventory will be `src/data/featureMap.json`, including routes, steps,
keywords and allowed roles. It follows the actual navigation and HR catalog.
Job roles do not grant login permissions. Employees cannot schedule HR meetings
directly: the HR help desk is the existing route for a complaint or conversation
request, while 1:1 records are managed by HR/managers.

1. Create the role-aware feature map and deterministic scope/privacy checks.
2. Add a server-only OpenAI-compatible SDK adapter and authenticated Next.js route.
   Validate the bearer token with Spring Boot; cap input and quota; validate output
   against the map. No database migration or business mutations are needed.
3. Add a lazy floating help panel and safe navigation/tour handoff.
4. Review authentication, prompt injection, secret handling and privacy boundaries;
   test with dummy provider/auth fixtures in an offline, resource-limited container.
5. Document environment setup, feature additions, limitations and manual checks.

Art direction: calm and useful; warm editorial paper/ink, violet actions, one lime
accent. Reuse existing font/tokens, fluid panel title, generous message spacing,
44px touch targets, keyboard-friendly Radix dialog. Short CSS transitions only,
disabled for reduced motion. Mobile uses an inset full-height panel.

Use `openai/gpt-oss-20b` (compact, fast production model with JSON-object support), configured through
`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`. Groq documentation checked 21 October 2026:
https://console.groq.com/docs/model/openai/gpt-oss-20b

Privacy design: match navigation intents locally; send only canonical matched
feature keywords and the role-filtered static map to the provider. Never send raw
chat, employee records, complaint text, credentials or browser page contents.
Model output can select only matched permitted destinations; visible instructions
are reconstructed from the feature map. This limits the assistant to navigation.

Security review is focused guidance, not a comprehensive portal audit. The
security-audit skill requires OS-enforced isolation for executing target code;
use offline Docker fixtures and never spend live provider quota for security tests.

## Knowledge matching follow-up

The reported rewards, manager-contact and payout questions exposed exact-phrase
matching gaps. Expand common vocabulary throughout the map; normalize plurals,
allow bounded topic-word typos and word reordering, and add source-verified FAQ
guidance for reward eligibility, manager contact, own compensation and actual
payment enquiries. Preserve local-only chat processing and role/link filtering.
Verify the four reported questions, all feature names, paraphrases, follow-ups
and the existing security checks before rebuilding the local application.
Return approved instructions directly for a unique match; use Groq only to choose
between tied permitted matches. This removes provider failures and latency from
ordinary known-feature questions without sending raw text upstream.
