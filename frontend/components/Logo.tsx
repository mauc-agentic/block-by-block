// Marca de Block by Block: pilas de bloques en los colores EAG / ETH / HSK (design_system §2).
const COLUMNS = [
  { blocks: 3, color: "var(--eag-primary)" },
  { blocks: 5, color: "var(--eth-primary)" },
  { blocks: 4, color: "var(--hsk-primary)" },
];

export function Logo({ size = 32 }: { size?: number }) {
  const cell = 6;
  const gap = 2;
  const width = COLUMNS.length * cell + (COLUMNS.length - 1) * gap;
  const height = 5 * cell + 4 * gap;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
      {COLUMNS.map((column, i) =>
        Array.from({ length: column.blocks }, (_, j) => (
          <rect
            key={`${i}-${j}`}
            x={i * (cell + gap)}
            y={height - (j + 1) * cell - j * gap}
            width={cell}
            height={cell}
            rx={1}
            fill={column.color}
          />
        ))
      )}
    </svg>
  );
}
