import { useState } from "react";
import { Check, X, Loader2, Plus, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHunts, useTriggerHunt } from "@/hooks/useHunts";
import type { HuntFilters } from "@/types";

interface HuntRow {
  id: string;
  status: "running" | "completed" | "failed" | "queued";
  trigger: "scheduled" | "manual";
  threats: number | null;
  avgConfidence: number | null;
  duration: string | null;
  startedAt: string;
}

const DEFAULT_FILTERS: Omit<HuntFilters, "page" | "per_page"> = {
  status: "",
  triggered_by: "",
  date_from: "",
  date_to: "",
  sort_by: "started_at",
  sort_order: "desc",
};

function StatusIcon({ status }: { status: HuntRow["status"] }) {
  if (status === "running" || status === "queued") return <Loader2 className="h-4 w-4 text-nw-blue animate-spin" />;
  if (status === "completed") return <Check className="h-4 w-4 text-nw-green" />;
  return <X className="h-4 w-4 text-nw-red" />;
}

function confidenceColor(c: number) {
  if (c > 85) return "text-nw-red";
  if (c >= 40) return "text-nw-amber";
  return "text-nw-green";
}

function titleize(text: string) {
  return text
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDuration(startedAt: string, completedAt: string | null) {
  if (!completedAt) return null;
  const started = new Date(startedAt).getTime();
  const ended = new Date(completedAt).getTime();
  if (Number.isNaN(started) || Number.isNaN(ended)) return null;
  const totalSec = Math.max(0, Math.floor((ended - started) / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${String(sec).padStart(2, "0")}s`;
}

function SortIcon({ col, sortBy, sortOrder }: { col: string; sortBy: string; sortOrder: string }) {
  if (sortBy !== col) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 inline ml-1" />;
  return sortOrder === "asc"
    ? <ChevronUp className="h-3.5 w-3.5 text-primary inline ml-1" />
    : <ChevronDown className="h-3.5 w-3.5 text-primary inline ml-1" />;
}

const selectClass =
  "h-8 rounded-md border border-border bg-card px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

const inputClass =
  "h-8 rounded-md border border-border bg-card px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

export default function HuntHistory() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [filters, setFilters] = useState<Omit<HuntFilters, "page" | "per_page">>(DEFAULT_FILTERS);

  const { data, isLoading, isError, error } = useHunts({
    ...filters,
    page,
    per_page: perPage,
  });

  const triggerHunt = useTriggerHunt();

  function setFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  function toggleSort(col: "started_at" | "threats_found_count") {
    if (filters.sort_by === col) {
      setFilter("sort_order", filters.sort_order === "asc" ? "desc" : "asc");
    } else {
      setFilters((prev) => ({ ...prev, sort_by: col, sort_order: "desc" }));
      setPage(1);
    }
  }

  const hunts: HuntRow[] = (data?.hunt_cycles ?? []).map((hunt) => ({
    id: hunt.id,
    status: hunt.status,
    trigger: hunt.triggered_by,
    threats: hunt.threats_found_count,
    avgConfidence: null,
    duration: formatDuration(hunt.started_at, hunt.completed_at),
    startedAt: hunt.started_at,
  }));

  const meta = data?.meta;
  const currentPage = meta?.current_page ?? page;
  const totalPages = meta?.total_pages ?? 1;
  const totalCount = meta?.total_count ?? hunts.length;
  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const pageEnd = Math.min(currentPage * perPage, totalCount);
  const isRunning = hunts.some((h) => h.status === "running" || h.status === "queued");

  const hasActiveFilters =
    !!filters.status ||
    !!filters.triggered_by ||
    !!filters.date_from ||
    !!filters.date_to ||
    filters.sort_by !== DEFAULT_FILTERS.sort_by ||
    filters.sort_order !== DEFAULT_FILTERS.sort_order;

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
        <h1 className="text-xl font-semibold text-foreground">Hunt History</h1>
        <button
          onClick={handleTriggerHunt}
          disabled={triggerHunt.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {triggerHunt.isPending ? "Triggering..." : "Trigger Manual Hunt"}
        </button>
      </div>

      {/* Filter bar */}
      <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-wrap items-end gap-3">
        {/* Status */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
          <select
            className={selectClass}
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">All</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Trigger */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trigger</label>
          <select
            className={selectClass}
            value={filters.triggered_by}
            onChange={(e) => setFilter("triggered_by", e.target.value)}
          >
            <option value="">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {/* Date From */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date From</label>
          <input
            type="date"
            className={inputClass}
            value={filters.date_from}
            onChange={(e) => setFilter("date_from", e.target.value)}
          />
        </div>

        {/* Date To */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date To</label>
          <input
            type="date"
            className={inputClass}
            value={filters.date_to}
            onChange={(e) => setFilter("date_to", e.target.value)}
          />
        </div>

        {/* Sort By */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sort By</label>
          <select
            className={selectClass}
            value={filters.sort_by}
            onChange={(e) => setFilter("sort_by", e.target.value as HuntFilters["sort_by"])}
          >
            <option value="started_at">Started At</option>
            <option value="threats_found_count">Threats Found</option>
          </select>
        </div>

        {/* Sort Order */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order</label>
          <select
            className={selectClass}
            value={filters.sort_order}
            onChange={(e) => setFilter("sort_order", e.target.value as HuntFilters["sort_order"])}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="h-8 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors self-end"
          >
            Clear
          </button>
        )}
      </div>

      {/* Running banner */}
      {isRunning && (
        <div className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-sm text-foreground">Hunt cycle in progress...</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Trigger</th>
              <th
                className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => toggleSort("threats_found_count")}
              >
                Threats Found
                <SortIcon col="threats_found_count" sortBy={filters.sort_by ?? "started_at"} sortOrder={filters.sort_order ?? "desc"} />
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Confidence</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
              <th
                className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => toggleSort("started_at")}
              >
                Started At
                <SortIcon col="started_at" sortBy={filters.sort_by ?? "started_at"} sortOrder={filters.sort_order ?? "desc"} />
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Loading hunts...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-nw-red">
                  {error instanceof Error ? error.message : "Failed to load hunts"}
                </td>
              </tr>
            )}
            {!isLoading && !isError && hunts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No hunts found
                </td>
              </tr>
            )}
            {hunts.map((h) => (
              <tr key={h.id} onClick={() => navigate(`/hunts/${h.id}`)} className="border-b border-border last:border-0 hover:bg-accent/30 cursor-pointer transition-colors">
                <td className="px-4 py-3"><StatusIcon status={h.status} /></td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    h.trigger === "manual" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                    {titleize(h.trigger)}
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
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{new Date(h.startedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {pageStart}-{pageEnd} of {totalCount} hunts</span>
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
