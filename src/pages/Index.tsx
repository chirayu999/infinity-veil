import { Activity, AlertTriangle, Eye, Radar, Shield, Cpu, Gavel, Target } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from "recharts";

const sparkData = [
  { v: 3 }, { v: 5 }, { v: 4 }, { v: 7 }, { v: 6 }, { v: 9 }, { v: 8 }, { v: 12 },
];

const severityData = [
  { name: "Critical", value: 2, color: "hsl(0, 84%, 60%)" },
  { name: "High", value: 5, color: "hsl(25, 95%, 53%)" },
  { name: "Medium", value: 28, color: "hsl(45, 93%, 47%)" },
  { name: "Low", value: 12, color: "hsl(217, 91%, 60%)" },
];

const agents = [
  { name: "SENTINEL", icon: Shield, status: "Online", lastActive: "2m ago" },
  { name: "HUNTER", icon: Target, status: "Online", lastActive: "30s ago" },
  { name: "ADVOCATE", icon: Gavel, status: "Online", lastActive: "5m ago" },
  { name: "COMMANDER", icon: Cpu, status: "Online", lastActive: "1m ago" },
];

const activities = [
  {
    title: "Lateral Movement Chain Detected",
    detail: "WS-042 → WS-107 → SRV-003",
    severity: "high" as const,
    time: "2 min ago",
    icon: AlertTriangle,
  },
  {
    title: "Host WS-042 isolated",
    detail: "Auto-action by SENTINEL",
    severity: "critical" as const,
    time: "2 min ago",
    icon: Shield,
  },
  {
    title: "Hunt cycle completed",
    detail: "3 threats found across 142 hosts",
    severity: "medium" as const,
    time: "5 min ago",
    icon: Radar,
  },
  {
    title: "False positive marked for review",
    detail: "By analyst@company.com",
    severity: "low" as const,
    time: "12 min ago",
    icon: Eye,
  },
];

const severityBorderMap = {
  critical: "border-l-severity-critical",
  high: "border-l-severity-high",
  medium: "border-l-severity-medium",
  low: "border-l-severity-low",
};

function CircularGauge({ value }: { value: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="hsl(var(--nw-border))" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke="hsl(var(--nw-amber))" strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground">
        {value}%
      </span>
    </div>
  );
}

export default function Dashboard() {
  const total = severityData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Threats Today */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Threats Today</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-foreground">12</span>
            <div className="w-20 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area dataKey="v" stroke="hsl(217, 91%, 60%)" fill="url(#sparkGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Avg Confidence */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg Confidence</p>
          <div className="flex items-center gap-3">
            <CircularGauge value={68} />
            <span className="text-xs text-muted-foreground">across all active threats</span>
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Pending Reviews</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-foreground">5</span>
            <span className="h-2.5 w-2.5 rounded-full bg-nw-amber pulse-dot" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">awaiting analyst decision</p>
        </div>

        {/* Active Hunts */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Active Hunts</p>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-nw-green pulse-dot" />
            <span className="text-sm font-medium text-nw-green">Running</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">2 hunts across 142 hosts</p>
        </div>
      </div>

      {/* Middle section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity Breakdown */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground mb-4">Severity Breakdown</h2>
          <div className="flex items-center gap-6">
            <div className="w-28 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={48} strokeWidth={0}>
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1">
              {severityData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{d.value}</span>
                    <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Status */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground mb-4">Agent Status</h2>
          <div className="grid grid-cols-2 gap-3">
            {agents.map((agent) => (
              <div key={agent.name} className="rounded-md border border-border bg-secondary/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <agent.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold font-mono tracking-wide text-foreground">{agent.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-nw-green pulse-dot" />
                    <span className="text-xs text-nw-green">Online</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{agent.lastActive}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground mb-4">Recent Activity</h2>
        <div className="space-y-0.5">
          {activities.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-md border-l-2 ${severityBorderMap[a.severity]} hover:bg-accent/30 transition-colors`}
            >
              <a.icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              </div>
              <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
