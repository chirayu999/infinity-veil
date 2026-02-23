import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ESQLQuery } from "@/types";

interface ESQLQueriesPanelProps {
  queries: ESQLQuery[] | null;
}

export default function ESQLQueriesPanel({ queries }: ESQLQueriesPanelProps) {
  const normalizedQueries = queries ?? [];
  const [open, setOpen] = useState(normalizedQueries.length > 0);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <button
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-foreground">
          ES|QL Queries Used{normalizedQueries.length > 0 ? ` (${normalizedQueries.length})` : ""}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          {normalizedQueries.length === 0 && (
            <p className="text-sm text-muted-foreground">No queries captured.</p>
          )}
          {normalizedQueries.map((query, index) => (
            <div key={`${query.tool}-${index}`} className="rounded-md border border-border bg-secondary/40 p-3">
              <p className="text-xs font-mono text-muted-foreground mb-2">{query.tool}</p>
              <pre className="whitespace-pre-wrap text-xs text-foreground font-mono">{query.query}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

