import { useState } from "react";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Severity = "Critical" | "High" | "Medium" | "Low";
type Status = "New" | "Investigating" | "Escalated" | "Resolved" | "False Positive";

interface Threat {
  id: string;
  status: Status;
  title: string;
  severity: Severity;
  confidence: number;
  attackPhase: string;
  assets: string;
  detected: string;
}

const threats: Threat[] = [
  { id: "THR-2024-0847", status: "New", title: "Lateral Movement Chain", severity: "High", confidence: 87, attackPhase: "Lateral Movement", assets: "WS-042 +3", detected: "2h ago" },
  { id: "THR-2024-0846", status: "Investigating", title: "Brute Force from External IP", severity: "Critical", confidence: 94, attackPhase: "Initial Compromise", assets: "SRV-003", detected: "4h ago" },
  { id: "THR-2024-0845", status: "Escalated", title: "DNS Tunneling Exfiltration", severity: "High", confidence: 78, attackPhase: "Data Exfiltration", assets: "FS-001", detected: "6h ago" },
  { id: "THR-2024-0842", status: "Resolved", title: "Suspicious PowerShell Execution", severity: "Medium", confidence: 52, attackPhase: "Initial Compromise", assets: "WS-015", detected: "1d ago" },
  { id: "THR-2024-0839", status: "False Positive", title: "Admin RDP Session", severity: "Low", confidence: 31, attackPhase: "Lateral Movement", assets: "SRV-004", detected: "2d ago" },
  { id: "THR-2024-0838", status: "New", title: "Cobalt Strike Beacon Detected", severity: "Critical", confidence: 96, attackPhase: "Command & Control", assets: "WS-088 +2", detected: "3d ago" },
];

const statusColors: Record<Status, string> = {
  New: "bg-nw-blue",
  Investigating: "bg-nw-amber",
  Escalated: "bg-nw-red",
  Resolved: "bg-nw-green",
  "False Positive": "bg-muted-foreground",
};

const severityColors: Record<Severity, string> = {
  Critical: "bg-nw-critical/20 text-nw-critical",
  High: "bg-nw-high/20 text-nw-high",
  Medium: "bg-nw-medium/20 text-nw-medium",
  Low: "bg-nw-low/20 text-nw-low",
};

function confidenceColor(c: number) {
  if (c > 85) return "bg-nw-red";
  if (c >= 40) return "bg-nw-amber";
  return "bg-nw-green";
}

export default function Threats() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = threats.filter((t) => {
    if (statusFilter !== "All" && t.status !== statusFilter) return false;
    if (severityFilter !== "All" && t.severity !== severityFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Threats</h1>
        <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Trigger Hunt
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-secondary text-secondary-foreground border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {["All", "New", "Investigating", "Confirmed", "Escalated", "Resolved"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-secondary text-secondary-foreground border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {["All", "Critical", "High", "Medium", "Low"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search threats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-secondary text-secondary-foreground border border-border rounded-md pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-60"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Severity</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Confidence</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Attack Phase</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Assets</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Detected</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={t.id}
                onClick={() => navigate("/threats/" + t.id)}
                className="border-b border-border last:border-0 hover:bg-accent/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusColors[t.status]}`} />
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{t.title}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${severityColors[t.severity]}`}>
                    {t.severity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground">{t.confidence}%</span>
                    <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full ${confidenceColor(t.confidence)}`} style={{ width: `${t.confidence}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.attackPhase}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.assets}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.detected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing 1–{filtered.length} of 112 threats</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded hover:bg-accent transition-colors"><ChevronLeft className="h-4 w-4" /></button>
          <span className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium">1</span>
          <span className="px-3 py-1 rounded hover:bg-accent cursor-pointer text-xs">2</span>
          <span className="px-3 py-1 rounded hover:bg-accent cursor-pointer text-xs">3</span>
          <button className="p-1.5 rounded hover:bg-accent transition-colors"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
