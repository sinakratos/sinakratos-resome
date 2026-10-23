import { readFileSync } from 'node:fs';
export const initialResume = JSON.parse(readFileSync(new URL('./initial-resume.json', import.meta.url), 'utf8'));
export const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
export function validateResume(value) {
  const fail = path => { throw Object.assign(new Error(`Invalid field / مقدار نامعتبر: ${path}`), { status: 400 }); };
  const object = (v, path) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(path); return v; };
  const text = (v, path, max = 5000) => { if (typeof v !== 'string' || v.length > max) fail(path); return v; };
  const pair = (v, path, named = false) => {
    object(v, path);
    const result = { en: text(v.en, `${path}.en`), fa: text(v.fa, `${path}.fa`) };
    if (named && (!result.en.trim() || !result.fa.trim())) fail(path);
    return result;
  };
  const list = (v, path, max, parse) => {
    if (!Array.isArray(v) || v.length > max) fail(path);
    return v.map((entry, i) => parse(entry, `${path}.${i}`));
  };
  object(value, 'resume');
  const result = {};
  for (const key of ['name', 'title', 'headline', 'about', 'location', 'education', 'award']) result[key] = pair(value[key], key, key === 'name');
  result.email = text(value.email, 'email', 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) fail('email');
  result.phone = text(value.phone, 'phone', 30);
  result.photoUrl = text(value.photoUrl === undefined ? '' : value.photoUrl, 'photoUrl', 80);
  if (!/^$|^\/api\/photos\/[a-f0-9]{64}$/.test(result.photoUrl)) fail('photoUrl');
  result.skills = list(value.skills, 'skills', 30, (v, p) => {
    object(v, p);
    const name = text(v.name, `${p}.name`, 80).trim();
    if (!name || !levels.includes(v.level)) fail(p);
    return { name, level: v.level };
  });
  result.experience = list(value.experience, 'experience', 20, (v, p) => {
    object(v, p);
    return Object.fromEntries(['company', 'role', 'date', 'description'].map(k => [k, pair(v[k], `${p}.${k}`, k === 'company')]));
  });
  result.projects = list(value.projects, 'projects', 30, (v, p) => {
    object(v, p);
    const url = text(v.url, `${p}.url`, 500);
    if (url) { try { const u = new URL(url); if (u.protocol !== 'https:' || u.username || u.password) fail(`${p}.url`); } catch { fail(`${p}.url`); } }
    return { name: pair(v.name, `${p}.name`, true), description: pair(v.description, `${p}.description`), stack: text(v.stack, `${p}.stack`, 300), url };
  });
  for (const key of ['educationEntries', 'awards']) result[key] = list(value[key] === undefined ? [] : value[key], key, 20, pair);
  const appearance = value.appearance === undefined ? { theme: 'amber', mode: 'dark' } : value.appearance;
  object(appearance, 'appearance');
  if (!['amber', 'ocean', 'emerald'].includes(appearance.theme) || !['light', 'dark'].includes(appearance.mode)) fail('appearance');
  result.appearance = { theme: appearance.theme, mode: appearance.mode };
  return result;
}
