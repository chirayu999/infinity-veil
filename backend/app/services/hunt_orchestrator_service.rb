# frozen_string_literal: true

# Orchestrates a complete hunt cycle end-to-end:
#   1. Create HuntCycle record (status: running)
#   2. Call COMMANDER agent via KibanaAgentService
#   3. Parse agent response into Threat records via ThreatBuilderService
#   4. Handle each threat based on confidence level
#   5. Mark HuntCycle as completed (or failed on error)
#
# Called by HuntCycleJob (scheduled every hour + manual triggers).

class HuntOrchestratorService
  def initialize
    @kibana_service  = KibanaAgentService.new
    @threat_builder  = ThreatBuilderService.new
  end

  # Execute a full hunt cycle.
  #
  # @param triggered_by  [String]      "scheduled" or "manual"
  # @param custom_query  [String, nil] Optional extra context for the COMMANDER
  # @param hunt_cycle_id [String, nil] Existing HuntCycle to update instead of creating a new one
  # @return [HuntCycle]
  def call(triggered_by: "scheduled", custom_query: nil, hunt_cycle_id: nil)
    hunt_cycle = if hunt_cycle_id.present?
      HuntCycle.find(hunt_cycle_id).tap do |hc|
        hc.update!(status: "running", started_at: Time.current)
      end
    else
      HuntCycle.create!(
        status:       "running",
        triggered_by: triggered_by,
        started_at:   Time.current
      )
    end

    begin
      # Step 1: Send hunt request to COMMANDER agent
      message = custom_query.present? ? custom_query : nil
      agent_response = @kibana_service.start_hunt(message)

      # Step 2: Parse response into Threat records
      threats = @threat_builder.call(hunt_cycle, agent_response)

      # Step 3: Handle each threat based on confidence
      threats.each { |threat| handle_threat(threat) }

      # Step 4: Complete the hunt cycle
      hunt_cycle.update!(
        status:              "completed",
        completed_at:        Time.current,
        threats_found_count: threats.size,
        agent_summary:       build_summary(agent_response, threats)
      )

    rescue StandardError => e
      hunt_cycle.update!(
        status:        "failed",
        completed_at:  Time.current,
        agent_summary: { error: e.message }
      )
      Rails.logger.error("Hunt cycle #{hunt_cycle.id} failed: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
      raise
    end

    hunt_cycle
  end

  private

  def handle_threat(threat)
    if threat.high_confidence?
      # High confidence: notify Slack + trigger simulated auto-actions
      SlackNotificationJob.perform_async(threat.id)
      AutoActionsJob.perform_in(5.seconds, threat.id)
    end
    # Medium confidence: appears on dashboard, no Slack alert
    # Low confidence: logged only
  end

  def build_summary(agent_response, threats)
    {
      threats_found:      threats.size,
      high_confidence:    threats.count(&:high_confidence?),
      medium_confidence:  threats.count(&:medium_confidence?),
      low_confidence:     threats.count(&:low_confidence?),
      avg_confidence:     threats.any? ? (threats.sum(&:confidence_score) / threats.size) : 0,
      raw_response_preview: agent_response[:response]
    }
  end
end

