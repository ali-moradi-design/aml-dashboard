"use client";

import { useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts";
// Modules register on the Highcharts instance, so they load here, after the core.
import "highcharts/modules/heatmap";
import "highcharts/modules/sankey";
import "highcharts/modules/funnel";
import HighchartsReact from "highcharts-react-official";
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

const baseOptions = (c: ChartColors): Highcharts.Options => ({
  chart: {
    backgroundColor: "transparent",
    style: { fontFamily: "inherit" },
    spacing: [8, 0, 0, 0],
  },
  title: { text: undefined },
  credits: { enabled: false },
  legend: { enabled: false },
  accessibility: { enabled: false },
  colors: [c["chart-1"], c["chart-2"], c["chart-3"], c["chart-4"], c["chart-5"]],
  // Time axes stay left-to-right in RTL languages (brief: "chart time axes stay LTR").
  xAxis: {
    reversed: false,
    lineColor: c.border,
    tickColor: c.border,
    labels: { style: { color: c["text-secondary"], fontSize: "12px" } },
  },
  yAxis: {
    gridLineColor: c.border,
    title: { text: undefined },
    labels: { style: { color: c["text-secondary"], fontSize: "12px" } },
  },
  tooltip: {
    backgroundColor: c.heading,
    borderWidth: 0,
    borderRadius: 8,
    shadow: false,
    style: { color: c.card, fontSize: "13px" },
  },
  plotOptions: { series: { animation: { duration: 400 } } },
});

type ChartProps = {
  /** Builds options from the current theme colors. */
  options: (colors: ChartColors) => Highcharts.Options;
  height: number;
  className?: string;
};

export const Chart = ({ options, height, className }: ChartProps) => {
  const colors = useChartColors();
  const built = colors ? options(colors) : null;
  // Parents rebuild options on every render; hand Highcharts the same object until the content
  // changes, otherwise each re-render calls chart.update() and can freeze the opening animation.
  const key = JSON.stringify(built);
  const merged = useMemo(
    () =>
      colors && built ? Highcharts.merge(baseOptions(colors), built, { chart: { height } }) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `built`
    [key, colors, height],
  );
  if (!merged) return <div style={{ height }} className={className} aria-hidden />;
  return (
    <div className={className} dir="ltr">
      <HighchartsReact highcharts={Highcharts} options={merged} />
    </div>
  );
};
