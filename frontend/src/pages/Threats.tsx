import { useMemo, useState } from "react";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useThreats } from "@/hooks/useThreats";
import { useTriggerHunt } from "@/hooks/useHunts";

const statusColors: Record<string, string> = {
  new: "bg-nw-blue",
  investigating: "bg-nw-amber",
  confirmed: "bg-nw-purple",
  false_positive_pending: "bg-muted-foreground",
  false_positive_confirmed: "bg-muted-foreground",
  escalated: "bg-nw-red",
  resolved: "bg-nw-green",
};

const severityColors: Record<string, string> = {
  critical: "bg-nw-critical/20 text-nw-critical",
  high: "bg-nw-high/20 text-nw-high",
  medium: "bg-nw-medium/20 text-nw-medium",
  low: "bg-nw-low/20 text-nw-low",
};

function confidenceColor(c: number) {
  if (c > 85) return "bg-nw-red";
  if (c >= 40) return "bg-nw-amber";
  return "bg-nw-green";
}

function titleize(text: string) {
  return text
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAssetSummary(hosts: string[]) {
  if (hosts.length === 0) return "—";
  if (hosts.length === 1) return hosts[0];
  return `${hosts[0]} +${hosts.length - 1}`;
}

function formatDetectedAt(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${Math.max(diffHours, 1)}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function Threats() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [confidenceMin, setConfidenceMin] = useState("");
  const [confidenceMax, setConfidenceMax] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filters = useMemo(() => {
    return {
      status: statusFilter || undefined,
      severity: severityFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      confidence_min: confidenceMin ? Number(confidenceMin) : undefined,
      confidence_max: confidenceMax ? Number(confidenceMax) : undefined,
      search: search || undefined,
      page,
      per_page: perPage,
    };
  }, [statusFilter, severityFilter, dateFrom, dateTo, confidenceMin, confidenceMax, search, page]);

  const { data, isLoading, isError, error } = useThreats(filters);
  const triggerHunt = useTriggerHunt();

  const threats = data?.threats ?? [];
  const meta = data?.meta;
  const totalPages = meta?.total_pages ?? 1;
  const currentPage = meta?.current_page ?? page;
  const totalCount = meta?.total_count ?? threats.length;
  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const pageEnd = Math.min(currentPage * perPage, totalCount);

  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const handleTriggerHunt = async () => {
    try {
      await triggerHunt.mutateAsync();
    } catch {
      // error toast already handled by useTriggerHunt onError
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Threats</h1>
        <button
          onClick={handleTriggerHunt}
          disabled={triggerHunt.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          {triggerHunt.isPending ? "Triggering..." : "Trigger Hunt"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          className="bg-secondary text-secondary-foreground border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="investigating">Investigating</option>
          <option value="confirmed">Confirmed</option>
          <option value="false_positive_pending">False Positive Pending</option>
          <option value="false_positive_confirmed">False Positive Confirmed</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => handleFilterChange(setSeverityFilter, e.target.value)}
          className="bg-secondary text-secondary-foreground border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => handleFilterChange(setDateFrom, e.target.value)}
          className="bg-secondary text-secondary-foreground border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => handleFilterChange(setDateTo, e.target.value)}
          className="bg-secondary text-secondary-foreground border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="number"
          min={0}
          max={100}
          placeholder="Min confidence"
          value={confidenceMin}
          onChange={(e) => handleFilterChange(setConfidenceMin, e.target.value)}
          className="bg-secondary text-secondary-foreground border border-border rounded-md px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-32"
        />
        <input
          type="number"
          min={0}
          max={100}
          placeholder="Max confidence"
          value={confidenceMax}
          onChange={(e) => handleFilterChange(setConfidenceMax, e.target.value)}
          className="bg-secondary text-secondary-foreground border border-border rounded-md px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-32"
        />

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search threats..."
            value={search}
            onChange={(e) => handleFilterChange(setSearch, e.target.value)}
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
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Loading threats...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-nw-red">
                  {error instanceof Error ? error.message : "Failed to load threats"}
                </td>
              </tr>
            )}
            {!isLoading && !isError && threats.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No threats found for current filters
                </td>
              </tr>
            )}
            {!isLoading &&
              !isError &&
              threats.map((t) => {
                const hosts = (t.affected_assets || [])
                  .map((asset) => asset.host)
                  .filter((value): value is string => Boolean(value));
                return (
                  <tr
                    key={t.id}
                    onClick={() => navigate("/threats/" + t.id)}
                    className="border-b border-border last:border-0 hover:bg-accent/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusColors[t.status] || "bg-muted-foreground"}`} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{t.title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${severityColors[t.severity] || "bg-secondary text-foreground"}`}>
                        {titleize(t.severity)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground">{t.confidence_score}%</span>
                        <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${confidenceColor(t.confidence_score)}`} style={{ width: `${t.confidence_score}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{titleize(t.attack_phase)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatAssetSummary(hosts)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDetectedAt(t.detected_at)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {pageStart}-{pageEnd} of {totalCount} threats</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium">{currentPage}</span>
          <span className="px-3 py-1 rounded text-xs">/ {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
