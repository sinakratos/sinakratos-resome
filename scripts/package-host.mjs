import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const target = resolve('dist/chabokan');
if (!existsSync('.next/standalone/server.js')) throw new Error('Run npm run build first.');
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync('.next/standalone', target, { recursive: true, dereference: true });
cpSync('public', join(target, 'public'), { recursive: true });
cpSync('.next/static', join(target, '.next/static'), { recursive: true });
// Next tracing can copy environment files. Never ship authoring credentials or data.
function clean(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const filename = join(folder, entry.name);
    if (entry.name.startsWith('.env') || ['data', '.git', '.wrangler', '.sites-runtime'].includes(entry.name)) {
      rmSync(filename, { recursive: true, force: true });
    } else if (entry.isDirectory() && entry.name !== 'node_modules') clean(filename);
  }
}
clean(target);
// Keep the generated server's package type; its traced node_modules are bundled.
const original = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
writeFileSync(join(target, 'package.json'), JSON.stringify({ name: 'sinakratos-resume-host', private: true, version: '1.0.0', type: original.type || 'commonjs', engines: { node: '>=22.13.0' }, scripts: { start: 'node start.cjs', build: 'node -e "console.log(\'Already built\')"' } }, null, 2) + '\n');
writeFileSync(join(target, 'start.cjs'), `process.env.HOSTNAME = process.env.APP_HOST || '0.0.0.0';\nprocess.env.PORT = process.env.PORT || '3000';\nrequire('./server.js');\n`);
cpSync('.env.example', join(target, '.env.example'));
const archive = resolve('dist/sinakratos-chabokan.tar.gz');
execFileSync('tar', ['-czf', archive, '-C', target, '.']);
console.log(`Prepared host folder: ${target}\nUpload archive: ${archive}\nSet ADMIN_PASSWORD, SESSION_SECRET and DATABASE_PATH in the hosting panel. No local credentials or database included.`);
