const fs = require('node:fs');
const path = require('node:path');
const root = process.env.APP_ROOT || path.resolve(__dirname, '..');
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
let valid = true;
for (const [name, minimum] of [['ADMIN_PASSWORD', 16], ['SESSION_SECRET', 32]]) {
  const value = process.env[name];
  const status = !value ? 'MISSING' : value.length < minimum ? 'TOO SHORT' : 'OK';
  if (status !== 'OK') valid = false;
  console.log(`${name}: ${status} (minimum ${minimum} characters)`);
}
console.log(`Local environment file: ${fs.existsSync(envFile) ? 'present' : 'absent; use panel variables'}`);
console.log('No passwords or secret values were printed.');
process.exitCode = valid ? 0 : 1;
