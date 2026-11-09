// Downloads HUMAN voice recordings for every letter and word in the game from
// Wikimedia Commons (including Lingua Libre recordings), trims silence,
// normalises loudness with ffmpeg and records full attribution.
//
//   node tools/fetch-voices.mjs          (needs internet + ffmpeg; developer tool only —
//                                         the game itself never goes online)
//
// Output: assets/voice/<lang>/L_<letter>.ogg, assets/voice/<lang>/W_<word>.ogg,
//         assets/voice/attribution.json, assets/voice/ATTRIBUTION.md
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.document = { addEventListener() {}, documentElement: {} };

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(root, 'src/renderer/js', p);
const { lessons, level } = await import(R('curriculum.js'));
const { ASL, JSL } = await import(R('signs.js'));
const { LEXICON } = await import(R('avatar.js'));
const { voiceWords } = await import(R('voicekeys.js'));

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'SignItVoiceFetcher/0.1.4 (https://shoukugames.org/; educational game)';
const VOICE = path.join(root, 'assets', 'voice');
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'signit-voice-'));
const PREFERRED_JA = ['Fukujinzuke', 'Higa4'];
// Many Japanese recordings are titled in kanji; same word, same pronunciation.
const JA_ALT = { かき: ['柿'], すき: ['好き'], ともだち: ['友達'], たき: ['滝'], かに: ['蟹'], まめ: ['豆'], だいじょうぶ: ['大丈夫'], むし: ['虫'],
  ごめんなさい: ['御免なさい', 'ご免なさい'], やさい: ['野菜'], よろしく: ['宜しく'], れきし: ['歴史'], かれい: ['鰈'], なに: ['何'], さしみ: ['刺身'],
  にく: ['肉'], かめ: ['亀'], たけ: ['竹'], たかい: ['高い'] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries({ format: 'json', ...params })) u.searchParams.set(k, v);
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA } });
      if (r.ok) return r.json();
    } catch (_) { /* retry */ }
    await sleep(1500 * (i + 1));
  }
  throw new Error('API failed: ' + u);
}

// ---------------------------------------------------------------------------
// 1) collect everything the game speaks
function needed(lang) {
  const letters = Object.keys(lang === 'ja' ? JSL : ASL);
  const words = new Set();
  const addText = (t) => voiceWords(t, lang).forEach((w) => words.add(w));
  for (const ls of lessons(lang)) {
    for (const w of ls.words) addText(w.tok.startsWith('#') ? w.tok.slice(1) : (LEXICON[w.tok]?.mouth || w.tok));
    for (const tk of ls.sentence.toks) addText(tk.startsWith('#') ? tk.slice(1) : (LEXICON[tk]?.mouth || tk));
  }
  for (let n = 6; n <= 20; n++) for (const it of level(lang, n).items) addText(it.text);
  return { letters, words: [...words] };
}

// 2) find candidate files
async function existingTitles(titles) {
  const found = new Map();
  for (let i = 0; i < titles.length; i += 45) {
    const d = await api({ action: 'query', titles: titles.slice(i, i + 45).join('|'), redirects: '1' });
    for (const p of Object.values(d.query.pages)) if (!('missing' in p)) found.set(p.title, p.title);
    for (const n of d.query.normalized || []) if (found.has(n.to)) found.set(n.from, n.to);
    await sleep(200);
  }
  return found;
}
async function searchLL(qid, code, word) {
  const d = await api({ action: 'query', list: 'search', srnamespace: '6', srlimit: '30', srsearch: `intitle:"LL-${qid} (${code})" intitle:"-${word}.wav"` });
  await sleep(250);
  const exact = d.query.search.map((x) => x.title).filter((t) => t.normalize('NFC').endsWith(`-${word}.wav`));
  const pref = (t) => { const i = PREFERRED_JA.findIndex((s) => t.includes(`-${s}-`)); return i < 0 ? 99 : i; };
  return exact.sort((a, b) => pref(a) - pref(b))[0] || null;
}

async function resolveEnglish(items) {
  // Try the classic US-English pronunciation files first: File:En-us-<word>.ogg
  const variants = (w, isLetter) => isLetter
    ? [`File:En-us-${w}.ogg`, `File:En-us-${w.toLowerCase()}.ogg`, `File:En-us-letter-${w.toLowerCase()}.ogg`]
    : [`File:En-us-${w}.ogg`, `File:En-us-${w.replace(/ /g, '_')}.ogg`, `File:En-us-${w[0].toUpperCase()}${w.slice(1)}.ogg`];
  const all = items.flatMap((it) => variants(it.text, it.isLetter));
  const found = await existingTitles(all);
  const out = new Map();
  for (const it of items) {
    const hit = variants(it.text, it.isLetter).find((v) => found.has(v));
    if (hit) out.set(it.key, found.get(hit));
    else { const ll = await searchLL('Q1860', 'eng', it.text); if (ll) out.set(it.key, ll); }
  }
  return out;
}
async function resolveJapanese(items) {
  const out = new Map();
  for (const it of items) {
    let t = await searchLL('Q5287', 'jpn', it.text);
    for (const alt of JA_ALT[it.text] || []) { if (t) break; t = await searchLL('Q5287', 'jpn', alt); }
    if (t) out.set(it.key, t);
  }
  return out;
}

// 3) metadata, download, convert
async function meta(titles) {
  const m = new Map();
  for (let i = 0; i < titles.length; i += 40) {
    const d = await api({ action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', titles: titles.slice(i, i + 40).join('|') });
    for (const p of Object.values(d.query.pages)) {
      const ii = p.imageinfo?.[0]; if (!ii) continue;
      const em = ii.extmetadata || {};
      const strip = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      m.set(p.title, { url: ii.url, page: ii.descriptionurl, author: strip(em.Artist?.value) || 'Unknown', license: strip(em.LicenseShortName?.value) || 'see source', licenseUrl: em.LicenseUrl?.value || '' });
    }
    await sleep(200);
  }
  return m;
}
async function download(url, file) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) { fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); return; }
    await sleep(2000 * (i + 1));
  }
  throw new Error('download failed ' + url);
}
function convert(src, dst) {
  // trim leading/trailing silence, mono 44.1 kHz, EBU R128 loudness so all speakers match
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src,
    '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.01',
    '-ac', '1', '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '5', dst]);
}

// ---------------------------------------------------------------------------
const attribution = { generated: new Date().toISOString().slice(0, 10), source: 'Wikimedia Commons (incl. Lingua Libre)', modifications: 'Trimmed silence, converted to mono Ogg Vorbis, loudness-normalised.', files: [] };
const missingReport = {};
for (const lang of ['en', 'ja']) {
  const { letters, words } = needed(lang);
  const items = [
    ...letters.map((l) => ({ key: `L_${l}`, text: l, isLetter: true })),
    ...words.map((w) => ({ key: `W_${w}`, text: w }))
  ];
  console.log(`[${lang}] resolving ${items.length} items (${letters.length} letters, ${words.length} words)…`);
  const resolved = lang === 'en' ? await resolveEnglish(items) : await resolveJapanese(items);
  const md = await meta([...new Set(resolved.values())]);
  fs.mkdirSync(path.join(VOICE, lang), { recursive: true });
  missingReport[lang] = [];
  for (const it of items) {
    const title = resolved.get(it.key);
    const info = title && md.get(title);
    if (!info) { missingReport[lang].push(it.text); continue; }
    const tmp = path.join(TMP, 'in' + path.extname(new URL(info.url).pathname));
    const dst = path.join(VOICE, lang, `${it.key}.ogg`);
    try {
      await download(info.url, tmp);
      convert(tmp, dst);
      attribution.files.push({ lang, key: it.key, text: it.text, file: title.replace(/^File:/, ''), author: info.author, license: info.license, licenseUrl: info.licenseUrl, source: info.page });
      process.stdout.write('.');
    } catch (e) { missingReport[lang].push(it.text); console.error('\n  ✖', it.text, e.message); }
    await sleep(300);
  }
  console.log(`\n[${lang}] ${items.length - missingReport[lang].length}/${items.length} recordings. Missing: ${missingReport[lang].join(', ') || 'none'}`);
}
fs.writeFileSync(path.join(VOICE, 'attribution.json'), JSON.stringify(attribution, null, 1) + '\n');
const rows = attribution.files.map((f) => `| ${f.lang} | ${f.text} | [${f.file}](${f.source}) | ${f.author.replace(/\|/g, '/')} | ${f.license} |`);
fs.writeFileSync(path.join(VOICE, 'ATTRIBUTION.md'), `# Voice recording credits

All speech in Sign It is spoken by real people. These recordings were made by
volunteers and published on **Wikimedia Commons** (many through the
**Lingua Libre** project). Thank you!

Changes made: ${attribution.modifications}
Each recording keeps its original license (shown below). Recordings under
CC BY-SA remain under CC BY-SA.

| Lang | Text | Source file | Recorded by | License |
|---|---|---|---|---|
${rows.join('\n')}
`);
fs.rmSync(TMP, { recursive: true, force: true });
console.log('Missing (fallback to caption):', JSON.stringify(missingReport));
