# Sinakratos résumé website

A small Node.js application with a bilingual English/Persian résumé, RTL layout, three palettes in light/dark mode, downloadable PDF, and password-protected content management. No build step, frontend framework, CDN, remote fonts, or external database service.

The only direct dependency is **Sharp**, used to validate, resize, and strip metadata from uploaded photos. HTTP, SQLite, authentication, HTML rendering, and browser interactions use Node.js and browser APIs.

## Run locally

Use Node.js 24 (minimum 22.13).

```sh
npm ci --omit=dev
npm run setup
npm start
```

Open http://localhost:3000 and `/admin`. The password is `ADMIN_PASSWORD` in `.env.local`. Setup preserves an existing credentials file. Change the password to at least 16 characters and keep `SESSION_SECRET` at least 32 characters; restart after changes. `npm run check:env` checks configuration without printing secrets.

For development, `npm run dev` restarts the server on code changes. Set `PORT` if 3000 is occupied. The server automatically reads `.env.local` beside `server.mjs`, regardless of your working directory. Hosting environment variables take precedence.

## Deploy

Run the same files on any **Node.js host with a persistent writable disk**:

```sh
npm ci --omit=dev
npm start
```

Default bind address: `0.0.0.0:3000`. Configure `ADMIN_PASSWORD`, `SESSION_SECRET`, `DATABASE_PATH`, and `PUBLIC_ORIGIN=https://sinakratos.ir` on the host. Use the hosting panel to connect your domain and HTTPS.

- [Chabokan: upload, settings, and domain](deploy/chabokan/README.md)
- [VPS: PM2 and Nginx](deploy/nginx/README.md)

`npm run package:host` creates `dist/sinakratos-chabokan.tar.gz`. It contains the source and lockfile, without passwords, database, or node_modules. The host installs the single dependency for its own operating system. There is no build command. Do not reuse the old Next.js archive or its `runtime/` launch command.

## Existing content and backups

The existing `data/resume.sqlite` remains compatible: résumé JSON, revision numbers, login throttling, and uploaded photo blobs retain their existing tables. No migration or reset is required. Relative `DATABASE_PATH` values resolve against the application root. If your old deployment stored the database elsewhere, set the same absolute path or copy that database while the app is stopped.

Back up the SQLite file while the server is stopped. Protect the data directory as a permanent path on managed hosting before redeploying. Source uploads intentionally exclude your local data; transfer it separately if moving your personal content from your computer.

## Admin features

At `/admin`, add and remove projects, free-named skills with four proficiency levels, work experience, education, and awards. Edit both translations, profile/contact details, and default appearance. Save changes to publish. Removal can be undone until the next edit. Unsaved changes trigger a navigation warning. Concurrent saves from an older editor session return a conflict instead of overwriting newer data.

JPG, PNG, and WebP uploads up to 5 MiB are decoded, cropped to a square, resized to at most 512×512, and saved as WebP in SQLite. After upload, click **Save changes**. Removal restores initials after saving; older photo blobs remain available in backups.

The public résumé is rendered by the server and works without JavaScript. JavaScript adds appearance preferences and mobile navigation; the admin editor requires it. Visitors can switch language using the header or `?lang=fa`. Device preferences persist locally.

Admin cookies are HttpOnly, SameSite=Strict, expire after 12 hours, and use Secure when `PUBLIC_ORIGIN` starts with HTTPS. Writes require a matching Origin. Password attempts are throttled after ten failures for 15 minutes.

## Source structure and tests

- `server.mjs`: startup, routes, public file allowlist, uploads.
- `server/`: authentication, SQLite access, validation, HTML templates, default résumé.
- `public/`: native CSS/JavaScript, favicon, original résumé PDF.
- `scripts/`: setup, environment checks, deployment archive.
- `test/`: integration tests using isolated temporary SQLite databases.

```sh
npm test
```

Commit source and `package-lock.json` to GitHub. Keep `.env.local`, `data/`, and `node_modules/` private. GitHub Pages cannot run the server or admin panel.
