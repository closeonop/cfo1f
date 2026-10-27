# Portal help assistant

The **Need a hand?** bubble opens a lazy-loaded guide for signed-in users.
`src/data/featureMap.json` contains 53 navigation/help entries: real routes, purposes,
keywords, click-by-click steps and allowed roles, covering the main pages,
attendance workflows, account help and all 26 HR modules. `stepsByRole` describes
different controls; personal actions also require a linked employee.

The implementation plan and project inventory are in `ASSISTANT_PLAN.md` and
`WALKTHROUGH_PLAN.md`. The panel reuses the portal's paper/ink/violet/lime tokens
and Radix dialog, with mobile, dark-mode and reduced-motion styles.

## Setup

The OpenAI SDK calls Groq's compatible endpoint for ambiguous navigation matches.
A unique feature match returns its approved answer immediately without a provider
call. Configure these **server-only**
variables in the frontend's ignored `.env.local`, then restart Next.js:

```dotenv
API_INTERNAL_URL=http://127.0.0.1:8080/api
ASSISTANT_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=your-private-provider-key
AI_MODEL=openai/gpt-oss-20b
```

The supplied key was saved locally, outside source control. Rotate keys disclosed
in chat before production. Never prefix provider credentials with `NEXT_PUBLIC_`
or expose them through Next config. Container deployments must set
`API_INTERNAL_URL` to the backend's reachable internal address, independently of
the browser's API URL. Provider URL/model/key changes need no code changes.
Set `ASSISTANT_ALLOWED_ORIGINS` to exact public origins when deploying. This
avoids relying on Next's internal reconstructed hostname or forwarded-host input.

Groq's [model list](https://console.groq.com/docs/models) marks Llama 3.1 8B as
enterprise-only. The selected [GPT-OSS 20B](https://console.groq.com/docs/model/openai/gpt-oss-20b)
is a compact production model with JSON output and roughly 1,000 tokens/sec
listed on 21 October 2026. Availability for a particular key is a provider setting.

## API and security boundaries

`POST /api/assistant` accepts:

```json
{"messages":[{"role":"user","content":"How do I start attendance?"}]}
```

- Existing bearer authentication is verified server-to-server at Spring Boot's
  `/api/auth/me`. Role/user/company come from that response. Request-supplied
  roles, system messages, extra properties and setup-restricted accounts fail.
- Input is limited to six turns, 500 characters per turn and 8KB total. Body,
  auth and provider deadlines are four, five and 18 seconds respectively; SDK
  retries are disabled. Responses are `no-store`. Cross-origin browser requests
  fail; no permissive CORS is enabled.
- Twenty requests per user/company per minute, bounded memory and `Retry-After`;
  provider concurrency is capped at 32. **Quota is per Node process.** Use a shared
  counter store before running multiple replicas/serverless instances.
- Unknown/general questions, code requests and instruction-extraction attempts
  receive the exact scope refusal locally. Topic matching understands feature
  names, common synonyms, singular/plural forms, reordered topic words and one
  mistyped letter in longer topic words; short follow-ups reuse the prior topic.
  All words in a keyword must match, rather than accepting a shared generic word.
  Matching is still bounded: unrecognized paraphrases can be refused.
- Raw questions/history, complaint text, employee/salary records, page contents,
  IDs and credentials are never sent to the model. Only matched canonical map
  keywords and role-filtered static instructions leave the server. Recent turns
  resolve short follow-ups locally. There are no model tools, record APIs, chat
  persistence or external chat analytics.
- A unique permitted match is answered directly from the map. Groq resolves only
  tied matches, so a provider outage cannot block straightforward known questions.
- The prompt requests JSON, temperature 0.1 and a 300-token cap. JSON/action routes
  are validated. Visible prose and labels are reconstructed from the map, so
  model output cannot introduce arbitrary HTML, links or instructions. The client
  renders text rather than model Markdown/HTML. Invalid JSON, an empty response,
  or Groq's `json_validate_failed` response uses the matched map instructions;
  network/authentication failures remain friendly errors.
- Generic errors do not log or expose SDK exceptions, credentials or full chats.
  Conversations stay in React memory and clear on logout/account switch.
- An action opens its permitted route and requests the existing page tour/replay.
  Tours do not submit business actions.

Complaints and private HR conversations use the existing HR help desk. This is a
request for HR to reply, **not automatic calendar booking**. Employees can view
shared 1:1 records; HR/managers maintain them. Sensitive narratives belong in the
protected HR form, not this navigation chat.

## Add a feature

1. Add a unique `id`, `name`, local `route`, `description`, `keywords`, `steps` and
   `allowedRoles` in `src/data/featureMap.json`.
2. Match actual backend permissions/UI. Use `stepsByRole` and `requiresEmployee`
   when applicable. Use directory routes for profiles; never embed personal IDs.
3. Keep instructions short. Steps are joined with arrows. Add distinctive keyword
   phrases and role/scope regression checks; update the feature-count assertion.
   The description is also shown before the steps to explain what the feature
   does. Add practical FAQ entries for different intentions sharing a route,
   such as earning rewards versus viewing recorded rewards. Keep limitations
   explicit: compensation is not confirmation of a bank transfer, rewards have
   no automatic claim, and manager contact uses visible directory information
   and existing work channels.
4. Add the page's optional walkthrough using `WALKTHROUGHS.md`.

No backend schema change or DB migration is needed.

## Validation

`npm run test:assistant` compiles the assistant test graph into ignored
`artifacts/assistant-check` and runs Node tests with a test-only alias/server-marker
loader. Auth/provider calls are mocked; no live Groq quota is consumed.

The focused review covers assistant source and dummy fixtures, not a comprehensive
portal/deployment audit. Security-audit execution uses offline Docker, read-only
source/toolchain/root, empty allowlisted environment, dummy credentials, scratch-only
writes, 2 CPUs, 3GiB memory, 2GiB scratch, 192 processes and bounded execution/file sizes.
Cached Linux bindings are used; the target fetches no dependencies. No host home,
real provider key, backend socket or personnel records are mounted.

Completed: all 29 assistant checks and the full TypeScript check pass in the
offline container. An offline optimized production build also passed; the normal
Windows production build passes with the final source. The offline build limits
Next's workers to two in the disposable
copy to respect the process cap. An initial build hit that cap; another exposed
duplicate React instances in the sandbox's symlinked dependency layout. Using a
physical disposable dependency copy and read-only native-binding links resolved
the harness issues. No production source workaround was added for either issue.
Initial live functional checks verified the configured key/model with a generic
attendance question. Its action opens Attendance and starts the matching tour.
The complaint question returns the correct instructions using the mapped JSON
fallback when Groq rejects its JSON; its action opens `HR help desk` and starts
that module's tour. No attendance or HR records were submitted. The public-origin
allowlist fixes Next's internal localhost/public 127.0.0.1 mismatch without trusting
forwarded hosts. Browser checks verified Escape/focus return, Clear chat and a
390px layout. The desktop dialog needed its inherited CSS `translate` reset;
the panel now stays within the viewport on desktop and mobile.

Knowledge regression coverage includes the four reported screenshot questions
(getting rewards, contacting a manager with the typo `contant`, checking a payout
and this month's payment), all 53 entry names, ordinary paraphrases, plural forms,
typos, follow-up context and pay/help guidance for different account roles.
The API regression deliberately makes the provider fail and verifies all four
reported questions still return usable mapped answers without calling it.
The final live browser check also returned usable answers for all four questions.
The active linked Admin account was directed to its own employee profile for pay;
employee/manager `My pay` routing is covered by the role-based regression checks.
Preview: `artifacts/assistant-knowledge-fix.png`.

The local frontend was restarted. HTTP checks report frontend 200 and backend UP.
A local read-only scan
of public JavaScript found no occurrence of the configured provider credential;
`.env.local` remains ignored by Git. Temporary validation input/cache cleanup was
rejected by automatic approval review without a specific reason beyond a policy
block; those inputs remain outside the repositories and contain no real API key.

For normal local use, rebuild/restart the frontend after changing source or env
variables. In development use `npm run dev`; production uses `npm run build`
followed by `npm run start`. Do not run a second server on an occupied port.

Manual browser/provider checklist, separate from automated mocked checks:

- [x] Bubble opens/closes with keyboard and returns focus to the launcher.
- [x] Attendance question shows correct steps and a working action.
- [x] Complaint action opens the HR help-desk module.
- [ ] France, Python and prompt-extraction examples receive the scope refusal.
- [ ] Employee gets no admin-only destination.
- [x] Attendance/complaint actions open the right module and start/replay its tour.
- [ ] Network, timeout and quota messages are understandable.
- [x] Panel fits a 390px viewport without horizontal overflow.
- [ ] Physical mobile keyboard, dark mode and reduced motion checked at runtime.
- [x] Clear chat removes the visible conversation.
- [ ] Account changes remove the visible conversation (keyed unmount in code;
  not exercised against the user's active browser session).
- [x] Verify local key/model access with a normal non-sensitive navigation question;
  inspect status/generic errors only. Repeat after deployment.

The unchecked scope, role, quota and provider-error cases above are covered by
mocked automated checks; they were not exercised as a live provider attack/flood.
Browser captures are in `artifacts/assistant-desktop.png` and
`artifacts/assistant-mobile.png` (ignored local outputs).

## Files delivered

Created: `ASSISTANT_PLAN.md`, `ASSISTANT.md`, `src/data/featureMap.json`,
`src/app/api/assistant/route.ts`, `src/lib/assistant/{policy,provider,rate-limit}.ts`,
`src/lib/assistant/assistant.check.ts`,
`src/components/assistant/{assistant-launcher,assistant-panel}.tsx`,
`src/components/assistant/assistant.css`, `scripts/tsconfig.assistant-check.json`,
`scripts/register-assistant-check.cjs`.

Modified: `.env.example`, `package.json`, `package-lock.json`, `README.md`,
`src/app/(app)/layout.tsx`, `src/tours/tour-provider.tsx`,
`src/components/hr-workspace.tsx`. Local-only: ignored `.env.local`.
