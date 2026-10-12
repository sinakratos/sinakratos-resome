import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env.local')) {
  console.log('.env.local already exists. Existing credentials were preserved.');
} else {
  writeFileSync('.env.local', `ADMIN_PASSWORD=${randomBytes(18).toString('base64url')}\nSESSION_SECRET=${randomBytes(32).toString('hex')}\nDATABASE_PATH=data/resume.sqlite\n`, { mode: 0o600, flag: 'wx' });
  console.log('Admin credentials created in .env.local. Open that file to get your password.');
}
