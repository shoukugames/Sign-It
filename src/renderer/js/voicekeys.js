// Sign It — maps spoken text to human-recording keys (shared by the game and tools).
//   letters → L_<letter>   words → W_<word>   phrases → several W_ keys played in order
export function voiceWords(text, lang) {
  const s = String(text).normalize('NFC').trim();
  if (lang === 'ja') return s.split(/[\s　、。！？!?,.]+/).filter(Boolean);
  return s.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);
}
export function letterKey(letter) { return `L_${letter}`; }
export function wordKeys(text, lang) { return voiceWords(text, lang).map((w) => `W_${w}`); }
