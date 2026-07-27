// Full PARECER+ brand mark — metallic circuit "P" with a crystalline medical
// cross, a neural network, and the data flow of pareceres. Detailed version
// for large surfaces (login / splash). Use <Logo> for small sizes and icons.
export function LogoMark({
  size = 96,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const P =
    "M74 224 L74 64 Q74 44 98 44 L124 44 Q176 44 176 98 Q176 150 124 150 L74 150";
  return (
    <svg
      viewBox="0 0 240 260"
      width={size}
      height={(size * 260) / 240}
      className={className}
      role="img"
      aria-label="PARECER+"
      fill="none"
    >
      <defs>
        <linearGradient id="pmMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dff6f8" />
          <stop offset="0.35" stopColor="#5fbfd6" />
          <stop offset="0.7" stopColor="#1b3d63" />
          <stop offset="1" stopColor="#0c1c30" />
        </linearGradient>
        <linearGradient id="pmEdge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eafeff" />
          <stop offset="1" stopColor="#3ce6e8" />
        </linearGradient>
        <radialGradient id="pmCross" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#8ff6f8" />
          <stop offset="1" stopColor="#20c7e8" />
        </radialGradient>
        <linearGradient id="pmFacetA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#7ef0f5" />
        </linearGradient>
        <linearGradient id="pmFacetB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9ecff" />
          <stop offset="1" stopColor="#8b96ee" />
        </linearGradient>
        <filter id="pmGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="pmSoft" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <path d={P} stroke="#3ce6e8" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round" opacity="0.30" filter="url(#pmSoft)" />
      <path d={P} stroke="url(#pmMetal)" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" />
      <path d={P} stroke="#eafeff" strokeWidth="43.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.10" />
      <path d={P} stroke="url(#pmEdge)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />

      <g stroke="#7ef0f2" strokeWidth="1.5" opacity="0.9" filter="url(#pmGlow)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M74 210 L74 192 L62 180" />
        <path d="M74 176 L92 176" />
        <path d="M74 120 L96 120 L104 112" />
        <path d="M74 100 L60 100" />
        <path d="M74 84 L64 84 L58 78" />
        <path d="M96 60 L96 82 L108 94" />
        <path d="M112 52 L112 44" />
        <path d="M132 50 L132 66 L146 66" />
        <path d="M150 64 L150 86" />
        <path d="M158 96 L172 96" />
        <path d="M138 132 L156 132" />
        <path d="M120 132 L120 150" />
      </g>
      <g fill="#bafcff" filter="url(#pmGlow)">
        <circle cx="62" cy="180" r="2.3" /><circle cx="92" cy="176" r="2.3" />
        <circle cx="104" cy="112" r="2.3" /><circle cx="60" cy="100" r="2.3" />
        <circle cx="58" cy="78" r="2.1" /><circle cx="108" cy="94" r="2.3" />
        <circle cx="112" cy="44" r="2.1" /><circle cx="146" cy="66" r="2.3" />
        <circle cx="150" cy="86" r="2.3" /><circle cx="172" cy="96" r="2.3" />
        <circle cx="156" cy="132" r="2.3" /><circle cx="120" cy="150" r="2.3" />
      </g>

      <g transform="translate(126 96)">
        <circle r="34" fill="url(#pmCross)" opacity="0.35" filter="url(#pmSoft)" />
        <rect x="-9" y="-30" width="18" height="60" rx="5" fill="url(#pmFacetA)" />
        <rect x="-30" y="-9" width="60" height="18" rx="5" fill="url(#pmFacetA)" />
        <path d="M0 -30 L9 -21 L0 -12 L-9 -21 Z" fill="url(#pmFacetB)" opacity="0.85" />
        <path d="M0 30 L9 21 L0 12 L-9 21 Z" fill="url(#pmFacetB)" opacity="0.85" />
        <path d="M-30 0 L-21 9 L-12 0 L-21 -9 Z" fill="url(#pmFacetB)" opacity="0.85" />
        <path d="M30 0 L21 9 L12 0 L21 -9 Z" fill="url(#pmFacetB)" opacity="0.85" />
        <g transform="rotate(45)">
          <rect x="-11" y="-11" width="22" height="22" rx="3" fill="url(#pmFacetB)" />
          <rect x="-5.5" y="-5.5" width="11" height="11" rx="2" fill="#ffffff" opacity="0.9" />
        </g>
        <rect x="-9" y="-30" width="18" height="60" rx="5" fill="none" stroke="#eafeff" strokeWidth="1" opacity="0.6" />
        <rect x="-30" y="-9" width="60" height="18" rx="5" fill="none" stroke="#eafeff" strokeWidth="1" opacity="0.6" />
      </g>

      <g stroke="#3ce6e8" strokeWidth="1.3" opacity="0.7" filter="url(#pmGlow)">
        <path d="M176 96 L196 60 L214 52 L230 74" />
        <path d="M196 60 L206 86 L224 104 L240 92" />
        <path d="M206 86 L198 116 L220 132 L236 150" />
        <path d="M220 132 L210 158" />
        <path d="M190 100 L206 86 M190 100 L198 116 M176 110 L190 100" />
        <path d="M214 52 L206 86 M224 104 L220 132" />
      </g>
      <g fill="#eafeff" filter="url(#pmGlow)">
        <circle cx="196" cy="60" r="3" /><circle cx="214" cy="52" r="2.6" /><circle cx="230" cy="74" r="2.6" />
        <circle cx="206" cy="86" r="3" /><circle cx="224" cy="104" r="2.6" /><circle cx="240" cy="92" r="2.4" />
        <circle cx="198" cy="116" r="2.6" /><circle cx="220" cy="132" r="2.6" /><circle cx="236" cy="150" r="2.4" />
        <circle cx="210" cy="158" r="2.4" /><circle cx="190" cy="100" r="2.6" />
      </g>

      <g stroke="#3ce6e8" strokeWidth="1.3" opacity="0.55" filter="url(#pmGlow)">
        <path d="M110 150 L120 170 L132 182" />
        <path d="M96 158 L112 174" />
      </g>
      <g transform="translate(150 206)" stroke="#7ef0f2" strokeWidth="1.4" opacity="0.9" filter="url(#pmGlow)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-30 -14 h18 a4 4 0 0 1 4 4 v7 a4 4 0 0 1 -4 4 h-9 l-5 4 v-4 a4 4 0 0 1 -4 -4 v-7 a4 4 0 0 1 4 -4 z" />
        <path d="M-25 -6 l3 3 5 -6" />
        <path d="M4 4 h13 a3 3 0 0 1 3 3 v5 a3 3 0 0 1 -3 3 h-7 l-4 3 v-3 a3 3 0 0 1 -2 -3 v-5 a3 3 0 0 1 2 -3 z" />
        <path d="M8 9 l2 2 4 -5" />
        <path d="M-32 10 h10 v14 h-10 z" />
        <path d="M-29 14 h4 M-29 18 h4" />
        <path d="M24 -4 v-6 M29 -4 v-12 M34 -4 v-3" />
      </g>
    </svg>
  );
}
