# frozen_string_literal: true

class HuntCycle < ApplicationRecord
  # -- Associations --
  has_many :threats, dependent: :nullify

  # -- Enums --
  enum :status, {
    queued:    "queued",
    running:   "running",
    completed: "completed",
    failed:    "failed"
  }

  enum :triggered_by, {
    scheduled: "scheduled",
    manual:    "manual"
  }, prefix: true

  # -- Validations --
  validates :status, presence: true
  validates :triggered_by, presence: true

  # -- Scopes --
  scope :recent,  -> { order(started_at: :desc) }
  scope :today,   -> { where(started_at: Time.current.beginning_of_day..) }
  scope :running, -> { where(status: "running") }

  # -- Callbacks --
  before_create :set_uuid
  after_update  :broadcast_status_change, if: :saved_change_to_status?

  private

  def set_uuid
    self.id ||= SecureRandom.uuid
  end

  def broadcast_status_change
    ActionCable.server.broadcast("frontend_updates", {
      topic: "hunts",
      query_key: ["hunts"],
      type: "hunt_status_changed",
      hunt: {
        id: id,
        status: status,
        threats_found_count: threats_found_count,
        completed_at: completed_at&.iso8601
      }
    })
  end
end

