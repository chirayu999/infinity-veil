# frozen_string_literal: true

# Processes Slack interactive message button callbacks.
# Called by SlackController which returns 200 immediately to Slack (3-second limit),
# then this job handles the actual business logic asynchronously.

class SlackInteractionJob
  include Sidekiq::Job

  sidekiq_options queue: "default", retry: 3

  # @param payload [Hash] The parsed Slack interaction payload
  def perform(payload)
    action = payload.dig("actions", 0)
    return unless action

    threat_id  = action["value"]
    action_id  = action["action_id"]
    user_email = payload.dig("user", "name") || "slack_user"

    threat = Threat.find(threat_id)

    case action_id
    when "acknowledge_threat"
      threat.update!(status: "investigating")
      threat.threat_actions.create!(
        action_type:  "acknowledged",
        performed_by: user_email,
        notes:        "Acknowledged via Slack"
      )
      Rails.logger.info("SlackInteractionJob: Threat #{threat_id} acknowledged by #{user_email}")

    when "mark_false_positive"
      FalsePositiveService.new.mark_as_false_positive(
        threat,
        marked_by: user_email,
        reason:    "Marked as false positive via Slack button (no detailed reason provided)"
      )
      Rails.logger.info("SlackInteractionJob: Threat #{threat_id} marked as FP by #{user_email}")

    else
      Rails.logger.warn("SlackInteractionJob: Unknown action_id '#{action_id}'")
    end

  rescue ActiveRecord::RecordNotFound
    Rails.logger.error("SlackInteractionJob: Threat #{threat_id} not found")
  end
end

