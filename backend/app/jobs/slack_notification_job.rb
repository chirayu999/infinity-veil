# frozen_string_literal: true

# Sends a Slack Block Kit threat alert for a high-confidence or re-escalated threat.
# Enqueued by HuntOrchestratorService and FalsePositiveService.

class SlackNotificationJob
  include Sidekiq::Job

  sidekiq_options queue: "default", retry: 5

  # @param threat_id [String] UUID of the Threat record
  def perform(threat_id)
    threat = Threat.find(threat_id)

    # Only notify for actionable threats with meaningful confidence
    unless threat.high_confidence? || threat.status == "escalated"
      Rails.logger.info("SlackNotificationJob skipped for threat #{threat_id} — not high confidence or escalated")
      return
    end

    SlackNotifierService.new.notify(threat)

    threat.threat_actions.create!(
      action_type:  "note_added",
      performed_by: "system",
      notes:        "Slack notification sent to #{SlackNotifierService::CHANNEL}"
    )
  rescue ActiveRecord::RecordNotFound
    Rails.logger.error("SlackNotificationJob: Threat #{threat_id} not found")
  end
end

