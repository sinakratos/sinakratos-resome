import { readPhoto } from '@/lib/resume-store';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) return new Response('Not found', { status: 404 });
  try {
    const photo = readPhoto(id);
    if (!photo) return new Response('Not found', { status: 404 });
    const headers = { 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable', ETag: `"${id}"` };
    if (request.headers.get('if-none-match') === headers.ETag) return new Response(null, { status: 304, headers });
    return new Response(new Uint8Array(photo).buffer, { headers });
  } catch (error) {
    console.error(error);
    return new Response('Photo temporarily unavailable', { status: 503 });
  }
}
