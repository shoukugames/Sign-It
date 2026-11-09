// Sign It — logo mark (also rendered to the app icon by tools/make-icons.js)
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="lg-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7b6bff"/><stop offset="0.55" stop-color="#4a3fd8"/><stop offset="1" stop-color="#ff5fa8"/></linearGradient>
    <linearGradient id="lg-hand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9e4ff"/></linearGradient>
    <radialGradient id="lg-shine" cx="0.3" cy="0.2" r="0.8"><stop offset="0" stop-color="#ffffff" stop-opacity="0.45"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect x="12" y="12" width="232" height="232" rx="62" fill="url(#lg-bg)"/>
  <rect x="12" y="12" width="232" height="232" rx="62" fill="url(#lg-shine)"/>
  <g transform="translate(128 140) rotate(-12)" fill="url(#lg-hand)" stroke="#2a2170" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">
    <path d="M-46 4 C-58 -6 -72 -28 -62 -36 C-52 -44 -40 -26 -30 -14 L-30 -70 C-30 -84 -12 -84 -12 -70 L-12 -24 L-12 -92 C-12 -106 8 -106 8 -92 L8 -24 L8 -84 C8 -98 28 -98 28 -84 L28 -20 L28 -62 C28 -76 46 -76 46 -62 L46 20 C46 52 24 72 -2 72 C-22 72 -34 62 -46 44 Z"/>
  </g>
  <g fill="#ffd166"><path d="M196 52 l7 17 17 7 -17 7 -7 17 -7 -17 -17 -7 17 -7z"/><circle cx="58" cy="66" r="7" fill="#6ef2ff"/><circle cx="206" cy="190" r="6" fill="#5fe3a1"/></g>
</svg>`;
