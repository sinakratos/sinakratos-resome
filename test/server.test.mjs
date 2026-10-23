import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';
import { initialResume, validateResume } from '../server/resume.mjs';
import { portfolio } from '../server/views.mjs';

let child, origin, directory, cookie, photoUrl;
const password = 'integration-password-for-tests';
const json = value => ({ 'Content-Type': 'application/json', Origin: origin, Cookie: cookie || '', ...value });
async function launch(extra = {}) {
  child = spawn(process.execPath, ['server.mjs'], { cwd: process.env.TEST_APP_ROOT || new URL('..', import.meta.url), env: { ...process.env, ADMIN_PASSWORD: password, SESSION_SECRET: 'test-secret-long-enough-for-session-signing', PORT: '0', APP_HOST: '127.0.0.1', DATABASE_PATH: join(directory, 'resume.sqlite'), PUBLIC_ORIGIN: '', ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  await Promise.race([
    new Promise((resolve, reject) => {
      child.stdout.on('data', chunk => { output += chunk; const match = /listening on port (\d+)/.exec(output); if (match) { origin = `http://127.0.0.1:${match[1]}`; resolve(); } });
      child.once('exit', () => reject(new Error(`Server stopped: ${errors}`)));
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Startup timeout')), 10000).unref()),
  ]);
}
async function stop() { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'resume-native-test-'));
  // Simulate an existing deployment, including its original SQLite schema.
  const db = new DatabaseSync(join(directory, 'resume.sqlite'));
  db.exec('CREATE TABLE resume_content (id INTEGER PRIMARY KEY, content TEXT NOT NULL, revision INTEGER NOT NULL); CREATE TABLE profile_photos (id TEXT PRIMARY KEY, content BLOB NOT NULL); CREATE TABLE login_attempts (id INTEGER PRIMARY KEY, failures INTEGER NOT NULL, reset_at INTEGER NOT NULL);');
  const content = structuredClone(initialResume); content.headline.en = 'Existing personal content';
  db.prepare('INSERT INTO resume_content VALUES (1, ?, 7)').run(JSON.stringify(content)); db.close();
  await launch();
});
after(async () => { if (child?.exitCode === null) await stop(); if (directory) await rm(directory, { recursive: true, force: true }); });

test('legacy data renders in English and formal Persian without browser JavaScript', async () => {
  let response = await fetch(origin); const html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /Existing personal content/); assert.match(html, /https:\/\/delaram-gallery.com/);
  assert.doesNotMatch(html, /_next|Thoughtfully built/);
  response = await fetch(`${origin}/?lang=fa`); const fa = await response.text();
  assert.match(fa, /lang="fa" dir="rtl"/); assert.match(fa, /سوابق حرفه‌ای/);
  for (const file of ['/style.css', '/site.js', '/admin.js', '/favicon.svg', '/sina-khoshzaban-resume.pdf']) assert.equal((await fetch(origin + file)).status, 200, file);
  for (const file of ['/.env.local', '/server.mjs', '/data/resume.sqlite', '/../package.json']) assert.equal((await fetch(origin + file)).status, 404, file);
});
test('HTML escapes stored content and schema rejects dangerous or malformed values', () => {
  const content = structuredClone(initialResume); content.name.en = '<script>alert(1)</script>';
  assert.doesNotMatch(portfolio(content), /<script>alert/);
  assert.match(portfolio(content), /&lt;script&gt;/);
  for (const mutate of [r => r.projects[0].url = 'javascript:alert(1)', r => r.skills[0].level = 'Unknown', r => r.photoUrl = '//evil.example/image', r => r.name.en = '', r => r.experience = null, r => r.appearance.mode = 'invalid', r => r.appearance = null]) {
    const value = structuredClone(initialResume); mutate(value); assert.throws(() => validateResume(value));
  }
  const legacy = structuredClone(initialResume); delete legacy.appearance; delete legacy.awards; assert.deepEqual(validateResume(legacy).appearance, { theme: 'amber', mode: 'dark' });
});
test('authentication, CSRF and authenticated editor access', async () => {
  assert.equal((await fetch(`${origin}/api/resume`)).status, 403);
  assert.match(await (await fetch(`${origin}/admin`)).text(), /id="login"/);
  let response = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: json({ Origin: 'https://evil.example' }), body: JSON.stringify({ password }) }); assert.equal(response.status, 403);
  response = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: json(), body: JSON.stringify({ password: 'incorrect' }) }); assert.equal(response.status, 401);
  response = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: json(), body: JSON.stringify({ password }) }); assert.equal(response.status, 200);
  const setCookie = response.headers.get('set-cookie'); assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/); cookie = setCookie.split(';')[0];
  assert.match(await (await fetch(`${origin}/admin`, { headers: { Cookie: cookie } })).text(), /id="editor"/);
});
test('photo decoding, validation, immutable delivery, and content-addressed storage', async () => {
  const form = new FormData(); const image = await sharp({ create: { width: 600, height: 800, channels: 3, background: '#3b729a' } }).png().toBuffer();
  form.set('photo', new Blob([image], { type: 'image/png' }), 'test.png');
  let response = await fetch(`${origin}/api/photos`, { method: 'POST', headers: { Cookie: cookie, Origin: origin }, body: form });
  assert.equal(response.status, 201); photoUrl = (await response.json()).url; assert.match(photoUrl, /^\/api\/photos\/[a-f0-9]{64}$/);
  response = await fetch(origin + photoUrl); assert.equal(response.headers.get('content-type'), 'image/webp');
  const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata(); assert.equal(metadata.width, 512); assert.equal(metadata.height, 512);
  assert.equal((await fetch(origin + photoUrl, { headers: { 'If-None-Match': response.headers.get('etag') } })).status, 304);
  const invalid = new FormData(); invalid.set('photo', new Blob(['not an image']), 'invalid.png');
  assert.equal((await fetch(`${origin}/api/photos`, { method: 'POST', headers: { Cookie: cookie, Origin: origin }, body: invalid })).status, 400);
  const large = new FormData(); large.set('photo', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]), 'large.png');
  assert.equal((await fetch(`${origin}/api/photos`, { method: 'POST', headers: { Cookie: cookie, Origin: origin }, body: large })).status, 413);
});
test('all editor collections save, reject stale writes, and survive restart with photo', async () => {
  const value = await (await fetch(`${origin}/api/resume`, { headers: { Cookie: cookie } })).json(); assert.equal(value.revision, 7);
  value.resume.projects.unshift({ name: { en: 'New project', fa: 'پروژه جدید' }, description: { en: 'Description', fa: 'توضیحات' }, stack: 'Node.js', url: 'https://example.com' });
  value.resume.skills.unshift({ name: 'Custom skill', level: 'Expert' });
  value.resume.experience.unshift({ company: { en: 'Organization', fa: 'سازمان' }, role: { en: 'Developer', fa: 'توسعه‌دهنده' }, date: { en: '2026', fa: '۱۴۰۵' }, description: { en: 'Work', fa: 'سابقه شغلی' } });
  value.resume.educationEntries.push({ en: 'New degree', fa: 'مدرک تحصیلی' }); value.resume.awards.push({ en: 'New award', fa: 'افتخار جدید' });
  value.resume.appearance = { theme: 'ocean', mode: 'light' }; value.resume.photoUrl = photoUrl;
  let response = await fetch(`${origin}/api/resume`, { method: 'PUT', headers: json(), body: JSON.stringify(value) }); assert.equal(response.status, 200); assert.equal((await response.json()).revision, 8);
  response = await fetch(`${origin}/api/resume`, { method: 'PUT', headers: json(), body: JSON.stringify(value) }); assert.equal(response.status, 409);
  await stop(); await launch();
  const read = await (await fetch(`${origin}/api/resume`, { headers: { Cookie: cookie } })).json(); assert.equal(read.revision, 8); assert.deepEqual(read.resume, value.resume);
  const html = await (await fetch(origin)).text(); assert.match(html, /Custom skill/); assert.match(html, /data-theme="ocean"/); assert.match(html, new RegExp(photoUrl));
});
test('logout is relative and expired sessions cannot access the API', async () => {
  const response = await fetch(`${origin}/api/auth/logout`, { method: 'POST', headers: json(), redirect: 'manual' }); assert.equal(response.status, 303); assert.equal(response.headers.get('location'), '/admin'); assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await fetch(`${origin}/api/resume`, { headers: { Cookie: 'sinakratos_admin=1.' + '0'.repeat(64) } })).status, 403);
});
test('host configuration errors are actionable and public origin supports HTTPS proxy cookies', async () => {
  await stop(); await launch({ ADMIN_PASSWORD: '' });
  let response = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: json(), body: JSON.stringify({ password }) }); assert.equal(response.status, 503); assert.match((await response.json()).error, /ADMIN_PASSWORD/);
  await stop(); await launch({ PUBLIC_ORIGIN: 'https://sinakratos.ir' });
  response = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: json({ Origin: 'https://sinakratos.ir' }), body: JSON.stringify({ password }) }); assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /; Secure/);
});
