// PARECER+ brand mark — the "P" as a circuit with a medical cross and the
// neural flow of pareceres exiting to the right. Monoline, uses currentColor
// so it inherits the surrounding text color. Scales cleanly from 16px up.
export function Logo({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
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
      <path
        d="M74 224 L74 64 Q74 44 98 44 L124 44 Q176 44 176 98 Q176 150 124 150 L74 150"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g
        transform="translate(125 97)"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      >
        <line x1="0" y1="-18" x2="0" y2="18" />
        <line x1="-18" y1="0" x2="18" y2="0" />
      </g>
      <g stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.9">
        <path d="M176 100 L210 82 M176 124 L210 140" />
      </g>
      <g fill="currentColor">
        <circle cx="214" cy="82" r="5" />
        <circle cx="214" cy="140" r="5" />
      </g>
    </svg>
  );
}
