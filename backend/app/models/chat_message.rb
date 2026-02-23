# frozen_string_literal: true

class ChatMessage < ApplicationRecord
  # -- Enums --
  enum :role, {
    user:  "user",
    agent: "agent"
  }

  # -- Validations --
  validates :role,    presence: true
  validates :content, presence: true

  # -- Scopes --
  scope :recent,        -> { order(created_at: :desc) }
  scope :chronological, -> { order(created_at: :asc) }

  # -- Callbacks --
  before_create :set_uuid
  after_create  :broadcast_message, unless: :skip_broadcast?

  # -- Attributes --
  attr_accessor :skip_broadcast

  private

  def set_uuid
    self.id ||= SecureRandom.uuid
  end

  def skip_broadcast?
    skip_broadcast == true
  end

  def broadcast_message
    ActionCable.server.broadcast("frontend_updates", {
      topic: "chat",
      query_key: ["chat", "history"],
      type: "new_message",
      message: {
        id:                id,
        role:              role,
        content:           content,
        agent_name:        agent_name,
        metadata:          metadata,
        created_threat_id: created_threat_id,
        created_at:        created_at.iso8601
      }
    })
  end
end

