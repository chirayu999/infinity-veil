import { ArrowLeft, Shield, Target, Gavel, Cpu, type LucideIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateThreatAction, useThreat } from "@/hooks/useThreats";
import ESQLQueriesPanel from "@/components/ESQLQueriesPanel";

const agentConfig = {
  scanner: { name: "SCANNER", emoji: "🔍", icon: Shield, accentVar: "--nw-blue" },
  tracer: { name: "TRACER", emoji: "🕵️", icon: Target, accentVar: "--nw-green" },
  advocate: { name: "ADVOCATE", emoji: "⚖️", icon: Gavel, accentVar: "--nw-amber" },
  commander: { name: "COMMANDER", emoji: "🎯", icon: Cpu, accentVar: "--nw-purple" },
} as const;
type AgentCard = {
  name: string;
  emoji: string;
  icon: LucideIcon;
  accentVar: string;
  text: string;
  confidence: number | null;
  overridden?: string;
  isFinal?: boolean;
};

function titleize(text: string) {
  return text
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const { id = "" } = useParams();
  const { data, isLoading, isError, error } = useThreat(id);
  const createThreatAction = useCreateThreatAction();

  const threat = data?.threat;
  const actionsLog = data?.actions ?? [];

  const handleAction = async (actionType: string) => {
    if (!threat) return;
    await createThreatAction.mutateAsync({
      threatId: threat.id,
      action_type: actionType,
    });
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading threat details...</div>;
  }

  if (isError || !threat) {
    return (
      <div className="space-y-3">
        <button onClick={() => navigate("/threats")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Threats
        </button>
        <p className="text-sm text-nw-red">{error instanceof Error ? error.message : "Threat not found"}</p>
      </div>
    );
  }

  const agentCards: AgentCard[] = [
    threat.agent_reasoning?.scanner && {
      ...agentConfig.scanner,
      text: threat.agent_reasoning.scanner.finding,
      confidence: threat.agent_reasoning.scanner.confidence,
    },
    threat.agent_reasoning?.tracer && {
      ...agentConfig.tracer,
      text: threat.agent_reasoning.tracer.finding,
      confidence: threat.agent_reasoning.tracer.confidence,
    },
    threat.agent_reasoning?.advocate && {
      ...agentConfig.advocate,
      text: threat.agent_reasoning.advocate.challenge,
      overridden: threat.agent_reasoning.advocate.reason,
      confidence: null,
    },
    threat.agent_reasoning?.commander && {
      ...agentConfig.commander,
      text: threat.agent_reasoning.commander.reasoning,
      confidence: threat.agent_reasoning.commander.final_confidence,
      isFinal: true,
    },
  ].filter((card): card is AgentCard => Boolean(card));

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
            <h1 className="text-2xl font-bold text-foreground">{threat.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-nw-high/20 text-nw-high">{titleize(threat.severity)}</span>
              <span className="text-sm text-muted-foreground">{titleize(threat.attack_phase)}</span>
              <span className="text-muted-foreground">·</span>
              {threat.mitre_techniques.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded bg-secondary text-xs font-mono text-secondary-foreground">{t}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => handleAction("acknowledged")}
                disabled={createThreatAction.isPending}
                className="px-3 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-accent transition-colors"
              >
                Acknowledge
              </button>
              <button
                onClick={() => handleAction("investigate")}
                disabled={createThreatAction.isPending}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Investigate
              </button>
              <button
                onClick={() => handleAction("confirmed")}
                disabled={createThreatAction.isPending}
                className="px-3 py-1.5 rounded-md bg-nw-green/20 text-nw-green text-sm font-medium hover:bg-nw-green/30 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => handleAction("marked_false_positive")}
                disabled={createThreatAction.isPending}
                className="px-3 py-1.5 rounded-md border border-nw-red/40 text-nw-red text-sm hover:bg-nw-red/10 transition-colors"
              >
                Mark False Positive
              </button>
              <button
                onClick={() => handleAction("escalated")}
                disabled={createThreatAction.isPending}
                className="px-3 py-1.5 rounded-md bg-nw-amber/20 text-nw-amber text-sm font-medium hover:bg-nw-amber/30 transition-colors"
              >
                Escalate
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <CircularGauge value={threat.confidence_score} />
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-nw-blue/20 text-nw-blue">{titleize(threat.status)}</span>
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
            {threat.timeline_events.map((e, i) => (
              <div key={i} className="relative pb-6 last:pb-0">
                <div className="absolute left-[-15px] top-1.5 h-3 w-3 rounded-full bg-nw-blue ring-2 ring-card" />
                <div className="ml-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{formatTimestamp(e.timestamp)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono font-semibold text-secondary-foreground">{agentConfig[e.source_agent].emoji} {agentConfig[e.source_agent].name}</span>
                  </div>
                  <p className="text-sm text-foreground">{e.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{titleize(e.attack_phase)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Reasoning */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-5">Agent Reasoning</h2>
          <div className="space-y-3">
            {agentCards.length === 0 && (
              <p className="text-sm text-muted-foreground">No agent reasoning captured for this threat.</p>
            )}
            {agentCards.map((a) => (
              <div key={a.name} className="rounded-md border border-border p-4" style={{ borderLeftWidth: 3, borderLeftColor: `hsl(var(${a.accentVar}))` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{a.emoji}</span>
                    <span className="text-xs font-bold font-mono tracking-wide text-foreground" style={{ color: `hsl(var(${a.accentVar}))` }}>{a.name}</span>
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
              {threat.affected_assets.map((a, idx) => (
                <tr key={`${a.host ?? "asset"}-${idx}`} className="border-b border-border last:border-0">
                  <td className="py-2 font-mono text-foreground">{a.host ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">{a.type}</td>
                  <td className="py-2 text-muted-foreground">{a.role ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions Log */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-4">Actions Log</h2>
          <div className="space-y-3">
            {actionsLog.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <span className="text-xs font-mono text-muted-foreground whitespace-nowrap mt-0.5">{formatTimestamp(a.created_at)}</span>
                <div>
                  <p className="text-sm text-foreground">{titleize(a.action_type)}</p>
                  <p className="text-xs text-muted-foreground">{a.performed_by}</p>
                </div>
              </div>
            ))}
            {actionsLog.length === 0 && (
              <p className="text-sm text-muted-foreground">No actions recorded yet.</p>
            )}
          </div>
        </div>
      </div>
      <ESQLQueriesPanel queries={threat.esql_queries_used} />
    </div>
  );
}
