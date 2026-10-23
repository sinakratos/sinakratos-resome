const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function api(url, options = {}) {
  const response = await fetch(url, options); const value = await response.json();
  if (!response.ok) throw new Error(value.error || `Request failed (${response.status})`);
  return value;
}
const login = document.querySelector('#login');
login?.addEventListener('submit', async event => {
  event.preventDefault(); const button = login.querySelector('button'), status = document.querySelector('#login-status');
  button.disabled = true; status.textContent = 'Signing in / در حال بررسی اطلاعات…';
  try {
    await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: login.elements.password.value }) }); location.reload();
  } catch (error) { status.textContent = error.message; button.disabled = false; }
});
const editor = document.querySelector('#editor');
if (editor) startEditor();
async function startEditor() {
  const status = document.querySelector('#status'), save = document.querySelector('#save'), undo = document.querySelector('#undo');
  let data, revision, dirty = false, busy = false, removed = null, tab = 'projects';
  const tabs = { projects: 'Projects / پروژه‌ها', skills: 'Skills / مهارت‌ها', experience: 'Experience / سوابق شغلی', education: 'Education / تحصیلات', awards: 'Awards / افتخارات', profile: 'Profile / مشخصات', appearance: 'Themes / پوسته‌ها' };
  const labels = { name: 'Name / نام', title: 'Professional title / عنوان حرفه‌ای', headline: 'Headline / عنوان اصلی', about: 'Biography / معرفی حرفه‌ای', location: 'Location / محل سکونت', company: 'Organization / سازمان', role: 'Position / عنوان شغلی', date: 'Dates / بازه زمانی', description: 'Description / توضیحات', email: 'Email / پست الکترونیکی', phone: 'Phone / شماره تماس', stack: 'Technologies / فناوری‌ها', url: 'HTTPS website / پیوند وب‌سایت HTTPS' };
  const blank = () => ({ en: '', fa: '' });
  const levels = { Beginner: 'مقدماتی', Intermediate: 'متوسط', Advanced: 'پیشرفته', Expert: 'تخصصی' };
  const limits = { projects: 30, skills: 30, experience: 20, educationEntries: 20, awards: 20 };
  const collection = () => tab === 'education' ? 'educationEntries' : tab;
  function field(path, label, value, { type = 'text', max = 5000, multiline = false, dir = 'auto' } = {}) {
    const attrs = `id="field-${esc(path)}" data-path="${esc(path)}" dir="${dir}" maxlength="${max}"`;
    return `<label for="field-${esc(path)}">${label}${multiline ? `<textarea ${attrs}>${esc(value)}</textarea>` : `<input ${attrs} type="${type}" value="${esc(value)}">`}</label>`;
  }
  function pair(path, label, value) {
    return `<div class="editor-pair">${field(`${path}.en`, `${label} · English`, value.en, { multiline: true, dir: 'ltr' })}${field(`${path}.fa`, `${label} · فارسی`, value.fa, { multiline: true, dir: 'rtl' })}</div>`;
  }
  function select(path, label, value, options) {
    return `<label for="field-${path}">${label}<select id="field-${path}" data-path="${path}">${Object.entries(options).map(([v, text]) => `<option value="${v}"${v === value ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`;
  }
  function updateStatus(message = 'Unsaved changes / تغییرات ذخیره‌نشده') { status.textContent = message; save.disabled = busy || !dirty; undo.hidden = !removed; undo.disabled = busy; }
  function changed() { dirty = true; removed = null; updateStatus(); }
  function render(focus) {
    let content = '';
    if (tab === 'profile') {
      content = `<div class="photo-upload"><h3>Profile photo / تصویر پروفایل</h3>${data.photoUrl ? `<img src="${esc(data.photoUrl)}" alt="Profile photo"><button type="button" data-action="remove-photo">Remove photo / حذف تصویر</button>` : '<p>SK</p>'}<label for="photo">Upload JPG, PNG, WebP (5 MB) / بارگذاری تصویر<input type="file" id="photo" accept="image/jpeg,image/png,image/webp"></label><p>پس از بارگذاری تصویر، تغییرات را ذخیره کنید.</p></div>`;
      content += ['name', 'title', 'headline', 'about', 'location'].map(key => pair(key, labels[key], data[key])).join('');
      content += `<div class="editor-pair">${field('email', labels.email, data.email, { type: 'email', dir: 'ltr', max: 254 })}${field('phone', labels.phone, data.phone, { type: 'tel', dir: 'ltr', max: 30 })}</div>`;
    } else if (tab === 'appearance') {
      content = '<p>پوسته و حالت پیش‌فرض بازدیدکنندگان جدید را انتخاب کنید. انتخاب شخصی هر بازدیدکننده در مرورگر او حفظ می‌شود.</p>';
      content += `<div class="editor-pair">${select('appearance.theme', 'Default theme / پوسته پیش‌فرض', data.appearance.theme, { amber: 'Amber / کهربایی', ocean: 'Ocean / اقیانوسی', emerald: 'Emerald / زمردی' })}${select('appearance.mode', 'Default mode / حالت پیش‌فرض', data.appearance.mode, { dark: 'Dark / تیره', light: 'Light / روشن' })}</div>`;
    } else {
      const key = collection();
      content = `<div class="editor-heading"><h2>${tabs[tab]} (${data[key].length})</h2><button type="button" data-action="add"${data[key].length >= limits[key] ? ' disabled' : ''}>+ Add / افزودن مورد جدید</button></div>`;
      if (tab === 'education' || tab === 'awards') { const primary = tab === 'education' ? 'education' : 'award'; content += pair(primary, 'Primary entry / مورد اصلی', data[primary]); }
      content += data[key].map((item, i) => {
        const path = `${key}.${i}`; let fields;
        if (tab === 'projects') fields = pair(`${path}.name`, labels.name, item.name) + pair(`${path}.description`, labels.description, item.description) + `<div class="editor-pair">${field(`${path}.stack`, labels.stack, item.stack, { max: 300, dir: 'ltr' })}${field(`${path}.url`, labels.url, item.url, { type: 'url', max: 500, dir: 'ltr' })}</div>`;
        else if (tab === 'skills') fields = field(`${path}.name`, 'Skill name / نام مهارت', item.name, { max: 80 }) + select(`${path}.level`, 'Proficiency / سطح تسلط', item.level, Object.fromEntries(Object.entries(levels).map(([en, fa]) => [en, `${en} / ${fa}`])));
        else if (tab === 'experience') fields = ['company', 'role', 'date', 'description'].map(k => pair(`${path}.${k}`, labels[k], item[k])).join('');
        else fields = pair(path, tabs[tab], item);
        return `<article class="editor-item${tab === 'skills' ? ' skill-editor' : ''}" id="entry-${i}">${fields}<button type="button" data-action="remove" data-index="${i}">Remove / حذف مورد</button></article>`;
      }).join('');
    }
    editor.innerHTML = `<fieldset class="admin-fields"${busy ? ' disabled' : ''}><div role="tablist" aria-label="Résumé sections" class="admin-tabs">${Object.entries(tabs).map(([key, label]) => `<button type="button" role="tab" id="tab-${key}" aria-controls="panel" aria-selected="${tab === key}" tabindex="${tab === key ? 0 : -1}" data-tab="${key}">${label}</button>`).join('')}</div><section id="panel" role="tabpanel" aria-labelledby="tab-${tab}" class="admin-section">${content}</section></fieldset>`;
    if (focus) { const element = document.getElementById(focus); (element?.matches('input,textarea,select') ? element : element?.querySelector('input,textarea'))?.focus(); }
  }
  editor.addEventListener('input', event => {
    const path = event.target.dataset.path; if (!path) return;
    const keys = path.split('.'); let parent = data;
    for (const key of keys.slice(0, -1)) parent = parent[key];
    parent[keys.at(-1)] = event.target.value; changed();
  });
  editor.addEventListener('keydown', event => {
    if (!event.target.matches('[role=tab]')) return;
    const keys = Object.keys(tabs); let index = keys.indexOf(tab);
    if (event.key === 'ArrowRight') index = (index + 1) % keys.length;
    else if (event.key === 'ArrowLeft') index = (index + keys.length - 1) % keys.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = keys.length - 1;
    else return;
    event.preventDefault(); tab = keys[index]; render(); document.getElementById(`tab-${tab}`).focus();
  });
  editor.addEventListener('click', event => {
    if (busy) return;
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.tab) { tab = button.dataset.tab; render(); document.getElementById(`tab-${tab}`).focus(); return; }
    const key = collection();
    if (button.dataset.action === 'add') {
      if (data[key].length >= limits[key]) return;
      const entry = tab === 'projects' ? { name: blank(), description: blank(), stack: '', url: '' } : tab === 'skills' ? { name: '', level: 'Beginner' } : tab === 'experience' ? { company: blank(), role: blank(), date: blank(), description: blank() } : blank();
      data[key].unshift(entry); changed(); render('entry-0');
    } else if (button.dataset.action === 'remove') {
      const snapshot = structuredClone(data); data[key].splice(Number(button.dataset.index), 1); changed(); removed = snapshot; render(); updateStatus();
    } else if (button.dataset.action === 'remove-photo') { data.photoUrl = ''; changed(); render(); }
  });
  editor.addEventListener('change', async event => {
    if (event.target.id !== 'photo' || busy) return;
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { status.textContent = 'تصویر باید کمتر از ۵ مگابایت باشد.'; event.target.value = ''; return; }
    busy = true; editor.querySelector('fieldset').disabled = true; updateStatus('Uploading / در حال بارگذاری تصویر…');
    try {
      const form = new FormData(); form.set('photo', file);
      data.photoUrl = (await api('/api/photos', { method: 'POST', body: form })).url; changed();
    } catch (error) { status.textContent = error.message; }
    finally { busy = false; render(); save.disabled = !dirty; undo.disabled = false; }
  });
  undo.addEventListener('click', () => { if (removed && !busy) { data = removed; changed(); render(); } });
  save.addEventListener('click', async () => {
    if (busy || !dirty) return;
    busy = true; editor.querySelector('fieldset').disabled = true; updateStatus('Saving / در حال ذخیره‌سازی…');
    try {
      const result = await api('/api/resume', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resume: data, revision }) });
      revision = result.revision; dirty = false; removed = null; status.textContent = 'Saved successfully / تغییرات با موفقیت ذخیره شد';
    } catch (error) {
      const match = /Invalid field \/ مقدار نامعتبر: (.+)$/.exec(error.message);
      if (match) {
        const path = match[1], section = path.split('.')[0];
        tab = section === 'educationEntries' || section === 'education' ? 'education' : section === 'award' ? 'awards' : tabs[section] ? section : 'profile';
        busy = false; render(`field-${path}`);
      }
      status.textContent = error.message;
    } finally { busy = false; editor.querySelector('fieldset').disabled = false; save.disabled = !dirty; undo.hidden = !removed; undo.disabled = false; }
  });
  window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
  try { const value = await api('/api/resume'); data = value.resume; revision = value.revision; render(); }
  catch (error) { editor.textContent = error.message; }
}
