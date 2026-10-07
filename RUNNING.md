# Sina portfolio

Features: résumé website, English/Persian and RTL layout, dark/light preferences, downloadable original résumé, server-backed bilingual administration at /admin.

Admin authorization: Sign in with ChatGPT as sinakhoshzaban2@gmail.com, verified as the Site owner. Anonymous and other-account writes are denied server-side. Saved content is in D1; revision checks prevent overwriting concurrent edits.

## Local development

Run `npm run dev`; use the printed URL. The starter uses a local test identity; it cannot enter the owner-only editor. The production build can be run with `npm start` after `npm run build`.

For a fresh local D1 database, run `npm run db:generate` only after schema changes, build, and apply pending migration files as described in README.md. The initial migration is drizzle/0000_clean_star_brand.sql. Do not replay migrations already applied.

## Verification performed

- TypeScript check passed: npx tsc --noEmit.
- Worker build passed.
- Public résumé response returned 200.
- Local production API save and persistent read-back passed.
- Stale revision returned 409.
- Anonymous write returned 403.
- Browser visual checks unavailable: no browser connected to this session.

## Publishing status

Site registered in .openai/hosting.json and audience set to public as requested. Source upload is blocked by timeouts / empty replies from the hosting repository endpoint. No successful publication or live URL is confirmed. The hosting service requires publication before it accepts sinakratos.ir and returns DNS records. Resume the Sites source workflow with refreshed short-lived credentials; never store credentials in source.

The original résumé PDF is publicly downloadable when published, including the details in the supplied original document.
