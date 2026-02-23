# frozen_string_literal: true

# Handles the full false-positive lifecycle:
#   mark_as_false_positive  → analyst marks a threat as likely FP
#   confirm_false_positive  → senior analyst confirms + creates ExceptionPattern
#   reject_false_positive   → senior analyst rejects + re-escalates threat
#
# Called by ThreatActionsController and ReviewQueueController.

class FalsePositiveService
  # Mark a threat as a potential false positive.
  #
  # @param threat [Threat]
  # @param marked_by [String] Analyst email
  # @param reason [String] Why the analyst believes it's a FP
  # @return [ReviewQueueItem]
  def mark_as_false_positive(threat, marked_by:, reason:)
    ActiveRecord::Base.transaction do
      threat.update!(status: "false_positive_pending")

      threat.threat_actions.create!(
        action_type:  "marked_false_positive",
        performed_by: marked_by,
        notes:        reason
      )

      ReviewQueueItem.create!(
        threat:        threat,
        marked_by:     marked_by,
        reason:        reason,
        review_status: "pending"
      )
    end
  end

  # Senior analyst confirms the false positive.
  # Creates an ExceptionPattern so agents learn from it.
  #
  # @param review_item [ReviewQueueItem]
  # @param reviewed_by [String] Senior analyst email
  # @param review_notes [String, nil]
  # @return [ExceptionPattern]
  def confirm_false_positive(review_item, reviewed_by:, review_notes: nil)
    ActiveRecord::Base.transaction do
      threat = review_item.threat

      review_item.update!(
        review_status: "confirmed_fp",
        reviewed_by:   reviewed_by,
        review_notes:  review_notes,
        reviewed_at:   Time.current
      )

      threat.update!(status: "false_positive_confirmed")

      threat.threat_actions.create!(
        action_type:  "fp_review_confirmed",
        performed_by: reviewed_by,
        notes:        review_notes || "False positive confirmed by senior review"
      )

      exception = ExceptionPattern.create!(
        source_threat: threat,
        pattern_type:  derive_pattern_type(threat),
        description:   "Auto-generated from confirmed FP: #{threat.title}. #{review_notes}".strip,
        esql_exclusion: derive_esql_exclusion(threat),
        active:        true
      )

      # Sync to Elasticsearch threat-intel index (async)
      SyncExceptionToElasticsearchJob.perform_async(exception.id)

      exception
    end
  end

  # Senior analyst rejects the false positive claim.
  # Re-escalates the threat for investigation.
  #
  # @param review_item [ReviewQueueItem]
  # @param reviewed_by [String]
  # @param review_notes [String, nil]
  def reject_false_positive(review_item, reviewed_by:, review_notes: nil)
    ActiveRecord::Base.transaction do
      threat = review_item.threat

      review_item.update!(
        review_status: "rejected_fp",
        reviewed_by:   reviewed_by,
        review_notes:  review_notes,
        reviewed_at:   Time.current
      )

      threat.update!(status: "investigating")

      threat.threat_actions.create!(
        action_type:  "fp_review_rejected",
        performed_by: reviewed_by,
        notes:        review_notes || "False positive claim rejected. Threat re-escalated."
      )

      # Re-notify via Slack
      SlackNotificationJob.perform_async(threat.id)
    end
  end

  private

  def derive_pattern_type(threat)
    phase  = threat.attack_phase || "unknown"
    assets = (threat.affected_assets || []).map { |a| a["host"] || a["user"] }.compact
    "#{phase}_#{assets.first || "general"}_fp_pattern"
  end

  def derive_esql_exclusion(threat)
    assets = (threat.affected_assets || []).map { |a| a["host"] || a["user"] }.compact
    return nil if assets.empty?

    hosts = assets.select { |a| a.match?(/^(WS|SRV|FS|DB)-/i) }
    users = assets.reject { |a| a.match?(/^(WS|SRV|FS|DB)-/i) }

    clauses = []
    clauses << "host.name IN (#{hosts.map { |h| "'#{h}'" }.join(", ")})" if hosts.any?
    clauses << "user.name IN (#{users.map { |u| "'#{u}'" }.join(", ")})" if users.any?

    clauses.any? ? "NOT (#{clauses.join(" AND ")})" : nil
  end
end

