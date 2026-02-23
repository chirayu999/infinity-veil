import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReviewAction, useReviewQueue } from "@/hooks/useReviewQueue";
import ReviewModal from "@/components/ReviewModal";

type ReviewStatus = "pending" | "confirmed_fp" | "rejected_fp" | "all";

const tabs: { label: string; value: ReviewStatus }[] = [
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed_fp" },
  { label: "Rejected", value: "rejected_fp" },
  { label: "All", value: "all" },
];

const severityClassMap: Record<string, string> = {
  critical: "bg-nw-critical/20 text-nw-critical",
  high: "bg-nw-high/20 text-nw-high",
  medium: "bg-nw-medium/20 text-nw-medium",
  low: "bg-nw-low/20 text-nw-low",
};

function titleize(text: string) {
  return text
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ReviewQueue() {
  const [activeTab, setActiveTab] = useState<ReviewStatus>("pending");
  const [selectedReview, setSelectedReview] = useState<{
    id: string;
    status: "confirmed_fp" | "rejected_fp";
  } | null>(null);

  const navigate = useNavigate();
  const reviewAction = useReviewAction();
  const { data, isLoading, isError, error } = useReviewQueue({
    review_status: activeTab === "all" ? undefined : activeTab,
    page: 1,
    per_page: 25,
  });

  const reviews = data?.review_queue_items ?? [];

  const pendingCount = reviews.filter((r) => r.review_status === "pending").length;

  const submitReviewAction = async (reviewNotes: string) => {
    if (!selectedReview) return;
    await reviewAction.mutateAsync({
      id: selectedReview.id,
      review_status: selectedReview.status,
      review_notes: reviewNotes || undefined,
    });
    setSelectedReview(null);
  };

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
              {tab.value === "pending" && (
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
        {isLoading && <p className="text-sm text-muted-foreground">Loading review queue...</p>}
        {isError && <p className="text-sm text-nw-red">{error instanceof Error ? error.message : "Failed to load review queue"}</p>}
        {!isLoading && !isError && reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">No review items found</p>
        )}
        {!isLoading && !isError && reviews.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-col lg:flex-row gap-5">
              {/* Left */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{r.threat.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityClassMap[r.threat.severity] ?? "bg-secondary text-secondary-foreground"}`}>
                    {titleize(r.threat.severity)}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{r.threat.confidence_score}%</span>
                  <span className="text-xs text-muted-foreground">· {titleize(r.threat.attack_phase)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Marked by <span className="font-mono text-foreground">{r.marked_by}</span>
                </p>
                <blockquote className="border-l-2 border-border pl-4 text-sm text-muted-foreground italic leading-relaxed">
                  "{r.reason}"
                </blockquote>
                <button
                  onClick={() => navigate("/threats/" + r.threat.id)}
                  className="text-xs text-primary hover:underline"
                >
                  View Threat →
                </button>
              </div>

              {/* Right: Actions */}
              <div className="flex lg:flex-col gap-2 shrink-0">
                <button
                  onClick={() => setSelectedReview({ id: r.id, status: "confirmed_fp" })}
                  className="px-4 py-2 rounded-md border border-nw-green/40 text-nw-green text-sm font-medium hover:bg-nw-green/10 transition-colors whitespace-nowrap"
                >
                  Confirm False Positive
                </button>
                <button
                  onClick={() => setSelectedReview({ id: r.id, status: "rejected_fp" })}
                  className="px-4 py-2 rounded-md border border-nw-red/40 text-nw-red text-sm font-medium hover:bg-nw-red/10 transition-colors whitespace-nowrap"
                >
                  Reject — Re-escalate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ReviewModal
        open={selectedReview !== null}
        title={selectedReview?.status === "confirmed_fp" ? "Confirm False Positive" : "Reject and Re-escalate"}
        submitLabel={selectedReview?.status === "confirmed_fp" ? "Confirm" : "Reject"}
        isSubmitting={reviewAction.isPending}
        onClose={() => setSelectedReview(null)}
        onSubmit={submitReviewAction}
      />
    </div>
  );
}
