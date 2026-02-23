# frozen_string_literal: true

class ExceptionPattern < ApplicationRecord
  # -- Associations --
  belongs_to :source_threat, class_name: "Threat", optional: true

  # -- Validations --
  validates :pattern_type,  presence: true
  validates :description,   presence: true

  # -- Scopes --
  scope :active,   -> { where(active: true) }
  scope :inactive, -> { where(active: false) }
  scope :by_type,  ->(type) { where(pattern_type: type) }

  # -- Callbacks --
  before_create :set_uuid

  private

  def set_uuid
    self.id ||= SecureRandom.uuid
  end
end

