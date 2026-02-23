# frozen_string_literal: true

# Simulates automatic response actions for high-confidence threats.
# In a real deployment these would call external APIs (EDR isolation, ticketing).
# For the hackathon, we write the actions to the threat record and broadcast the update.
#
# Replaces the original WorkflowStatusJob from the LLD (Elastic Workflows removed).
# Enqueued by HuntOrchestratorService after high-confidence threats are detected.

class AutoActionsJob
  include Sidekiq::Job

  sidekiq_options queue: "default", retry: 5

  # @param threat_id [String] UUID of the Threat record
  def perform(threat_id)
    threat = Threat.find(threat_id)

    # Build simulated auto-actions based on threat severity and attack phase
    actions = build_auto_actions(threat)
    return if actions.empty?

    # Mark all actions as completed (simulated)
    completed_actions = actions.map do |action|
      action.merge(
        "status"       => "completed",
        "completed_at" => Time.current.iso8601
      )
    end

    threat.update!(auto_actions_taken: completed_actions)

    # Create audit trail entries
    completed_actions.each do |action|
      threat.threat_actions.create!(
        action_type:  action_type_for(action["action"]),
        performed_by: "system",
        notes:        "Auto-action completed: #{action["action"]} on #{action["target"]}"
      )
    end

    Rails.logger.info("AutoActionsJob: #{completed_actions.size} actions completed for threat #{threat_id}")
  rescue ActiveRecord::RecordNotFound
    Rails.logger.error("AutoActionsJob: Threat #{threat_id} not found")
  end

  private

  def build_auto_actions(threat)
    actions = []

    hosts = (threat.affected_assets || [])
      .map { |a| a["host"] }.compact.first(2)

    # Isolate the first host involved in initial compromise
    if hosts.any? && threat.attack_phase.in?(%w[initial_compromise lateral_movement])
      actions << {
        "action" => "isolate_host",
        "target" => hosts.first,
        "status" => "pending"
      }
    end

    # Create incident ticket for critical/high severity
    if threat.severity.in?(%w[critical high])
      ticket_id = "INC-#{Time.current.year}-#{SecureRandom.random_number(9999).to_s.rjust(4, "0")}"
      actions << {
        "action"    => "create_ticket",
        "target"    => ticket_id,
        "ticket_id" => ticket_id,
        "status"    => "pending"
      }
    end

    # Block attacker IP for data exfiltration
    if threat.attack_phase == "data_exfiltration"
      actions << {
        "action" => "block_ip",
        "target" => "suspicious_exfil_ip",
        "status" => "pending"
      }
    end

    actions
  end

  def action_type_for(action_name)
    case action_name
    when "isolate_host"  then "auto_isolated"
    when "block_ip"      then "auto_blocked"
    when "create_ticket" then "auto_ticket_created"
    else "note_added"
    end
  end
end

