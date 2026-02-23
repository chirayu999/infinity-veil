# frozen_string_literal: true

# Marks any hunt that has been stuck in "running" for more than 30 minutes as
# "failed". Runs every 10 minutes via Sidekiq-Cron (see config/schedule.yml).
#
# A hunt is considered stale when:
#   COALESCE(started_at, created_at) < 30 minutes ago AND status = 'running'

class StaleHuntCleanupJob
  include Sidekiq::Job

  sidekiq_options queue: "low", retry: 0

  TIMEOUT_MINUTES = 30

  def perform
    cutoff = TIMEOUT_MINUTES.minutes.ago

    stale = HuntCycle
      .where(status: "running")
      .where("COALESCE(started_at, created_at) < ?", cutoff)

    count = stale.count
    return if count.zero?

    stale.update_all(status: "failed", completed_at: Time.current)

    Rails.logger.warn(
      "StaleHuntCleanupJob: marked #{count} stale hunt(s) as failed " \
      "(stuck > #{TIMEOUT_MINUTES} min)"
    )
  end
end
