// Device preferences are optional: the site still works with storage disabled.
const root = document.documentElement;
const palette = document.querySelector('#palette');
const mode = document.querySelector('#mode');
function applyAppearance() {
  if (palette) palette.value = root.dataset.theme;
  mode?.setAttribute('aria-pressed', String(root.classList.contains('dark')));
  if (mode) mode.textContent = root.classList.contains('dark') ? '☀' : '☾';
}
try {
  const theme = localStorage.getItem('palette');
  const storedMode = localStorage.getItem('theme');
  if (['amber', 'ocean', 'emerald'].includes(theme)) root.dataset.theme = theme;
  if (['dark', 'light'].includes(storedMode)) root.classList.toggle('dark', storedMode === 'dark');
  const lang = localStorage.getItem('language');
  if (location.pathname === '/') {
    const url = new URL(location.href);
    if (!url.searchParams.has('lang') && lang === 'fa') { url.searchParams.set('lang', 'fa'); location.replace(url); }
    else localStorage.setItem('language', root.lang);
  }
} catch { /* Browser storage may be disabled. */ }
applyAppearance();
palette?.addEventListener('change', () => {
  root.dataset.theme = palette.value;
  try { localStorage.setItem('palette', palette.value); } catch { /* optional */ }
});
mode?.addEventListener('click', () => {
  root.classList.toggle('dark'); applyAppearance();
  try { localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light'); } catch { /* optional */ }
});
document.querySelector('#language')?.addEventListener('click', event => {
  const link = event.currentTarget;
  try { localStorage.setItem('language', link.lang); } catch { /* optional */ }
  link.hash = location.hash;
});
const menu = document.querySelector('#menu');
menu?.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  document.querySelector('#navigation').classList.toggle('expanded', expanded);
});
document.querySelector('#navigation')?.addEventListener('click', event => {
  if (event.target.closest('a')) { menu.setAttribute('aria-expanded', 'false'); document.querySelector('#navigation').classList.remove('expanded'); }
});
