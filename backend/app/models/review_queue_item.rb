# frozen_string_literal: true

class ReviewQueueItem < ApplicationRecord
  # -- Associations --
  belongs_to :threat

  # -- Enums --
  enum :review_status, {
    pending:      "pending",
    confirmed_fp: "confirmed_fp",
    rejected_fp:  "rejected_fp"
  }

  # -- Validations --
  validates :marked_by,      presence: true
  validates :reason,         presence: true
  validates :review_status,  presence: true

  # -- Scopes --
  scope :pending_review, -> { where(review_status: "pending") }
  scope :recent,         -> { order(created_at: :desc) }

  # -- Callbacks --
  before_create :set_uuid
  after_update  :broadcast_review_update, if: :saved_change_to_review_status?

  private

  def set_uuid
    self.id ||= SecureRandom.uuid
  end

  def broadcast_review_update
    ActionCable.server.broadcast("frontend_updates", {
      topic: "review_queue",
      query_key: ["review_queue"]
    })
  end
end

