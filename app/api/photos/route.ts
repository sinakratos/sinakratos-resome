import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { isAdmin, sameOrigin } from '@/lib/admin-auth';
import { storePhoto } from '@/lib/resume-store';
export const runtime = 'nodejs';
// Limit native image-processing concurrency/cache on small hosting plans.
sharp.concurrency(1);
sharp.cache(false);
const MAX_FILE = 5 * 1024 * 1024;
const MAX_BODY = MAX_FILE + 16 * 1024;
export async function POST(request: Request) {
  if (!await isAdmin()) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const tooLarge = () => Response.json({ error: 'Choose an image smaller than 5 MB. / تصویر باید کمتر از ۵ مگابایت باشد.' }, { status: 413 });
  if (Number(request.headers.get('content-length')) > MAX_BODY) return tooLarge();
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return Response.json({ error: 'Choose an image file.' }, { status: 400 });
  try {
    // Bound streamed uploads too, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: 'Choose an image file.' }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BODY) { await reader.cancel(); return tooLarge(); }
      chunks.push(chunk.value);
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type')! }, body }).formData();
    const file = form.get('photo');
    if (!(file instanceof File) || !file.size) return Response.json({ error: 'Choose an image file.' }, { status: 400 });
    if (file.size > MAX_FILE) return tooLarge();
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25_000_000 });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages ?? 1) > 1) {
      return Response.json({ error: 'Choose a still JPG, PNG, or WebP image. / تصویر ثابت با قالب JPG، PNG یا WebP انتخاب کنید.' }, { status: 400 });
    }
    const photo = await image.rotate().resize(512, 512, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    const id = createHash('sha256').update(photo).digest('hex');
    storePhoto(id, photo);
    return Response.json({ url: `/api/photos/${id}` }, { status: 201 });
  } catch {
    return Response.json({ error: 'The image could not be uploaded. Choose a valid JPG, PNG, or WebP image and try again. / بارگذاری تصویر انجام نشد. لطفاً تصویر معتبر انتخاب کرده و دوباره اقدام کنید.' }, { status: 400 });
  }
}
