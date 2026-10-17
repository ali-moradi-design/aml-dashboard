/** Semi-circle gauge for a 0-100 score; the arc color follows the risk band. */
export const Gauge = ({ value, label }: { value: number; label: string }) => {
  const v = Math.max(0, Math.min(100, value));
  const r = 70;
  const c = Math.PI * r;
  const color = v >= 70 ? "var(--risk-high)" : v >= 40 ? "var(--risk-medium)" : "var(--risk-low)";
  return (
    <figure className="relative mx-auto w-[180px]" aria-label={label}>
      <svg viewBox="0 0 180 100" className="w-full" aria-hidden>
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="var(--muted)" strokeWidth={14} strokeLinecap="round" />
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          style={{ transition: "stroke-dasharray 600ms ease-out" }}
        />
      </svg>
      <figcaption className="absolute inset-x-0 bottom-0 text-center">{label}</figcaption>
    </figure>
  );
};
