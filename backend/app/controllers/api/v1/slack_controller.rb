# frozen_string_literal: true

module Api
  module V1
    # Receives Slack interactive message callbacks when analysts click buttons
    # on threat alert notifications. Responds within 3 seconds (Slack's limit)
    # then processes the action asynchronously via SlackInteractionJob.
    class SlackController < BaseController
      # POST /api/v1/slack/interactions
      def interactions
        # Slack sends payload as application/x-www-form-urlencoded with a "payload" field
        raw_payload = params[:payload]

        unless raw_payload.present?
          render json: { error: "Missing payload" }, status: :bad_request
          return
        end

        begin
          payload = JSON.parse(raw_payload)
        rescue JSON::ParserError
          render json: { error: "Invalid JSON payload" }, status: :bad_request
          return
        end

        # Verify Slack signature in production
        # verify_slack_signature!(request) if Rails.env.production?

        # Enqueue async processing — must respond within 3 seconds
        SlackInteractionJob.perform_async(payload)

        action    = payload.dig("actions", 0)
        action_id = action&.dig("action_id")

        message = case action_id
                  when "acknowledge_threat"   then "Threat acknowledged"
                  when "mark_false_positive"  then "Threat marked as false positive — pending senior review"
                  else "Action received"
                  end

        render json: { response_type: "in_channel", text: message }
      end
    end
  end
end

