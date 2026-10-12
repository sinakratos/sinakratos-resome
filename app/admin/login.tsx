'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <div className="notice"><p>Sign in to edit your résumé. / برای مدیریت و ویرایش رزومه، وارد حساب کاربری شوید.</p>
    <form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('');
      try {
        const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        window.location.reload();
      } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); }
      finally { setBusy(false); }
    }}><label>Admin password / رمز عبور مدیر<Input type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <Button disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in / ورود به حساب'}</Button>
      {error && <p role="alert">{error}</p>}
    </form></div>;
}
