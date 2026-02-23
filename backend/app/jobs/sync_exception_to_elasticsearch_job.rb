# frozen_string_literal: true

# Syncs a confirmed exception pattern to the Elasticsearch threat-intel index.
# This makes the pattern available to agents for exclusion during future hunts.
#
# Enqueued by FalsePositiveService#confirm_false_positive.
#
# NOTE: Full implementation requires creating a dedicated ES index
# (e.g., nightwatch-exception-patterns) and updating agent system prompts
# to query it via an ES|QL tool. For now, this is a stub that logs the action.

class SyncExceptionToElasticsearchJob
  include Sidekiq::Job

  sidekiq_options queue: "low", retry: 3

  # @param exception_pattern_id [String] UUID of the ExceptionPattern record
  def perform(exception_pattern_id)
    pattern = ExceptionPattern.find(exception_pattern_id)

    # TODO: Implement full ES sync when nightwatch-exception-patterns index is ready.
    # Example:
    #   client = Elasticsearch::Client.new(...)
    #   client.index(
    #     index: "nightwatch-exception-patterns",
    #     id:    pattern.id,
    #     body: {
    #       pattern_type:   pattern.pattern_type,
    #       description:    pattern.description,
    #       esql_exclusion: pattern.esql_exclusion,
    #       active:         pattern.active,
    #       created_at:     pattern.created_at.iso8601
    #     }
    #   )

    Rails.logger.info(
      "SyncExceptionToElasticsearchJob: Pattern #{pattern.id} " \
      "(#{pattern.pattern_type}) ready for ES sync — stub implementation"
    )
  rescue ActiveRecord::RecordNotFound
    Rails.logger.error("SyncExceptionToElasticsearchJob: ExceptionPattern #{exception_pattern_id} not found")
  end
end

