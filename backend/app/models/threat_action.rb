# frozen_string_literal: true

class ThreatAction < ApplicationRecord
  # -- Associations --
  belongs_to :threat

  # -- Enums --
  enum :action_type, {
    acknowledged:          "acknowledged",
    investigating:         "investigating",
    confirmed:             "confirmed",
    marked_false_positive: "marked_false_positive",
    escalated:             "escalated",
    resolved:              "resolved",
    auto_isolated:         "auto_isolated",
    auto_blocked:          "auto_blocked",
    auto_ticket_created:   "auto_ticket_created",
    note_added:            "note_added",
    fp_review_confirmed:   "fp_review_confirmed",
    fp_review_rejected:    "fp_review_rejected"
  }

  # -- Validations --
  validates :action_type,   presence: true
  validates :performed_by,  presence: true

  # -- Scopes --
  scope :recent,    -> { order(created_at: :desc) }
  scope :by_system, -> { where(performed_by: "system") }
  scope :by_humans, -> { where.not(performed_by: "system") }

  # -- Callbacks --
  before_create :set_uuid

  private

  def set_uuid
    self.id ||= SecureRandom.uuid
  end
end

