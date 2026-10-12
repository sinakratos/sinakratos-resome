'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PhotoUpload from '@/components/photo-upload';
import ThemeControls, { themes } from '@/components/theme-controls';
import { resumeSchema, type Resume } from '@/lib/resume';

type Pair = { en: string; fa: string };
const blankPair = (): Pair => ({ en: '', fa: '' });
const levels = [
  { value: 'Beginner', fa: 'مقدماتی' },
  { value: 'Intermediate', fa: 'متوسط' },
  { value: 'Advanced', fa: 'پیشرفته' },
  { value: 'Expert', fa: 'تخصصی' },
] as const;
const labels = {
  name: 'Name / نام', title: 'Professional title / عنوان حرفه‌ای', headline: 'Headline / عنوان اصلی',
  about: 'Biography / معرفی حرفه‌ای', location: 'Location / محل سکونت',
  company: 'Organization / سازمان', role: 'Position / عنوان شغلی', date: 'Dates / بازه زمانی',
  description: 'Description / توضیحات', email: 'Email / پست الکترونیکی', phone: 'Phone / شماره تماس',
  stack: 'Technologies / فناوری‌ها', url: 'Website link / پیوند وب‌سایت',
};
function PairFields({ label, value, onChange }: { label: string; value: Pair; onChange: (value: Pair) => void }) {
  return <div className="editor-pair">
    <label>{label} · English<Textarea dir="ltr" value={value.en} onChange={e => onChange({ ...value, en: e.target.value })} /></label>
    <label>{label} · فارسی<Textarea dir="rtl" value={value.fa} onChange={e => onChange({ ...value, fa: e.target.value })} /></label>
  </div>;
}
function AddButton({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return <Button type="button" disabled={disabled} onClick={onClick}><Plus size={16} />{children}</Button>;
}
export default function Editor({ initial, revision }: { initial: Resume; revision: number }) {
  const [data, setData] = useState(initial);
  const [rev, setRev] = useState(revision);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState('projects');
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Resume | null>(null);
  function update(next: Resume) {
    setRemoved(null); setData(next); setDirty(true); setStatus('Unsaved changes / تغییرات ذخیره‌نشده');
  }
  function remove(next: Resume) { update(next); setRemoved(data); }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!focusTarget) return;
    const element = document.getElementById(focusTarget);
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')?.focus({ preventScroll: true });
    setFocusTarget(null);
  }, [focusTarget, data]);
  async function save() {
    const validated = resumeSchema.safeParse(data);
    if (!validated.success) {
      const issue = validated.error.issues[0];
      const section = String(issue.path[0]);
      setTab(['projects', 'skills', 'experience', 'appearance', 'awards'].includes(section) ? section : section === 'educationEntries' ? 'education' : 'profile');
      setStatus(`${issue.path.join(' → ')}: ${issue.message}`);
      return;
    }
    setBusy(true); setStatus('Saving… / در حال ذخیره‌سازی…');
    try {
      const response = await fetch('/api/resume', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resume: validated.data, revision: rev }) });
      const result = await response.json() as { error?: string; revision: number };
      if (!response.ok) throw new Error(result.error);
      setRev(result.revision); setDirty(false); setRemoved(null);
      setStatus('Saved successfully / تغییرات با موفقیت ذخیره شد');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to save / ذخیره‌سازی انجام نشد'); }
    finally { setBusy(false); }
  }
  const removeButton = (onClick: () => void) => <Button type="button" variant="outline" onClick={onClick}><Trash2 size={16} />Remove / حذف مورد</Button>;
  return <main className="admin-shell">
    <div className="admin-top">
      <div><a href="/">sinakratos.</a><h1>Résumé management / مدیریت رزومه</h1></div>
      <div className="admin-top-actions"><ThemeControls defaults={initial.appearance} /><a href="/" target="_blank" rel="noopener noreferrer" className="preview-link"><ExternalLink size={16} />View website / مشاهده وب‌سایت</a><form method="post" action="/api/auth/logout"><Button variant="outline" type="submit">Sign out / خروج از حساب</Button></form></div>
    </div>
    <p>Add entries and edit both translations, then save your changes. / اطلاعات جدید را اضافه کنید، متن هر دو زبان را تکمیل نمایید و تغییرات را ذخیره کنید.</p>
    <fieldset disabled={busy || photoUploading} className="admin-fields">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="admin-tabs">
          <TabsTrigger value="projects">Projects / پروژه‌ها ({data.projects.length})</TabsTrigger>
          <TabsTrigger value="skills">Skills / مهارت‌ها ({data.skills.length})</TabsTrigger>
          <TabsTrigger value="experience">Experience / سوابق شغلی</TabsTrigger>
          <TabsTrigger value="education">Education / تحصیلات</TabsTrigger>
          <TabsTrigger value="awards">Awards / افتخارات</TabsTrigger>
          <TabsTrigger value="profile">Profile / مشخصات</TabsTrigger>
          <TabsTrigger value="appearance">Themes / پوسته‌ها</TabsTrigger>
        </TabsList>
        <TabsContent value="projects"><section className="admin-section">
          <div className="editor-heading"><h2>Projects / پروژه‌ها</h2><AddButton disabled={data.projects.length >= 30} onClick={() => { update({ ...data, projects: [{ name: blankPair(), description: blankPair(), stack: '', url: '' }, ...data.projects] }); setFocusTarget('project-0'); }}>Add project / افزودن پروژه</AddButton></div>
          <p>Give each project your own name, description, technologies, and optional HTTPS link. / نام، توضیحات و فناوری‌های هر پروژه را وارد کنید. درج پیوند وب‌سایت اختیاری است.</p>
          {data.projects.map((item, index) => <article className="editor-item" id={`project-${index}`} key={index}>
            <h3>{item.name.en || 'New project / پروژه جدید'}</h3>
            {(['name', 'description'] as const).map(key => <PairFields key={key} label={labels[key]} value={item[key]} onChange={value => update({ ...data, projects: data.projects.map((entry, i) => i === index ? { ...entry, [key]: value } : entry) })} />)}
            <div className="editor-pair">{(['stack', 'url'] as const).map(key => <label key={key}>{labels[key]}<Input dir="ltr" type={key === 'url' ? 'url' : 'text'} placeholder={key === 'url' ? 'https://example.com' : 'NestJS / PostgreSQL'} value={item[key]} onChange={e => update({ ...data, projects: data.projects.map((entry, i) => i === index ? { ...entry, [key]: e.target.value } : entry) })} /></label>)}</div>
            {removeButton(() => remove({ ...data, projects: data.projects.filter((_, i) => i !== index) }))}
          </article>)}
        </section></TabsContent>
        <TabsContent value="skills"><section className="admin-section">
          <div className="editor-heading"><h2>Skills / مهارت‌ها</h2><AddButton disabled={data.skills.length >= 30} onClick={() => { update({ ...data, skills: [{ name: '', level: 'Beginner' }, ...data.skills] }); setFocusTarget('skill-0'); }}>Add skill / افزودن مهارت</AddButton></div>
          <p>Enter any skill name and choose its proficiency level. / نام مهارت موردنظر را وارد و سطح تسلط خود را انتخاب کنید.</p>
          {data.skills.map((skill, index) => <article className="editor-item skill-editor" id={`skill-${index}`} key={index}>
            <label>Skill name / نام مهارت<Input dir="auto" value={skill.name} placeholder="e.g. Kubernetes" onChange={e => update({ ...data, skills: data.skills.map((entry, i) => i === index ? { ...entry, name: e.target.value } : entry) })} /></label>
            <div><label id={`skill-level-${index}`}>Proficiency / سطح تسلط</label><Select value={skill.level} onValueChange={level => update({ ...data, skills: data.skills.map((entry, i) => i === index ? { ...entry, level: level as Resume['skills'][number]['level'] } : entry) })}><SelectTrigger aria-labelledby={`skill-level-${index}`}><SelectValue /></SelectTrigger><SelectContent>{levels.map(level => <SelectItem value={level.value} key={level.value}>{level.value} / {level.fa}</SelectItem>)}</SelectContent></Select></div>
            {removeButton(() => remove({ ...data, skills: data.skills.filter((_, i) => i !== index) }))}
          </article>)}
        </section></TabsContent>
        <TabsContent value="experience"><section className="admin-section">
          <div className="editor-heading"><h2>Experience / سوابق شغلی</h2><AddButton disabled={data.experience.length >= 20} onClick={() => { update({ ...data, experience: [{ company: blankPair(), role: blankPair(), date: blankPair(), description: blankPair() }, ...data.experience] }); setFocusTarget('experience-0'); }}>Add experience / افزودن سابقه شغلی</AddButton></div>
          {data.experience.map((item, index) => <article className="editor-item" id={`experience-${index}`} key={index}>
            <h3>{item.company.en || 'New experience / سابقه شغلی جدید'}</h3>
            {(['company', 'role', 'date', 'description'] as const).map(key => <PairFields key={key} label={labels[key]} value={item[key]} onChange={value => update({ ...data, experience: data.experience.map((entry, i) => i === index ? { ...entry, [key]: value } : entry) })} />)}
            {removeButton(() => remove({ ...data, experience: data.experience.filter((_, i) => i !== index) }))}
          </article>)}
        </section></TabsContent>
        <TabsContent value="education"><section className="admin-section">
          <div className="editor-heading"><h2>Education / سوابق تحصیلی</h2><AddButton disabled={data.educationEntries.length >= 20} onClick={() => { update({ ...data, educationEntries: [blankPair(), ...data.educationEntries] }); setFocusTarget('education-0'); }}>Add education / افزودن سابقه تحصیلی</AddButton></div>
          <PairFields label="Primary education / سابقه تحصیلی اصلی" value={data.education} onChange={education => update({ ...data, education })} />
          {data.educationEntries.map((entry, index) => <article className="editor-item" id={`education-${index}`} key={index}><PairFields label="Education / سابقه تحصیلی" value={entry} onChange={value => update({ ...data, educationEntries: data.educationEntries.map((item, i) => i === index ? value : item) })} />{removeButton(() => remove({ ...data, educationEntries: data.educationEntries.filter((_, i) => i !== index) }))}</article>)}
        </section></TabsContent>
        <TabsContent value="awards"><section className="admin-section">
          <div className="editor-heading"><h2>Awards / افتخارات</h2><AddButton disabled={data.awards.length >= 20} onClick={() => { update({ ...data, awards: [blankPair(), ...data.awards] }); setFocusTarget('award-0'); }}>Add award / افزودن افتخار</AddButton></div>
          <PairFields label="Primary award / افتخار اصلی" value={data.award} onChange={award => update({ ...data, award })} />
          {data.awards.map((entry, index) => <article className="editor-item" id={`award-${index}`} key={index}><PairFields label="Award / افتخار" value={entry} onChange={value => update({ ...data, awards: data.awards.map((item, i) => i === index ? value : item) })} />{removeButton(() => remove({ ...data, awards: data.awards.filter((_, i) => i !== index) }))}</article>)}
        </section></TabsContent>
        <TabsContent value="profile"><section className="admin-section"><h2>Profile / مشخصات حرفه‌ای</h2>
          <PhotoUpload url={data.photoUrl} onBusyChange={setPhotoUploading} onChange={photoUrl => { setRemoved(null); setData(current => ({ ...current, photoUrl })); setDirty(true); setStatus('Unsaved changes / تغییرات ذخیره‌نشده'); }} />
          {(['name', 'title', 'headline', 'about', 'location'] as const).map(key => <PairFields key={key} label={labels[key]} value={data[key]} onChange={value => update({ ...data, [key]: value })} />)}
          <div className="editor-pair">{(['email', 'phone'] as const).map(key => <label key={key}>{labels[key]}<Input dir="ltr" type={key === 'email' ? 'email' : 'tel'} value={data[key]} onChange={e => update({ ...data, [key]: e.target.value })} /></label>)}</div>
        </section></TabsContent>
        <TabsContent value="appearance"><section className="admin-section"><h2>Website appearance / ظاهر وب‌سایت</h2>
          <p>Choose the default appearance for new visitors. Visitors can change it from the website header. / پوسته و حالت پیش‌فرض را برای بازدیدکنندگان جدید انتخاب کنید. تغییر این تنظیمات از نوار بالای وب‌سایت نیز امکان‌پذیر است.</p>
          <div className="editor-pair"><div><label id="default-theme">Default theme / پوسته پیش‌فرض</label><Select value={data.appearance.theme} onValueChange={theme => update({ ...data, appearance: { ...data.appearance, theme: theme as Resume['appearance']['theme'] } })}><SelectTrigger aria-labelledby="default-theme"><SelectValue /></SelectTrigger><SelectContent>{themes.map(theme => <SelectItem value={theme.value} key={theme.value}>{theme.en} / {theme.fa}</SelectItem>)}</SelectContent></Select></div>
          <div><label id="default-mode">Default mode / حالت پیش‌فرض</label><Select value={data.appearance.mode} onValueChange={mode => update({ ...data, appearance: { ...data.appearance, mode: mode as Resume['appearance']['mode'] } })}><SelectTrigger aria-labelledby="default-mode"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dark">Dark / تیره</SelectItem><SelectItem value="light">Light / روشن</SelectItem></SelectContent></Select></div></div>
        </section></TabsContent>
      </Tabs>
    </fieldset>
    <div className="admin-status"><Button disabled={busy || photoUploading || !dirty} onClick={save}>Save changes / ذخیره تغییرات</Button>{removed && <Button variant="outline" disabled={busy || photoUploading} onClick={() => { update(removed); setRemoved(null); }}>Undo removal / بازگردانی حذف</Button>}<span role="status">{status}</span></div>
  </main>;
}
