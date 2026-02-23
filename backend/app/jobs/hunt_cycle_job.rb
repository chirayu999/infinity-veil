# frozen_string_literal: true

# Triggered by Sidekiq-Cron every 15 minutes (see config/schedule.yml).
# Can also be enqueued manually from HuntsController.

class HuntCycleJob
  include Sidekiq::Job

  sidekiq_options queue: "critical", retry: 3

  # @param triggered_by   [String]      "scheduled" or "manual"
  # @param custom_query   [String, nil] Optional context for the COMMANDER agent
  # @param hunt_cycle_id  [String, nil] Existing HuntCycle UUID to update in-place
  def perform(triggered_by = "scheduled", custom_query = nil, hunt_cycle_id = nil)
    Rails.logger.info("HuntCycleJob starting — triggered_by: #{triggered_by}, hunt_cycle_id: #{hunt_cycle_id}")

    HuntOrchestratorService.new.call(
      triggered_by:  triggered_by,
      custom_query:  custom_query,
      hunt_cycle_id: hunt_cycle_id
    )
  end
end

