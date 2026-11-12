# Creator Space implementation plan

Creator Space is an internal, opt-in publishing area for signed-in portal users. The first usable slice is profile creation, a text post, and a feed. Add images, interactions, and moderation in small follow-on slices.

## Where it fits

| Area | Existing code to build on |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, Zod, and shared UI components. Add `src/app/(app)/creator` under the existing signed-in layout, add a Work Portal / Creator Space switch in `src/components/app-shell.tsx`, and use `src/lib/api.ts` for requests. |
| Backend | Spring Boot, Spring Security, PostgreSQL, JPA and JDBC, and Flyway. Add a `com.empmg.platform.creator` package under `emp mg2`, with API routes under `/api/creator` and additive migrations starting at V7 if still available. |
| Identity | Reuse the in-memory access token, same-origin refresh flow, HttpOnly refresh cookie, and backend principal. Use the principal's user ID to find the creator profile. Creator responses expose creator IDs, handles, display names, bios, and avatars. |
| Administration | The Work Portal shell gates navigation by access role. Add Content Moderation alongside existing admin tools and enforce `ADMIN` at the API as well. |
| Verification | Extend the existing Vitest and Maven integration suites. Both repos already run checks in GitHub Actions. Use local Postgres in CI and Neon for a separate development smoke test. |

The portal supports multiple companies. Scope creator tables, handle uniqueness, and every query to the authenticated principal's company. Start with company-wide published posts plus owner-only drafts. Use chosen display names. Limit employee-to-creator identity lookup to admins with an audit record. Default account deletion to removing drafts and anonymizing published posts, subject to the portal's retention policy.

## Build order

1. **Profiles and switching.** Add a default-off feature flag covering UI and API, creator navigation, and onboarding with a unique user ID and normalized unique handle. Use Spring DTO validation and explicit response fields. The existing demo OTP is tied to portal welcome. For creator step-up, reuse the demo configuration with an expiring, single-use challenge bound to the creator action. Keep demo verification in development. Verify the existing sign-in and welcome flow, duplicate profile handling, and server-side ownership checks.
2. **Posts and feed.** Add Studio, drafts, publish/edit/delete, post detail, profile pages, and Latest. Use Markdown with raw HTML disabled and allowlisted rendering. Use indexed keyset pagination on `(published_at, id)`, a partial index for visible published posts, and an author index for Studio and profile queries. Batch author and media reads per page. Verify that drafts and hidden content stay out of feed and detail queries, user content renders safely, and scrolling across equal timestamps yields each row once.
3. **Images.** Implement the signed direct upload flow below. Enable images after the provider smoke test passes.
4. **Interactions and moderation.** Add idempotent likes and follows using unique keys, plain-text comments with one reply level, copy-link shares, Following, and block/mute filtering. Compute counts from indexed rows for the development workload and skip writes on page views. Ship reporting, an admin queue, hide/restore/remove and creator suspension, and an action log with mandatory reasons before broad rollout. Apply moderation and creator status in visibility queries. Add in-app notifications for likes, comments, replies, follows, and moderation using a small inline job interface. Test duplicate and concurrent actions, role enforcement, and visibility after moderation.
5. **Development verification.** Run frontend tests, typecheck, and build, plus backend Maven verification. Smoke-test onboarding through moderation with two users and an admin. Inspect PostgreSQL query plans on seeded data and run a small local load test with a realistic company dataset. Verify that the feature flag disables both entry points and rerun existing portal regressions.

## Neon and jobs

- Configure the Spring datasource with the TLS-enabled Neon pooled JDBC connection string, using the `-pooler` host and a small Hikari pool. Keep credentials in environment configuration. Apply and verify the additive Flyway migration against development data first. If migration locking requires a direct connection, use it for the migration command only and keep the app pooled.
- Use a bounded, expiring in-memory rate limiter for creator writes and stricter quotas for upload signing. The limits are per process and reset on restart. Keep notifications and small cleanup operations inline behind one narrow job entry point with idempotent handlers.
- Keep image bytes out of PostgreSQL. Store the Cloudinary public ID and metadata such as format, byte size, dimensions, version, position, and alt text.

## Run Creator Space locally

- Backend: set `CREATOR_SPACE_ENABLED=true`, `CREATOR_DEMO_VERIFICATION=true`, and `DEMO_OTP_ENABLED=true` in the local launch environment. For Neon development, set `DB_URL` to the pooled JDBC URL and set `DB_USERNAME` and `DB_PASSWORD` separately. Use a development database.
- Frontend: set `NEXT_PUBLIC_CREATOR_SPACE_ENABLED=true` in `.env.local` and restart or rebuild Next.js. Sign in to the portal and select Creator Space. The verification screen displays the development code. Keep demo verification disabled in production.
- Hosted setup asks users to confirm their current password when creating a creator profile. Set `CREATOR_SPACE_ENABLED=true` on the API and `NEXT_PUBLIC_CREATOR_SPACE_ENABLED=true` on the frontend for the release.
- In Creator Space, use the composer on **Home** or select **New post**. Choose **Post** to publish directly or **Save draft** to keep it in **Studio**. The editor renders plain text. Select a creator's handle to see their company-scoped profile and posts. Follow them to add their posts to **Following**.
- Local integration tests cover company isolation, draft ownership, repeat publishing, soft deletion, pagination across equal timestamps, duplicate follows, and moderation across post surfaces. PostgreSQL used the feed indexes in local `EXPLAIN ANALYZE` runs with 8,000 seeded posts.
- For images, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the backend environment using a rotated credential. Attach images in the composer or manage them from Studio. **My profile** supports adding, replacing, and removing a profile photo. Latest loads pages as you scroll and shows the first image for each post. The detail page shows the full gallery, likes, comments, and copy-link sharing.
- Use **Report post** on a published post. Admins can review reports under **Administration → Content moderation**, then hide, restore, remove, or dismiss with a reason. Hidden posts disappear from Creator Space reads. Previously issued Cloudinary URLs remain usable until the asset is invalidated.

## Cloudinary upload and delivery

1. Require an active creator and ownership of the target post. Check declared JPEG, PNG, or WebP and a maximum of 2 MB (2,000,000 bytes) before signing. Issue a signed upload with a server-generated public ID, a format allowlist, overwrite disabled, and authenticated delivery. Reserve a post slot transactionally so parallel requests cannot exceed five images per post. Expire unused reservations.
2. Send bytes from the browser directly to Cloudinary's image upload endpoint. A signed upload rule rejects unsupported formats and files over 2 MB before they are stored. On completion, retrieve trusted Cloudinary metadata and check the resource type, format, size, and dimensions before attaching the image. The inline cleanup removes one eligible expired or removed asset per signing request. Old signed URLs can remain usable until Cloudinary invalidates the asset.
3. Return only transformed URLs after the app checks post visibility. Use Cloudinary's default cookieless CDN host and three fixed widths of 200, 800, and 1600 pixels with `f_auto,q_auto` and no upscaling. Keep originals undisclosed and generate variants on demand. Signed delivery URLs can be forwarded by recipients. If per-viewer expiry or immediate revocation is required, verify a free option before enabling that use case.
4. Live Cloudinary checks confirmed an unsigned original returned 401 and the signed 200, 800, and 1600 variants delivered without EXIF or GPS metadata. A 2.05 MB test image was rejected before storage. The integration suite covers ownership, server metadata verification, and concurrent reservations. Track storage, bandwidth, and transformations against the shared 25-credit monthly allowance.

## Provider references

- [Neon connection pooling](https://neon.com/blog/postgres-support-case-recap)
- [Cloudinary signed uploads](https://cloudinary.com/documentation/upload_images)
- [Cloudinary upload presets and size controls](https://cloudinary.com/documentation/upload_presets)
- [Cloudinary media access](https://cloudinary.com/documentation/control_access_to_media)
- [Cloudinary UGC metadata stripping](https://cloudinary.com/documentation/user_generated_content_upload)
- [Cloudinary free-plan credits](https://cloudinary.com/documentation/billing_and_plans)
