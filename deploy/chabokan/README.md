# Chabokan Node.js hosting

This project includes a prebuilt, self-contained deployment path for small hosts. All current features are retained: bilingual résumé, themes, password admin, SQLite content, and profile photo uploads. No external database, cloud storage, remote fonts, or runtime CDN is required.

## Build on your computer

Use Linux x64 with glibc (matching the host) and Node.js 24, or a compatible Node.js >=22.13. Native Sharp binaries must match the host OS/architecture. Do not build this archive on macOS or Windows for upload to Linux.

```sh
npm ci
npm run package:host
```

Upload `dist/sinakratos-chabokan.tar.gz` with the panel file manager or FTP and extract its CONTENTS into the application root. `package.json`, `start.cjs`, `server.js`, `node_modules`, `.next`, and `public` must be at that root. Transfer hidden `.next` files too. Do not upload the full source tree, local `.env.local`, or a development node_modules folder.

The archive excludes local secrets and local SQLite databases. If moving existing content/photos, stop the old app, back up the SQLite file, and restore it into the host's persistent data directory separately.

## Panel configuration

Choose Node.js 24. Keep the internal HTTP port at 3000. Configure these environment variables in the service settings:

| Variable | Value |
|---|---|
| START_COMMAND | npm start |
| NPM_INSTALL_COMMAND | node -e "console.log('Using bundled production dependencies')" |
| PORT | 3000 |
| ADMIN_PASSWORD | Your private password, at least 16 characters |
| SESSION_SECRET | A private random value, at least 32 characters |
| DATABASE_PATH | data/resume.sqlite |

The install-command override is essential for this PREBUILT archive: ordinary npm install may prune the bundled traced modules. No host build is required; the archive includes a no-op build script for panels that run it automatically. Leave HOSTNAME unset; the launcher binds to 0.0.0.0. Use APP_HOST only if you need an explicit override.

Generate SESSION_SECRET locally with `openssl rand -hex 32`, then enter it in the panel. Do not commit credentials.

Configure the application-root `data` directory as a permanent path before replacing deployments. If the panel asks for an absolute path, copy its actual path from the file manager; do not guess the host's application directory. This database stores both edits and photos. Keep regular backups.

Restart the service and inspect its log. The application should listen on 0.0.0.0:3000. Use the panel-provided test URL initially. Add sinakratos.ir and www.sinakratos.ir in the service's Domains section, apply the DNS records supplied by Chabokan, and enable HTTPS. The outgoing IP shown in the service overview is not automatically the correct DNS target.

This managed deployment uses the platform's start command and domain routing. The separate ecosystem.config.cjs and deploy/nginx files are for a self-managed VPS, and are not needed here.

## Resources and verification

The plan in the supplied screenshot has approximately 150 MB RAM and 1 GB disk. The package is smaller than the development checkout, but that does not guarantee Next.js plus native image processing fits the RAM limit. Build locally, run one application instance, monitor host memory, and increase RAM if the platform kills it. Photo processing is limited to one native thread with Sharp's cache disabled. The 5 MB upload and pixel limits remain enforced.

After deployment test public English/Persian pages, every palette/mode, login at /admin, saving changes, uploading a photo, and logout. Redeploy once and confirm saved content/photos survive in the permanent data path.

Official references:
- https://docs.chabokan.net/cloud-hosting/nodejs/deploy/
- https://docs.chabokan.net/cloud-hosting/nodejs/more/
- https://docs.chabokan.net/features/permanent-path/
- https://docs.chabokan.net/features/domains/

## Verification from this checkout

The prepared archive is approximately 15 MB, extracting to approximately 55 MB. Runtime dependencies decreased from 24 to 12. Production build and TypeScript checks passed. The exact bundled server served the résumé, eight linked static assets, the protected editor, password login, SQLite save/read-back, photo upload/conversion/retrieval, saved public avatar, and relative logout redirect successfully using an isolated test database.

Local RSS after these requests was 146,924 KiB (about 143 MiB). This is not a host benchmark or peak-memory bound. A 150 MB plan has very little headroom; 512 MB RAM is a more practical starting point for this application. Browser interaction/visual testing and actual Chabokan deployment are not verified from this session.
