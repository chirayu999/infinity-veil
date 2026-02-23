import { Activity, AlertTriangle, Eye, Radar, Shield } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useDashboardStats, useActivityFeed } from "@/hooks/useDashboard";
import { useNavigate } from "react-router-dom";

const agents = [
  { name: "SCANNER", emoji: "🔍", status: "Online", lastActive: "2m ago" },
  { name: "TRACER", emoji: "🕵️", status: "Online", lastActive: "30s ago" },
  { name: "ADVOCATE", emoji: "⚖️", status: "Online", lastActive: "5m ago" },
  { name: "COMMANDER", emoji: "🎯", status: "Online", lastActive: "1m ago" },
];

const severityBorderMap: Record<string, string> = {
  critical: "border-l-severity-critical",
  high: "border-l-severity-high",
  medium: "border-l-severity-medium",
  low: "border-l-severity-low",
};

const activityIcons: Record<string, any> = {
  threat_detected: AlertTriangle,
  auto_action: Shield,
  hunt_completed: Radar,
  false_positive: Eye,
  default: Activity,
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

// Sparkline placeholder data (will be replaced with real trend data when available)
const sparkData = [
  { v: 3 }, { v: 5 }, { v: 4 }, { v: 7 }, { v: 6 }, { v: 9 }, { v: 8 }, { v: 12 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: statsData, isLoading: statsLoading } = useDashboardStats();
  const { data: feedData, isLoading: feedLoading } = useActivityFeed(1);

  const stats = statsData?.stats;
  const activities = feedData?.activities ?? [];

  const severityData = [
    { name: "Critical", value: stats?.critical_count ?? 0, color: "hsl(0, 84%, 60%)" },
    { name: "High", value: stats?.high_count ?? 0, color: "hsl(25, 95%, 53%)" },
    { name: "Medium", value: stats?.medium_count ?? 0, color: "hsl(45, 93%, 47%)" },
    { name: "Low", value: stats?.low_count ?? 0, color: "hsl(217, 91%, 60%)" },
  ];

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
            <span className="text-3xl font-bold text-foreground">
              {statsLoading ? "—" : (stats?.threats_today ?? 0)}
            </span>
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
            <CircularGauge value={stats?.avg_confidence ?? 0} />
            <span className="text-xs text-muted-foreground">across all active threats</span>
          </div>
        </div>

        {/* Pending Reviews */}
        <div
          className="rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => navigate("/review")}
        >
          <p className="text-xs text-muted-foreground mb-1">Pending Reviews</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-foreground">
              {statsLoading ? "—" : (stats?.pending_review_count ?? 0)}
            </span>
            {(stats?.pending_review_count ?? 0) > 0 && (
              <span className="h-2.5 w-2.5 rounded-full bg-nw-amber pulse-dot" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">awaiting analyst decision</p>
        </div>

        {/* Active Hunts */}
        <div
          className="rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => navigate("/hunts")}
        >
          <p className="text-xs text-muted-foreground mb-1">Hunts Today</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-foreground">
              {statsLoading ? "—" : (stats?.hunts_completed_today ?? 0)}
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-nw-green pulse-dot" />
            <span className="text-sm font-medium text-nw-green">Active</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.hunts_failed_today ? `${stats.hunts_failed_today} failed` : "all healthy"}
          </p>
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
                        style={{ width: total > 0 ? `${(d.value / total) * 100}%` : "0%", backgroundColor: d.color }}
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
                  <span className="text-base leading-none">{agent.emoji}</span>
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
        {feedLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-0.5">
            {activities.map((a) => {
              const Icon = activityIcons[a.event_type] || activityIcons.default;
              return (
                <div
                  key={a.id}
                  className={`flex items-start gap-3 p-3 rounded-md border-l-2 ${severityBorderMap[a.severity] || ""} hover:bg-accent/30 transition-colors`}
                >
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{a.timestamp}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
