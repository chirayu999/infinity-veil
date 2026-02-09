import { ArrowLeft, Shield, Target, Gavel, Cpu } from "lucide-react";
import { useNavigate } from "react-router-dom";

const timelineEvents = [
  { time: "Feb 7, 09:14", desc: "Macro-spawned PowerShell on WS-042", agent: "SENTINEL", phase: "Initial Compromise", phaseColor: "bg-nw-blue" },
  { time: "Feb 7, 11:30", desc: "RDP lateral movement WS-042 → WS-107, SRV-003", agent: "HUNTER", phase: "Lateral Movement", phaseColor: "bg-nw-amber" },
  { time: "Feb 7, 14:02", desc: "Credential dump tool on WS-107", agent: "SENTINEL", phase: "Privilege Escalation", phaseColor: "bg-nw-red" },
  { time: "Feb 8, 02:15", desc: "4.2GB data staged on FS-001", agent: "HUNTER", phase: "Data Exfiltration", phaseColor: "bg-nw-purple" },
];

const agentCards = [
  {
    name: "SENTINEL", icon: Shield, accentVar: "--nw-blue",
    text: "Found macro-spawned PowerShell with encoded command on WS-042. Decoded payload matches known Cobalt Strike stager pattern. Correlated with 3 similar events in past 48h.",
    confidence: 91,
  },
  {
    name: "HUNTER", icon: Target, accentVar: "--nw-green",
    text: "Traced RDP lateral movement across 5 hosts originating from WS-042. Unusual after-hours timing (02:15 UTC). Credential reuse pattern detected across WS-107 and SRV-003.",
    confidence: 89,
  },
  {
    name: "ADVOCATE", icon: Gavel, accentVar: "--nw-amber",
    text: 'CHALLENGE: john.doe is IT admin, multi-host RDP expected during maintenance windows.',
    overridden: "OVERRIDDEN: Credential dump tool cannot be explained by admin activity. After-hours timing does not match any scheduled maintenance.",
    confidence: null,
  },
  {
    name: "COMMANDER", icon: Cpu, accentVar: "--nw-purple",
    text: "VERDICT: HIGH confidence threat. Adversarial challenge overridden by credential dump evidence and anomalous timing pattern. Recommend immediate isolation.",
    confidence: 87,
    isFinal: true,
  },
];

const assets = [
  { host: "WS-042", type: "Workstation", role: "Entry Point" },
  { host: "WS-107", type: "Workstation", role: "Lateral Target" },
  { host: "SRV-003", type: "Server", role: "Lateral Target" },
  { host: "FS-001", type: "File Server", role: "Staging" },
];

const actionsLog = [
  { time: "Feb 8, 02:20", action: "Host WS-042 auto-isolated", actor: "SENTINEL" },
  { time: "Feb 8, 02:20", action: "Slack notification sent to #soc-alerts", actor: "System" },
  { time: "Feb 8, 02:22", action: "Threat escalated to Tier 2", actor: "COMMANDER" },
  { time: "Feb 8, 02:25", action: "Memory dump initiated on WS-042", actor: "SENTINEL" },
];

const mitreTags = ["T1021.001", "T1059.001", "T1003"];

function CircularGauge({ value, size = 80 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value > 85 ? "hsl(var(--nw-amber))" : value > 60 ? "hsl(var(--nw-amber))" : "hsl(var(--nw-green))";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--nw-border))" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">{value}%</span>
    </div>
  );
}

export default function ThreatDetail() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate("/threats")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Threats
      </button>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">Lateral Movement Chain Detected</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-nw-high/20 text-nw-high">HIGH</span>
              <span className="text-sm text-muted-foreground">Lateral Movement</span>
              <span className="text-muted-foreground">·</span>
              {mitreTags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded bg-secondary text-xs font-mono text-secondary-foreground">{t}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button className="px-3 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-accent transition-colors">Acknowledge</button>
              <button className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Investigate</button>
              <button className="px-3 py-1.5 rounded-md bg-nw-green/20 text-nw-green text-sm font-medium hover:bg-nw-green/30 transition-colors">Confirm</button>
              <button className="px-3 py-1.5 rounded-md border border-nw-red/40 text-nw-red text-sm hover:bg-nw-red/10 transition-colors">Mark False Positive</button>
              <button className="px-3 py-1.5 rounded-md bg-nw-amber/20 text-nw-amber text-sm font-medium hover:bg-nw-amber/30 transition-colors">Escalate</button>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <CircularGauge value={87} />
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-nw-blue/20 text-nw-blue">NEW</span>
          </div>
        </div>
      </div>

      {/* Middle: Timeline + Agent Reasoning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attack Timeline */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-5">Attack Timeline</h2>
          <div className="relative pl-6">
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
            {timelineEvents.map((e, i) => (
              <div key={i} className="relative pb-6 last:pb-0">
                <div className={`absolute left-[-15px] top-1.5 h-3 w-3 rounded-full ${e.phaseColor} ring-2 ring-card`} />
                <div className="ml-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{e.time}</span>
                    <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono font-semibold text-secondary-foreground">{e.agent}</span>
                  </div>
                  <p className="text-sm text-foreground">{e.desc}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.phase}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Reasoning */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-5">Agent Reasoning</h2>
          <div className="space-y-3">
            {agentCards.map((a) => (
              <div key={a.name} className="rounded-md border border-border p-4" style={{ borderLeftWidth: 3, borderLeftColor: `hsl(var(${a.accentVar}))` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <a.icon className="h-4 w-4" style={{ color: `hsl(var(${a.accentVar}))` }} />
                    <span className="text-xs font-bold font-mono tracking-wide text-foreground">{a.name}</span>
                  </div>
                  {a.confidence !== null && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {a.isFinal ? "Final: " : "Confidence: "}{a.confidence}%
                    </span>
                  )}
                  {a.confidence === null && (
                    <span className="px-1.5 py-0.5 rounded bg-nw-amber/20 text-[10px] font-medium text-nw-amber">OVERRIDDEN</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.text}</p>
                {a.overridden && (
                  <p className="text-sm text-foreground mt-2 leading-relaxed">{a.overridden}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Assets + Actions Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Affected Assets */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-4">Affected Assets</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Host</th>
                <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.host} className="border-b border-border last:border-0">
                  <td className="py-2 font-mono text-foreground">{a.host}</td>
                  <td className="py-2 text-muted-foreground">{a.type}</td>
                  <td className="py-2 text-muted-foreground">{a.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions Log */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-4">Actions Log</h2>
          <div className="space-y-3">
            {actionsLog.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xs font-mono text-muted-foreground whitespace-nowrap mt-0.5">{a.time}</span>
                <div>
                  <p className="text-sm text-foreground">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.actor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
