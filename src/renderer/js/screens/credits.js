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
      voiceCard(ja),
      h('div', { class: 'credit-card' }, h('h4', {}, 'Third-party'), h('p', {}, t('thirdParty')), h('p', {}, 'Font: M PLUS Rounded 1c (SIL Open Font License 1.1).'))));
  return { el };
}

// Every voice recording is credited to the real person who recorded it.
function voiceCard(ja) {
  const list = h('div', { class: 'voice-credits' }, h('p', {}, '…'));
  const card = h('div', { class: 'credit-card' },
    h('h4', {}, ja ? '声の出演（人の録音）' : 'Voices (human recordings)'),
    h('p', {}, ja
      ? '音声はすべて実際の人の録音です。ウィキメディア・コモンズ（Lingua Libre）のボランティアの皆さんに感謝します。無音部分のカットと音量の調整をしています。'
      : 'Every spoken letter and word is a real human recording by volunteers on Wikimedia Commons (Lingua Libre). Thank you! Clips were trimmed and volume-matched.'),
    list);
  fetch('../../assets/voice/attribution.json').then((r) => r.json()).then((a) => {
    const by = new Map();
    for (const f of a.files) {
      const who = f.author.replace(/^Speaker:\s*/, '').replace(/\s*Recorder:.*$/, '') || 'Unknown';
      const k = who + ' — ' + f.license;
      by.set(k, (by.get(k) || 0) + 1);
    }
    list.innerHTML = '';
    for (const [k, n] of [...by].sort((x, y) => y[1] - x[1])) list.append(h('p', {}, `${k} (${n})`));
    list.append(h('p', { class: 'note' }, ja ? '全ファイルの一覧：assets/voice/ATTRIBUTION.md' : 'Full per-file list: assets/voice/ATTRIBUTION.md'));
  }).catch(() => { list.innerHTML = ''; });
  return card;
}
