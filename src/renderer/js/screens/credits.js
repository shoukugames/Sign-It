// Sign It — credits
import { h, btn } from '../ui.js';
import { t } from '../i18n.js';
import { go } from '../nav.js';
import { store } from '../storage.js';
import { LOGO_SVG } from '../logo.js';
import { VERSION } from './title.js';

const RELEASE_DATE = '2026-11-09';
const open = (url) => (e) => { e.preventDefault(); if (window.signItHost) window.signItHost.openExternal(url); else window.open(url, '_blank', 'noopener'); };

export function creditsScreen() {
  const ja = store.settings.lang === 'ja';
  const date = new Date(RELEASE_DATE + 'T12:00:00').toLocaleDateString(ja ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const el = h('div', { class: 'screen' },
    h('div', { class: 'topbar' }, btn('←', () => go('title'), 'ghost icon-btn'), h('h2', {}, '🏅 ' + t('creditsTitle'))),
    h('div', { class: 'credits' },
      h('div', { class: 'logo' }, h('div', { class: 'logo-mark', html: LOGO_SVG }), h('h1', { style: { fontSize: '56px' } }, t('appName'))),
      h('div', { class: 'all-ages' }, '✔ ', t('allAges')),
      h('div', { class: 'credit-card' }, h('h4', {}, t('creator')), h('div', { class: 'v' }, 'Shawn Rapaz')),
      h('div', { class: 'credit-card' }, h('h4', {}, t('builtWith')), h('div', { class: 'v' }, 'Claude Code')),
      h('div', { class: 'credit-card' }, h('h4', {}, t('website')), h('div', { class: 'v' }, h('a', { href: 'https://shoukugames.org/', onclick: open('https://shoukugames.org/') }, 'https://shoukugames.org/'))),
      h('div', { class: 'credit-card' }, h('h4', {}, t('email')), h('div', { class: 'v' }, h('a', { href: 'mailto:info@shoukugames.org', onclick: open('mailto:info@shoukugames.org') }, 'info@shoukugames.org'))),
      h('div', { class: 'credit-card' }, h('h4', {}, t('version') + ' · ' + t('date')), h('div', { class: 'v' }, `v${VERSION} · ${date}`)),
      h('div', { class: 'credit-card' }, h('h4', {}, t('license')),
        h('div', { class: 'v' }, h('a', { href: 'https://www.gnu.org/licenses/gpl-3.0.html', onclick: open('https://www.gnu.org/licenses/gpl-3.0.html') }, 'GNU General Public License v3.0')),
        h('p', {}, 'Copyright © 2026 Shawn Rapaz'), h('p', {}, t('licenseText'))),
      h('div', { class: 'credit-card' }, h('h4', {}, 'Third-party'), h('p', {}, t('thirdParty')), h('p', {}, 'Font: M PLUS Rounded 1c (SIL Open Font License 1.1).'))));
  return { el };
}
