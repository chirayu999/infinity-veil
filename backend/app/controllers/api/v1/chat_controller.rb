# frozen_string_literal: true

module Api
  module V1
    class ChatController < BaseController
      # POST /api/v1/chat
      # Persists the user message and enqueues ChatAgentJob to call Kibana
      # asynchronously. Returns 202 immediately so the frontend can show
      # progress via ActionCable (thinking_step → agent_complete/agent_error).
      def create
        content = params.require(:message).require(:content)

        user_message = ChatMessage.create!(
          role:    "user",
          content: content
        )

        ChatAgentJob.perform_later(user_message.id, content)

        render json: {
          user_message_id: user_message.id,
          message:         message_json(user_message)
        }, status: :accepted
      end

      # GET /api/v1/chat/history
      def history
        messages = ChatMessage.chronological
        render json: { messages: messages.map { |m| message_json(m) } }
      end

      # POST /api/v1/chat/create_threat
      # Promotes an agent chat message to a Threat record.
      def create_threat
        message_id   = params.require(:message_id)
        chat_message = ChatMessage.find(message_id)

        # Guard: already promoted — return the existing threat id
        if chat_message.created_threat_id.present?
          return render json: { threat_id: chat_message.created_threat_id }, status: :ok
        end

        data = extract_threat_data(chat_message.content)

        threat = Threat.create!(
          title:             data[:title],
          description:       data[:description],
          confidence_score:  data[:confidence_score],
          severity:          calculate_severity(data[:confidence_score]),
          status:            "new",
          attack_phase:      data[:attack_phase],
          affected_assets:   data[:affected_assets],
          agent_reasoning:   data[:agent_reasoning],
          esql_queries_used: data[:esql_queries_used],
          mitre_techniques:  data[:mitre_techniques],
          auto_actions_taken: [],
          timeline_events:   data[:timeline_events],
          detected_at:       Time.current
        )

        threat.threat_actions.create!(
          action_type:  "note_added",
          performed_by: "system",
          notes:        "Threat created from COMMANDER chat message #{message_id}"
        )

        chat_message.update!(created_threat_id: threat.id)

        render json: { threat_id: threat.id, threat: { id: threat.id, title: threat.title } }, status: :created
      end

      private

      def message_json(m)
        {
          id:                m.id,
          role:              m.role,
          content:           m.content,
          agent_name:        m.agent_name,
          metadata:          m.metadata,
          created_threat_id: m.created_threat_id,
          created_at:        m.created_at.iso8601
        }
      end

      # Parse the first threat out of a COMMANDER JSON block.
      # Falls back to sensible defaults if no JSON is found.
      def extract_threat_data(content)
        json_match = content.match(/```json\s*(.*?)\s*```/m)
        if json_match
          parsed     = JSON.parse(json_match[1], symbolize_names: true)
          threat_list = Array.wrap(parsed[:threats] || parsed)
          if threat_list.any?
            t = threat_list.first
            return {
              title:             (t[:title].presence || "Chat-derived Threat").truncate(255),
              description:       t[:description].presence || content,
              confidence_score:  t[:confidence_score].to_i.clamp(0, 100).then { |s| s > 0 ? s : 50 },
              attack_phase:      t[:attack_phase].presence || "multi_phase",
              affected_assets:   Array.wrap(t[:affected_assets]),
              agent_reasoning:   t[:agent_reasoning] || { commander: { finding: content } },
              esql_queries_used: Array.wrap(t[:esql_queries_used]),
              mitre_techniques:  Array.wrap(t[:mitre_techniques]),
              timeline_events:   Array.wrap(t[:timeline_events])
            }
          end
        end
        fallback_threat_data(content)
      rescue JSON::ParserError
        fallback_threat_data(content)
      end

      def fallback_threat_data(content)
        {
          title:             "Chat-derived Threat",
          description:       content,
          confidence_score:  50,
          attack_phase:      "multi_phase",
          affected_assets:   [],
          agent_reasoning:   { commander: { finding: content } },
          esql_queries_used: [],
          mitre_techniques:  [],
          timeline_events:   []
        }
      end

      def calculate_severity(confidence)
        case confidence.to_i
        when 85..100 then "critical"
        when 70..84  then "high"
        when 40..69  then "medium"
        else              "low"
        end
      end
    end
  end
end
