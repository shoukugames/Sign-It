// Sign It — maps spoken text to human-recording keys (shared by the game and tools).
//   letters → L_<letter>   words → W_<word>   phrases → several W_ keys played in order
export function voiceWords(text, lang) {
  const s = String(text).normalize('NFC').trim();
  if (lang === 'ja') return s.split(/[\s　、。！？!?,.]+/).filter(Boolean);
  return s.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);
}
export function letterKey(letter) { return `L_${letter}`; }
export function wordKeys(text, lang) { return voiceWords(text, lang).map((w) => `W_${w}`); }

// Narration (whole sentences) → N_<hash>. FNV-1a, identical in Node and the browser.
export function narrationKey(text) {
  const s = String(text).normalize('NFC').trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return 'N_' + h.toString(16).padStart(8, '0');
}
