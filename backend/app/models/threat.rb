# frozen_string_literal: true

class Threat < ApplicationRecord
  # -- Associations --
  belongs_to :hunt_cycle, optional: true
  has_many   :threat_actions, dependent: :destroy
  has_one    :review_queue_item, dependent: :destroy
  has_one    :exception_pattern, foreign_key: :source_threat_id, dependent: :nullify

  # -- Enums --
  enum :severity, {
    critical: "critical",
    high:     "high",
    medium:   "medium",
    low:      "low"
  }

  enum :status, {
    new_threat:               "new",
    investigating:            "investigating",
    confirmed:                "confirmed",
    false_positive_pending:   "false_positive_pending",
    false_positive_confirmed: "false_positive_confirmed",
    escalated:                "escalated",
    resolved:                 "resolved"
  }

  enum :attack_phase, {
    initial_compromise:   "initial_compromise",
    lateral_movement:     "lateral_movement",
    privilege_escalation: "privilege_escalation",
    data_exfiltration:    "data_exfiltration",
    persistence:          "persistence",
    multi_phase:          "multi_phase"
  }, prefix: true

  # -- Validations --
  validates :title,            presence: true
  validates :description,      presence: true
  validates :confidence_score, presence: true, numericality: { in: 0..100 }
  validates :severity,         presence: true
  validates :status,           presence: true
  validates :detected_at,      presence: true

  # -- Scopes --
  scope :recent,         -> { order(detected_at: :desc) }
  scope :today,          -> { where(detected_at: Time.current.beginning_of_day..) }
  scope :high_severity,  -> { where(severity: %w[critical high]) }
  scope :actionable,     -> { where(status: %w[new investigating escalated]) }
  scope :pending_review, -> { where(status: "false_positive_pending") }
  scope :by_confidence,  -> { order(confidence_score: :desc) }
  scope :active,         -> { where.not(status: %w[resolved false_positive_confirmed]) }

  # -- Callbacks --
  before_create  :set_uuid
  after_create   :broadcast_new_threat
  after_create   :increment_hunt_cycle_count
  after_destroy  :decrement_hunt_cycle_count
  after_update   :broadcast_status_change, if: :saved_change_to_status?

  # -- Methods --
  def high_confidence?
    confidence_score >= 70
  end

  def medium_confidence?
    confidence_score.between?(40, 69)
  end

  def low_confidence?
    confidence_score < 40
  end

  def severity_label
    severity.upcase
  end

  private

  def set_uuid
    self.id ||= SecureRandom.uuid
  end

  def increment_hunt_cycle_count
    hunt_cycle&.increment!(:threats_found_count)
  end

  def decrement_hunt_cycle_count
    hunt_cycle&.decrement!(:threats_found_count)
  end

  def broadcast_new_threat
    ActionCable.server.broadcast("frontend_updates", {
      topic: "threats",
      query_key: ["threats"],
      type: "new_threat",
      threat: { id: id, title: title, severity: severity, confidence_score: confidence_score }
    })
    ActionCable.server.broadcast("frontend_updates", {
      topic: "dashboard",
      query_key: ["dashboard"]
    })
  end

  def broadcast_status_change
    ActionCable.server.broadcast("frontend_updates", {
      topic: "threats",
      query_key: ["threats", id],
      type: "threat_updated",
      threat: { id: id, status: status, updated_at: updated_at.iso8601 }
    })
  end
end

