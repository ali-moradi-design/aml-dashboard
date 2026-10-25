"use client";

import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Sigma from "sigma";
import { extremityArrow, layerPlain, pathLine } from "sigma/rendering";
import type { NetworkEdge, NetworkNode } from "@aml/shared";
import { useChartColors, type ChartColors } from "@/shared/ui/chart";
import { edgeSize, nodeLabel, nodeRisk, nodeSize, seeded } from "../model/graph";

export type CanvasHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  focus: (id: string) => void;
};

type Props = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  /** Changing it starts a fresh layout (new center or filters); otherwise new nodes join the current one. */
  resetKey: string;
  center: string | null;
  colorBy: "risk" | "cluster";
  communities: Map<string, number>;
  selected: string | null;
  /** Nodes to keep in focus (a path or a cluster); everything else fades. */
  highlight: Set<string> | null;
  restrictedLabel: string;
  label: string;
  failedLabel: string;
  onSelect: (id: string | null) => void;
  onExpand: (id: string) => void;
};

type NodeAttrs = {
  node: NetworkNode;
  x: number;
  y: number;
  size: number;
  label: string;
  fixed?: boolean;
};
type EdgeAttrs = { edge: NetworkEdge; size: number };

const CLUSTER_TOKENS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "risk-medium",
  "risk-low",
] as const;

const riskColor = (c: ChartColors, risk: number | null) =>
  risk == null
    ? c["text-secondary"]
    : risk >= 70
      ? c["risk-high"]
      : risk >= 40
        ? c["risk-medium"]
        : c["risk-low"];

const baseColor = (
  c: ChartColors,
  n: NetworkNode,
  mode: Props["colorBy"],
  community: number | undefined,
) => {
  if (n.kind === "account" && n.restricted) return c.border;
  if (mode === "cluster" && community !== undefined)
    return c[CLUSTER_TOKENS[community % CLUSTER_TOKENS.length]!];
  if (n.kind === "shareholder") return c["chart-4"];
  return riskColor(c, nodeRisk(n));
};

type Live = { current: Props & { colors: ChartColors | null } };

const createRenderer = (
  g: Graph<NodeAttrs, EdgeAttrs>,
  el: HTMLElement,
  live: Live,
  hovered: { current: string | null },
) =>
  new Sigma(g, el, {
    primitives: {
      edges: {
        paths: [pathLine()],
        extremities: [extremityArrow({ lengthRatio: 4, widthRatio: 3.2 })],
        layers: [layerPlain()],
        defaultHead: "arrow",
      },
    },
    // The container may still be 0px tall on mount (hidden tab, layout in progress); a ResizeObserver fixes that.
    settings: {
      enableNodeDrag: true,
      allowInvalidContainer: true,
      labelRenderedSizeThreshold: 7,
      labelDensity: 0.6,
      minCameraRatio: 0.05,
      maxCameraRatio: 4,
      stagePadding: 40,
    },
    nodeReducer: (key, data, attrs) => {
      const { colors: c, colorBy, communities, selected, highlight, center } = live.current;
      if (!c) return data;
      const n = attrs.node;
      const focus = hovered.current
        ? new Set([hovered.current, ...g.neighbors(hovered.current)])
        : highlight;
      const dim = focus && !focus.has(key);
      return {
        ...data,
        color: dim ? c.border : baseColor(c, n, colorBy, communities.get(key)),
        label: dim ? null : data.label,
        labelColor: c.text,
        zIndex: key === selected || key === hovered.current ? 3 : dim ? 0 : 1,
        highlighted: key === selected || key === center,
        backdropColor: c.card,
      };
    },
    edgeReducer: (key, data, attrs) => {
      const { colors: c, highlight } = live.current;
      if (!c) return data;
      const [source, target] = g.extremities(key);
      const focus = hovered.current ? new Set([hovered.current]) : null;
      const onFocus = focus
        ? focus.has(source) || focus.has(target)
        : highlight
          ? highlight.has(source) && highlight.has(target)
          : true;
      const owns = attrs.edge.kind === "owns";
      return {
        ...data,
        color: onFocus ? (owns ? c.border : c["chart-2"]) : c.border,
        opacity: onFocus ? (owns ? 0.9 : 0.75) : 0.18,
        head: owns ? "none" : "arrow",
        zIndex: onFocus ? 1 : 0,
      };
    },
  });

type Renderer = ReturnType<typeof createRenderer>;

/**
 * WebGL graph (Sigma.js on graphology). Force-directed layout (ForceAtlas2), double-click expands
 * a node, hover shows neighbors, drag moves a node. Colors come from the theme tokens.
 */
export const NetworkCanvas = forwardRef<CanvasHandle, Props>(function NetworkCanvas(props, ref) {
  const container = useRef<HTMLDivElement>(null);
  const sigma = useRef<Renderer | null>(null);
  const graph = useRef(new Graph<NodeAttrs, EdgeAttrs>({ multi: false, type: "directed" }));
  const lastReset = useRef<string | null>(null);
  const hovered = useRef<string | null>(null);
  const colors = useChartColors();
  const [failed, setFailed] = useState(false);
  // Reducers read the latest props through this ref, so they never need re-binding.
  const live = useRef({ ...props, colors });
  useLayoutEffect(() => {
    live.current = { ...props, colors };
  });

  useImperativeHandle(ref, () => ({
    zoomIn: () => void sigma.current?.getCamera().zoomIn({ duration: 250 }),
    zoomOut: () => void sigma.current?.getCamera().zoomOut({ duration: 250 }),
    fit: () => void sigma.current?.getCamera().reset({ duration: 300 }),
    focus: (id) => {
      const s = sigma.current;
      const d = s?.getNodeDisplayData(id);
      if (s && d) void s.getCamera().animate({ x: d.x, y: d.y, ratio: 0.5 }, { duration: 400 });
    },
  }));

  // Create the renderer once the theme colors are known.
  useEffect(() => {
    if (!container.current || !colors || sigma.current) return;
    const g = graph.current;
    let s: Renderer;
    try {
      s = createRenderer(g, container.current, live, hovered);
    } catch (error) {
      // No WebGL (old browser, disabled GPU): say so instead of a blank box.
      console.error("[network] renderer failed", error);
      setFailed(true);
      return;
    }
    s.on("clickNode", ({ node }) => live.current.onSelect(node));
    s.on("doubleClickNode", (e) => {
      e.preventSigmaDefault();
      live.current.onExpand(e.node);
    });
    s.on("clickStage", () => live.current.onSelect(null));
    s.on("enterNode", ({ node }) => {
      hovered.current = node;
      container.current!.style.cursor = "pointer";
      s.refresh({ skipIndexation: true } as never);
    });
    s.on("leaveNode", () => {
      hovered.current = null;
      container.current!.style.cursor = "";
      s.refresh({ skipIndexation: true } as never);
    });
    const observer = new ResizeObserver(() => s.resize());
    observer.observe(container.current);
    sigma.current = s;
    return () => {
      observer.disconnect();
      s.kill();
      sigma.current = null;
    };
  }, [colors]);

  // Sync data into the graph and lay it out.
  useEffect(() => {
    const g = graph.current;
    const fresh = lastReset.current !== props.resetKey;
    lastReset.current = props.resetKey;
    if (fresh) g.clear();
    const rng = seeded(props.nodes.length + 11);
    const before = new Set(g.nodes());
    const wanted = new Set(props.nodes.map((n) => n.id));

    for (const id of g.nodes()) if (!wanted.has(id)) g.dropNode(id);
    for (const n of props.nodes) {
      const attrs = {
        node: n,
        size: nodeSize(n, n.id === props.center),
        label: nodeLabel(n, props.restrictedLabel),
      };
      if (g.hasNode(n.id)) g.mergeNodeAttributes(n.id, attrs);
      else g.addNode(n.id, { ...attrs, x: rng() * 100, y: rng() * 100 });
    }
    for (const e of props.edges) {
      if (!g.hasNode(e.source) || !g.hasNode(e.target)) continue;
      if (g.hasEdge(e.id)) g.mergeEdgeAttributes(e.id, { edge: e, size: edgeSize(e) });
      else g.addDirectedEdgeWithKey(e.id, e.source, e.target, { edge: e, size: edgeSize(e) });
    }
    const added = g.nodes().filter((id) => !before.has(id));
    if (!added.length && !fresh) {
      sigma.current?.refresh();
      return;
    }
    if (!fresh && before.size) {
      // New neighbors start next to the node they came from; the old layout stays put.
      for (const id of added) {
        const anchor = g.neighbors(id).find((nb) => before.has(nb));
        if (anchor) {
          const a = g.getNodeAttributes(anchor);
          g.mergeNodeAttributes(id, { x: a.x + (rng() - 0.5) * 12, y: a.y + (rng() - 0.5) * 12 });
        }
      }
      g.forEachNode((id) => g.setNodeAttribute(id, "fixed", before.has(id)));
    }
    if (g.order > 1) {
      const settings = forceAtlas2.inferSettings(g);
      forceAtlas2.assign(g, {
        iterations: fresh ? 400 : 150,
        getEdgeWeight: null,
        settings: {
          ...settings,
          gravity: 1.2,
          scalingRatio: 6,
          adjustSizes: false,
          barnesHutOptimize: g.order > 300,
        },
      });
    }
    g.forEachNode((id) => g.removeNodeAttribute(id, "fixed"));
    sigma.current?.refresh();
    if (fresh) void sigma.current?.getCamera().reset({ duration: 0 });
  }, [props.nodes, props.edges, props.resetKey, props.center, props.restrictedLabel, colors]);

  // Restyle on selection, highlight, mode or theme changes.
  useEffect(() => {
    sigma.current?.refresh({ skipIndexation: true } as never);
  }, [props.selected, props.highlight, props.colorBy, props.communities, colors]);

  if (failed) return <p className="p-6 text-text-secondary">{props.failedLabel}</p>;
  return <div ref={container} role="img" aria-label={props.label} className="absolute inset-0" />;
});
