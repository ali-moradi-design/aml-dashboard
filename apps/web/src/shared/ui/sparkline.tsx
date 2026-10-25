const smoothPath = (points: Array<[number, number]>) => {
  if (points.length < 2) return "";
  let d = `M ${points[0]![0]} ${points[0]![1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return d;
};

/** Tiny trend line for KPI cards. Always drawn left to right (time axis stays LTR in RTL). */
export const Sparkline = ({
  values,
  width = 88,
  height = 32,
}: {
  values: number[];
  width?: number;
  height?: number;
}) => {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const points = values.map(
    (v, i) =>
      [
        (i * width) / Math.max(values.length - 1, 1),
        height - 3 - ((v - min) / span) * (height - 6),
      ] as [number, number],
  );
  const line = smoothPath(points);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden
      direction="ltr"
    >
      <path d={`${line} L ${width} ${height} L 0 ${height} Z`} fill="var(--accent-soft)" />
      <path d={line} fill="none" stroke="var(--chart-2)" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
};
