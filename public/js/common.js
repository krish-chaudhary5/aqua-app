// Shared helpers. All dynamic text goes through textContent, never innerHTML, so user data cannot inject markup.
const LOGO = '<svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#5B9BD5" fill-opacity=".25"/><path d="M20 8c5 6 8 10 8 14a8 8 0 1 1-16 0c0-4 3-8 8-14z" fill="#5B9BD5"/><path d="M14 22l4 4 8-8" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return e;
}

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin'
  });
  if (res.status === 401 && !opts.quiet && !path.startsWith('/auth/login')) { location.href = '/'; throw new Error('signed out'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status', text: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), 3200);
}

const fmtDate = s => s ? new Date(s.replace(' ', 'T') + (s.length <= 10 ? 'T00:00:00' : '') ).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const tone = n => n >= 75 ? 'good' : n >= 55 ? 'warn' : 'bad';
const bar = (pct, cls) => h('div', { class: 'bar', role: 'img', 'aria-label': pct + ' percent' }, h('i', { class: cls || tone(pct), style: null, 'data-w': pct }));
// width is applied via CSSOM (allowed under CSP) rather than an inline style attribute
function applyBars(root) { root.querySelectorAll('.bar i[data-w]').forEach(i => { i.style.width = Math.max(0, Math.min(100, +i.dataset.w)) + '%'; }); }

function shell({ role, nav, user, onNav }) {
  const side = h('aside', { class: 'side' },
    h('div', { class: 'brand' }, Object.assign(h('span'), { innerHTML: LOGO }), h('div', null, 'AQUA', h('small', null, role))),
    h('nav', { class: 'nav', 'aria-label': 'Main' }, nav.map(n => h('button', { 'data-id': n.id, onclick: () => onNav(n.id) }, n.label, n.badge !== undefined ? h('span', { class: 'badge', 'data-badge': n.id }, n.badge) : null))),
    h('div', { class: 'who' }, h('b', null, user.name), user.department,
      h('div', null, h('button', { onclick: async () => { await api('/auth/logout', { method: 'POST' }); location.href = '/'; } }, 'Sign out'))));
  const main = h('main', { class: 'main', id: 'main', tabindex: '-1' });
  document.body.replaceChildren(h('a', { class: 'skip', href: '#main' }, 'Skip to content'), h('div', { class: 'shell' }, side, main));
  return { main, setActive: id => side.querySelectorAll('.nav button').forEach(b => {
    if (b.dataset.id === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }) };
}
