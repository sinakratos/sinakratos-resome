import { isAdmin } from '@/lib/admin-auth';
import { readResume } from '@/lib/resume-store';
import Editor from './editor';
import Login from './login';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function Admin() {
  if (!await isAdmin()) return <main className="admin-shell"><a href="/">sinakratos.</a><h1>Résumé administration / مدیریت رزومه</h1><Login /></main>;
  try {
    const data = await readResume();
    return <Editor initial={data.resume} revision={data.revision} />;
  } catch (e) {
    console.error(e);
    return <main className="admin-shell"><h1>Storage temporarily unavailable</h1><p>Try reloading in a moment. Your résumé has not been changed.</p></main>;
  }
}
