import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readResume, saveResume, storePhoto, readPhoto } from './server/store.mjs';
import { validateResume } from './server/resume.mjs';
import { config, isAdmin, checkPassword, createSession, sameOrigin, sessionCookie, loginBlocked, recordLogin } from './server/auth.mjs';
import { portfolio, adminPage } from './server/views.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
if (existsSync(path.join(root, '.env.local'))) process.loadEnvFile(path.join(root, '.env.local'));
process.env.DATABASE_PATH = path.resolve(root, process.env.DATABASE_PATH || 'data/resume.sqlite');
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
async function body(req, max) {
  if (Number(req.headers['content-length']) > max) fail(413, 'Request too large / حجم درخواست بیش از حد مجاز است');
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > max) fail(413, 'Request too large / حجم درخواست بیش از حد مجاز است'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function readJson(req, max) {
  if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'Expected JSON');
  try { return JSON.parse((await body(req, max)).toString('utf8')); } catch (error) { if (error.status) throw error; fail(400, 'Invalid JSON'); }
}
let processor;
async function upload(req) {
  if (!req.headers['content-type']?.startsWith('multipart/form-data;')) fail(400, 'Choose an image file / لطفاً تصویر انتخاب کنید');
  const raw = await body(req, 5 * 1024 * 1024 + 16384);
  let file;
  try { file = (await new Request('http://localhost/api/photos', { method: 'POST', headers: { 'content-type': req.headers['content-type'] }, body: raw }).formData()).get('photo'); }
  catch { fail(400, 'Invalid upload'); }
  if (!(file instanceof File) || !file.size) fail(400, 'Choose an image file');
  if (file.size > 5 * 1024 * 1024) fail(413, 'Image must be smaller than 5 MB');
  // Load native image processing only when an administrator uploads a photo.
  if (!processor) { processor = (await import('sharp')).default; processor.concurrency(1); processor.cache(false); }
  let photo;
  try {
    const image = processor(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25_000_000 });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) > 1) fail(400, 'Choose a still JPG, PNG, or WebP image');
    photo = await image.rotate().resize(512, 512, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch (error) { fail(400, error.status ? error.message : 'Invalid image / تصویر معتبر JPG، PNG یا WebP انتخاب کنید'); }
  const id = createHash('sha256').update(photo).digest('hex'); storePhoto(id, photo);
  return { url: `/api/photos/${id}` };
}
// Only these files are public; credentials, database, and source are never served.
const staticFiles = new Map([
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/site.js', ['site.js', 'text/javascript; charset=utf-8']],
  ['/admin.js', ['admin.js', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ['/sina-khoshzaban-resume.pdf', ['sina-khoshzaban-resume.pdf', 'application/pdf']],
]);
let loginPending = false;
export const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'");
  try {
    const url = new URL(req.url, 'http://localhost');
    const route = url.pathname;
    if (['GET', 'HEAD'].includes(req.method)) {
      if (staticFiles.has(route)) {
        const [file, type] = staticFiles.get(route);
        const data = readFileSync(path.join(root, 'public', file));
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length, 'Cache-Control': 'public, max-age=3600' });
        return res.end(req.method === 'HEAD' ? undefined : data);
      }
      if (/^\/api\/photos\/[a-f0-9]{64}$/.test(route)) {
        const id = route.split('/').at(-1); const photo = readPhoto(id);
        if (!photo) fail(404, 'Image not found');
        const headers = { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', ETag: `"${id}"` };
        if (req.headers['if-none-match'] === headers.ETag) { res.writeHead(304, headers); return res.end(); }
        res.writeHead(200, { ...headers, 'Content-Length': photo.length }); return res.end(req.method === 'HEAD' ? undefined : photo);
      }
      if (route === '/api/resume') {
        if (!isAdmin(req)) fail(403, 'Administrator access required');
        return json(res, 200, readResume());
      }
      if (route === '/' || route === '/admin' || route === '/admin/') {
        const { resume } = readResume();
        const lang = url.searchParams.get('lang') === 'fa' ? 'fa' : 'en';
        const html = route === '/' ? portfolio(resume, lang) : adminPage(resume, isAdmin(req));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(req.method === 'HEAD' ? undefined : html);
      }
      fail(404, 'Not found');
    }
    if (!sameOrigin(req)) fail(403, 'Invalid origin / مبدأ درخواست معتبر نیست');
    if (route === '/api/auth/login' && req.method === 'POST') {
      config();
      if (loginPending || loginBlocked()) fail(429, 'Too many attempts. Try again later. / لطفاً اندکی بعد دوباره اقدام کنید.');
      loginPending = true;
      try {
        const value = await readJson(req, 2048);
        if (typeof value?.password !== 'string' || value.password.length > 256) fail(400, 'Invalid password');
        const valid = await checkPassword(value.password); recordLogin(valid);
        if (!valid) fail(401, 'Incorrect password / گذرواژه نادرست است');
        res.setHeader('Set-Cookie', sessionCookie(req, createSession())); return json(res, 200, { ok: true });
      } finally { loginPending = false; }
    }
    if (route === '/api/auth/logout' && req.method === 'POST') {
      res.writeHead(303, { Location: '/admin', 'Set-Cookie': sessionCookie(req, '', 0) }); return res.end();
    }
    if (!isAdmin(req)) fail(403, 'Administrator access required');
    if (route === '/api/resume' && req.method === 'PUT') {
      const value = await readJson(req, 1024 * 1024);
      if (!Number.isSafeInteger(value?.revision) || value.revision < 0) fail(400, 'Invalid revision');
      const resume = validateResume(value.resume);
      if (resume.photoUrl && !readPhoto(resume.photoUrl.split('/').at(-1))) fail(400, 'Upload the photo before saving');
      if (!saveResume(resume, value.revision)) fail(409, 'Content changed in another session. Reload before saving. / اطلاعات در نشست دیگری تغییر کرده است؛ صفحه را مجدداً بارگذاری کنید.');
      return json(res, 200, { revision: value.revision + 1 });
    }
    if (route === '/api/photos' && req.method === 'POST') return json(res, 201, await upload(req));
    fail(404, 'Not found');
  } catch (error) {
    if (!error.status) console.error('Request failed:', error);
    if (!res.headersSent && !res.destroyed) json(res, error.status || 500, { error: error.status ? error.message : 'Server error / خطای سرور؛ گزارش سرویس را بررسی کنید' });
    else res.end();
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(Number(process.env.PORT || 3000), process.env.APP_HOST || '0.0.0.0', () => console.log(`Resume server listening on port ${server.address().port}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10000).unref(); });
