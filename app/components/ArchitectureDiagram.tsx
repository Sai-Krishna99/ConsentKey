import React from "react";

type Box = {
  id: string;
  title: string;
  subtitle?: string;
  items: string[];
  x: number;
  y: number;
  w: number;
  h: number;
};

function Arrow({
  x1,
  y1,
  x2,
  y2,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
}) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g>
      <path
        d={`M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2"
      />
      <polygon
        points={`${x2},${y2} ${x2 - 10},${y2 - 6} ${x2 - 10},${y2 + 6}`}
        fill="rgba(255,255,255,0.45)"
      />
      {label ? (
        <g>
          <rect
            x={midX - (label.length * 3.6 + 10)}
            y={midY - 14}
            width={label.length * 7.2 + 20}
            height={22}
            rx={11}
            fill="rgba(15,23,42,0.8)"
            stroke="rgba(255,255,255,0.12)"
          />
          <text
            x={midX}
            y={midY + 2}
            textAnchor="middle"
            fontSize="12"
            fill="rgba(255,255,255,0.78)"
            style={{ fontFamily: "ui-sans-serif, system-ui" }}
          >
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function BoxCard({ b }: { b: Box }) {
  return (
    <g>
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx={18}
        fill="rgba(20, 30, 55, 0.55)"
        stroke="rgba(255,255,255,0.14)"
      />
      <text
        x={b.x + 18}
        y={b.y + 30}
        fontSize="16"
        fill="rgba(255,255,255,0.92)"
        style={{ fontFamily: "ui-sans-serif, system-ui", fontWeight: 650 }}
      >
        {b.title}
      </text>
      {b.subtitle ? (
        <text
          x={b.x + 18}
          y={b.y + 50}
          fontSize="12"
          fill="rgba(255,255,255,0.65)"
          style={{ fontFamily: "ui-sans-serif, system-ui" }}
        >
          {b.subtitle}
        </text>
      ) : null}

      {b.items.map((it, i) => (
        <g key={`${b.id}-${i}-${it}`}>
          <circle
            cx={b.x + 22}
            cy={b.y + 78 + i * 22}
            r={3}
            fill="rgba(255,255,255,0.6)"
          />
          <text
            x={b.x + 34}
            y={b.y + 82 + i * 22}
            fontSize="12.5"
            fill="rgba(255,255,255,0.78)"
            style={{ fontFamily: "ui-sans-serif, system-ui" }}
          >
            {it}
          </text>
        </g>
      ))}
    </g>
  );
}

export default function ArchitectureDiagram() {
  const W = 1420;
  const H = 680;

  const boxes: Box[] = [
    {
      id: "agent",
      title: "Agent + Tooling",
      subtitle: "Origin of proposed action",
      items: ["Cursor / Copilot / CI bot / RPA", "Proposes action", "e.g. rollout restart in prod"],
      x: 52,
      y: 102,
      w: 260,
      h: 198
    },
    {
      id: "adapter",
      title: "ConsentKey Adapter Layer",
      subtitle: "Integration without rewriting tools",
      items: ["CLI: consent-run <command>", "GitHub Actions step", "SDK hooks (LangChain / AutoGen)"],
      x: 350,
      y: 88,
      w: 290,
      h: 230
    },
    {
      id: "broker",
      title: "Consent Broker",
      subtitle: "Policy, risk, token, audit (local)",
      items: [
        "YAML policy engine",
        "Risk classifier: LOW / HIGH / CRITICAL",
        "Action hash (sha256)",
        "Token signer (short-lived approval token)",
        "Hash-chained audit log"
      ],
      x: 678,
      y: 70,
      w: 350,
      h: 298
    },
    {
      id: "device",
      title: "Console + Ring Trust Surface",
      subtitle: "MX Creative Console captures deliberate intent",
      items: ["Consent card UI", "Actions Ring overlay", "Approve / deny / hold gestures"],
      x: 1068,
      y: 106,
      w: 300,
      h: 214
    },
    {
      id: "enforce",
      title: "Enforcement + Outputs",
      subtitle: "Execution only when token is valid",
      items: [
        "Execution target checks token",
        "Without token: 403 Consent Required",
        "Outputs: token + audit event + optional notifications"
      ],
      x: 404,
      y: 448,
      w: 620,
      h: 170
    }
  ];

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.25em] text-white/60">CONSENTKEY ARCHITECTURE</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            MX Creative Console + Actions Ring consent firewall
          </div>
          <div className="mt-1 text-sm text-white/70">
            Agent proposes action, broker evaluates risk, human approves on MX Creative Console and Actions
            Ring, then execution is allowed or blocked.
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-900 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
          <defs>
            <radialGradient id="glow" cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
              <stop offset="60%" stopColor="rgba(56,189,248,0.06)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width={W} height={H} fill="url(#glow)" />

          <Arrow x1={312} y1={164} x2={350} y2={164} label="proposed action" />
          <Arrow x1={640} y1={164} x2={678} y2={164} label="request" />
          <Arrow x1={1028} y1={154} x2={1068} y2={154} label="console + ring UI" />
          <Arrow x1={1068} y1={266} x2={1028} y2={322} label="approve / deny" />
          <Arrow x1={860} y1={370} x2={730} y2={448} label="token or 403" />

          {boxes.map((box) => (
            <BoxCard key={box.id} b={box} />
          ))}

          <text
            x={52}
            y={656}
            fontSize="12"
            fill="rgba(255,255,255,0.55)"
            style={{ fontFamily: "ui-sans-serif, system-ui" }}
          >
            Core idea: verify intent (what action is being approved), not just identity (who clicked approve).
          </text>
        </svg>
      </div>
    </div>
  );
}
