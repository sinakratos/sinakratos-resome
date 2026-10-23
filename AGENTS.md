# Project instructions

This is a native Node.js résumé website. There is no frontend build step.

- Use Node.js 24 (minimum 22.13), native HTTP, SQLite, and browser APIs.
- Keep external dependencies minimal. Sharp handles safe photo decoding and resizing.
- Preserve the existing SQLite tables and JSON content format when making changes.
- Never print or package `.env.local` or `data/`.
- Escape all user content in HTML, and retain authentication and origin checks for writes.
- Run `npm test` after server or editor behavior changes.
- Hosting runs `npm start`; `npm run package:host` produces a source archive without dependencies or secrets.
