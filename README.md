# Sinakratos résumé website

Independent Next.js application with an English/Persian résumé, RTL layout, light/dark themes, downloadable PDF, and a password-protected admin panel. No ChatGPT account or cloud service is needed.

## Run locally

Requires Node.js 22.13 or newer (Node.js 24 LTS recommended).

```sh
npm ci
npm run setup
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin. If port 3000 is busy, use the URL printed in the terminal.

`npm run setup` creates `.env.local` with a random admin password and session secret, and preserves existing credentials. Open `.env.local` and use `ADMIN_PASSWORD` at the admin login. That file is ignored by Git. You can replace the password with your own value of at least 16 characters and restart the server.

## Production

```sh
npm run build
npm start
```

Production `npm start` binds to 0.0.0.0 and accepts the PORT environment variable (default 3000). The development server remains on loopback; the optional PM2 configuration binds to loopback for a VPS reverse proxy. Forward the original Host and protocol correctly. Use a writable persistent `DATABASE_PATH` and configure `ADMIN_PASSWORD` and `SESSION_SECRET` privately.

## Content and administration

- Edit both translations, projects, experience, skills, and contact information at `/admin`.
- Saves appear on the public résumé after refresh.
- SQLite content is stored in `data/resume.sqlite`; back up this file while the app is stopped.
- Revision checks prevent concurrent editors from silently overwriting each other.
- Admin sessions use signed, HttpOnly cookies and expire after 12 hours. Login is throttled after ten failed attempts for 15 minutes.
- The original supplied PDF remains downloadable and contains the details in that document.

## GitHub later

Push the `site` directory as the repository root. Commit source, `package-lock.json`, and `.env.example`. Never commit `.env.local`, `data/`, `node_modules/`, or `.next/`; `.gitignore` excludes them.

GitHub stores the source. GitHub Pages alone cannot run this application’s admin panel and database. For online use, deploy it to a Node.js server with a persistent disk, then connect sinakratos.ir through that host’s DNS instructions. Serverless hosts need a shared persistent database instead of the local SQLite file.

## Checks

```sh
npm run typecheck
npm run build
```

## Adding content and selecting themes

The admin panel has tabs for projects, skills, work experience, education, awards, profile, and themes. Use the add button at the top of a tab, enter the new details, and click **Save changes**. Project names and organization names must be entered in both languages. Skill names are free text, with Beginner, Intermediate, Advanced, and Expert proficiency levels. Added skills appear in the public skills section.

Choose the website default palette (Amber, Ocean, or Emerald) and light/dark mode in the Themes tab. Visitors can use the header controls to choose their own appearance; their preference is stored on their device.

## Profile photo

Open **Admin → Profile**, choose a JPG, PNG, or WebP photo (up to 5 MB), and click **Save changes**. The admin preview shows the selected photo; saving displays it on the public résumé. **Remove photo** restores the initials after you save.

Uploads are cropped to a square, resized to at most 512×512, and converted to WebP without embedded metadata. They are stored inside the SQLite database, so the existing database backup includes the photos. Replacing or removing a profile photo detaches it from the résumé; previously uploaded files remain in the database.

## PM2 on a server

`ecosystem.config.cjs` starts this app on `127.0.0.1:3001` and explicitly uses this project directory, regardless of the directory you launch PM2 from. Keep Nginx pointed at the same port. Run from the folder containing package.json:

```sh
npm ci --include=dev
npm run setup
npm run build
pm2 start ecosystem.config.cjs --only sinakratos-resume
pm2 save
```

If an existing PM2 entry named `sinakratos-resume` has the wrong working directory (for example, npm reports `/root/package.json`), remove that entry with `pm2 delete sinakratos-resume`, then start the configuration above. This removes the PM2 process entry, not project files. Preserve your other application's process. Use `pm2 describe sinakratos-resume` to check the working directory and `pm2 logs sinakratos-resume --lines 30` to inspect startup.

## Small managed hosts

See [Chabokan deployment](deploy/chabokan/README.md) for the prebuilt upload archive, environment settings, and persistent storage. Run `npm run package:host` to create it locally. Only the five UI primitives used by the application are retained.
