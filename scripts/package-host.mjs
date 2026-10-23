import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'dist/chabokan');
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
// Allowlist excludes credentials, SQLite data, and old generated bundles.
// The host installs its own native Sharp build, suitable for its architecture.
for (const entry of ['server.mjs', 'server', 'public', 'scripts', 'test', 'deploy', 'ecosystem.config.cjs', '.npmrc', 'package.json', 'package-lock.json', '.env.example']) {
  const dest = join(target, entry); mkdirSync(dirname(dest), { recursive: true });
  cpSync(join(root, entry), dest, { recursive: true });
}
cpSync(join(root, 'deploy/chabokan/README.md'), join(target, 'README.md'));
const archive = join(root, 'dist/sinakratos-chabokan.tar.gz');
execFileSync('tar', ['-czf', archive, '-C', target, '.']);
console.log(`Upload ${archive}\nExtract into /app, install with npm ci --omit=dev, then start with npm start.\nSet admin credentials in the hosting panel. Keep /app/data persistent.`);
