# frozen_string_literal: true

# Daily analysis of false positive patterns (runs at 2:00 AM, see config/schedule.yml).
# Scans confirmed FPs over the last 30 days to identify recurring patterns and
# suggests new exception rules. New patterns are created as inactive so analysts can review.

class FalsePositiveAnalysisJob
  include Sidekiq::Job

  sidekiq_options queue: "low", retry: 3

  MIN_OCCURRENCES = 3  # Need at least this many to flag a recurring pattern

  def perform
    Rails.logger.info("FalsePositiveAnalysisJob starting")

    confirmed_fps = Threat
      .where(status: "false_positive_confirmed")
      .where(updated_at: 30.days.ago..)
      .includes(:review_queue_item)

    if confirmed_fps.empty?
      Rails.logger.info("FalsePositiveAnalysisJob: no confirmed FPs in last 30 days")
      return
    end

    patterns_by_phase = confirmed_fps.group_by(&:attack_phase)

    patterns_by_phase.each do |phase, threats|
      next if phase.blank?
      next if threats.size < MIN_OCCURRENCES

      pattern_type = "recurring_fp_#{phase}"

      # Skip if a pattern already covers this
      next if ExceptionPattern.active.where(pattern_type: pattern_type).exists?

      ExceptionPattern.create!(
        pattern_type: pattern_type,
        description:  "Auto-detected recurring false positive pattern: #{threats.size} confirmed " \
                      "FPs for '#{phase}' in the last 30 days. Review and add ES|QL exclusion.",
        esql_exclusion: nil,  # Left blank for analyst to fill in
        active: false         # Inactive until analyst reviews and enables
      )

      Rails.logger.info(
        "FalsePositiveAnalysisJob: New recurring pattern suggested for #{phase} " \
        "(#{threats.size} occurrences)"
      )
    end

    Rails.logger.info("FalsePositiveAnalysisJob complete")
  end
end

