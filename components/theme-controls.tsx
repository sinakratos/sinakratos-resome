'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Resume } from '@/lib/resume';
export type Appearance = Resume['appearance'];
export const themes = [
  { value: 'amber', en: 'Amber', fa: 'کهربایی' },
  { value: 'ocean', en: 'Ocean', fa: 'اقیانوسی' },
  { value: 'emerald', en: 'Emerald', fa: 'زمردی' },
] as const;
export default function ThemeControls({ lang = 'en', defaults = { theme: 'amber', mode: 'dark' } }: { lang?: 'en' | 'fa'; defaults?: Appearance }) {
  const [appearance, setAppearance] = useState<Appearance>(defaults);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const palette = localStorage.getItem('palette');
      const mode = localStorage.getItem('theme');
      setAppearance({ theme: themes.some(t => t.value === palette) ? palette as Appearance['theme'] : defaults.theme, mode: mode === 'dark' || mode === 'light' ? mode : defaults.mode });
    } catch { setAppearance(defaults); }
    setReady(true);
  }, [defaults.theme, defaults.mode]);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = appearance.theme;
    document.documentElement.classList.toggle('dark', appearance.mode === 'dark');
    try { localStorage.setItem('palette', appearance.theme); localStorage.setItem('theme', appearance.mode); } catch { /* Preferences remain usable without storage. */ }
  }, [appearance, ready]);
  return <div className="theme-controls">
    <Select value={appearance.theme} onValueChange={theme => setAppearance(a => ({ ...a, theme: theme as Appearance['theme'] }))}>
      <SelectTrigger className="theme-select" aria-label={lang === 'fa' ? 'انتخاب پوسته' : 'Choose theme'}><SelectValue /></SelectTrigger>
      <SelectContent>{themes.map(theme => <SelectItem value={theme.value} key={theme.value}>{theme[lang]}</SelectItem>)}</SelectContent>
    </Select>
    <Button variant="ghost" size="icon" onClick={() => setAppearance(a => ({ ...a, mode: a.mode === 'dark' ? 'light' : 'dark' }))} aria-label={lang === 'fa' ? 'تغییر حالت روشن و تیره' : 'Toggle light and dark mode'}>{appearance.mode === 'dark' ? <Sun /> : <Moon />}</Button>
  </div>;
}
