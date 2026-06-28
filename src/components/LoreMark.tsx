// The Lore mark: three stacked isometric layers (content blocks / revisions),
// line-art so it stays crisp small. Inherits color via currentColor.
export function LoreMark({ size = 18 }: { size?: number }) {
  const w = Math.round((size * 88) / 120);
  return (
    <svg
      width={w}
      height={size}
      viewBox="0 0 88 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={7}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="44,8 84,28 44,48 4,28" />
      <polygon points="44,40 84,60 44,80 4,60" strokeOpacity={0.7} />
      <polygon points="44,72 84,92 44,112 4,92" strokeOpacity={0.45} />
    </svg>
  );
}
