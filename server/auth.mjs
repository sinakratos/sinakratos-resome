import { createHmac, timingSafeEqual, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { database } from './store.mjs';
const derive = promisify(scrypt);
export const SESSION_COOKIE = 'sinakratos_admin';
export const SESSION_SECONDS = 43200;
export function config() {
  const { ADMIN_PASSWORD: password, SESSION_SECRET: secret } = process.env;
  if (!password || password.length < 16 || !secret || secret.length < 32) {
    throw Object.assign(new Error('Admin access is not configured. Set ADMIN_PASSWORD (16+ characters) and SESSION_SECRET (32+ characters), then restart. / تنظیمات دسترسی مدیر را تکمیل و سرویس را مجدداً راه‌اندازی کنید.'), { status: 503 });
  }
  return { password, secret };
}
const sign = value => createHmac('sha256', config().secret).update(value).digest('hex');
export function createSession() {
  const expires = String(Date.now() + SESSION_SECONDS * 1000);
  return `${expires}.${sign(expires)}`;
}
export function isAdmin(request) {
  const token = (request.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!token) return false;
  try {
    const [expires, signature, extra] = token.split('.');
    if (extra || !/^\d+$/.test(expires) || !/^[a-f0-9]{64}$/.test(signature || '') || Number(expires) <= Date.now()) return false;
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(expires), 'hex'));
  } catch { return false; }
}
export async function checkPassword(input) {
  const { password, secret } = config();
  const [supplied, expected] = await Promise.all([derive(input, secret, 64), derive(password, secret, 64)]);
  return timingSafeEqual(supplied, expected);
}
export function loginBlocked() {
  const db = database();
  try {
    const row = db.prepare('SELECT failures, reset_at FROM login_attempts WHERE id = 1').get();
    return !!row && Number(row.failures) >= 10 && Number(row.reset_at) > Date.now();
  } finally { db.close(); }
}
export function recordLogin(success) {
  const db = database();
  try {
    if (success) db.prepare('DELETE FROM login_attempts WHERE id = 1').run();
    else db.prepare(`INSERT INTO login_attempts (id, failures, reset_at) VALUES (1, 1, ?)
      ON CONFLICT(id) DO UPDATE SET failures = CASE WHEN reset_at < ? THEN 1 ELSE failures + 1 END,
      reset_at = CASE WHEN reset_at < ? THEN excluded.reset_at ELSE reset_at END`).run(Date.now() + 900000, Date.now(), Date.now());
  } finally { db.close(); }
}
export function sameOrigin(request) {
  try {
    const origin = new URL(request.headers.origin || '');
    return ['http:', 'https:'].includes(origin.protocol) && (origin.host === request.headers.host || (process.env.PUBLIC_ORIGIN && origin.origin === new URL(process.env.PUBLIC_ORIGIN).origin));
  } catch { return false; }
}
export function sessionCookie(request, value, age = SESSION_SECONDS) {
  const secure = process.env.PUBLIC_ORIGIN?.startsWith('https://') || !!request.socket.encrypted;
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
}
