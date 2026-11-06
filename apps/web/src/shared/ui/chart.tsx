"use client";

import { useEffect, useState } from "react";
import type Highcharts from "highcharts";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

// Highcharts is used under its non-commercial license for this portfolio demo (see README).

const TOKENS = [
  "card",
  "border",
  "text",
  "text-secondary",
  "heading",
  "accent",
  "accent-soft",
  "muted",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "risk-high",
  "risk-medium",
  "risk-low",
] as const;
export type ChartColors = Record<(typeof TOKENS)[number], string>;

const readColors = (): ChartColors => {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    TOKENS.map((t) => [t, style.getPropertyValue(`--${t}`).trim()]),
  ) as ChartColors;
};

/** Resolved token colors; re-read after every theme switch so charts follow light/dark. */
export const useChartColors = (): ChartColors | null => {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartColors | null>(null);
  useEffect(() => {
    // After next-themes has switched the attribute (its effect runs later in the same commit).
    // A timer rather than an animation frame, so background tabs get colors too.
    const id = setTimeout(() => setColors(readColors()), 0);
    return () => clearTimeout(id);
  }, [resolvedTheme]);
  return colors;
};

type ChartProps = {
  /** Builds options from the current theme colors. */
  options: (colors: ChartColors) => Highcharts.Options;
  height: number;
  className?: string;
};

// Highcharts needs a browser (its modules crash during server rendering), so it loads on the
// client only. Charts draw after their data arrives anyway, so nothing is lost on the server.
const ChartCanvas = dynamic(() => import("./chart-canvas").then((m) => m.ChartCanvas), {
  ssr: false,
});

export const Chart = ({ options, height, className }: ChartProps) => {
  const colors = useChartColors();
  const built = colors ? options(colors) : null;
  if (!colors || !built) return <div style={{ height }} className={className} aria-hidden />;
  return (
    <div className={className} dir="ltr" style={{ minHeight: height }}>
      <ChartCanvas colors={colors} options={built} height={height} />
    </div>
  );
};
