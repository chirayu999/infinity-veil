# frozen_string_literal: true

# Sends Slack Block Kit threat alert messages to the #security-ops channel.
# Called by SlackNotificationJob after high-confidence threats are detected.

class SlackNotifierService
  CHANNEL       = ENV.fetch("SLACK_CHANNEL", "#security-ops")
  DASHBOARD_URL = ENV.fetch("NIGHTWATCH_DASHBOARD_URL", "http://localhost:5173")

  def initialize
    @client = Slack::Web::Client.new(token: ENV.fetch("SLACK_BOT_TOKEN", ""))
  end

  # Send a threat alert to Slack.
  #
  # @param threat [Threat]
  def notify(threat)
    @client.chat_postMessage(
      channel: CHANNEL,
      blocks:  build_blocks(threat),
      text:    fallback_text(threat)
    )
  rescue Slack::Web::Api::Errors::SlackError => e
    Rails.logger.error("Slack notification failed for threat #{threat.id}: #{e.message}")
    raise
  end

  private

  SEVERITY_EMOJI = {
    "critical" => ":rotating_light:",
    "high"     => ":warning:",
    "medium"   => ":large_yellow_circle:",
    "low"      => ":information_source:"
  }.freeze

  def build_blocks(threat)
    [
      {
        type: "header",
        text: { type: "plain_text", text: "NIGHTWATCH THREAT ALERT" }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: "*Severity:* #{SEVERITY_EMOJI[threat.severity]} #{threat.severity.upcase}" },
          { type: "mrkdwn", text: "*Confidence:* #{threat.confidence_score}%" }
        ]
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: "*#{threat.title}*\n\n#{threat.description.truncate(500)}" }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: "*Attack Phase:* #{threat.attack_phase&.humanize}" },
          { type: "mrkdwn", text: "*Affected Assets:* #{format_assets(threat.affected_assets)}" }
        ]
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: "*MITRE ATT&CK:* #{(threat.mitre_techniques || []).join(", ")}" }
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: format_agent_consensus(threat.agent_reasoning) }
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: format_auto_actions(threat.auto_actions_taken) }
      },
      { type: "divider" },
      {
        type: "actions",
        block_id: "threat_actions_#{threat.id}",
        elements: [
          {
            type:   "button",
            text:   { type: "plain_text", text: "View Full Investigation" },
            url:    "#{DASHBOARD_URL}/threats/#{threat.id}",
            style:  "primary"
          },
          {
            type:      "button",
            text:      { type: "plain_text", text: "Acknowledge" },
            action_id: "acknowledge_threat",
            value:     threat.id
          },
          {
            type:      "button",
            text:      { type: "plain_text", text: "Mark False Positive" },
            action_id: "mark_false_positive",
            value:     threat.id,
            style:     "danger"
          }
        ]
      }
    ]
  end

  def format_assets(assets)
    return "None identified" if assets.blank?

    assets.map { |a| a["host"] || a["user"] }.compact.first(5).join(", ")
  end

  def format_agent_consensus(reasoning)
    return "*Agent Consensus:* No reasoning data" if reasoning.blank?

    lines = ["*Agent Consensus:*"]
    %w[scanner tracer advocate commander].each do |agent|
      data = reasoning[agent] || reasoning[agent.to_sym]
      next unless data

      finding = data["finding"] || data[:finding] || data["challenge"] || data[:challenge] || ""
      lines << "  #{agent.upcase}: #{finding.truncate(100)}"
    end
    lines.join("\n")
  end

  def format_auto_actions(actions)
    return "*Auto-Actions:* None" if actions.blank?

    lines = ["*Auto-Actions Taken:*"]
    actions.each do |action|
      icon = action["status"] == "completed" ? ":white_check_mark:" : ":hourglass:"
      lines << "  #{icon} #{action["action"]&.humanize} — #{action["target"]}"
    end
    lines.join("\n")
  end

  def fallback_text(threat)
    "NIGHTWATCH Alert: #{threat.title} | Confidence: #{threat.confidence_score}% | Severity: #{threat.severity.upcase}"
  end
end

