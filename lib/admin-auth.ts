import 'server-only';
import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual, scryptSync } from 'node:crypto';
import { database } from './resume-store';

export const SESSION_COOKIE = 'sinakratos_admin';
export const SESSION_SECONDS = 60 * 60 * 12;
function config() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || password.length < 16 || !secret || secret.length < 32) {
    throw new Error('Run npm run setup to configure admin access.');
  }
  return { password, secret };
}
function sign(value: string) {
  return createHmac('sha256', config().secret).update(value).digest('hex');
}
export function createSession() {
  const expires = String(Date.now() + SESSION_SECONDS * 1000);
  return `${expires}.${sign(expires)}`;
}
export async function isAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    const [expires, signature, extra] = token.split('.');
    if (extra || !/^\d+$/.test(expires) || !/^[a-f0-9]{64}$/.test(signature || '') || Number(expires) <= Date.now()) return false;
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(expires), 'hex'));
  } catch { return false; }
}
export function checkPassword(input: string) {
  const { password, secret } = config();
  return timingSafeEqual(scryptSync(input, secret, 64), scryptSync(password, secret, 64));
}
export function loginBlocked() {
  const db = database();
  try {
    const row = db.prepare('SELECT failures, reset_at FROM login_attempts WHERE id = 1').get();
    return !!row && Number(row.failures) >= 10 && Number(row.reset_at) > Date.now();
  } finally { db.close(); }
}
export function recordLogin(success: boolean) {
  const db = database();
  try {
    if (success) db.prepare('DELETE FROM login_attempts WHERE id = 1').run();
    else db.prepare(`INSERT INTO login_attempts (id, failures, reset_at) VALUES (1, 1, ?)
      ON CONFLICT(id) DO UPDATE SET failures = CASE WHEN reset_at < ? THEN 1 ELSE failures + 1 END,
      reset_at = CASE WHEN reset_at < ? THEN excluded.reset_at ELSE reset_at END`).run(Date.now() + 15 * 60 * 1000, Date.now(), Date.now());
  } finally { db.close(); }
}
export function sameOrigin(request: Request) {
  try {
    const origin = new URL(request.headers.get('origin') || '');
    return ['http:', 'https:'].includes(origin.protocol) && origin.host === request.headers.get('host');
  } catch { return false; }
}
