# frozen_string_literal: true

module Api
  module V1
    # POST /api/v1/threats/:threat_id/actions
    class ThreatActionsController < BaseController
      # Perform an action on a threat.
      # Business logic:
      #   acknowledged          → status: investigating
      #   marked_false_positive → FalsePositiveService#mark_as_false_positive
      #   escalated             → status: escalated + SlackNotificationJob
      #   confirmed             → status: confirmed
      #   resolved              → status: resolved + resolved_at
      #   note_added            → no status change
      VALID_ACTION_TYPES = %w[
        acknowledged investigate marked_false_positive escalated confirmed resolved note_added
      ].freeze

      def create
        threat       = Threat.find(params[:threat_id])
        action_type  = action_params[:action_type]
        performed_by = action_params[:performed_by].presence || "analyst"
        notes        = action_params[:notes]

        unless VALID_ACTION_TYPES.include?(action_type)
          render json: { error: "Unknown action_type: #{action_type}" }, status: :unprocessable_entity
          return
        end

        result = execute_threat_action(threat, action_type, performed_by, notes)
        render json: result, status: :created
      end

      private

      def action_params
        params.require(:threat_action).permit(:action_type, :performed_by, :notes)
      end

      def execute_threat_action(threat, action_type, performed_by, notes)
        case action_type
        when "acknowledged", "investigate"
          threat.update!(status: "investigating")
          action = threat.threat_actions.create!(action_type: "acknowledged", performed_by: performed_by, notes: notes)
          base_response(action, threat.status)

        when "marked_false_positive"
          review_item = FalsePositiveService.new.mark_as_false_positive(
            threat,
            marked_by: performed_by,
            reason:    notes.presence || "Marked as false positive"
          )
          action = threat.threat_actions.find_by(action_type: "marked_false_positive", performed_by: performed_by)
          base_response(action, threat.reload.status).merge(review_queue_item_id: review_item.id)

        when "escalated"
          threat.update!(status: "escalated")
          action = threat.threat_actions.create!(action_type: "escalated", performed_by: performed_by, notes: notes)
          SlackNotificationJob.perform_async(threat.id)
          base_response(action, threat.status)

        when "confirmed"
          threat.update!(status: "confirmed")
          action = threat.threat_actions.create!(action_type: "confirmed", performed_by: performed_by, notes: notes)
          base_response(action, threat.status)

        when "resolved"
          threat.update!(status: "resolved", resolved_at: Time.current)
          action = threat.threat_actions.create!(action_type: "resolved", performed_by: performed_by, notes: notes)
          base_response(action, threat.status)

        when "note_added"
          action = threat.threat_actions.create!(action_type: "note_added", performed_by: performed_by, notes: notes)
          base_response(action, threat.status)

        end
      end

      def base_response(action, threat_status)
        {
          action: {
            id:           action.id,
            threat_id:    action.threat_id,
            action_type:  action.action_type,
            performed_by: action.performed_by,
            notes:        action.notes,
            created_at:   action.created_at.iso8601
          },
          threat_status: threat_status
        }
      end
    end
  end
end

