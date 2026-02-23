import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useExceptionPatterns } from "@/hooks/useExceptionPatterns";
import api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { ExceptionPattern } from "@/types";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function titleize(text: string) {
  return text
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ExceptionPatterns() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading, isError, error } = useExceptionPatterns({
    active: activeFilter === "" ? undefined : activeFilter === "true",
    page,
    per_page: perPage,
  });

  const patterns: ExceptionPattern[] = data?.exception_patterns ?? [];
  const meta = data?.meta;
  const totalPages = meta?.total_pages ?? 1;
  const currentPage = meta?.current_page ?? page;
  const totalCount = meta?.total_count ?? patterns.length;
  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const pageEnd = Math.min(currentPage * perPage, totalCount);

  const handleToggleActive = async (pattern: ExceptionPattern) => {
    await api.patch(`/exception_patterns/${pattern.id}`, {
      exception_pattern: { active: !pattern.active },
    });
    queryClient.invalidateQueries({ queryKey: ["exception_patterns"] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Exception Patterns</h1>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {[
            { label: "All", value: "" },
            { label: "Active", value: "true" },
            { label: "Inactive", value: "false" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setActiveFilter(tab.value as "" | "true" | "false");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeFilter === tab.value
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Exception patterns are learned false-positive rules that the AI agents reference to avoid
          re-flagging known-benign activity. They are created automatically when a false positive is confirmed
          in the Review Queue, or can be added manually below.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pattern Type</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ES|QL Exclusion</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Source Threat</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Toggle</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Loading exception patterns...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-nw-red">
                  {error instanceof Error ? error.message : "Failed to load exception patterns"}
                </td>
              </tr>
            )}
            {!isLoading && !isError && patterns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No exception patterns found. They are created automatically when false positives are confirmed.
                </td>
              </tr>
            )}
            {!isLoading &&
              !isError &&
              patterns.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                >
                  {/* Status dot */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          p.active ? "bg-nw-green pulse-dot" : "bg-muted-foreground"
                        }`}
                      />
                      <span className={`text-xs font-medium ${p.active ? "text-nw-green" : "text-muted-foreground"}`}>
                        {p.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>

                  {/* Pattern type */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
                      {titleize(p.pattern_type)}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 text-muted-foreground max-w-xs">
                    <p className="line-clamp-2">{p.description}</p>
                  </td>

                  {/* ES|QL exclusion */}
                  <td className="px-4 py-3 max-w-xs">
                    {p.esql_exclusion ? (
                      <pre className="text-xs font-mono text-muted-foreground truncate max-w-[200px]" title={p.esql_exclusion}>
                        {p.esql_exclusion}
                      </pre>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Not set</span>
                    )}
                  </td>

                  {/* Source threat link */}
                  <td className="px-4 py-3">
                    {p.source_threat_id ? (
                      <button
                        onClick={() => navigate(`/threats/${p.source_threat_id}`)}
                        className="text-xs text-primary hover:underline font-mono"
                      >
                        {p.source_threat_id.slice(0, 8)}…
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Manual</span>
                    )}
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {formatDate(p.created_at)}
                  </td>

                  {/* Toggle button */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void handleToggleActive(p)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        p.active
                          ? "border border-nw-red/40 text-nw-red hover:bg-nw-red/10"
                          : "border border-nw-green/40 text-nw-green hover:bg-nw-green/10"
                      }`}
                    >
                      {p.active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {pageStart}–{pageEnd} of {totalCount} patterns
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium">
              {currentPage}
            </span>
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
      )}
    </div>
  );
}

