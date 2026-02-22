"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import ReactFlow, {
  BaseEdge,
  Background,
  BackgroundVariant,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlowProvider,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance
} from "reactflow";

type DiagramNodeData = {
  title: string;
  subtitle: string;
  category: "agent" | "adapter" | "broker" | "device" | "execution";
};

type DiagramEdgeData = {
  labelShiftX?: number;
  labelShiftY?: number;
  labelText?: string;
  animated?: boolean;
};

const NODE_W = 300;
const NODE_H = 118;
const VISIBLE_HANDLE_CLASS =
  "!h-2 !w-2 !border !border-slate-900/60 !bg-slate-300/85 !shadow-none";

const CATEGORY_STYLES: Record<
  DiagramNodeData["category"],
  { accent: string; badge: string }
> = {
  agent: {
    accent: "#60a5fa",
    badge: "Agent"
  },
  adapter: {
    accent: "#22d3ee",
    badge: "Adapter"
  },
  broker: {
    accent: "#f59e0b",
    badge: "Broker"
  },
  device: {
    accent: "#f472b6",
    badge: "Device"
  },
  execution: {
    accent: "#34d399",
    badge: "Execution"
  }
};

const RAW_NODES: Array<Node<DiagramNodeData>> = [
  {
    id: "agent",
    type: "consentNode",
    data: {
      title: "AI Agent",
      subtitle: "Cursor / Copilot / CI bot proposes action",
      category: "agent"
    },
    position: { x: 0, y: 0 }
  },
  {
    id: "adapter",
    type: "consentNode",
    data: {
      title: "Adapter Layer",
      subtitle: "CLI wrapper, GH Actions step, SDK hooks",
      category: "adapter"
    },
    position: { x: 0, y: 0 }
  },
  {
    id: "broker",
    type: "consentNode",
    data: {
      title: "Consent Broker",
      subtitle: "Policy, risk, action hash, token signer, audit",
      category: "broker"
    },
    position: { x: 0, y: 0 }
  },
  {
    id: "device",
    type: "consentNode",
    data: {
      title: "Logitech Trust Surface",
      subtitle: "MX Console consent UI, haptics, gesture",
      category: "device"
    },
    position: { x: 0, y: 0 }
  },
  {
    id: "execution",
    type: "consentNode",
    data: {
      title: "Execution Target",
      subtitle: "kubectl / terraform / deploy; runs only with token",
      category: "execution"
    },
    position: { x: 0, y: 0 }
  }
];

const EDGE_LABEL_BG = {
  fill: "rgba(15, 23, 42, 0.92)",
  stroke: "rgba(148, 163, 184, 0.22)",
  strokeWidth: 1
};

const RAW_EDGES: Edge<DiagramEdgeData>[] = [
  {
    id: "agent-adapter",
    source: "agent",
    target: "adapter",
    type: "consentEdge",
    label: "proposed action",
    labelShowBg: true,
    labelBgPadding: [10, 4],
    labelBgBorderRadius: 999,
    labelBgStyle: EDGE_LABEL_BG,
    labelStyle: { fill: "#dbeafe", fontSize: 11, fontWeight: 600 },
    style: { stroke: "rgba(148,163,184,0.6)", strokeWidth: 1.6 },
    sourceHandle: "source-right",
    targetHandle: "target-left",
    data: { labelShiftY: -18 }
  },
  {
    id: "adapter-broker",
    source: "adapter",
    target: "broker",
    type: "consentEdge",
    label: "request consent",
    labelShowBg: true,
    labelBgPadding: [10, 4],
    labelBgBorderRadius: 999,
    labelBgStyle: EDGE_LABEL_BG,
    labelStyle: { fill: "#e0f2fe", fontSize: 11, fontWeight: 600 },
    style: { stroke: "rgba(148,163,184,0.6)", strokeWidth: 1.6 },
    sourceHandle: "source-right",
    targetHandle: "target-left",
    data: { labelShiftY: -18 }
  },
  {
    id: "broker-device",
    source: "broker",
    target: "device",
    type: "consentEdge",
    label: "consent UI + risk",
    labelShowBg: true,
    labelBgPadding: [10, 4],
    labelBgBorderRadius: 999,
    labelBgStyle: EDGE_LABEL_BG,
    labelStyle: { fill: "#fae8ff", fontSize: 11, fontWeight: 600 },
    style: { stroke: "rgba(148,163,184,0.6)", strokeWidth: 1.6 },
    sourceHandle: "source-right",
    targetHandle: "target-left",
    data: { labelShiftX: 6, labelShiftY: 20, labelText: "consent UI + risk" }
  },
  {
    id: "device-broker",
    source: "device",
    target: "broker",
    type: "consentEdge",
    label: "approve / deny",
    labelShowBg: true,
    labelBgPadding: [10, 4],
    labelBgBorderRadius: 999,
    labelBgStyle: EDGE_LABEL_BG,
    labelStyle: { fill: "#fde68a", fontSize: 11, fontWeight: 600 },
    style: {
      stroke: "rgba(251,191,36,0.65)",
      strokeWidth: 1.6,
      strokeDasharray: "6 4"
    },
    sourceHandle: "source-top",
    targetHandle: "target-top",
    data: { labelShiftX: 10, labelShiftY: -30, animated: true }
  },
  {
    id: "broker-execution",
    source: "broker",
    target: "execution",
    type: "consentEdge",
    label: "token or 403",
    labelShowBg: true,
    labelBgPadding: [10, 4],
    labelBgBorderRadius: 999,
    labelBgStyle: EDGE_LABEL_BG,
    labelStyle: { fill: "#dcfce7", fontSize: 11, fontWeight: 600 },
    style: { stroke: "rgba(148,163,184,0.6)", strokeWidth: 1.6 },
    sourceHandle: "source-bottom",
    targetHandle: "target-left",
    data: { labelShiftX: 16, labelShiftY: 16 }
  }
];

function buildSlideLayout(): { nodes: Array<Node<DiagramNodeData>>; edges: Edge<DiagramEdgeData>[] } {
  const positions: Record<string, { x: number; y: number }> = {
    agent: { x: 70, y: 246 },
    adapter: { x: 500, y: 246 },
    broker: { x: 960, y: 182 },
    device: { x: 1410, y: 78 },
    execution: { x: 1410, y: 412 }
  };

  const nodes = RAW_NODES.map((node) => ({
    ...node,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    position: positions[node.id]
  }));

  return { nodes, edges: RAW_EDGES };
}

function ConsentEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  labelStyle,
  style,
  data
}: EdgeProps<DiagramEdgeData>) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 18,
    offset: 26
  });

  const shiftX = data?.labelShiftX ?? 0;
  const shiftY = data?.labelShiftY ?? 0;
  const labelText = data?.labelText ?? (typeof label === "string" ? label : "");
  const animatedStroke = data?.animated
    ? { ...(style ?? {}), animation: "consentDashFlow 1.3s linear infinite" }
    : style;

  return (
    <>
      <BaseEdge id={id} path={path} style={animatedStroke} />
      {labelText ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-slate-900/95 px-2.5 py-1 text-[11px] font-semibold leading-none shadow-[0_6px_14px_rgba(2,6,23,0.35)]"
            style={{
              left: labelX + shiftX,
              top: labelY + shiftY,
              ...(labelStyle ?? {})
            }}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function ConsentNode({ id, data }: NodeProps<DiagramNodeData>) {
  const style = CATEGORY_STYLES[data.category];
  const showLeftTarget = id === "adapter" || id === "broker" || id === "device" || id === "execution";
  const showRightSource = id === "agent" || id === "adapter" || id === "broker";
  const showBrokerRightTarget = id === "broker";
  const showDeviceTopSource = id === "device";
  const showBrokerTopTarget = id === "broker";
  const showBrokerBottomSource = id === "broker";

  return (
    <div className="relative w-[300px] rounded-2xl border border-white/10 bg-slate-900/92 shadow-[0_12px_30px_rgba(2,6,23,0.38)]">
      <div
        className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl"
        style={{ backgroundColor: style.accent }}
      />

      {showLeftTarget && (
        <Handle
          id="target-left"
          type="target"
          position={Position.Left}
          className={VISIBLE_HANDLE_CLASS}
        />
      )}
      {showRightSource && (
        <Handle
          id="source-right"
          type="source"
          position={Position.Right}
          className={VISIBLE_HANDLE_CLASS}
        />
      )}
      {showDeviceTopSource && (
        <Handle
          id="source-top"
          type="source"
          position={Position.Top}
          className={VISIBLE_HANDLE_CLASS}
        />
      )}
      {showBrokerBottomSource && (
        <Handle
          id="source-bottom"
          type="source"
          position={Position.Bottom}
          className={VISIBLE_HANDLE_CLASS}
        />
      )}
      {showBrokerTopTarget && (
        <Handle
          id="target-top"
          type="target"
          position={Position.Top}
          className={VISIBLE_HANDLE_CLASS}
        />
      )}
      {showBrokerRightTarget && (
        <Handle
          id="target-right"
          type="target"
          position={Position.Right}
          className={VISIBLE_HANDLE_CLASS}
        />
      )}

      <div className="px-4 py-3 pl-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-semibold leading-5 text-white">{data.title}</p>
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{
              color: style.accent,
              borderColor: `${style.accent}55`,
              backgroundColor: `${style.accent}14`
            }}
          >
            {style.badge}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-5 text-slate-300">{data.subtitle}</p>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  consentNode: ConsentNode
};

const edgeTypes = {
  consentEdge: ConsentEdge
};

function FlowCanvas() {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const layouted = useMemo(() => buildSlideLayout(), []);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    window.requestAnimationFrame(() => {
      instance.fitView({ padding: 0.08, duration: 250 });
    });
  }, []);

  const exportPng = useCallback(async () => {
    if (!exportRef.current || exporting) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#020617"
      });
      const a = document.createElement("a");
      a.download = "consentkey-architecture.png";
      a.href = dataUrl;
      a.click();
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-900 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Architecture Diagram</p>
        <button
          type="button"
          onClick={exportPng}
          disabled={exporting}
          className="rounded-full border border-cyan-400/45 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? "Exporting..." : "Export PNG"}
        </button>
      </div>

      <div
        ref={exportRef}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.08),transparent_35%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(to_bottom,rgba(2,6,23,0.9),rgba(15,23,42,0.92))]" />
        <div className="pointer-events-none absolute left-5 top-4 z-10 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
          Control Plane (Local)
        </div>
        <div className="pointer-events-none absolute right-5 top-4 z-10 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-fuchsia-200">
          Physical Trust Surface
        </div>
        <div className="pointer-events-none absolute right-5 bottom-4 z-10 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
          Enforcement / Runtime
        </div>
        <div className="relative h-[620px] w-full">
          <ReactFlow
            nodes={layouted.nodes}
            edges={layouted.edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            onInit={onInit}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            minZoom={0.6}
            maxZoom={1.4}
            proOptions={{ hideAttribution: true }}
            className="bg-transparent"
            defaultEdgeOptions={{
              type: "consentEdge",
              style: { strokeWidth: 1.6 }
            }}
          >
            <Background
              variant={BackgroundVariant.Lines}
              color="rgba(148, 163, 184, 0.14)"
              gap={22}
              size={1}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default function ConsentKeyDiagramFlow() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
