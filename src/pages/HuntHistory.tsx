import { Check, X, Loader2, Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface HuntRow {
  id: number;
  status: "Running" | "Completed" | "Failed";
  trigger: "Scheduled" | "Manual";
  threats: number | null;
  avgConfidence: number | null;
  duration: string | null;
  startedAt: string;
}

const hunts: HuntRow[] = [
  { id: 1, status: "Running", trigger: "Scheduled", threats: null, avgConfidence: null, duration: null, startedAt: "Feb 9, 14:30" },
  { id: 2, status: "Completed", trigger: "Scheduled", threats: 2, avgConfidence: 72, duration: "3m 24s", startedAt: "Feb 9, 14:15" },
  { id: 3, status: "Completed", trigger: "Scheduled", threats: 0, avgConfidence: null, duration: "2m 11s", startedAt: "Feb 9, 14:00" },
  { id: 4, status: "Completed", trigger: "Manual", threats: 1, avgConfidence: 88, duration: "4m 02s", startedAt: "Feb 9, 13:30" },
  { id: 5, status: "Completed", trigger: "Scheduled", threats: 0, avgConfidence: null, duration: "2m 34s", startedAt: "Feb 9, 13:45" },
  { id: 6, status: "Failed", trigger: "Scheduled", threats: 0, avgConfidence: null, duration: "0m 03s", startedAt: "Feb 9, 13:30" },
];

function StatusIcon({ status }: { status: HuntRow["status"] }) {
  if (status === "Running") return <Loader2 className="h-4 w-4 text-nw-blue animate-spin" />;
  if (status === "Completed") return <Check className="h-4 w-4 text-nw-green" />;
  return <X className="h-4 w-4 text-nw-red" />;
}

function confidenceColor(c: number) {
  if (c > 85) return "text-nw-red";
  if (c >= 40) return "text-nw-amber";
  return "text-nw-green";
}

export default function HuntHistory() {
  const isRunning = hunts.some((h) => h.status === "Running");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Hunt History</h1>
        <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Trigger Manual Hunt
        </button>
      </div>

      {/* Running banner */}
      {isRunning && (
        <div className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-sm text-foreground">Hunt cycle in progress... started 45 seconds ago</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Trigger</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Threats Found</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Confidence</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Started At</th>
            </tr>
          </thead>
          <tbody>
            {hunts.map((h) => (
              <tr key={h.id} className="border-b border-border last:border-0 hover:bg-accent/30 cursor-pointer transition-colors">
                <td className="px-4 py-3"><StatusIcon status={h.status} /></td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    h.trigger === "Manual" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                    {h.trigger}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {h.threats === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className={`font-mono ${h.threats > 0 ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                      {h.threats}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {h.avgConfidence === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className={`font-mono ${confidenceColor(h.avgConfidence)}`}>{h.avgConfidence}%</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{h.duration ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{h.startedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing 1–6 of 48 hunts</span>
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
