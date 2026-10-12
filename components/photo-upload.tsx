'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
export default function PhotoUpload({ url, onChange, onBusyChange }: { url: string; onChange: (url: string) => void; onBusyChange: (busy: boolean) => void }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) { setMessage('Choose a file smaller than 5 MB. / اندازه تصویر باید کمتر از ۵ مگابایت باشد.'); return; }
    setUploading(true); onBusyChange(true); setMessage('Uploading… / در حال بارگذاری تصویر…');
    try {
      const form = new FormData(); form.set('photo', file);
      const response = await fetch('/api/photos', { method: 'POST', body: form });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || 'Upload failed.');
      onChange(result.url);
      setMessage('Photo ready. Save your changes to display it on the website. / تصویر آماده است. برای نمایش در وب‌سایت، تغییرات را ذخیره کنید.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed / بارگذاری انجام نشد'); }
    finally { setUploading(false); onBusyChange(false); }
  }
  return <div className="photo-upload">
    <h3>Profile photo / تصویر شخصی</h3>
    <div className="photo-upload-row">
      {url ? <img className="photo-preview" src={url} alt="Profile photo preview / پیش‌نمایش تصویر شخصی" width={112} height={112} /> : <div className="photo-placeholder">SK</div>}
      <div><label htmlFor="profile-photo-file">Choose or replace your photo / انتخاب یا جایگزینی تصویر</label>
        <Input id="profile-photo-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} aria-describedby="photo-help" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file); }} />
        <p id="photo-help">JPG, PNG, or WebP · up to 5 MB. Photos are cropped to a square. / قالب JPG، PNG یا WebP، حداکثر ۵ مگابایت. تصویر به‌صورت مربع برش داده می‌شود.</p>
        {url && <Button type="button" variant="outline" disabled={uploading} onClick={() => { onChange(''); setMessage('Save your changes to remove the photo from your profile. / برای حذف تصویر از نمایه، تغییرات را ذخیره کنید.'); }}>Remove photo / حذف تصویر</Button>}
      </div>
    </div>
    <p role="status">{message}</p>
  </div>;
}
