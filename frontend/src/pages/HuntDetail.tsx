import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Cpu, CheckCircle2, AlertTriangle, Loader2, Clock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useHunt } from "@/hooks/useHunts";
import type { HuntCycleThreat } from "@/types";

function formatTimestamp(dateString: string | null) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) return "—";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return "—";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function cleanAgentReport(text: string): string {
  return text
    .replace(/^```json[\s\S]*?```\s*/m, "")  // strip leading threats JSON fence
    .replace(/(\w)\|(\w)/g, "$1\\|$2")        // escape word-internal pipes (ES|QL) so GFM tables don't split on them
    .trim();
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-nw-red/20 text-nw-red",
  high: "bg-nw-high/20 text-nw-high",
  medium: "bg-nw-amber/20 text-nw-amber",
  low: "bg-nw-green/20 text-nw-green",
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${SEVERITY_STYLES[severity] ?? "bg-secondary text-secondary-foreground"}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: "bg-nw-blue/20 text-nw-blue",
    running: "bg-nw-amber/20 text-nw-amber",
    completed: "bg-nw-green/20 text-nw-green",
    failed: "bg-nw-red/20 text-nw-red",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${styles[status] ?? "bg-secondary text-secondary-foreground"}`}>
      {status}
    </span>
  );
}

function MiniConfidence({ value }: { value: number }) {
  const color = value >= 80 ? "bg-nw-red" : value >= 60 ? "bg-nw-amber" : "bg-nw-green";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{value}%</span>
    </div>
  );
}

function ThreatRow({ threat, onClick }: { threat: HuntCycleThreat; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-border last:border-0 hover:bg-accent/30 cursor-pointer transition-colors"
    >
      <td className="py-3 pr-4">
        <span className="text-sm text-foreground font-medium line-clamp-1">{threat.title}</span>
      </td>
      <td className="py-3 pr-4 whitespace-nowrap">
        <SeverityBadge severity={threat.severity} />
      </td>
      <td className="py-3 pr-4 whitespace-nowrap">
        <MiniConfidence value={threat.confidence_score} />
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap capitalize">
        {threat.attack_phase?.replace(/_/g, " ") ?? "—"}
      </td>
      <td className="py-3 text-sm text-muted-foreground whitespace-nowrap capitalize">
        {threat.status?.replace(/_/g, " ") ?? "—"}
      </td>
    </tr>
  );
}

export default function HuntDetail() {
  const navigate = useNavigate();
  const { id = "" } = useParams();

  const isInProgress = (status: string) => status === "queued" || status === "running";

  const [refetchInterval, setRefetchInterval] = React.useState<number | undefined>(5000);

  const { data, isLoading, isError, error } = useHunt(id, refetchInterval);

  const huntData = data?.hunt;

  React.useEffect(() => {
    if (huntData && !isInProgress(huntData.status)) {
      setRefetchInterval(undefined);
    }
  }, [huntData]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading hunt details...
      </div>
    );
  }

  if (isError || !huntData) {
    return (
      <div className="space-y-3">
        <button onClick={() => navigate("/hunts")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Hunt History
        </button>
        <p className="text-sm text-nw-red">{error instanceof Error ? error.message : "Hunt not found"}</p>
      </div>
    );
  }

  const summary = huntData.agent_summary;
  const threats = (huntData as typeof huntData & { threats?: HuntCycleThreat[] }).threats ?? [];
  const isRunning = isInProgress(huntData.status);
  const isFailed = huntData.status === "failed";
  const threatsFound = summary?.threats_found ?? threats.length;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate("/hunts")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Hunt History
      </button>

      {/* Summary card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">Hunt Report</h1>
                <StatusBadge status={huntData.status} />
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${huntData.triggered_by === "manual" ? "bg-nw-purple/20 text-nw-purple" : "bg-secondary text-secondary-foreground"}`}>
                  {huntData.triggered_by === "manual" ? "Manual" : "Scheduled"}
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">{huntData.id}</p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Started: <span className="text-foreground">{formatTimestamp(huntData.started_at)}</span>
              </span>
              {huntData.completed_at && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Completed: <span className="text-foreground">{formatTimestamp(huntData.completed_at)}</span>
                </span>
              )}
              <span>
                Duration: <span className="text-foreground">{formatDuration(huntData.started_at, huntData.completed_at)}</span>
              </span>
            </div>
          </div>

          {/* Severity breakdown */}
          {!isRunning && !isFailed && (
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{threatsFound}</p>
                <p className="text-xs text-muted-foreground">Threats Found</p>
              </div>
              {(summary?.high_confidence != null || summary?.medium_confidence != null || summary?.low_confidence != null) && (
                <div className="flex flex-col gap-1 text-xs">
                  {summary?.high_confidence != null && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-nw-high inline-block" />
                      <span className="text-muted-foreground">High confidence:</span>
                      <span className="text-foreground font-medium">{summary.high_confidence}</span>
                    </span>
                  )}
                  {summary?.medium_confidence != null && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-nw-amber inline-block" />
                      <span className="text-muted-foreground">Medium confidence:</span>
                      <span className="text-foreground font-medium">{summary.medium_confidence}</span>
                    </span>
                  )}
                  {summary?.low_confidence != null && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-nw-green inline-block" />
                      <span className="text-muted-foreground">Low confidence:</span>
                      <span className="text-foreground font-medium">{summary.low_confidence}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Running / Queued state */}
      {isRunning && (
        <div className="rounded-lg border border-nw-amber/30 bg-nw-amber/5 p-6 flex items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-nw-amber shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Hunt in progress…</p>
            <p className="text-xs text-muted-foreground mt-0.5">The AI agents are analysing your environment. This page refreshes automatically every 5 seconds.</p>
          </div>
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="rounded-lg border border-nw-red/30 bg-nw-red/5 p-6 flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-nw-red shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-nw-red mb-1">Hunt failed</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {summary?.error ?? "An unexpected error occurred during the hunt cycle."}
            </p>
          </div>
        </div>
      )}

      {/* Agent Report */}
      {!isRunning && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-nw-purple" />
            <h2 className="text-sm font-medium text-foreground">Agent Report</h2>
          </div>

          {/* All clear banner */}
          {!isFailed && threatsFound === 0 && (
            <div className="flex items-center gap-3 rounded-md border border-nw-green/30 bg-nw-green/5 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-nw-green shrink-0" />
              <p className="text-sm font-medium text-nw-green">All Clear — No threats detected in this hunt cycle.</p>
            </div>
          )}

          {summary?.raw_response_preview ? (
            <div className="
              prose prose-sm prose-invert max-w-none
              prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
              prose-h2:text-base prose-h3:text-sm
              prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:my-1
              prose-strong:text-foreground
              prose-ul:text-muted-foreground prose-ol:text-muted-foreground
              prose-li:my-0.5
              prose-table:text-sm prose-table:w-full
              prose-thead:border-b prose-thead:border-border
              prose-th:text-left prose-th:py-2 prose-th:pr-4 prose-th:text-xs prose-th:font-medium prose-th:text-muted-foreground prose-th:uppercase prose-th:tracking-wider
              prose-td:py-2 prose-td:pr-4 prose-td:text-muted-foreground prose-td:border-b prose-td:border-border
              prose-code:text-nw-blue prose-code:bg-secondary prose-code:px-1 prose-code:rounded prose-code:text-xs
              prose-pre:bg-secondary prose-pre:rounded-md prose-pre:p-4
              prose-hr:border-border
              [&>*:first-child]:mt-0
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {cleanAgentReport(summary.raw_response_preview)}
              </ReactMarkdown>
            </div>
          ) : (
            !isFailed && (
              <p className="text-sm text-muted-foreground italic">No agent report available for this hunt.</p>
            )
          )}
        </div>
      )}

      {/* Threats found table */}
      {threats.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-medium text-foreground">
            Threats Found
            <span className="ml-2 px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-mono">{threats.length}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider pr-4">Title</th>
                  <th className="text-left pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider pr-4 whitespace-nowrap">Severity</th>
                  <th className="text-left pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider pr-4 whitespace-nowrap">Confidence</th>
                  <th className="text-left pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider pr-4 whitespace-nowrap">Attack Phase</th>
                  <th className="text-left pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {threats.map((t) => (
                  <ThreatRow key={t.id} threat={t} onClick={() => navigate(`/threats/${t.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
