# People & Pay UI refresh

## Direction and scope

An energetic, calm workplace: monochrome + pop, warm paper, deep ink, violet and lime. The first impression should be approachable and organized. Keep the employee/payroll product clear; avoid slang, invented metrics, stock photos and decorative animation libraries.

- Typography: one locally available system sans family, fluid display headings, tight tracking, tabular financial data.
- Color: semantic OKLCH tokens, paired light/dark surfaces, violet for actions, lime for editorial highlights; separate semantic warning/error colors.
- Layout: compact grouped navigation, an editorial dashboard introduction, varied dashboard cards, a split sign-in screen, numbered portal workspaces. Keep mobile content in one column.
- Motion: CSS only, short chevron and hover transitions; respect reduced motion.
- Actions: retain primary actions; put import/export and record actions behind labelled chevrons, replace long workspace button strips with a selector, collapse secondary navigation groups. Native details and existing Radix controls provide keyboard behavior.
- Accessibility: labelled controls, clear focus, sufficient contrast, touch targets, semantic headings, no hover-only actions.

## Implementation order

1. Review existing source and UI, preserve current uncommitted work.
2. Update shared tokens, surfaces, buttons and tables.
3. Refresh shell, sign-in, dashboard and portal.
4. Apply progressive disclosure to employee and HR workspaces.
5. Review authentication, authorization, file delivery and unsafe rendering in frontend and sibling backend; make small verified source fixes.
6. Run UI quality checks and record security coverage and remaining validation limits.

## Constraints

No new dependencies, no fabricated production data, no changes to business permissions, and no broad backend rewrite. Security review is a focused source review, not a full penetration test.

## Completed verification

- `npm run build`: passed; all 23 routes generated or compiled successfully.
- `npm run typecheck`: passed.
- `npm test`: 8 tests passed with patched Vitest 4.1.11. The test config explicitly compiles JSX for Vite while Next keeps its own JSX compiler settings.
- `npm audit --json`: zero known vulnerabilities across production and development dependencies. Next's nested PostCSS is pinned to 8.5.31; Vitest was updated to the first patched 4.1 release.
- Browser checks: desktop at 1440px, mobile at 390px; sign-in, dashboard, directory, portal and Work workspace. Confirmed chevron expansion, keyboard Enter toggling, workspace selection, mobile navigation closure and light/dark appearance. The mobile overview fits without horizontal page overflow.
- Reduced motion: CSS disables transitions/animations under the reduced-motion preference; the chart retains its existing media-query animation guard. Reduced-motion OS emulation was not available in this browser session.
- Signed-in checks used a temporary read-only loopback API fixture labelled `UI Preview Co.` with dummy employees and an employee-role view. This fixture is not part of the shipped application, and these checks do not validate real backend authorization or database behavior.
- Production-mode smoke check passed. The temporary API fixture was stopped and removed; the local production preview remains at `http://127.0.0.1:3000/login` and requires the real backend for sign-in. Screenshots are saved in the ignored `artifacts/` folder.

## Security scope and practical changes

Reviewed frontend authentication/API handling and rendering, plus backend `SecurityConfig`, `JwtAuthFilter`, `JwtService`, `AuthController`, HR record access, salary visibility and personnel-file delivery. Existing source contains tenant-scoped reads, current-account status/role checks, credential-version revocation, memory-only access tokens, rotating HTTP-only refresh cookies, and short-lived signed download links with authorization checks. No new authorization bypass was demonstrated in this bounded source pass.

Added browser response headers for framing protection, MIME sniffing protection, referrer suppression and a limited object/base/frame CSP. Explicit no-store fetches avoid caching sensitive API reads. This CSP does not restrict script sources; it is not a full XSS mitigation policy.

The dependency findings were installed-version advisories, not evidence of a publicly exploitable app path. Relevant advisories: [PostCSS source map handling](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp), [Vitest redirect mocks](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), and [Tinypool worker options](https://github.com/advisories/GHSA-85c8-ppgw-ccpr). The patched test runner removes the affected Tinypool dependency.

Needs deployment validation: `emp mg2/src/main/resources/application.yml` enables framework forwarding, and authentication rate limiting depends on client IP. Confirm that the trusted edge strips incoming `Forwarded`/`X-Forwarded-*` headers and that traffic cannot bypass it; otherwise clients may influence perceived address/protocol. Source: [Spring proxy security guidance](https://docs.spring.io/spring-security/reference/7.0/features/exploits/http.html). Production TLS, proxy configuration and real-backend integration were not tested. The sibling backend was not modified.
