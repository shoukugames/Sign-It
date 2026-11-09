// Sign It — small DOM helpers, modals, toasts, stars.
import { sfx } from './audio.js';
import { t } from './i18n.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

export function btn(label, onClick, cls = '', attrs = {}) {
  return h('button', {
    class: 'btn ' + cls, ...attrs,
    onmouseenter: () => sfx.hover(),
    onclick: (e) => { if (attrs.silent) return onClick(e); cls.includes('ghost') && label === t('back') ? sfx.back() : sfx.click(); onClick(e); }
  }, label);
}

export function starsEl(n, total = 3) {
  return h('span', { class: 'stars' }, ...Array.from({ length: total }, (_, i) => h('span', { class: 'star' + (i < n ? ' on' : '') }, '★')));
}

export function toast(msg, ms = 2400) {
  const el = h('div', { class: 'toast' }, msg);
  document.getElementById('toast-root').append(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, ms);
}

export function modal(build) {
  const root = document.getElementById('modal-root');
  const back = h('div', { class: 'modal-back' });
  const box = h('div', { class: 'modal', role: 'dialog' });
  back.append(box);
  root.append(back);
  const close = () => back.remove();
  build(box, close);
  return close;
}

export function confirmDialog(text, okLabel = 'OK') {
  return new Promise((res) => modal((box, close) => {
    box.append(h('p', {}, text), h('div', { class: 'row' },
      btn(t('back'), () => { close(); res(false); }, 'ghost'),
      btn(okLabel, () => { close(); res(true); }, 'red')));
  }));
}

/** Parent permission gate. Resolves true only if an adult answers correctly AND consents. */
export function parentGate({ title, text, consentText, allowLabel } = {}) {
  return new Promise((resolve) => modal((box, close) => {
    const a = 6 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 7);
    const input = h('input', { type: 'number', inputmode: 'numeric', 'aria-label': 'answer' });
    const err = h('div', { class: 'err' });
    const chk = consentText ? h('input', { type: 'checkbox' }) : null;
    const done = (v) => { close(); resolve(v); };
    const allow = btn(allowLabel || t('continue'), () => {
      if (Number(input.value) !== a * b) { err.textContent = t('gateWrong'); sfx.wrong(); input.value = ''; input.focus(); return; }
      if (chk && !chk.checked) { err.textContent = '☑ ' + consentText; sfx.wrong(); return; }
      done(true);
    }, 'green');
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') allow.click(); });
    box.append(
      h('h3', {}, '👪 ' + (title || t('gateTitle'))),
      h('p', {}, text || ''),
      h('p', { style: { fontWeight: 800, color: '#fff', fontSize: '20px' } }, t('gateQuestion', { a, b })),
      input,
      chk ? h('label', { class: 'check' }, chk, h('span', {}, consentText)) : null,
      err,
      h('div', { class: 'row' }, btn(t('gateCancel'), () => done(false), 'ghost'), allow)
    );
    setTimeout(() => input.focus(), 50);
  }));
}

export function fmtTime(ms) {
  const m = Math.round((ms || 0) / 60000);
  if (m < 1) return ms > 0 ? '<1m' : '0m';
  const hh = Math.floor(m / 60), mm = m % 60;
  return hh ? `${hh}h ${mm}m` : `${mm}m`;
}

/** Draw a progress ring (0..1) on a canvas element. */
export function ring(canvas, p, color = '#6ef2ff', label = '') {
  const dpr = window.devicePixelRatio || 1;
  const S = canvas.clientWidth || 74;
  if (canvas.width !== Math.round(S * dpr)) { canvas.width = Math.round(S * dpr); canvas.height = Math.round(S * dpr); }
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, S, S);
  c.lineWidth = 7; c.lineCap = 'round';
  c.strokeStyle = 'rgba(0,0,0,0.45)';
  c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = color; c.shadowColor = color; c.shadowBlur = 10;
  c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, p))); c.stroke();
  c.shadowBlur = 0;
  if (label) { c.fillStyle = '#fff'; c.font = '800 20px ' + getComputedStyle(document.body).fontFamily; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, S / 2, S / 2 + 1); }
}
