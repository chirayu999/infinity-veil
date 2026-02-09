import { useState } from "react";
import { useNavigate } from "react-router-dom";

type ReviewStatus = "Pending" | "Confirmed" | "Rejected";

interface ReviewItem {
  id: string;
  title: string;
  severity: string;
  severityClass: string;
  confidence: number;
  attackPhase: string;
  markedBy: string;
  markedAgo: string;
  reason: string;
  status: ReviewStatus;
}

const reviews: ReviewItem[] = [
  {
    id: "THR-2024-0847",
    title: "Lateral Movement Chain",
    severity: "High",
    severityClass: "bg-nw-high/20 text-nw-high",
    confidence: 87,
    attackPhase: "Lateral Movement",
    markedBy: "analyst@company.com",
    markedAgo: "2 hours ago",
    reason: "This is a known IT maintenance window for WS-042. The admin RDP pattern is expected every Tuesday night between 01:00-04:00 UTC.",
    status: "Pending",
  },
  {
    id: "THR-2024-0839",
    title: "Admin RDP Session",
    severity: "Low",
    severityClass: "bg-nw-low/20 text-nw-low",
    confidence: 31,
    attackPhase: "Lateral Movement",
    markedBy: "junior.analyst@company.com",
    markedAgo: "5 hours ago",
    reason: "SRV-004 is managed by john.doe (IT admin). Multi-host RDP is expected behavior for his role. Verified against the admin access matrix.",
    status: "Pending",
  },
  {
    id: "THR-2024-0835",
    title: "Backup Transfer Alert",
    severity: "Medium",
    severityClass: "bg-nw-medium/20 text-nw-medium",
    confidence: 45,
    attackPhase: "Data Exfiltration",
    markedBy: "ops.team@company.com",
    markedAgo: "1 day ago",
    reason: "Nightly backup schedule runs at 02:00 UTC. The 4.2GB transfer from FS-001 to BACKUP-NAS matches the expected backup volume within 5% tolerance.",
    status: "Pending",
  },
];

const tabs: { label: string; value: ReviewStatus | "All" }[] = [
  { label: "Pending", value: "Pending" },
  { label: "Confirmed", value: "Confirmed" },
  { label: "Rejected", value: "Rejected" },
  { label: "All", value: "All" },
];

export default function ReviewQueue() {
  const [activeTab, setActiveTab] = useState<ReviewStatus | "All">("Pending");
  const navigate = useNavigate();

  const filtered = activeTab === "All" ? reviews : reviews.filter((r) => r.status === activeTab);
  const pendingCount = reviews.filter((r) => r.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Review Queue</h1>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === tab.value
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.value === "Pending" && (
                <span className="h-5 min-w-[20px] rounded-full bg-nw-amber text-[10px] font-bold flex items-center justify-center text-background px-1">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-col lg:flex-row gap-5">
              {/* Left */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{r.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.severityClass}`}>{r.severity}</span>
                  <span className="text-xs font-mono text-muted-foreground">{r.confidence}%</span>
                  <span className="text-xs text-muted-foreground">· {r.attackPhase}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Marked by <span className="font-mono text-foreground">{r.markedBy}</span> — {r.markedAgo}
                </p>
                <blockquote className="border-l-2 border-border pl-4 text-sm text-muted-foreground italic leading-relaxed">
                  "{r.reason}"
                </blockquote>
                <button
                  onClick={() => navigate("/threats/" + r.id)}
                  className="text-xs text-primary hover:underline"
                >
                  View Threat →
                </button>
              </div>

              {/* Right: Actions */}
              <div className="flex lg:flex-col gap-2 shrink-0">
                <button className="px-4 py-2 rounded-md border border-nw-green/40 text-nw-green text-sm font-medium hover:bg-nw-green/10 transition-colors whitespace-nowrap">
                  Confirm False Positive
                </button>
                <button className="px-4 py-2 rounded-md border border-nw-red/40 text-nw-red text-sm font-medium hover:bg-nw-red/10 transition-colors whitespace-nowrap">
                  Reject — Re-escalate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
