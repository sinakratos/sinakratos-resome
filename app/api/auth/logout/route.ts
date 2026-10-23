import { NextResponse } from 'next/server';
import { sameOrigin, SESSION_COOKIE } from '@/lib/admin-auth';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const response = new NextResponse(null, { status: 303, headers: { Location: '/admin' } });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
