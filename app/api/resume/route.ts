import { z } from 'zod';
import { isAdmin, sameOrigin } from '@/lib/admin-auth';
import { readResume, saveResume, readPhoto } from '@/lib/resume-store';
import { resumeSchema } from '@/lib/resume';
export const runtime = 'nodejs';
export async function GET() {
  try { return Response.json(await readResume(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (e) { console.error(e); return Response.json({ error: 'Content is temporarily unavailable.' }, { status: 503 }); }
}
export async function PUT(request: Request) {
  if (!await isAdmin()) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const body = z.object({ resume: resumeSchema, revision: z.number().int().nonnegative() }).parse(await request.json());
    if (body.resume.photoUrl && !readPhoto(body.resume.photoUrl.split('/').pop()!)) return Response.json({ error: 'The photo is unavailable. Please upload it again.' }, { status: 400 });
    if (!saveResume(body.resume, body.revision)) return Response.json({ error: 'Content changed in another session. Reload before saving.' }, { status: 409 });
    return Response.json({ revision: body.revision + 1 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Unable to save. Check your entries and try again.' }, { status: 400 });
  }
}
