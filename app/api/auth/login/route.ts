import { NextResponse } from 'next/server';
import { checkPassword, createSession, loginBlocked, recordLogin, sameOrigin, SESSION_COOKIE, SESSION_SECONDS } from '@/lib/admin-auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    if (loginBlocked()) return Response.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
    const body = await request.json();
    if (typeof body.password !== 'string' || body.password.length > 256) return Response.json({ error: 'Enter your admin password.' }, { status: 400 });
    const valid = checkPassword(body.password);
    recordLogin(valid);
    if (!valid) return Response.json({ error: 'Incorrect password / رمز عبور نادرست است' }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, createSession(), { httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: SESSION_SECONDS });
    return response;
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Admin access is not configured. Run npm run setup.' }, { status: 503 });
  }
}
