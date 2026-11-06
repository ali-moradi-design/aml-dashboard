"use client";

import { useMemo } from "react";
import Highcharts from "highcharts";
// Modules register on the Highcharts instance, so they load here, after the core.
import "highcharts/modules/heatmap";
import "highcharts/modules/sankey";
import "highcharts/modules/funnel";
import HighchartsReact from "highcharts-react-official";
import type { ChartColors } from "./chart";

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

/** Browser-only part of `Chart` (loaded with next/dynamic, ssr: false). */
export const ChartCanvas = ({
  colors,
  options,
  height,
}: {
  colors: ChartColors;
  options: Highcharts.Options;
  height: number;
}) => {
  // Parents rebuild options on every render; hand Highcharts the same object until the content
  // changes, otherwise each re-render calls chart.update() and can freeze the opening animation.
  const key = JSON.stringify(options);
  const merged = useMemo(
    () => Highcharts.merge(baseOptions(colors), options, { chart: { height } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `options`
    [key, colors, height],
  );
  return <HighchartsReact highcharts={Highcharts} options={merged} />;
};
